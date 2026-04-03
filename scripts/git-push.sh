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
  commit -m "Fix: stateless wallets+transfer, localStorage, bot chat

- Backend: wallet generate/import/transfer/swap now fully stateless
  - No in-memory session required (Vercel serverless compatible)
  - transfer and swap accept privateKey in request body
  - New GET /wallet/balance/:address endpoint
- Frontend AppContext: wallets in localStorage (alpha_wallets_v2)
  - Stores privateKey, refreshes balances from chain
  - addWallet, removeWallet, setActive, renameWallet
- Wallets.tsx: AppContext-based CRUD, always shows privateKey
- Transfer.tsx: passes activeWallet.privateKey to api.transfer
- Trade.tsx: passes privateKey to api.swap
- Chat.tsx: full rewrite as Solana trading bot assistant" || echo "Nothing new to commit"

echo "==> Pushing to main..."
git push origin HEAD:main

echo "==> DONE"
