const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api/trading`;

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
  getSolPrice: () => get<{ price: string }>("/sol-price"),
  getTokenInfo: (mint: string) => get<any>(`/token-info/${mint}`),
  searchTokens: (q: string) => get<{ pairs: any[] }>(`/token-search?q=${encodeURIComponent(q)}`),

  getWalletBalance: (address: string) => get<{ balance: string }>(`/wallet/balance/${address}`),
  generateWallet: (count = 1) => post<{ wallets: any[] }>("/wallet/generate", { count }),
  importWallet: (key: string) => post<any>("/wallet/import", { key }),

  swap: (data: any) => post<any>("/swap", data),
  transfer: (privateKey: string, toAddress: string, amountSol: string) =>
    post<any>("/transfer", { privateKey, toAddress, amountSol }),

  getProfile: () => get<any>("/profile"),
  getTrades: () => get<any>("/trades"),

  getSniper: () => get<any>("/sniper"),
  setSniper: (data: any) => post<any>("/sniper", data),

  getLimitOrders: () => get<any>("/limit-orders"),
  createLimitOrder: (data: any) => post<any>("/limit-orders", data),
  deleteLimitOrder: (id: string) => del<any>(`/limit-orders/${id}`),
  deleteAllLimitOrders: () => del<any>("/limit-orders/all"),

  getCopyTrades: () => get<any>("/copy-trades"),
  addCopyTrade: (address: string, maxSol: string) => post<any>("/copy-trades", { address, maxSol }),
  clearCopyTrades: () => del<any>("/copy-trades"),

  getSettings: () => get<any>("/settings"),
  updateSettings: (data: any) => post<any>("/settings", data),

  getReferral: () => get<any>("/referral"),
  claimCashback: () => post<any>("/referral/claim"),

  getPriceAlerts: () => get<any>("/price-alerts"),
  addPriceAlert: (data: any) => post<any>("/price-alerts", data),
  deletePriceAlert: (idx: number) => del<any>(`/price-alerts/${idx}`),

  getDcaOrders: () => get<any>("/dca-orders"),
  createDcaOrder: (data: any) => post<any>("/dca-orders", data),

  clearData: () => post<any>("/clear-data"),
};
