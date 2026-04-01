import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Plus, Import, Copy, Trash2, Check, Eye, EyeOff, RefreshCw, Loader2, ExternalLink, Star } from "lucide-react";

export default function Wallets() {
  const { wallets, activeWallet, refreshWallets } = useApp();
  const [loading, setLoading] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fullWallets, setFullWallets] = useState<any[]>([]);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    setLoading(true);
    await refreshWallets();
    setLoading(false);
  };

  const generate = async (count = 1) => {
    setLoading(true);
    setError("");
    try {
      const d = await api.generateWallet(count);
      setFullWallets(prev => [...prev, ...(d.wallets || [])]);
      await refreshWallets();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const importWallet = async () => {
    if (!importKey.trim()) return;
    setLoading(true);
    setError("");
    try {
      const d = await api.importWallet(importKey.trim());
      setFullWallets(prev => [...prev, d]);
      setImportKey("");
      setShowImport(false);
      await refreshWallets();
    } catch (e: any) {
      setError("Invalid private key or seed phrase");
    }
    setLoading(false);
  };

  const setActive = async (i: number) => {
    await api.setActiveWallet(i);
    await refreshWallets();
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const deleteWallet = async (i: number) => {
    if (!confirm("Delete this wallet? Make sure you have backed up the private key.")) return;
    await api.deleteWallet(i);
    await refreshWallets();
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">💳 Wallets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate or import real Solana wallets</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => generate(1)} disabled={loading} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Generate Wallet
        </button>
        <button onClick={() => generate(5)} disabled={loading} className="btn-secondary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Generate 5
        </button>
        <button onClick={() => generate(10)} disabled={loading} className="btn-secondary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Generate 10
        </button>
        <button onClick={() => setShowImport(!showImport)} className="btn-secondary flex items-center gap-2">
          <Import className="w-4 h-4" /> Import
        </button>
        <button onClick={loadWallets} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {showImport && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Import Wallet</h3>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Private Key (base58) or Seed Phrase (12/24 words)</label>
            <textarea
              className="input-base h-20 resize-none font-mono text-xs"
              placeholder="Enter private key or seed phrase..."
              value={importKey}
              onChange={e => setImportKey(e.target.value)}
            />
          </div>
          <div className="text-xs text-yellow-400 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-2">
            ⚠️ Your key is used only to derive the public address and sign transactions. Delete this browser tab after importing if on a shared device.
          </div>
          <div className="flex gap-2">
            <button onClick={importWallet} disabled={loading || !importKey.trim()} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Import
            </button>
            <button onClick={() => { setShowImport(false); setImportKey(""); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {wallets.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-1">No wallets yet</p>
          <p className="text-sm">Generate or import a Solana wallet to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {wallets.map((w, i) => {
          const isActive = i === activeWallet;
          const fullData = fullWallets.find(fw => fw.address === w.address);
          const showKey = visibleKeys[i];
          return (
            <div key={w.address} className={`rounded-xl border p-4 transition-colors ${isActive ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => setActive(i)} className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${isActive ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                  {isActive && <div className="w-full h-full rounded-full bg-primary-foreground scale-50" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">{w.label}</span>
                    {isActive && <span className="badge-green">Active</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{w.address?.slice(0, 12)}...{w.address?.slice(-6)}</span>
                    <button onClick={() => copyAddr(w.address)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {copiedAddr === w.address ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-2">{parseFloat(w.balance || "0").toFixed(4)} SOL</div>

                  {fullData?.privateKey && (
                    <div className="mt-2">
                      <button onClick={() => setVisibleKeys(prev => ({ ...prev, [i]: !prev[i] }))}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
                        {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showKey ? "Hide" : "Show"} Private Key
                      </button>
                      {showKey && (
                        <div className="bg-secondary rounded-lg p-2 font-mono text-xs text-foreground break-all flex items-start gap-2">
                          <span className="flex-1">{fullData.privateKey}</span>
                          <button onClick={() => { navigator.clipboard.writeText(fullData.privateKey); }} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {!isActive && (
                    <button onClick={() => setActive(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Set active">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteWallet(i)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                Fund: Send SOL to <span className="font-mono">{w.address?.slice(0, 20)}...</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
