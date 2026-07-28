#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/37club/app}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_DIR}/.env.production}"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/opt/37club/env/backup.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_DIR}/compose.production.yaml}"
RESTORE_DATABASE="${RESTORE_DATABASE:-37club_restore_verify}"
TMP_DIR="${TMP_DIR:-/tmp/37club-restore-verify}"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

load_env_value() {
  local path="$1"
  local name="$2"
  local line
  local value

  line="$(grep -E "^${name}=" "$path" | tail -n 1 || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf -v "$name" '%s' "$value"
}

require_env() {
  local name="$1"
  [ -n "${!name:-}" ] || die "required env is empty: $name"
}

[ -f "$APP_ENV_FILE" ] || die "required file not found: $APP_ENV_FILE"
[ -f "$BACKUP_ENV_FILE" ] || die "required file not found: $BACKUP_ENV_FILE"
command -v docker >/dev/null 2>&1 || die "docker is required"
command -v aws >/dev/null 2>&1 || die "aws is required"
command -v gzip >/dev/null 2>&1 || die "gzip is required"

load_env_value "$APP_ENV_FILE" MYSQL_DATABASE
load_env_value "$APP_ENV_FILE" MYSQL_ROOT_PASSWORD
load_env_value "$BACKUP_ENV_FILE" BACKUP_AWS_ACCESS_KEY_ID
load_env_value "$BACKUP_ENV_FILE" BACKUP_AWS_SECRET_ACCESS_KEY
load_env_value "$BACKUP_ENV_FILE" BACKUP_AWS_REGION
load_env_value "$BACKUP_ENV_FILE" BACKUP_S3_BUCKET
load_env_value "$BACKUP_ENV_FILE" BACKUP_S3_PREFIX

require_env MYSQL_DATABASE
require_env MYSQL_ROOT_PASSWORD
require_env BACKUP_AWS_ACCESS_KEY_ID
require_env BACKUP_AWS_SECRET_ACCESS_KEY
require_env BACKUP_AWS_REGION
require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_PREFIX

[[ "$RESTORE_DATABASE" =~ ^[A-Za-z0-9_]+$ ]] || die "invalid RESTORE_DATABASE"
[ "$RESTORE_DATABASE" != "$MYSQL_DATABASE" ] || die "restore database must not be production database"

mkdir -p "$TMP_DIR"
chmod 700 "$TMP_DIR"
gzip_path="${TMP_DIR}/restore.sql.gz"

cd "$APP_DIR"

drop_restore_database() {
  rm -f "$gzip_path"
  docker compose -f "$COMPOSE_FILE" exec -T \
    -e RESTORE_DATABASE="$RESTORE_DATABASE" \
    mysql sh -lc \
    'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS \`$RESTORE_DATABASE\`;"' \
    >/dev/null 2>&1 || true
  rmdir "$TMP_DIR" 2>/dev/null || true
}
trap drop_restore_database EXIT

latest_file="$(
  AWS_ACCESS_KEY_ID="$BACKUP_AWS_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$BACKUP_AWS_SECRET_ACCESS_KEY" \
  AWS_REGION="$BACKUP_AWS_REGION" \
  aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/" |
    awk 'NF >= 4 { print $4 }' |
    sort |
    tail -n 1
)"
[ -n "$latest_file" ] || die "no backup file found"

log "downloading latest backup: ${latest_file}"
AWS_ACCESS_KEY_ID="$BACKUP_AWS_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$BACKUP_AWS_SECRET_ACCESS_KEY" \
AWS_REGION="$BACKUP_AWS_REGION" \
aws s3 cp \
  "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${latest_file}" \
  "$gzip_path" \
  --only-show-errors

gzip -t "$gzip_path"
log "gzip integrity: OK"

docker compose -f "$COMPOSE_FILE" exec -T \
  -e RESTORE_DATABASE="$RESTORE_DATABASE" \
  mysql sh -lc \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
    DROP DATABASE IF EXISTS \`$RESTORE_DATABASE\`;
    CREATE DATABASE \`$RESTORE_DATABASE\`
      CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
  "'

log "importing into temporary database: ${RESTORE_DATABASE}"
gunzip -c "$gzip_path" |
  docker compose -f "$COMPOSE_FILE" exec -T \
    -e RESTORE_DATABASE="$RESTORE_DATABASE" \
    mysql sh -lc \
    'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" "$RESTORE_DATABASE"'

table_count="$(
  docker compose -f "$COMPOSE_FILE" exec -T \
    -e RESTORE_DATABASE="$RESTORE_DATABASE" \
    mysql sh -lc \
    'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = '\''$RESTORE_DATABASE'\'';
    "' |
    tr -d '\r'
)"

[[ "$table_count" =~ ^[0-9]+$ ]] || die "could not read restored table count"
[ "$table_count" -gt 0 ] || die "restored database has no tables"

log "restore verification completed: backup=${latest_file} tables=${table_count}"
log "temporary database will now be removed"
