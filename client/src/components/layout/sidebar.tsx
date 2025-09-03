import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  Bot, 
  BarChart3, 
  MessageSquare, 
  Plug, 
  Calendar, 
  Users, 
  Brain,
  CreditCard,
  Settings,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    title: "Conversations",
    href: "/conversations",
    icon: MessageSquare,
    badge: 12,
  },
  {
    title: "Channels",
    href: "/channels",
    icon: Plug,
  },
  {
    title: "Bookings",
    href: "/bookings",
    icon: Calendar,
    badge: 3,
    badgeVariant: "secondary" as const,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "AI Training",
    href: "/ai-training",
    icon: Brain,
  },
];

const accountItems = [
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-card border-r border-border sidebar-transition">
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AI Receptionist</h1>
              <p className="text-xs text-muted-foreground">Business Automation</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = location === item.href;
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive 
                          ? "bg-accent text-accent-foreground" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <Badge 
                          variant={item.badgeVariant || "default"} 
                          className="ml-auto text-xs px-2 py-1"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8">
            <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Account
            </h4>
            <ul className="space-y-2">
              {accountItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <a 
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive 
                            ? "bg-accent text-accent-foreground" 
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        data-testid={`nav-${item.title.toLowerCase()}`}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.title}
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">
                {user?.businessName?.[0] || user?.firstName?.[0] || "U"}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-foreground" data-testid="text-business-name">
                {user?.businessName || `${user?.firstName || "User"}'s Business`}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.subscriptionStatus === 'active' ? 'Pro Plan' : 'Free Trial'}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
