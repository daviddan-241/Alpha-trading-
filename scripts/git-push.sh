#!/bin/bash
set -e

cd /home/runner/workspace

echo "==> Setting remote URL..."
git remote set-url origin "https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/daviddan-241/Alpha-trading-.git"

echo "==> Staging all files..."
git add -A

echo "==> Committing..."
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "Add Vercel and Netlify deployment support

- vercel.json: build config and serverless API routing  
- netlify.toml: build config, function routing, SPA fallback
- api/handler.mjs: Vercel serverless Express wrapper
- netlify/functions/api.mjs: Netlify function wrapper
- artifacts/api-server/src/serverless.ts: serverless entry point
- Updated pnpm-lock.yaml to sync all dependencies" || echo "Nothing new to commit"

echo "==> Pushing to main..."
git push origin HEAD:main

echo "==> DONE"
