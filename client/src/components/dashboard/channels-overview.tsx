import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Globe, Facebook, Instagram } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export default function ChannelsOverview() {
  const { data: channels, isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <Smartphone className="h-6 w-6 text-green-500" />;
      case 'website':
        return <Globe className="h-6 w-6 text-purple-600" />;
      case 'facebook':
        return <Facebook className="h-6 w-6 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-6 w-6 text-pink-500" />;
      default:
        return <Globe className="h-6 w-6 text-gray-500" />;
    }
  };

  const getChannelStats = (type: string) => {
    // Mock conversation counts for demo
    const mockStats = {
      whatsapp: 24,
      website: 31,
      facebook: 18,
      instagram: 0,
    };
    return mockStats[type as keyof typeof mockStats] || 0;
  };

  if (isLoading) {
    return (
      <Card className="fade-in">
        <CardHeader>
          <CardTitle>Connected Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultChannels = [
    { type: 'whatsapp', name: 'WhatsApp Business', isActive: true },
    { type: 'facebook', name: 'Facebook Messenger', isActive: true },
    { type: 'website', name: 'Website Widget', isActive: true },
    { type: 'instagram', name: 'Instagram DM', isActive: false },
  ];

  const channelsToShow = (channels && channels.length > 0) ? channels : defaultChannels;

  return (
    <Card className="fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Connected Channels</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-manage-channels">
            Manage All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {channelsToShow.map((channel: Channel | any, index: number) => {
            const conversations = getChannelStats(channel.type);
            const isActive = channel.isActive !== false;
            
            return (
              <div 
                key={channel.id || index} 
                className={`flex items-center justify-between p-3 bg-muted/50 rounded-lg ${!isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-background">
                    {getChannelIcon(channel.type)}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-foreground" data-testid={`channel-name-${channel.type}`}>
                      {channel.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isActive ? `${conversations} conversations today` : 'Setup required'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  {isActive ? (
                    <>
                      <span className="w-2 h-2 bg-chart-2 rounded-full channel-indicator mr-2"></span>
                      <span className="text-sm text-muted-foreground">Active</span>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" data-testid={`button-connect-${channel.type}`}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
