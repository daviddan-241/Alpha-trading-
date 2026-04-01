import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, initSession } from "@/lib/api";

interface AppState {
  sessionReady: boolean;
  solPrice: string;
  wallets: any[];
  activeWallet: number;
  profile: any;
  settings: any;
  refreshWallets: () => void;
  refreshProfile: () => void;
  refreshSettings: () => void;
  refreshSolPrice: () => void;
}

const AppContext = createContext<AppState>({
  sessionReady: false,
  solPrice: "0",
  wallets: [],
  activeWallet: 0,
  profile: null,
  settings: null,
  refreshWallets: () => {},
  refreshProfile: () => {},
  refreshSettings: () => {},
  refreshSolPrice: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [solPrice, setSolPrice] = useState("0");
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeWallet, setActiveWallet] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  const refreshWallets = useCallback(async () => {
    try {
      const d = await api.listWallets();
      setWallets(d.wallets);
      setActiveWallet(d.activeWallet);
    } catch {}
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
    });

    const priceInterval = setInterval(refreshSolPrice, 30000);
    return () => clearInterval(priceInterval);
  }, []);

  return (
    <AppContext.Provider value={{ sessionReady, solPrice, wallets, activeWallet, profile, settings, refreshWallets, refreshProfile, refreshSettings, refreshSolPrice }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
