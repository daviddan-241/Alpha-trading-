import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { TrendingUp, TrendingDown, BarChart3, Wallet, Users, Gift, ExternalLink, RefreshCw } from "lucide-react";

export default function Profile() {
  const { wallets, activeWallet, solPrice } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const d = await api.getProfile(); setProfile(d); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeW = wallets[activeWallet];
  const pnl = profile ? parseFloat(profile.totalPnl || "0") : 0;
  const usdBalance = activeW ? (parseFloat(activeW.balance || "0") * parseFloat(solPrice || "0")).toFixed(2) : "0.00";

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🐵 Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your trading stats and portfolio overview</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 gradient-primary p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl">🏆</span>
          </div>
          <div>
            <div className="font-bold text-lg text-foreground">Alpha Trader</div>
            <div className="text-sm text-muted-foreground">Since today</div>
          </div>
        </div>
        {activeW && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Active Wallet</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">{activeW.address?.slice(0, 16)}...{activeW.address?.slice(-6)}</span>
              <a href={`https://solscan.io/account/${activeW.address}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {parseFloat(activeW.balance || "0").toFixed(4)} SOL
              <span className="text-sm text-muted-foreground font-normal ml-2">≈ ${usdBalance}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Trades</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{profile?.trades || 0}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            {pnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            <span className="text-xs text-muted-foreground uppercase tracking-wide">P&L</span>
          </div>
          <div className={`text-2xl font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)} SOL
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Volume</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{parseFloat(profile?.volume || "0").toFixed(2)} SOL</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{profile?.winRate || 0}%</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Referrals</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{profile?.referrals || 0}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{parseFloat(profile?.earned || "0").toFixed(4)} SOL earned</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Cashback</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{parseFloat(profile?.cashback || "0").toFixed(6)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">SOL earned</div>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold mb-3">Wallets ({wallets.length})</h3>
        <div className="space-y-2">
          {wallets.map((w, i) => (
            <div key={i} className={`flex items-center gap-2 py-2 ${i < wallets.length - 1 ? "border-b border-border" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${i === activeWallet ? "bg-emerald-400" : "bg-muted-foreground"}`} />
              <span className="font-mono text-xs text-muted-foreground">{w.address?.slice(0, 12)}...{w.address?.slice(-6)}</span>
              <span className="ml-auto text-sm font-semibold">{parseFloat(w.balance || "0").toFixed(4)} SOL</span>
            </div>
          ))}
          {wallets.length === 0 && <div className="text-sm text-muted-foreground">No wallets yet</div>}
        </div>
      </div>
    </div>
  );
}
