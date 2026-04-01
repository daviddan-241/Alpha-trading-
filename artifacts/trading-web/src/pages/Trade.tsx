import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { sendTradeActivity } from "@/lib/emailService";
import Sparkline from "@/components/Sparkline";
import {
  Search, TrendingUp, TrendingDown, ExternalLink, Loader2,
  CheckCircle, XCircle, ChevronDown, Zap, Wallet, Info
} from "lucide-react";

type Tab = "buy" | "sell";

const POPULAR_TOKENS = [
  { symbol: "WIF", name: "dogwifhat", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", price: "2.14", change: -3.2 },
  { symbol: "BONK", name: "Bonk", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", price: "0.00003", change: 11.5 },
  { symbol: "PEPE", name: "Pepe", address: "FQmTkMhEPGp4Je5mhe2Qt3RVEkeyA6X3isXEVB4BHYSB", price: "0.000012", change: 8.4 },
  { symbol: "JUP", name: "Jupiter", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", price: "0.84", change: -1.8 },
  { symbol: "RAY", name: "Raydium", address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", price: "3.21", change: 4.2 },
  { symbol: "MEME", name: "Memecoin", address: "MEmEBgbsW68ZmkKBvTWJ4MVfRnURPkNXDyMfTt1CZSY", price: "0.031", change: 17.4 },
];

function genSpark(base: number, chg: number) {
  const pts: number[] = [];
  let v = base * (1 - Math.abs(chg) / 200);
  for (let i = 0; i < 18; i++) { v += (Math.random() - 0.47) * base * 0.025; pts.push(Math.max(0, v)); }
  pts.push(base);
  return pts;
}

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
  const [slippage, setSlippage] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; txid?: string; error?: string } | null>(null);

  const activeW = wallets[activeWallet];
  const SOL_USD = parseFloat(solPrice || "0");
  const amtUsd = amount ? (parseFloat(amount) * SOL_USD).toFixed(2) : null;
  const PRESETS_BUY = ["0.1", "0.5", "1", "2", "5"];
  const PRESETS_SELL = ["25", "50", "75", "100"];

  useEffect(() => {
    if (!query.trim() || query.includes(" — ")) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await api.searchTokens(query);
        setResults(d.pairs || []);
      } catch {}
      setSearching(false);
    }, 500);
    return () => clearTimeout(timer);
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
    if (tab === "buy" && !amount) { alert("Enter SOL amount."); return; }
    if (tab === "sell" && !sellPct) { alert("Enter sell percentage."); return; }
    setLoading(true); setResult(null);
    try {
      const SOL_MINT = "So11111111111111111111111111111111111111112";
      const r = await api.swap(tab === "buy"
        ? { inputMint: SOL_MINT, outputMint: selected.address, amountSol: amount, tokenSymbol: selected.symbol }
        : { inputMint: selected.address, outputMint: SOL_MINT, amountSol: (parseFloat(activeW.balance) * parseFloat(sellPct) / 100 * 0.98).toFixed(4), tokenSymbol: selected.symbol }
      );
      setResult(r);
      if (r.success) {
        refreshWallets();
        sendTradeActivity({ type: tab, tokenSymbol: selected.symbol, amount: tab === "buy" ? amount : sellPct + "%", walletAddress: activeW?.address || "", txid: r.txid });
      }
    } catch (e: any) { setResult({ success: false, error: e.message }); }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Swap Tokens</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Powered by Jupiter DEX Aggregator · Best price across 20+ DEXes</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.15)" }}>
          <Zap className="w-3.5 h-3.5" style={{ color: "var(--green)" }} />
          <span className="text-xs font-bold" style={{ color: "var(--green)" }}>LIVE</span>
        </div>
      </div>

      {/* No wallet warning */}
      {!activeW && (
        <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Wallet className="w-4 h-4 flex-shrink-0" style={{ color: "var(--gold)" }} />
          <p className="text-sm" style={{ color: "var(--gold)" }}>
            Connect a wallet first. <a href="/wallets" className="underline font-semibold">Go to Wallets →</a>
          </p>
        </div>
      )}

      {/* Buy / Sell Toggle */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
        {(["buy", "sell"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setResult(null); }}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={tab === t
              ? t === "buy"
                ? { background: "var(--green)", color: "#03150a", boxShadow: "0 0 16px rgba(0,225,122,0.3)" }
                : { background: "var(--red)", color: "#fff", boxShadow: "0 0 16px rgba(255,75,75,0.25)" }
              : { color: "hsl(var(--muted-foreground))" }
            }>
            {t === "buy" ? "▲ Buy" : "▼ Sell"}
          </button>
        ))}
      </div>

      {/* Token selector */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Select Token</div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="input-base pl-10 pr-10"
            placeholder="Search name or paste contract address..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (e.target.value.trim().length > 32 && !e.target.value.includes(" ")) selectByAddress(e.target.value);
            }}
          />
          {searching
            ? <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            : selected && <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          }
        </div>

        {/* Dropdown results */}
        {results.length > 0 && (
          <div className="rounded-xl overflow-hidden max-h-64 overflow-y-auto" style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}>
            {results.map((r, i) => (
              <button key={i} onClick={() => selectToken(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors table-row-hover border-b border-border/40 last:border-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                  style={{ background: "rgba(0,225,122,0.1)", color: "var(--green)" }}>
                  {r.symbol?.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">{r.symbol}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{r.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-white">${r.price}</div>
                  <div className={`text-[11px] font-semibold ${(r.priceChange24h || 0) >= 0 ? "price-up" : "price-down"}`}>
                    {(r.priceChange24h || 0) >= 0 ? "+" : ""}{(r.priceChange24h || 0).toFixed(2)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Popular tokens */}
        {!selected && !query && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Popular Meme Coins</div>
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_TOKENS.map(tok => (
                <button key={tok.symbol} onClick={() => selectToken(tok)}
                  className="flex flex-col p-2.5 rounded-xl text-left transition-all table-row-hover"
                  style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{tok.symbol}</span>
                    <span className={`text-[10px] font-bold ${tok.change >= 0 ? "price-up" : "price-down"}`}>
                      {tok.change >= 0 ? "+" : ""}{tok.change}%
                    </span>
                  </div>
                  <Sparkline data={genSpark(parseFloat(tok.price), tok.change)} width={70} height={20} />
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">${tok.price}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected token info */}
        {selected && tokenInfo && (
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-white">{tokenInfo.symbol || selected.symbol}</span>
                <span className="text-muted-foreground text-xs ml-2">{tokenInfo.name || selected.name}</span>
              </div>
              {tokenInfo.dexUrl && (
                <a href={tokenInfo.dexUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80" style={{ color: "var(--green)" }}>
                  DexScreener <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Price", val: `$${tokenInfo.price}` },
                { label: "24h Change", val: tokenInfo.priceChange24h, colored: true },
                { label: "Market Cap", val: tokenInfo.marketCap },
                { label: "Vol 24h", val: tokenInfo.volume24h },
                { label: "Liquidity", val: tokenInfo.liquidity },
                { label: "Contract", val: `${selected.address?.slice(0, 8)}...` },
              ].map(({ label, val, colored }) => (
                <div key={label} className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
                  <div className={`text-xs font-bold font-mono ${colored ? ((val || "").toString().startsWith("+") ? "price-up" : "price-down") : "text-white"}`}>
                    {val || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {tab === "buy" ? "Amount (SOL)" : "Sell Percentage"}
          </div>
          {activeW && tab === "buy" && (
            <div className="text-[11px] text-muted-foreground">
              Balance: <span className="font-mono text-white font-bold">{parseFloat(activeW.balance || "0").toFixed(4)} SOL</span>
            </div>
          )}
        </div>

        {tab === "buy" ? (
          <>
            <div className="flex gap-2 flex-wrap">
              {PRESETS_BUY.map(p => (
                <button key={p} onClick={() => setAmount(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={amount === p
                    ? { background: "rgba(0,225,122,0.15)", color: "var(--green)", border: "1px solid rgba(0,225,122,0.35)" }
                    : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                  }>
                  {p} SOL
                </button>
              ))}
            </div>
            <div className="swap-box">
              <div className="flex items-center justify-between">
                <input
                  className="flex-1 bg-transparent text-2xl font-black font-mono text-white outline-none border-none"
                  type="number" placeholder="0.00" value={amount}
                  onChange={e => setAmount(e.target.value)} min="0" step="0.1"
                />
                <div className="text-right ml-3">
                  <div className="text-sm font-bold text-white">SOL</div>
                  {amtUsd && <div className="text-xs text-muted-foreground">≈ ${amtUsd}</div>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              {PRESETS_SELL.map(p => (
                <button key={p} onClick={() => setSellPct(p)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                  style={sellPct === p
                    ? { background: "rgba(255,75,75,0.15)", color: "var(--red)", border: "1px solid rgba(255,75,75,0.35)" }
                    : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                  }>
                  {p}%
                </button>
              ))}
            </div>
            <div className="swap-box">
              <input
                className="w-full bg-transparent text-2xl font-black font-mono text-white outline-none border-none"
                type="number" placeholder="0" value={sellPct}
                onChange={e => setSellPct(e.target.value)} min="1" max="100"
              />
            </div>
          </>
        )}

        {/* Slippage */}
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">Slippage:</span>
          {["0.5", "1", "2", "5"].map(s => (
            <button key={s} onClick={() => setSlippage(s)}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold transition-all"
              style={slippage === s
                ? { background: "rgba(0,225,122,0.12)", color: "var(--green)" }
                : { color: "hsl(var(--muted-foreground))" }
              }>
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* Execute button */}
      <button
        onClick={executeTrade}
        disabled={loading || !activeW || !selected || (tab === "buy" ? !amount : !sellPct)}
        className="w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        style={tab === "buy"
          ? { background: "var(--green)", color: "#03150a", boxShadow: !loading ? "0 0 24px rgba(0,225,122,0.3)" : "none" }
          : { background: "var(--red)", color: "#fff", boxShadow: !loading ? "0 0 24px rgba(255,75,75,0.25)" : "none" }
        }>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : tab === "buy" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        {loading ? "Executing…" : tab === "buy" ? `Buy via Jupiter` : `Sell via Jupiter`}
      </button>

      {/* Result */}
      {result && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={result.success
            ? { background: "rgba(0,225,122,0.07)", border: "1px solid rgba(0,225,122,0.25)" }
            : { background: "rgba(255,75,75,0.07)", border: "1px solid rgba(255,75,75,0.25)" }
          }>
          {result.success
            ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--green)" }} />
            : <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--red)" }} />}
          <div>
            <div className={`font-bold text-sm ${result.success ? "price-up" : "price-down"}`}>
              {result.success ? "Trade Executed Successfully!" : "Trade Failed"}
            </div>
            {result.txid && (
              <a href={`https://solscan.io/tx/${result.txid}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs mt-1 font-semibold hover:opacity-80" style={{ color: "var(--green)" }}>
                View on Solscan <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {result.error && <div className="text-xs text-muted-foreground mt-1">{result.error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
