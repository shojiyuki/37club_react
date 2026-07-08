# 37Club React

37Club の Expo / React Native アプリです。

画面ルーティングは Expo Router ベースで、アプリ本体は `app/` 配下にあります。共通 UI は `components/`、共通ロジックは `hooks/` / `lib/` / `constants/`、サーバー側処理は `server/`、DB 定義は `drizzle/` に分かれています。

## 主な構成

```text
app/
  Expo Router の画面定義
  (tabs)/
    タブ配下の画面群
  chat/
    チャット画面
  check-in/
    チェックイン導線
  oauth/
    OAuth callback

components/
  共通 UI コンポーネント

hooks/
  画面から使う共通 hook

lib/
  API client、認証、app mode、mock data など

server/
  Express / tRPC server

drizzle/
  DB schema / migration
```

## 起動方法

依存を入れたあと、通常は以下で起動します。

```sh
pnpm dev
```

これは server と Expo Metro を同時に起動します。

```text
pnpm dev
  -> pnpm dev:server
  -> pnpm dev:metro
```

個別に起動する場合:

```sh
pnpm dev:server
pnpm dev:metro
```

## Native Development Build

Cognito callback、SecureStore、cameraなどのNative挙動はExpo Goではなく、`expo-dev-client`を含む37Club専用Development Buildで確認します。

前提:

```text
Xcode / iOS Simulator
CocoaPods
Docker MySQL
local API用の.env設定
```

### iOS Simulatorの初回build

Web用Metroがポート8081で動いている場合は、先に `Ctrl+C` で停止します。MySQLは起動したままで構いません。

ターミナル1でAPI serverを起動します。

```sh
pnpm dev:server
```

ターミナル2でDevelopment Buildを作成し、Simulatorへinstallします。

```sh
pnpm exec expo run:ios --device "iPhone 15 Pro"
```

初回は次の処理が行われるため時間がかかります。

```text
app.config.ts
  -> Expo Prebuild
  -> ios/生成
  -> CocoaPods依存導入
  -> Xcode compile
  -> 37Club.app生成
  -> Simulatorへinstall
  -> Metro起動
```

`ios/` はPrebuildで再生成するため、このrepositoryでは `.gitignore` の対象です。

Development Clientの接続先選択画面が表示された場合、iOS Simulatorでは `http://localhost:8081` を選択します。

### 2回目以降の起動

Development BuildがSimulatorへinstall済みで、TypeScript / TSXだけを変更する通常開発ではNative buildをやり直す必要はありません。

ターミナル1:

```sh
pnpm dev:server
```

ターミナル2:

```sh
pnpm exec expo start --dev-client
```

その後、Simulator上の37Club Development Buildを開き、Metroへ接続します。Metroのターミナルで `r` を押すとJavaScriptをreloadできます。

次の変更後はDevelopment Buildを再作成します。

```text
Native libraryの追加・更新
app.config.tsのscheme / Bundle ID変更
Native権限の追加
Expo config pluginの追加・変更
Info.plist / entitlement相当の変更
```

再作成:

```sh
pnpm exec expo run:ios --device "iPhone 15 Pro"
```

### Simulatorと実機のAPI URL

iOS SimulatorはMac上の `http://localhost:3000` に接続できます。

実物のiPhoneでは `localhost` はiPhone自身を指します。Mac上のlocal APIへ接続する場合は、同じLAN上のMacのIP addressを `API_BASE_URL` に指定します。

```text
iOS Simulator
  -> http://localhost:3000

実機iPhone
  -> http://<MacのLAN IP>:3000
```

### Android

Android Development Buildは次のコマンドで作成します。

```sh
pnpm android
```

Android Emulator / 実機での疎通は未確認です。

## AWS S3 Development Storage

CHECK IN画像は非公開のAWS S3 development bucketへ保存します。local serverは専用AWS profileを使用し、clientにはAWS credentialsを渡しません。

設定・再現・疎通確認の詳細:

```text
.codex/wip/メモ/S3開発環境構築手順.md
```

実際のAccess key ID / Secret access keyはrepository、README、`.codex`へ保存しないでください。

## mock / API 切り替え

開発時に mock データを見るか、API server を見るかは `.env` で切り替えます。
`app.config.ts` が `.env` の `APP_ENV` を見て環境を解決し、`Constants.expoConfig.extra` に渡します。

```text
.env.local
  local mock 用

.env.development
  local / development API 用

.env.production
  production API 用

.env
  実行時に使う env
  dev:* コマンド実行前に .env.* からコピーされる

app.config.ts
  APP_ENV を見て現在の apiBaseUrl / dataSource を決める
```

起動:

```sh
pnpm dev:local
pnpm dev:development
pnpm dev:production
```

各コマンドは、起動前に対応する env ファイルを `.env` にコピーします。

```text
pnpm dev:local
  .env.local -> .env
  APP_ENV=local
  dataSource=mock

pnpm dev:development
  .env.development -> .env
  APP_ENV=development
  dataSource=api

pnpm dev:production
  .env.production -> .env
  APP_ENV=production
  dataSource=api
```

`.env` を直接使って起動する場合:

```sh
pnpm dev
```

data source の判定は `lib/data-source.ts` に集約しています。

```ts
getDataSource();
isMockDataSource();
```

## よく使うコマンド

```sh
pnpm dev          # server + Expo Metro
pnpm dev:local    # copy .env.local, then dev
pnpm dev:development # copy .env.development, then dev
pnpm dev:production  # copy .env.production, then dev
pnpm dev:server   # server only
pnpm dev:metro    # Expo Metro only
pnpm ios          # iOS Development Buildをbuild / install
pnpm android      # Android Development Buildをbuild / install
pnpm check        # TypeScript check
pnpm lint         # lint
pnpm test         # test
pnpm db:push      # Drizzle migration
```

## ローカルMySQL

local API / DB開発用のMySQLは、`compose.yaml` でDockerコンテナとして起動します。

接続情報:

```text
host: 127.0.0.1
port: 3306
database: 37club
user: admin
password: root
root password: root
```

これらはローカル開発専用の値です。本番環境では使いません。

### Dockerの起動

この開発環境ではColimaと `docker-compose` を使います。

```sh
colima start
colima status
```

MySQLコンテナを起動します。

```sh
pnpm db:local:up
```

起動状態とログの確認:

```sh
docker-compose ps
pnpm db:local:logs
```

`db:local:logs` はログを表示し続けます。終了するときは `Ctrl+C` を押します。

MySQLコンテナの停止:

```sh
pnpm db:local:down
```

通常の停止ではDocker volumeを削除しないため、DBデータは次回起動時も残ります。

### migration

DB schemaは `drizzle/schema.ts` で定義し、migrationは `drizzle/` 配下で管理します。

```sh
pnpm db:push
```

`pnpm db:push` は以下を順番に実行します。

```text
drizzle-kit generate
  -> drizzle/schema.tsと既存migrationの差分からSQLを生成

drizzle-kit migrate
  -> 未適用のmigrationをMySQLへ適用
```

MySQLコンテナが起動し、`.env` に `DATABASE_URL` が設定された状態で実行します。

`.env.local` を `.env` へ反映する場合:

```sh
node scripts/sync-env.js local
```

### MySQLへ接続する

application userでMySQLへ接続:

```sh
docker exec -it 37club-mysql mysql -uadmin -proot 37club
```

root userで接続:

```sh
docker exec -it 37club-mysql mysql -uroot -proot
```

MySQL接続後の主なコマンド:

```sql
SHOW DATABASES;
USE 37club;
SHOW TABLES;
DESCRIBE users;
SELECT * FROM users;
EXIT;
```

### DBを初期化する

次のコマンドはコンテナとDocker volumeを削除します。ローカルDBのデータはすべて消えます。

```sh
docker-compose down -v
```

初期化後はMySQLを再起動し、migrationを再適用します。

```sh
pnpm db:local:up
node scripts/sync-env.js local
pnpm db:push
```

## 現状メモ

主要プロダクト機能のうち、DROPS / chat / check-in / topics はまだ mock 中心です。

今後は画面から `lib/mock-data.ts` を直接参照する形を減らし、`hooks/use-*.ts` に寄せたうえで、mock / API を切り替えられる構造にしていきます。

作業メモや TODO は `.codex/` 配下に置きます。
