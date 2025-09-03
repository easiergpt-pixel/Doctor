import { Button } from "@/components/ui/button";
import { Bell, Moon, Plus, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
  
  // Calculate notification count
  const unreadConversations = Array.isArray(conversations) ? conversations.filter((c: any) => !c.isRead).length : 0;
  const pendingBookings = Array.isArray(bookings) ? bookings.filter((b: any) => b.status === 'pending').length : 0;
  const totalNotifications = unreadConversations + pendingBookings;
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
          <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {totalNotifications > 99 ? '99+' : totalNotifications}
              </span>
            )}
          </Button>
          
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
