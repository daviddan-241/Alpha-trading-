import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/contexts/AppContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Trade from "@/pages/Trade";
import Wallets from "@/pages/Wallets";
import Sniper from "@/pages/Sniper";
import LimitOrders from "@/pages/LimitOrders";
import CopyTrade from "@/pages/CopyTrade";
import Profile from "@/pages/Profile";
import Trades from "@/pages/Trades";
import Referral from "@/pages/Referral";
import Settings from "@/pages/Settings";
import Transfer from "@/pages/Transfer";
import Markets from "@/pages/Markets";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/markets" component={Markets} />
        <Route path="/trade" component={Trade} />
        <Route path="/wallets" component={Wallets} />
        <Route path="/sniper" component={Sniper} />
        <Route path="/limits" component={LimitOrders} />
        <Route path="/copy" component={CopyTrade} />
        <Route path="/profile" component={Profile} />
        <Route path="/trades" component={Trades} />
        <Route path="/referral" component={Referral} />
        <Route path="/settings" component={Settings} />
        <Route path="/transfer" component={Transfer} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}
