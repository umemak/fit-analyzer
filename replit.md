# FIT Analyzer - AIワークアウト分析アプリ

## Overview
FITファイル（COROS、Garmin、Polar、Suunto等のスポーツウォッチ）をアップロードして、AIがワークアウトを詳細に分析・評価するWebアプリケーション。

## Features
- **FITファイル解析**: ドラッグ＆ドロップでFITファイルをアップロード
- **メトリクス表示**: 距離、時間、ペース、心拍数、標高、カロリー等を可視化
- **チャート表示**: 心拍数、ペース、標高、パワーの時系列グラフ
- **ラップ詳細**: 各ラップのタイム、ペース、心拍数を表形式で表示
- **AI評価**: OpenAIによる10段階評価、強み・改善点・トレーニング推奨事項を生成
- **PWA対応**: ホーム画面追加、オフラインキャッシュ、アプリライクな体験
- **Web Share Target**: Androidで他アプリからFITファイル共有可能（iOSは未サポート）

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js (開発) / Cloudflare Pages Functions (本番)
- **Styling**: Tailwind CSS + shadcn/ui
- **FIT Parsing**: fit-file-parser
- **AI (Replit)**: OpenAI (via Replit AI Integrations)
- **AI (Cloudflare)**: Cloudflare Workers AI (Llama 3.1 70B)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (大きなワークアウトデータ用)
- **Charts**: Recharts

## Project Structure
```
client/
  src/
    components/       # UI components
      file-upload.tsx      # File upload dropzone
      metric-card.tsx      # Metric display cards
      workout-charts.tsx   # Recharts visualizations
      ai-analysis-panel.tsx # AI analysis results
      lap-table.tsx        # Lap breakdown table
      auth-buttons.tsx     # Login/logout UI
    pages/
      home.tsx             # Upload page
      analysis.tsx         # Analysis dashboard
      history.tsx          # Workout history
    lib/
      theme-provider.tsx   # Dark/light mode
      auth.tsx             # Authentication context
      device-detect.ts     # iOS/Android detection
  public/
    manifest.json          # PWA manifest
    sw.js                  # Service Worker
    icons/                 # App icons
server/
  routes.ts          # API endpoints
  fit-parser.ts      # FIT file parsing
  ai-analyzer.ts     # OpenAI integration
shared/
  schema.ts          # TypeScript types/schemas
```

## API Endpoints
- `POST /api/analyze` - Upload and analyze FIT file
  - Request: multipart/form-data with `file` field
  - Response: `{ workout: WorkoutData, aiAnalysis: AIAnalysis }`

## Environment Variables
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Auto-configured by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Auto-configured by Replit AI Integrations

## Development
```bash
npm run dev    # Start development server
```

## Cloudflare Pages Deployment
Cloudflare Pagesへのデプロイに対応しています。OAuth認証とD1データベースによる履歴保存をサポート。

### ファイル構成
```
functions-src/
  api/
    analyze.ts         # FIT解析API
    workouts.ts        # 履歴API
    auth/
      github.ts        # GitHub OAuth
      google.ts        # Google OAuth
      login.ts         # メール/パスワードログイン
      register.ts      # メール/パスワード登録
      logout.ts        # ログアウト
      me.ts            # 認証状態確認
d1-schema.sql          # D1データベーススキーマ
scripts/
  build-cloudflare.sh  # ビルドスクリプト
wrangler.toml          # Cloudflare設定
vite.config.cloudflare.ts  # Cloudflare用Vite設定
CLOUDFLARE_DEPLOY.md   # デプロイ手順
AGENTS.md              # AI開発エージェント向けガイド
```

### デプロイコマンド
```bash
# D1データベース作成
npx wrangler d1 create fit-analyzer-db
npx wrangler d1 execute fit-analyzer-db --file=d1-schema.sql

# R2バケット作成（大きなワークアウトデータ用）
npx wrangler r2 bucket create fit-analyzer-workout-data

# ビルド
bash scripts/build-cloudflare.sh

# デプロイ
npx wrangler pages deploy dist
```

### 環境変数（Cloudflare Dashboard）
- `GITHUB_CLIENT_ID` - GitHub OAuth Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth Client Secret
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `APP_URL` - アプリURL（例: https://fit-analyzer.pages.dev）

### Bindings（Cloudflare Dashboard）
- `DB` - D1 Database (`fit-analyzer-db`)
- `AI` - Workers AI
- `WORKOUT_DATA` - R2 Bucket (`fit-analyzer-workout-data`)

**注意**: Cloudflare版ではWorkers AIを使用するため、`OPENAI_API_KEY`は不要です。

## iOS/Android対応

### iOS制限事項
- Web Share Target APIはiOS/iPadOSで**未サポート**
- iOSユーザー向けの回避策:
  1. COROSアプリで「ファイルに保存」
  2. FIT Analyzerで「ファイルを選択」→ファイルアプリから選択

### Android
- Web Share Target APIをサポート
- PWAインストール後、COROSアプリから直接共有可能

## バージョン確認
フッターに現在のgit commit hashが表示されます:
- 本番: `Version: d685d51`
- 開発: `Version: dev`

## Recent Changes
- Initial implementation with FIT file parsing and AI analysis
- Support for COROS, Garmin, Polar, Suunto FIT files
- Dark/light mode toggle
- Japanese language UI
- Added Cloudflare Pages deployment support
- Added PWA support (manifest.json, Service Worker, app icons)
- Added email/password authentication (register, login with PBKDF2 password hashing)
- Added Web Share Target API for Android
- Added iOS device detection and improved UX for iOS users
- Added R2 storage for large workout data (prevents D1 SQLITE_TOOBIG error)
- Added git hash version display in footer
- Added AGENTS.md for AI development agents
