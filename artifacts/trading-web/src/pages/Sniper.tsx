import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Target, Zap, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";

export default function Sniper() {
  const { wallets } = useApp();
  const [config, setConfig] = useState({ active: false, token: "", amount: "0.5" });
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("0.5");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSniper().then(d => { setConfig(d); setToken(d.token || ""); setAmount(d.amount || "0.5"); }).catch(() => {});
  }, []);

  const save = async (updates?: Partial<typeof config>) => {
    setLoading(true);
    try {
      const d = await api.setSniper({ ...config, token, amount, ...updates });
      setConfig(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setLoading(false);
  };

  const toggle = () => {
    if (!wallets.length) { alert("You need a wallet first."); return; }
    if (!config.active && !token) { alert("Set a token to snipe first."); return; }
    save({ active: !config.active });
  };

  const platforms = [
    { name: "Pump.fun", color: "text-purple-400", bg: "bg-purple-400/10" },
    { name: "Launchlab", color: "text-blue-400", bg: "bg-blue-400/10" },
    { name: "Letsbonk", color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { name: "Moonshot", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">🎯 Token Sniper</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Auto-buy tokens the instant liquidity is detected on-chain</p>
      </div>

      <div className={`rounded-xl border p-6 text-center ${config.active ? "border-emerald-400/30 bg-emerald-400/5 glow-green" : "border-border bg-card"}`}>
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${config.active ? "bg-emerald-400/20" : "bg-secondary"}`}>
          <Target className={`w-8 h-8 ${config.active ? "text-emerald-400" : "text-muted-foreground"}`} />
        </div>
        <div className={`text-2xl font-bold mb-1 ${config.active ? "text-emerald-400" : "text-muted-foreground"}`}>
          {config.active ? "🟢 SNIPING ACTIVE" : "🔴 INACTIVE"}
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          {config.active ? "Monitoring on-chain for liquidity..." : "Set token and activate to begin"}
        </div>
        <button onClick={toggle} className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${config.active ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}>
          {config.active ? "🔴 Deactivate" : "🟢 Activate Sniper"}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h3 className="font-semibold text-sm">Sniper Configuration</h3>

        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1.5">Token Contract Address</label>
          <input
            className="input-base font-mono text-xs"
            placeholder="Paste token contract address to snipe..."
            value={token}
            onChange={e => setToken(e.target.value)}
          />
          {token && (
            <a href={`https://dexscreener.com/solana/${token}`} target="_blank" rel="noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
              View on DexScreener <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1.5">Buy Amount (SOL)</label>
          <div className="flex gap-2 mb-2">
            {["0.1", "0.5", "1", "2", "5"].map(p => (
              <button key={p} onClick={() => setAmount(p)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${amount === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {p}
              </button>
            ))}
          </div>
          <input className="input-base" type="number" placeholder="Custom SOL amount..." value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01" />
        </div>

        <div className="flex gap-2">
          <button onClick={() => save()} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Config"}
          </button>
        </div>

        {config.token && (
          <div className="rounded-lg bg-secondary/50 p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">Target:</span> <span className="font-mono text-foreground">{config.token.slice(0, 20)}...{config.token.slice(-6)}</span></div>
            <div><span className="text-muted-foreground">Amount:</span> <span className="text-foreground font-semibold">{config.amount} SOL</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className={config.active ? "text-emerald-400" : "text-muted-foreground"}>{config.active ? "🟢 Active" : "🔴 Inactive"}</span></div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Supported Platforms</h3>
        <div className="grid grid-cols-2 gap-3">
          {platforms.map(p => (
            <div key={p.name} className="stat-card flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${p.bg} flex items-center justify-center`}>
                <Zap className={`w-4 h-4 ${p.color}`} />
              </div>
              <span className="text-sm font-medium text-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">How Sniping Works</h3>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Paste the token contract address (pre-launch)</li>
          <li>Set your buy amount in SOL</li>
          <li>Activate the sniper</li>
          <li>Bot monitors Solana for liquidity being added</li>
          <li>Executes the buy instantly when liquidity is detected</li>
        </ol>
      </div>
    </div>
  );
}
