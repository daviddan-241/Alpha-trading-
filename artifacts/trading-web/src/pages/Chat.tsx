import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Send, Bot, User, Zap, MessageCircle, TrendingUp, TrendingDown } from "lucide-react";

interface Message {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  isBot?: boolean;
  type?: "buy" | "sell" | "info";
}

const BOT_RESPONSES: Record<string, string> = {
  sol: "SOL is Solana's native token — one of the fastest Layer-1 blockchains with sub-second finality. Use it to pay for gas fees and trade on Jupiter DEX.",
  jupiter: "Jupiter is the leading DEX aggregator on Solana. It routes your swaps across 20+ DEXes to find the best price automatically.",
  help: "I can help with:\n• /sol — info about SOL\n• /jupiter — DEX aggregator info\n• /sniper — how sniper works\n• /wallet — wallet tips\n• /fees — priority fee guide",
  sniper: "The Sniper bot monitors the blockchain for new liquidity pools. When a new pool is detected for your target token, it instantly executes a buy at market price.",
  wallet: "Your wallet is stored securely in this session. Always export your private key and store it safely — it's the only way to recover your funds!",
  fees: "Priority fees boost your transaction speed. Bronze (0.001 SOL) is fine for most trades. Use Gold/Diamond during high network congestion for faster fills.",
  buy: "To buy: Go to Buy & Sell → search for a token or paste its contract address → enter how much SOL to spend → click Execute via Jupiter!",
  sell: "To sell: Go to Buy & Sell → switch to Sell tab → paste the token you want to sell → choose a percentage → click Execute!",
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    author: "Alpha Bot",
    avatar: "🤖",
    text: "Welcome to Alpha Trading community chat! Ask me anything about trading, or chat with other traders. Type /help to see commands.",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    isBot: true,
    type: "info",
  },
  {
    id: "2",
    author: "TraderKing",
    avatar: "👑",
    text: "SOL looking bullish today! Broke through the 200-day MA. 🚀",
    time: new Date(Date.now() - 120000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: "buy",
  },
  {
    id: "3",
    author: "CryptoWolf",
    avatar: "🐺",
    text: "Just sniped a new token on pump.fun — already up 45% 🔥",
    time: new Date(Date.now() - 90000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: "buy",
  },
  {
    id: "4",
    author: "DefiDegen",
    avatar: "🎯",
    text: "Be careful with the new meme coins, DYOR always. Lost 2 SOL on a rug pull yesterday...",
    time: new Date(Date.now() - 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: "sell",
  },
  {
    id: "5",
    author: "SolanaMax",
    avatar: "⚡",
    text: "Alpha Trading Bot is insane for copy trading. Following a whale wallet and already up 15% this week!",
    time: new Date(Date.now() - 30000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: "buy",
  },
];

const COMMUNITY_NAMES = ["TraderKing 👑", "CryptoWolf 🐺", "SolanaMax ⚡", "DefiDegen 🎯", "PumpFunner 🚀", "WhaleWatcher 🐳", "MEV_Hunter ⚔️", "JupiterTrader 🌌"];
const COMMUNITY_MSGS = [
  "Anyone else see that SOL pump? 🚀",
  "New token just launched on Raydium, looks promising!",
  "Jupiter routing is getting better every day",
  "Don't forget to set slippage before trading meme coins",
  "JITO tips are worth it during peak hours",
  "Anyone copy trading the top wallets?",
  "Sniped another one at launch, 3x already!",
  "Who else is bullish on SOL ecosystem this quarter?",
  "MEV protection saved me from a sandwich attack earlier",
  "Referral cashback is actually pretty decent, 1% adds up!",
];

export default function Chat() {
  const { wallets, activeWallet } = useApp();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [onlineCount] = useState(Math.floor(247 + Math.random() * 50));
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeW = wallets[activeWallet];
  const myName = activeW ? `Trader_${activeW.address.slice(0, 6)}` : "You";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const name = COMMUNITY_NAMES[Math.floor(Math.random() * COMMUNITY_NAMES.length)]!;
      const text = COMMUNITY_MSGS[Math.floor(Math.random() * COMMUNITY_MSGS.length)]!;
      const avatars = ["🦊", "🐻", "🦁", "🐯", "🦅", "🐉", "🌊", "🌙"];
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        author: name,
        avatar: avatars[Math.floor(Math.random() * avatars.length)]!,
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: Math.random() > 0.5 ? "buy" : "info",
      }]);
    }, 12000 + Math.random() * 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBotCommand = (text: string): string | null => {
    const cmd = text.trim().toLowerCase().replace(/^\//, "");
    return BOT_RESPONSES[cmd] || null;
  };

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const myMsg: Message = {
      id: Date.now().toString(),
      author: myName,
      avatar: "😎",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, myMsg]);
    setInput("");

    if (trimmed.startsWith("/")) {
      const response = handleBotCommand(trimmed);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          author: "Alpha Bot",
          avatar: "🤖",
          text: response || "Unknown command. Type /help to see available commands.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isBot: true,
          type: "info",
        }]);
      }, 800);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" /> Community Chat
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live trader chat — ask questions, share signals, discuss the market</p>
      </div>

      <div className="rounded-xl border border-border bg-card flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-foreground">Alpha Trading — General</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{onlineCount} online</span>
            </div>
            <div className="flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              <span>Bot active</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg) => {
            const isMe = msg.author === myName;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-base">
                  {msg.avatar}
                </div>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className={`text-xs font-semibold ${msg.isBot ? "text-primary" : isMe ? "text-emerald-400" : "text-foreground"}`}>
                      {msg.isBot && <Zap className="w-3 h-3 inline mr-0.5" />}
                      {msg.author}
                    </span>
                    {msg.type === "buy" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                    {msg.type === "sell" && <TrendingDown className="w-3 h-3 text-red-400" />}
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <div className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : msg.isBot
                        ? "bg-primary/10 border border-primary/20 text-foreground rounded-tl-sm"
                        : "bg-secondary text-foreground rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                className="input-base resize-none min-h-[40px] max-h-24 py-2 text-sm"
                placeholder="Type a message or /help for bot commands..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
            </div>
            <button
              onClick={send}
              disabled={!input.trim()}
              className="btn-primary flex items-center gap-1.5 py-2 px-4 flex-shrink-0 self-end mb-px disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <User className="w-3 h-3" />
            Chatting as <span className="font-mono font-semibold">{myName}</span> · Type /help for bot commands
          </div>
        </div>
      </div>
    </div>
  );
}
