#!/bin/bash
set -e

cd /home/runner/workspace

echo "==> Clearing any stale git locks..."
rm -f .git/index.lock .git/MERGE_HEAD .git/CHERRY_PICK_HEAD 2>/dev/null || true

echo "==> Setting remote URL..."
git remote set-url origin "https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/daviddan-241/Alpha-trading-.git"

echo "==> Staging all files..."
git add -A

echo "==> Committing..."
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "Fix PIN focus bug, remove password field, fix Render & Vercel deploy

- Wallets.tsx: inline SetupForm JSX to fix PIN input focus loss on keystroke
- Wallets.tsx: remove password field — only name + PIN required for wallet setup
- render.yaml: build frontend before backend so dist/index.html exists on Render
- vercel.json: proxy /api/* to Render backend so all features work on Vercel
- PIN input: added show/hide toggle, digit-only validation, 4-digit hint
- Keepalive: server self-pings /api/healthz every 10 min via RENDER_EXTERNAL_URL
  (Point UptimeRobot to https://alpha-trading-fx3f.onrender.com/api/healthz)" \
  || echo "Nothing new to commit"

echo "==> Pushing to main..."
git push origin HEAD:main

echo "==> DONE"
