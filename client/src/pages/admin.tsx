import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'owner';

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: channels } = useQuery({
    queryKey: ["/api/admin/users", selectedUserId, "channels"],
    enabled: isAuthenticated && isAdmin && !!selectedUserId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${selectedUserId}/channels`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">You need admin access to view this page.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        <Header title="Admin" subtitle="Manage users and channels" onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">Email</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Role</th>
                      <th className="py-2 pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(users) && users.map((u: any) => (
                      <tr key={u.id} className="border-t border-border">
                        <td className="py-2 pr-2">{u.email}</td>
                        <td className="py-2 pr-2">{u.firstName || ''} {u.lastName || ''}</td>
                        <td className="py-2 pr-2 capitalize">{u.role || 'owner'}</td>
                        <td className="py-2 pr-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedUserId(u.id)}>View Channels</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {selectedUserId && (
            <Card>
              <CardHeader>
                <CardTitle>Channels for {selectedUserId}</CardTitle>
              </CardHeader>
              <CardContent>
                {!channels ? (
                  <div className="text-muted-foreground">Loading…</div>
                ) : Array.isArray(channels) && channels.length > 0 ? (
                  <ul className="list-disc pl-6">
                    {channels.map((ch: any) => (
                      <li key={ch.id} className="py-1">
                        {ch.name} — <span className="text-muted-foreground">{ch.type}</span> — {ch.connected ? 'connected' : 'not connected'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground">No channels.</div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

