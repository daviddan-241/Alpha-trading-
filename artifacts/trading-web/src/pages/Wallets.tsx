import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Plus, Import, Copy, Trash2, Check, Eye, EyeOff, RefreshCw, Loader2, ExternalLink, Star, Key, Shield } from "lucide-react";

export default function Wallets() {
  const { wallets, activeWallet, refreshWallets, addWallet, removeWallet, setActive, renameWallet } = useApp();
  const [loading, setLoading] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [labelInput, setLabelInput] = useState("");

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const d = await api.generateWallet(1);
      const generated = d.wallets || [];
      for (const w of generated) {
        addWallet({
          address: w.address,
          privateKey: w.privateKey,
          label: `Wallet ${wallets.length + 1}`,
          balance: w.balance || "0.0000",
        });
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate wallet");
    }
    setLoading(false);
  };

  const importWallet = async () => {
    if (!importKey.trim()) return;
    setLoading(true); setError("");
    try {
      const d = await api.importWallet(importKey.trim());
      addWallet({
        address: d.address,
        privateKey: d.privateKey,
        label: `Imported Wallet ${wallets.length + 1}`,
        balance: d.balance || "0.0000",
      });
      setImportKey(""); setShowImport(false);
    } catch {
      setError("Invalid private key or seed phrase. Check and try again.");
    }
    setLoading(false);
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const deleteWallet = async (i: number) => {
    if (!confirm("Delete this wallet? Make sure you have backed up your private key.")) return;
    removeWallet(i);
  };

  const saveLabel = (i: number) => {
    if (labelInput.trim()) renameWallet(i, labelInput.trim());
    setEditingLabel(null);
  };

  const doRefresh = async () => {
    setLoading(true);
    await refreshWallets();
    setLoading(false);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-white">Wallets</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Generate or import Solana wallets. Private keys are stored locally in your browser.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create New Wallet
        </button>
        <button onClick={() => setShowImport(!showImport)} className="btn-secondary flex items-center gap-2">
          <Import className="w-4 h-4" /> Import Wallet
        </button>
        <button onClick={doRefresh} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {showImport && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" style={{ color: "var(--green)" }} />
            <h3 className="font-bold text-sm text-white">Import Wallet</h3>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Private Key (base58) or Seed Phrase (12/24 words)</label>
            <textarea
              className="input-base h-20 resize-none font-mono text-xs"
              placeholder="Paste your private key or 12/24 word seed phrase here..."
              value={importKey}
              onChange={e => setImportKey(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={importWallet} disabled={loading || !importKey.trim()} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Import
            </button>
            <button onClick={() => { setShowImport(false); setImportKey(""); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: "rgba(255,75,75,0.08)", border: "1px solid rgba(255,75,75,0.2)", color: "var(--red)" }}>
          <span>✗</span> {error}
        </div>
      )}

      {wallets.length === 0 && !loading && (
        <div className="text-center py-14 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.15)" }}>
            <Key className="w-7 h-7" style={{ color: "var(--green)" }} />
          </div>
          <p className="font-semibold text-white mb-1">No wallets yet</p>
          <p className="text-sm">Generate a Solana wallet to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {wallets.map((w, i) => {
          const isActive = i === activeWallet;
          const showKey = visibleKeys[i];
          return (
            <div key={w.address} className="rounded-2xl border p-4 transition-all"
              style={isActive
                ? { borderColor: "rgba(0,225,122,0.3)", background: "rgba(0,225,122,0.05)" }
                : { borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
              <div className="flex items-start gap-3">
                <button onClick={() => setActive(i)} className="mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all"
                  style={isActive ? { borderColor: "var(--green)", background: "var(--green)" } : { borderColor: "hsl(var(--muted-foreground))" }}>
                  {isActive && <div className="w-full h-full rounded-full scale-50" style={{ background: "#03150a" }} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {editingLabel === i ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          className="input-base text-sm py-0.5 px-2 h-7"
                          value={labelInput}
                          onChange={e => setLabelInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveLabel(i); if (e.key === "Escape") setEditingLabel(null); }}
                          autoFocus
                        />
                        <button onClick={() => saveLabel(i)} className="text-xs text-primary hover:underline">Save</button>
                        <button onClick={() => setEditingLabel(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingLabel(i); setLabelInput(w.label); }}
                        className="font-bold text-sm text-white hover:text-primary transition-colors text-left">
                        {w.label}
                      </button>
                    )}
                    {isActive && <span className="badge-green">Active</span>}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-muted-foreground">{w.address?.slice(0, 14)}...{w.address?.slice(-6)}</span>
                    <button onClick={() => copyAddr(w.address)} className="text-muted-foreground hover:text-white transition-colors">
                      {copiedAddr === w.address ? <Check className="w-3.5 h-3.5" style={{ color: "var(--green)" }} /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="text-xl font-black font-mono text-white">
                    {parseFloat(w.balance || "0").toFixed(4)} <span className="text-sm font-bold text-muted-foreground">SOL</span>
                  </div>

                  {w.privateKey && (
                    <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Private Key</span>
                          <span className="badge-yellow text-[9px]">KEEP SECRET</span>
                        </div>
                        <button onClick={() => setVisibleKeys(prev => ({ ...prev, [i]: !prev[i] }))}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white transition-colors">
                          {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showKey ? "Hide" : "Reveal"}
                        </button>
                      </div>
                      {showKey ? (
                        <div className="flex items-start gap-2">
                          <code className="flex-1 text-[11px] font-mono break-all leading-relaxed" style={{ color: "var(--gold)" }}>
                            {w.privateKey}
                          </code>
                          <button onClick={() => copyKey(w.privateKey)} className="flex-shrink-0 text-muted-foreground hover:text-white transition-colors mt-0.5">
                            {copiedKey === w.privateKey ? <Check className="w-3.5 h-3.5" style={{ color: "var(--green)" }} /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground/50">••••••••••••••••••••••••••••••••••••••••</div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-muted-foreground px-3 py-2 rounded-xl" style={{ background: "rgba(0,225,122,0.05)", border: "1px solid rgba(0,225,122,0.1)" }}>
                    Fund: Send SOL to <span className="font-mono text-white">{w.address?.slice(0, 20)}…</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {!isActive && (
                    <button onClick={() => setActive(i)} title="Set as active"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteWallet(i)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-3 flex items-start gap-2.5 text-xs" style={{ background: "rgba(0,225,122,0.05)", border: "1px solid rgba(0,225,122,0.1)" }}>
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
        <span className="text-muted-foreground">
          Your private keys are stored <strong className="text-white">only in this browser</strong>. Never share them. Back them up somewhere safe — they cannot be recovered if lost.
        </span>
      </div>
    </div>
  );
}
