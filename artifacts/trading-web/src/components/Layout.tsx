import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { useLang } from "@/contexts/LanguageContext";
import TickerTape from "@/components/TickerTape";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, Scissors,
  Copy, User, BarChart3, Gift, Settings, Send, Menu, X,
  ExternalLink, TrendingUp, Zap, LineChart, ChevronRight, MessageCircle,
  Radio
} from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { solPrice, wallets, activeWallet, sessionReady } = useApp();
  const { t } = useLang();
  const activeWalletData = wallets[activeWallet];

  const NAV_PRIMARY = [
    { path: "/", label: t("home"), icon: LayoutDashboard },
    { path: "/markets", label: t("markets"), icon: LineChart },
    { path: "/trade", label: t("buySell"), icon: ArrowLeftRight },
    { path: "/wallets", label: t("wallets"), icon: Wallet },
    { path: "/chat", label: t("chat"), icon: MessageCircle },
  ];
  const NAV_TRADING = [
    { path: "/sniper", label: t("sniper"), icon: Target },
    { path: "/limits", label: t("limitOrders"), icon: Scissors },
    { path: "/copy", label: t("copyTrade"), icon: Copy },
    { path: "/transfer", label: t("transferSol"), icon: Send },
  ];
  const NAV_ACCOUNT = [
    { path: "/trades", label: t("tradeHistory"), icon: BarChart3 },
    { path: "/profile", label: t("profile"), icon: User },
    { path: "/referral", label: t("referral"), icon: Gift },
    { path: "/settings", label: t("settings"), icon: Settings },
  ];
  const MOBILE_NAV = [
    { path: "/", label: t("home"), icon: LayoutDashboard },
    { path: "/markets", label: t("markets"), icon: LineChart },
    { path: "/trade", label: "Trade", icon: ArrowLeftRight },
    { path: "/wallets", label: t("wallets"), icon: Wallet },
    { path: "/chat", label: "Chat", icon: MessageCircle },
  ];

  const NavSection = ({ title, items, onClick }: { title?: string; items: typeof NAV_PRIMARY; onClick: () => void }) => (
    <div className="space-y-0.5">
      {title && (
        <div className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
          {title}
        </div>
      )}
      {items.map(({ path, label, icon: Icon }) => (
        <Link key={path} href={path}>
          <div className={`nav-item ${location === path ? "nav-item-active" : ""}`} onClick={onClick}>
            <Icon className="w-[15px] h-[15px] flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {location === path && <ChevronRight className="w-3 h-3 opacity-50" />}
          </div>
        </Link>
      ))}
    </div>
  );

  const solNum = parseFloat(solPrice || "0");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {open && <div className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm" onClick={() => setOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={`fixed lg:relative z-50 lg:z-auto flex flex-col w-60 h-full border-r border-sidebar-border transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "hsl(220 30% 4%)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(0,225,122,0.25), rgba(0,225,122,0.1))", border: "1px solid rgba(0,225,122,0.3)" }}>
            <Zap className="w-4 h-4" style={{ color: "var(--green)" }} />
          </div>
          <div>
            <div className="text-[13px] font-extrabold tracking-widest text-white leading-none">ALPHA</div>
            <div className="text-[10px] font-medium tracking-[0.1em]" style={{ color: "var(--green)" }}>TRADING</div>
          </div>
          <button className="ml-auto lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wallet + SOL price */}
        <div className="px-3 py-3 border-b border-sidebar-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="live-dot" />
              <span className="text-[11px] text-muted-foreground font-medium">SOL / USD</span>
            </div>
            <span className="text-sm font-bold font-mono" style={{ color: "var(--green)" }}>
              ${solNum.toFixed(2)}
            </span>
          </div>
          {activeWalletData ? (
            <div className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: "rgba(0,225,122,0.06)", border: "1px solid rgba(0,225,122,0.12)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--green)" }} />
                <span className="font-mono text-[11px] text-muted-foreground truncate">
                  {activeWalletData.address?.slice(0, 6)}…{activeWalletData.address?.slice(-4)}
                </span>
              </div>
              <span className="text-xs font-bold text-white ml-1 font-mono">
                {parseFloat(activeWalletData.balance || "0").toFixed(3)}
              </span>
            </div>
          ) : sessionReady ? (
            <Link href="/wallets">
              <div className="text-[11px] text-muted-foreground/60 text-center py-1.5 cursor-pointer hover:text-primary transition-colors">
                + Connect wallet
              </div>
            </Link>
          ) : null}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <NavSection items={NAV_PRIMARY} onClick={() => setOpen(false)} />
          <NavSection title={t("trading")} items={NAV_TRADING} onClick={() => setOpen(false)} />
          <NavSection title={t("account")} items={NAV_ACCOUNT} onClick={() => setOpen(false)} />
        </nav>

        {/* Telegram links */}
        <div className="px-2 py-2 border-t border-sidebar-border space-y-0.5">
          <a href="https://t.me/AlphaCirclle" target="_blank" rel="noreferrer" className="nav-item">
            <Radio className="w-[15px] h-[15px]" />
            <span className="flex-1">{t("telegramChannel")}</span>
            <ExternalLink className="w-3 h-3 opacity-40" />
          </a>
          <a href="https://t.me/Alphacircletrading_bot" target="_blank" rel="noreferrer" className="nav-item">
            <TrendingUp className="w-[15px] h-[15px]" />
            <span className="flex-1">{t("telegramBot")}</span>
            <ExternalLink className="w-3 h-3 opacity-40" />
          </a>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 px-4 h-12 border-b border-border lg:hidden flex-shrink-0"
          style={{ background: "hsl(220 28% 5%)" }}>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: "var(--green)" }} />
            <span className="font-extrabold text-sm tracking-widest text-white">ALPHA</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="live-dot" />
            <span className="text-sm font-bold font-mono" style={{ color: "var(--green)" }}>
              ${solNum.toFixed(2)}
            </span>
          </div>
        </header>

        {/* Ticker tape */}
        <TickerTape />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="p-4 lg:p-6 max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-sidebar-border"
          style={{ background: "hsl(220 30% 4%)" }}>
          <div className="flex items-center justify-around px-1 py-1.5">
            {MOBILE_NAV.map(({ path, label, icon: Icon }) => {
              const active = location === path;
              return (
                <Link key={path} href={path}>
                  <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${active ? "text-[var(--green)]" : "text-muted-foreground"}`}>
                    <Icon className={`w-[18px] h-[18px] ${active ? "drop-shadow-[0_0_4px_rgba(0,225,122,0.6)]" : ""}`} />
                    <span className={`text-[9.5px] font-semibold tracking-wide ${active ? "" : ""}`}>{label}</span>
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
