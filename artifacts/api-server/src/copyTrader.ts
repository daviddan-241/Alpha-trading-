import { PublicKey, ParsedTransactionWithMeta, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { connection, jupiterSwap, getSolBalance, SOL_MINT } from "./solana";
import { logger } from "./lib/logger";

interface CopyTarget {
  address: string;
  label: string;
  maxSol: string;
  active: boolean;
  lastSignature?: string;
  totalCopied: number;
  pnlSol: string;
}

interface CopySession {
  walletPrivKey: string;
  targets: CopyTarget[];
  running: boolean;
}

const sessions = new Map<string, CopySession>();
const intervals = new Map<string, NodeJS.Timeout>();

async function getRecentTransactions(walletAddress: string, lastSig?: string): Promise<ParsedTransactionWithMeta[]> {
  try {
    const pk = new PublicKey(walletAddress);
    const sigs = await connection.getSignaturesForAddress(pk, { limit: 5 });
    if (!sigs.length) return [];

    let newSigs = sigs;
    if (lastSig) {
      const lastIdx = sigs.findIndex(s => s.signature === lastSig);
      newSigs = lastIdx > 0 ? sigs.slice(0, lastIdx) : sigs.slice(0, 1);
    } else {
      newSigs = sigs.slice(0, 1);
    }

    if (!newSigs.length) return [];

    const txs = await connection.getParsedTransactions(
      newSigs.map(s => s.signature),
      { maxSupportedTransactionVersion: 0 }
    );
    return txs.filter(Boolean) as ParsedTransactionWithMeta[];
  } catch (e) {
    logger.error({ e }, "copyTrader: getRecentTransactions error");
    return [];
  }
}

function extractSwapInfo(tx: ParsedTransactionWithMeta): { inputMint: string; outputMint: string; amountSol: number } | null {
  try {
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];

    for (let i = 0; i < preBalances.length; i++) {
      const pre = preBalances[i] || 0;
      const post = postBalances[i] || 0;
      const diff = (pre - post) / 1e9;
      if (diff > 0.01 && diff < 50) {
        return {
          inputMint: SOL_MINT,
          outputMint: SOL_MINT,
          amountSol: parseFloat(diff.toFixed(4)),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function getWalletAddress(privKey: string): string {
  try {
    const secretKey = bs58.decode(privKey);
    const kp = Keypair.fromSecretKey(secretKey);
    return kp.publicKey.toBase58();
  } catch {
    return "";
  }
}

async function monitorTarget(sessionId: string, target: CopyTarget, privKey: string): Promise<void> {
  try {
    const txs = await getRecentTransactions(target.address, target.lastSignature);
    if (!txs.length) return;

    for (const tx of txs) {
      if (!tx.meta || tx.meta.err) continue;

      const swap = extractSwapInfo(tx);
      if (!swap) continue;

      const maxSol = parseFloat(target.maxSol);
      const useAmount = Math.min(swap.amountSol, maxSol);
      if (useAmount < 0.01) continue;

      const myAddress = getWalletAddress(privKey);
      if (!myAddress) continue;

      const bal = await getSolBalance(myAddress);
      if (parseFloat(bal) < useAmount + 0.01) {
        logger.warn({ sessionId }, "copyTrader: insufficient balance to mirror trade");
        continue;
      }

      logger.info({ sessionId, target: target.address, amountSol: useAmount }, "copyTrader: mirroring trade");

      const amountLamports = Math.floor(useAmount * 1e9);
      const result = await jupiterSwap(privKey, SOL_MINT, swap.outputMint, amountLamports, 150);

      if (result.success) {
        target.totalCopied++;
        logger.info({ txid: result.txid }, "copyTrader: mirror trade success");
      }
    }

    if (txs.length > 0 && txs[0]) {
      const sigArray = (txs[0].transaction as any).signatures;
      if (sigArray && sigArray[0]) target.lastSignature = sigArray[0];
    }
  } catch (e) {
    logger.error({ e }, "copyTrader: monitorTarget error");
  }
}

export function startCopyTrading(
  sessionId: string,
  walletPrivKey: string,
  targets: { address: string; label: string; maxSol: string }[]
): void {
  stopCopyTrading(sessionId);

  const session: CopySession = {
    walletPrivKey,
    running: true,
    targets: targets.map(t => ({
      ...t,
      active: true,
      totalCopied: 0,
      pnlSol: "0",
    })),
  };
  sessions.set(sessionId, session);

  const interval = setInterval(async () => {
    const s = sessions.get(sessionId);
    if (!s || !s.running) return;
    for (const target of s.targets) {
      if (target.active) {
        await monitorTarget(sessionId, target, s.walletPrivKey);
      }
    }
  }, 15000);

  intervals.set(sessionId, interval);
  logger.info({ sessionId, targets: targets.length }, "copyTrader: started");
}

export function stopCopyTrading(sessionId: string): void {
  const interval = intervals.get(sessionId);
  if (interval) {
    clearInterval(interval);
    intervals.delete(sessionId);
  }
  const session = sessions.get(sessionId);
  if (session) {
    session.running = false;
  }
  logger.info({ sessionId }, "copyTrader: stopped");
}

export function getCopyTradingStatus(sessionId: string): {
  running: boolean;
  targets: { address: string; label: string; maxSol: string; active: boolean; totalCopied: number; pnlSol: string }[]
} {
  const session = sessions.get(sessionId);
  if (!session) return { running: false, targets: [] };
  return {
    running: session.running,
    targets: session.targets.map(t => ({
      address: t.address,
      label: t.label,
      maxSol: t.maxSol,
      active: t.active,
      totalCopied: t.totalCopied,
      pnlSol: t.pnlSol,
    })),
  };
}
