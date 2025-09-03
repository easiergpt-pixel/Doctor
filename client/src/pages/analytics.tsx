import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  Calendar, 
  Users, 
  Clock,
  Star,
  Activity
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [dateRange, setDateRange] = useState("7d");

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

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });

  const { data: bookings } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calculate analytics data
  const totalConversations = conversations?.length || 0;
  const totalBookings = bookings?.length || 0;
  const confirmedBookings = bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
  const conversionRate = totalConversations > 0 ? (confirmedBookings / totalConversations * 100).toFixed(1) : "0";

  // Recent performance data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const dayConversations = conversations?.filter((c: any) => {
      const convDate = new Date(c.createdAt);
      return convDate >= startOfDay(date) && convDate <= endOfDay(date);
    }).length || 0;
    
    return {
      date: format(date, 'MMM dd'),
      conversations: dayConversations,
    };
  }).reverse();

  const analyticsCards = [
    {
      title: "Total Conversations",
      value: totalConversations.toLocaleString(),
      change: "+12%",
      changeText: "vs last week",
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Bookings Created",
      value: totalBookings.toLocaleString(),
      change: "+8%",
      changeText: "vs last week", 
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      change: "+2.3%",
      changeText: "vs last week",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Avg Response Time",
      value: stats?.avgResponseTime || "2.3s",
      change: "-0.2s",
      changeText: "improvement",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={false} onToggle={() => {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Analytics" 
          subtitle="Track your AI receptionist performance and insights"
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Performance Analytics</h1>
              <div className="flex space-x-2">
                {["7d", "30d", "90d"].map((range) => (
                  <Button
                    key={range}
                    variant={dateRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(range)}
                    data-testid={`button-range-${range}`}
                  >
                    {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analyticsCards.map((card) => (
                <Card key={card.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-2xl font-bold text-foreground" data-testid={`metric-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                          {card.value}
                        </p>
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-green-600 font-medium">{card.change}</span>
                          <span className="text-sm text-muted-foreground ml-2">{card.changeText}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${card.bgColor}`}>
                        <card.icon className={`h-6 w-6 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts and Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversation Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Daily Conversations (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {last7Days.map((day, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{day.date}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${Math.max(day.conversations / Math.max(...last7Days.map(d => d.conversations)) * 100, 5)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground w-8 text-right">
                            {day.conversations}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Channel Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Performing Channels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Telegram", conversations: conversations?.filter((c: any) => c.channelType === 'telegram').length || 0, color: "bg-blue-500" },
                      { name: "Website Widget", conversations: conversations?.filter((c: any) => c.channelType === 'website').length || 0, color: "bg-purple-500" },
                      { name: "WhatsApp", conversations: conversations?.filter((c: any) => c.channelType === 'whatsapp').length || 0, color: "bg-green-500" },
                      { name: "Facebook", conversations: conversations?.filter((c: any) => c.channelType === 'facebook').length || 0, color: "bg-blue-600" },
                    ].sort((a, b) => b.conversations - a.conversations).map((channel) => (
                      <div key={channel.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${channel.color}`} />
                          <span className="text-sm text-foreground">{channel.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-foreground">
                            {channel.conversations} conversations
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{stats?.satisfactionRate || "94%"}</div>
                    <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
                    <Badge variant="outline" className="mt-1">Excellent</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{confirmedBookings}</div>
                    <div className="text-sm text-muted-foreground">Successful Bookings</div>
                    <Badge variant="outline" className="mt-1">This Month</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{stats?.avgResponseTime || "2.3s"}</div>
                    <div className="text-sm text-muted-foreground">Average Response Time</div>
                    <Badge variant="outline" className="mt-1">Real-time</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}