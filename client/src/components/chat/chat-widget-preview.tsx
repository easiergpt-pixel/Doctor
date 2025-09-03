import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Code, User, Send } from "lucide-react";

export default function ChatWidgetPreview() {
  return (
    <Card className="fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Website Chat Widget Preview</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-embed-code">
            <Code className="h-4 w-4 mr-2" />
            Get Embed Code
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chat Widget Mockup */}
        <div className="bg-muted/30 rounded-lg p-4 h-80 relative">
          {/* Simulated website background */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 rounded-lg"></div>
          
          {/* Chat Widget */}
          <div className="absolute bottom-4 right-4 w-80 bg-card border border-border rounded-lg shadow-lg">
            {/* Widget Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center mr-3">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm" data-testid="text-preview-title">
                      AI Assistant
                    </h4>
                    <p className="text-xs opacity-90">Online now</p>
                  </div>
                </div>
                <button className="text-primary-foreground/80 hover:text-primary-foreground">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="p-4 h-64 overflow-y-auto bg-background">
              <div className="space-y-3">
                {/* Bot Message */}
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg max-w-xs">
                    <p className="text-sm text-foreground" data-testid="text-preview-welcome">
                      Hello! I'm your AI assistant. How can I help you today?
                    </p>
                  </div>
                </div>
                
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-primary p-3 rounded-lg max-w-xs">
                    <p className="text-sm text-primary-foreground">
                      I'd like to book an appointment
                    </p>
                  </div>
                </div>
                
                {/* Bot Response */}
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg max-w-xs">
                    <p className="text-sm text-foreground">
                      I'd be happy to help you book an appointment! What type of service are you looking for?
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type your message..."
                  className="flex-1 text-sm"
                  readOnly
                  data-testid="input-preview-message"
                />
                <Button size="sm" data-testid="button-preview-send">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Widget Features */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border border-border rounded-lg">
            <Bot className="h-8 w-8 text-primary mx-auto mb-2" />
            <h4 className="font-medium text-foreground">AI-Powered</h4>
            <p className="text-sm text-muted-foreground">Smart responses using GPT-5</p>
          </div>
          
          <div className="text-center p-4 border border-border rounded-lg">
            <User className="h-8 w-8 text-chart-2 mx-auto mb-2" />
            <h4 className="font-medium text-foreground">24/7 Available</h4>
            <p className="text-sm text-muted-foreground">Always ready to help customers</p>
          </div>
          
          <div className="text-center p-4 border border-border rounded-lg">
            <Code className="h-8 w-8 text-chart-4 mx-auto mb-2" />
            <h4 className="font-medium text-foreground">Easy Integration</h4>
            <p className="text-sm text-muted-foreground">One-line embed code</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
