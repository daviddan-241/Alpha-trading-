import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import Sparkline from "@/components/Sparkline";
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, Copy, Target,
  Zap, ArrowUpRight, LineChart, RefreshCw, Flame, Star,
  Send, QrCode, Globe
} from "lucide-react";

interface MarketCoin {
  id: string; symbol: string; name: string; image: string;
  current_price: number; price_change_percentage_24h: number;
  market_cap: number; market_cap_rank: number; total_volume: number;
}

function formatPrice(n: number) {
  if (!n || isNaN(n)) return "$0.00";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}
function formatMCap(n: number) {
  if (!n) return "—";
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

// Fallback market data shown when CoinGecko is unavailable
const FALLBACK_MARKETS: MarketCoin[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png", current_price: 68000, price_change_percentage_24h: 1.5, market_cap: 1.34e12, market_cap_rank: 1, total_volume: 28e9 },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png", current_price: 3500, price_change_percentage_24h: 2.1, market_cap: 421e9, market_cap_rank: 2, total_volume: 15e9 },
  { id: "solana", symbol: "sol", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png", current_price: 180, price_change_percentage_24h: 3.4, market_cap: 82e9, market_cap_rank: 5, total_volume: 4.2e9 },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png", current_price: 580, price_change_percentage_24h: 0.8, market_cap: 84e9, market_cap_rank: 4, total_volume: 2.1e9 },
  { id: "matic-network", symbol: "matic", name: "Polygon", image: "https://assets.coingecko.com/coins/images/4713/thumb/polygon.png", current_price: 0.72, price_change_percentage_24h: -1.2, market_cap: 6.8e9, market_cap_rank: 18, total_volume: 380e6 },
  { id: "avalanche-2", symbol: "avax", name: "Avalanche", image: "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png", current_price: 36, price_change_percentage_24h: 2.8, market_cap: 14.8e9, market_cap_rank: 12, total_volume: 520e6 },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png", current_price: 0.52, price_change_percentage_24h: -0.5, market_cap: 29e9, market_cap_rank: 7, total_volume: 1.2e9 },
  { id: "dogecoin", symbol: "doge", name: "Dogecoin", image: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png", current_price: 0.17, price_change_percentage_24h: 4.2, market_cap: 24e9, market_cap_rank: 8, total_volume: 950e6 },
];

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
  const { solPrice, ethPrice, totalUsd, wallets, activeWallet, profile, refreshProfile, prices } = useApp();
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [topCoins, setTopCoins] = useState<MarketCoin[]>([]);
  const [coinsLoading, setCoinsLoading] = useState(true);
  const [solChange, setSolChange] = useState(2.41);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [fearGreed, setFearGreed] = useState<{ value: string; label: string } | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    refreshProfile();
    api.getTrades().then(d => setRecentTrades(d.history?.slice(0, 5) || [])).catch(() => {});
    fetchTopCoins();
    api.getFearGreed().then(setFearGreed).catch(() => {});
  }, []);

  const fetchTopCoins = async () => {
    setCoinsLoading(true);
    try {
      const data = await api.getMarkets();
      if (Array.isArray(data) && data.length) {
        setTopCoins(data);
        setUsedFallback(false);
        const sol = data.find((c: MarketCoin) => c.id === "solana");
        if (sol) setSolChange(sol.price_change_percentage_24h);
      } else {
        throw new Error("empty");
      }
    } catch {
      setTopCoins(FALLBACK_MARKETS);
      setUsedFallback(true);
    }
    setCoinsLoading(false);
  };

  const fgColor = fearGreed
    ? parseInt(fearGreed.value) >= 75 ? "#22c55e"
    : parseInt(fearGreed.value) >= 55 ? "#84cc16"
    : parseInt(fearGreed.value) >= 45 ? "#eab308"
    : parseInt(fearGreed.value) >= 25 ? "#f97316"
    : "#ef4444"
    : "#eab308";

  const fgExplain = fearGreed
    ? parseInt(fearGreed.value) >= 75 ? "Market is overheated — consider taking profits"
    : parseInt(fearGreed.value) >= 55 ? "Positive momentum — trend is your friend"
    : parseInt(fearGreed.value) >= 45 ? "Mixed signals — trade with caution"
    : parseInt(fearGreed.value) >= 25 ? "Panic selling — potential buy opportunity"
    : "Extreme panic — historically a strong buy zone"
    : "Loading…";

  const activeW = wallets[activeWallet];
  const solNum = parseFloat(solPrice || "0");
  const ethNum = parseFloat(ethPrice || "0");

  const solBal = parseFloat(activeW?.balance || "0");
  const ethBal = parseFloat((activeW as any)?.ethBalance || "0");
  const solUsd = (solBal * solNum).toFixed(2);
  const ethUsd = (ethBal * ethNum).toFixed(2);
  const totalUsdNum = parseFloat(totalUsd || "0");

  const pnl = profile?.totalPnl ? parseFloat(profile.totalPnl) : 0;

  const quickLinks = [
    { href: "/markets", label: "Markets", desc: "Live prices", icon: LineChart, color: "var(--blue)", bg: "var(--blue-dim)" },
    { href: "/trade", label: "Buy / Sell", desc: "Jupiter DEX", icon: TrendingUp, color: "var(--green)", bg: "var(--green-dim)" },
    { href: "/sniper", label: "Sniper", desc: "Auto-buy new tokens", icon: Target, color: "var(--purple)", bg: "var(--purple-dim)" },
    { href: "/copy", label: "Copy Trade", desc: "Mirror top wallets", icon: Copy, color: "var(--gold)", bg: "var(--gold-dim)" },
  ];

  return (
    <div className="space-y-6">
      {/* ── HERO BANNER ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: "200px" }}>
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Alpha Trading"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.45) saturate(1.2)", transition: "opacity 0.4s", opacity: imgLoaded ? 1 : 0 }}
            onLoad={() => setImgLoaded(true)}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,225,122,0.15) 50%, rgba(168,85,247,0.1) 100%)" }} />
        </div>
        {!imgLoaded && <div className="absolute inset-0 shimmer" />}

        <div className="relative px-6 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="live-dot" />
              <Globe className="w-3 h-3 text-white/60" />
              <span className="text-[11px] font-bold text-white/70 tracking-widest uppercase">Live · Multi-Chain Trading</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
              Alpha Trading
            </h1>
            <p className="text-sm text-white/60 mt-1">SOL · ETH · BNB · MATIC · AVAX · ARB · OP · BASE</p>
            <div className="flex items-center gap-5 mt-4">
              <div>
                <div className="text-[10px] text-white/50 uppercase tracking-wider">Portfolio Value</div>
                <div className="text-2xl font-black font-mono text-white">
                  ${totalUsdNum > 0 ? totalUsdNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                </div>
                <div className={`text-xs font-semibold mt-0.5 ${solChange >= 0 ? "price-up" : "price-down"}`}>
                  SOL {solChange >= 0 ? "▲" : "▼"} {Math.abs(solChange).toFixed(2)}% (24h)
                </div>
              </div>
              <div className="hidden sm:block">
                <Sparkline data={genSparkline(solNum, solChange)} width={120} height={40} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <Link href="/trade">
              <button className="btn-primary flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Trade Now
              </button>
            </Link>
            <Link href="/wallets">
              <button className="btn-secondary flex items-center gap-1.5">
                <Wallet className="w-4 h-4" /> Wallet
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── BALANCE CARDS + DEPOSIT/SEND ── */}
      {activeW && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total balance */}
          <div className="sm:col-span-1 rounded-2xl p-4 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid rgba(0,225,122,0.25)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Balance</div>
            <div className="text-2xl font-black font-mono text-white">
              ${totalUsdNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">◎ SOL</span>
                <span className="font-mono text-white font-bold">{solBal.toFixed(4)} ≈ ${parseFloat(solUsd).toFixed(2)}</span>
              </div>
              {ethBal > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Ξ ETH</span>
                  <span className="font-mono text-white font-bold">{ethBal.toFixed(6)} ≈ ${parseFloat(ethUsd).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Deposit */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4" style={{ color: "var(--green)" }} />
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Deposit SOL</div>
            </div>
            <div className="font-mono text-[10px] text-white break-all p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
              {activeW.address}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(activeW.address)}
              className="w-full text-xs font-bold py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(0,225,122,0.1)", color: "var(--green)", border: "1px solid rgba(0,225,122,0.2)" }}>
              Copy SOL Address
            </button>
          </div>

          {/* Send */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" style={{ color: "var(--purple)" }} />
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Send / Transfer</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Send SOL or EVM tokens to any address across all supported chains.
            </p>
            <Link href="/wallets">
              <button className="w-full text-xs font-bold py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(153,69,255,0.1)", color: "var(--purple)", border: "1px solid rgba(153,69,255,0.2)" }}>
                Open Wallet → Send
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* ── FEAR & GREED + SOL PRICE ── */}
      <div className="flex flex-wrap items-center gap-3">
        {fearGreed && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 flex-1 min-w-[240px]"
            style={{ background: "hsl(var(--card))", border: `1px solid ${fgColor}33` }}>
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={fgColor} strokeWidth="3"
                  strokeDasharray={`${parseFloat(fearGreed.value)} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: fgColor }}>
                {fearGreed.value}
              </span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fear & Greed Index</div>
              <div className="text-lg font-black mt-0.5" style={{ color: fgColor }}>{fearGreed.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{fgExplain}</div>
            </div>
          </div>
        )}
        <div className="flex-1 rounded-2xl px-4 py-3 min-w-[180px]"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">SOL Price</div>
              <div className="text-xl font-black font-mono text-white">${solNum.toFixed(2)}</div>
              <div className={`text-xs font-semibold mt-0.5 ${solChange >= 0 ? "price-up" : "price-down"}`}>
                {solChange >= 0 ? "▲" : "▼"} {Math.abs(solChange).toFixed(2)}% today
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">ETH Price</div>
              <div className="text-xl font-black font-mono text-white">${parseFloat(ethPrice || "0").toFixed(0)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Ethereum</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Portfolio", icon: Wallet, accent: "var(--green)",
            value: `$${totalUsdNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: `${solBal.toFixed(3)} SOL · ${ethBal.toFixed(4)} ETH`, valColor: "text-white"
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
          <p className="text-sm text-muted-foreground mb-4">Generate or import a wallet to start trading. One seed phrase covers SOL + all EVM chains.</p>
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
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Top Markets</div>
            {usedFallback && <span className="text-[10px] text-yellow-500/70 font-semibold">(cached data)</span>}
          </div>
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
          ) : (
            topCoins.slice(0, 10).map((coin) => {
              const isUp = (coin.price_change_percentage_24h ?? 0) >= 0;
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
                    {isUp ? "+" : ""}{(coin.price_change_percentage_24h ?? 0).toFixed(2)}%
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
