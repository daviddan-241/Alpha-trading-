import { ethers } from "ethers";
import { logger } from "./lib/logger";

// Public RPC endpoints — no API key required
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

// Lazy provider cache
const providers = new Map<string, ethers.JsonRpcProvider>();
function getProvider(chain: string): ethers.JsonRpcProvider {
  if (!providers.has(chain)) {
    const rpc = CHAIN_RPC[chain] || CHAIN_RPC["eth"]!;
    providers.set(chain, new ethers.JsonRpcProvider(rpc));
  }
  return providers.get(chain)!;
}

// Keep legacy named providers for import compatibility
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

// Price cache — batched CoinGecko call
let _priceCache: Record<string, string> = {};
let _priceCacheTime = 0;

export async function getAllPrices(): Promise<Record<string, string>> {
  if (Date.now() - _priceCacheTime < 30_000) return _priceCache;
  try {
    const ids = "solana,ethereum,binancecoin,matic-network,avalanche-2,arbitrum,optimism";
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000) },
    );
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
    };
    _priceCacheTime = Date.now();
    return _priceCache;
  } catch {
    return _priceCache;
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
