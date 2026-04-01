import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { Search, TrendingUp, TrendingDown, ExternalLink, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

type Tab = "buy" | "sell";

export default function Trade() {
  const { wallets, activeWallet, solPrice, refreshWallets } = useApp();
  const [tab, setTab] = useState<Tab>("buy");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [sellPct, setSellPct] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; txid?: string; error?: string } | null>(null);

  const activeW = wallets[activeWallet];

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await api.searchTokens(query);
        setResults(d.pairs || []);
      } catch {}
      setSearching(false);
    }, 600);
    return () => clearTimeout(t);
  }, [query]);

  const selectToken = async (token: any) => {
    setSelected(token);
    setResults([]);
    setQuery(token.symbol + " — " + token.name);
    setResult(null);
    try {
      const info = await api.getTokenInfo(token.address);
      setTokenInfo(info);
    } catch { setTokenInfo(token); }
  };

  const selectByAddress = async (addr: string) => {
    if (addr.length < 32) return;
    try {
      const info = await api.getTokenInfo(addr.trim());
      if (info) {
        setSelected({ address: addr.trim(), symbol: info.symbol, name: info.name });
        setTokenInfo(info);
        setQuery(info.symbol + " — " + info.name);
        setResult(null);
      }
    } catch {}
  };

  const executeTrade = async () => {
    if (!activeW) { alert("No wallet connected. Go to Wallets first."); return; }
    if (!selected) { alert("Select a token first."); return; }
    if (!amount && tab === "buy") { alert("Enter amount."); return; }
    if (!sellPct && tab === "sell") { alert("Enter sell percentage."); return; }

    setLoading(true);
    setResult(null);
    try {
      const SOL_MINT = "So11111111111111111111111111111111111111112";
      let r: any;
      if (tab === "buy") {
        r = await api.swap({
          inputMint: SOL_MINT,
          outputMint: selected.address,
          amountSol: amount,
          tokenSymbol: selected.symbol,
        });
      } else {
        const retSol = (parseFloat(activeW.balance) * parseFloat(sellPct) / 100 * 0.98).toFixed(4);
        r = await api.swap({
          inputMint: selected.address,
          outputMint: SOL_MINT,
          amountSol: retSol,
          tokenSymbol: selected.symbol,
        });
      }
      setResult(r);
      if (r.success) refreshWallets();
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    }
    setLoading(false);
  };

  const SOL_USD = parseFloat(solPrice || "0");
  const amtUsd = amount ? (parseFloat(amount) * SOL_USD).toFixed(2) : "0.00";

  const PRESETS_BUY = ["0.1", "0.5", "1", "2", "5"];
  const PRESETS_SELL = ["10", "25", "50", "75", "100"];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">✨ Buy & Sell</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Trade any Solana token via Jupiter DEX aggregator</p>
      </div>

      {!activeW && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm text-yellow-400">
          ⚠️ You need a wallet to trade. Go to <a className="underline" href="./wallets">Wallets</a> to create one.
        </div>
      )}

      <div className="flex rounded-xl bg-secondary p-1 gap-1">
        {(["buy", "sell"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setResult(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? (t === "buy" ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "text-muted-foreground hover:text-foreground"}`}>
            {t === "buy" ? "📈 Buy" : "📉 Sell"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div>
          <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">Token Contract / Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="input-base pl-9"
              placeholder="Paste contract address or search token name..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                if (e.target.value.length > 30 && !e.target.value.includes(" ")) {
                  selectByAddress(e.target.value);
                }
              }}
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
          </div>

          {results.length > 0 && (
            <div className="mt-1 rounded-lg border border-border bg-popover overflow-hidden max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => selectToken(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary text-left border-b border-border last:border-b-0 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{r.symbol?.slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{r.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">${r.price}</div>
                    <div className={`text-xs ${r.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {r.priceChange24h >= 0 ? "+" : ""}{(r.priceChange24h || 0).toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && tokenInfo && (
          <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground">{tokenInfo.symbol || selected.symbol}</span>
                <span className="text-muted-foreground text-sm ml-2">{tokenInfo.name || selected.name}</span>
              </div>
              {tokenInfo.dexUrl && (
                <a href={tokenInfo.dexUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                  DexScreener <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Price:</span> <span className="font-mono text-foreground">${tokenInfo.price}</span></div>
              <div><span className="text-muted-foreground">24h:</span> <span className={tokenInfo.priceChange24h?.startsWith("+") ? "text-emerald-400" : "text-red-400"}>{tokenInfo.priceChange24h}</span></div>
              <div><span className="text-muted-foreground">MCap:</span> <span className="text-foreground">{tokenInfo.marketCap}</span></div>
              <div><span className="text-muted-foreground">Vol 24h:</span> <span className="text-foreground">{tokenInfo.volume24h}</span></div>
              <div><span className="text-muted-foreground">Liquidity:</span> <span className="text-foreground">{tokenInfo.liquidity}</span></div>
              <div className="font-mono text-muted-foreground truncate">{selected.address?.slice(0, 16)}...</div>
            </div>
          </div>
        )}

        {tab === "buy" ? (
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">Amount (SOL)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS_BUY.map(p => (
                <button key={p} onClick={() => setAmount(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${amount === p ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                  {p} SOL
                </button>
              ))}
            </div>
            <div className="relative">
              <input className="input-base" type="number" placeholder="Custom amount..." value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">≈ ${amtUsd}</span>
            </div>
            {activeW && (
              <div className="text-xs text-muted-foreground mt-1.5">Balance: {parseFloat(activeW.balance || "0").toFixed(4)} SOL</div>
            )}
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide block mb-2">Sell Percentage</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS_SELL.map(p => (
                <button key={p} onClick={() => setSellPct(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${sellPct === p ? "bg-red-500 text-white border-red-500" : "border-border text-muted-foreground hover:border-red-400/40 hover:text-foreground"}`}>
                  {p}%
                </button>
              ))}
            </div>
            <input className="input-base" type="number" placeholder="Custom % (1-100)..." value={sellPct} onChange={e => setSellPct(e.target.value)} min="1" max="100" />
          </div>
        )}

        <button
          onClick={executeTrade}
          disabled={loading || !activeW || !selected}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${tab === "buy" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {tab === "buy" ? "🚀 Execute Buy via Jupiter" : "💸 Execute Sell via Jupiter"}
        </button>
      </div>

      {result && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${result.success ? "border-emerald-400/20 bg-emerald-400/5" : "border-red-400/20 bg-red-400/5"}`}>
          {result.success ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
          <div>
            <div className={`font-semibold text-sm ${result.success ? "text-emerald-400" : "text-red-400"}`}>
              {result.success ? "Trade Executed Successfully!" : "Trade Failed"}
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
        <h3 className="text-sm font-semibold text-foreground mb-3">💡 How it works</h3>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Search for any Solana token or paste its contract address</li>
          <li>Choose how much SOL to spend (buy) or what % to sell</li>
          <li>Click Execute — swap goes through Jupiter DEX aggregator</li>
          <li>Best route across 20+ DEXes is automatically selected</li>
        </ol>
      </div>
    </div>
  );
}
