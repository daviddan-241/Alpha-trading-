import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Send, CheckCircle, XCircle, ExternalLink, Loader2, AlertTriangle } from "lucide-react";

export default function Transfer() {
  const { wallets, activeWallet, refreshWallets } = useApp();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const activeW = wallets[activeWallet];

  const sendAll = () => {
    if (activeW) setAmount(Math.max(0, parseFloat(activeW.balance || "0") - 0.001).toFixed(4));
  };

  const transfer = async () => {
    if (!activeW) { alert("No wallet connected."); return; }
    if (!activeW.privateKey) { alert("Private key not available for this wallet."); return; }
    if (!toAddress.trim()) { alert("Enter destination address."); return; }
    if (!amount || parseFloat(amount) <= 0) { alert("Enter amount."); return; }
    if (parseFloat(amount) > parseFloat(activeW.balance || "0")) { alert("Insufficient balance."); return; }
    if (!confirm(`Send ${amount} SOL to ${toAddress.slice(0, 12)}...${toAddress.slice(-6)}?`)) return;

    setLoading(true);
    setResult(null);
    try {
      const r = await api.transfer(activeW.privateKey, toAddress.trim(), amount);
      setResult(r);
      if (r.success) {
        setToAddress("");
        setAmount("");
        await refreshWallets();
      }
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">📮 Transfer SOL</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Send SOL to any Solana wallet</p>
      </div>

      {!activeW && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          You need a wallet to transfer SOL. Go to Wallets first.
        </div>
      )}

      {activeW && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">From</div>
          <div className="font-semibold text-foreground">{activeW.label}</div>
          <div className="font-mono text-xs text-muted-foreground mt-0.5">{activeW.address?.slice(0, 20)}...{activeW.address?.slice(-6)}</div>
          <div className="text-sm font-bold text-foreground mt-2">
            Available: <span className="text-primary">{parseFloat(activeW.balance || "0").toFixed(4)} SOL</span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1.5">Destination Address</label>
          <input
            className="input-base font-mono text-xs"
            placeholder="Solana wallet address..."
            value={toAddress}
            onChange={e => setToAddress(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted-foreground font-medium">Amount (SOL)</label>
            <button onClick={sendAll} className="text-xs text-primary hover:underline">Send All</button>
          </div>
          <input
            className="input-base"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            step="0.001"
            min="0"
          />
        </div>

        {toAddress.length > 30 && amount && (
          <div className="rounded-lg bg-secondary/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-mono">{toAddress.slice(0, 12)}...{toAddress.slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{amount} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span>~0.000005 SOL</span>
            </div>
          </div>
        )}

        <button
          onClick={transfer}
          disabled={loading || !activeW || !toAddress || !amount}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? "Sending..." : "Send SOL"}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${result.success ? "border-emerald-400/20 bg-emerald-400/5" : "border-red-400/20 bg-red-400/5"}`}>
          {result.success ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
          <div>
            <div className={`font-semibold text-sm ${result.success ? "text-emerald-400" : "text-red-400"}`}>
              {result.success ? "Transfer Successful!" : "Transfer Failed"}
            </div>
            {result.txid && (
              <a href={`https://solscan.io/tx/${result.txid}`} target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                View on Solscan <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {result.error && <div className="text-xs text-muted-foreground mt-1">{result.error}</div>}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-2">⚠️ Important</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Double-check the destination address before sending</li>
          <li>• Solana transactions are irreversible once confirmed</li>
          <li>• Keep a small amount for transaction fees (~0.001 SOL)</li>
          <li>• Transfers confirm in ~400ms on Solana</li>
        </ul>
      </div>
    </div>
  );
}
