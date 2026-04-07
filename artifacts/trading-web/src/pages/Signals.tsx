import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/contexts/AppContext";
import { TrendingUp, TrendingDown, Zap, RefreshCw, ExternalLink, ShoppingCart, Search, Filter } from "lucide-react";

const CHAIN_COLOR: Record<string, string> = {
  solana:    "#9945FF",
  ethereum:  "#627EEA",
  bsc:       "#F0B90B",
  polygon:   "#8247E5",
  avalanche: "#E84142",
  arbitrum:  "#12AAFF",
  optimism:  "#FF0420",
  base:      "#0052FF",
};

const CHAIN_ICON: Record<string, string> = {
  solana: "◎", ethereum: "Ξ", bsc: "⬡", polygon: "♦",
  avalanche: "▲", arbitrum: "Ⓐ", optimism: "⊙", base: "◈",
};

function fmt(n: number): string {
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number) {
  const pos = n >= 0;
  return (
    <span className="font-bold text-xs" style={{ color: pos ? "var(--green)" : "var(--red)" }}>
      {pos ? "+" : ""}{n?.toFixed(1)}%
    </span>
  );
}

export default function Signals() {
  const { wallets, activeWallet } = useApp();
  const [pairs, setPairs]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [sort, setSort]         = useState<"volume" | "change" | "mcap" | "txns">("volume");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [buying, setBuying]     = useState<string | null>(null);
  const [buyMsg, setBuyMsg]     = useState<Record<string, string>>({});

  const activeW = wallets[activeWallet];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getTrending();
      setPairs(d.pairs || []);
      setLastUpdate(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = pairs
    .filter(p => filter === "all" || p.chain === filter || p.chain?.startsWith(filter))
    .filter(p => !search || p.symbol?.toLowerCase().includes(search.toLowerCase()) || p.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "volume")  return (b.volume24h  || 0) - (a.volume24h  || 0);
      if (sort === "change")  return (b.priceChange24h || 0) - (a.priceChange24h || 0);
      if (sort === "mcap")    return (b.marketCap   || 0) - (a.marketCap   || 0);
      if (sort === "txns")    return (b.txns24h     || 0) - (a.txns24h     || 0);
      return 0;
    });

  const chains = ["all", ...Array.from(new Set(pairs.map(p => p.chain).filter(Boolean)))];

  const snipe = async (pair: any) => {
    if (!activeW?.privateKey) {
      setBuyMsg(m => ({ ...m, [pair.address]: "⚠️ No active wallet" }));
      return;
    }
    setBuying(pair.address);
    setBuyMsg(m => ({ ...m, [pair.address]: "⏳ Submitting..." }));
    try {
      const chain = pair.chain?.includes("solana") ? "sol" : "eth";
      const result = await api.swap({
        privateKey: activeW.privateKey,
        inputMint: "So11111111111111111111111111111111111111112",
        outputMint: pair.address,
        amountSol: "0.1",
        slippage: "2",
        tokenSymbol: pair.symbol,
        chain,
      });
      if (result.success || result.txid) {
        setBuyMsg(m => ({ ...m, [pair.address]: "✅ Bought! tx: " + (result.txid?.slice(0, 12) || "...") }));
      } else {
        setBuyMsg(m => ({ ...m, [pair.address]: "❌ " + (result.error || "Failed") }));
      }
    } catch (e: any) {
      setBuyMsg(m => ({ ...m, [pair.address]: "❌ " + (e.message || "Error") }));
    }
    setBuying(null);
    setTimeout(() => setBuyMsg(m => { const n = { ...m }; delete n[pair.address]; return n; }), 5000);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Zap className="w-6 h-6" style={{ color: "var(--green)" }} />
            Live Signal Feed
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time trending tokens across all chains — DexScreener data, updated every 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[11px] text-muted-foreground">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={load} disabled={loading}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-white hover:border-primary/40 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Trending Tokens",  value: pairs.length.toString(),                              color: "var(--green)" },
          { label: "Total 24h Volume", value: fmt(pairs.reduce((s, p) => s + (p.volume24h || 0), 0)), color: "#627EEA" },
          { label: "Gainers (24h)",    value: pairs.filter(p => (p.priceChange24h || 0) > 0).length + " / " + pairs.length, color: "var(--gold)" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div className="text-lg font-black font-mono mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="input-base pl-8 h-9 text-xs" placeholder="Search tokens..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {chains.slice(0, 7).map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className="px-2 py-1 rounded-lg text-[11px] font-bold border transition-all"
              style={filter === c
                ? { background: (CHAIN_COLOR[c] || "var(--green)") + "22", borderColor: CHAIN_COLOR[c] || "var(--green)", color: CHAIN_COLOR[c] || "var(--green)" }
                : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
              {c === "all" ? "All" : (CHAIN_ICON[c] || "") + " " + c.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>

        <select className="input-base h-9 text-xs w-auto px-2 bg-card" value={sort}
          onChange={e => setSort(e.target.value as any)}>
          <option value="volume">Sort: Volume</option>
          <option value="change">Sort: Gainers</option>
          <option value="mcap">Sort: Market Cap</option>
          <option value="txns">Sort: Transactions</option>
        </select>
      </div>

      {/* Token list */}
      {loading && !pairs.length ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Fetching live market data…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No tokens match your filter</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pair, i) => {
            const chainColor = CHAIN_COLOR[pair.chain] || "#ffffff";
            const chainIcon  = CHAIN_ICON[pair.chain]  || "●";
            const chg = pair.priceChange24h || 0;
            const chg1h = pair.priceChange1h || 0;
            const msg = buyMsg[pair.address];

            return (
              <div key={pair.address + i}
                className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-7 text-center text-[11px] font-bold text-muted-foreground/50 flex-shrink-0">
                    {i + 1}
                  </div>

                  {/* Token icon */}
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-base font-black"
                    style={{ background: chainColor + "18", border: `1px solid ${chainColor}30` }}>
                    {pair.imageUrl ? (
                      <img src={pair.imageUrl} alt={pair.symbol}
                        className="w-full h-full object-cover rounded-xl"
                        onError={e => {
                          const el = e.currentTarget as HTMLImageElement;
                          el.style.display = "none";
                          (el.nextSibling as HTMLElement).style.display = "flex";
                        }} />
                    ) : null}
                    <span style={{ color: chainColor, display: pair.imageUrl ? "none" : "flex" }}>
                      {pair.symbol?.slice(0, 2) || "??"}
                    </span>
                  </div>

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-white">{pair.symbol}</span>
                      {pair.isBoosted && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.3)" }}>
                          🔥 BOOSTED
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{ background: chainColor + "15", color: chainColor }}>
                        {chainIcon} {pair.chain?.slice(0, 4)?.toUpperCase() || "SOL"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{pair.name}</div>
                  </div>

                  {/* Price + changes */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="font-bold text-sm text-white font-mono">
                      ${parseFloat(pair.price || "0") > 0.001
                        ? parseFloat(pair.price || "0").toFixed(4)
                        : parseFloat(pair.price || "0").toExponential(2)}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[10px] text-muted-foreground">1h</span>
                      {pct(chg1h)}
                      <span className="text-[10px] text-muted-foreground">24h</span>
                      {pct(chg)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0 hidden md:block">
                    <div className="text-xs font-bold text-white">{fmt(pair.volume24h || 0)}</div>
                    <div className="text-[10px] text-muted-foreground">Vol 24h</div>
                    {pair.marketCap > 0 && (
                      <>
                        <div className="text-xs font-bold text-muted-foreground">{fmt(pair.marketCap)}</div>
                        <div className="text-[10px] text-muted-foreground">MCap</div>
                      </>
                    )}
                  </div>

                  {/* Txns */}
                  <div className="text-right flex-shrink-0 hidden lg:block">
                    <div className="text-xs font-bold text-white">{(pair.txns24h || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Txns</div>
                    <div className="text-xs font-bold text-muted-foreground">{fmt(pair.liquidity || 0)}</div>
                    <div className="text-[10px] text-muted-foreground">Liq</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a href={pair.dexUrl} target="_blank" rel="noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => snipe(pair)}
                      disabled={buying === pair.address || !pair.address}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                      style={{ background: "rgba(0,225,122,0.12)", border: "1px solid rgba(0,225,122,0.3)", color: "var(--green)" }}>
                      <ShoppingCart className="w-3 h-3" />
                      {buying === pair.address ? "…" : "Buy"}
                    </button>
                  </div>
                </div>

                {/* Buy result message */}
                {msg && (
                  <div className="mt-2 text-[11px] px-2 py-1 rounded"
                    style={{ background: msg.includes("✅") ? "rgba(0,225,122,0.08)" : "rgba(255,75,75,0.08)",
                      color: msg.includes("✅") ? "var(--green)" : "var(--red)" }}>
                    {msg}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-[11px] text-muted-foreground/50 text-center pb-2">
        Data from DexScreener · Not financial advice · Always DYOR · One-click buys use 0.1 SOL/ETH by default
      </div>
    </div>
  );
}
