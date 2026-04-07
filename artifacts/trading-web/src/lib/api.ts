// VITE_API_URL: set this in Vercel env vars to your Render backend URL
// e.g. https://alpha-trading-api.onrender.com
// When empty (local dev / same-origin), falls back to relative path
const BACKEND = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = BACKEND ? `${BACKEND}/api/trading` : `${BASE}/api/trading`;

function sid(): string {
  return localStorage.getItem("alpha_sid") || "";
}

export async function initSession(): Promise<string> {
  let s = localStorage.getItem("alpha_sid") || "";
  if (!s) {
    const r = await fetch(`${API}/session/init`, { method: "POST" });
    const d = await r.json();
    s = d.sessionId;
    localStorage.setItem("alpha_sid", s);
  }
  return s;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Session-Id": sid(),
  };
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function post<T>(path: string, body?: object): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function del<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { method: "DELETE", headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export const api = {
  getSolPrice:   () => get<{ price: string }>("/sol-price"),
  getEthPrice:   () => get<{ eth: string; bnb: string }>("/eth-price"),
  getAllPrices:   () => get<Record<string, string>>("/prices"),
  getTrending:   () => get<{ pairs: any[] }>("/trending"),
  getTokenInfo:  (mint: string) => get<any>(`/token-info/${mint}`),
  getTokenInfoEth:(addr: string) => get<any>(`/token-info-eth/${addr}`),
  searchTokens:  (q: string, chain = "all") =>
    get<{ pairs: any[] }>(`/token-search?q=${encodeURIComponent(q)}&chain=${chain}`),
  getNewTokens:  () => get<{ tokens: any[] }>("/new-tokens"),

  getWalletBalance: (address: string, chain?: string) =>
    get<{ balance: string; chain?: string }>(`/wallet/balance/${address}${chain ? `?chain=${chain}` : ""}`),
  generateWallet: (count = 1, chain = "sol") =>
    post<{ wallets: any[] }>("/wallet/generate", { count, chain }),
  importWallet:  (key: string, chain = "sol") => post<any>("/wallet/import", { key, chain }),

  swap:     (data: any) => post<any>("/swap", data),
  transfer: (privateKey: string, toAddress: string, amountSol: string, chain = "sol") =>
    post<any>("/transfer", { privateKey, toAddress, amountSol, chain }),

  getProfile:  () => get<any>("/profile"),
  getTrades:   () => get<any>("/trades"),

  getSniper:   () => get<any>("/sniper"),
  setSniper:   (data: any) => post<any>("/sniper", data),

  getLimitOrders:     () => get<any>("/limit-orders"),
  createLimitOrder:   (data: any) => post<any>("/limit-orders", data),
  deleteLimitOrder:   (id: string) => del<any>(`/limit-orders/${id}`),
  deleteAllLimitOrders: () => del<any>("/limit-orders/all"),

  getCopyTrades:    () => get<any>("/copy-trades"),
  addCopyTrade:     (address: string, maxSol: string, chain = "sol") =>
    post<any>("/copy-trades", { address, maxSol, chain }),
  startCopyTrading: (walletPrivKey: string) =>
    post<any>("/copy-trades/start", { walletPrivKey }),
  stopCopyTrading:  () => post<any>("/copy-trades/stop"),
  clearCopyTrades:  () => del<any>("/copy-trades"),

  getSettings:    () => get<any>("/settings"),
  updateSettings: (data: any) => post<any>("/settings", data),

  getReferral:  () => get<any>("/referral"),
  claimCashback:() => post<any>("/referral/claim"),

  getPriceAlerts:  () => get<any>("/price-alerts"),
  addPriceAlert:   (data: any) => post<any>("/price-alerts", data),
  deletePriceAlert:(idx: number) => del<any>(`/price-alerts/${idx}`),

  getDcaOrders:   () => get<any>("/dca-orders"),
  createDcaOrder: (data: any) => post<any>("/dca-orders", data),

  clearData: () => post<any>("/clear-data"),
};
