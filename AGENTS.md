# 37Club Repository Guidelines

## 基本方針

- ユーザーへの説明と作業文書は、指定がなければ日本語で書く。codeの識別子は既存に合わせて英語を使う。
- まず既存の画面、hook、data source、service、repository、testを読み、現在の責務分担を保つ。
- 目的を満たす最も単純な実装を選び、不要なtable、抽象化、component、設定を増やさない。
- 明示された依頼範囲だけを変更し、関係ない不具合やrefactorは別taskとして分ける。

## 現在地と参照元

- 作業の入口は`.codex/wip/context/2026-07-01_mock-to-api-handoff.md`と`.codex/wip/TODO/全体TODO.md`。詳細はリンク先の専門TODOやrunbookを読む。
- 開発環境は`README.md`、serverの責務とsecurity ruleは`server/README.md`を参照する。
- UIと画面遷移の原案は`../../_37超簡易ワイヤーフレーム.pdf`。現行UI、明示された仕様、testと矛盾する場合は差分を確認する。
- 実装状態は現行codeとtest、DB構造は`drizzle/schema.ts`と適用済みmigration、外部状態は実測結果を正とする。更新日が古いメモは無条件に信用しない。
- rootの`todo.md`は旧資料。現在の優先順位に使用しない。
- `.codex/`は原則Git管理外のlocal作業資料。無理にforce addしない。全開発者に必要なサニタイズ済み説明は`README.md`等の追跡対象へ置く。

## 現行アーキテクチャ

- Expo 54 / React Native 0.81 / React 19 / TypeScript / Expo RouterでiOS・Android・Webを構成する。
- app側はReact Queryと`lib/data`adapterを介し、mockとAPIで同じdata contractを使う。主要導線はAPI接続済みで、mockはUI開発・切り分け用として維持する。
- serverはExpress + tRPC、認証はCognito OAuth/OIDC、DBはMySQL + Drizzle、投稿画像はprivate S3を使う。
- productionはLightsail上のDocker ComposeでMySQL / API / Caddyを稼働させる。iOS配布はEAS production profile / App Store Connect / TestFlightを使う。

```text
screen
  -> hook / React Query
  -> lib/data (mock or server adapter)
  -> tRPC client
  -> router / internal handler
  -> service / domain
  -> repository
  -> MySQL / S3
```

## ディレクトリと責務

- `app/`: Expo Routerの画面とnavigation。タブは`app/(tabs)/`、単独導線は`app/chat/`、`app/check-in/`、`app/my-page/`、`app/oauth/`等に置く。
- `components/`: 複数画面で再利用するUI。画面固有の見た目はそのrouteに寄せる。
- `hooks/`: 画面向けのserver state、React Query、mutation、画面間の共通操作。
- `lib/data/types.ts`: app側のdata contract。`mock-data-source.ts`と`server-data-source.ts`の形をそろえる。
- `lib/`: data source、tRPC client、Cognito auth、S3 upload、app mode、theme等。
- `constants/`: runtime config、API URL、theme constant。
- `server/routers/`: tRPCの入出力、Zod validation、auth boundary。routerを薄く保つ。
- `server/services/` / `server/domain/`: 業務ルールとpolicy。DB詳細を持ち込まない。
- `server/repositories/`: Drizzle queryとtransaction。SQL相当の処理を他layerに置かない。
- `server/topic-management/`: 運用メンバー用Lambdaから呼ぶinternal Topic管理API。
- `server/auth/` / `server/storage/`: Cognito identityの解決とS3 abstraction。
- `drizzle/`: `schema.ts`、migration SQL、meta。
- `deploy/`: Caddy、backup script、Lambda等の運用artifact。
- `shared/`: app / server共通の型、定数、error。
- `tests/`: Vitestのunit / service / adapter / auth / security test。Python Lambda testは対象Lambdaと同じdirectoryに置く。

## 実装ルール

- 画面からDB、server repository、生のmock dataを直接参照せず、既存hookと`DataSources`を通す。
- React Queryを追加・変更する際は、安定した`queryKey`、`queryFn`、mutation成功後のcache更新またはinvalidateをセットで設計する。
- API追加は`router -> service -> repository`の順に責務を分け、入力はboundaryでvalidationする。複数tableの不可分な更新はrepository transactionにまとめる。
- 認証必須のproduct APIは原則`protectedProcedure`を使う。所有者、送信者、follower等の本人IDはclient入力を信用せず`ctx.user.id`から決める。
- S3 uploadはpresigned URLを使い、clientへAWS credentialを渡さない。object keyの所有者とmetadataをserverで検証する。
- App Review demoの特例判定はserver側の`app_review_config`を正とし、clientからdemo flagを送って切り替えない。
- Native設定は`app.config.ts`とExpo config pluginを優先する。Prebuild生成物の`ios/`と`android/`はcommitしない。
- TypeScriptの既存命名、Prettier、Expo Routerのfile namingに従う。componentはPascalCase、変数・関数はcamelCase、動的routeは`[param].tsx`とする。

## 環境切り替え

- Node.js 22系、`pnpm@9.12.0`を使う。必要に応じて`nvm use`でそろえる。
- `.env`は現在選択中の実行環境で、`env:*` / `dev:*`が`.env.*`から上書きする。`pnpm dev`は現在の`.env`をそのまま使うため、通常は目的を明示して`pnpm dev:mock`または`pnpm dev:local`を使う。
- 環境切り替え後には`app.config.ts`の解決値と接続先を確認する。`.env`や`.env.production`全体をterminal出力しない。
- production接続、iPhone Release Build、EAS Build / Submitは明示された依頼時だけ実行する。
- Cognito callback、SecureStore、camera、location等のNative機能はExpo Goだけで完了判定せずDevelopment BuildまたはRelease Buildで確認する。Development BuildはMetroが必要、bundle済みRelease BuildはMetro停止後も動作する。

## よく使うコマンド

```bash
pnpm dev:mock                 # mock + Metro
pnpm dev:local                # local API + Metro
pnpm dev:server               # API server only
pnpm dev:metro                # Metro only
pnpm check                    # TypeScript
pnpm test                     # Vitest full suite
pnpm lint                     # Expo ESLint
pnpm build                    # server production bundle
pnpm ios                      # iOS Development Build
pnpm ios:production:release   # production接続のiPhone Release Build
```

- 対象testのみは`pnpm exec vitest run tests/<name>.test.ts`で先に回す。
- Topic管理Lambdaのtestは`python3 -m unittest deploy/lambda/topic-management/test_lambda_function.py`。
- `pnpm db:push`はDrizzle migrationのgenerateとmigrateの両方を行う。閲覧用commandとして実行せず、対象`DATABASE_URL`を確定してから使う。
- `pnpm eas:build:ios:production`と`pnpm eas:submit:ios:production`は外部状態を変更する。依頼なしに実行しない。

## DBとmigration

- `drizzle/schema.ts`をschemaのsource of truthとする。本番適用済みmigration SQLを書き換えず、schema変更は新しいmigrationとmetaで進める。
- schema変更では、schema、生成migration、repository / service test、`.codex/wip/データ設計/`の整合を確認する。
- 手動SQLは対象IDを事前`SELECT`で特定し、transactionやidempotentなupsertを選び、実行後も`SELECT`で検証する。
- 本番migration、データ更新、restore、cleanupは同じ権限とみなさない。破壊的または復旧を伴う操作は個別に確認する。

## 本番・Cloud・配布の安全性

- 本番DB / AWS / Lightsail / App Store Connectを変更する前に、対象環境、commit、操作範囲を明示して確認を取る。読み取りで現状を特定してから最小単位を変更する。
- schema変更、破壊的SQL、高riskなdata変更の前にS3 DB backupと復旧経路を確認する。適用順は対象runbookとmigrationの互換性に従う。
- server上の`/opt/37club/app/.env.production`はlocal状態を保持し、pull、copy、container再作成で上書きしない。
- deploy後は対象container、MySQL、internal health、外部HTTPS、安全なlogを確認する。token、query string、request body、個人情報を確認出力やlogに残さない。
- 本番で行った手動操作は、日時、commit、migration、backup、health、smoke test結果を関連runbookに記録する。
- App Review demoは`.codex/wip/TODO/cloud配置/AppReview審査用demo運用手順.md`に従う。現在の`enabled` / `expiresAt`を文書から推測せずDBで確認し、審査後は無効化する。

## Secret・認証・log

- password、Apple / TestFlight credential、AWS access key、token、cookie、authorization code、個人emailをcode、Markdown、command、log、screenshot、commitへ残さない。`.gitignore`対象であることは安全な保存場所であることを意味しない。
- `.env.example`とGit管理中のenv profileにはplaceholderまたはclient公開前提値だけを置く。server secretはrepository外で管理する。
- authとinternal APIの変更では、未認証、不正token、他user ID、期限切れ、rate limitをtestする。
- error logに認証token、投稿・chat本文、画像、精密位置情報、DB接続情報を含めない。

## Testと完了条件

- 変更対象のfocused testを先に実行し、code変更の完了時は原則`pnpm check`、`pnpm test`、`pnpm lint`を実行する。文書だけの変更で不要なfull suiteは回さない。
- server entrypoint、Docker、production deployに関わる場合は`pnpm build`も確認する。schema変更はDrizzleの生成差分とmigration整合性を確認する。
- testはUIの内部実装より、domain / service / auth / adapter / cache更新の回帰を優先する。バグ修正には可能な限り再現testを追加する。
- camera、location、Cognito callback、SecureStore、Release bundle等は、必要な場合に実機またはDevelopment Buildで確認する。未実施の確認を実施済みとして報告しない。
- 完了報告では、変更概要、主な変更file、実行したtest、未確認事項、必要な手動手順を明示する。

## Gitと複数session

- 作業開始時と完了時に`git status --short`と対象diffを確認する。ユーザーや別sessionの未commit変更を自分の変更とみなさない。
- 関係ない変更の復元、削除、stage、commitをしない。競合する場合は勝手に上書きせず、対象を確認する。
- repo全体の`pnpm format`は通常実行せず、変更fileだけを整形する。formatting-only差分は機能変更と混ぜない。
- stage、commit、pushはユーザーの依頼範囲だけに限る。commitを依頼された場合は対象diffを確認し、英語の簡潔なConventional Commit形式（`feat:`、`fix:`、`docs:`、`chore:`、`refactor:`、`test:`）を使う。

## ドキュメント更新

- `.codex/wip/TODO/全体TODO.md`には現在地、status、優先順位、専門文書へのlinkだけを簡潔に書く。長い設計、SQL、手順、確認記録は別文書へ分ける。
- DB構造を変えたら`.codex/wip/データ設計/`、手動運用を変えたら関連runbook、ビルド・デプロイ手順を変えたら`README.md`と運用文書も同時に見直す。
- 実測を行った文書には日付、対象環境、結果、残課題を記録する。変化しやすい進捗をこの`AGENTS.md`へ重複記載しない。
