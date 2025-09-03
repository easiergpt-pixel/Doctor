import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Smartphone, 
  Globe, 
  Facebook, 
  Instagram, 
  Settings,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const channelFormSchema = z.object({
  type: z.string().min(1, "Channel type is required"),
  name: z.string().min(1, "Channel name is required"),
  config: z.object({}).optional(),
});

export default function Channels() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ["/api/channels"],
    enabled: isAuthenticated,
  });

  const form = useForm<z.infer<typeof channelFormSchema>>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      type: "",
      name: "",
      config: {},
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: z.infer<typeof channelFormSchema>) => {
      await apiRequest("POST", "/api/channels", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "Success",
        description: "Channel created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof channelFormSchema>) => {
    createChannelMutation.mutate(data);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <Smartphone className="h-6 w-6 text-green-500" />;
      case 'website':
        return <Globe className="h-6 w-6 text-purple-600" />;
      case 'facebook':
        return <Facebook className="h-6 w-6 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-6 w-6 text-pink-500" />;
      default:
        return <Settings className="h-6 w-6 text-gray-500" />;
    }
  };

  const getChannelStatus = (channel: any) => {
    // For demo purposes, website is always active, others need setup
    if (channel.type === 'website' || channel.isActive) {
      return { status: 'active', label: 'Active', variant: 'default' as const };
    }
    return { status: 'setup_required', label: 'Setup Required', variant: 'secondary' as const };
  };

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
          title="Channels" 
          subtitle="Manage your communication channels and integrations"
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Add Channel Button */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Connected Channels</h2>
                <p className="text-muted-foreground">Connect and manage your customer communication channels</p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-channel">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Channel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Channel</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Channel Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-channel-type">
                                  <SelectValue placeholder="Select channel type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="website">Website Widget</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp Business</SelectItem>
                                <SelectItem value="facebook">Facebook Messenger</SelectItem>
                                <SelectItem value="instagram">Instagram DM</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Channel Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Main Website, Support WhatsApp" 
                                {...field} 
                                data-testid="input-channel-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createChannelMutation.isPending}
                          data-testid="button-create-channel"
                        >
                          {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Channels Grid */}
            {channelsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : channels?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No channels configured</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Add your first communication channel to start receiving customer messages.
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-channel">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Channel
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels?.map((channel: any) => {
                  const { status, label, variant } = getChannelStatus(channel);
                  
                  return (
                    <Card key={channel.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getChannelIcon(channel.type)}
                            <div>
                              <CardTitle className="text-lg" data-testid={`text-channel-name-${channel.id}`}>
                                {channel.name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground capitalize">
                                {channel.type.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                          <Badge variant={variant}>
                            {status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                            {label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {status === 'active' ? (
                            <div className="text-sm text-muted-foreground">
                              <p>Status: Ready to receive messages</p>
                              <p>Created: {new Date(channel.createdAt).toLocaleDateString()}</p>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <p>Configuration required to activate this channel</p>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              data-testid={`button-configure-${channel.id}`}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                            {channel.type === 'website' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-embed-code-${channel.id}`}
                              >
                                Embed Code
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Setup Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Setup Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Website Widget</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Add a chat widget to your website for instant customer support.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Copy the embed code</li>
                      <li>• Paste before closing &lt;/body&gt; tag</li>
                      <li>• Customize appearance in settings</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">WhatsApp Business</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Connect your WhatsApp Business account for messaging.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• WhatsApp Business account required</li>
                      <li>• Facebook Business Manager access</li>
                      <li>• API approval process (5-7 days)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Facebook Messenger</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Integrate Facebook Messenger for your page.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Facebook Page required</li>
                      <li>• Admin access to page</li>
                      <li>• App review for advanced features</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Instagram DM</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Connect Instagram Direct Messages to your AI.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Instagram Business account</li>
                      <li>• Connected to Facebook Page</li>
                      <li>• Messenger API integration</li>
                    </ul>
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
