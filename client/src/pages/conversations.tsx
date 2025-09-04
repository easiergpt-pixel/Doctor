import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { lastMessage } = useWebSocket();

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

  // Listen for new conversations and invalidate cache
  useEffect(() => {
    if (lastMessage?.type === 'new_conversation') {
      console.log('New conversation received, refreshing list...');
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  }, [lastMessage]);

  const filteredConversations = Array.isArray(conversations) 
    ? conversations.filter((conv: any) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          conv.channel?.toLowerCase().includes(search) ||
          conv.channelName?.toLowerCase().includes(search) ||
          conv.channelType?.toLowerCase().includes(search) ||
          conv.customerId?.toLowerCase().includes(search) ||
          conv.id?.toLowerCase().includes(search) ||
          conv.status?.toLowerCase().includes(search)
        );
      })
    : [];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        <Header 
          title="Conversations" 
          subtitle="Manage all customer conversations across channels"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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
              <Button variant="outline" size="sm" className="w-full sm:w-auto" data-testid="button-filter">
                <Filter className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Filter</span>
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
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-full flex items-center justify-center">
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
                        
                        <div className="flex flex-wrap items-center gap-2 md:gap-4">
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
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setLocation(`/conversations/${conversation.id}`)}
                            data-testid={`button-view-conversation-${conversation.id}`}
                          >
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
