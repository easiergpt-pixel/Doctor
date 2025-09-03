import { Button } from "@/components/ui/button";
import { Bell, Moon, Plus, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface HeaderProps {
  title: string;
  subtitle: string;
  onMenuToggle?: () => void;
}

export default function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  
  // Fetch pending reminders and notifications
  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
  });
  
  const { data: bookings } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });
  
  // Calculate notification count - only truly unread/pending items
  // For conversations: only recent active ones (last 24 hours)
  const recentActiveConversations = Array.isArray(conversations) ? conversations.filter((c: any) => {
    if (c.status !== 'active') return false;
    if (!c.lastMessageAt) return true; // No messages yet, count as unread
    const lastMessage = new Date(c.lastMessageAt);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastMessage > oneDayAgo;
  }).length : 0;
  
  const pendingBookings = Array.isArray(bookings) ? bookings.filter((b: any) => b.status === 'pending').length : 0;
  
  // Cap notifications to prevent overwhelming display
  const totalNotifications = Math.min(recentActiveConversations + pendingBookings, 99);
  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        {onMenuToggle && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden mr-2" 
            onClick={onMenuToggle}
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground truncate" data-testid="text-header-title">{title}</h2>
          <p className="text-sm text-muted-foreground truncate" data-testid="text-header-subtitle">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Notification Bell */}
          <Link href="/reminder-settings">
            <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
              <Bell className="h-5 w-5" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {totalNotifications > 99 ? '99+' : totalNotifications}
                </span>
              )}
            </Button>
          </Link>
          
          {/* Theme Toggle */}
          <Button variant="ghost" size="sm" data-testid="button-theme-toggle">
            <Moon className="h-5 w-5" />
          </Button>

          {/* Quick Actions */}
          <Button size="sm" className="hidden sm:flex" data-testid="button-quick-action">
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
          <Button size="sm" className="sm:hidden" data-testid="button-quick-action-mobile">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
