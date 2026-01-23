# Cloudflare Pages ビルド設定変更手順

## 現在の状態
本番環境: **Version: dev** (確認済み)
↓
これは Build command が古い設定のままであることを示しています。

## 設定変更手順

### 1. Cloudflare Dashboard にアクセス
https://dash.cloudflare.com/

### 2. Pages プロジェクトを開く
- Pages > **fit-analyzer** を選択

### 3. Settings に移動
- Settings タブをクリック
- **Builds & deployments** セクションへスクロール

### 4. Build configuration を編集
現在の設定を確認し、以下に変更：

#### **Build command**
❌ 現在（おそらく）: `npm run build` または `vite build`
✅ 変更後: `npm run build:pages`

#### **Build output directory**
✅ そのまま: `dist/public`

#### **Root directory (optional)**
✅ そのまま: (空欄 または `/`)

### 5. 環境変数の確認（オプション）
- Environment variables セクション
- 特に追加は不要（ビルドスクリプトが自動設定）

### 6. 保存
- **Save** ボタンをクリック

### 7. 再デプロイ
以下のいずれかの方法で再デプロイ：

#### **方法A: 手動再デプロイ**
- Deployments タブ
- 最新デプロイの右側の「...」メニュー
- **Retry deployment** をクリック

#### **方法B: 新しいコミットをプッシュ**
```bash
# 既に最新コミットがプッシュ済みなので、空コミットを作成
git commit --allow-empty -m "trigger: rebuild with correct build command"
git push origin main
```

## 確認方法

### ビルドログで確認
デプロイ中のログに以下が表示されるはずです：
```
> npm run build:pages

Building with git hash: b8cb1d4
[Vite Config] Using VITE_GIT_HASH from env: b8cb1d4
```

### デプロイ後の確認
1. https://fit-analyzer.pages.dev にアクセス
2. ページ最下部のフッターを確認
3. **Version: b8cb1d4** と表示される

## トラブルシューティング

### それでも `dev` と表示される場合

1. **ブラウザキャッシュをクリア**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

2. **ビルドログを確認**
   - `Building with git hash:` の行があるか確認
   - エラーメッセージがないか確認

3. **package.json を確認**
   - `build:pages` スクリプトが存在するか
   - scripts/build-pages.sh が実行可能か

4. **wrangler.toml ではなく Pages Dashboard で設定**
   - Cloudflare Pages は wrangler.toml のビルド設定を使いません
   - 必ず Dashboard から設定してください

## 参考リンク
- [Cloudflare Pages Build Configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
