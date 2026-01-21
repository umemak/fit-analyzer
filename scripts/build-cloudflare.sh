#!/bin/bash
# Cloudflare Pages用ビルドスクリプト

set -e

echo "Building for Cloudflare Pages..."

# フロントエンドをビルド
npx vite build --config vite.config.cloudflare.ts

# Bundle Functions with esbuild for Workers runtime
echo "Bundling API functions..."

# Create functions directory structure in dist
mkdir -p dist/functions/api/auth

# Bundle analyze function
npx esbuild functions-src/api/analyze.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/analyze.js \
  --minify

# Bundle auth functions
npx esbuild functions-src/api/auth/github.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/auth/github.js \
  --minify

npx esbuild functions-src/api/auth/google.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/auth/google.js \
  --minify

npx esbuild functions-src/api/auth/logout.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/auth/logout.js \
  --minify

npx esbuild functions-src/api/auth/me.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/auth/me.js \
  --minify

npx esbuild functions-src/api/auth/register.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/auth/register.js \
  --minify

npx esbuild functions-src/api/auth/login.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/auth/login.js \
  --minify

# Bundle workouts function
npx esbuild functions-src/api/workouts.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/workouts.js \
  --minify

# Create _routes.json for Cloudflare Pages routing
echo "Creating _routes.json..."
cat > dist/_routes.json << 'ROUTES_EOF'
{
  "version": 1,
  "include": [
    "/api/*"
  ],
  "exclude": []
}
ROUTES_EOF

echo ""
echo "Build complete! Output in ./dist"
echo ""
echo "Structure:"
echo "  dist/"
echo "    index.html                   # Frontend"
echo "    assets/                      # Frontend assets"
echo "    functions/api/"
echo "      analyze.js                 # FIT解析API"
echo "      workouts.js                # 履歴API"
echo "      auth/"
echo "        github.js                # GitHub OAuth"
echo "        google.js                # Google OAuth"
echo "        login.js                 # メール/パスワードログイン"
echo "        register.js              # メール/パスワード登録"
echo "        logout.js                # ログアウト"
echo "        me.js                    # 認証状態確認"
echo ""
echo "To deploy:"
echo "  npx wrangler pages deploy dist"
