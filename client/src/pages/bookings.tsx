import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, Plus, Edit } from "lucide-react";
import { 
  format, 
  isToday, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  getWeeksInMonth,
  addWeeks,
  subWeeks,
  startOfYear,
  endOfYear
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

type CalendarView = 'month' | 'week' | 'year';

export default function Bookings() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);

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

  // Fetch bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const form = useForm({
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

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/bookings/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Booking updated successfully.",
      });
      setEditingBooking(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (editingBooking) {
      updateBookingMutation.mutate({ ...editingBooking, ...data });
    }
  };

  // Calendar navigation
  const navigateCalendar = (direction: 'prev' | 'next') => {
    if (calendarView === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else if (calendarView === 'year') {
      const newYear = direction === 'prev' ? currentDate.getFullYear() - 1 : currentDate.getFullYear() + 1;
      setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
    }
  };

  // Get calendar dates based on view
  const getCalendarDates = () => {
    if (calendarView === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else if (calendarView === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    } else {
      // Year view - show months
      const months = [];
      for (let i = 0; i < 12; i++) {
        months.push(new Date(currentDate.getFullYear(), i, 1));
      }
      return months;
    }
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter((booking: any) => {
      const bookingDate = booking.dateTime ? parseISO(booking.dateTime) : null;
      return bookingDate && isSameDay(bookingDate, date);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  const calendarDates = getCalendarDates();
  const currentDateFormat = calendarView === 'month' ? format(currentDate, 'MMMM yyyy') :
                           calendarView === 'week' ? format(currentDate, 'MMM dd, yyyy') :
                           format(currentDate, 'yyyy');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Booking Calendar"
          subtitle="Manage and view all your appointments"
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          {/* Calendar Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={calendarView === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalendarView('month')}
                data-testid="button-month-view"
              >
                Month
              </Button>
              <Button
                variant={calendarView === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalendarView('week')}
                data-testid="button-week-view"
              >
                Week
              </Button>
              <Button
                variant={calendarView === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCalendarView('year')}
                data-testid="button-year-view"
              >
                Year
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateCalendar('prev')}
                data-testid="button-prev-period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold min-w-48 text-center" data-testid="text-current-period">
                {currentDateFormat}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateCalendar('next')}
                data-testid="button-next-period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={() => setCurrentDate(new Date())}
                size="sm"
                data-testid="button-today"
              >
                Today
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {calendarView === 'year' ? (
                /* Year View - 12 Month Grid */
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {calendarDates.map((month, index) => {
                    const monthBookings = Array.isArray(bookings) ? bookings.filter((booking: any) => {
                      const bookingDate = booking.dateTime ? parseISO(booking.dateTime) : null;
                      return bookingDate && 
                             bookingDate.getMonth() === month.getMonth() && 
                             bookingDate.getFullYear() === month.getFullYear();
                    }).length : 0;

                    return (
                      <div 
                        key={index} 
                        className="p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => {
                          setCurrentDate(month);
                          setCalendarView('month');
                        }}
                        data-testid={`month-cell-${format(month, 'MMM')}`}
                      >
                        <div className="text-center">
                          <div className="font-medium text-sm mb-2">
                            {format(month, 'MMM')}
                          </div>
                          <div className="text-2xl text-muted-foreground">
                            {monthBookings}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            bookings
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Month/Week View - Calendar Grid */
                <>
                  {/* Week Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDates.map((date, index) => {
                      const dayBookings = getBookingsForDate(date);
                      const isCurrentMonth = isSameMonth(date, currentDate);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);

                      return (
                        <div
                          key={index}
                          className={`
                            min-h-24 p-1 border rounded-lg cursor-pointer transition-colors
                            ${isSelected ? 'bg-primary/20 border-primary' : 'hover:bg-muted/30'}
                            ${!isCurrentMonth ? 'opacity-50' : ''}
                            ${isToday(date) ? 'bg-primary/10 border-primary/30' : ''}
                          `}
                          onClick={() => setSelectedDate(isSelected ? null : date)}
                          data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
                        >
                          <div className="text-sm font-medium mb-1">
                            {format(date, 'd')}
                          </div>
                          
                          {/* Day's Bookings */}
                          <div className="space-y-1">
                            {dayBookings.slice(0, 3).map((booking: any) => (
                              <div
                                key={booking.id}
                                className={`text-xs p-1 rounded truncate ${getStatusColor(booking.status)}`}
                                title={`${booking.service} - ${booking.customerName || 'Unknown'}`}
                              >
                                {format(parseISO(booking.dateTime), 'HH:mm')} {booking.service?.slice(0, 10) || 'Service'}
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
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(parseISO(booking.dateTime), 'HH:mm')}
                              </span>
                              <Badge variant="secondary" className={getStatusColor(booking.status)}>
                                {booking.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div><strong>Service:</strong> {booking.service || 'N/A'}</div>
                              <div><strong>Customer:</strong> {booking.customerName || 'Unknown'}</div>
                              {booking.customerPhone && (
                                <div><strong>Phone:</strong> {booking.customerPhone}</div>
                              )}
                              {booking.notes && (
                                <div><strong>Notes:</strong> {booking.notes}</div>
                              )}
                            </div>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingBooking(booking);
                                  form.reset({
                                    service: booking.service || "",
                                    dateTime: booking.dateTime ? format(parseISO(booking.dateTime), "yyyy-MM-dd'T'HH:mm") : "",
                                    customerName: booking.customerName || "",
                                    customerPhone: booking.customerPhone || "",
                                    customerEmail: booking.customerEmail || "",
                                    notes: booking.notes || "",
                                    status: booking.status || "pending",
                                  });
                                }}
                                data-testid={`button-edit-${booking.id}`}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Booking</DialogTitle>
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
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}