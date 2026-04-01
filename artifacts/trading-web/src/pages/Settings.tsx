import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { useLang, LANG_OPTIONS } from "@/contexts/LanguageContext";
import { Save, Shield, AlertTriangle, RefreshCw } from "lucide-react";

export default function Settings() {
  const { refreshSettings } = useApp();
  const { lang, setLang } = useLang();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    api.getSettings().then(d => setSettings(d)).catch(() => {});
  }, []);

  const update = (key: string, val: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: val }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings({ ...settings, ...(newPin ? { pin: newPin } : {}) });
      await refreshSettings();
      setSaved(true);
      setNewPin("");
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const clearData = async () => {
    if (!confirm("Delete ALL your data? This cannot be undone.")) return;
    await api.clearData();
    localStorage.removeItem("alpha_sid");
    window.location.reload();
  };

  if (!settings) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  const LANGS = LANG_OPTIONS;

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">🔨 Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure trading preferences and security</p>
      </div>

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
          <input className="input-base" type="number" placeholder="Custom %" value={settings.slippage} onChange={e => update("slippage", e.target.value)} step="0.1" min="0.1" max="50" />
          <p className="text-xs text-muted-foreground mt-1">Current: {settings.slippage}% — Higher slippage = better fill rate but worse price</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1.5">Priority Fee (SOL)</label>
          <div className="flex gap-2 mb-2">
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
          <input className="input-base" type="number" placeholder="Custom SOL fee" value={settings.priorityFee} onChange={e => update("priorityFee", e.target.value)} step="0.001" min="0" />
          <p className="text-xs text-muted-foreground mt-1">Higher fee = faster confirmation on-chain</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Trading Options</h3>

        {[
          { key: "mev", label: "🛡 MEV Protection", desc: "Prevents sandwich attacks on your trades" },
          { key: "tradeConfirm", label: "✅ Trade Confirmation", desc: "Show confirmation dialog before executing" },
          { key: "autoBuy", label: "🤖 Auto-Buy", desc: "Automatically buy tokens matching criteria" },
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

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">Language</h3>
        <div className="flex flex-wrap gap-2">
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { update("language", l.code); setLang(l.code); }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${(settings.language === l.code || lang === l.code) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Security</h3>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <div className="text-sm font-medium">🔐 2FA Authentication</div>
            <div className="text-xs text-muted-foreground">Extra layer of security for all actions</div>
          </div>
          <button onClick={() => update("twofa", !settings.twofa)}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.twofa ? "bg-primary" : "bg-secondary"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.twofa ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div>
          <div className="text-sm font-medium mb-1">📌 Trade PIN</div>
          <div className="text-xs text-muted-foreground mb-2">Set a 4-digit PIN required before each trade. Status: {settings.pin === "set" ? "✅ SET" : "Not set"}</div>
          <input className="input-base" type="password" placeholder="Enter new 4-digit PIN..." maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} />
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
        <p className="text-xs text-muted-foreground mb-3">This will delete all your wallets, trades, and settings permanently.</p>
        <button onClick={clearData} className="btn-destructive text-xs">🗑 Delete All My Data</button>
      </div>
    </div>
  );
}
