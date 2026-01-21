#!/bin/bash
# Cloudflare Pages用ビルドスクリプト

set -e

echo "Building for Cloudflare Pages..."

# フロントエンドをビルド
npx vite build --config vite.config.cloudflare.ts

# Bundle Functions with esbuild for Workers runtime
echo "Bundling API functions..."

# Create functions directory structure in dist
mkdir -p dist/functions/api

# Bundle the analyze function for Cloudflare Workers
npx esbuild functions-src/api/analyze.ts \
  --bundle \
  --platform=neutral \
  --target=es2022 \
  --format=esm \
  --outfile=dist/functions/api/analyze.js \
  --minify

echo ""
echo "Build complete! Output in ./dist"
echo ""
echo "Structure:"
echo "  dist/"
echo "    index.html       # Frontend"
echo "    assets/          # Frontend assets"
echo "    functions/api/   # Cloudflare Pages Functions"
echo ""
echo "To deploy:"
echo "  npx wrangler pages deploy dist"
