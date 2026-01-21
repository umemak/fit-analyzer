# Cloudflare Pages へのデプロイ手順

このアプリケーションをCloudflare Pagesにデプロイする方法を説明します。

## 前提条件

1. Cloudflareアカウント
2. OpenAI APIキー
3. GitHub OAuth App（認証用）
4. Google OAuth クレデンシャル（認証用）

## デプロイ手順

### 1. D1データベースを作成

```bash
# Wrangler CLIでD1データベースを作成
npx wrangler d1 create fit-analyzer-db

# 出力されるdatabase_idをwrangler.tomlにコピー
```

スキーマを適用：
```bash
npx wrangler d1 execute fit-analyzer-db --file=d1-schema.sql
```

### 2. OAuth Appを作成

#### GitHub OAuth App
1. GitHub Settings > Developer settings > OAuth Apps > New OAuth App
2. 設定：
   - Application name: `FIT Analyzer`
   - Homepage URL: `https://your-app.pages.dev`
   - Authorization callback URL: `https://your-app.pages.dev/api/auth/github`
3. Client ID と Client Secret を取得

#### Google OAuth
1. Google Cloud Console > APIs & Services > Credentials
2. Create Credentials > OAuth client ID > Web application
3. 設定：
   - Authorized redirect URIs: `https://your-app.pages.dev/api/auth/google`
4. Client ID と Client Secret を取得

### 3. Cloudflare Pagesプロジェクトを作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** > **Create application** > **Pages**
3. **Connect to Git** を選択し、GitHubリポジトリを接続

### 4. ビルド設定

以下の設定を使用：

| 設定項目 | 値 |
|---------|---|
| Framework preset | None |
| Build command | `bash scripts/build-cloudflare.sh` |
| Build output directory | `dist` |
| Root directory | `/` |

### 5. D1バインディングを設定

1. Settings > Functions > D1 database bindings
2. Variable name: `DB`
3. D1 database: `fit-analyzer-db`

### 6. 環境変数の設定

**Settings** > **Environment variables** で以下を設定：

| 変数名 | 説明 |
|-------|------|
| `OPENAI_API_KEY` | OpenAI APIキー |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `APP_URL` | アプリのURL（例: `https://fit-analyzer.pages.dev`） |

### 7. デプロイ

設定完了後、**Save and Deploy** をクリック

## ローカルでのテスト

```bash
# D1データベースをローカルで作成
npx wrangler d1 create fit-analyzer-db --local

# スキーマを適用
npx wrangler d1 execute fit-analyzer-db --local --file=d1-schema.sql

# ビルド
bash scripts/build-cloudflare.sh

# Wranglerでローカルサーバー起動
npx wrangler pages dev dist \
  --binding OPENAI_API_KEY=sk-your-key \
  --binding GITHUB_CLIENT_ID=your-id \
  --binding GITHUB_CLIENT_SECRET=your-secret \
  --binding GOOGLE_CLIENT_ID=your-id \
  --binding GOOGLE_CLIENT_SECRET=your-secret \
  --binding APP_URL=http://localhost:8788 \
  --d1 DB=fit-analyzer-db
```

## ファイル構成

```
├── functions-src/          # ソースファイル（開発用）
│   ├── api/
│   │   ├── analyze.ts      # FIT解析API
│   │   ├── workouts.ts     # 履歴API
│   │   └── auth/
│   │       ├── github.ts   # GitHub OAuth
│   │       ├── google.ts   # Google OAuth
│   │       ├── logout.ts   # ログアウト
│   │       └── me.ts       # 認証状態確認
├── dist/                   # ビルド出力（デプロイ対象）
│   ├── index.html          # フロントエンド
│   ├── assets/             # フロントエンドアセット
│   └── functions/api/      # バンドル済みPages Functions
├── d1-schema.sql           # D1データベーススキーマ
├── scripts/
│   └── build-cloudflare.sh # ビルドスクリプト
├── wrangler.toml           # Cloudflare設定
└── vite.config.cloudflare.ts  # Cloudflare用Vite設定
```

## 機能

### 認証
- **GitHub OAuth**: GitHubアカウントでログイン
- **Google OAuth**: Googleアカウントでログイン

### 履歴管理
- ログイン済みユーザーのワークアウトは自動的にD1データベースに保存
- 履歴ページで過去のワークアウトを一覧表示
- 各ワークアウトの詳細を再確認可能

## 注意事項

- **デプロイされるのはdist/フォルダのみです**。functions-src/はソースファイルで、ビルド時にdist/functions/にバンドルされます。

- Cloudflare Workersの制限：
  - メモリ: 128MB
  - CPU時間: 10ms（Free）/ 50ms（Paid）
  - リクエストサイズ: 100MB
- 大きなFITファイル（50MB以上）はタイムアウトする可能性があります

## トラブルシューティング

### APIエラー

Cloudflare Dashboardの **Workers & Pages** > プロジェクト > **Functions** タブでログを確認

### ビルドエラー

ローカルで以下を実行してエラーを確認：
```bash
bash scripts/build-cloudflare.sh
```

### 認証エラー

- OAuth Appのリダイレクト URLが正しいか確認
- APP_URL環境変数が正しく設定されているか確認
