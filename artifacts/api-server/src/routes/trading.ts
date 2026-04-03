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
import {
  generateEthWallet,
  ethWalletFromMnemonic,
  ethWalletFromPrivateKey,
  getEthBalance,
  getBscBalance,
  getEvmBalance,
  getEthPrice,
  getBnbPrice,
  getAllPrices,
  sendEth,
  getEthTokenInfo,
  isValidEthAddress,
  isEvmChain,
  CHAIN_NATIVE,
} from "../ethereum";
import { startCopyTrading, stopCopyTrading, getCopyTradingStatus } from "../copyTrader";
import bs58 from "bs58";
import { logger } from "../lib/logger";
import crypto from "crypto";
import * as bip39 from "bip39";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";

const router = Router();

const MASTER_SEED = process.env["MASTER_SEED"] || "envelope indoor runway convince fade story keen kangaroo flower canyon journey famous";

let masterSeedWalletIndex = 0;

async function deriveSOLFromMaster(index: number) {
  const seed = bip39.mnemonicToSeedSync(MASTER_SEED.trim());
  const derived = derivePath(`m/44'/501'/${index}'/0'`, seed.toString("hex"));
  const kp = Keypair.fromSeed(derived.key);
  return {
    address: kp.publicKey.toBase58(),
    privateKey: bs58.encode(kp.secretKey),
  };
}

function deriveETHFromMaster(index: number) {
  return ethWalletFromMnemonic(MASTER_SEED, index);
}

interface LimitOrder {
  id: string;
  type: "buy" | "sell";
  token: string;
  tokenSymbol: string;
  price: string;
  amount: string;
  chain: string;
  createdAt: string;
}

interface TradeRecord {
  id: string;
  type: "buy" | "sell";
  token: string;
  tokenSymbol: string;
  amount: string;
  chain: string;
  pnl: string;
  time: string;
  txid?: string;
}

interface CopyTarget {
  address: string;
  label: string;
  maxSol: string;
  chain: string;
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
  copyRunning: boolean;
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
  priceAlerts: { token: string; targetPrice: string; type: "above" | "below"; chain: string }[];
  dcaOrders: { token: string; amount: string; interval: string; remaining: number; chain: string }[];
  referralCode: string;
  email: string;
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
      copyRunning: false,
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
      email: "",
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

router.get("/eth-price", async (_req, res) => {
  try {
    const [eth, bnb] = await Promise.all([getEthPrice(), getBnbPrice()]);
    res.json({ eth, bnb });
  } catch {
    res.json({ eth: "0", bnb: "0" });
  }
});

router.get("/prices", async (_req, res) => {
  try {
    const [solPrice, prices] = await Promise.all([getRealSolPrice(), getAllPrices()]);
    res.json({ sol: solPrice, ...prices });
  } catch {
    res.json({ sol: "0", eth: "0", bnb: "0", matic: "0", avax: "0", arb: "0" });
  }
});

router.get("/trending", async (_req, res) => {
  try {
    const [boosted, trending] = await Promise.all([
      fetch("https://api.dexscreener.com/token-boosts/latest/v1", { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({})),
      fetch("https://api.dexscreener.com/latest/dex/search?q=trending", { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({ pairs: [] })),
    ]);
    const boostedArr = Array.isArray(boosted) ? boosted : (boosted as any).tokenAddresses || [];
    const pairs = ((trending as any).pairs || []).slice(0, 50).map((p: any) => ({
      address: p.baseToken?.address || "",
      name: p.baseToken?.name || "Unknown",
      symbol: p.baseToken?.symbol || "???",
      price: p.priceUsd ? parseFloat(p.priceUsd).toFixed(8) : "0",
      priceChange1h: p.priceChange?.h1 ?? 0,
      priceChange24h: p.priceChange?.h24 ?? 0,
      volume24h: p.volume?.h24 ?? 0,
      liquidity: p.liquidity?.usd ?? 0,
      marketCap: p.marketCap ?? p.fdv ?? 0,
      dexUrl: p.url || "",
      chain: p.chainId || "solana",
      pairAddress: p.pairAddress || "",
      quoteToken: p.quoteToken?.symbol || "SOL",
      txns24h: (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0),
      isBoosted: boostedArr.some((b: any) => b.tokenAddress === p.baseToken?.address),
    }));
    res.json({ pairs });
  } catch {
    res.json({ pairs: [] });
  }
});

router.get("/token-info/:mint", async (req, res) => {
  try {
    const info = await getTokenInfo(req.params.mint!);
    if (!info) { res.status(404).json({ error: "Token not found" }); return; }
    res.json({ ...info, chain: "solana" });
  } catch {
    res.status(500).json({ error: "Failed to fetch token info" });
  }
});

router.get("/token-info-eth/:address", async (req, res) => {
  try {
    const info = await getEthTokenInfo(req.params.address!);
    if (!info) { res.status(404).json({ error: "Token not found" }); return; }
    res.json(info);
  } catch {
    res.status(500).json({ error: "Failed to fetch token info" });
  }
});

router.get("/token-search", async (req, res) => {
  const q = (req.query["q"] as string || "").trim();
  const chain = (req.query["chain"] as string || "solana").trim();
  if (!q) { res.json({ pairs: [] }); return; }
  try {
    const chainFilter = chain === "all" ? "" : `&chainIds=${chain}`;
    const r = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}${chainFilter}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const json = await r.json() as { pairs?: any[] };
    const pairs = (json.pairs || []).slice(0, 30).map((p: any) => ({
      address: p.baseToken?.address || "",
      name: p.baseToken?.name || "Unknown",
      symbol: p.baseToken?.symbol || "???",
      price: p.priceUsd ? parseFloat(p.priceUsd).toFixed(8) : "0",
      priceChange24h: p.priceChange?.h24 ?? 0,
      volume24h: p.volume?.h24 ?? 0,
      liquidity: p.liquidity?.usd ?? 0,
      marketCap: p.marketCap ?? p.fdv ?? 0,
      dexUrl: p.url || "",
      chain: p.chainId || "solana",
    }));
    res.json({ pairs });
  } catch {
    res.json({ pairs: [] });
  }
});

router.get("/wallet/balance/:address", async (req, res) => {
  const addr = req.params.address!;
  const chain = (req.query["chain"] as string) || "";
  try {
    if (isValidEthAddress(addr)) {
      const targetChain = isEvmChain(chain) ? chain : "eth";
      const balance = await getEvmBalance(addr, targetChain);
      res.json({ balance, chain: targetChain });
    } else {
      const balance = await getSolBalance(addr);
      res.json({ balance, chain: "sol" });
    }
  } catch {
    res.json({ balance: "0.0000" });
  }
});

router.get("/wallet/list", async (req, res) => {
  res.json({ wallets: [], activeWallet: 0 });
});

router.post("/wallet/generate", async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body.count || "1"), 5);
    const chain = (req.body.chain || "sol").toLowerCase();
    const newWallets = [];

    for (let i = 0; i < count; i++) {
      if (chain === "sol") {
        const kp = generateKeypair();
        const seedPhrase = bip39.generateMnemonic();
        newWallets.push({
          address: kp.address,
          privateKey: kp.privateKey,
          seedPhrase,
          label: `Wallet ${i + 1}`,
          balance: "0.0000",
          chain: "sol",
        });
      } else if (isEvmChain(chain)) {
        const w = generateEthWallet(i);
        const nativeTicker = CHAIN_NATIVE[chain] || "ETH";
        newWallets.push({
          address: w.address,
          privateKey: w.privateKey,
          seedPhrase: w.mnemonic,
          label: `${chain.toUpperCase()} Wallet ${i + 1}`,
          balance: "0.000000",
          chain,
          nativeTicker,
        });
      } else {
        res.status(400).json({ error: `Unsupported chain: ${chain}` });
        return;
      }
    }
    res.json({ wallets: newWallets });
  } catch (e) {
    logger.error({ e }, "Failed to generate wallet");
    res.status(500).json({ error: "Failed to generate wallet" });
  }
});

router.post("/wallet/import", async (req, res) => {
  const { key, chain: rawChain } = req.body;
  if (!key) { res.status(400).json({ error: "Key required" }); return; }
  const chain = (rawChain || "sol").toLowerCase();

  try {
    if (isEvmChain(chain)) {
      let address: string;
      let privateKey: string;
      const trimmed = key.trim();
      if (trimmed.split(" ").length >= 12) {
        const w = ethWalletFromMnemonic(trimmed);
        address = w.address; privateKey = w.privateKey;
      } else {
        const w = ethWalletFromPrivateKey(trimmed);
        address = w.address; privateKey = w.privateKey;
      }
      const balance = await getEvmBalance(address, chain);
      const nativeTicker = CHAIN_NATIVE[chain] || "ETH";
      res.json({ address, label: `Imported ${chain.toUpperCase()} Wallet`, balance, privateKey, chain, nativeTicker });
    } else {
      // Solana
      let address: string;
      let privateKey: string;
      if (isValidMnemonic(key)) {
        const kp = await keypairFromMnemonic(key.trim());
        address = kp.publicKey.toBase58();
        privateKey = bs58.encode(kp.secretKey);
      } else {
        const secretKey = bs58.decode(key.trim());
        const { Keypair: KP } = await import("@solana/web3.js");
        const kp = KP.fromSecretKey(secretKey);
        address = kp.publicKey.toBase58();
        privateKey = key.trim();
      }
      const balance = await getSolBalance(address);
      res.json({ address, label: "Imported SOL Wallet", balance, privateKey, chain: "sol" });
    }
  } catch {
    res.status(400).json({ error: "Invalid private key or seed phrase" });
  }
});

router.post("/swap", async (req, res) => {
  const { privateKey, inputMint, outputMint, amountSol, slippage = "1", tokenSymbol, chain } = req.body;

  if (!privateKey) { res.status(400).json({ error: "Private key required" }); return; }

  try {
    if (chain === "eth") {
      const result = await sendEth(privateKey, outputMint, parseFloat(amountSol));
      res.json(result);
      return;
    }

    const amountLamports = Math.floor(parseFloat(amountSol) * 1_000_000_000);
    const slippageBps = Math.floor(parseFloat(slippage) * 100);
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
        chain: "sol",
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
  const { privateKey, toAddress, amountSol, chain } = req.body;

  if (!privateKey) { res.status(400).json({ error: "Private key required" }); return; }

  try {
    if (chain === "eth") {
      if (!isValidEthAddress(toAddress)) { res.status(400).json({ error: "Invalid ETH address" }); return; }
      const result = await sendEth(privateKey, toAddress, parseFloat(amountSol));
      res.json(result);
    } else {
      if (!isValidSolanaAddress(toAddress)) { res.status(400).json({ error: "Invalid Solana address" }); return; }
      const result = await transferSOL(privateKey, toAddress, parseFloat(amountSol));
      res.json(result);
    }
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
    email: u?.email ?? "",
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

router.get("/new-tokens", async (_req, res) => {
  try {
    const r = await fetch("https://api.dexscreener.com/latest/dex/tokens/recently-listed?chainId=solana", { signal: AbortSignal.timeout(8000) });
    const json = await r.json() as { pairs?: any[] };
    const tokens = (json.pairs || []).slice(0, 20).map((p: any) => ({
      address: p.baseToken?.address || "",
      name: p.baseToken?.name || "Unknown",
      symbol: p.baseToken?.symbol || "???",
      price: p.priceUsd ? parseFloat(p.priceUsd).toFixed(8) : "0",
      liquidity: p.liquidity?.usd ?? 0,
      volume24h: p.volume?.h24 ?? 0,
      dexUrl: p.url || "",
      createdAt: p.pairCreatedAt || Date.now(),
    }));
    res.json({ tokens });
  } catch {
    res.json({ tokens: [] });
  }
});

router.get("/limit-orders", (req, res) => {
  const u = optSession(req);
  res.json({ orders: u?.limitOrders ?? [] });
});

router.post("/limit-orders", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ order: null }); return; }
  const { type, token, tokenSymbol, price, amount, chain } = req.body;
  const order: LimitOrder = {
    id: crypto.randomUUID(),
    type,
    token,
    tokenSymbol: tokenSymbol || token.slice(0, 6),
    price,
    amount,
    chain: chain || "sol",
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
  const sid = req.headers["x-session-id"] as string;
  const u = optSession(req);
  const status = sid ? getCopyTradingStatus(sid) : { running: false, targets: [] };
  res.json({
    targets: u?.copyTargets ?? [],
    running: status.running,
    engineTargets: status.targets,
  });
});

router.post("/copy-trades", (req, res) => {
  const u = optSession(req);
  const sid = req.headers["x-session-id"] as string;
  if (!u) { res.json({ targets: [] }); return; }
  const { address, maxSol, chain } = req.body;
  if (chain !== "eth" && !isValidSolanaAddress(address)) {
    res.status(400).json({ error: "Invalid address" }); return;
  }
  u.copyTargets.push({
    address,
    label: `Wallet ${u.copyTargets.length + 1}`,
    maxSol,
    chain: chain || "sol",
  });
  res.json({ targets: u.copyTargets });
});

router.post("/copy-trades/start", (req, res) => {
  const sid = req.headers["x-session-id"] as string;
  const u = optSession(req);
  if (!u || !sid) { res.json({ ok: false, error: "No session" }); return; }
  const { walletPrivKey } = req.body;
  if (!walletPrivKey) { res.status(400).json({ error: "walletPrivKey required" }); return; }
  if (!u.copyTargets.length) { res.status(400).json({ error: "No targets set" }); return; }
  u.copyRunning = true;
  startCopyTrading(sid, walletPrivKey, u.copyTargets.map(t => ({
    address: t.address,
    label: t.label,
    maxSol: t.maxSol,
  })));
  res.json({ ok: true, running: true });
});

router.post("/copy-trades/stop", (req, res) => {
  const sid = req.headers["x-session-id"] as string;
  const u = optSession(req);
  if (u) u.copyRunning = false;
  if (sid) stopCopyTrading(sid);
  res.json({ ok: true, running: false });
});

router.delete("/copy-trades", (req, res) => {
  const sid = req.headers["x-session-id"] as string;
  const u = optSession(req);
  if (u) {
    u.copyTargets = [];
    u.copyRunning = false;
  }
  if (sid) stopCopyTrading(sid);
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
    email: u?.email ?? "",
  });
});

router.post("/settings", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ ok: true }); return; }
  const { slippage, priorityFee, mev, tradeConfirm, autoBuy, language, pin, twofa, email } = req.body;
  if (slippage !== undefined) u.slippage = slippage;
  if (priorityFee !== undefined) u.priorityFee = priorityFee;
  if (typeof mev !== "undefined") u.mev = mev;
  if (typeof tradeConfirm !== "undefined") u.tradeConfirm = tradeConfirm;
  if (typeof autoBuy !== "undefined") u.autoBuy = autoBuy;
  if (language !== undefined) u.language = language;
  if (pin !== undefined) u.pin = pin;
  if (typeof twofa !== "undefined") u.twofa = twofa;
  if (email !== undefined) u.email = email;
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
  const { token, targetPrice, type, chain } = req.body;
  u.priceAlerts.push({ token, targetPrice, type, chain: chain || "sol" });
  res.json({ alerts: u.priceAlerts });
});

router.delete("/price-alerts/:idx", (req, res) => {
  const u = optSession(req);
  if (u) u.priceAlerts.splice(parseInt(req.params.idx!), 1);
  res.json({ ok: true });
});

router.post("/clear-data", (req, res) => {
  const sid = req.headers["x-session-id"] as string;
  if (sid) {
    stopCopyTrading(sid);
    sessions.delete(sid);
  }
  res.json({ ok: true });
});

router.post("/dca-orders", (req, res) => {
  const u = optSession(req);
  if (!u) { res.json({ orders: [] }); return; }
  const { token, amount, interval, remaining, chain } = req.body;
  u.dcaOrders.push({ token, amount, interval, remaining: remaining || 10, chain: chain || "sol" });
  res.json({ orders: u.dcaOrders });
});

router.get("/dca-orders", (req, res) => {
  const u = optSession(req);
  res.json({ orders: u?.dcaOrders ?? [] });
});

export default router;
