import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Plus, Trash2, ExternalLink, Copy as CopyIcon } from "lucide-react";

export default function CopyTrade() {
  const { wallets } = useApp();
  const [targets, setTargets] = useState<any[]>([]);
  const [address, setAddress] = useState("");
  const [maxSol, setMaxSol] = useState("0.5");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { const d = await api.getCopyTrades(); setTargets(d.targets || []); } catch {}
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!wallets.length) { setError("You need a wallet first."); return; }
    if (!address.trim()) { setError("Enter a wallet address."); return; }
    if (address.trim().length < 30) { setError("Invalid Solana address."); return; }
    setLoading(true);
    setError("");
    try {
      await api.addCopyTrade(address.trim(), maxSol);
      setAddress("");
      setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message || "Invalid address"); }
    setLoading(false);
  };

  const clear = async () => {
    if (!confirm("Unfollow all wallets?")) return;
    await api.clearCopyTrades();
    await load();
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">🎮 Copy Trading</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mirror every trade a profitable wallet makes in real-time</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Follow Wallet
        </button>
        {targets.length > 0 && (
          <button onClick={clear} className="btn-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Unfollow All
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Follow a Wallet</h3>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Wallet Address to Copy</label>
            <input className="input-base font-mono text-xs" placeholder="Solana wallet address..." value={address} onChange={e => setAddress(e.target.value)} />
            {address.length > 30 && (
              <a href={`https://solscan.io/account/${address}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                View on Solscan <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Max SOL per Trade</label>
            <div className="flex gap-2 mb-2">
              {["0.1", "0.5", "1", "2"].map(p => (
                <button key={p} onClick={() => setMaxSol(p)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${maxSol === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {p} SOL
                </button>
              ))}
            </div>
            <input className="input-base" type="number" placeholder="Max SOL per trade..." value={maxSol} onChange={e => setMaxSol(e.target.value)} min="0.01" step="0.01" />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div className="flex gap-2">
            <button onClick={add} disabled={loading} className="btn-primary">{loading ? "Adding..." : "Follow"}</button>
            <button onClick={() => { setShowForm(false); setAddress(""); setError(""); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {targets.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <CopyIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg mb-1">Not following anyone</p>
          <p className="text-sm">Follow a profitable wallet to mirror their trades automatically</p>
        </div>
      )}

      <div className="space-y-3">
        {targets.map((t, i) => (
          <div key={i} className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-green">🟢 Following</span>
                  <span className="font-semibold text-sm">{t.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.address?.slice(0, 16)}...{t.address?.slice(-6)}</span>
                  <a href={`https://solscan.io/account/${t.address}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-sm mt-1"><span className="text-muted-foreground">Max per trade:</span> <span className="font-semibold">{t.maxSol} SOL</span></div>
              </div>
              <button onClick={async () => { const updated = targets.filter((_, j) => j !== i); setTargets(updated); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">How Copy Trading Works</h3>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Find a profitable wallet on <a href="https://solscan.io" target="_blank" rel="noreferrer" className="text-primary hover:underline">Solscan</a> or <a href="https://gmgn.ai" target="_blank" rel="noreferrer" className="text-primary hover:underline">GMGN</a></li>
          <li>Paste their wallet address and set your max SOL per trade</li>
          <li>Bot monitors every transaction they make on-chain</li>
          <li>Automatically mirrors each buy and sell in real-time</li>
          <li>Cap risk by limiting max SOL per mirrored trade</li>
        </ol>
      </div>
    </div>
  );
}
