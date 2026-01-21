# Cloudflare Pages へのデプロイ手順

このアプリケーションをCloudflare Pagesにデプロイする方法を説明します。

## 前提条件

1. Cloudflareアカウント
2. OpenAI APIキー

## デプロイ手順

### 1. Cloudflare Pagesプロジェクトを作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Workers & Pages** > **Create application** > **Pages**
3. **Connect to Git** を選択し、GitHubリポジトリを接続

### 2. ビルド設定

以下の設定を使用：

| 設定項目 | 値 |
|---------|---|
| Framework preset | None |
| Build command | `bash scripts/build-cloudflare.sh` |
| Build output directory | `dist` |
| Root directory | `/` |

### 3. 環境変数の設定

**Settings** > **Environment variables** で以下を設定：

| 変数名 | 説明 |
|-------|------|
| `OPENAI_API_KEY` | OpenAI APIキー（https://platform.openai.com/api-keys で取得） |

> **注意**: Replitでの開発時は `AI_INTEGRATIONS_OPENAI_API_KEY` を使用していますが、Cloudflareでは標準の `OPENAI_API_KEY` を設定してください。

### 4. デプロイ

設定完了後、**Save and Deploy** をクリック

## ローカルでのテスト

```bash
# フロントエンドビルド
bash scripts/build-cloudflare.sh

# Wranglerでローカルサーバー起動
npx wrangler pages dev dist --binding OPENAI_API_KEY=sk-your-key
```

## ファイル構成

```
├── functions-src/          # ソースファイル（開発用）
│   └── api/
│       └── analyze.ts      # Pages Function ソース
├── dist/                   # ビルド出力（デプロイ対象）
│   ├── index.html          # フロントエンド
│   ├── assets/             # フロントエンドアセット
│   └── functions/api/      # バンドル済みPages Functions
├── scripts/
│   └── build-cloudflare.sh # ビルドスクリプト
├── wrangler.toml           # Cloudflare設定
└── vite.config.cloudflare.ts  # Cloudflare用Vite設定
```

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
