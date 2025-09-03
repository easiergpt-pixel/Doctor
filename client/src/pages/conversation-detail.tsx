import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";

export default function ConversationDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/conversations/:id");
  const [newMessage, setNewMessage] = useState("");
  const conversationId = params?.id;

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

  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: [`/api/conversations/${conversationId}`],
    enabled: isAuthenticated && !!conversationId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: isAuthenticated && !!conversationId,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Conversation not found</h2>
          <Button onClick={() => setLocation("/conversations")} className="mt-4">
            Back to Conversations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={false} onToggle={() => {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/conversations")}
                data-testid="button-back-to-conversations"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <span>Conversation Details</span>
            </div>
          }
          subtitle={`Customer ID: ${conversation?.customerId?.slice(0, 8) || "Unknown"}`}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {conversationLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !conversation ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-semibold">Conversation not found</h3>
                <p className="text-muted-foreground mb-4">This conversation may have been deleted.</p>
                <Button onClick={() => setLocation("/conversations")}>
                  Back to Conversations
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation Info */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold" data-testid="text-conversation-title">
                        Conversation {conversation.id.slice(0, 8)}
                      </h2>
                      <p className="text-muted-foreground">
                        Customer: {conversation.customerId?.slice(0, 8) || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={conversation.channel === 'whatsapp' ? 'default' : 
                             conversation.channel === 'website' ? 'secondary' : 'outline'}
                    >
                      {conversation.channel}
                    </Badge>
                    <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                      {conversation.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-6">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : !Array.isArray(messages) || messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-lg font-semibold">No messages yet</h3>
                      <p className="text-muted-foreground">Messages will appear here as the conversation progresses.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.isArray(messages) && messages.map((message: any) => (
                        <div 
                          key={message.id} 
                          className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'customer' 
                              ? 'bg-muted text-foreground' 
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            <p className="text-sm" data-testid={`text-message-${message.id}`}>
                              {message.content}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(new Date(message.createdAt), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-6 border-t">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          // Handle send message
                          console.log('Send message:', newMessage);
                          setNewMessage("");
                        }
                      }}
                      data-testid="input-new-message"
                    />
                    <Button
                      onClick={() => {
                        // Handle send message
                        console.log('Send message:', newMessage);
                        setNewMessage("");
                      }}
                      disabled={!newMessage.trim()}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is a read-only view. Messages are handled automatically by your AI receptionist.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}