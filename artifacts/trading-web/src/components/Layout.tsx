import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, Scissors,
  Copy, User, BarChart3, Gift, Settings, Send, Menu, X,
  ExternalLink, TrendingUp, Zap
} from "lucide-react";

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/trade", label: "Buy & Sell", icon: ArrowLeftRight },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/sniper", label: "Sniper", icon: Target },
  { path: "/limits", label: "Limit Orders", icon: Scissors },
  { path: "/copy", label: "Copy Trade", icon: Copy },
  { path: "/transfer", label: "Transfer SOL", icon: Send },
  { path: "/trades", label: "Trade History", icon: BarChart3 },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/referral", label: "Referral & Cashback", icon: Gift },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { solPrice, wallets, activeWallet, sessionReady } = useApp();

  const activeWalletData = wallets[activeWallet];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`fixed lg:relative z-50 lg:z-auto flex flex-col w-64 h-full bg-sidebar border-r border-sidebar-border transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">ALPHA TRADING</div>
            <div className="text-xs text-muted-foreground">Solana DEX</div>
          </div>
          <button className="ml-auto lg:hidden text-muted-foreground" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">SOL Price</span>
            <span className="text-sm font-bold text-primary">${parseFloat(solPrice || "0").toFixed(2)}</span>
          </div>
          {activeWalletData && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate max-w-[120px] font-mono">{activeWalletData.address?.slice(0, 6)}...{activeWalletData.address?.slice(-4)}</span>
              <span className="text-sm font-semibold text-foreground">{parseFloat(activeWalletData.balance || "0").toFixed(4)} SOL</span>
            </div>
          )}
          {!activeWalletData && sessionReady && (
            <div className="mt-1.5 text-xs text-muted-foreground">No wallet connected</div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV.map(({ path, label, icon: Icon }) => (
            <Link key={path} href={path}>
              <div
                className={`nav-item ${location === path ? "nav-item-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
          <a href="https://t.me/AlphaCirclle" target="_blank" rel="noreferrer" className="nav-item">
            <TrendingUp className="w-4 h-4" />
            <span>Telegram Channel</span>
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
          <a href="https://t.me/Alphacircletrading_bot" target="_blank" rel="noreferrer" className="nav-item">
            <Zap className="w-4 h-4" />
            <span>Telegram Bot</span>
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 h-12 border-b border-border bg-background lg:hidden flex-shrink-0">
          <button className="text-muted-foreground" onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">ALPHA TRADING</span>
          </div>
          <div className="ml-auto text-sm font-semibold text-primary">${parseFloat(solPrice || "0").toFixed(2)}</div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
