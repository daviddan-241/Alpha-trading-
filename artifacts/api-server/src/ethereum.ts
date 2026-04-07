import { ethers } from "ethers";
import { logger } from "./lib/logger";

export const CHAIN_RPC: Record<string, string> = {
  eth:   process.env["ETH_RPC_URL"]  || "https://eth.llamarpc.com",
  bsc:   process.env["BSC_RPC_URL"]  || "https://bsc-dataseed.binance.org",
  matic: process.env["MATIC_RPC_URL"]|| "https://polygon-rpc.com",
  avax:  process.env["AVAX_RPC_URL"] || "https://api.avax.network/ext/bc/C/rpc",
  arb:   process.env["ARB_RPC_URL"]  || "https://arb1.arbitrum.io/rpc",
  op:    process.env["OP_RPC_URL"]   || "https://mainnet.optimism.io",
  base:  process.env["BASE_RPC_URL"] || "https://mainnet.base.org",
};

export const EVM_CHAINS = Object.keys(CHAIN_RPC);
export const CHAIN_NATIVE: Record<string, string> = {
  eth: "ETH", bsc: "BNB", matic: "MATIC", avax: "AVAX", arb: "ETH", op: "ETH", base: "ETH",
};

export const CHAIN_ID: Record<string, number> = {
  eth: 1, bsc: 56, matic: 137, avax: 43114, arb: 42161, op: 10, base: 8453,
};

const providers = new Map<string, ethers.JsonRpcProvider>();
function getProvider(chain: string): ethers.JsonRpcProvider {
  if (!providers.has(chain)) {
    const rpc = CHAIN_RPC[chain] || CHAIN_RPC["eth"]!;
    providers.set(chain, new ethers.JsonRpcProvider(rpc));
  }
  return providers.get(chain)!;
}

export const ethProvider = getProvider("eth");
export const bscProvider = getProvider("bsc");

export interface EvmWallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
  label: string;
  chain: string;
}

export function isValidEthAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function isEvmChain(chain: string): boolean {
  return EVM_CHAINS.includes(chain);
}

export function generateEthWallet(_index = 0): { address: string; privateKey: string; mnemonic: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "",
  };
}

export function ethWalletFromMnemonic(mnemonic: string, index = 0): { address: string; privateKey: string } {
  const path = `m/44'/60'/0'/0/${index}`;
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, path);
  return { address: wallet.address, privateKey: wallet.privateKey };
}

export function ethWalletFromPrivateKey(privateKey: string): { address: string; privateKey: string } {
  const wallet = new ethers.Wallet(privateKey.trim());
  return { address: wallet.address, privateKey: wallet.privateKey };
}

export async function getEvmBalance(address: string, chain = "eth"): Promise<string> {
  try {
    const provider = getProvider(chain);
    const bal = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(bal)).toFixed(6);
  } catch {
    return "0.000000";
  }
}

export async function getEthBalance(address: string): Promise<string> {
  return getEvmBalance(address, "eth");
}

export async function getBscBalance(address: string): Promise<string> {
  return getEvmBalance(address, "bsc");
}

// ── Price cache ─────────────────────────────────────────────────────────────
let _priceCache: Record<string, string> = {};
let _priceCacheTime = 0;
const PRICE_TTL = 30_000; // 30 seconds

export async function getAllPrices(): Promise<Record<string, string>> {
  if (Date.now() - _priceCacheTime < PRICE_TTL && Object.keys(_priceCache).length > 0) {
    return _priceCache;
  }

  // Primary: Binance public API — no API key, no rate limits for basic prices
  try {
    const symbols = ["SOLUSDT", "ETHUSDT", "BNBUSDT", "MATICUSDT", "POLUSDT", "AVAXUSDT", "ARBUSDT", "OPUSDT", "BTCUSDT"];
    const r = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) throw new Error("binance error");
    const data = await r.json() as { symbol: string; price: string }[];
    const m: Record<string, number> = {};
    for (const item of data) m[item.symbol] = parseFloat(item.price);

    // MATIC was renamed to POL on Binance — try both
    const maticPrice = m["MATICUSDT"] || m["POLUSDT"] || 0;
    _priceCache = {
      sol:   (m["SOLUSDT"]  ?? 0).toFixed(2),
      eth:   (m["ETHUSDT"]  ?? 0).toFixed(2),
      bsc:   (m["BNBUSDT"]  ?? 0).toFixed(2),
      bnb:   (m["BNBUSDT"]  ?? 0).toFixed(2),
      matic: maticPrice.toFixed(4),
      avax:  (m["AVAXUSDT"] ?? 0).toFixed(2),
      arb:   (m["ARBUSDT"]  ?? 0).toFixed(4),
      op:    (m["OPUSDT"]   ?? 0).toFixed(4),
      base:  (m["ETHUSDT"]  ?? 0).toFixed(2),
      btc:   (m["BTCUSDT"]  ?? 0).toFixed(2),
    };
    _priceCacheTime = Date.now();
    return _priceCache;
  } catch {
    // Fallback: CoinGecko free tier
    try {
      const ids = "solana,ethereum,binancecoin,matic-network,avalanche-2,arbitrum,optimism,bitcoin";
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!r.ok) throw new Error("coingecko error");
      const d = await r.json() as Record<string, { usd: number }>;
      _priceCache = {
        sol:   (d["solana"]?.usd        ?? 0).toFixed(2),
        eth:   (d["ethereum"]?.usd      ?? 0).toFixed(2),
        bsc:   (d["binancecoin"]?.usd   ?? 0).toFixed(2),
        bnb:   (d["binancecoin"]?.usd   ?? 0).toFixed(2),
        matic: (d["matic-network"]?.usd ?? 0).toFixed(2),
        avax:  (d["avalanche-2"]?.usd   ?? 0).toFixed(2),
        arb:   (d["arbitrum"]?.usd      ?? 0).toFixed(2),
        op:    (d["optimism"]?.usd      ?? 0).toFixed(2),
        base:  (d["ethereum"]?.usd      ?? 0).toFixed(2),
        btc:   (d["bitcoin"]?.usd       ?? 0).toFixed(2),
      };
      _priceCacheTime = Date.now();
      return _priceCache;
    } catch {
      return Object.keys(_priceCache).length > 0 ? _priceCache : {
        sol: "0", eth: "0", bnb: "0", matic: "0", avax: "0", arb: "0", op: "0", base: "0", btc: "0",
      };
    }
  }
}

export async function getEthPrice(): Promise<string> {
  return (await getAllPrices()).eth || "0";
}

export async function getBnbPrice(): Promise<string> {
  return (await getAllPrices()).bnb || "0";
}

export async function sendEth(
  fromPrivKey: string,
  toAddress: string,
  amountEth: number,
  chain = "eth",
): Promise<{ success: boolean; txid?: string; error?: string }> {
  try {
    const wallet = new ethers.Wallet(fromPrivKey, getProvider(chain));
    const balance = await wallet.provider!.getBalance(wallet.address);
    const balEth = parseFloat(ethers.formatEther(balance));
    const needed = amountEth * 1.002; // include a little buffer for gas
    if (balEth < needed) {
      const ticker = CHAIN_NATIVE[chain] || "ETH";
      return {
        success: false,
        error: `Insufficient ${ticker} balance. You have ${balEth.toFixed(6)} ${ticker}, need at least ${needed.toFixed(6)} ${ticker} (including gas).`,
      };
    }
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountEth.toString()),
    });
    return { success: true, txid: tx.hash };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

// ── EVM Token Swap via Paraswap public API ──────────────────────────────────
// Works for ETH/BNB/MATIC/AVAX/ARB/OP/BASE without an API key
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export async function evmTokenSwap(
  fromPrivKey: string,
  inputToken: string,  // "native" or ERC-20 address
  outputToken: string, // "native" or ERC-20 address
  amountWei: string,
  chain = "eth",
  slippageBps = 100,
): Promise<{ success: boolean; txid?: string; error?: string; priceImpact?: string }> {
  const chainId = CHAIN_ID[chain];
  if (!chainId) return { success: false, error: `Unsupported chain: ${chain}` };

  const srcToken = inputToken === "native" || inputToken === "" ? NATIVE_TOKEN_ADDRESS : inputToken;
  const destToken = outputToken === "native" || outputToken === "" ? NATIVE_TOKEN_ADDRESS : outputToken;

  try {
    const wallet = new ethers.Wallet(fromPrivKey, getProvider(chain));
    const userAddress = wallet.address;

    // 1. Get price/route from Paraswap
    const priceUrl = `https://apiv5.paraswap.io/prices?srcToken=${srcToken}&destToken=${destToken}&amount=${amountWei}&srcDecimals=18&destDecimals=18&side=SELL&network=${chainId}&userAddress=${userAddress}`;
    const priceResp = await fetch(priceUrl, { signal: AbortSignal.timeout(12000) });
    if (!priceResp.ok) {
      const errText = await priceResp.text();
      return { success: false, error: `No swap route found: ${errText.slice(0, 120)}` };
    }
    const priceData = await priceResp.json() as { priceRoute?: any; error?: string };
    if (!priceData.priceRoute) {
      return { success: false, error: priceData.error || "No route available for this token pair." };
    }

    // 2. Build the transaction
    const txUrl = `https://apiv5.paraswap.io/transactions/${chainId}?ignoreChecks=true`;
    const slippage = (slippageBps / 100).toFixed(2);
    const txResp = await fetch(txUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        srcToken,
        destToken,
        srcAmount: amountWei,
        destAmount: priceData.priceRoute.destAmount,
        priceRoute: priceData.priceRoute,
        userAddress,
        slippage,
        txOrigin: userAddress,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!txResp.ok) {
      const errText = await txResp.text();
      return { success: false, error: `Failed to build swap transaction: ${errText.slice(0, 120)}` };
    }
    const txData = await txResp.json() as { to?: string; data?: string; value?: string; gas?: string; error?: string };
    if (!txData.to) {
      return { success: false, error: txData.error || "Failed to build transaction" };
    }

    // 3. Send the transaction
    const tx = await wallet.sendTransaction({
      to: txData.to,
      data: txData.data,
      value: BigInt(txData.value || "0"),
      gasLimit: txData.gas ? BigInt(Math.ceil(parseInt(txData.gas) * 1.15)) : undefined,
    });

    const priceImpact = priceData.priceRoute?.gasCostUSD
      ? `~$${parseFloat(priceData.priceRoute.gasCostUSD).toFixed(2)} gas`
      : undefined;

    return { success: true, txid: tx.hash, priceImpact };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ e }, "evmTokenSwap error");
    if (/insufficient/i.test(msg)) {
      return { success: false, error: `Insufficient balance. Please top up your wallet and try again.` };
    }
    return { success: false, error: msg };
  }
}

export async function getEthTokenInfo(tokenAddress: string): Promise<any> {
  try {
    const resp = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const json = await resp.json() as { pairs?: any[] };
    const pair = json?.pairs?.[0];
    if (!pair) return null;
    return {
      price: pair.priceUsd ? parseFloat(pair.priceUsd).toFixed(8) : "N/A",
      marketCap: pair.marketCap ? `$${(pair.marketCap / 1e6).toFixed(2)}M` : "N/A",
      volume24h: pair.volume?.h24 ? `$${(pair.volume.h24 / 1e6).toFixed(2)}M` : "N/A",
      name: pair.baseToken?.name || "Unknown",
      symbol: pair.baseToken?.symbol || "TOKEN",
      priceChange24h: pair.priceChange?.h24
        ? `${pair.priceChange.h24 > 0 ? "+" : ""}${pair.priceChange.h24.toFixed(2)}%`
        : "0.00%",
      liquidity: pair.liquidity?.usd ? `$${(pair.liquidity.usd / 1e6).toFixed(2)}M` : "N/A",
      dexUrl: pair.url || `https://dexscreener.com/ethereum/${tokenAddress}`,
      chain: pair.chainId || "ethereum",
    };
  } catch {
    return null;
  }
}
