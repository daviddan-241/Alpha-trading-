import { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, RefreshCw, ExternalLink, Star, X } from "lucide-react";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  market_cap_rank: number;
  high_24h: number;
  low_24h: number;
  circulating_supply: number;
}

interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: { large: string };
  market_cap_rank: number;
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    circulating_supply: number;
    total_supply: number;
    ath: { usd: number };
    ath_change_percentage: { usd: number };
  };
  description: { en: string };
  links: { homepage: string[] };
}

function formatMarketCap(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function formatPrice(n: number) {
  if (n >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

export default function Markets() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [filtered, setFiltered] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Coin | null>(null);
  const [detail, setDetail] = useState<CoinDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("watchlist") || "[]"); } catch { return []; }
  });
  const [tab, setTab] = useState<"all" | "watchlist">("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCoins = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h"
      );
      if (!res.ok) throw new Error("rate limited");
      const data = await res.json();
      setCoins(data);
      setLastUpdated(new Date());
    } catch {
      if (coins.length === 0) {
        const fallback: Coin[] = [
          { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", current_price: 67000, price_change_percentage_24h: 1.2, market_cap: 1.32e12, total_volume: 28e9, market_cap_rank: 1, high_24h: 68000, low_24h: 66000, circulating_supply: 19700000 },
          { id: "ethereum", symbol: "ETH", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", current_price: 2134, price_change_percentage_24h: 5.76, market_cap: 256e9, total_volume: 12e9, market_cap_rank: 2, high_24h: 2200, low_24h: 2050, circulating_supply: 120e6 },
          { id: "tether", symbol: "USDT", name: "Tether", image: "https://assets.coingecko.com/coins/images/325/large/Tether.png", current_price: 1.00, price_change_percentage_24h: 0.06, market_cap: 184e9, total_volume: 45e9, market_cap_rank: 3, high_24h: 1.001, low_24h: 0.999, circulating_supply: 184e9 },
          { id: "solana", symbol: "SOL", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", current_price: 83.52, price_change_percentage_24h: 3.70, market_cap: 47.89e9, total_volume: 2.1e9, market_cap_rank: 7, high_24h: 86, low_24h: 81, circulating_supply: 573e6 },
          { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", current_price: 0.0923, price_change_percentage_24h: 2.93, market_cap: 14.21e9, total_volume: 800e6, market_cap_rank: 9, high_24h: 0.095, low_24h: 0.090, circulating_supply: 143e9 },
        ];
        setCoins(fallback);
      }
    }
    setLoading(false);
  }, [coins.length]);

  useEffect(() => {
    fetchCoins();
    const interval = setInterval(fetchCoins, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let list = tab === "watchlist" ? coins.filter(c => watchlist.includes(c.id)) : coins;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    }
    setFiltered(list);
  }, [coins, query, tab, watchlist]);

  const openDetail = async (coin: Coin) => {
    setSelected(coin);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false`);
      if (res.ok) {
        const d = await res.json();
        setDetail(d);
      }
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

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Markets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Live cryptocurrency prices"}
          </p>
        </div>
        <button onClick={fetchCoins} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="input-base pl-9"
            placeholder="Search coins..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          <button onClick={() => setTab("all")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "all" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>All</button>
          <button onClick={() => setTab("watchlist")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${tab === "watchlist" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Star className="w-3.5 h-3.5" />Watchlist
          </button>
        </div>
      </div>

      {loading && coins.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
          <p>Loading live market data...</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs text-muted-foreground font-medium px-4 py-2.5 border-b border-border bg-secondary/30">
            <div className="w-8 text-center">#</div>
            <div className="ml-2">Name</div>
            <div className="w-28 text-right">Price</div>
            <div className="w-20 text-right">24h %</div>
            <div className="w-28 text-right hidden sm:block">Market Cap</div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No coins found</div>
          ) : (
            filtered.map((coin, idx) => {
              const isUp = coin.price_change_percentage_24h >= 0;
              const inWatchlist = watchlist.includes(coin.id);
              return (
                <div
                  key={coin.id}
                  onClick={() => openDetail(coin)}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-3 hover:bg-secondary/40 cursor-pointer transition-colors border-b border-border/50 last:border-0"
                >
                  <div className="w-8 text-center text-xs text-muted-foreground">{coin.market_cap_rank}</div>
                  <div className="flex items-center gap-2.5 ml-2 min-w-0">
                    <img src={coin.image} alt={coin.symbol} className="w-7 h-7 rounded-full flex-shrink-0" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground">{coin.symbol.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground truncate">{coin.name}</div>
                    </div>
                    <button
                      onClick={e => toggleWatchlist(coin.id, e)}
                      className={`ml-1 transition-colors ${inWatchlist ? "text-yellow-400" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
                    >
                      <Star className="w-3.5 h-3.5" fill={inWatchlist ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="w-28 text-right text-sm font-semibold text-foreground">{formatPrice(coin.current_price)}</div>
                  <div className={`w-20 text-right text-sm font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                    {isUp ? "+" : ""}{coin.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                  <div className="w-28 text-right text-xs text-muted-foreground hidden sm:block">{formatMarketCap(coin.market_cap)}</div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
              <img src={selected.image} alt={selected.symbol} className="w-9 h-9 rounded-full" />
              <div>
                <div className="font-bold text-foreground flex items-center gap-2">
                  {selected.symbol.toUpperCase()}
                  <span className="text-xs text-muted-foreground font-normal">#{selected.market_cap_rank}</span>
                </div>
                <div className="text-xs text-muted-foreground">{selected.name}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-bold text-lg text-foreground">{formatPrice(selected.current_price)}</div>
                <div className={`text-sm font-semibold ${selected.price_change_percentage_24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {selected.price_change_percentage_24h >= 0 ? "+" : ""}{selected.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {detailLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading details...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Market Cap", value: formatMarketCap(detail?.market_data.market_cap.usd || selected.market_cap) },
                      { label: "24h Volume", value: formatMarketCap(detail?.market_data.total_volume.usd || selected.total_volume) },
                      { label: "24h High", value: formatPrice(detail?.market_data.high_24h.usd || selected.high_24h) },
                      { label: "24h Low", value: formatPrice(detail?.market_data.low_24h.usd || selected.low_24h) },
                      { label: "7d Change", value: detail ? `${detail.market_data.price_change_percentage_7d >= 0 ? "+" : ""}${detail.market_data.price_change_percentage_7d?.toFixed(2)}%` : "—" },
                      { label: "All-Time High", value: detail ? formatPrice(detail.market_data.ath.usd) : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-secondary/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">{label}</div>
                        <div className="text-sm font-semibold text-foreground">{value}</div>
                      </div>
                    ))}
                  </div>

                  {detail?.description?.en && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">About</div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                        {detail.description.en.replace(/<[^>]*>/g, "").substring(0, 300)}...
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {detail?.links?.homepage?.[0] && (
                      <a href={detail.links.homepage[0]} target="_blank" rel="noreferrer"
                        className="btn-secondary flex items-center gap-2 text-xs flex-1 justify-center">
                        <ExternalLink className="w-3.5 h-3.5" /> Website
                      </a>
                    )}
                    <a href={`https://www.coingecko.com/en/coins/${selected.id}`} target="_blank" rel="noreferrer"
                      className="btn-secondary flex items-center gap-2 text-xs flex-1 justify-center">
                      <ExternalLink className="w-3.5 h-3.5" /> CoinGecko
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
