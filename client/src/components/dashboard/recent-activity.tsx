import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivity() {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["/api/conversations/active"],
  });

  // Mock recent activity for demo
  const mockActivity = [
    {
      id: "1",
      customerName: "Sarah Johnson",
      message: "Booked appointment for dental cleaning",
      time: "2 minutes ago",
      channel: "WhatsApp",
      channelColor: "bg-green-500/10 text-green-700",
    },
    {
      id: "2", 
      customerName: "Mike Chen",
      message: "Asked about clinic hours and services",
      time: "5 minutes ago",
      channel: "Website",
      channelColor: "bg-purple-500/10 text-purple-700",
    },
    {
      id: "3",
      customerName: "Lisa Rodriguez", 
      message: "Rescheduled appointment to next Tuesday",
      time: "8 minutes ago",
      channel: "Messenger",
      channelColor: "bg-blue-500/10 text-blue-700",
    },
  ];

  const activityItems = conversations?.slice(0, 3) || mockActivity;

  if (isLoading) {
    return (
      <Card className="fade-in">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activityItems.map((activity: any, index: number) => (
            <div 
              key={activity.id || index} 
              className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground" data-testid={`activity-customer-${index}`}>
                  {activity.customerName || `Customer ${activity.id?.slice(0, 8)}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.message || "Started a new conversation"}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {activity.time || (activity.lastMessageAt ? 
                      format(new Date(activity.lastMessageAt), 'PPp') : 
                      'Just now'
                    )}
                  </span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <Badge 
                    variant="secondary" 
                    className={activity.channelColor || "bg-muted text-muted-foreground"}
                  >
                    {activity.channel || activity.channel || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
