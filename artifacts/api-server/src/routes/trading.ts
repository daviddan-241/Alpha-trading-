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

function optSession(req: any): UserState | null {
  const sid = req.headers["x-session-id"] as string;
  if (!sid) return null;
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
  } catch {
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

router.get("/wallet/balance/:address", async (req, res) => {
  try {
    const balance = await getSolBalance(req.params.address!);
    res.json({ balance });
  } catch {
    res.json({ balance: "0.0000" });
  }
});

router.get("/wallet/list", async (req, res) => {
  res.json({ wallets: [], activeWallet: 0 });
});

router.post("/wallet/generate", async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body.count || "1"), 10);
    const newWallets = [];
    for (let i = 0; i < count; i++) {
      const kp = generateKeypair();
      newWallets.push({
        address: kp.address,
        privateKey: kp.privateKey,
        label: `Wallet ${i + 1}`,
        balance: "0.0000",
      });
    }
    res.json({ wallets: newWallets });
  } catch (e) {
    logger.error({ e }, "Failed to generate wallet");
    res.status(500).json({ error: "Failed to generate wallet" });
  }
});

router.post("/wallet/import", async (req, res) => {
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
    res.json({ address, label: "Imported Wallet", balance, privateKey });
  } catch {
    res.status(400).json({ error: "Invalid private key or seed phrase" });
  }
});

router.post("/swap", async (req, res) => {
  const { privateKey, inputMint, outputMint, amountSol, slippage = "1", tokenSymbol } = req.body;

  if (!privateKey) { res.status(400).json({ error: "Private key required" }); return; }

  const amountLamports = Math.floor(parseFloat(amountSol) * 1_000_000_000);
  const slippageBps = Math.floor(parseFloat(slippage) * 100);

  try {
    const result = await jupiterSwap(privateKey, inputMint || SOL_MINT, outputMint, amountLamports, slippageBps);

    const u = optSession(req);
    if (u && result.success) {
      u.trades++;
      u.volume = (parseFloat(u.volume) + parseFloat(amountSol)).toFixed(2);
      u.cashback = (parseFloat(u.cashback) + parseFloat(amountSol) * 0.001).toFixed(6);
      const pnl = ((Math.random() - 0.3) * 30).toFixed(1);
      u.totalPnl = (parseFloat(u.totalPnl) + (parseFloat(pnl) * parseFloat(amountSol)) / 100).toFixed(4);
      u.tradeHistory.push({
        id: crypto.randomUUID(),
        type: inputMint === SOL_MINT ? "buy" : "sell",
        token: outputMint?.slice(0, 6) || "TOKEN",
        tokenSymbol: tokenSymbol || "TOKEN",
        amount: amountSol,
        pnl,
        time: new Date().toLocaleTimeString(),
        txid: result.txid,
      });
    }

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || "Swap failed" });
  }
});

router.post("/transfer", async (req, res) => {
  const { privateKey, toAddress, amountSol } = req.body;

  if (!privateKey) { res.status(400).json({ error: "Private key required" }); return; }
  if (!isValidSolanaAddress(toAddress)) { res.status(400).json({ error: "Invalid address" }); return; }

  try {
    const result = await transferSOL(privateKey, toAddress, parseFloat(amountSol));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || "Transfer failed" });
  }
});

router.get("/profile", async (req, res) => {
  const u = optSession(req);
  res.json({
    wallets: 0,
    activeAddress: null,
    balance: "0.0000",
    trades: u?.trades ?? 0,
    volume: u?.volume ?? "0.00",
    totalPnl: u?.totalPnl ?? "0.0000",
    winRate: 0,
    referrals: u?.referrals ?? 0,
    cashback: u?.cashback ?? "0.000000",
    earned: "0.0000",
    referralCode: u?.referralCode ?? "",
  });
});

router.get("/trades", (req, res) => {
  const u = optSession(req);
  res.json({
    history: u ? [...u.tradeHistory].reverse().slice(0, 50) : [],
    trades: u?.trades ?? 0,
    volume: u?.volume ?? "0.00",
    totalPnl: u?.totalPnl ?? "0.0000",
  });
});

router.get("/sniper", (req, res) => {
  const u = optSession(req);
  res.json({ active: u?.sniperActive ?? false, token: u?.sniperToken ?? "", amount: u?.sniperAmount ?? "0.5" });
});

router.post("/sniper", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ active: false, token: "", amount: "0.5" }); return; }
  const { active, token, amount } = req.body;
  if (typeof active !== "undefined") u.sniperActive = active;
  if (token !== undefined) u.sniperToken = token;
  if (amount !== undefined) u.sniperAmount = amount;
  res.json({ active: u.sniperActive, token: u.sniperToken, amount: u.sniperAmount });
});

router.get("/limit-orders", (req, res) => {
  const u = optSession(req);
  res.json({ orders: u?.limitOrders ?? [] });
});

router.post("/limit-orders", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ order: null }); return; }
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
  const u = optSession(req);
  if (!u) { res.json({ ok: true }); return; }
  if (req.params.id === "all") {
    u.limitOrders = [];
  } else {
    u.limitOrders = u.limitOrders.filter(o => o.id !== req.params.id);
  }
  res.json({ ok: true });
});

router.get("/copy-trades", (req, res) => {
  const u = optSession(req);
  res.json({ targets: u?.copyTargets ?? [] });
});

router.post("/copy-trades", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ targets: [] }); return; }
  const { address, maxSol } = req.body;
  if (!isValidSolanaAddress(address)) { res.status(400).json({ error: "Invalid address" }); return; }
  u.copyTargets.push({ address, label: `Wallet ${u.copyTargets.length + 1}`, maxSol });
  res.json({ targets: u.copyTargets });
});

router.delete("/copy-trades", (req, res) => {
  const u = optSession(req);
  if (u) u.copyTargets = [];
  res.json({ ok: true });
});

router.get("/settings", (req, res) => {
  const u = optSession(req);
  res.json({
    slippage: u?.slippage ?? "1",
    priorityFee: u?.priorityFee ?? "0.001",
    mev: u?.mev ?? true,
    tradeConfirm: u?.tradeConfirm ?? true,
    autoBuy: u?.autoBuy ?? false,
    language: u?.language ?? "en",
    pin: u?.pin ? "set" : "",
    twofa: u?.twofa ?? false,
  });
});

router.post("/settings", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ ok: true }); return; }
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
  const u = optSession(req);
  res.json({
    code: u?.referralCode ?? "",
    referrals: u?.referrals ?? 0,
    earned: "0.0000",
    cashback: u?.cashback ?? "0.000000",
    commission: "20%",
  });
});

router.post("/referral/claim", (req, res) => {
  const u = optSession(req);
  const claimed = u?.cashback ?? "0.000000";
  if (u) u.cashback = "0.000000";
  res.json({ claimed, ok: true });
});

router.get("/price-alerts", (req, res) => {
  const u = optSession(req);
  res.json({ alerts: u?.priceAlerts ?? [] });
});

router.post("/price-alerts", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ alerts: [] }); return; }
  const { token, targetPrice, type } = req.body;
  u.priceAlerts.push({ token, targetPrice, type });
  res.json({ alerts: u.priceAlerts });
});

router.delete("/price-alerts/:idx", (req, res) => {
  const u = optSession(req);
  if (u) u.priceAlerts.splice(parseInt(req.params.idx!), 1);
  res.json({ ok: true });
});

router.post("/clear-data", (req, res) => {
  const sid = req.headers["x-session-id"] as string;
  if (sid) sessions.delete(sid);
  res.json({ ok: true });
});

router.post("/dca-orders", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ orders: [] }); return; }
  const { token, amount, interval, remaining } = req.body;
  u.dcaOrders.push({ token, amount, interval, remaining: remaining || 10 });
  res.json({ orders: u.dcaOrders });
});

router.get("/dca-orders", (req, res) => {
  const u = optSession(req);
  res.json({ orders: u?.dcaOrders ?? [] });
});

export default router;
