import { useState, useEffect, useRef } from "react";
import { Bot, Send, Zap, ChevronRight } from "lucide-react";

interface Message {
  id: string;
  role: "bot" | "user";
  text: string;
  time: string;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function botReply(input: string): string {
  const t = input.toLowerCase().trim();

  if (/hello|hi|hey|sup|yo|gm|morning|hola/.test(t))
    return "Hey! 👋 I'm Alpha Bot — your Solana trading assistant. Ask me anything about wallets, swaps, sniping, transfers, or market info. Type your question and I'll help you out!";

  if (/how.*(start|begin|use)|new.*(here|user)|get started|first time/.test(t))
    return "Welcome! Here's how to get started:\n\n1️⃣ Go to **Wallets** → click **Create New Wallet** to generate a Solana wallet\n2️⃣ Fund it by sending SOL to your new address\n3️⃣ Use **Buy & Sell** to swap tokens via Jupiter\n4️⃣ Try **Sniper** to auto-buy new token launches\n\nNeed help with any specific step?";

  if (/wallet|create wallet|generate wallet|new wallet/.test(t))
    return "To create a wallet:\n\n→ Go to the **Wallets** page\n→ Click **Create New Wallet**\n→ Your private key is saved in your browser locally\n\n**Important:** Reveal and back up your private key immediately — it's the only way to recover your funds. Store it somewhere safe offline.";

  if (/import|restore|recover|seed phrase|mnemonic|private key/.test(t))
    return "To import an existing wallet:\n\n→ Go to **Wallets** → click **Import Wallet**\n→ Paste your **private key (base58)** or **12/24 word seed phrase**\n→ Your wallet loads with its current on-chain balance\n\nYour keys never leave your browser — they're stored locally only.";

  if (/send|transfer|sol.*to|move sol/.test(t))
    return "To send SOL:\n\n→ Go to **Transfer**\n→ Enter the destination Solana address\n→ Enter the amount\n→ Click **Send SOL**\n\nAlways keep ~0.001 SOL in your wallet for transaction fees. Solana transfers confirm in under a second!";

  if (/swap|buy|sell|trade|token|jupiter/.test(t))
    return "To swap tokens:\n\n→ Go to **Buy & Sell**\n→ Search for a token by name or paste its contract address\n→ Enter how much SOL to spend (for buys) or choose % to sell\n→ Click **Execute via Jupiter**\n\nJupiter routes your trade across 20+ DEXes to get the best price automatically.";

  if (/snip|sniper|new launch|new token|pump|raydium launch/.test(t))
    return "The **Sniper Bot** monitors Solana for new liquidity pool creations:\n\n→ Go to **Sniper**\n→ Enter the token address you want to snipe\n→ Set your buy amount in SOL\n→ Toggle it **Active**\n\nWhen a new pool opens for that token, the bot instantly buys at market price. Be careful — new launches carry high rug risk. Only use funds you can afford to lose.";

  if (/copy|copy trade|mirror|follow wallet|whale/.test(t))
    return "**Copy Trading** lets you mirror a whale wallet automatically:\n\n→ Go to **Copy Trading**\n→ Paste the Solana address you want to follow\n→ Set a max SOL limit per trade\n→ Enable it\n\nEvery time that wallet buys or sells, your bot mirrors the trade proportionally. Great for following top traders on-chain.";

  if (/limit order|limit buy|limit sell|price target/.test(t))
    return "**Limit Orders** let you set price targets:\n\n→ Go to **Limit Orders**\n→ Choose Buy or Sell, enter the token and your target price\n→ Set the amount and confirm\n\nThe bot monitors price and executes automatically when your target is hit. Works 24/7.";

  if (/dca|dollar cost|recurring buy|auto buy/.test(t))
    return "**DCA (Dollar Cost Averaging)** automatically buys a token at set intervals:\n\n→ Go to **DCA**\n→ Enter the token, amount per buy, and interval (hourly, daily, etc.)\n→ Enable it\n\nDCA reduces the risk of buying at the wrong time by spreading your entry across multiple purchases.";

  if (/fee|priority fee|gas|speed|transaction speed/.test(t))
    return "Priority fees boost your transaction speed on Solana:\n\n🥉 **Bronze** — 0.001 SOL (fine for normal trading)\n🥈 **Silver** — 0.005 SOL (busy market conditions)\n🥇 **Gold** — 0.01 SOL (high congestion, time-sensitive)\n💎 **Diamond** — 0.05 SOL (sniper-level speed)\n\nSet your fee in **Settings**. During high-traffic periods, lower fees can mean your transaction fails or delays.";

  if (/slippage|slip/.test(t))
    return "**Slippage** is the maximum price difference you'll accept between quote and execution:\n\n• **0.5%** — tight, may fail on volatile tokens\n• **1%** — good default for most trades\n• **5–10%** — needed for meme coins with low liquidity\n• **15–25%** — for very volatile new launches\n\nSet it in **Settings**. Too low = failed trades. Too high = worse fill price.";

  if (/mev|sandwich|front.*run/.test(t))
    return "**MEV (Maximal Extractable Value)** bots sandwich your trades to steal value:\n\n1. They see your tx in the mempool\n2. They buy before you (price goes up)\n3. You buy at the higher price\n4. They sell right after (profit at your expense)\n\nEnable **MEV Protection** in Settings to route your trades through private channels that block this. Highly recommended for large trades.";

  if (/sol price|price of sol|solana price|how much sol/.test(t))
    return "I don't have real-time price data here, but you can see the live SOL price at the top of the dashboard.\n\nFor market data:\n🔗 CoinGecko: coingecko.com/en/coins/solana\n🔗 Jupiter: jup.ag\n🔗 Birdeye: birdeye.so";

  if (/rpc|network|connection|solana network/.test(t))
    return "Alpha Trading connects to the **Solana mainnet** via a high-speed RPC endpoint.\n\nIf you see connection errors:\n• Check your internet connection\n• The Solana network may be congested (rare)\n• Try refreshing your wallet balance\n\nSolana averages 400ms block time with 65,000+ TPS capacity.";

  if (/safe|secure|security|risk|rug|scam/.test(t))
    return "**Security tips for Solana trading:**\n\n🔐 Never share your private key with anyone — ever\n🔐 Back up your private key offline (paper or encrypted file)\n🔐 Use MEV protection for large trades\n🚨 New tokens = high rug risk — DYOR always\n🚨 Verify contract addresses on Solscan before buying\n🚨 Never click links in DMs from strangers\n\nIf it sounds too good to be true, it probably is.";

  if (/referral|cashback|earn|commission/.test(t))
    return "**Referral & Cashback program:**\n\n→ Go to **Referral** page to get your unique link\n→ Share it — earn **20% commission** on your referrals' trading fees\n→ You also earn **0.1% cashback** on every trade you make\n\nCashback accumulates and can be claimed anytime to your active wallet.";

  if (/solscan|explorer|transaction|tx|txid|view tx/.test(t))
    return "To view any transaction:\n\n→ Visit **https://solscan.io**\n→ Paste your wallet address to see all transactions\n→ Or paste a transaction ID (txid) to see its details\n\nAfter a successful transfer or swap, Alpha Trading shows you a direct Solscan link for that transaction.";

  if (/balance|check balance|how much|sol balance/.test(t))
    return "Your wallet balance is shown on the **Wallets** page and in the top navigation bar.\n\nClick **Refresh** on the Wallets page to fetch the latest on-chain balance. Balances update directly from the Solana blockchain.";

  if (/help|what can you do|commands|options/.test(t))
    return "I'm your Alpha Trading assistant! Here's what I can help with:\n\n💼 **Wallets** — creating, importing, securing\n💸 **Transfers** — sending SOL\n🔄 **Swaps** — buying and selling tokens via Jupiter\n🎯 **Sniper** — auto-buying new launches\n👥 **Copy Trading** — mirroring whale wallets\n📊 **Limit Orders & DCA** — automated strategies\n⚙️ **Settings** — fees, slippage, MEV protection\n🛡️ **Security** — keeping your funds safe\n\nJust ask me anything — I'll do my best to help!";

  const defaults = [
    "I'm not sure about that specific question, but I can help with wallets, swaps, sniping, transfers, copy trading, limit orders, and security. What would you like to know?",
    "Good question! Could you give me a bit more detail? I'm best at helping with Solana trading, wallets, and using Alpha Trading's features.",
    "I didn't quite catch that. Try asking about: creating a wallet, swapping tokens, setting up the sniper, or transferring SOL.",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)]!;
}

const SUGGESTIONS = [
  "How do I create a wallet?",
  "How do I send SOL?",
  "How does the sniper work?",
  "What is copy trading?",
  "What slippage should I use?",
  "How do I stay safe?",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "bot",
      text: "Hey! 👋 I'm **Alpha Bot** — your Solana trading assistant.\n\nI can help you with wallets, swaps, sniping, transfers, copy trading, and anything else about the platform. What do you need?",
      time: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: trimmed, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const reply = botReply(trimmed);
      setTyping(false);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "bot", text: reply, time: now() }]);
    }, 600 + Math.random() * 600);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const renderText = (text: string) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,225,122,0.15)", border: "1px solid rgba(0,225,122,0.3)" }}>
          <Bot className="w-5 h-5" style={{ color: "var(--green)" }} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            Alpha Bot
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full" style={{ background: "rgba(0,225,122,0.15)", color: "var(--green)", border: "1px solid rgba(0,225,122,0.25)" }}>
              <Zap className="w-3 h-3 inline mr-0.5" />Online
            </span>
          </h1>
          <p className="text-xs text-muted-foreground">Your Solana trading assistant — ask me anything</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "bot" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: "rgba(0,225,122,0.15)", border: "1px solid rgba(0,225,122,0.2)" }}>
                  🤖
                </div>
              )}
              <div className={`max-w-[80%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary/60 text-foreground rounded-tl-sm"
                }`}>
                  {renderText(msg.text)}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,225,122,0.15)", border: "1px solid rgba(0,225,122,0.2)" }}>
                🤖
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-secondary/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                style={{ background: "rgba(0,225,122,0.08)", border: "1px solid rgba(0,225,122,0.2)", color: "var(--green)" }}>
                <ChevronRight className="w-3 h-3" />
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t border-border flex gap-2 items-end">
          <textarea
            className="input-base flex-1 resize-none min-h-[40px] max-h-24 py-2 text-sm"
            placeholder="Ask me anything about trading on Solana..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || typing}
            className="btn-primary flex items-center gap-1.5 py-2 px-4 flex-shrink-0 self-end mb-px disabled:opacity-40">
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
