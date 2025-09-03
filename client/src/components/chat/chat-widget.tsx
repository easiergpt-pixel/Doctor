import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Bot, User, X, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  content: string;
  sender: 'customer' | 'ai' | 'agent';
  timestamp: Date;
}

interface ChatWidgetProps {
  businessId: string;
  businessName?: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

export default function ChatWidget({ 
  businessId, 
  businessName = "AI Assistant",
  position = 'bottom-right',
  theme = {}
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startConversation = async () => {
    try {
      const response = await apiRequest("POST", "/api/conversations/start", {
        businessId,
        channel: "website",
        customerIdentifier: `web-${Date.now()}`,
      });
      const conversation = await response.json();
      setConversationId(conversation.id);
      
      // Add welcome message
      setMessages([{
        id: "welcome",
        content: `Hello! I'm ${businessName} AI assistant. How can I help you today?`,
        sender: "ai",
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "customer",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/chat", {
        message: inputValue,
        conversationId,
        channel: "website",
        customerIdentifier: `web-${Date.now()}`,
      });
      
      const aiResponse = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.message,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm experiencing some technical difficulties. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!conversationId) {
      startConversation();
    }
  };

  const positionClasses = position === 'bottom-right' 
    ? 'bottom-4 right-4' 
    : 'bottom-4 left-4';

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {!isOpen ? (
        <Button
          onClick={handleOpen}
          className="w-14 h-14 rounded-full shadow-lg"
          style={{ backgroundColor: theme.primaryColor }}
          data-testid="button-open-chat"
        >
          <Bot className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-80 h-96 shadow-xl">
          {/* Header */}
          <CardHeader 
            className="text-primary-foreground px-4 py-3 rounded-t-lg"
            style={{ backgroundColor: theme.primaryColor || 'hsl(var(--primary))' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center mr-3">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-medium text-sm" data-testid="text-chat-title">{businessName}</h4>
                  <p className="text-xs opacity-90">Online now</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground/80 hover:text-primary-foreground h-auto p-1"
                data-testid="button-close-chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="p-0 h-64 overflow-y-auto bg-background">
            <div className="p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'customer' ? 'justify-end' : 'items-start'}`}
                >
                  {message.sender === 'ai' && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <Bot className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-lg max-w-xs ${
                      message.sender === 'customer'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm" data-testid={`message-${message.id}`}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 text-sm"
                data-testid="input-chat-message"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                style={{ backgroundColor: theme.primaryColor }}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
