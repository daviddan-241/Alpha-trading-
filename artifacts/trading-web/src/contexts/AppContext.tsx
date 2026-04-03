import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, initSession } from "@/lib/api";

const WALLETS_KEY = "alpha_wallets_v2";
const ACTIVE_KEY = "alpha_active_idx";

export interface StoredWallet {
  address: string;
  privateKey: string;
  label: string;
  balance: string;
}

interface AppState {
  sessionReady: boolean;
  solPrice: string;
  wallets: StoredWallet[];
  activeWallet: number;
  profile: any;
  settings: any;
  refreshWallets: () => Promise<void>;
  refreshProfile: () => void;
  refreshSettings: () => void;
  refreshSolPrice: () => void;
  addWallet: (w: StoredWallet) => void;
  removeWallet: (index: number) => void;
  setActive: (index: number) => void;
  renameWallet: (index: number, label: string) => void;
}

function loadFromStorage(): StoredWallet[] {
  try {
    return JSON.parse(localStorage.getItem(WALLETS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToStorage(wallets: StoredWallet[]) {
  localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

function loadActiveIdx(): number {
  return parseInt(localStorage.getItem(ACTIVE_KEY) || "0");
}

function saveActiveIdx(idx: number) {
  localStorage.setItem(ACTIVE_KEY, String(idx));
}

const AppContext = createContext<AppState>({
  sessionReady: false,
  solPrice: "0",
  wallets: [],
  activeWallet: 0,
  profile: null,
  settings: null,
  refreshWallets: async () => {},
  refreshProfile: () => {},
  refreshSettings: () => {},
  refreshSolPrice: () => {},
  addWallet: () => {},
  removeWallet: () => {},
  setActive: () => {},
  renameWallet: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [solPrice, setSolPrice] = useState("0");
  const [wallets, setWallets] = useState<StoredWallet[]>(loadFromStorage);
  const [activeWallet, setActiveWalletState] = useState<number>(loadActiveIdx);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  const refreshWallets = useCallback(async () => {
    const stored = loadFromStorage();
    if (stored.length === 0) { setWallets([]); return; }
    const updated = await Promise.all(
      stored.map(async (w) => {
        try {
          const { balance } = await api.getWalletBalance(w.address);
          return { ...w, balance };
        } catch {
          return w;
        }
      })
    );
    setWallets(updated);
    saveToStorage(updated);
  }, []);

  const addWallet = useCallback((w: StoredWallet) => {
    setWallets(prev => {
      const next = [...prev, w];
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeWallet = useCallback((index: number) => {
    setWallets(prev => {
      const next = prev.filter((_, i) => i !== index);
      saveToStorage(next);
      const activeIdx = loadActiveIdx();
      if (activeIdx >= next.length) {
        const newIdx = Math.max(0, next.length - 1);
        saveActiveIdx(newIdx);
        setActiveWalletState(newIdx);
      }
      return next;
    });
  }, []);

  const setActive = useCallback((index: number) => {
    saveActiveIdx(index);
    setActiveWalletState(index);
  }, []);

  const renameWallet = useCallback((index: number, label: string) => {
    setWallets(prev => {
      const next = prev.map((w, i) => i === index ? { ...w, label } : w);
      saveToStorage(next);
      return next;
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const d = await api.getProfile();
      setProfile(d);
    } catch {}
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const d = await api.getSettings();
      setSettings(d);
    } catch {}
  }, []);

  const refreshSolPrice = useCallback(async () => {
    try {
      const d = await api.getSolPrice();
      setSolPrice(d.price);
    } catch {}
  }, []);

  useEffect(() => {
    initSession().then(() => {
      setSessionReady(true);
      refreshWallets();
      refreshProfile();
      refreshSettings();
      refreshSolPrice();
    }).catch(() => {
      setSessionReady(true);
      refreshWallets();
      refreshSolPrice();
    });

    const priceInterval = setInterval(refreshSolPrice, 30000);
    return () => clearInterval(priceInterval);
  }, []);

  return (
    <AppContext.Provider value={{
      sessionReady, solPrice, wallets, activeWallet, profile, settings,
      refreshWallets, refreshProfile, refreshSettings, refreshSolPrice,
      addWallet, removeWallet, setActive, renameWallet,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
