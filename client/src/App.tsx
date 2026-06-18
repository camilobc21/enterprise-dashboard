import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import AdminPanel from "@/pages/AdminPanel";
import CRUDManager from "@/pages/CRUDManager";
import AIChat from "@/pages/AIChat";
import DocumentManager from "@/pages/DocumentManager";
import Notifications from "@/pages/Notifications";
import WiFiAnalysis from "@/pages/WiFiAnalysis";
import WiFiNetworks from "@/pages/WiFiNetworks";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SocketProvider } from "./contexts/SocketContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/crud"} component={CRUDManager} />
      <Route path={"/ai"} component={AIChat} />
      <Route path={"/documents"} component={DocumentManager} />
      <Route path={"/notifications"} component={Notifications} />
      <Route path={"/wifi-analysis"} component={WiFiAnalysis} />
      <Route path={"/wifi-networks"} component={WiFiNetworks} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SocketProvider>
        <ThemeProvider
          defaultTheme="light"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;
