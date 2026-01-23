#!/bin/bash

# Get git hash
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "Building with git hash: $GIT_HASH"

# Export as environment variable for Vite
export VITE_GIT_HASH=$GIT_HASH

# Build client only (for Cloudflare Pages)
npm run build:client
