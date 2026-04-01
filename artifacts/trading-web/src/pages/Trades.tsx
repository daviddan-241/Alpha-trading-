import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, ExternalLink, RefreshCw } from "lucide-react";

export default function Trades() {
  const [data, setData] = useState<any>({ history: [], trades: 0, volume: "0", totalPnl: "0" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const d = await api.getTrades(); setData(d); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pnl = parseFloat(data.totalPnl || "0");

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Trade History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All your trades and performance</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
          <div className="text-xl font-bold">{data.trades}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">Volume</div>
          <div className="text-xl font-bold">{parseFloat(data.volume || "0").toFixed(2)} SOL</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground mb-1">P&L</div>
          <div className={`text-xl font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)}
          </div>
        </div>
      </div>

      {data.history?.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg mb-1">No trades yet</p>
          <p className="text-sm">Execute a buy or sell to see trade history</p>
        </div>
      )}

      {data.history?.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-5 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
            <span>Type</span>
            <span>Token</span>
            <span>Amount</span>
            <span>P&L</span>
            <span>Time</span>
          </div>
          {data.history.map((t: any, i: number) => {
            const pnl = parseFloat(t.pnl || "0");
            return (
              <div key={t.id || i} className={`grid grid-cols-5 px-4 py-3 text-sm items-center ${i < data.history.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex items-center gap-1.5">
                  {t.type === "buy"
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  <span className={`font-semibold text-xs ${t.type === "buy" ? "text-emerald-400" : "text-red-400"}`}>{t.type.toUpperCase()}</span>
                </div>
                <span className="font-mono text-xs">{t.tokenSymbol || t.token}</span>
                <span>{t.amount} SOL</span>
                <span className={`font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{pnl >= 0 ? "+" : ""}{t.pnl}%</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">{t.time}</span>
                  {t.txid && (
                    <a href={`https://solscan.io/tx/${t.txid}`} target="_blank" rel="noreferrer" className="text-primary">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BarChart(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.className ? undefined : 24} height={props.className ? undefined : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
