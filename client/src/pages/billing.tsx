import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  Zap,
  Settings,
  BarChart3,
  FileDown,
  Crown
} from "lucide-react";

export default function Billing() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [manageSubscriptionOpen, setManageSubscriptionOpen] = useState(false);
  const [usageDetailsOpen, setUsageDetailsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

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

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    enabled: isAuthenticated,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-subscription");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Activated",
        description: "Your local subscription has been activated!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isSubscribed = (user as any)?.subscriptionStatus === 'active';
  const currentPlan = isSubscribed ? 'Professional' : 'Free Trial';
  const monthlyLimit = isSubscribed ? 5000 : 100;
  
  // Calculate actual monthly usage from conversations and messages
  const dailyTokens = (stats as any)?.tokensUsed || 0;
  const totalConversations = (stats as any)?.totalConversations || 0;
  
  // Estimate monthly usage based on conversations (assuming avg 10 messages per conversation)
  const estimatedMonthlyUsage = Math.max(totalConversations * 10, dailyTokens * 30);
  const currentUsage = Math.min(estimatedMonthlyUsage, monthlyLimit);
  const usagePercentage = Math.min((currentUsage / monthlyLimit) * 100, 100);
  
  // Calculate monthly cost based on subscription
  const dailyCost = parseFloat((stats as any)?.cost || "0.00");
  const subscriptionMonthlyCost = isSubscribed ? 49.99 : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Billing & Subscription" 
          subtitle="Manage your subscription and monitor usage"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Current Plan Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-primary" />
                        Current Plan: {currentPlan}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        {isSubscribed ? 'Active subscription' : 'Trial period'}
                      </p>
                    </div>
                    <Badge variant={isSubscribed ? "default" : "secondary"}>
                      {isSubscribed ? "Active" : "Trial"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Monthly Message Usage</span>
                        <span>{currentUsage.toLocaleString()} / {monthlyLimit.toLocaleString()}</span>
                      </div>
                      <Progress value={usagePercentage} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold text-foreground">{(stats as any)?.totalConversations || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Conversations</p>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold text-foreground">${subscriptionMonthlyCost.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Estimated Monthly Cost</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!isSubscribed ? (
                    <Button 
                      className="w-full" 
                      onClick={() => createSubscriptionMutation.mutate()}
                      disabled={createSubscriptionMutation.isPending}
                      data-testid="button-upgrade"
                    >
                      {createSubscriptionMutation.isPending ? "Processing..." : "Upgrade to Pro"}
                    </Button>
                  ) : (
                    <Dialog open={manageSubscriptionOpen} onOpenChange={setManageSubscriptionOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          data-testid="button-manage"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Subscription
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Manage Subscription</DialogTitle>
                          <DialogDescription>
                            Change your subscription plan or manage billing preferences.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Current Plan: Professional</label>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700 dark:text-green-300">Active until next billing cycle</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Change Plan</label>
                            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select new plan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free Trial (100 msgs/month)</SelectItem>
                                <SelectItem value="professional">Professional (5000 msgs/month) - Current</SelectItem>
                                <SelectItem value="enterprise">Enterprise (Unlimited) - Contact Sales</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setManageSubscriptionOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => {
                              if (selectedPlan && selectedPlan !== "professional") {
                                toast({
                                  title: "Plan Change Requested",
                                  description: selectedPlan === "enterprise" ? "Our team will contact you about Enterprise plans." : "Plan will be changed at next billing cycle.",
                                });
                                setManageSubscriptionOpen(false);
                              }
                            }}
                            disabled={!selectedPlan || selectedPlan === "professional"}
                          >
                            Apply Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Dialog open={usageDetailsOpen} onOpenChange={setUsageDetailsOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        data-testid="button-usage"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Usage Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Usage Details</DialogTitle>
                        <DialogDescription>
                          Detailed breakdown of your AI receptionist usage this month.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-500">Messages Processed</div>
                            <div className="text-2xl font-bold">{currentUsage.toLocaleString()}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-500">Monthly Limit</div>
                            <div className="text-2xl font-bold">{monthlyLimit.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Usage Progress</span>
                            <span>{Math.round(usagePercentage)}%</span>
                          </div>
                          <Progress value={usagePercentage} className="h-3" />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Telegram Messages</span>
                              <span className="text-sm">{currentUsage.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg opacity-50">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">WhatsApp Messages</span>
                              <span className="text-sm">0</span>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg opacity-50">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Website Chat</span>
                              <span className="text-sm">0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setUsageDetailsOpen(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // Generate and download invoice
                      const invoiceData = {
                        date: new Date().toISOString().split('T')[0],
                        plan: currentPlan,
                        amount: currentPlan === 'Professional' ? '$49.99' : '$0.00',
                        usage: `${currentUsage.toLocaleString()} / ${monthlyLimit.toLocaleString()} messages`,
                        period: `${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString()} - ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString()}`
                      };
                      
                      const invoiceText = `
AI Receptionist Invoice
======================

Date: ${invoiceData.date}
Plan: ${invoiceData.plan}
Billing Period: ${invoiceData.period}
Usage: ${invoiceData.usage}
Amount: ${invoiceData.amount}

Thank you for using AI Receptionist!
`;
                      
                      const blob = new Blob([invoiceText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `invoice-${invoiceData.date}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Invoice Downloaded",
                        description: `Invoice for ${invoiceData.period} has been downloaded.`,
                      });
                    }}
                    data-testid="button-invoices"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Invoices
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Local Subscription Info */}
            {!isSubscribed && (
              <Card>
                <CardHeader>
                  <CardTitle>Local Subscription Management</CardTitle>
                  <p className="text-muted-foreground">
                    Manage your subscription locally without external payment processing
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Click "Upgrade to Pro" above to activate your professional subscription locally. 
                      This demo system tracks your usage and subscription status without requiring payment processing.
                    </p>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium text-foreground mb-2">Current Status</h4>
                      <p className="text-sm text-muted-foreground">
                        You are currently on the Free Trial plan. Upgrade to Professional to unlock unlimited features.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Plans */}
            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <p className="text-muted-foreground">
                  Choose the plan that best fits your business needs
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Starter Plan */}
                  <div className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground">Starter</h3>
                      <div className="text-3xl font-bold text-foreground mt-2">
                        $29<span className="text-lg text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-muted-foreground mt-2">Perfect for small businesses</p>
                    </div>
                    
                    <ul className="space-y-3 mt-6">
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>1,000 messages/month</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>2 connected channels</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Basic analytics</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Email support</span>
                      </li>
                    </ul>
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-6" 
                      onClick={() => {
                        toast({
                          title: "Plan Selection",
                          description: "Starter plan features are already included in your current subscription.",
                        });
                      }}
                      data-testid="button-starter"
                    >
                      Select Plan
                    </Button>
                  </div>

                  {/* Professional Plan */}
                  <div className="border border-primary rounded-lg p-6 shadow-md relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground">Professional</h3>
                      <div className="text-3xl font-bold text-foreground mt-2">
                        $49.99<span className="text-lg text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-muted-foreground mt-2">For growing businesses</p>
                    </div>
                    
                    <ul className="space-y-3 mt-6">
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>5,000 messages/month</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Unlimited channels</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Advanced analytics</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Priority support</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Custom AI training</span>
                      </li>
                    </ul>
                    
                    <Button 
                      variant={isSubscribed ? 'default' : 'default'}
                      className="w-full mt-6" 
                      onClick={() => {
                        if (!isSubscribed) {
                          createSubscriptionMutation.mutate();
                          toast({
                            title: "Upgrading to Professional",
                            description: "Processing your upgrade to Professional plan...",
                          });
                        }
                      }}
                      disabled={createSubscriptionMutation.isPending || isSubscribed}
                      data-testid="button-professional"
                    >
                      {isSubscribed ? '✓ Current Plan' : createSubscriptionMutation.isPending ? 'Processing...' : 'Upgrade Now'}
                    </Button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground">Enterprise</h3>
                      <div className="text-3xl font-bold text-foreground mt-2">
                        $199<span className="text-lg text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-muted-foreground mt-2">For large organizations</p>
                    </div>
                    
                    <ul className="space-y-3 mt-6">
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>20,000 messages/month</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Unlimited channels</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Advanced analytics</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>24/7 phone support</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span>Custom integrations</span>
                      </li>
                    </ul>
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-6" 
                      onClick={() => {
                        toast({
                          title: "Contact Sales",
                          description: "Our sales team will contact you within 24 hours to discuss Enterprise plans.",
                        });
                      }}
                      data-testid="button-enterprise"
                    >
                      Contact Sales
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <DollarSign className="h-8 w-8 text-chart-1 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">${(stats as any)?.cost || "0.00"}</p>
                    <p className="text-sm text-muted-foreground">Current Month Cost</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <Clock className="h-8 w-8 text-chart-2 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{dailyTokens.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Daily AI Tokens</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <Calendar className="h-8 w-8 text-chart-4 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{Math.max(0, monthlyLimit - currentUsage).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Messages Remaining</p>
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
