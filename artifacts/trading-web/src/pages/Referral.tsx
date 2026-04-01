import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Copy, Share2, Check, Gift, Users, Coins, RefreshCw } from "lucide-react";

export default function Referral() {
  const { wallets } = useApp();
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const load = async () => {
    try { const d = await api.getReferral(); setData(d); } catch {}
  };

  useEffect(() => { load(); }, []);

  const refLink = data ? `${window.location.origin}?ref=${data.code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const claim = async () => {
    if (!wallets.length) { alert("You need an active wallet to claim."); return; }
    setClaiming(true);
    try {
      await api.claimCashback();
      setClaimed(true);
      await load();
      setTimeout(() => setClaimed(false), 3000);
    } catch {}
    setClaiming(false);
  };

  const cashback = parseFloat(data?.cashback || "0");

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">🔵 Referral & Cashback</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Earn passive SOL by referring friends and trading</p>
      </div>

      <div className="rounded-xl border border-primary/20 gradient-primary p-5">
        <h3 className="font-semibold text-sm mb-3">Your Referral Link</h3>
        <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2 mb-3">
          <span className="text-sm text-foreground flex-1 truncate font-mono">{refLink}</span>
          <button onClick={copyLink} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-secondary transition-colors">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Join Alpha Trading Bot — trade Solana like a pro! 🚀")}`}
          target="_blank" rel="noreferrer"
          className="btn-primary inline-flex items-center gap-2 w-full justify-center">
          <Share2 className="w-4 h-4" /> Share on Telegram
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <Users className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <div className="text-xl font-bold">{data?.referrals || 0}</div>
          <div className="text-xs text-muted-foreground">Referrals</div>
        </div>
        <div className="stat-card text-center">
          <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <div className="text-xl font-bold">{data?.earned || "0.0000"}</div>
          <div className="text-xs text-muted-foreground">SOL Earned</div>
        </div>
        <div className="stat-card text-center">
          <Gift className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <div className="text-xl font-bold text-emerald-400">{parseFloat(data?.cashback || "0").toFixed(6)}</div>
          <div className="text-xs text-muted-foreground">Cashback</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">💰 Cashback Rewards</h3>
          <span className="badge-green">10% of fees</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Cashback Balance</span>
            <span className="font-bold text-emerald-400">{parseFloat(data?.cashback || "0").toFixed(6)} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rate</span>
            <span>10% of all bot fees</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span>Instantly after each trade</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Minimum</span>
            <span>No minimum</span>
          </div>
        </div>

        {cashback > 0 ? (
          <button onClick={claim} disabled={claiming || !wallets.length} className="btn-primary w-full flex items-center justify-center gap-2">
            {claiming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
            {claimed ? "Claimed! ✅" : `Claim ${cashback.toFixed(6)} SOL`}
          </button>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-2">
            Trade to earn cashback! Each trade earns 0.1% of volume.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">How the Referral System Works</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Share your unique referral link with friends</li>
          <li>Friend signs up and trades using Alpha Trading Bot</li>
          <li>You earn <strong className="text-foreground">20% of ALL their trading fees forever</strong></li>
          <li>No cap, no expiry — track your earnings in real-time</li>
        </ol>
        <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
          💡 Commission: <strong>20%</strong> of every trading fee generated by referred users
        </div>
      </div>
    </div>
  );
}
