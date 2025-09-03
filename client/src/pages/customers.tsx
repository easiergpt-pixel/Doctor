import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Filter, Mail, Phone, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function Customers() {
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

  const { data: customers, isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const filteredCustomers = customers?.filter((customer: any) =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  ) || [];

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'whatsapp':
        return <Badge variant="default" className="bg-green-500">WhatsApp</Badge>;
      case 'website':
        return <Badge variant="secondary" className="bg-purple-500 text-white">Website</Badge>;
      case 'facebook':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Messenger</Badge>;
      case 'instagram':
        return <Badge variant="outline" className="border-pink-500 text-pink-600">Instagram</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
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
      <Sidebar isOpen={false} onToggle={() => {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Customers" 
          subtitle="Manage your customer database and relationships"
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-10 w-10 text-primary" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-customers">
                        {customers?.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <MessageSquare className="h-10 w-10 text-chart-2" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">From WhatsApp</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-whatsapp-customers">
                        {customers?.filter((c: any) => c.source === 'whatsapp').length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Mail className="h-10 w-10 text-chart-4" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">From Website</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-website-customers">
                        {customers?.filter((c: any) => c.source === 'website').length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Phone className="h-10 w-10 text-chart-1" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">With Contact Info</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-contacted-customers">
                        {customers?.filter((c: any) => c.email || c.phone).length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search customers by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-customers"
                />
              </div>
              <Button variant="outline" data-testid="button-filter">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" data-testid="button-export">
                Export CSV
              </Button>
            </div>

            {/* Customers List */}
            {customersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchTerm ? "No customers found" : "No customers yet"}
                  </h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm 
                      ? "No customers match your search criteria." 
                      : "Customer profiles will be created automatically when they start conversations with your AI receptionist."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCustomers.map((customer: any) => (
                  <Card key={customer.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground" data-testid={`text-customer-name-${customer.id}`}>
                              {customer.name || "Unknown Customer"}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1">
                              {customer.email && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Mail className="h-4 w-4 mr-1" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Phone className="h-4 w-4 mr-1" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {getSourceBadge(customer.source)}
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Customer since
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                toast({
                                  title: "Customer Profile",
                                  description: `Viewing profile for ${customer.name || 'Unknown Customer'}`,
                                });
                                // TODO: Navigate to customer detail page or open modal
                              }}
                              data-testid={`button-view-customer-${customer.id}`}
                            >
                              View Profile
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                toast({
                                  title: "Start Conversation",
                                  description: `Starting conversation with ${customer.name || 'Unknown Customer'}`,
                                });
                                // TODO: Navigate to conversation or create new conversation
                              }}
                              data-testid={`button-message-customer-${customer.id}`}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Customer metadata */}
                      {customer.metadata && Object.keys(customer.metadata).length > 0 && (
                        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                          <h4 className="text-sm font-medium text-foreground mb-2">Additional Information</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(customer.metadata).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}: </span>
                                <span className="text-foreground">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
