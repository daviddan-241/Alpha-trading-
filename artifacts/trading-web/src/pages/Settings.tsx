import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useLang, LANG_OPTIONS } from "@/contexts/LanguageContext";
import { Save, Shield, AlertTriangle, RefreshCw, Wallet, Mail, Key, Eye, EyeOff, Copy, Check, ExternalLink } from "lucide-react";

export default function Settings() {
  const { refreshSettings, wallets, activeWallet, setActive, removeWallet, renameWallet } = useApp();
  const { lang, setLang } = useLang();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [email, setEmail] = useState("");
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<number | null>(null);
  const [labelVal, setLabelVal] = useState("");

  useEffect(() => {
    api.getSettings().then(d => {
      setSettings(d);
      setEmail(d.email || "");
    }).catch(() => {});
  }, []);

  const update = (key: string, val: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: val }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings({ ...settings, ...(newPin ? { pin: newPin } : {}), email });
      await refreshSettings();
      setSaved(true);
      setNewPin("");
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const clearData = async () => {
    if (!confirm("Delete ALL your data? This cannot be undone.")) return;
    await api.clearData();
    localStorage.removeItem("alpha_sid");
    localStorage.removeItem("alpha_wallets_v3");
    localStorage.removeItem("alpha_wallets_v2");
    window.location.reload();
  };

  const copyVal = (v: string) => {
    navigator.clipboard.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveLabel = (i: number) => {
    if (labelVal.trim()) renameWallet(i, labelVal.trim());
    setEditLabel(null);
  };

  if (!settings) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">⚙️ Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure trading preferences, security, and wallet management</p>
      </div>

      {/* Wallet Management */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" style={{ color: "var(--green)" }} />
          <h3 className="font-semibold text-sm">Wallet Management</h3>
          <span className="text-xs text-muted-foreground ml-auto">{wallets.length} wallet{wallets.length !== 1 ? "s" : ""}</span>
        </div>

        {wallets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No wallets yet. Go to Wallets to create one.</p>
        ) : (
          <div className="space-y-2">
            {wallets.map((w, i) => {
              const isActive = i === activeWallet;
              const chain = w.chain || "sol";
              const chainColor = chain === "eth" ? "#627EEA" : chain === "bsc" ? "#F0B90B" : "var(--green)";
              return (
                <div key={w.address + i} className="rounded-xl border p-3 transition-all"
                  style={isActive
                    ? { borderColor: "rgba(0,225,122,0.3)", background: "rgba(0,225,122,0.04)" }
                    : { borderColor: "hsl(var(--border))" }}>
                  <div className="flex items-start gap-2">
                    <button onClick={() => setActive(i)}
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all"
                      style={isActive
                        ? { borderColor: "var(--green)", background: "var(--green)" }
                        : { borderColor: "hsl(var(--muted-foreground))" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {editLabel === i ? (
                          <div className="flex items-center gap-1">
                            <input className="input-base text-xs py-0.5 px-2 h-6 w-32" value={labelVal}
                              onChange={e => setLabelVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveLabel(i); if (e.key === "Escape") setEditLabel(null); }}
                              autoFocus />
                            <button onClick={() => saveLabel(i)} className="text-xs text-primary hover:underline">Save</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditLabel(i); setLabelVal(w.label); }}
                            className="text-xs font-bold text-white hover:text-primary transition-colors">
                            {w.label}
                          </button>
                        )}
                        {isActive && <span className="badge-green text-[9px]">Active</span>}
                        <span className="text-[10px] font-bold px-1 rounded"
                          style={{ background: chainColor + "22", color: chainColor }}>
                          {chain.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-muted-foreground">{w.address.slice(0, 12)}...{w.address.slice(-6)}</span>
                        <button onClick={() => copyVal(w.address)}
                          className="text-muted-foreground hover:text-white transition-colors">
                          {copied === w.address ? <Check className="w-3 h-3" style={{ color: "var(--green)" }} /> : <Copy className="w-3 h-3" />}
                        </button>
                        <a href={chain === "eth"
                          ? `https://etherscan.io/address/${w.address}`
                          : `https://solscan.io/account/${w.address}`}
                          target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-white">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {parseFloat(w.balance || "0").toFixed(4)} {chain === "eth" ? "ETH" : "SOL"}
                      </div>

                      {/* Private key reveal */}
                      <div className="mt-2">
                        <button onClick={() => setShowKeys(p => ({ ...p, [i]: !p[i] }))}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors">
                          <Key className="w-3 h-3" />
                          {showKeys[i] ? "Hide Keys" : "Show Keys"}
                          {showKeys[i] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        {showKeys[i] && (
                          <div className="mt-1.5 rounded-lg p-2 space-y-1"
                            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="flex items-center gap-1">
                              <code className="text-[10px] font-mono text-yellow-400 break-all flex-1">{w.privateKey}</code>
                              <button onClick={() => copyVal(w.privateKey)}>
                                {copied === w.privateKey ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                              </button>
                            </div>
                            {w.seedPhrase && (
                              <div className="pt-1 border-t border-white/5">
                                <code className="text-[10px] font-mono text-green-400 break-all">{w.seedPhrase}</code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { if (confirm("Delete wallet?")) removeWallet(i); }}
                      className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Notification */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" style={{ color: "var(--blue)" }} />
          <h3 className="font-semibold text-sm">Email Notifications</h3>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Notification email (for wallet backups & trade alerts)</label>
          <input className="input-base" type="email" placeholder="your@email.com" value={email}
            onChange={e => setEmail(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Wallet keys are emailed here when generated or imported for your backup.</p>
        </div>
      </div>

      {/* Trading Parameters */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h3 className="font-semibold text-sm">Trading Parameters</h3>

        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1.5">Slippage Tolerance</label>
          <div className="flex gap-2 mb-2">
            {["0.5", "1", "2", "5"].map(p => (
              <button key={p} onClick={() => update("slippage", p)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${settings.slippage === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {p}%
              </button>
            ))}
          </div>
          <input className="input-base" type="number" placeholder="Custom %" value={settings.slippage}
            onChange={e => update("slippage", e.target.value)} step="0.1" min="0.1" max="50" />
          <p className="text-xs text-muted-foreground mt-1">Current: {settings.slippage}% — Higher = better fill, worse price</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1.5">Priority Fee (SOL)</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {[
              { label: "🥉 Bronze", val: "0.001" },
              { label: "🥈 Silver", val: "0.005" },
              { label: "🥇 Gold", val: "0.01" },
              { label: "💎 Diamond", val: "0.05" },
            ].map(p => (
              <button key={p.val} onClick={() => update("priorityFee", p.val)}
                className={`px-2 py-1.5 rounded-lg text-xs border transition-colors ${settings.priorityFee === p.val ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <input className="input-base" type="number" placeholder="Custom SOL fee" value={settings.priorityFee}
            onChange={e => update("priorityFee", e.target.value)} step="0.001" min="0" />
          <p className="text-xs text-muted-foreground mt-1">Higher fee = faster confirmation on-chain</p>
        </div>
      </div>

      {/* Trading Options */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Trading Options</h3>
        {[
          { key: "mev", label: "🛡 MEV Protection", desc: "Prevents sandwich attacks on your trades" },
          { key: "tradeConfirm", label: "✅ Trade Confirmation", desc: "Show confirmation before executing" },
          { key: "autoBuy", label: "🤖 Auto-Buy", desc: "Automatically buy tokens when sniper triggers" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
            <div>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <button onClick={() => update(key, !settings[key])}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings[key] ? "bg-primary" : "bg-secondary"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings[key] ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Language */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Language</h3>
        <div className="flex flex-wrap gap-2">
          {LANG_OPTIONS.map(l => (
            <button key={l.code} onClick={() => { update("language", l.code); setLang(l.code); }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${(settings.language === l.code || lang === l.code) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Security</h3>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <div className="text-sm font-medium">🔐 2FA Authentication</div>
            <div className="text-xs text-muted-foreground">Extra security layer for all actions</div>
          </div>
          <button onClick={() => update("twofa", !settings.twofa)}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.twofa ? "bg-primary" : "bg-secondary"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.twofa ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div>
          <div className="text-sm font-medium mb-1">📌 Trade PIN</div>
          <div className="text-xs text-muted-foreground mb-2">
            4-digit PIN required before each trade. Status: {settings.pin === "set" ? "✅ SET" : "Not set"}
          </div>
          <input className="input-base" type="password" placeholder="Enter new 4-digit PIN..."
            maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : saved ? "Saved! ✅" : "Save All Settings"}
      </button>

      <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
        <div className="flex items-center gap-2 mb-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-semibold text-sm">Danger Zone</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">This deletes all wallets, trades, and settings permanently.</p>
        <button onClick={clearData} className="btn-destructive text-xs">🗑 Delete All My Data</button>
      </div>
    </div>
  );
}
