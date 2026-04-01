import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Wallet, BarChart3, Copy, Target, Zap, ArrowUpRight } from "lucide-react";

export default function Dashboard() {
  const { solPrice, wallets, activeWallet, profile, refreshProfile } = useApp();
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  useEffect(() => {
    refreshProfile();
    api.getTrades().then(d => setRecentTrades(d.history?.slice(0, 5) || [])).catch(() => {});
  }, []);

  const activeW = wallets[activeWallet];
  const solUsdBalance = activeW ? (parseFloat(activeW.balance || "0") * parseFloat(solPrice || "0")).toFixed(2) : "0.00";
  const pnl = profile?.totalPnl ? parseFloat(profile.totalPnl) : 0;

  const quickLinks = [
    { href: "/trade", label: "Buy & Sell", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { href: "/sniper", label: "Sniper", icon: Target, color: "text-purple-400", bg: "bg-purple-400/10" },
    { href: "/limits", label: "Limit Orders", icon: BarChart3, color: "text-blue-400", bg: "bg-blue-400/10" },
    { href: "/copy", label: "Copy Trade", icon: Copy, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🤖 Alpha Trading Bot</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time Solana DEX trading platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card gradient-primary">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">SOL Price</span>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">${parseFloat(solPrice || "0").toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">Jupiter API · Live</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Balance</span>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">{parseFloat(activeW?.balance || "0").toFixed(4)} SOL</div>
          <div className="text-xs text-muted-foreground mt-1">≈ ${solUsdBalance} USD</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">P&L Today</span>
            {pnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
          </div>
          <div className={`text-2xl font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)} SOL
          </div>
          <div className="text-xs text-muted-foreground mt-1">{profile?.trades || 0} total trades</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Volume</span>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">{parseFloat(profile?.volume || "0").toFixed(2)} SOL</div>
          <div className="text-xs text-muted-foreground mt-1">Win Rate: {profile?.winRate || 0}%</div>
        </div>
      </div>

      {wallets.length === 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <Wallet className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">No Wallet Connected</h3>
          <p className="text-sm text-muted-foreground mb-4">Generate or import a Solana wallet to start trading</p>
          <Link href="/wallets">
            <button className="btn-primary">Set Up Wallet</button>
          </Link>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map(({ href, label, icon: Icon, color, bg }) => (
            <Link key={href} href={href}>
              <div className="stat-card cursor-pointer hover:border-primary/20 transition-colors group">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{label}</div>
                <ArrowUpRight className="w-3 h-3 text-muted-foreground mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {recentTrades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Recent Trades</h2>
            <Link href="/trades">
              <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {recentTrades.map((t, i) => {
              const pnl = parseFloat(t.pnl);
              return (
                <div key={t.id || i} className={`flex items-center gap-3 px-4 py-3 ${i < recentTrades.length - 1 ? "border-b border-border" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === "buy" ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
                    {t.type === "buy" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{t.type.toUpperCase()} {t.tokenSymbol || t.token}</div>
                    <div className="text-xs text-muted-foreground">{t.amount} SOL · {t.time}</div>
                  </div>
                  <div className={`text-sm font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {pnl >= 0 ? "+" : ""}{t.pnl}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <div className="text-xl font-bold text-foreground">{wallets.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Wallets</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xl font-bold text-emerald-400">{parseFloat(profile?.cashback || "0").toFixed(6)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">SOL Cashback</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xl font-bold text-purple-400">{profile?.referrals || 0}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Referrals</div>
        </div>
      </div>
    </div>
  );
}
