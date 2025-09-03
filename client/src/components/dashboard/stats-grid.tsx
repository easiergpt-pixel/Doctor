import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, CalendarCheck, Clock, Smile } from "lucide-react";

export default function StatsGrid() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const statsData = [
    {
      title: "Total Conversations",
      value: stats?.totalConversations?.toLocaleString() || "0",
      change: "+12%",
      changeText: "from last month",
      icon: MessageSquare,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Bookings Made",
      value: stats?.bookingsMade?.toLocaleString() || "0",
      change: "+8%",
      changeText: "from last week",
      icon: CalendarCheck,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
    },
    {
      title: "Avg Response Time",
      value: stats?.avgResponseTime || "0.0s",
      change: "-15%",
      changeText: "improvement",
      icon: Clock,
      iconBg: "bg-chart-4/10",
      iconColor: "text-chart-4",
    },
    {
      title: "Satisfaction Rate",
      value: stats?.satisfactionRate || "0%",
      change: "+2%",
      changeText: "from last month",
      icon: Smile,
      iconBg: "bg-chart-1/10",
      iconColor: "text-chart-1",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => (
        <Card key={stat.title} className="stats-card fade-in">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-chart-2 font-medium">{stat.change}</span>
              <span className="text-muted-foreground ml-2">{stat.changeText}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
