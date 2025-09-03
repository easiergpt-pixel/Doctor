import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, Plus, Edit, Phone, Mail, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  format, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek
} from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CalendarView = 'month' | 'week' | 'year';

const bookingSchema = z.object({
  service: z.string().min(1, "Service is required"),
  dateTime: z.string().min(1, "Date and time are required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).default("pending"),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function Bookings() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Redirect if not authenticated
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

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service: "",
      dateTime: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      notes: "",
      status: "pending",
    },
  });

  // Fetch bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['/api/bookings'],
    enabled: isAuthenticated && !isLoading,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: BookingFormData) => apiRequest('POST', '/api/bookings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({ title: "Success", description: "Booking created successfully!" });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & BookingFormData) => 
      apiRequest('PUT', `/api/bookings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({ title: "Success", description: "Booking updated successfully!" });
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error?.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    if (selectedBooking) {
      updateBookingMutation.mutate({ id: selectedBooking.id, ...data });
    } else {
      createBookingMutation.mutate(data);
    }
  };

  // Today's bookings for quick view
  const todaysBookings = Array.isArray(bookings) ? bookings.filter((booking: any) => {
    if (!booking.dateTime) return false;
    try {
      const bookingDate = parseISO(booking.dateTime);
      return isToday(bookingDate);
    } catch {
      return false;
    }
  }) : [];

  // Helper to get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    return Array.isArray(bookings) ? bookings.filter((booking: any) => {
      if (!booking.dateTime) return false;
      try {
        const bookingDate = parseISO(booking.dateTime);
        return bookingDate && isSameDay(bookingDate, date);
      } catch {
        return false;
      }
    }) : [];
  };

  // Get booking colors based on service type and status
  const getBookingColor = (booking: any) => {
    const service = booking.service?.toLowerCase() || '';
    const status = booking.status || 'pending';
    
    // Service-based colors
    if (service.includes('diş') || service.includes('dental') || service.includes('tooth')) {
      return status === 'confirmed' ? 'bg-blue-500 text-white border-blue-600' : 'bg-blue-200 text-blue-800 border-blue-300';
    } else if (service.includes('göz') || service.includes('eye')) {
      return status === 'confirmed' ? 'bg-green-500 text-white border-green-600' : 'bg-green-200 text-green-800 border-green-300';
    } else if (service.includes('qalb') || service.includes('heart') || service.includes('kardio')) {
      return status === 'confirmed' ? 'bg-red-500 text-white border-red-600' : 'bg-red-200 text-red-800 border-red-300';
    } else if (service.includes('dəri') || service.includes('skin') || service.includes('dermato')) {
      return status === 'confirmed' ? 'bg-purple-500 text-white border-purple-600' : 'bg-purple-200 text-purple-800 border-purple-300';
    } else {
      // Default colors based on status
      switch (status) {
        case 'confirmed': return 'bg-emerald-500 text-white border-emerald-600';
        case 'pending': return 'bg-amber-200 text-amber-800 border-amber-300';
        case 'cancelled': return 'bg-gray-400 text-white border-gray-500';
        default: return 'bg-indigo-200 text-indigo-800 border-indigo-300';
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200';
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200';
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
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Bookings & Calendar" 
          subtitle="Manage appointments and calendar view"
          onMenuToggle={() => setSidebarOpen(true)} 
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Bookings & Calendar</h1>
            
            <div className="flex items-center gap-4">
              <Select value={calendarView} onValueChange={(value) => setCalendarView(value as CalendarView)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-booking">
                    <Plus className="h-4 w-4 mr-2" />
                    New Booking
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Booking</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="service"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-service" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="dateTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date & Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field} 
                                data-testid="input-datetime"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-customer-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Phone</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-customer-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Email</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-customer-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea {...field} data-testid="input-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="submit" 
                          disabled={createBookingMutation.isPending}
                          data-testid="button-save-booking"
                        >
                          {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Calendar Navigation */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <h2 className="text-lg font-semibold">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="mb-4"
                data-testid="button-today"
              >
                Today
              </Button>
            </CardContent>
          </Card>

          {/* Calendar Grid */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              {calendarView === 'month' && (
                <>
                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-px mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-px">
                    {eachDayOfInterval({
                      start: startOfWeek(startOfMonth(currentDate)),
                      end: endOfWeek(endOfMonth(currentDate))
                    }).map((date) => {
                      const dayBookings = getBookingsForDate(date);
                      const isCurrentMonth = isSameMonth(date, currentDate);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const isToday = isSameDay(date, new Date());
                      
                      return (
                        <div
                          key={date.toISOString()}
                          className={`min-h-[120px] p-2 border cursor-pointer transition-colors ${
                            !isCurrentMonth 
                              ? 'bg-muted/30 text-muted-foreground' 
                              : isSelected
                                ? 'bg-primary/20 border-primary'
                                : isToday
                                  ? 'bg-accent border-accent-foreground'
                                  : 'bg-background hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedDate(date)}
                          data-testid={`calendar-date-${format(date, 'yyyy-MM-dd')}`}
                        >
                          <div className="text-sm font-medium mb-1">
                            {format(date, 'd')}
                          </div>
                          
                          {/* Day's Bookings */}
                          <div className="space-y-1">
                            {dayBookings.slice(0, 3).map((booking: any) => (
                              <div
                                key={booking.id}
                                className={`text-xs p-2 rounded-md cursor-pointer border transition-all hover:scale-105 hover:shadow-md ${getBookingColor(booking)}`}
                                title={`${booking.service} - ${booking.customerName || 'Unknown'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(booking);
                                }}
                                data-testid={`appointment-${booking.id}`}
                              >
                                <div className="font-medium">{booking.dateTime ? format(parseISO(booking.dateTime), 'HH:mm') : 'N/A'}</div>
                                <div className="truncate">{booking.service?.slice(0, 12) || 'Service'}</div>
                              </div>
                            ))}
                            {dayBookings.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{dayBookings.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const dayBookings = getBookingsForDate(selectedDate);
                  return dayBookings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No bookings scheduled for this date.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dayBookings.map((booking: any) => (
                        <div 
                          key={booking.id} 
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${getBookingColor(booking)}`}
                          onClick={() => setSelectedBooking(booking)}
                          data-testid={`booking-card-${booking.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-3 h-3 rounded-full bg-current opacity-80"></div>
                                <span className="font-bold text-lg">
                                  {booking.dateTime ? format(parseISO(booking.dateTime), 'HH:mm') : 'N/A'}
                                </span>
                                <Badge className={`${getStatusColor(booking.status)} font-medium`}>
                                  {booking.status?.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span className="font-medium">{booking.service || 'General Service'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{booking.customerName || 'Anonymous'}</span>
                                </div>
                                {booking.customerPhone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{booking.customerPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Selected Appointment Details Modal */}
          {selectedBooking && (
            <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Appointment Details
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Time & Date */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">
                        {selectedBooking.dateTime ? format(parseISO(selectedBooking.dateTime), 'HH:mm') : 'N/A'}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedBooking.dateTime ? format(parseISO(selectedBooking.dateTime), 'EEEE, MMMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <Badge className={`ml-auto ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status?.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Service & Customer */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Service</p>
                        <p className="text-lg">{selectedBooking.service || 'General Consultation'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Customer</p>
                        <p className="text-lg">{selectedBooking.customerName || 'Anonymous'}</p>
                      </div>
                    </div>

                    {selectedBooking.customerPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <p className="text-lg">{selectedBooking.customerPhone}</p>
                        </div>
                      </div>
                    )}

                    {selectedBooking.customerEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email</p>
                          <p className="text-lg">{selectedBooking.customerEmail}</p>
                        </div>
                      </div>
                    )}

                    {selectedBooking.notes && (
                      <div className="p-4 bg-muted/20 rounded-lg">
                        <p className="font-medium mb-2">Notes</p>
                        <p className="text-muted-foreground">{selectedBooking.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            form.reset({
                              service: selectedBooking.service || "",
                              dateTime: selectedBooking.dateTime ? (function() {
                                try {
                                  return format(parseISO(selectedBooking.dateTime), "yyyy-MM-dd'T'HH:mm");
                                } catch {
                                  return "";
                                }
                              })() : "",
                              customerName: selectedBooking.customerName || "",
                              customerPhone: selectedBooking.customerPhone || "",
                              customerEmail: selectedBooking.customerEmail || "",
                              notes: selectedBooking.notes || "",
                              status: selectedBooking.status || "pending",
                            });
                          }}
                          data-testid="button-edit-appointment"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Appointment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Booking</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = form.getValues();
                            updateBookingMutation.mutate({ id: selectedBooking.id, ...formData });
                          }} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="service"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Service</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-service" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="dateTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date & Time</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="datetime-local" 
                                      {...field} 
                                      data-testid="input-datetime"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="customerName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Customer Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-customer-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-status">
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="confirmed">Confirmed</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="submit" 
                                disabled={updateBookingMutation.isPending}
                                data-testid="button-save-booking"
                              >
                                {updateBookingMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setSelectedBooking(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}