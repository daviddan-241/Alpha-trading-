import { ethers } from "ethers";
import { logger } from "./lib/logger";

const ETH_RPC = process.env["ETH_RPC_URL"] || "https://eth.llamarpc.com";
const BSC_RPC = process.env["BSC_RPC_URL"] || "https://bsc-dataseed.binance.org";

export let ethProvider: ethers.JsonRpcProvider;
export let bscProvider: ethers.JsonRpcProvider;

try {
  ethProvider = new ethers.JsonRpcProvider(ETH_RPC);
  bscProvider = new ethers.JsonRpcProvider(BSC_RPC);
} catch (e) {
  logger.error({ e }, "Failed to init EVM providers");
}

export interface EvmWallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
  label: string;
  chain: "eth" | "bsc";
}

export function generateEthWallet(index = 0): { address: string; privateKey: string; mnemonic: string } {
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

export async function getEthBalance(address: string): Promise<string> {
  try {
    const bal = await ethProvider.getBalance(address);
    return parseFloat(ethers.formatEther(bal)).toFixed(6);
  } catch (e) {
    logger.error({ e }, "getEthBalance error");
    return "0.000000";
  }
}

export async function getBscBalance(address: string): Promise<string> {
  try {
    const bal = await bscProvider.getBalance(address);
    return parseFloat(ethers.formatEther(bal)).toFixed(6);
  } catch (e) {
    return "0.000000";
  }
}

export async function getEthPrice(): Promise<string> {
  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) },
    );
    const json = await resp.json() as { ethereum?: { usd?: number } };
    return (json?.ethereum?.usd ?? 0).toFixed(2);
  } catch {
    return "0";
  }
}

export async function getBnbPrice(): Promise<string> {
  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) },
    );
    const json = await resp.json() as { binancecoin?: { usd?: number } };
    return (json?.binancecoin?.usd ?? 0).toFixed(2);
  } catch {
    return "0";
  }
}

export async function sendEth(
  fromPrivKey: string,
  toAddress: string,
  amountEth: number,
): Promise<{ success: boolean; txid?: string; error?: string }> {
  try {
    const wallet = new ethers.Wallet(fromPrivKey, ethProvider);
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountEth.toString()),
    });
    await tx.wait();
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
    const pairs = json?.pairs;
    if (!pairs || pairs.length === 0) return null;
    const pair = pairs[0];
    return {
      price: pair.priceUsd ? parseFloat(pair.priceUsd).toFixed(8) : "N/A",
      marketCap: pair.marketCap ? `$${(pair.marketCap / 1e6).toFixed(2)}M` : "N/A",
      volume24h: pair.volume?.h24 ? `$${(pair.volume.h24 / 1e6).toFixed(2)}M` : "N/A",
      name: pair.baseToken?.name || "Unknown",
      symbol: pair.baseToken?.symbol || "TOKEN",
      priceChange24h: pair.priceChange?.h24 ? `${pair.priceChange.h24 > 0 ? "+" : ""}${pair.priceChange.h24.toFixed(2)}%` : "0.00%",
      liquidity: pair.liquidity?.usd ? `$${(pair.liquidity.usd / 1e6).toFixed(2)}M` : "N/A",
      dexUrl: pair.url || `https://dexscreener.com/ethereum/${tokenAddress}`,
      chain: pair.chainId || "ethereum",
    };
  } catch {
    return null;
  }
}

export function isValidEthAddress(address: string): boolean {
  return ethers.isAddress(address);
}
