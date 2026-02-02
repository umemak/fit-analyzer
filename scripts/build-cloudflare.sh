#!/bin/bash
# Cloudflare Pages用ビルドスクリプト

set -e

echo "Building for Cloudflare Pages..."

# Get git commit hash
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Git hash: $GIT_HASH"

# Export as environment variable for Vite
export VITE_GIT_HASH=$GIT_HASH

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

npx esbuild functions-src/api/auth/config.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/auth/config.js \
  --minify

# Bundle workouts function
npx esbuild functions-src/api/workouts.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/workouts.js \
  --minify

# Bundle share function (Web Share Target API)
npx esbuild functions-src/share.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/share.js \
  --minify

# Create _routes.json for Cloudflare Pages routing
echo "Creating _routes.json..."
cat > dist/_routes.json << 'ROUTES_EOF'
{
  "version": 1,
  "include": [
    "/api/*",
    "/share"
  ],
  "exclude": []
}
ROUTES_EOF

# Copy functions to root for Cloudflare Pages detection
echo "Copying functions to root..."
rm -rf functions
cp -r dist/functions functions

echo ""
echo "Build complete! Output in ./dist"
echo ""
echo "Structure:"
echo "  dist/"
echo "    index.html                   # Frontend"
echo "    assets/                      # Frontend assets"
echo "  functions/                     # Functions at root (for Cloudflare Pages)"
echo "    share.js                     # Web Share Target API"
echo "    api/"
echo "      analyze.js                 # FIT解析API"
echo "      workouts.js                # 履歴API"
echo "      auth/"
echo "        github.js                # GitHub OAuth"
echo "        google.js                # Google OAuth"
echo "        login.js                 # メール/パスワードログイン"
echo "        register.js              # メール/パスワード登録"
echo "        logout.js                # ログアウト"
echo "        me.js                    # 認証状態確認"
echo "        config.js                # OAuth設定確認"
echo ""
echo "To deploy:"
echo "  npx wrangler pages deploy dist"
