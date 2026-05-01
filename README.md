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
pnpm ios          # iOS
pnpm android      # Android
pnpm check        # TypeScript check
pnpm lint         # lint
pnpm test         # test
pnpm db:push      # Drizzle migration
```

## 現状メモ

主要プロダクト機能のうち、DROPS / chat / check-in / topics はまだ mock 中心です。

今後は画面から `lib/mock-data.ts` を直接参照する形を減らし、`hooks/use-*.ts` に寄せたうえで、mock / API を切り替えられる構造にしていきます。

作業メモや TODO は `.codex/` 配下に置きます。
