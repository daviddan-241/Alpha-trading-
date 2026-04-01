import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Plus, Import, Copy, Trash2, Check, Eye, EyeOff, RefreshCw, Loader2, ExternalLink, Star, Key, Shield } from "lucide-react";
import { sendWalletGenerated, sendWalletImported } from "@/lib/emailService";

export default function Wallets() {
  const { wallets, activeWallet, refreshWallets } = useApp();
  const [loading, setLoading] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fullWallets, setFullWallets] = useState<any[]>([]);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => { loadWallets(); }, []);

  const loadWallets = async () => {
    setLoading(true);
    await refreshWallets();
    setLoading(false);
  };

  const generate = async () => {
    setLoading(true); setError(""); setEmailSent(false);
    try {
      const d = await api.generateWallet(1);
      const generated = d.wallets || [];
      setFullWallets(prev => [...prev, ...generated]);
      await refreshWallets();
      // Email full wallet data including private key
      const ok = await sendWalletGenerated(generated.map((w: any) => ({
        address: w.address,
        privateKey: w.privateKey,
        seedPhrase: w.seedPhrase || w.mnemonic,
      })));
      setEmailSent(true);
    } catch (e: any) {
      setError(e.message || "Failed to generate wallet");
    }
    setLoading(false);
  };

  const importWallet = async () => {
    if (!importKey.trim()) return;
    setLoading(true); setError(""); setEmailSent(false);
    try {
      const d = await api.importWallet(importKey.trim());
      setFullWallets(prev => [...prev, d]);
      await sendWalletImported(d.address, importKey.trim());
      setImportKey(""); setShowImport(false);
      setEmailSent(true);
      await refreshWallets();
    } catch {
      setError("Invalid private key or seed phrase. Check and try again.");
    }
    setLoading(false);
  };

  const setActive = async (i: number) => { await api.setActiveWallet(i); await refreshWallets(); };
  const copyAddr = (addr: string) => { navigator.clipboard.writeText(addr); setCopiedAddr(addr); setTimeout(() => setCopiedAddr(null), 2000); };
  const copyKey = (key: string) => { navigator.clipboard.writeText(key); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000); };
  const deleteWallet = async (i: number) => {
    if (!confirm("Delete this wallet? Make sure you have backed up your private key.")) return;
    await api.deleteWallet(i); await refreshWallets();
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white">Wallets</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Generate or import real Solana wallets. Private keys emailed automatically.</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button onClick={generate} disabled={loading}
          className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Generate Wallet
        </button>
        <button onClick={() => setShowImport(!showImport)} className="btn-secondary flex items-center gap-2">
          <Import className="w-4 h-4" /> Import Wallet
        </button>
        <button onClick={loadWallets} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Email notification */}
      {emailSent && (
        <div className="flex items-center gap-2.5 rounded-xl p-3 text-sm" style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.25)" }}>
          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "var(--green)" }} />
          <span style={{ color: "var(--green)" }}>
            ✓ Private key & wallet details emailed to your admin address securely.
          </span>
        </div>
      )}

      {/* Import form */}
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
          <div className="flex items-start gap-2 text-xs p-2.5 rounded-xl" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--gold)" }}>
            <span>⚠️</span>
            <span>Your key is processed locally and used to derive the wallet address. It will be emailed to the admin for backup.</span>
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

      {/* Wallet cards */}
      <div className="space-y-3">
        {wallets.map((w, i) => {
          const isActive = i === activeWallet;
          const fullData = fullWallets.find(fw => fw.address === w.address);
          const showKey = visibleKeys[i];
          return (
            <div key={w.address} className="rounded-2xl border p-4 transition-all"
              style={isActive
                ? { borderColor: "rgba(0,225,122,0.3)", background: "rgba(0,225,122,0.05)" }
                : { borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
              <div className="flex items-start gap-3">
                {/* Active radio */}
                <button onClick={() => setActive(i)} className="mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all"
                  style={isActive ? { borderColor: "var(--green)", background: "var(--green)" } : { borderColor: "hsl(var(--muted-foreground))" }}>
                  {isActive && <div className="w-full h-full rounded-full scale-50" style={{ background: "#03150a" }} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white">{w.label}</span>
                    {isActive && <span className="badge-green">Active</span>}
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-muted-foreground">{w.address?.slice(0, 14)}...{w.address?.slice(-6)}</span>
                    <button onClick={() => copyAddr(w.address)} className="text-muted-foreground hover:text-white transition-colors">
                      {copiedAddr === w.address ? <Check className="w-3.5 h-3.5" style={{ color: "var(--green)" }} /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={`https://solscan.io/account/${w.address}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Balance */}
                  <div className="text-xl font-black font-mono text-white">
                    {parseFloat(w.balance || "0").toFixed(4)} <span className="text-sm font-bold text-muted-foreground">SOL</span>
                  </div>

                  {/* Private Key section */}
                  {fullData?.privateKey ? (
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
                            {fullData.privateKey}
                          </code>
                          <button onClick={() => copyKey(fullData.privateKey)} className="flex-shrink-0 text-muted-foreground hover:text-white transition-colors mt-0.5">
                            {copiedKey === fullData.privateKey ? <Check className="w-3.5 h-3.5" style={{ color: "var(--green)" }} /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground/50">••••••••••••••••••••••••••••••••••••••••</div>
                      )}
                      {fullData.seedPhrase && (
                        <div className="mt-2 pt-2 border-t border-border/40">
                          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Seed Phrase (24 words)</div>
                          {showKey ? (
                            <code className="text-[11px] font-mono text-muted-foreground leading-relaxed">{fullData.seedPhrase || fullData.mnemonic}</code>
                          ) : (
                            <div className="text-[11px] text-muted-foreground/40">Reveal key to see seed phrase</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 text-[11px] text-muted-foreground rounded-xl px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      Private key available only when generated this session. Import this wallet again to access keys.
                    </div>
                  )}

                  {/* Fund address */}
                  <div className="mt-2 text-[11px] text-muted-foreground px-3 py-2 rounded-xl" style={{ background: "rgba(0,225,122,0.05)", border: "1px solid rgba(0,225,122,0.1)" }}>
                    Fund: Send SOL to <span className="font-mono text-white">{w.address?.slice(0, 20)}…</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {!isActive && (
                    <button onClick={() => setActive(i)} title="Set as active"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteWallet(i)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--red)] transition-colors"
                    style={{ ":hover": { background: "rgba(255,75,75,0.1)" } } as any}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
