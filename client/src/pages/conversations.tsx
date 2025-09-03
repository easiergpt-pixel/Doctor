import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, User, Clock, Search, Filter } from "lucide-react";
import { format } from "date-fns";

export default function Conversations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });

  const filteredConversations = conversations?.filter((conv: any) =>
    conv.channel?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
        <Header 
          title="Conversations" 
          subtitle="Manage all customer conversations across channels"
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
              <Button variant="outline" data-testid="button-filter">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Conversations List */}
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No conversations found</h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm ? "No conversations match your search." : "Conversations will appear here when customers start chatting."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredConversations.map((conversation: any) => (
                  <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground" data-testid={`text-conversation-${conversation.id}`}>
                              Conversation {conversation.id.slice(0, 8)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Customer ID: {conversation.customerId?.slice(0, 8) || "Unknown"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <Badge 
                            variant={conversation.channel === 'whatsapp' ? 'default' : 
                                   conversation.channel === 'website' ? 'secondary' : 'outline'}
                          >
                            {conversation.channel}
                          </Badge>
                          
                          <Badge 
                            variant={conversation.status === 'active' ? 'default' : 'secondary'}
                          >
                            {conversation.status}
                          </Badge>
                          
                          <div className="text-right">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 mr-1" />
                              {conversation.lastMessageAt ? 
                                format(new Date(conversation.lastMessageAt), 'MMM d, HH:mm') : 
                                'No messages'
                              }
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Created {format(new Date(conversation.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                          
                          <Button variant="outline" size="sm" data-testid={`button-view-conversation-${conversation.id}`}>
                            View Chat
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
