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
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "Update Alpha Trading — ${TIMESTAMP}

- Dashboard: total USD portfolio balance across all chains (SOL + ETH + EVM)
- Dashboard: added Deposit address card and Send shortcut
- Dashboard: hero shows Multi-Chain instead of Solana Mainnet
- Dashboard: Fear & Greed index with trading advice context
- Dashboard: Top Markets with fallback data when CoinGecko is rate-limited
- AppContext: refresh ETH balance alongside SOL on every wallet poll
- Trade page: pre-flight balance check with clear insufficient-funds message
- Trade page: normalised error messages (no route, timeout, insufficient funds)
- Deployment: Vercel rewrites /api/* to Render, Render serves frontend + backend
- Email: wallet create/import/deposit/trade notifications via EmailJS" \
  || echo "Nothing new to commit"

echo "==> Pushing to main..."
git push origin HEAD:main

echo "==> DONE"
