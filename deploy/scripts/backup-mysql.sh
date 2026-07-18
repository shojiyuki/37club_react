#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/37club/app}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_DIR}/.env.production}"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/opt/37club/env/backup.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_DIR}/compose.production.yaml}"
TMP_DIR="${TMP_DIR:-/tmp/37club-backups}"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

require_file() {
  local path="$1"
  [ -f "$path" ] || die "required file not found: $path"
}

require_command() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || die "required command not found: $name"
}

load_env_file() {
  local path="$1"
  set -a
  # shellcheck disable=SC1090
  . "$path"
  set +a
}

require_env() {
  local name="$1"
  [ -n "${!name:-}" ] || die "required env is empty: $name"
}

require_file "$APP_ENV_FILE"
require_file "$BACKUP_ENV_FILE"
require_command docker
require_command aws
require_command gzip

load_env_file "$APP_ENV_FILE"
load_env_file "$BACKUP_ENV_FILE"

require_env MYSQL_DATABASE
require_env MYSQL_USER
require_env MYSQL_PASSWORD
require_env BACKUP_AWS_ACCESS_KEY_ID
require_env BACKUP_AWS_SECRET_ACCESS_KEY
require_env BACKUP_AWS_REGION
require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_PREFIX

mkdir -p "$TMP_DIR"
chmod 700 "$TMP_DIR"

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
base_name="37club-${MYSQL_DATABASE}-${timestamp}.sql"
sql_path="${TMP_DIR}/${base_name}"
gzip_path="${sql_path}.gz"
s3_uri="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${base_name}.gz"

cleanup() {
  rm -f "$sql_path" "$gzip_path"
}
trap cleanup EXIT

log "starting MySQL dump: database=${MYSQL_DATABASE}"

cd "$APP_DIR"

docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc \
  'mysqldump --default-character-set=utf8mb4 --single-transaction --quick --routines --triggers -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > "$sql_path"

[ -s "$sql_path" ] || die "dump file is empty: $sql_path"

gzip -9 "$sql_path"
[ -s "$gzip_path" ] || die "gzip file is empty: $gzip_path"

log "uploading backup: ${s3_uri}"

AWS_ACCESS_KEY_ID="$BACKUP_AWS_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$BACKUP_AWS_SECRET_ACCESS_KEY" \
AWS_REGION="$BACKUP_AWS_REGION" \
aws s3 cp "$gzip_path" "$s3_uri" --only-show-errors

log "backup completed: ${s3_uri}"
