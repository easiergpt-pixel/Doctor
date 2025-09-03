import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { Link } from "wouter";

export default function Notifications() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [filter, setFilter] = useState("all");

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

  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });

  const { data: bookings } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const { data: reminderPreferences } = useQuery({
    queryKey: ["/api/reminder-preferences"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Generate notifications from actual data
  const notifications = [
    // Upcoming bookings (next 24 hours)
    ...(Array.isArray(bookings) ? bookings
      .filter((booking: any) => {
        if (!booking.dateTime || booking.status === 'cancelled') return false;
        const bookingDate = new Date(booking.dateTime);
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return bookingDate >= now && bookingDate <= tomorrow;
      })
      .map((booking: any) => ({
        id: `booking-${booking.id}`,
        type: 'booking',
        title: 'Upcoming Appointment',
        message: `${booking.service || 'Appointment'} with ${booking.customerName || 'customer'}`,
        time: booking.dateTime,
        priority: isToday(new Date(booking.dateTime)) ? 'high' : 'medium',
        status: booking.status,
      })) : []),

    // Recent conversations (active in last 24 hours)
    ...(Array.isArray(conversations) ? conversations
      .filter((conv: any) => {
        if (conv.status !== 'active') return false;
        if (!conv.lastMessageAt) return true;
        const lastMessage = new Date(conv.lastMessageAt);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastMessage > oneDayAgo;
      })
      .slice(0, 5) // Limit to 5 recent conversations
      .map((conv: any) => ({
        id: `conversation-${conv.id}`,
        type: 'conversation',
        title: 'Active Conversation',
        message: `New activity in ${conv.channelName || conv.channel} conversation`,
        time: conv.lastMessageAt || conv.createdAt,
        priority: 'medium',
        status: conv.status,
      })) : []),

    // Pending bookings needing confirmation
    ...(Array.isArray(bookings) ? bookings
      .filter((booking: any) => booking.status === 'pending')
      .slice(0, 3) // Limit to 3 pending bookings
      .map((booking: any) => ({
        id: `pending-${booking.id}`,
        type: 'pending',
        title: 'Booking Needs Confirmation',
        message: `${booking.service || 'Service'} appointment requires confirmation`,
        time: booking.createdAt,
        priority: 'high',
        status: booking.status,
      })) : []),
  ];

  // Sort notifications by priority and time
  const sortedNotifications = notifications.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });

  const filteredNotifications = filter === "all" 
    ? sortedNotifications 
    : sortedNotifications.filter(n => n.type === filter);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'conversation': return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'pending': return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default: return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-950';
      case 'medium': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950';
      case 'low': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getTimeDisplay = (time: string) => {
    const date = new Date(time);
    if (isToday(date)) {
      return `Today ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE HH:mm');
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={false} onToggle={() => {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Notifications" 
          subtitle="Stay updated with your AI receptionist activities"
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              <div className="flex items-center space-x-4">
                <Link href="/reminder-settings">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Reminder Settings
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: "All notifications marked as read",
                    description: "Your notification list has been cleared.",
                  });
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2">
              {[
                { key: "all", label: "All", count: sortedNotifications.length },
                { key: "booking", label: "Bookings", count: sortedNotifications.filter(n => n.type === 'booking').length },
                { key: "conversation", label: "Conversations", count: sortedNotifications.filter(n => n.type === 'conversation').length },
                { key: "pending", label: "Pending", count: sortedNotifications.filter(n => n.type === 'pending').length },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  variant={filter === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(tab.key)}
                  data-testid={`filter-${tab.key}`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {tab.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No notifications
                  </h3>
                  <p className="text-muted-foreground text-center">
                    You're all caught up! New notifications will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`border-l-4 ${getPriorityColor(notification.priority)} hover:shadow-md transition-shadow cursor-pointer`}
                    onClick={() => {
                      if (notification.type === 'conversation') {
                        window.location.href = '/conversations';
                      } else if (notification.type === 'booking' || notification.type === 'pending') {
                        window.location.href = '/bookings';
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getNotificationIcon(notification.type)}
                          <div>
                            <h4 className="font-medium text-foreground" data-testid={`notification-title-${notification.id}`}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {getTimeDisplay(notification.time)}
                            </span>
                          </div>
                          {notification.priority === 'high' && (
                            <Badge variant="destructive" className="mt-1">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/bookings">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      View All Bookings
                    </Button>
                  </Link>
                  <Link href="/conversations">
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Check Conversations
                    </Button>
                  </Link>
                  <Link href="/reminder-settings">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Notification Settings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}