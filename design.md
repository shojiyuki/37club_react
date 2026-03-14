# 37Club — Design Specification

## Overview
ダークミニマルなiOS向けモバイルアプリ。トピック（お題）を横カルーセルで表示し、LIVE開催中のみネオンブルーのアクセントとカウントダウンを表示する。

---

## Color Palette
| Token | Value |
|-------|-------|
| Background | `#070812` |
| Surface (Card) | `#0E1020` |
| Surface2 | `#13162B` |
| Text Primary | `#FFFFFF` |
| Text Secondary | `#B7BDD6` |
| Text Muted | `#6E7594` |
| Accent Neon Blue (FAB) | `#00F5FF` |
| Glow | `rgba(0,245,255,0.55)` |

---

## Typography (SF Pro / iOS System)
| Element | Style |
|---------|-------|
| Timer | Semibold 20pt |
| Card Text (3行) | Regular 18pt、行間26 |
| FAB Label | Semibold 12pt、全大文字、tracking +0.6 |

---

## Screen List
1. **TopicCarousel** — メイン画面（唯一の画面）

---

## TopicCarousel Screen

### Layout
- 縦スクロールなし、横スワイプカルーセル
- 上部エリア（64px）: LIVE時のみカウントダウン表示
- 中央エリア: カード（画面幅84% × 画面高さ38%）
- 下部エリア: LIVE時のみ CHECK IN FAB（72×72）

### Card Spec
- Width: 84% of screen width
- Height: 38% of screen height
- Border Radius: 20
- Padding: 24
- Gap between cards: 16
- Background: `#0E1020`
- 左右に前後カードが少し見える（peek効果）

### Card Content (3要素のみ)
1. 日時（開始時刻）
2. 場所（ピンアイコン付き、タップでマップ起動）
3. 持ち物

### LIVE State (開始から37分以内)
- 上部: mm:ss カウントダウン（白、Semibold 20pt）
- 下部: CHECK IN FAB（#00F5FF、72×72、グロー、脈動アニメ）

### Non-LIVE State
- 上部タイマー非表示
- FAB非表示

---

## Key User Flows
1. 起動 → 最も残り時間が少ないLIVEカード（またはUpcomingが最も近いカード）を初期表示
2. 左右スワイプ → カード切り替え（中央カードが主、前後カードがpeek）
3. 場所行タップ → 端末デフォルトマップアプリ起動
4. CHECK IN タップ → ハプティクスフィードバック（LIVE時のみ表示）
