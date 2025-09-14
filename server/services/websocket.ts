import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

type Client = WebSocket;

class RealtimeService {
  private wss: WebSocketServer | null = null;
  private clientsByUser = new Map<string, Set<Client>>();

  attach(server: Server, path = "/ws") {
    if (this.wss) return;
    this.wss = new WebSocketServer({ server, path });

    this.wss.on("connection", (ws) => {
      let authedUserId: string | null = null;

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg?.type === "auth" && typeof msg.userId === "string") {
            authedUserId = msg.userId;
            let set = this.clientsByUser.get(authedUserId);
            if (!set) {
              set = new Set();
              this.clientsByUser.set(authedUserId, set);
            }
            set.add(ws);
            ws.send(JSON.stringify({ type: "ready" }));
          }
        } catch {
          // ignore bad message
        }
      });

      ws.on("close", () => {
        if (authedUserId) {
          const set = this.clientsByUser.get(authedUserId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) this.clientsByUser.delete(authedUserId);
          }
        }
      });
    });
  }

  broadcast(userId: string, payload: any) {
    const set = this.clientsByUser.get(userId);
    if (!set) return;
    const data = JSON.stringify(payload);
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }
}

export const realtime = new RealtimeService();
