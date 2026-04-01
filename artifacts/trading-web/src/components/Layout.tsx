import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, Scissors,
  Copy, User, BarChart3, Gift, Settings, Send, Menu, X,
  ExternalLink, TrendingUp, Zap, LineChart, ChevronRight, Search
} from "lucide-react";

const NAV_PRIMARY = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/markets", label: "Markets", icon: LineChart },
  { path: "/trade", label: "Buy & Sell", icon: ArrowLeftRight },
  { path: "/wallets", label: "Wallets", icon: Wallet },
];

const NAV_TRADING = [
  { path: "/sniper", label: "Sniper", icon: Target },
  { path: "/limits", label: "Limit Orders", icon: Scissors },
  { path: "/copy", label: "Copy Trade", icon: Copy },
  { path: "/transfer", label: "Transfer SOL", icon: Send },
];

const NAV_ACCOUNT = [
  { path: "/trades", label: "Trade History", icon: BarChart3 },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/referral", label: "Referral & Cashback", icon: Gift },
  { path: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/markets", label: "Markets", icon: LineChart },
  { path: "/trade", label: "Trade", icon: ArrowLeftRight },
  { path: "/wallets", label: "Wallets", icon: Wallet },
  { path: "/profile", label: "Profile", icon: User },
];

function NavSection({ title, items, location, onClick }: { title?: string; items: typeof NAV_PRIMARY; location: string; onClick: () => void }) {
  return (
    <div>
      {title && <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{title}</div>}
      {items.map(({ path, label, icon: Icon }) => (
        <Link key={path} href={path}>
          <div
            className={`nav-item ${location === path ? "nav-item-active" : ""}`}
            onClick={onClick}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            {location === path && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
          </div>
        </Link>
      ))}
    </div>
  );
}

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
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground leading-tight">ALPHA TRADING</div>
            <div className="text-[11px] text-muted-foreground">Solana DEX Platform</div>
          </div>
          <button className="ml-auto lg:hidden text-muted-foreground" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-2.5 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground/70 font-medium">SOL PRICE</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-primary">${parseFloat(solPrice || "0").toFixed(2)}</span>
            </div>
          </div>
          {activeWalletData ? (
            <div className="flex items-center justify-between bg-secondary/60 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="font-mono text-[11px] text-muted-foreground truncate">{activeWalletData.address?.slice(0, 8)}...{activeWalletData.address?.slice(-4)}</span>
              </div>
              <span className="text-[12px] font-semibold text-foreground flex-shrink-0 ml-1">{parseFloat(activeWalletData.balance || "0").toFixed(3)} SOL</span>
            </div>
          ) : sessionReady ? (
            <div className="text-[11px] text-muted-foreground/60 text-center py-1">No wallet connected</div>
          ) : null}
        </div>

        <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0">
          <NavSection items={NAV_PRIMARY} location={location} onClick={() => setOpen(false)} />
          <NavSection title="Trading" items={NAV_TRADING} location={location} onClick={() => setOpen(false)} />
          <NavSection title="Account" items={NAV_ACCOUNT} location={location} onClick={() => setOpen(false)} />
        </nav>

        <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
          <a href="https://t.me/AlphaCirclle" target="_blank" rel="noreferrer" className="nav-item">
            <TrendingUp className="w-4 h-4" />
            <span>Telegram Channel</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
          </a>
          <a href="https://t.me/Alphacircletrading_bot" target="_blank" rel="noreferrer" className="nav-item">
            <Zap className="w-4 h-4" />
            <span>Telegram Bot</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
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
            <span className="font-bold text-sm tracking-wide">ALPHA TRADING</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-primary">${parseFloat(solPrice || "0").toFixed(2)}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="p-4 lg:p-6 max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-30">
          <div className="flex items-center justify-around px-2 py-1.5">
            {MOBILE_NAV.map(({ path, label, icon: Icon }) => {
              const isActive = location === path;
              return (
                <Link key={path} href={path}>
                  <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
