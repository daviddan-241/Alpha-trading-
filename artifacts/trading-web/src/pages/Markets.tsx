import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, TrendingUp, TrendingDown, RefreshCw, ExternalLink, Star, X, ShoppingCart, DollarSign, BarChart2, Clock } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import { api } from "@/lib/api";

interface Coin {
  id: string; symbol: string; name: string; image: string;
  current_price: number; price_change_percentage_24h: number;
  market_cap: number; total_volume: number; market_cap_rank: number;
  high_24h: number; low_24h: number; circulating_supply: number;
}
interface CoinDetail {
  id: string; symbol: string; name: string;
  image: { large: string }; market_cap_rank: number;
  market_data: {
    current_price: { usd: number }; price_change_percentage_24h: number;
    price_change_percentage_7d: number; market_cap: { usd: number };
    total_volume: { usd: number }; high_24h: { usd: number };
    low_24h: { usd: number }; circulating_supply: number;
    total_supply: number; ath: { usd: number }; ath_change_percentage: { usd: number };
  };
  description: { en: string };
  links: { homepage: string[] };
}

function fMCap(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}
function fPrice(n: number) {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}
function genSpark(base: number, chg: number) {
  const pts: number[] = []; let v = base * (1 - Math.abs(chg) / 200);
  for (let i = 0; i < 20; i++) { v += (Math.random() - 0.47) * base * 0.02; pts.push(Math.max(0, v)); }
  pts.push(base); return pts;
}

const FALLBACK: Coin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", current_price: 67000, price_change_percentage_24h: 1.2, market_cap: 1.32e12, total_volume: 28e9, market_cap_rank: 1, high_24h: 68000, low_24h: 66000, circulating_supply: 19700000 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", current_price: 2134, price_change_percentage_24h: 5.76, market_cap: 256e9, total_volume: 12e9, market_cap_rank: 2, high_24h: 2200, low_24h: 2050, circulating_supply: 120e6 },
  { id: "solana", symbol: "SOL", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", current_price: 83.52, price_change_percentage_24h: 3.70, market_cap: 47.89e9, total_volume: 2.1e9, market_cap_rank: 7, high_24h: 86, low_24h: 81, circulating_supply: 573e6 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", current_price: 0.0923, price_change_percentage_24h: 2.93, market_cap: 14.21e9, total_volume: 800e6, market_cap_rank: 9, high_24h: 0.095, low_24h: 0.090, circulating_supply: 143e9 },
  { id: "pepe", symbol: "PEPE", name: "Pepe", image: "https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg", current_price: 0.0000119, price_change_percentage_24h: 8.4, market_cap: 5.1e9, total_volume: 820e6, market_cap_rank: 20, high_24h: 0.000013, low_24h: 0.000010, circulating_supply: 420e12 },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", image: "https://assets.coingecko.com/coins/images/11939/large/shiba.png", current_price: 0.0000098, price_change_percentage_24h: 3.2, market_cap: 5.8e9, total_volume: 340e6, market_cap_rank: 15, high_24h: 0.0000102, low_24h: 0.0000094, circulating_supply: 589e12 },
];

export default function Markets() {
  const [, navigate] = useLocation();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [filtered, setFiltered] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Coin | null>(null);
  const [detail, setDetail] = useState<CoinDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [chartPts, setChartPts] = useState<{ t: number; p: number }[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("watchlist") || "[]"); } catch { return []; }
  });
  const [tab, setTab] = useState<"all" | "watchlist" | "trending">("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<"rank" | "change" | "volume">("rank");

  const fetchCoins = useCallback(async () => {
    try {
      const data = await api.getMarkets();
      if (Array.isArray(data) && data.length) {
        setCoins(data);
        setLastUpdated(new Date());
      } else if (coins.length === 0) {
        setCoins(FALLBACK);
      }
    } catch {
      if (coins.length === 0) setCoins(FALLBACK);
    }
    setLoading(false);
  }, [coins.length]);

  useEffect(() => {
    fetchCoins();
    const iv = setInterval(fetchCoins, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let list = tab === "watchlist"
      ? coins.filter(c => watchlist.includes(c.id))
      : tab === "trending"
        ? [...coins].sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h)).slice(0, 20)
        : [...coins];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    }
    if (sortBy === "change") list.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    else if (sortBy === "volume") list.sort((a, b) => b.total_volume - a.total_volume);
    setFiltered(list);
  }, [coins, query, tab, watchlist, sortBy]);

  const openDetail = async (coin: Coin) => {
    setSelected(coin);
    setDetailLoading(true);
    setDetail(null);
    setChartPts([]);
    try {
      const [chartData, coinDetail] = await Promise.allSettled([
        api.getChart(coin.id),
        fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&market_data=true&community_data=false&developer_data=false`, { signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.json() : null),
      ]);
      if (chartData.status === "fulfilled" && chartData.value.prices?.length) setChartPts(chartData.value.prices);
      if (coinDetail.status === "fulfilled" && coinDetail.value) setDetail(coinDetail.value);
    } catch {}
    setDetailLoading(false);
  };

  const toggleWatchlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("watchlist", JSON.stringify(next));
      return next;
    });
  };

  const goTrade = (coin: Coin, type: "buy" | "sell", e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem("tradeToken", JSON.stringify({ symbol: coin.symbol, name: coin.name, price: coin.current_price }));
    localStorage.setItem("tradeType", type);
    navigate("/trade");
  };

  const TABS = [
    { id: "all", label: "All Markets" },
    { id: "trending", label: "🔥 Trending" },
    { id: "watchlist", label: "⭐ Watchlist" },
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Markets</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span className="live-dot inline-block" />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Live cryptocurrency prices"}
          </p>
        </div>
        <button onClick={fetchCoins} disabled={loading} className="btn-secondary flex items-center gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="input-base pl-9 pr-9" placeholder="Search by name or symbol..." value={query} onChange={e => setQuery(e.target.value)} />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={tab === t.id ? { background: "hsl(var(--background))", color: "white" } : { color: "hsl(var(--muted-foreground))" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
          {[["rank", "#"], ["change", "24h%"], ["volume", "Vol"]].map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={sortBy === key ? { background: "rgba(0,225,122,0.15)", color: "var(--green)" } : { color: "hsl(var(--muted-foreground))" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading && coins.length === 0 ? (
        <div className="space-y-2 p-4">
          {[...Array(8)].map((_, i) => <div key={i} className="shimmer h-12 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          {/* Header row */}
          <div className="grid items-center px-4 py-2.5 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            style={{ gridTemplateColumns: "32px 1fr 100px 72px 80px 110px 160px", background: "rgba(255,255,255,0.02)" }}>
            <div>#</div>
            <div>Asset</div>
            <div className="text-right">Price</div>
            <div className="text-right">24h</div>
            <div className="text-right hidden lg:block">7d Chart</div>
            <div className="text-right hidden md:block">Mkt Cap</div>
            <div className="text-center">Trade</div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No coins found</div>
          ) : (
            filtered.map((coin) => {
              const isUp = coin.price_change_percentage_24h >= 0;
              const inWatchlist = watchlist.includes(coin.id);
              return (
                <div key={coin.id} onClick={() => openDetail(coin)}
                  className="grid items-center px-4 py-3 table-row-hover cursor-pointer border-b border-border/40 last:border-0 group"
                  style={{ gridTemplateColumns: "32px 1fr 100px 72px 80px 110px 160px" }}>
                  <div className="text-[11px] text-muted-foreground">{coin.market_cap_rank}</div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={coin.image} alt={coin.symbol} className="w-7 h-7 rounded-full flex-shrink-0" loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white group-hover:text-[var(--green)] transition-colors">{coin.symbol.toUpperCase()}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{coin.name}</div>
                    </div>
                    <button onClick={e => toggleWatchlist(coin.id, e)}
                      className={`ml-1 flex-shrink-0 transition-colors ${inWatchlist ? "text-yellow-400" : "text-muted-foreground/20 hover:text-muted-foreground"}`}>
                      <Star className="w-3 h-3" fill={inWatchlist ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="text-right text-sm font-bold font-mono text-white">{fPrice(coin.current_price)}</div>
                  <div className={`text-right text-xs font-bold ${isUp ? "price-up" : "price-down"}`}>
                    {isUp ? "+" : ""}{coin.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                  <div className="hidden lg:flex justify-end">
                    <Sparkline data={genSpark(coin.current_price, coin.price_change_percentage_24h)} width={70} height={24} />
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground hidden md:block">{fMCap(coin.market_cap)}</div>
                  {/* BUY / SELL buttons */}
                  <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={e => goTrade(coin, "buy", e)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: "rgba(0,225,122,0.12)", color: "var(--green)", border: "1px solid rgba(0,225,122,0.25)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,225,122,0.22)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,225,122,0.12)"; }}>
                      Buy
                    </button>
                    <button onClick={e => goTrade(coin, "sell", e)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: "rgba(255,75,75,0.1)", color: "var(--red)", border: "1px solid rgba(255,75,75,0.22)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,75,75,0.2)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,75,75,0.1)"; }}>
                      Sell
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Coin detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => { setSelected(null); setDetail(null); }}>
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{ background: "hsl(220 25% 8%)", border: "1px solid hsl(var(--border))" }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 flex items-center gap-3 px-5 py-4 border-b border-border"
              style={{ background: "hsl(220 25% 8%)" }}>
              <img src={selected.image} alt={selected.symbol} className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-lg">{selected.symbol.toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground">#{selected.market_cap_rank}</span>
                  <span className={`badge-${selected.price_change_percentage_24h >= 0 ? "green" : "red"}`}>
                    {selected.price_change_percentage_24h >= 0 ? "+" : ""}{selected.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{selected.name}</div>
              </div>
              <div className="text-right mr-2">
                <div className="font-black text-xl text-white font-mono">{fPrice(selected.current_price)}</div>
              </div>
              <button onClick={() => { setSelected(null); setDetail(null); }}
                className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 7-day chart */}
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">7-Day Price Chart</span>
                  <span className={`text-xs font-bold ${selected.price_change_percentage_24h >= 0 ? "price-up" : "price-down"}`}>
                    {selected.price_change_percentage_24h >= 0 ? "+" : ""}{selected.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </div>
                {chartPts.length > 1 ? (() => {
                  const W = 400, H = 80;
                  const ps = chartPts.map(c => c.p);
                  const mn = Math.min(...ps), mx = Math.max(...ps);
                  const range = mx - mn || 1;
                  const pts = chartPts.map((c, i) => {
                    const x = (i / (chartPts.length - 1)) * W;
                    const y = H - ((c.p - mn) / range) * (H - 8) - 4;
                    return `${x},${y}`;
                  }).join(" ");
                  const isUp = chartPts[chartPts.length - 1].p >= chartPts[0].p;
                  const col = isUp ? "#00e17a" : "#ff4b4b";
                  return (
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
                      <defs>
                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={col} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={col} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#cg)" />
                      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  );
                })() : (
                  <Sparkline data={genSpark(selected.current_price, selected.price_change_percentage_24h)} width={400} height={80} />
                )}
              </div>

              {/* BUY / SELL CTA */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { goTrade(selected, "buy", { stopPropagation: () => {} } as any); setSelected(null); }}
                  className="py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: "var(--green)", color: "#03150a", boxShadow: "0 0 20px rgba(0,225,122,0.3)" }}>
                  <TrendingUp className="w-4 h-4" /> Buy {selected.symbol.toUpperCase()}
                </button>
                <button onClick={() => { goTrade(selected, "sell", { stopPropagation: () => {} } as any); setSelected(null); }}
                  className="py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: "var(--red)", color: "#fff", boxShadow: "0 0 20px rgba(255,75,75,0.25)" }}>
                  <TrendingDown className="w-4 h-4" /> Sell {selected.symbol.toUpperCase()}
                </button>
              </div>

              {/* Stats */}
              {detailLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-12 rounded-xl" />)}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Market Cap", icon: BarChart2, value: fMCap(detail?.market_data.market_cap.usd || selected.market_cap) },
                      { label: "24h Volume", icon: BarChart2, value: fMCap(detail?.market_data.total_volume.usd || selected.total_volume) },
                      { label: "24h High", icon: TrendingUp, value: fPrice(detail?.market_data.high_24h.usd || selected.high_24h) },
                      { label: "24h Low", icon: TrendingDown, value: fPrice(detail?.market_data.low_24h.usd || selected.low_24h) },
                      { label: "7d Change", icon: Clock, value: detail ? `${detail.market_data.price_change_percentage_7d >= 0 ? "+" : ""}${detail.market_data.price_change_percentage_7d?.toFixed(2)}%` : "—" },
                      { label: "All-Time High", icon: TrendingUp, value: detail ? fPrice(detail.market_data.ath.usd) : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                        <div className="text-sm font-bold text-white font-mono">{value}</div>
                      </div>
                    ))}
                  </div>

                  {detail?.description?.en && (
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">About</div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                        {detail.description.en.replace(/<[^>]*>/g, "").substring(0, 320)}…
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {detail?.links?.homepage?.[0] && (
                      <a href={detail.links.homepage[0]} target="_blank" rel="noreferrer"
                        className="btn-secondary flex items-center gap-1.5 text-xs flex-1 justify-center">
                        <ExternalLink className="w-3.5 h-3.5" /> Website
                      </a>
                    )}
                    <a href={`https://www.coingecko.com/en/coins/${selected.id}`} target="_blank" rel="noreferrer"
                      className="btn-secondary flex items-center gap-1.5 text-xs flex-1 justify-center">
                      <ExternalLink className="w-3.5 h-3.5" /> CoinGecko
                    </a>
                    <a href={`https://dexscreener.com/solana`} target="_blank" rel="noreferrer"
                      className="btn-secondary flex items-center gap-1.5 text-xs flex-1 justify-center">
                      <ExternalLink className="w-3.5 h-3.5" /> DexScreener
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
