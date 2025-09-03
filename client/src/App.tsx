import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Conversations from "@/pages/conversations";
import ConversationDetail from "@/pages/conversation-detail";
import Channels from "@/pages/channels";
import Bookings from "@/pages/bookings";
import Customers from "@/pages/customers";
import Billing from "@/pages/billing";
import AISettings from "@/pages/ai-settings";
import ReminderSettings from "@/pages/reminder-settings";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/conversations" component={Conversations} />
          <Route path="/conversations/:id" component={ConversationDetail} />
          <Route path="/channels" component={Channels} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/customers" component={Customers} />
          <Route path="/billing" component={Billing} />
          <Route path="/ai-settings" component={AISettings} />
          <Route path="/reminder-settings" component={ReminderSettings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
