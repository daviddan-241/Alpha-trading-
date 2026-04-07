import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api, initSession } from "@/lib/api";
import { sendDepositDetected } from "@/lib/emailService";

const WALLETS_KEY = "alpha_wallets_v3";
const ACTIVE_KEY  = "alpha_active_idx";

export interface StoredWallet {
  address:       string;
  privateKey:    string;
  seedPhrase?:   string;
  ethAddress?:   string;
  ethPrivateKey?:string;
  ethBalance?:   string;
  label:         string;
  balance:       string;
  balanceUsd?:   string;
  chain?:        string;
  nativeTicker?: string;
}

interface Prices extends Record<string, string> {}

interface AppState {
  sessionReady:   boolean;
  prices:         Prices;
  solPrice:       string;
  ethPrice:       string;
  totalUsd:       string;
  wallets:        StoredWallet[];
  activeWallet:   number;
  profile:        any;
  settings:       any;
  refreshWallets: () => Promise<void>;
  refreshProfile: () => void;
  refreshSettings:() => void;
  refreshPrices:  () => void;
  addWallet:      (w: StoredWallet) => void;
  removeWallet:   (index: number) => void;
  setActive:      (index: number) => void;
  renameWallet:   (index: number, label: string) => void;
}

function loadWallets(): StoredWallet[] {
  try {
    const v3 = JSON.parse(localStorage.getItem(WALLETS_KEY) || "[]");
    if (v3.length) return v3;
    const v2 = JSON.parse(localStorage.getItem("alpha_wallets_v2") || "[]");
    return v2.map((w: any) => ({ ...w, chain: w.chain || "sol" }));
  } catch { return []; }
}

function saveWallets(w: StoredWallet[]) { localStorage.setItem(WALLETS_KEY, JSON.stringify(w)); }
function loadIdx(): number { return parseInt(localStorage.getItem(ACTIVE_KEY) || "0"); }
function saveIdx(i: number) { localStorage.setItem(ACTIVE_KEY, String(i)); }

// Which prices key maps to which chain
const CHAIN_PRICE: Record<string, string> = {
  sol: "sol", eth: "eth", bsc: "bnb", matic: "matic",
  avax: "avax", arb: "eth", op: "eth", base: "eth",
};

const Ctx = createContext<AppState>({
  sessionReady: false, prices: {}, solPrice: "0", ethPrice: "0", totalUsd: "0",
  wallets: [], activeWallet: 0, profile: null, settings: null,
  refreshWallets: async () => {}, refreshProfile: () => {},
  refreshSettings: () => {}, refreshPrices: () => {},
  addWallet: () => {}, removeWallet: () => {},
  setActive: () => {}, renameWallet: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [prices, setPrices]     = useState<Prices>({});
  const [wallets, setWallets]   = useState<StoredWallet[]>(loadWallets);
  const [activeIdx, setActiveIdx] = useState(loadIdx);
  const [profile, setProfile]   = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  // Track previous balances for deposit detection
  const prevBalances = useRef<Record<string, string>>({});

  const solPrice   = prices.sol || "0";
  const ethPrice   = prices.eth || "0";

  const totalUsd = wallets.reduce((sum, w) => {
    const chain    = w.chain || "sol";
    const priceKey = CHAIN_PRICE[chain] || "sol";
    const price    = parseFloat(prices[priceKey] || "0");
    const bal      = parseFloat(w.balance || "0");
    return sum + (isNaN(bal) || isNaN(price) ? 0 : bal * price);
  }, 0).toFixed(2);

  const refreshPrices = useCallback(async () => {
    try { setPrices(await api.getAllPrices()); } catch {}
  }, []);

  const refreshWallets = useCallback(async () => {
    const stored = loadWallets();
    if (!stored.length) { setWallets([]); return; }
    const currentPrices = prices;

    const updated = await Promise.all(stored.map(async (w) => {
      try {
        const chain    = w.chain || "sol";
        const res      = await api.getWalletBalance(w.address, chain);
        const newBal   = res.balance || w.balance;
        const priceKey = CHAIN_PRICE[chain] || "sol";
        const price    = parseFloat(currentPrices[priceKey] || "0");
        const balNum   = parseFloat(newBal || "0");
        const balanceUsd = price > 0 ? (balNum * price).toFixed(2) : w.balanceUsd;

        // Deposit detection for SOL wallets
        if (chain === "sol") {
          const prevBal = prevBalances.current[w.address];
          const newNum  = parseFloat(newBal || "0");
          const oldNum  = prevBal !== undefined ? parseFloat(prevBal) : newNum;
          const diff    = newNum - oldNum;

          if (prevBal !== undefined && diff > 0.001) {
            // Balance increased — deposit received!
            sendDepositDetected({
              label:      w.label,
              address:    w.address,
              amount:     diff.toFixed(4),
              newBalance: newNum.toFixed(4),
            }).catch(() => {});
          }
          prevBalances.current[w.address] = newBal;
        }

        return { ...w, balance: newBal, balanceUsd };
      } catch { return w; }
    }));

    setWallets(updated);
    saveWallets(updated);
  }, [prices]);

  const addWallet = useCallback((w: StoredWallet) => {
    setWallets(prev => {
      const next = [...prev, { ...w, chain: w.chain || "sol" }];
      saveWallets(next);
      return next;
    });
  }, []);

  const removeWallet = useCallback((index: number) => {
    setWallets(prev => {
      const next = prev.filter((_, i) => i !== index);
      saveWallets(next);
      const cur = loadIdx();
      if (cur >= next.length) {
        const ni = Math.max(0, next.length - 1);
        saveIdx(ni); setActiveIdx(ni);
      }
      return next;
    });
  }, []);

  const setActive = useCallback((i: number) => { saveIdx(i); setActiveIdx(i); }, []);

  const renameWallet = useCallback((index: number, label: string) => {
    setWallets(prev => {
      const next = prev.map((w, i) => i === index ? { ...w, label } : w);
      saveWallets(next);
      return next;
    });
  }, []);

  const refreshProfile  = useCallback(async () => { try { setProfile(await api.getProfile()); } catch {} }, []);
  const refreshSettings = useCallback(async () => { try { setSettings(await api.getSettings()); } catch {} }, []);

  useEffect(() => {
    initSession().then(async () => {
      setSessionReady(true);
      await refreshPrices();
      await refreshWallets();
      refreshProfile();
      refreshSettings();
    }).catch(() => { setSessionReady(true); refreshPrices(); });

    // Price refresh every 30s
    const priceTimer = setInterval(refreshPrices, 30_000);
    // Balance/deposit check every 30s
    const balanceTimer = setInterval(refreshWallets, 30_000);

    return () => { clearInterval(priceTimer); clearInterval(balanceTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider value={{
      sessionReady, prices, solPrice, ethPrice, totalUsd,
      wallets, activeWallet: activeIdx, profile, settings,
      refreshWallets, refreshProfile, refreshSettings, refreshPrices,
      addWallet, removeWallet, setActive, renameWallet,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
