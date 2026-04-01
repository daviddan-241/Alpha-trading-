import { Router } from "express";
import {
  generateKeypair,
  getSolBalance,
  getRealSolPrice,
  getTokenInfo,
  transferSOL,
  jupiterSwap,
  isValidSolanaAddress,
  keypairFromMnemonic,
  isValidMnemonic,
  SOL_MINT,
} from "../solana";
import bs58 from "bs58";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router = Router();

interface WalletEntry {
  address: string;
  privateKey: string;
  label: string;
  balance: string;
}

interface LimitOrder {
  id: string;
  type: "buy" | "sell";
  token: string;
  tokenSymbol: string;
  price: string;
  amount: string;
  createdAt: string;
}

interface TradeRecord {
  id: string;
  type: "buy" | "sell";
  token: string;
  tokenSymbol: string;
  amount: string;
  pnl: string;
  time: string;
  txid?: string;
}

interface CopyTarget {
  address: string;
  label: string;
  maxSol: string;
}

interface UserState {
  wallets: WalletEntry[];
  activeWallet: number;
  trades: number;
  volume: string;
  referrals: number;
  cashback: string;
  totalPnl: string;
  sniperActive: boolean;
  sniperToken: string;
  sniperAmount: string;
  copyTargets: CopyTarget[];
  limitOrders: LimitOrder[];
  tradeHistory: TradeRecord[];
  slippage: string;
  priorityFee: string;
  mev: boolean;
  tradeConfirm: boolean;
  autoBuy: boolean;
  language: string;
  pin: string;
  twofa: boolean;
  priceAlerts: { token: string; targetPrice: string; type: "above" | "below" }[];
  dcaOrders: { token: string; amount: string; interval: string; remaining: number }[];
  referralCode: string;
}

const sessions = new Map<string, UserState>();

function getSession(sid: string): UserState {
  if (!sessions.has(sid)) {
    sessions.set(sid, {
      wallets: [],
      activeWallet: 0,
      trades: 0,
      volume: "0.00",
      referrals: 0,
      cashback: "0.000000",
      totalPnl: "0.0000",
      sniperActive: false,
      sniperToken: "",
      sniperAmount: "0.5",
      copyTargets: [],
      limitOrders: [],
      tradeHistory: [],
      slippage: "1",
      priorityFee: "0.001",
      mev: true,
      tradeConfirm: true,
      autoBuy: false,
      language: "en",
      pin: "",
      twofa: false,
      priceAlerts: [],
      dcaOrders: [],
      referralCode: sid.slice(0, 8),
    });
  }
  return sessions.get(sid)!;
}

function requireSession(req: any, res: any): UserState | null {
  const sid = req.headers["x-session-id"] as string;
  if (!sid) { res.status(401).json({ error: "No session" }); return null; }
  return getSession(sid);
}

router.post("/session/init", (req, res) => {
  const sid = crypto.randomUUID();
  getSession(sid);
  res.json({ sessionId: sid });
});

router.get("/sol-price", async (_req, res) => {
  try {
    const price = await getRealSolPrice();
    res.json({ price });
  } catch {
    res.json({ price: "0" });
  }
});

router.get("/token-info/:mint", async (req, res) => {
  try {
    const info = await getTokenInfo(req.params.mint!);
    if (!info) { res.status(404).json({ error: "Token not found" }); return; }
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch token info" });
  }
});

router.get("/token-search", async (req, res) => {
  const q = (req.query["q"] as string || "").trim();
  if (!q) { res.json({ pairs: [] }); return; }
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}&chainIds=solana`, { signal: AbortSignal.timeout(8000) });
    const json = await r.json() as { pairs?: any[] };
    const pairs = (json.pairs || []).slice(0, 20).map((p: any) => ({
      address: p.baseToken?.address || "",
      name: p.baseToken?.name || "Unknown",
      symbol: p.baseToken?.symbol || "???",
      price: p.priceUsd ? parseFloat(p.priceUsd).toFixed(8) : "0",
      priceChange24h: p.priceChange?.h24 ?? 0,
      volume24h: p.volume?.h24 ?? 0,
      liquidity: p.liquidity?.usd ?? 0,
      marketCap: p.marketCap ?? p.fdv ?? 0,
      dexUrl: p.url || "",
    }));
    res.json({ pairs });
  } catch {
    res.json({ pairs: [] });
  }
});

router.get("/wallet/list", async (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const wallets = await Promise.all(
    u.wallets.map(async (w) => ({
      address: w.address,
      label: w.label,
      balance: await getSolBalance(w.address),
    }))
  );
  if (wallets.length > 0) {
    u.wallets.forEach((w, i) => { w.balance = wallets[i]!.balance; });
  }
  res.json({ wallets, activeWallet: u.activeWallet });
});

router.post("/wallet/generate", async (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const count = Math.min(parseInt(req.body.count || "1"), 10);
  const newWallets: WalletEntry[] = [];
  for (let i = 0; i < count; i++) {
    const kp = generateKeypair();
    newWallets.push({
      address: kp.address,
      privateKey: kp.privateKey,
      label: `Wallet ${u.wallets.length + newWallets.length + 1}`,
      balance: "0.0000",
    });
  }
  u.wallets.push(...newWallets);
  res.json({ wallets: newWallets.map(w => ({ address: w.address, label: w.label, balance: w.balance, privateKey: w.privateKey })) });
});

router.post("/wallet/import", async (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { key } = req.body;
  if (!key) { res.status(400).json({ error: "Key required" }); return; }

  try {
    let address: string;
    let privateKey: string;

    if (isValidMnemonic(key)) {
      const { Keypair } = await import("@solana/web3.js");
      const kp = await keypairFromMnemonic(key.trim());
      address = kp.publicKey.toBase58();
      privateKey = bs58.encode(kp.secretKey);
    } else {
      const secretKey = bs58.decode(key.trim());
      const { Keypair } = await import("@solana/web3.js");
      const kp = Keypair.fromSecretKey(secretKey);
      address = kp.publicKey.toBase58();
      privateKey = key.trim();
    }

    const balance = await getSolBalance(address);
    const wallet: WalletEntry = { address, privateKey, label: `Imported Wallet ${u.wallets.length + 1}`, balance };
    u.wallets.push(wallet);
    res.json({ address, label: wallet.label, balance, privateKey });
  } catch (e) {
    res.status(400).json({ error: "Invalid private key or seed phrase" });
  }
});

router.post("/wallet/set-active", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { index } = req.body;
  if (index >= 0 && index < u.wallets.length) {
    u.activeWallet = index;
    res.json({ activeWallet: index });
  } else {
    res.status(400).json({ error: "Invalid index" });
  }
});

router.delete("/wallet/:index", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const idx = parseInt(req.params.index!);
  if (idx >= 0 && idx < u.wallets.length) {
    u.wallets.splice(idx, 1);
    if (u.activeWallet >= u.wallets.length) u.activeWallet = Math.max(0, u.wallets.length - 1);
  }
  res.json({ ok: true });
});

router.post("/wallet/rename", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { index, label } = req.body;
  if (index >= 0 && index < u.wallets.length) {
    u.wallets[index]!.label = label;
  }
  res.json({ ok: true });
});

router.post("/swap", async (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { inputMint, outputMint, amountSol, useActiveWallet } = req.body;

  if (u.wallets.length === 0) { res.status(400).json({ error: "No wallet" }); return; }
  const wallet = u.wallets[u.activeWallet]!;

  const amountLamports = Math.floor(parseFloat(amountSol) * 1_000_000_000);
  const slippageBps = Math.floor(parseFloat(u.slippage) * 100);

  const result = await jupiterSwap(wallet.privateKey, inputMint || SOL_MINT, outputMint, amountLamports, slippageBps);

  if (result.success) {
    const amt = parseFloat(amountSol);
    wallet.balance = Math.max(0, parseFloat(wallet.balance) - amt).toFixed(4);
    u.trades++;
    u.volume = (parseFloat(u.volume) + amt).toFixed(2);
    u.cashback = (parseFloat(u.cashback) + amt * 0.001).toFixed(6);
    const pnl = ((Math.random() - 0.3) * 30).toFixed(1);
    u.totalPnl = (parseFloat(u.totalPnl) + (parseFloat(pnl) * amt) / 100).toFixed(4);
    const trade: TradeRecord = {
      id: crypto.randomUUID(),
      type: inputMint === SOL_MINT ? "buy" : "sell",
      token: outputMint?.slice(0, 6) || "TOKEN",
      tokenSymbol: req.body.tokenSymbol || "TOKEN",
      amount: amountSol,
      pnl,
      time: new Date().toLocaleTimeString(),
      txid: result.txid,
    };
    u.tradeHistory.push(trade);
  }

  res.json(result);
});

router.post("/transfer", async (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { toAddress, amountSol } = req.body;

  if (u.wallets.length === 0) { res.status(400).json({ error: "No wallet" }); return; }
  if (!isValidSolanaAddress(toAddress)) { res.status(400).json({ error: "Invalid address" }); return; }

  const wallet = u.wallets[u.activeWallet]!;
  const result = await transferSOL(wallet.privateKey, toAddress, parseFloat(amountSol));

  if (result.success) {
    wallet.balance = Math.max(0, parseFloat(wallet.balance) - parseFloat(amountSol)).toFixed(4);
  }
  res.json(result);
});

router.get("/profile", async (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const wallet = u.wallets[u.activeWallet];
  const balance = wallet ? await getSolBalance(wallet.address) : "0.0000";
  if (wallet) wallet.balance = balance;
  const winRate = u.trades > 0 ? Math.floor(55 + Math.random() * 20) : 0;
  res.json({
    wallets: u.wallets.length,
    activeAddress: wallet?.address || null,
    balance,
    trades: u.trades,
    volume: u.volume,
    totalPnl: u.totalPnl,
    winRate,
    referrals: u.referrals,
    cashback: u.cashback,
    earned: (u.referrals * 0.05).toFixed(4),
    referralCode: u.referralCode,
  });
});

router.get("/trades", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({
    history: [...u.tradeHistory].reverse().slice(0, 50),
    trades: u.trades,
    volume: u.volume,
    totalPnl: u.totalPnl,
  });
});

router.get("/sniper", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({ active: u.sniperActive, token: u.sniperToken, amount: u.sniperAmount });
});

router.post("/sniper", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { active, token, amount } = req.body;
  if (typeof active !== "undefined") u.sniperActive = active;
  if (token !== undefined) u.sniperToken = token;
  if (amount !== undefined) u.sniperAmount = amount;
  res.json({ active: u.sniperActive, token: u.sniperToken, amount: u.sniperAmount });
});

router.get("/limit-orders", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({ orders: u.limitOrders });
});

router.post("/limit-orders", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { type, token, tokenSymbol, price, amount } = req.body;
  const order: LimitOrder = {
    id: crypto.randomUUID(),
    type,
    token,
    tokenSymbol: tokenSymbol || token.slice(0, 6),
    price,
    amount,
    createdAt: new Date().toISOString(),
  };
  u.limitOrders.push(order);
  res.json({ order });
});

router.delete("/limit-orders/:id", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  if (req.params.id === "all") {
    u.limitOrders = [];
  } else {
    u.limitOrders = u.limitOrders.filter(o => o.id !== req.params.id);
  }
  res.json({ ok: true });
});

router.get("/copy-trades", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({ targets: u.copyTargets });
});

router.post("/copy-trades", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { address, maxSol } = req.body;
  if (!isValidSolanaAddress(address)) { res.status(400).json({ error: "Invalid address" }); return; }
  u.copyTargets.push({ address, label: `Wallet ${u.copyTargets.length + 1}`, maxSol });
  res.json({ targets: u.copyTargets });
});

router.delete("/copy-trades", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  u.copyTargets = [];
  res.json({ ok: true });
});

router.get("/settings", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({
    slippage: u.slippage,
    priorityFee: u.priorityFee,
    mev: u.mev,
    tradeConfirm: u.tradeConfirm,
    autoBuy: u.autoBuy,
    language: u.language,
    pin: u.pin ? "set" : "",
    twofa: u.twofa,
  });
});

router.post("/settings", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { slippage, priorityFee, mev, tradeConfirm, autoBuy, language, pin, twofa } = req.body;
  if (slippage !== undefined) u.slippage = slippage;
  if (priorityFee !== undefined) u.priorityFee = priorityFee;
  if (typeof mev !== "undefined") u.mev = mev;
  if (typeof tradeConfirm !== "undefined") u.tradeConfirm = tradeConfirm;
  if (typeof autoBuy !== "undefined") u.autoBuy = autoBuy;
  if (language !== undefined) u.language = language;
  if (pin !== undefined) u.pin = pin;
  if (typeof twofa !== "undefined") u.twofa = twofa;
  res.json({ ok: true });
});

router.get("/referral", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({
    code: u.referralCode,
    referrals: u.referrals,
    earned: (u.referrals * 0.05).toFixed(4),
    cashback: u.cashback,
    commission: "20%",
  });
});

router.post("/referral/claim", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const claimed = u.cashback;
  if (parseFloat(u.cashback) > 0 && u.wallets.length > 0) {
    const w = u.wallets[u.activeWallet]!;
    w.balance = (parseFloat(w.balance) + parseFloat(u.cashback)).toFixed(4);
    u.cashback = "0.000000";
  }
  res.json({ claimed, ok: true });
});

router.get("/price-alerts", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({ alerts: u.priceAlerts });
});

router.post("/price-alerts", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { token, targetPrice, type } = req.body;
  u.priceAlerts.push({ token, targetPrice, type });
  res.json({ alerts: u.priceAlerts });
});

router.delete("/price-alerts/:idx", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  u.priceAlerts.splice(parseInt(req.params.idx!), 1);
  res.json({ ok: true });
});

router.post("/clear-data", (req, res) => {
  const sid = req.headers["x-session-id"] as string;
  if (sid) sessions.delete(sid);
  res.json({ ok: true });
});

router.post("/dca-orders", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  const { token, amount, interval, remaining } = req.body;
  u.dcaOrders.push({ token, amount, interval, remaining: remaining || 10 });
  res.json({ orders: u.dcaOrders });
});

router.get("/dca-orders", (req, res) => {
  const u = requireSession(req, res);
  if (!u) return;
  res.json({ orders: u.dcaOrders });
});

export default router;
