import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export default function LimitOrders() {
  const { wallets } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState({ type: "buy" as "buy" | "sell", token: "", price: "", amount: "" });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try { const d = await api.getLimitOrders(); setOrders(d.orders || []); } catch {}
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallets.length) { setError("You need a wallet first."); return; }
    if (!form.token || !form.price || !form.amount) { setError("Fill all fields."); return; }
    setLoading(true);
    setError("");
    try {
      await api.createLimitOrder(form);
      setForm({ type: "buy", token: "", price: "", amount: "" });
      setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const cancel = async (id: string) => {
    await api.deleteLimitOrder(id);
    await load();
  };

  const cancelAll = async () => {
    if (!confirm("Cancel all limit orders?")) return;
    await api.deleteAllLimitOrders();
    await load();
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">✂️ Limit Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Auto-execute trades when a token hits your target price</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => { setShowForm(!showForm); setForm({ type: "buy", token: "", price: "", amount: "" }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Order
        </button>
        {orders.length > 0 && (
          <button onClick={cancelAll} className="btn-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Cancel All
          </button>
        )}
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">New Limit Order</h3>

          <div className="flex rounded-lg bg-secondary p-1 gap-1">
            {(["buy", "sell"] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-all ${form.type === t ? (t === "buy" ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "text-muted-foreground"}`}>
                {t === "buy" ? "📈 Buy" : "📉 Sell"}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Token Contract Address</label>
            <input className="input-base font-mono text-xs" placeholder="Token CA..." value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Trigger Price (USD)</label>
            <input className="input-base" type="number" placeholder="e.g. 0.000005" step="any" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Amount (SOL)</label>
            <input className="input-base" type="number" placeholder="e.g. 0.5" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "Placing..." : "Place Order"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {orders.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-1">No active limit orders</p>
          <p className="text-sm">Create a limit order to auto-trade at your target price</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className={`rounded-xl border p-4 ${o.type === "buy" ? "border-emerald-400/20 bg-emerald-400/5" : "border-red-400/20 bg-red-400/5"}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 mb-2">
                {o.type === "buy" ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                <span className={`font-bold text-sm ${o.type === "buy" ? "text-emerald-400" : "text-red-400"}`}>{o.type.toUpperCase()}</span>
                <span className="badge-yellow">⏳ Pending</span>
              </div>
              <button onClick={() => cancel(o.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Token:</span> <span className="font-mono">{o.token?.slice(0, 12)}...</span></div>
              <div><span className="text-muted-foreground">Trigger:</span> <span className="font-semibold">${o.price}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold">{o.amount} SOL</span></div>
              <div><span className="text-muted-foreground">Created:</span> <span>{new Date(o.createdAt).toLocaleDateString()}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">How Limit Orders Work</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li>📈 <b>Buy Limit</b> — buys when token price drops to your target</li>
          <li>📉 <b>Sell Limit</b> — sells when token price rises to your target</li>
          <li>⏳ Orders stay active until triggered or cancelled</li>
          <li>⚡ Executed automatically via Jupiter when price is hit</li>
        </ul>
      </div>
    </div>
  );
}
