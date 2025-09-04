import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Brain, 
  Bell, 
  Calendar,
  Bot,
  Settings as SettingsIcon,
  ChevronRight,
  User,
  Shield,
  Palette
} from "lucide-react";

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: any;
  badge?: string;
}

const settingsCards: SettingsCard[] = [
  {
    title: "AI Settings",
    description: "Configure AI responses, training data, and conversation behavior",
    href: "/ai-settings",
    icon: Brain,
  },
  {
    title: "Reminder Settings",
    description: "Set up email and SMS reminders for appointments and follow-ups",
    href: "/reminder-settings", 
    icon: Bell,
  },
  {
    title: "Schedule Settings",
    description: "Manage your availability, working hours, and booking preferences",
    href: "/schedule-settings",
    icon: Calendar,
  },
];

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isLoading && !isAuthenticated) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 lg:ml-0">
          <Header 
            title="Settings" 
            subtitle="Manage your AI Receptionist configuration"
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          
          <div className="p-6">
            {/* Settings Overview */}
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                  <p className="text-muted-foreground">
                    Configure your AI Receptionist to match your business needs
                  </p>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                    <p className="text-foreground mt-1">
                      {(user as any)?.businessName || `${(user as any)?.firstName || "User"}'s Business`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-foreground mt-1">{(user as any)?.email || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plan</label>
                    <p className="text-foreground mt-1">
                      {(user as any)?.subscriptionStatus === 'active' ? 'Pro Plan' : 'Free Trial'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <p className="text-foreground mt-1 text-sm font-mono">{(user as any)?.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settingsCards.map((setting) => (
                <Link key={setting.href} href={setting.href}>
                  <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <setting.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-medium">
                              {setting.title}
                            </CardTitle>
                            {setting.badge && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mt-1 inline-block">
                                {setting.badge}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/ai-settings">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Brain className="h-4 w-4 mr-2" />
                      Train AI
                    </Button>
                  </Link>
                  <Link href="/schedule-settings">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Calendar className="h-4 w-4 mr-2" />
                      Set Availability
                    </Button>
                  </Link>
                  <Link href="/reminder-settings">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Bell className="h-4 w-4 mr-2" />
                      Configure Reminders
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