import { Button } from "@/components/ui/button";
import { Bell, Moon, Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground" data-testid="text-header-title">{title}</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-header-subtitle">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          
          {/* Theme Toggle */}
          <Button variant="ghost" size="sm" data-testid="button-theme-toggle">
            <Moon className="h-5 w-5" />
          </Button>

          {/* Quick Actions */}
          <Button data-testid="button-quick-action">
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </div>
      </div>
    </header>
  );
}
