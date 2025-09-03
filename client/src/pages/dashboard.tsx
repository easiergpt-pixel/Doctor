import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsGrid from "@/components/dashboard/stats-grid";
import ChannelsOverview from "@/components/dashboard/channels-overview";
import RecentActivity from "@/components/dashboard/recent-activity";
import LiveConversations from "@/components/dashboard/live-conversations";
import ChatWidgetPreview from "@/components/chat/chat-widget-preview";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" subtitle="Monitor your AI receptionist performance" />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Stats Overview */}
            <StatsGrid />

            {/* Active Channels & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChannelsOverview />
              <RecentActivity />
            </div>

            {/* Live Conversations */}
            <LiveConversations />

            {/* Chat Widget Preview */}
            <ChatWidgetPreview />
          </div>
        </main>
      </div>
    </div>
  );
}
