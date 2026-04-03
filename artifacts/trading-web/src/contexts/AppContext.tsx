import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, initSession } from "@/lib/api";

const WALLETS_KEY = "alpha_wallets_v3";
const ACTIVE_KEY  = "alpha_active_idx";

export interface StoredWallet {
  address:      string;
  privateKey:   string;
  seedPhrase?:  string;
  label:        string;
  balance:      string;
  balanceUsd?:  string;
  chain?:       string;
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

function load(): StoredWallet[] {
  try {
    const v3 = JSON.parse(localStorage.getItem(WALLETS_KEY) || "[]");
    if (v3.length) return v3;
    const v2 = JSON.parse(localStorage.getItem("alpha_wallets_v2") || "[]");
    return v2.map((w: any) => ({ ...w, chain: w.chain || "sol" }));
  } catch { return []; }
}

function save(wallets: StoredWallet[]) {
  localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

function loadIdx(): number { return parseInt(localStorage.getItem(ACTIVE_KEY) || "0"); }
function saveIdx(i: number) { localStorage.setItem(ACTIVE_KEY, String(i)); }

// Native ticker → CoinGecko price key mapping
const CHAIN_PRICE_KEY: Record<string, string> = {
  sol: "sol", eth: "eth", bsc: "bnb", matic: "matic",
  avax: "avax", arb: "eth", op: "eth", base: "eth",
};

const AppContext = createContext<AppState>({
  sessionReady: false, prices: {}, solPrice: "0", ethPrice: "0", totalUsd: "0",
  wallets: [], activeWallet: 0, profile: null, settings: null,
  refreshWallets: async () => {}, refreshProfile: () => {},
  refreshSettings: () => {}, refreshPrices: () => {},
  addWallet: () => {}, removeWallet: () => {},
  setActive: () => {}, renameWallet: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [prices, setPrices]             = useState<Prices>({});
  const [wallets, setWallets]           = useState<StoredWallet[]>(load);
  const [activeWallet, setActiveIdx]    = useState<number>(loadIdx);
  const [profile, setProfile]           = useState<any>(null);
  const [settings, setSettings]         = useState<any>(null);

  const solPrice = prices.sol  || "0";
  const ethPrice = prices.eth  || "0";

  // Total USD across all wallets
  const totalUsd = wallets.reduce((sum, w) => {
    const chain    = w.chain || "sol";
    const priceKey = CHAIN_PRICE_KEY[chain] || "sol";
    const price    = parseFloat(prices[priceKey] || "0");
    const bal      = parseFloat(w.balance || "0");
    return sum + bal * price;
  }, 0).toFixed(2);

  const refreshPrices = useCallback(async () => {
    try {
      const p = await api.getAllPrices();
      setPrices(p);
    } catch {}
  }, []);

  const refreshWallets = useCallback(async () => {
    const stored = load();
    if (!stored.length) { setWallets([]); return; }
    const currentPrices = prices;

    const updated = await Promise.all(stored.map(async (w) => {
      try {
        const res = await api.getWalletBalance(w.address, w.chain);
        const chain    = w.chain || "sol";
        const priceKey = CHAIN_PRICE_KEY[chain] || "sol";
        const price    = parseFloat(currentPrices[priceKey] || "0");
        const bal      = parseFloat(res.balance || w.balance || "0");
        const balanceUsd = price > 0 ? (bal * price).toFixed(2) : "0";
        return { ...w, balance: res.balance || w.balance, balanceUsd };
      } catch { return w; }
    }));
    setWallets(updated);
    save(updated);
  }, [prices]);

  const addWallet = useCallback((w: StoredWallet) => {
    setWallets(prev => {
      const next = [...prev, { ...w, chain: w.chain || "sol" }];
      save(next);
      return next;
    });
  }, []);

  const removeWallet = useCallback((index: number) => {
    setWallets(prev => {
      const next = prev.filter((_, i) => i !== index);
      save(next);
      const cur = loadIdx();
      if (cur >= next.length) {
        const ni = Math.max(0, next.length - 1);
        saveIdx(ni);
        setActiveIdx(ni);
      }
      return next;
    });
  }, []);

  const setActive = useCallback((i: number) => { saveIdx(i); setActiveIdx(i); }, []);

  const renameWallet = useCallback((index: number, label: string) => {
    setWallets(prev => {
      const next = prev.map((w, i) => i === index ? { ...w, label } : w);
      save(next);
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
    }).catch(() => {
      setSessionReady(true);
      refreshPrices();
    });

    const t = setInterval(refreshPrices, 30_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{
      sessionReady, prices, solPrice, ethPrice, totalUsd,
      wallets, activeWallet, profile, settings,
      refreshWallets, refreshProfile, refreshSettings, refreshPrices,
      addWallet, removeWallet, setActive, renameWallet,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
