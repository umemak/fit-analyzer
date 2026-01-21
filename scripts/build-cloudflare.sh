#!/bin/bash
# Cloudflare Pages用ビルドスクリプト

echo "Building for Cloudflare Pages..."

# フロントエンドをビルド
npx vite build --config vite.config.cloudflare.ts

echo "Build complete! Output in ./dist"
echo ""
echo "To deploy:"
echo "  npx wrangler pages deploy dist"
