import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerItem {
  symbol: string;
  price: string;
  change: number;
}

const FALLBACK: TickerItem[] = [
  { symbol: "BTC", price: "67,421", change: 1.24 },
  { symbol: "ETH", price: "2,134", change: 3.76 },
  { symbol: "SOL", price: "83.52", change: 2.41 },
  { symbol: "BNB", price: "412", change: -0.82 },
  { symbol: "DOGE", price: "0.0923", change: 5.13 },
  { symbol: "PEPE", price: "0.0000119", change: 8.4 },
  { symbol: "WIF", price: "2.14", change: -3.2 },
  { symbol: "BONK", price: "0.0000298", change: 11.5 },
  { symbol: "JUP", price: "0.84", change: -1.6 },
  { symbol: "RAY", price: "3.21", change: 4.2 },
];

export default function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const ids = "bitcoin,ethereum,solana,binancecoin,dogecoin,pepe,dogwifcoin,bonk,jupiter,raydium";
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (!res.ok) return;
        const d = await res.json();
        const map: Record<string, { symbol: string }> = {
          bitcoin: { symbol: "BTC" }, ethereum: { symbol: "ETH" },
          solana: { symbol: "SOL" }, binancecoin: { symbol: "BNB" },
          dogecoin: { symbol: "DOGE" }, pepe: { symbol: "PEPE" },
          dogwifcoin: { symbol: "WIF" }, bonk: { symbol: "BONK" },
          jupiter: { symbol: "JUP" }, raydium: { symbol: "RAY" },
        };
        const newItems: TickerItem[] = Object.entries(d).map(([id, val]: [string, any]) => ({
          symbol: map[id]?.symbol || id.toUpperCase(),
          price: val.usd >= 1000
            ? val.usd.toLocaleString("en-US", { maximumFractionDigits: 0 })
            : val.usd >= 1
              ? val.usd.toFixed(2)
              : val.usd >= 0.01
                ? val.usd.toFixed(4)
                : val.usd.toFixed(8),
          change: parseFloat((val.usd_24h_change || 0).toFixed(2)),
        }));
        if (newItems.length > 0) setItems(newItems);
      } catch {}
    };
    fetchPrices();
    const iv = setInterval(fetchPrices, 45000);
    return () => clearInterval(iv);
  }, []);

  const doubled = [...items, ...items];

  return (
    <div className="ticker-wrap h-8 flex items-center border-b border-border/60 bg-card/40">
      <div className="ticker-inner gap-0">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-4 border-r border-border/40 h-8">
            <span className="text-xs font-semibold text-foreground/90 tracking-wide">{item.symbol}</span>
            <span className="text-xs font-mono text-foreground/80">${item.price}</span>
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${item.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              {item.change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {item.change >= 0 ? "+" : ""}{item.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
