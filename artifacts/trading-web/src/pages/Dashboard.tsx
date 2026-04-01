import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import Sparkline from "@/components/Sparkline";
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, Copy, Target,
  Zap, ArrowUpRight, LineChart, RefreshCw, Flame, Star
} from "lucide-react";

interface MarketCoin {
  id: string; symbol: string; name: string; image: string;
  current_price: number; price_change_percentage_24h: number;
  market_cap: number; market_cap_rank: number; total_volume: number;
}
function formatPrice(n: number) {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}
function formatMCap(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}
function genSparkline(base: number, change: number) {
  const pts: number[] = []; let v = base * (1 - Math.abs(change) / 200);
  for (let i = 0; i < 20; i++) { v += (Math.random() - 0.47) * base * 0.025; pts.push(Math.max(0, v)); }
  pts.push(base); return pts;
}
const MEME_COINS = [
  { sym: "PEPE", name: "Pepe", price: 0.0000119, change: 8.4, mcap: 5.1e9 },
  { sym: "WIF", name: "dogwifhat", price: 2.14, change: -3.2, mcap: 2.1e9 },
  { sym: "BONK", name: "Bonk", price: 0.0000298, change: 11.5, mcap: 1.9e9 },
  { sym: "MOODENG", name: "Moodeng", price: 0.0481, change: 22.8, mcap: 480e6 },
  { sym: "POPCAT", name: "Popcat", price: 0.316, change: -6.1, mcap: 310e6 },
  { sym: "FLOKI", name: "Floki", price: 0.000136, change: 4.7, mcap: 1.3e9 },
];

const HERO_IMAGE = "https://i.ibb.co/sJpL7YLc/IMG-3063.png";

export default function Dashboard() {
  const { solPrice, wallets, activeWallet, profile, refreshProfile } = useApp();
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [topCoins, setTopCoins] = useState<MarketCoin[]>([]);
  const [coinsLoading, setCoinsLoading] = useState(true);
  const [solChange, setSolChange] = useState(2.41);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    refreshProfile();
    api.getTrades().then(d => setRecentTrades(d.history?.slice(0, 5) || [])).catch(() => {});
    fetchTopCoins();
  }, []);

  const fetchTopCoins = async () => {
    setCoinsLoading(true);
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false", { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const data = await res.json();
        setTopCoins(data);
        const sol = data.find((c: MarketCoin) => c.id === "solana");
        if (sol) setSolChange(sol.price_change_percentage_24h);
      }
    } catch {}
    setCoinsLoading(false);
  };

  const activeW = wallets[activeWallet];
  const solNum = parseFloat(solPrice || "0");
  const solUsd = activeW ? (parseFloat(activeW.balance || "0") * solNum).toFixed(2) : "0.00";
  const pnl = profile?.totalPnl ? parseFloat(profile.totalPnl) : 0;

  const quickLinks = [
    { href: "/markets", label: "Markets", desc: "Live prices", icon: LineChart, color: "var(--blue)", bg: "var(--blue-dim)" },
    { href: "/trade", label: "Buy / Sell", desc: "Jupiter DEX", icon: TrendingUp, color: "var(--green)", bg: "var(--green-dim)" },
    { href: "/sniper", label: "Sniper", desc: "Auto-buy new tokens", icon: Target, color: "var(--purple)", bg: "var(--purple-dim)" },
    { href: "/copy", label: "Copy Trade", desc: "Mirror top wallets", icon: Copy, color: "var(--gold)", bg: "var(--gold-dim)" },
  ];

  return (
    <div className="space-y-6">
      {/* ── HERO IMAGE BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: "200px" }}>
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Alpha Trading"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.45) saturate(1.2)", transition: "opacity 0.4s", opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,225,122,0.15) 50%, rgba(168,85,247,0.1) 100%)" }} />
        </div>
        {/* Shimmer while loading */}
        {!imgLoaded && <div className="absolute inset-0 shimmer" />}

        {/* Hero content */}
        <div className="relative px-6 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="live-dot" />
              <span className="text-[11px] font-bold text-white/70 tracking-widest uppercase">Live · Solana Mainnet</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
              Alpha Trading
            </h1>
            <p className="text-sm text-white/60 mt-1">Professional Solana DEX · Meme Coin Launchpad · Copy Trading</p>
            <div className="flex items-center gap-5 mt-4">
              <div>
                <div className="text-[10px] text-white/50 uppercase tracking-wider">SOL Price</div>
                <div className="text-2xl font-black font-mono text-white">${solNum.toFixed(2)}</div>
                <div className={`text-xs font-semibold mt-0.5 ${solChange >= 0 ? "price-up" : "price-down"}`}>
                  {solChange >= 0 ? "▲" : "▼"} {Math.abs(solChange).toFixed(2)}% (24h)
                </div>
              </div>
              <div className="hidden sm:block">
                <Sparkline data={genSparkline(solNum, solChange)} width={120} height={40} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/trade">
              <button className="btn-primary">Trade Now →</button>
            </Link>
            <Link href="/wallets">
              <button className="btn-secondary">My Wallet</button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Balance", icon: Wallet, accent: "var(--green)",
            value: `${parseFloat(activeW?.balance || "0").toFixed(3)} SOL`,
            sub: `≈ $${solUsd}`, valColor: "text-white"
          },
          {
            label: "P&L", icon: pnl >= 0 ? TrendingUp : TrendingDown,
            accent: pnl >= 0 ? "var(--green)" : "var(--red)",
            value: `${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} SOL`,
            sub: `${profile?.trades || 0} trades`, valColor: pnl >= 0 ? "price-up" : "price-down"
          },
          {
            label: "Volume", icon: BarChart3, accent: "var(--purple)",
            value: `${parseFloat(profile?.volume || "0").toFixed(2)} SOL`,
            sub: `Win Rate: ${profile?.winRate || 0}%`, valColor: "text-white"
          },
          {
            label: "Cashback", icon: Star, accent: "var(--gold)",
            value: `${parseFloat(profile?.cashback || "0").toFixed(5)}`,
            sub: `${profile?.referrals || 0} referrals`, valColor: "text-[var(--gold)]"
          },
        ].map(({ label, icon: Icon, accent, value, sub, valColor }) => (
          <div key={label} className="stat-card" style={{ borderLeft: `2px solid ${accent}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{label}</span>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className={`text-lg font-black font-mono ${valColor}`}>{value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── NO WALLET CTA ── */}
      {wallets.length === 0 && (
        <div className="rounded-2xl p-6 text-center" style={{ border: "1px dashed rgba(0,225,122,0.3)", background: "rgba(0,225,122,0.04)" }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(0,225,122,0.1)", border: "1px solid rgba(0,225,122,0.25)" }}>
            <Wallet className="w-6 h-6" style={{ color: "var(--green)" }} />
          </div>
          <h3 className="font-bold text-white mb-1">No Wallet Connected</h3>
          <p className="text-sm text-muted-foreground mb-4">Generate or import a Solana wallet to start trading on Jupiter DEX</p>
          <Link href="/wallets"><button className="btn-primary">Set Up Wallet →</button></Link>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div>
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map(({ href, label, desc, icon: Icon, color, bg }) => (
            <Link key={href} href={href}>
              <div className="stat-card cursor-pointer group hover:border-white/8 transition-all" style={{ borderTop: `2px solid ${color}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="font-bold text-sm text-white">{label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
                <ArrowUpRight className="w-3.5 h-3.5 mt-2 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── HOT MEME COINS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: "var(--red)" }} />
            <span className="text-sm font-bold text-white">Hot Meme Coins</span>
          </div>
          <Link href="/markets">
            <span className="text-xs font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: "var(--green)" }}>
              See all <ArrowUpRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MEME_COINS.map((c) => (
            <Link key={c.sym} href="/trade">
              <div className="stat-card cursor-pointer group hover:border-white/8 transition-all p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-bold text-sm text-white">{c.sym}</div>
                    <div className="text-[10px] text-muted-foreground">{c.name}</div>
                  </div>
                  <span className={`badge-${c.change >= 0 ? "green" : "red"}`}>
                    {c.change >= 0 ? "+" : ""}{c.change}%
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div className="font-mono text-xs text-white font-bold">{formatPrice(c.price)}</div>
                  <Sparkline data={genSparkline(c.price, c.change)} width={60} height={24} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{formatMCap(c.mcap)} mcap</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── TOP MARKETS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Top Markets</div>
          <button onClick={fetchTopCoins} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${coinsLoading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <div className="grid text-[11px] text-muted-foreground font-bold uppercase tracking-wider px-4 py-2.5 border-b border-border"
            style={{ gridTemplateColumns: "28px 1fr 90px 64px 90px 130px", background: "rgba(255,255,255,0.02)" }}>
            <div>#</div><div className="ml-2">Asset</div>
            <div className="text-right">Price</div>
            <div className="text-right">24h</div>
            <div className="text-right hidden md:block">Mkt Cap</div>
            <div className="text-center">Trade</div>
          </div>
          {coinsLoading ? (
            <div className="space-y-2 p-4">{[...Array(5)].map((_, i) => <div key={i} className="shimmer h-9 w-full rounded-xl" />)}</div>
          ) : topCoins.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Market data unavailable</div>
          ) : (
            topCoins.slice(0, 10).map((coin) => {
              const isUp = coin.price_change_percentage_24h >= 0;
              const goTrade = (type: "buy" | "sell", e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                localStorage.setItem("tradeToken", JSON.stringify({ symbol: coin.symbol, name: coin.name, price: coin.current_price }));
                localStorage.setItem("tradeType", type);
              };
              return (
                <div key={coin.id} className="grid items-center px-4 py-3 table-row-hover border-b border-border/40 last:border-0 group"
                  style={{ gridTemplateColumns: "28px 1fr 90px 64px 90px 130px" }}>
                  <div className="text-[11px] text-muted-foreground">{coin.market_cap_rank}</div>
                  <Link href="/markets">
                    <div className="flex items-center gap-2 ml-2 cursor-pointer">
                      <img src={coin.image} alt={coin.symbol} className="w-6 h-6 rounded-full" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-[var(--green)] transition-colors">{coin.symbol.toUpperCase()}</div>
                        <div className="text-[10px] text-muted-foreground">{coin.name}</div>
                      </div>
                    </div>
                  </Link>
                  <div className="text-right text-sm font-bold font-mono text-white">{formatPrice(coin.current_price)}</div>
                  <div className={`text-right text-xs font-bold ${isUp ? "price-up" : "price-down"}`}>
                    {isUp ? "+" : ""}{coin.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground hidden md:block">{formatMCap(coin.market_cap)}</div>
                  <div className="flex items-center justify-center gap-1.5">
                    <Link href="/trade" onClick={e => goTrade("buy", e as any)}>
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                        style={{ background: "rgba(0,225,122,0.1)", color: "var(--green)", border: "1px solid rgba(0,225,122,0.2)" }}>
                        Buy
                      </span>
                    </Link>
                    <Link href="/trade" onClick={e => goTrade("sell", e as any)}>
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                        style={{ background: "rgba(255,75,75,0.08)", color: "var(--red)", border: "1px solid rgba(255,75,75,0.18)" }}>
                        Sell
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RECENT TRADES ── */}
      {recentTrades.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Recent Trades</div>
            <Link href="/trades"><span className="text-xs font-semibold hover:opacity-80" style={{ color: "var(--green)" }}>View all</span></Link>
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {recentTrades.map((tr, i) => {
              const p = parseFloat(tr.pnl);
              return (
                <div key={tr.id || i} className={`flex items-center gap-3 px-4 py-3 table-row-hover ${i < recentTrades.length - 1 ? "border-b border-border/40" : ""}`}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: tr.type === "buy" ? "var(--green-dim)" : "var(--red-dim)" }}>
                    {tr.type === "buy" ? <TrendingUp className="w-4 h-4" style={{ color: "var(--green)" }} /> : <TrendingDown className="w-4 h-4" style={{ color: "var(--red)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">{tr.type.toUpperCase()} {tr.tokenSymbol || tr.token}</div>
                    <div className="text-[11px] text-muted-foreground">{tr.amount} SOL · {tr.time}</div>
                  </div>
                  <div className={`text-sm font-bold font-mono ${p >= 0 ? "price-up" : "price-down"}`}>
                    {p >= 0 ? "+" : ""}{tr.pnl}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
