import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle,
  Clock,
  Calendar,
  User,
  MessageSquare,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Booking {
  id: string;
  customerId: string;
  service: string;
  dateTime: string;
  status: string;
  notes: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  urgencyLevel: string;
  aiProposedSlots?: any;
  customerPreference?: string;
  ownerAction?: string;
  ownerComment?: string;
  createdAt: string;
}

export default function BookingApproval() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [filter, setFilter] = useState("pending");
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [newDateTime, setNewDateTime] = useState("");

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

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const { data: customers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const ownerActionMutation = useMutation({
    mutationFn: async ({ bookingId, action, comment }: { bookingId: string; action: string; comment?: string }) => {
      return await apiRequest("PATCH", `/api/bookings/${bookingId}/owner-action`, { action, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setSelectedBooking(null);
      setActionComment("");
      toast({
        title: "Action Completed",
        description: "Booking status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process booking action. Please try again.",
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

  const filteredBookings = Array.isArray(bookings) 
    ? bookings.filter(booking => {
        if (filter === "all") return true;
        return booking.status === filter;
      })
    : [];

  // Get customer data for a booking
  const getCustomerForBooking = (customerId: string) => {
    return Array.isArray(customers) 
      ? customers.find(c => c.id === customerId)
      : null;
  };

  const handleOwnerAction = (action: string) => {
    if (!selectedBooking) return;
    
    ownerActionMutation.mutate({
      bookingId: selectedBooking.id,
      action,
      comment: actionComment || undefined
    });
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-950';
      case 'normal': return 'text-blue-600 bg-blue-100 dark:bg-blue-950';
      case 'low': return 'text-gray-600 bg-gray-100 dark:bg-gray-950';
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-950';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
      case 'rescheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={false} onToggle={() => {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Booking Approvals" 
          subtitle="Review and manage pending booking requests"
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredBookings.filter(b => b.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {filteredBookings.filter(b => b.urgencyLevel === 'urgent').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Urgent</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredBookings.filter(b => b.status === 'confirmed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Confirmed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredBookings.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="pending">Pending ({filteredBookings.filter(b => b.status === 'pending').length})</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                <TabsTrigger value="all">All Bookings</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="mt-6">
                {filteredBookings.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No {filter} bookings
                      </h3>
                      <p className="text-muted-foreground text-center">
                        {filter === 'pending' 
                          ? "All caught up! No pending bookings require your attention."
                          : `No ${filter} bookings found.`
                        }
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBookings.map((booking) => {
                      const customer = getCustomerForBooking(booking.customerId);
                      
                      return (
                        <Card 
                          key={booking.id}
                          className={`cursor-pointer transition-all hover:shadow-lg border-l-4 ${
                            booking.urgencyLevel === 'urgent' 
                              ? 'border-l-red-500' 
                              : booking.status === 'pending'
                                ? 'border-l-yellow-500'
                                : 'border-l-blue-500'
                          }`}
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-medium">
                                {booking.service || 'General Appointment'}
                              </CardTitle>
                              <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                                {booking.urgencyLevel === 'urgent' && (
                                  <Badge className={getUrgencyColor(booking.urgencyLevel)}>
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Urgent
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            {/* Customer Info */}
                            <div className="flex items-center text-sm text-muted-foreground">
                              <User className="h-4 w-4 mr-2" />
                              <span>{customer?.name || 'Unknown Customer'}</span>
                            </div>

                            {/* Date & Time */}
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>
                                {booking.dateTime 
                                  ? format(new Date(booking.dateTime), 'MMM dd, yyyy HH:mm')
                                  : 'No specific time'
                                }
                              </span>
                            </div>

                            {/* Time Since Created */}
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>
                                {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
                              </span>
                            </div>

                            {/* Customer Preference */}
                            {booking.customerPreference && (
                              <div className="text-sm">
                                <div className="flex items-center text-muted-foreground mb-1">
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Customer Request:
                                </div>
                                <div className="text-foreground italic bg-muted p-2 rounded text-xs">
                                  "{booking.customerPreference}"
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {booking.notes && (
                              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                {booking.notes}
                              </div>
                            )}

                            {/* Quick Actions for Pending */}
                            {booking.status === 'pending' && (
                              <div className="flex space-x-2 pt-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBooking(booking);
                                    setTimeout(() => handleOwnerAction('approve'), 100);
                                  }}
                                  data-testid={`button-approve-${booking.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBooking(booking);
                                  }}
                                  data-testid={`button-review-${booking.id}`}
                                >
                                  Review
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Reschedule Dialog */}
            {showRescheduleDialog && selectedBooking && (
              <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-background border rounded-lg p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Reschedule Booking</h3>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowRescheduleDialog(false);
                      setNewDateTime("");
                    }}>
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Current Time</Label>
                      <div className="text-sm bg-muted p-2 rounded">
                        {selectedBooking.dateTime 
                          ? format(new Date(selectedBooking.dateTime), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')
                          : 'No specific time requested'
                        }
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="newDateTime">New Date & Time</Label>
                      <Input
                        id="newDateTime"
                        type="datetime-local"
                        value={newDateTime}
                        onChange={(e) => setNewDateTime(e.target.value)}
                        className="mt-1"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="rescheduleComment">Reason for Rescheduling</Label>
                      <Textarea
                        id="rescheduleComment"
                        placeholder="Explain why you need to reschedule (this will be sent to the customer)..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowRescheduleDialog(false);
                          setNewDateTime("");
                          setActionComment("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          if (newDateTime) {
                            const rescheduleComment = `${actionComment}${actionComment ? ' ' : ''}New time: ${format(new Date(newDateTime), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')}`;
                            setActionComment(rescheduleComment);
                            handleOwnerAction('reschedule');
                            setShowRescheduleDialog(false);
                            setNewDateTime("");
                          }
                        }}
                        disabled={!newDateTime || ownerActionMutation.isPending}
                      >
                        Confirm Reschedule
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Booking Detail Modal */}
            {selectedBooking && !showRescheduleDialog && (
              <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-background border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">
                      {selectedBooking.service || 'Booking Details'}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(null)}>
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Customer Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Customer Name</Label>
                        <div className="text-sm bg-muted p-2 rounded">
                          {getCustomerForBooking(selectedBooking.customerId)?.name || 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <Label>Contact</Label>
                        <div className="text-sm bg-muted p-2 rounded">
                          {getCustomerForBooking(selectedBooking.customerId)?.phone || 
                           getCustomerForBooking(selectedBooking.customerId)?.email || 'No contact info'}
                        </div>
                      </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Date & Time</Label>
                        <div className="text-sm bg-muted p-2 rounded">
                          {selectedBooking.dateTime 
                            ? format(new Date(selectedBooking.dateTime), 'EEEE, MMMM dd, yyyy \'at\' HH:mm')
                            : 'No specific time requested'
                          }
                        </div>
                      </div>
                      <div>
                        <Label>Status & Urgency</Label>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(selectedBooking.status)}>
                            {selectedBooking.status}
                          </Badge>
                          <Badge className={getUrgencyColor(selectedBooking.urgencyLevel)}>
                            {selectedBooking.urgencyLevel}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Customer Request */}
                    {selectedBooking.customerPreference && (
                      <div>
                        <Label>Customer's Original Request</Label>
                        <div className="text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded border-l-4 border-blue-500">
                          "{selectedBooking.customerPreference}"
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedBooking.notes && (
                      <div>
                        <Label>System Notes</Label>
                        <div className="text-sm bg-muted p-3 rounded">
                          {selectedBooking.notes}
                        </div>
                      </div>
                    )}

                    {/* Previous Owner Action */}
                    {selectedBooking.ownerAction && (
                      <div>
                        <Label>Previous Action</Label>
                        <div className="text-sm bg-gray-50 dark:bg-gray-950 p-3 rounded">
                          <div className="font-medium">Action: {selectedBooking.ownerAction}</div>
                          {selectedBooking.ownerComment && (
                            <div className="mt-1 text-muted-foreground">
                              Comment: {selectedBooking.ownerComment}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Comment */}
                    <div>
                      <Label htmlFor="actionComment">
                        Action Comment {selectedBooking.status === 'pending' ? '(Optional)' : '(Required for rejection/rescheduling)'}
                      </Label>
                      <Textarea
                        id="actionComment"
                        placeholder="Add a comment about your decision (this will be communicated to the customer)..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Action Buttons */}
                    {selectedBooking.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          className="flex-1"
                          onClick={() => handleOwnerAction('approve')}
                          disabled={ownerActionMutation.isPending}
                          data-testid="button-approve-booking"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Booking
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowRescheduleDialog(true)}
                          disabled={ownerActionMutation.isPending}
                          data-testid="button-reschedule-booking"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reschedule
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleOwnerAction('reject')}
                          disabled={ownerActionMutation.isPending}
                          data-testid="button-reject-booking"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}