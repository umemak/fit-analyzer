# FIT Analyzer

AIを使ったワークアウト分析アプリケーション

## セットアップ

### 1. R2バケットの作成

```bash
# R2バケットを作成
npx wrangler r2 bucket create fit-analyzer-workout-data

# または Cloudflare Dashboard で作成
# https://dash.cloudflare.com/ > R2 > Create bucket
```

### 2. D1データベースのセットアップ

```bash
# データベースが未作成の場合
npx wrangler d1 create fit-analyzer-db

# スキーマを適用
npx wrangler d1 execute fit-analyzer-db --file=./d1-schema.sql

# マイグレーションを適用（既存DBの場合）
npx wrangler d1 execute fit-analyzer-db --file=./migrations/0001_add_r2_key_to_workouts.sql
```

### 3. Cloudflare Pagesのバインディング設定

Cloudflare Dashboard で以下のバインディングを設定：

1. **D1 Database**
   - Variable name: `DB`
   - D1 database: `fit-analyzer-db`

2. **Workers AI**
   - Variable name: `AI`

3. **R2 Bucket**
   - Variable name: `WORKOUT_DATA`
   - R2 bucket: `fit-analyzer-workout-data`

### 4. 環境変数の設定

Cloudflare Pages の Settings > Environment variables で以下を設定：

- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI APIキー
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI Base URL

## アーキテクチャ

### データストレージ

- **D1 (SQLite)**: ユーザー情報、ワークアウトメタデータ、AI分析結果
- **R2 (Object Storage)**: 完全なワークアウトデータ（FITファイルのrecords配列など）

R2を使用することで、D1の`SQLITE_TOOBIG`エラーを回避し、大きなワークアウトデータを効率的に保存できます。

### データフロー

1. FITファイルアップロード
2. ワークアウトデータを解析
3. AI分析を実行
4. **完全なワークアウトデータをR2に保存** (`workouts/{userId}/{workoutId}.json`)
5. **メタデータとR2キーをD1に保存**
6. AI分析結果をD1に保存

## 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# デプロイ
npm run deploy
```

## マイグレーション

新しいマイグレーションを作成：

```bash
# マイグレーションファイルを作成
touch migrations/000X_migration_name.sql

# 本番環境に適用
npx wrangler d1 execute fit-analyzer-db --file=./migrations/000X_migration_name.sql
```
