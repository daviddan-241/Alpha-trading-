import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { useLang } from "@/contexts/LanguageContext";
import TickerTape from "@/components/TickerTape";
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target, Scissors,
  Copy, User, BarChart3, Gift, Settings, Send, Menu, X,
  ExternalLink, TrendingUp, Zap, LineChart, ChevronRight, MessageCircle,
  Radio, Flame,
} from "lucide-react";

const ALL_CHAINS_ICON: Record<string, string> = {
  sol: "◎", eth: "Ξ", bsc: "⬡", matic: "♦", avax: "▲", arb: "Ⓐ", op: "⊙", base: "◈",
};
const ALL_CHAINS_COLOR: Record<string, string> = {
  sol: "#9945FF", eth: "#627EEA", bsc: "#F0B90B", matic: "#8247E5",
  avax: "#E84142", arb: "#12AAFF", op: "#FF0420", base: "#0052FF",
};
const ALL_CHAINS_SCAN: Record<string, string> = {
  sol: "https://solscan.io/account/", eth: "https://etherscan.io/address/",
  bsc: "https://bscscan.com/address/", matic: "https://polygonscan.com/address/",
  avax: "https://snowtrace.io/address/", arb: "https://arbiscan.io/address/",
  op: "https://optimistic.etherscan.io/address/", base: "https://basescan.org/address/",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { totalUsd, wallets, activeWallet, sessionReady } = useApp();
  const { t } = useLang();
  const activeW = wallets[activeWallet];

  const NAV_PRIMARY = [
    { path: "/",       label: t("home"),    icon: LayoutDashboard },
    { path: "/markets",label: t("markets"), icon: LineChart },
    { path: "/signals",label: "Signals 🔥", icon: Flame },
    { path: "/trade",  label: t("buySell"), icon: ArrowLeftRight },
    { path: "/wallets",label: t("wallets"), icon: Wallet },
    { path: "/chat",   label: t("chat"),    icon: MessageCircle },
  ];
  const NAV_TRADING = [
    { path: "/sniper", label: t("sniper"),      icon: Target },
    { path: "/limits", label: t("limitOrders"), icon: Scissors },
    { path: "/copy",   label: t("copyTrade"),   icon: Copy },
    { path: "/transfer",label: t("transferSol"),icon: Send },
  ];
  const NAV_ACCOUNT = [
    { path: "/trades",  label: t("tradeHistory"), icon: BarChart3 },
    { path: "/profile", label: t("profile"),      icon: User },
    { path: "/referral",label: t("referral"),     icon: Gift },
    { path: "/settings",label: t("settings"),     icon: Settings },
  ];
  const MOBILE_NAV = [
    { path: "/",       label: t("home"),    icon: LayoutDashboard },
    { path: "/signals",label: "Signals",    icon: Flame },
    { path: "/trade",  label: "Trade",      icon: ArrowLeftRight },
    { path: "/wallets",label: t("wallets"), icon: Wallet },
    { path: "/copy",   label: "Copy",       icon: Copy },
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

  const chain = activeW?.chain || "sol";
  const chainIcon  = ALL_CHAINS_ICON[chain]  || "◎";
  const chainColor = ALL_CHAINS_COLOR[chain] || "#9945FF";
  const scanBase   = ALL_CHAINS_SCAN[chain]  || "https://solscan.io/account/";
  const ticker     = activeW?.nativeTicker || (chain === "sol" ? "SOL" : chain.toUpperCase());
  const balance    = parseFloat(activeW?.balance || "0");
  const balUsd     = activeW?.balanceUsd ? parseFloat(activeW.balanceUsd) : null;
  const totalUsdNum = parseFloat(totalUsd || "0");

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

        {/* Portfolio & active wallet */}
        <div className="px-3 py-3 border-b border-sidebar-border space-y-2">
          {/* Total portfolio USD */}
          {wallets.length > 0 && (
            <div className="rounded-xl px-3 py-2"
              style={{ background: "rgba(0,225,122,0.06)", border: "1px solid rgba(0,225,122,0.12)" }}>
              <div className="text-[10px] text-muted-foreground font-medium">Total Portfolio</div>
              <div className="text-lg font-black font-mono leading-tight mt-0.5"
                style={{ color: totalUsdNum > 0 ? "var(--green)" : "hsl(var(--muted-foreground))" }}>
                ${totalUsdNum > 0 ? totalUsdNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">{wallets.length} wallet{wallets.length !== 1 ? "s" : ""}</div>
            </div>
          )}

          {/* Active wallet card */}
          {activeW ? (
            <div>
              <div className="text-[10px] text-muted-foreground/60 px-1 mb-1">Active wallet</div>
              <div className="rounded-xl px-3 py-2"
                style={{ background: chainColor + "10", border: `1px solid ${chainColor}22` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold" style={{ color: chainColor }}>{chainIcon}</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate flex-1">
                    {activeW.address?.slice(0, 8)}…{activeW.address?.slice(-4)}
                  </span>
                  <a href={scanBase + activeW.address} target="_blank" rel="noreferrer"
                    className="text-muted-foreground/50 hover:text-white">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-base font-black font-mono text-white">
                      {balance.toFixed(4)} <span className="text-xs font-bold text-muted-foreground">{ticker}</span>
                    </div>
                    {balUsd !== null && balUsd > 0 && (
                      <div className="text-[11px] text-muted-foreground">≈ ${balUsd.toFixed(2)}</div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: chainColor + "22", color: chainColor }}>
                    {chain.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ) : sessionReady ? (
            <Link href="/wallets">
              <div className="text-[11px] text-muted-foreground/60 text-center py-2 cursor-pointer hover:text-primary transition-colors border border-dashed border-border rounded-xl">
                + Create wallet
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
          {/* Mobile: show active wallet balance */}
          <div className="ml-auto flex items-center gap-2">
            {activeW ? (
              <>
                <div className="live-dot" />
                <span className="text-sm font-bold font-mono text-white">
                  {balance.toFixed(3)} {ticker}
                </span>
                {balUsd !== null && balUsd > 0 && (
                  <span className="text-xs text-muted-foreground">${balUsd.toFixed(0)}</span>
                )}
              </>
            ) : (
              <Link href="/wallets">
                <span className="text-xs text-primary hover:underline">+ Wallet</span>
              </Link>
            )}
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
                  <div className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${active ? "text-[var(--green)]" : "text-muted-foreground"}`}>
                    <Icon className={`w-[18px] h-[18px] ${active ? "drop-shadow-[0_0_4px_rgba(0,225,122,0.6)]" : ""}`} />
                    <span className="text-[9.5px] font-semibold tracking-wide">{label}</span>
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
