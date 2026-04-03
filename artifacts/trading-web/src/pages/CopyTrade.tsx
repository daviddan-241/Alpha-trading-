import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Plus, Trash2, ExternalLink, Play, Square, RefreshCw, Zap, Activity } from "lucide-react";

export default function CopyTrade() {
  const { wallets, activeWallet } = useApp();
  const [targets, setTargets] = useState<any[]>([]);
  const [address, setAddress] = useState("");
  const [maxSol, setMaxSol] = useState("0.5");
  const [chain, setChain] = useState<"sol" | "eth">("sol");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copiedCount, setCopiedCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = async () => {
    try {
      const d = await api.getCopyTrades();
      setTargets(d.targets || []);
      setRunning(d.running || false);
      const ec = (d.engineTargets || []).reduce((s: number, t: any) => s + (t.totalCopied || 0), 0);
      setCopiedCount(ec);
    } catch {}
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const add = async () => {
    if (!wallets.length) { setError("You need a wallet first."); return; }
    if (!address.trim()) { setError("Enter a wallet address."); return; }
    if (chain === "sol" && address.trim().length < 30) { setError("Invalid Solana address."); return; }
    if (chain === "eth" && !address.trim().startsWith("0x")) { setError("Invalid ETH address."); return; }
    setLoading(true); setError("");
    try {
      await api.addCopyTrade(address.trim(), maxSol, chain);
      setAddress(""); setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message || "Invalid address"); }
    setLoading(false);
  };

  const startEngine = async () => {
    const activeW = wallets[activeWallet];
    if (!activeW?.privateKey) { setError("Active wallet needs a private key to start copy trading."); return; }
    if (!targets.length) { setError("Add wallet targets first."); return; }
    setStarting(true); setError("");
    try {
      await api.startCopyTrading(activeW.privateKey);
      setRunning(true);
      await load();
    } catch (e: any) { setError(e.message || "Failed to start engine"); }
    setStarting(false);
  };

  const stopEngine = async () => {
    setStarting(true);
    try {
      await api.stopCopyTrading();
      setRunning(false);
    } catch {}
    setStarting(false);
  };

  const clear = async () => {
    if (!confirm("Unfollow all wallets and stop copy trading?")) return;
    await api.clearCopyTrades();
    setRunning(false);
    await load();
  };

  const activeW = wallets[activeWallet];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">🎮 Copy Trading</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mirror every trade a profitable wallet makes in real-time</p>
      </div>

      {/* Engine status */}
      <div className="rounded-2xl border p-4"
        style={running
          ? { borderColor: "rgba(0,225,122,0.3)", background: "rgba(0,225,122,0.04)" }
          : { borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: running ? "rgba(0,225,122,0.15)" : "rgba(255,255,255,0.05)" }}>
              {running
                ? <Activity className="w-5 h-5 animate-pulse" style={{ color: "var(--green)" }} />
                : <Zap className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                Copy Trading Engine
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {running ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    <span className="text-green-400 font-semibold">ACTIVE</span>
                    <span>· {targets.length} wallet{targets.length !== 1 ? "s" : ""} tracked</span>
                    {copiedCount > 0 && <span>· {copiedCount} trade{copiedCount !== 1 ? "s" : ""} mirrored</span>}
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    <span className="text-red-400 font-semibold">STOPPED</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-lg text-muted-foreground hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            {running ? (
              <button onClick={stopEngine} disabled={starting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                style={{ background: "rgba(255,75,75,0.12)", border: "1px solid rgba(255,75,75,0.3)", color: "var(--red)" }}>
                <Square className="w-3.5 h-3.5" />
                {starting ? "Stopping..." : "Stop"}
              </button>
            ) : (
              <button onClick={startEngine} disabled={starting || !targets.length}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors btn-primary">
                <Play className="w-3.5 h-3.5" />
                {starting ? "Starting..." : "Start Engine"}
              </button>
            )}
          </div>
        </div>

        {!activeW?.privateKey && (
          <div className="mt-3 text-xs text-yellow-400 rounded-lg px-3 py-2"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            ⚠️ Active wallet needs a private key to execute mirrored trades.
          </div>
        )}

        {running && (
          <div className="mt-3 text-xs text-muted-foreground rounded-lg px-3 py-2"
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
            🔄 Polling target wallets every 15 seconds. Trades are mirrored automatically using your active wallet.
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Follow Wallet
        </button>
        {targets.length > 0 && (
          <button onClick={clear} className="btn-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Unfollow All & Stop
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Follow a Wallet</h3>

          <div className="flex gap-2">
            {(["sol", "eth"] as const).map(c => (
              <button key={c} onClick={() => setChain(c)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={chain === c
                  ? { background: c === "eth" ? "#627EEA22" : "rgba(0,225,122,0.12)", borderColor: c === "eth" ? "#627EEA" : "var(--green)", color: c === "eth" ? "#627EEA" : "var(--green)" }
                  : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                {c === "sol" ? "◎ Solana" : "Ξ Ethereum"}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              {chain === "sol" ? "Solana" : "Ethereum"} Wallet Address to Copy
            </label>
            <input className="input-base font-mono text-xs"
              placeholder={chain === "sol" ? "Solana wallet address..." : "0x... Ethereum address..."}
              value={address} onChange={e => setAddress(e.target.value)} />
            {address.length > 10 && (
              <a href={chain === "sol" ? `https://solscan.io/account/${address}` : `https://etherscan.io/address/${address}`}
                target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                View on {chain === "sol" ? "Solscan" : "Etherscan"} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Max {chain === "sol" ? "SOL" : "ETH"} per Trade
            </label>
            <div className="flex gap-2 mb-2">
              {["0.1", "0.5", "1", "2"].map(p => (
                <button key={p} onClick={() => setMaxSol(p)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${maxSol === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {p}
                </button>
              ))}
            </div>
            <input className="input-base" type="number" placeholder="Max amount per trade..."
              value={maxSol} onChange={e => setMaxSol(e.target.value)} min="0.01" step="0.01" />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="flex gap-2">
            <button onClick={add} disabled={loading} className="btn-primary">{loading ? "Adding..." : "Follow"}</button>
            <button onClick={() => { setShowForm(false); setAddress(""); setError(""); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {error && !showForm && <div className="text-sm text-red-400">{error}</div>}

      {/* Empty state */}
      {targets.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <Activity className="w-8 h-8" style={{ color: "var(--purple)" }} />
          </div>
          <p className="text-lg font-semibold text-white mb-1">Not following anyone</p>
          <p className="text-sm">Follow a profitable wallet to mirror their trades automatically</p>
        </div>
      )}

      {/* Targets list */}
      <div className="space-y-3">
        {targets.map((t, i) => (
          <div key={i} className="rounded-xl border p-4"
            style={{ borderColor: running ? "rgba(0,225,122,0.2)" : "hsl(var(--border))", background: "hsl(var(--card))" }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${running ? "bg-green-400/10 text-green-400" : "bg-white/5 text-muted-foreground"}`}>
                    {running ? "🟢 Monitoring" : "⏸ Paused"}
                  </span>
                  <span className="font-semibold text-sm">{t.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: t.chain === "eth" ? "#627EEA22" : "rgba(153,69,255,0.12)", color: t.chain === "eth" ? "#627EEA" : "#9945FF" }}>
                    {(t.chain || "sol").toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.address?.slice(0, 16)}...{t.address?.slice(-6)}</span>
                  <a href={t.chain === "eth"
                    ? `https://etherscan.io/address/${t.address}`
                    : `https://solscan.io/account/${t.address}`}
                    target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-sm mt-1">
                  <span className="text-muted-foreground">Max per trade:</span>
                  <span className="font-semibold ml-1">{t.maxSol} {(t.chain || "sol") === "eth" ? "ETH" : "SOL"}</span>
                </div>
              </div>
              <button onClick={async () => { const updated = targets.filter((_, j) => j !== i); setTargets(updated); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">How Copy Trading Works</h3>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Find a profitable wallet on <a href="https://solscan.io" target="_blank" rel="noreferrer" className="text-primary hover:underline">Solscan</a> or <a href="https://gmgn.ai" target="_blank" rel="noreferrer" className="text-primary hover:underline">GMGN</a></li>
          <li>Paste their wallet address and set your max amount per trade</li>
          <li>Click <strong className="text-white">Start Engine</strong> — the bot polls every 15 seconds</li>
          <li>Every buy/sell they make is automatically mirrored using your active wallet</li>
          <li>Cap your risk by limiting max amount per mirrored trade</li>
        </ol>
      </div>
    </div>
  );
}
