# 37Club TODO

- [x] theme.config.js を37Clubカラーパレットに更新
- [x] tailwind.config.js にカスタムカラートークンを追加
- [x] 仮データ（5件のトピック）を定義
- [x] TopicCarouselコンポーネント実装（横スワイプ、peek効果）
- [x] カードコンポーネント実装（日時・場所・持ち物、ピンアイコン）
- [x] 場所タップでマップアプリ起動
- [x] LIVE判定ロジック実装（開始から37分以内）
- [x] 起動時初期カード選択ロジック（LIVE残り時間最小 or 最近Upcoming）
- [x] カウントダウンタイマー実装（mm:ss、上部エリア64px）
- [x] CHECK IN FAB実装（72×72、ネオンブルー、グロー）
- [x] FAB脈動アニメーション（scale 1.00→1.03→1.00、2秒周期）
- [x] app/(tabs)/index.tsx をカルーセル画面に差し替え
- [x] タブバー非表示（シングル画面）
- [x] アプリロゴ生成・設定
- [x] app.config.ts ブランディング更新
- [x] 通常カード縁取り（#1A1F3A / 1px / グローなし）
- [x] LIVEカード縁取り（#00F5FF / 1.5px / 外側グローBlur8/opacity0.3）
- [x] LIVEタイマー文字色を#00F5FFに変更、Semibold～Bold、等幅フォント
- [x] LIVEタイマー外側ネオングロー（Blur10/opacity0.6）
- [x] タイマー上下に水平ライン（1px/#00F5FF/opacity0.3/幥65%/グローBlur6/opacity0.4）
- [x] CHECK INフロー用ルート追加（check-in/camera, check-in/preview, check-in/posting, check-in/posted）
- [x] 画面１: Camera Live（1:1スクエアプレビュー、シャッター、Flash、カメラ切替）
- [x] 画面２: Preview + Text（画像プレビュー、RETAKE、テキスト入力20文字、POSTボタン）
- [x] 画面３: Posting（ネオンリング回転ローディング、0.6秒）
- [x] 画面４: Posted（POSTED表示、0.4秒後自動遷移）
- [x] 全画面共通LIVEタイマー（上部固定、mm:ss、#00F5FF、グロー、水平ライン）
- [x] FABタップ → Camera Liveへ遷移
- [x] 投稿一覧画面（ALL/FOLLOWINGタブ、3列グリッド、ユーザー名表示）
-- [x] 投稿タップ → Apple Music風ボトムシート（高70%、スライドアップ、背景blur）
- [x] ボトムシート内：画像・ユーザー名・Followボタン（3状態）・通報（⋯）・テキスト
- [x] 相互フォロー時にChatボタン → Chat画面へ遷移
- [x] Chat画面（バブルUI、自分/相手、ネオンブルー送信ボタン）
- [x] タブバーに投稿一覧タブを追加
- [x] Flashアイコン：SVG線アイコン22px、ON時#00F5FFグロー、0.15秒ネオン発光アニメ
- [x] カメラ切替アイコン：SVG線アイコン22px、タップ時#00F5FF+0.2秒回転アニメ
- [x] camera.tsxの立体感削除・ミニマル統一
- [x] preview.tsxのRETAKEを画像上から削除、テキスト入力下にRETAKE左/POST右のアクションエリア追加
- [x] AppModeコンテキスト作成（lobby/community）
- [x] ロビーモード：タブバー非表示、TOPICSのみ、FAB表示
- [x] コミュニティモード：タブバー3つ（COMMUNITY/CHAT/CHECK OUT）
- [x] CHECK OUTタブ：確認モーダル→退出でlobbyに戻る
- [x] POST成功後にcommunityモードへ自動遷移
- [x] 戻る操作（スワイプ・xd7）をCHECK OUT確認モーダルに統- [x] check-inフロー内の戻る操作もCHECK OUT確認に統一
- [x] AppModeContext: isParticipantフラグをAsyncStorageで永続化、enterCommunity/exitCommunityを確実に動作させる
-- [x] posted.tsx: enterCommunity後router.replace("/(tabs)/posts")で確実にCOMMUNITY画面へ遷移
- [x] タブレイアウト: isParticipant=trueでCOMMUNITY/CHAT/CHECK OUTを表示、初期タブをpostsに固定
- [x] 戻る操作のCHECK OUT確認を全コミュニティ画面で統一
- [x] タブ再構成：CHECK OUTタブ削除、MY POSTタブ追加（COMMUNITY/CHAT/MY POST）
- [x] posted.tsx：POSTED→WELCOMEに文言変更
- [x] MY POSTページ実装（自分の投稿・ユーザー名・コメント・CHECK OUTボタン・確認モーダル）
- [x] COMMUNITY投稿一覧を2列グリッドに変更（外マージン16、セル間）
- [x] 投稿セルにコメント1行表示（12pt/白opacity0.75/省略）
-- [x] 投稿枚ネオン色分け（フォロー中=赤#FF2D55、未フォロー=青#00F5FF、2px/角丧0/グロー）
- [x] ボトムシート：通常は70%固定、相互フォロー時のみ上スワイプで100%→Chat遷移
- [x] Chat画面：投稿コンテキストヘッダー追加（写真48px・ユーザー名・コメント・#0E1020背景・区切り線）
- [x] Chat画面：バブルデザイン改善（自分=ネオンブルー薄背景右寄せ、相手=#13162B左寄せ、角丣16、影なし）
- [x] 用語統一：お題→SET、投稿→DROP、MY POST→MY DROP（全ファイル）
- [x] SETカード改善（Bold化・余白調整・フォント階層明確化）
- [x] ENTERボタン：円形废止→丸み長方形（宽70-80%・高56px・角28・ネオン背景））
- [x] CHECK INボタン：ENTERと同形状に統一
- [x] WELCOME演出強化（37Clubネオン看板点滅→安定点灯→WELCOME表示・2秒）
- [x] FOLLOWINGタブ文字色を赤#FF2D55に変更- [x] DROP縁をを3px・グローBlur12/opacity0.35に強化
- [x] DROPS一覧を横スワイプで切替可能に（0.25秒スライドアニメ）
- [x] DROPS一覧ページ上部に再読み込みボタンを追加（ネオントンマナ）

## UIブラッシュアップ（2026-03-02）
- [x] カラー定数更新：ネオンブルー#00D8FF・フォロー=パープル#D100F5・赤排除
- [x] タイマー：SafeArea考慮・上部24px下・ライン幅50%・Dynamic Island非干渉
- [x] SETカード：上下余白詰め・Bold化・ピンアイコンネオンブルー
- [x] ENTERボタン：背景透明・2pxアウトライン・外側グロー・押下強発光
- [x] CHECK INボタン：ENTERと同形状に統一
- [x] RETAKE：左側小型アウトラインボタン
- [x] コメント入力欄：背景#10131A・レイヤー感
- [x] 文字カウンター：opacity 0.6
- [x] 写真：1pxネオン縁（薄めグロー）
- [x] WELCOME演出：2秒待機・37Clubロゴ点滅→WELCOME・ブルー基調
- [x] COMMUNITY：フォロー枠=パープル・非フォロー=ブルー・2px・Blur12
- [x] FOLLOWINGタブ下線：パープル（文字は白）
- [x] 下部ナビ：青基調統一・赤一切排除
- [x] 全画面の赤色（#FF2D55）を完全排除

## モーダル・グリッド改善（2026-03-02 rev2）
- [x] 投稿詳細モーダル70%：Chat Previewエリア（直近3む6件、左右バブル、入力欄なし）
- [x] 投稿詳細モーダル100%：上スワイプで同一モーダル内チャットUIに切替
- [x] 100%チャットUI：LIVEタイマー固定・コンテキストヘッダー・スクロール履歴・入力欄
- [x] DROP一覧グリッド：画像左下に@username常時表示（11〒12pt・白・opacity 0.65）
- [x] DROP一覧グリッド：画像下20%に縦グラデーション（透明→#070812 opacity 0.6）
- [x] DROP一覧グリッド：フォロー中ユーザーのみ@username下に1pxネオンパープルライン

## ナビ・チャット改善（2026-03-02 rev3）
- [x] 下部ナビ：COMMUNITY→DROPS・ネオン青下線・白文字・非選択opacity 0.6・アイコン細線
- [x] チャットルートエラー修正：/chat/[userId].tsx作成・一覧タップで正しく遷移
- [x] チャット一覧UI：イニシャル円・@username・最終メッセージ（opacity 0.6）・未読ネオンリング

## アクセントカラー統一（2026-03-02 rev4）
- [x] パープル完全廃止：全ファイルのneonPurple/#D100F5を削除しネオンブルーに置換
- [x] DROPS枠：フォロー中=ネオンブルー通電グロー、非フォロー=ライトグレー#E6E8EE未通電質感
- [x] @username下ライン：パープル→青の1px（非フォローはラインなし）
- [x] タブ下線：ALL/FOLLOWING両方ネオンブルー・スライドアニメ150ms

## NeonLogoコンポーネント（2026-03-02 rev5）
- [x] NeonLogoコンポーネント作成：37CLUB・ネオンブルーのみ・微弱揺らぎ常時
- [x] 起動演出：3→7→CLUB順点灯（1.2秒以内）
- [x] WELCOME演出モード：未通電→3→7→CLUB→WELCOME表示（2.6〞3.0秒）
- [x] LiveTimerHeaderにNeonLogoを統合（タイマー上部・20px余白）
- [x] posted.tsxのWELCOME演出をNeonLogoに統一

## ロゴ置換・投稿完了演出強化（2026-03-03）
- [x] PNG/MP4ロゴをassets/imagesにコピー
- [x] 旧NeonLogoコンポーネントを削除・参照を全削除
- [x] LiveTimerHeaderからNeonLogo層を除去（タイマーのみに戻す）
- [x] index.tsx右上にPNGロゴ常時表示（画面幅18～22%・右16px・上16px）
- [x] posted.tsx：MP4再生→WELCOME浮上（translateY+12→0・0.6s）＋ネオン脈動（0.2s）
- [x] 操作制御：MP4再生中・WELCOME演出中は他操作無効
- [x] welcome完了後0.5秒待って通常画面へ遷移

## ロゴ配置修正・演出調整（2026-03-03 rev2）
- - [x] index.tsx：ロゴを右上→左上に変更（画面幅23%・左16px・SafeArea+12px）
- [x] posted.tsx：MOVファイルに差替（logo.mov）
- [x] posted.tsx：welcome出現0.6s＋維捑1.5s＋消滅0.4s（合計2.5s）
- [x] posted.tsx：フェードアウト完了後に画面遷移

## マイページ・持ち物表記変更（2026-03-03 rev3）
- [x] my-drop.tsx：白基調設定画面（Account/Notifications/Participation/Membership/Rules/Support/Log Out/Delete Account）
- [x] Account画面：Username/UserID/Phone/Restricted Accounts
- [x] Restricted Accounts画面：制限解除ダイアログ付き一覧
- [x] TopicCarousel：持ち物行を六角形アイコン＋アイテム名のみに変更

## My Page / My Drop 分離・導線整理（2026-03-03 rev4）
- [x] app/my-page.tsx 新規作成（設定ページ・白基調・ロゴタップで開く）
- [x] app/my-page/account.tsx 作成（Account設定・Username/UserID/Phone/Restricted Accounts）
- [x] app/my-page/restricted.tsx 作成（制限解除ダイアログ付き一覧）
- [x] app/(tabs)/my-post.tsx を My Drop（自分の投稿確認＋CHECK OUT）に書き換え
- [x] index.tsx：ロゴを Pressable に変更し /my-page へ遷移
- [x] posted.tsx：WELCOME演出後に「DROPS を見る」「MY DROP」ボタンを表示

## 退出演出 LIGHTS OUT（2026-03-03 rev5）
- [x] app/lights-out.tsx 新規作成（共通退出演出画面）
- [x] ロゴMP4を currentTime 末尾→先頭シークで逆再生模倣（3秒）
- [x] 逆再生完了後 0.2秒静止 → LIGHTS OUT テキスト浮上（0.4s）
- [x] LIGHTS OUT 表示維持 0.8秒 → フェードアウト 0.3秒 → 一覧へ遷移
- [x] my-post.tsx の CHECK OUT をLIGHTS OUT演出経由に変更
- [x] 37分経過強制退出もLIGHTS OUT演出経由に変更

## 投稿完了画面修正・チャット一覧修正・DEMOお題追加（2026-03-04）
- [x] posted.tsx：ボタン削除・自動遷移・welcome演出確定（出現0.6s→維持、1.5s→消滁0.4s→一覧遷移）- [x] posted.tsx：welcome脈動（scale 100→104→100、glow 100→130→100、0.2s）
-- [x] chat-list.tsx：丸型アバターを角丸四角サムネイル（radius 12、8x48）に変更
- [x] chat-list.tsx：画像なし時は角丸四角プレースホルダー＋イニシャル
- [x] index.tsx：DEMOお題を追加（id: "demo"、常時LIVE、DEMOバッジ）
- [x] TopicCarousel.tsx：DEMOお題は位置情報チェック無視・常時ENTER可能
- [x] TopicCarousel.tsx：DEMOお題のタイマーは投稿完了後5分（300秒）から開始
- [x] posting.tsx / posted.tsx：DEMOお題の場合は投稿完了時刻を保存し５分タイマー開始
- [x] 5分経過でLIGHTS OUT演出→一覧へ遷移

## Pinned機能・リフレッシュ機能追加（2026-03-04）
- [x] usePinnedTopics フック作成（AsyncStorage保存・読み込み・toggle）
- [x] TopicCarousel.tsx：Pull to Refresh（RefreshControl）追加
- [x] TopicCarousel.tsx：画面表示時の自動更新（useFocusEffect）
- [x] TopicCarousel.tsx：アプリ復帰時の自動更新（AppState）
- [x] 更新制御：直近15秒以内は再フェッチしない
- [x] TopicCarousel.tsx：カード右上に📌アイコン（OFF=アウトライン、ON=ネオンブルー）
- [x] TopicCarousel.tsx：右上フィルター📌アイコン（ALL⇋PINNEDトグル）
- [x] PINNED 0件時："No pinned drops." 表示
- [x] Pinned状態はアプリ再起動後も保持（AsyncStorage）
- [x] お題更新時の整合性（存在しないIDは無視）

## DROPS一覧 PIN位置調整・ループスクロール（2026-03-05）
- [x] 📌ボタン位置をセーフエリア上端から28〜36px下に調整
- [x] 📌ボタンのhitSlopを上下左右+12pxに拡大
- [x] カードスクロールをループ対応（末尾→先頭、先頭→末尾）
- [x] PINNEDモードでもループが有効
