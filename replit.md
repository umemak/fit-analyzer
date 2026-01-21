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

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js
- **Styling**: Tailwind CSS + shadcn/ui
- **FIT Parsing**: fit-file-parser
- **AI (Replit)**: OpenAI (via Replit AI Integrations)
- **AI (Cloudflare)**: Cloudflare Workers AI (Llama 3.1 70B)
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
    pages/
      home.tsx             # Upload page
      analysis.tsx         # Analysis dashboard
    lib/
      theme-provider.tsx   # Dark/light mode
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
      logout.ts        # ログアウト
      me.ts            # 認証状態確認
d1-schema.sql          # D1データベーススキーマ
scripts/
  build-cloudflare.sh  # ビルドスクリプト
wrangler.toml          # Cloudflare設定
vite.config.cloudflare.ts  # Cloudflare用Vite設定
CLOUDFLARE_DEPLOY.md   # デプロイ手順
```

### デプロイコマンド
```bash
# D1データベース作成
npx wrangler d1 create fit-analyzer-db
npx wrangler d1 execute fit-analyzer-db --file=d1-schema.sql

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

**注意**: Cloudflare版ではWorkers AIを使用するため、`OPENAI_API_KEY`は不要です。

## Recent Changes
- Initial implementation with FIT file parsing and AI analysis
- Support for COROS, Garmin, Polar, Suunto FIT files
- Dark/light mode toggle
- Japanese language UI
- Added Cloudflare Pages deployment support
- Added PWA support (manifest.json, Service Worker, app icons)
- Added email/password authentication (register, login with PBKDF2 password hashing)
