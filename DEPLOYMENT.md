# デプロイ手順

## 前提条件
- Cloudflare アカウント
- wrangler CLI インストール済み
- ローカルマシンで実行（サンドボックスではOAuth認証不可）

## 手順

### 1. Wrangler ログイン（ローカルマシンで実行）

```bash
npx wrangler login
```

ブラウザが開き、Cloudflare にログインします。

### 2. R2 バケット作成

```bash
npx wrangler r2 bucket create fit-analyzer-workout-data
```

**出力例:**
```
✅ Created bucket 'fit-analyzer-workout-data' with default storage class set to Standard.
```

**確認:**
```bash
npx wrangler r2 bucket list
```

### 3. D1 マイグレーション実行

既存データベースにマイグレーションを適用：

```bash
npx wrangler d1 execute fit-analyzer-db --remote --file=./migrations/0001_add_r2_key_to_workouts.sql
```

**出力例:**
```
🌀 Mapping SQL input into an array of statements
🌀 Executing on remote database fit-analyzer-db (d63d86b2-a801-46ef-9839-a14c8eaf053a):
🌀 To execute on your local development database, pass the --local flag to 'wrangler d1 execute'
✅ Executed 2 statements successfully
```

**確認:**
```bash
npx wrangler d1 execute fit-analyzer-db --remote --command="PRAGMA table_info(workouts);"
```

`r2_key` カラムが追加されていることを確認。

### 4. Cloudflare Pages バインディング設定

Cloudflare Dashboard で設定：

1. **Pagesプロジェクトを開く**
   - https://dash.cloudflare.com/
   - Pages > fit-analyzer > Settings > Functions

2. **R2 Bucket Bindings を追加**
   - スクロールして "R2 bucket bindings" セクションへ
   - "Add binding" をクリック
   - Variable name: `WORKOUT_DATA`
   - R2 bucket: `fit-analyzer-workout-data` を選択
   - "Save" をクリック

3. **既存のバインディングを確認**
   - D1 database binding:
     - Variable name: `DB`
     - Database: `fit-analyzer-db`
   
   - Workers AI binding:
     - Variable name: `AI`

4. **環境変数を確認**
   - Settings > Environment variables
   - `AI_INTEGRATIONS_OPENAI_API_KEY`: 設定済みか確認
   - `AI_INTEGRATIONS_OPENAI_BASE_URL`: 設定済みか確認

### 5. デプロイ

```bash
# Git push でデプロイ（自動デプロイの場合）
git push origin main

# または手動デプロイ
npm run build
npx wrangler pages deploy dist --project-name=fit-analyzer
```

### 6. 動作確認

1. https://fit-analyzer.pages.dev にアクセス
2. FITファイルをアップロード（大きめのファイルで確認）
3. エラーログを確認：
   ```bash
   npx wrangler pages deployment tail --project-name=fit-analyzer
   ```
4. `SQLITE_TOOBIG` エラーが出ないことを確認
5. R2にデータが保存されているか確認：
   ```bash
   npx wrangler r2 object list fit-analyzer-workout-data
   ```

## トラブルシューティング

### R2バケットが見つからない
```bash
# バケット一覧を確認
npx wrangler r2 bucket list

# 再作成
npx wrangler r2 bucket create fit-analyzer-workout-data
```

### マイグレーションエラー
```bash
# 既に r2_key カラムが存在する場合
# マイグレーションファイルを修正して "IF NOT EXISTS" を追加
```

### バインディングエラー
- Cloudflare Dashboard でバインディング設定を再確認
- Variable name のスペルミスがないか確認
- 設定後、デプロイを再実行

## ロールバック手順

問題が発生した場合：

1. **R2を使わない設定に戻す**
   ```bash
   # wrangler.toml から R2 バインディングをコメントアウト
   # functions-src/api/analyze.ts で R2保存をスキップ
   ```

2. **マイグレーションをロールバック**
   ```bash
   npx wrangler d1 execute fit-analyzer-db --remote --command="ALTER TABLE workouts DROP COLUMN r2_key;"
   ```

## 参考リンク

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
