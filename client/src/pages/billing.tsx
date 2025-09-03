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
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";

export default function Billing() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

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

  const isSubscribed = user?.subscriptionStatus === 'active';
  const currentPlan = isSubscribed ? 'Professional' : 'Free Trial';
  const monthlyLimit = isSubscribed ? 5000 : 100;
  const currentUsage = stats?.tokensUsed || 0;
  const usagePercentage = Math.min((currentUsage / monthlyLimit) * 100, 100);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Billing & Subscription" 
          subtitle="Manage your subscription and monitor usage"
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
                        <p className="text-2xl font-bold text-foreground">{stats?.totalConversations || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Conversations</p>
                      </div>
                      <div className="text-center p-4 bg-muted/30 rounded-lg">
                        <p className="text-2xl font-bold text-foreground">${stats?.cost || "0.00"}</p>
                        <p className="text-sm text-muted-foreground">This Month Cost</p>
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
                    <Button variant="outline" className="w-full" data-testid="button-manage">
                      Manage Subscription
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" data-testid="button-usage">
                    View Usage Details
                  </Button>
                  <Button variant="outline" className="w-full" data-testid="button-invoices">
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
                    
                    <Button variant="outline" className="w-full mt-6" data-testid="button-starter">
                      {currentPlan === 'Starter' ? 'Current Plan' : 'Select Plan'}
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
                        $79<span className="text-lg text-muted-foreground">/mo</span>
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
                      className="w-full mt-6" 
                      onClick={() => !isSubscribed && createSubscriptionMutation.mutate()}
                      disabled={createSubscriptionMutation.isPending}
                      data-testid="button-professional"
                    >
                      {isSubscribed ? 'Current Plan' : 'Upgrade Now'}
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
                    
                    <Button variant="outline" className="w-full mt-6" data-testid="button-enterprise">
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
                    <p className="text-2xl font-bold text-foreground">${stats?.cost || "0.00"}</p>
                    <p className="text-sm text-muted-foreground">Current Month Cost</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <Clock className="h-8 w-8 text-chart-2 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stats?.tokensUsed || 0}</p>
                    <p className="text-sm text-muted-foreground">AI Tokens Used</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <Calendar className="h-8 w-8 text-chart-4 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{Math.ceil((monthlyLimit - currentUsage) / 30)}</p>
                    <p className="text-sm text-muted-foreground">Avg. Daily Budget</p>
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
