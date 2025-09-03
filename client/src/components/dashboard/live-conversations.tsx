import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

export default function LiveConversations() {
  const { data: activeConversations, isLoading } = useQuery({
    queryKey: ["/api/conversations/active"],
  });

  // Mock conversations for demo
  const mockConversations = [
    {
      id: "1",
      customerInitial: "A",
      customerName: "Alice Thompson",
      channel: "WhatsApp",
      channelColor: "bg-green-500/10 text-green-700",
      lastMessage: "Looking to schedule a consultation for next week...",
      duration: "3m 42s",
      bgColor: "bg-chart-1",
    },
    {
      id: "2",
      customerInitial: "R", 
      customerName: "Robert Kim",
      channel: "Website",
      channelColor: "bg-purple-500/10 text-purple-700",
      lastMessage: "What are your emergency hours?",
      duration: "1m 15s",
      bgColor: "bg-chart-3",
    },
    {
      id: "3",
      customerInitial: "M",
      customerName: "Maria Santos", 
      channel: "Messenger",
      channelColor: "bg-blue-500/10 text-blue-700",
      lastMessage: "Can I reschedule my appointment?",
      duration: "7m 23s",
      bgColor: "bg-chart-5",
    },
  ];

  const conversations = activeConversations?.slice(0, 3) || mockConversations;

  if (isLoading) {
    return (
      <Card className="fade-in">
        <CardHeader>
          <CardTitle>Live Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fade-in">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle>Live Conversations</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-chart-2 rounded-full mr-2 channel-indicator"></span>
              <span className="text-sm text-muted-foreground">{conversations.length} active</span>
            </div>
            <Button variant="ghost" size="sm" data-testid="button-view-all-conversations">
              View All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No active conversations</h3>
            <p className="text-muted-foreground">Active conversations will appear here in real-time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map((conversation: any, index: number) => (
              <div 
                key={conversation.id || index} 
                className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 ${conversation.bgColor || 'bg-primary'} rounded-full flex items-center justify-center mr-3`}>
                      <span className="text-white text-sm font-medium">
                        {conversation.customerInitial || conversation.customerId?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm" data-testid={`conversation-customer-${index}`}>
                        {conversation.customerName || `Customer ${conversation.customerId?.slice(0, 8)}`}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className={conversation.channelColor || "bg-muted text-muted-foreground"}
                      >
                        {conversation.channel || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                  <span className="w-2 h-2 bg-chart-2 rounded-full channel-indicator"></span>
                </div>
                <p className="text-sm text-muted-foreground mb-3" data-testid={`conversation-message-${index}`}>
                  {conversation.lastMessage || "Conversation in progress..."}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {conversation.duration || "Just started"}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary hover:text-primary/80 font-medium text-xs h-auto p-1"
                    data-testid={`button-join-conversation-${index}`}
                  >
                    Join Chat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
