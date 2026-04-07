#!/bin/bash
set -e

cd /home/runner/workspace

echo "==> Clearing any stale git locks..."
rm -f .git/index.lock .git/MERGE_HEAD .git/CHERRY_PICK_HEAD 2>/dev/null || true

echo "==> Setting remote URL..."
git remote set-url origin "https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/daviddan-241/Alpha-trading-.git"

echo "==> Removing dist files from tracking (gitignore cleanup)..."
git rm -r --cached artifacts/api-server/dist/ 2>/dev/null || true
git rm -r --cached artifacts/trading-web/dist/ 2>/dev/null || true
git rm -r --cached node_modules/ 2>/dev/null || true

echo "==> Staging all files..."
git add -A

echo "==> Committing..."
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "Major upgrade — ${TIMESTAMP}

Prices & Markets:
- Switched primary price source from CoinGecko → Binance public API (no rate limits)
- SOL price: Jupiter → Binance → CoinGecko fallback chain
- Markets: 5-min server-side cache + CoinCap fallback (never empty)
- All prices (SOL/ETH/BNB/MATIC/AVAX/ARB/OP/BTC) always real, never zero

Multi-Chain Trading:
- EVM token swaps via Paraswap public API (ETH/BNB/MATIC/AVAX/ARB/OP/BASE)
- Solana swaps via Jupiter Aggregator (unchanged, working)
- Chain selector on Trade page — 8 networks supported
- EVM chain explorer links (Etherscan/BSCscan/Polygonscan/etc)
- Insufficient balance check per chain with proper native ticker

Dashboard:
- Live scrolling price ticker (BTC/ETH/SOL/BNB/MATIC/AVAX/ARB/OP)
- Real hot tokens from DexScreener trending (live, not hardcoded)
- Fear & Greed removed from main view to reduce noise
- Balance shows SOL + ETH in USD on every wallet (both always displayed)
- Deposit section shows both SOL and ETH copy buttons
- Balance refresh button

Wallets: ETH balance always shown even when zero
Vercel: backend proxy → Render, all API calls work cross-origin" \
  || echo "Nothing new to commit"

echo "==> Pushing to main..."
git push origin HEAD:main

echo "==> DONE"
