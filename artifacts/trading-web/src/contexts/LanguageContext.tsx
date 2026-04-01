import React, { createContext, useContext, useState, useCallback } from "react";

type LangCode = "en" | "zh" | "ru" | "pt" | "vi";

const TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  en: {
    home: "Home",
    markets: "Markets",
    buySell: "Buy & Sell",
    wallets: "Wallets",
    trading: "Trading",
    sniper: "Sniper",
    limitOrders: "Limit Orders",
    copyTrade: "Copy Trade",
    transferSol: "Transfer SOL",
    account: "Account",
    tradeHistory: "Trade History",
    profile: "Profile",
    referral: "Referral & Cashback",
    settings: "Settings",
    chat: "Community Chat",
    telegramChannel: "Telegram Channel",
    telegramBot: "Telegram Bot",
    solPrice: "SOL PRICE",
    noWallet: "No wallet connected",
    generateWallet: "Generate Wallet",
    importWallet: "Import Wallet",
    refresh: "Refresh",
  },
  zh: {
    home: "主页",
    markets: "市场",
    buySell: "买卖",
    wallets: "钱包",
    trading: "交易",
    sniper: "狙击",
    limitOrders: "限价单",
    copyTrade: "跟单交易",
    transferSol: "转账 SOL",
    account: "账户",
    tradeHistory: "交易历史",
    profile: "个人资料",
    referral: "推荐与返现",
    settings: "设置",
    chat: "社区聊天",
    telegramChannel: "Telegram 频道",
    telegramBot: "Telegram 机器人",
    solPrice: "SOL 价格",
    noWallet: "未连接钱包",
    generateWallet: "生成钱包",
    importWallet: "导入钱包",
    refresh: "刷新",
  },
  ru: {
    home: "Главная",
    markets: "Рынки",
    buySell: "Купить и продать",
    wallets: "Кошельки",
    trading: "Торговля",
    sniper: "Снайпер",
    limitOrders: "Лимитные ордера",
    copyTrade: "Копи-трейдинг",
    transferSol: "Перевод SOL",
    account: "Аккаунт",
    tradeHistory: "История сделок",
    profile: "Профиль",
    referral: "Реферальная программа",
    settings: "Настройки",
    chat: "Чат сообщества",
    telegramChannel: "Telegram Канал",
    telegramBot: "Telegram Бот",
    solPrice: "ЦЕНА SOL",
    noWallet: "Кошелёк не подключён",
    generateWallet: "Создать кошелёк",
    importWallet: "Импортировать кошелёк",
    refresh: "Обновить",
  },
  pt: {
    home: "Início",
    markets: "Mercados",
    buySell: "Comprar e Vender",
    wallets: "Carteiras",
    trading: "Negociação",
    sniper: "Sniper",
    limitOrders: "Ordens Limitadas",
    copyTrade: "Copy Trade",
    transferSol: "Transferir SOL",
    account: "Conta",
    tradeHistory: "Histórico de Trades",
    profile: "Perfil",
    referral: "Indicação e Cashback",
    settings: "Configurações",
    chat: "Chat da Comunidade",
    telegramChannel: "Canal Telegram",
    telegramBot: "Bot Telegram",
    solPrice: "PREÇO SOL",
    noWallet: "Sem carteira conectada",
    generateWallet: "Gerar Carteira",
    importWallet: "Importar Carteira",
    refresh: "Atualizar",
  },
  vi: {
    home: "Trang chủ",
    markets: "Thị trường",
    buySell: "Mua & Bán",
    wallets: "Ví",
    trading: "Giao dịch",
    sniper: "Bắn tỉa",
    limitOrders: "Lệnh giới hạn",
    copyTrade: "Sao chép giao dịch",
    transferSol: "Chuyển SOL",
    account: "Tài khoản",
    tradeHistory: "Lịch sử giao dịch",
    profile: "Hồ sơ",
    referral: "Giới thiệu & Hoàn tiền",
    settings: "Cài đặt",
    chat: "Chat cộng đồng",
    telegramChannel: "Kênh Telegram",
    telegramBot: "Bot Telegram",
    solPrice: "GIÁ SOL",
    noWallet: "Chưa kết nối ví",
    generateWallet: "Tạo ví",
    importWallet: "Nhập ví",
    refresh: "Làm mới",
  },
};

export const LANG_OPTIONS = [
  { code: "en" as LangCode, flag: "🇺🇸", name: "English" },
  { code: "zh" as LangCode, flag: "🇨🇳", name: "中文" },
  { code: "ru" as LangCode, flag: "🇷🇺", name: "Русский" },
  { code: "pt" as LangCode, flag: "🇧🇷", name: "Português" },
  { code: "vi" as LangCode, flag: "🇻🇳", name: "Tiếng Việt" },
];

interface LangContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    const saved = localStorage.getItem("alpha_lang") as LangCode;
    return saved && TRANSLATIONS[saved] ? saved : "en";
  });

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    localStorage.setItem("alpha_lang", l);
  }, []);

  const t = useCallback((key: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
