import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { nanoid } from "nanoid";
import { realtime } from "./services/websocket";
import { generateAIResponse } from "./services/openai";
import bcrypt from "bcryptjs";

type Dict<T = any> = Record<string, T>;

// In-memory users for local/dev (replace with DB later)
type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  role?: "owner" | "admin" | "staff";
  preferredLanguage?: string;
  aiPromptCustomization?: string;
  aiLanguageInstructions?: string;
  subscription?: { plan: string; status: string };
};

const usersById = new Map<string, User>();
const usersByEmail = new Map<string, string>();

// Seed demo user so the app can preview without sign-in
(() => {
  const demo: User = {
    id: "demo-user-1",
    email: "demo@example.com",
    firstName: "Demo",
    lastName: "User",
    preferredLanguage: "en",
    subscription: { plan: "starter", status: "active" },
  };
  usersById.set(demo.id, demo);
  usersByEmail.set(demo.email, demo.id);
})();

const db = {
  // Global demo data (non-tenant specific)
  conversations: [] as Array<{
    id: string;
    channel: string;
    channelName?: string;
    status: "active" | "closed";
    customerId?: string;
    createdAt: string;
    lastMessageAt?: string;
  }>,
  messages: new Map<string, Array<{ id: string; sender: string; content: string; createdAt: string }>>(),
  bookings: [] as Array<{ id: string; customerId?: string; customerName?: string; service?: string; status: string; dateTime?: string; createdAt: string }>,
  customers: [] as Array<{ id: string; name?: string; email?: string; phone?: string; source?: string; createdAt: string }>,
  // Per-user (tenant) channel and integration settings
  channelsByUser: new Map<string, Array<{ id: string; name: string; type: string; connected: boolean; createdAt: string; config?: Dict }>>(),
  telegramByUser: new Map<string, { botToken: string; secret: string }>(),
  whatsappByUser: new Map<string, { accessToken: string; phoneNumberId: string; verifyToken: string }>(),
  gmailByUser: new Map<string, { connected: boolean; email?: string }>(),
  reminderPreferences: { enabled: true, leadTimeMinutes: 60 },
  aiTraining: [] as Array<{ id: string; content: string; category?: string; createdAt: string }>,
};

function getBaseUrl(req: Request) {
  // Prefer PUBLIC_URL for externally reachable URLs (e.g., ngrok, prod domain)
  const envUrl = process.env.PUBLIC_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const host = req.get("host");
  const proto = (req as any).protocol || "http";
  return `${proto}://${host}`;
}

function getCurrentUserId(req: Request): string | null {
  const uid = (req.session as any)?.userId;
  return typeof uid === "string" ? uid : null;
}

function ensureSeedChannels(userId: string) {
  if (!db.channelsByUser.has(userId)) {
    const now = new Date().toISOString();
    db.channelsByUser.set(userId, [
      { id: "website", name: "Website", type: "website", connected: true, createdAt: now },
      { id: "whatsapp", name: "WhatsApp", type: "whatsapp", connected: false, createdAt: now },
      { id: "telegram", name: "Telegram", type: "telegram", connected: false, createdAt: now },
      { id: "gmail", name: "Gmail", type: "gmail", connected: false, createdAt: now },
    ]);
  }
}

// Seed sample data
(() => {
  const cid = nanoid();
  db.conversations.push({ id: cid, channel: "website", status: "active", createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString() });
  db.messages.set(cid, [
    { id: nanoid(), sender: "customer", content: "Hello!", createdAt: new Date().toISOString() },
    { id: nanoid(), sender: "ai", content: "Hi, how can I help?", createdAt: new Date().toISOString() },
  ]);
  db.customers.push({ id: nanoid(), name: "Alice Johnson", email: "alice@example.com", phone: "+1 555 0100", source: "website", createdAt: new Date().toISOString() });
  db.bookings.push({ id: nanoid(), customerName: "Alice Johnson", service: "Consultation", status: "pending", dateTime: new Date(Date.now()+ 2*3600*1000).toISOString(), createdAt: new Date().toISOString() });
})();

export async function registerRoutes(app: Express): Promise<Server> {
  // Healthcheck
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Auth: signup/login/logout/current-user
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body || {};
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "email and password are required" });
      }
      const lower = email.toLowerCase();
      if (usersByEmail.has(lower)) return res.status(409).json({ message: "Email already registered" });
      const id = nanoid();
      const passwordHash = await bcrypt.hash(password, 10);
      const user: User = { id, email: lower, firstName, lastName, passwordHash, role: "owner", preferredLanguage: "en", subscription: { plan: "starter", status: "active" } };
      usersByEmail.set(lower, id);
      usersById.set(id, user);
      (req.session as any).userId = id;
      res.json({ id, email: lower, firstName, lastName });
    } catch (err) {
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "email and password are required" });
    }
    const id = usersByEmail.get(email.toLowerCase());
    if (!id) return res.status(401).json({ message: "Invalid credentials" });
    const user = usersById.get(id)!;
    if (!user.passwordHash) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    (req.session as any).userId = id;
    res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.status(204).end();
  });

  app.get("/api/auth/user", (req, res) => {
    const uid = getCurrentUserId(req);
    if (!uid) return res.status(401).json({ message: "unauthorized" });
    const me = usersById.get(uid);
    if (!me) return res.status(401).json({ message: "unauthorized" });
    res.json(me);
  });

  // Stats
  app.get("/api/stats", (_req, res) => {
    res.json({
      totalConversations: db.conversations.length,
      bookingsMade: db.bookings.filter(b => b.status !== "cancelled").length,
      avgResponseTime: "0.8s",
      satisfactionRate: "96%",
    });
  });

  // Admin endpoints
  function requireAdmin(req: Request, res: Response): string | null {
    const uid = getCurrentUserId(req);
    if (!uid) {
      res.status(401).json({ message: "unauthorized" });
      return null;
    }
    const me = usersById.get(uid);
    if (!me || (me.role !== "admin" && me.role !== "owner")) {
      res.status(403).json({ message: "forbidden" });
      return null;
    }
    return uid;
  }

  app.get("/api/admin/users", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const list = Array.from(usersById.values()).map((u) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role || "owner" }));
    res.json(list);
  });

  app.put("/api/admin/users/:id/role", (req, res) => {
    const uid = requireAdmin(req, res);
    if (!uid) return;
    const me = usersById.get(uid)!;
    if (me.role !== "owner") return res.status(403).json({ message: "only owner can change roles" });
    const target = usersById.get(req.params.id);
    if (!target) return res.status(404).json({ message: "not found" });
    const role = (req.body?.role || "staff").toString();
    if (!["owner", "admin", "staff"].includes(role)) return res.status(400).json({ message: "invalid role" });
    target.role = role as any;
    res.json({ id: target.id, role: target.role });
  });

  app.get("/api/admin/users/:id/channels", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const id = req.params.id;
    ensureSeedChannels(id);
    res.json(db.channelsByUser.get(id) || []);
  });

  // Conversations
  app.get("/api/conversations", (_req, res) => res.json(db.conversations));
  app.get("/api/conversations/active", (_req, res) => res.json(db.conversations.filter(c => c.status === "active")));
  app.get("/api/conversations/:id", (req, res) => {
    const conv = db.conversations.find(c => c.id === req.params.id);
    if (!conv) return res.status(404).json({ message: "Not found" });
    res.json(conv);
  });
  app.get("/api/conversations/:id/messages", (req, res) => {
    res.json(db.messages.get(req.params.id) ?? []);
  });
  app.post("/api/conversations/start", (req: Request, res: Response) => {
    const id = nanoid();
    const now = new Date().toISOString();
    db.conversations.push({ id, channel: req.body?.channel || "website", status: "active", createdAt: now, lastMessageAt: now });
    db.messages.set(id, []);
    res.json({ id });
  });

  // Chat (AI echo)
  app.post("/api/chat", async (req, res) => {
    const { message, conversationId } = req.body ?? {};
    if (typeof message !== "string" || typeof conversationId !== "string") {
      return res.status(400).json({ message: "Invalid payload" });
    }
    const list = db.messages.get(conversationId);
    if (!list) return res.status(404).json({ message: "Conversation not found" });
    list.push({ id: nanoid(), sender: "customer", content: message, createdAt: new Date().toISOString() });
    const ai = await generateAIResponse(message);
    list.push({ id: nanoid(), sender: "ai", content: ai.content, createdAt: new Date().toISOString() });
    // notify over WS
    const uid = getCurrentUserId(req);
    if (uid) realtime.broadcast(uid, { type: "conversation:update", conversationId });
    res.json({ message: ai.content });
  });

  // Bookings
  app.get("/api/bookings", (_req, res) => res.json(db.bookings));
  app.post("/api/bookings", (req, res) => {
    const id = nanoid();
    const booking = { id, status: "pending", createdAt: new Date().toISOString(), ...req.body };
    db.bookings.push(booking);
    const uid = getCurrentUserId(req);
    if (uid) realtime.broadcast(uid, { type: "booking:new", id });
    res.json(booking);
  });
  app.put("/api/bookings/:id", (req, res) => {
    const b = db.bookings.find(x => x.id === req.params.id);
    if (!b) return res.status(404).json({ message: "Not found" });
    Object.assign(b, req.body ?? {});
    const uid = getCurrentUserId(req);
    if (uid) realtime.broadcast(uid, { type: "booking:update", id: b.id });
    res.json(b);
  });
  app.patch("/api/bookings/:id/owner-action", (req, res) => {
    const b = db.bookings.find(x => x.id === req.params.id);
    if (!b) return res.status(404).json({ message: "Not found" });
    const action = (req.body?.action ?? "").toString();
    if (action === "approve") b.status = "confirmed";
    else if (action === "reject") b.status = "rejected";
    else if (action === "reschedule") b.status = "reschedule_requested";
    res.json(b);
  });

  // Customers
  app.get("/api/customers", (_req, res) => res.json(db.customers));

  // Channels (per user)
  app.get("/api/channels", (req, res) => {
    const uid = getCurrentUserId(req);
    if (!uid) return res.status(401).json({ message: "unauthorized" });
    ensureSeedChannels(uid);
    res.json(db.channelsByUser.get(uid));
  });

  app.get("/api/channels/stats", (_req, res) => {
    const byType: Dict<number> = {};
    for (const c of db.conversations) byType[c.channel] = (byType[c.channel] ?? 0) + 1;
    res.json({ byType });
  });
  app.post("/api/channels", (req, res) => {
    const uid = getCurrentUserId(req);
    if (!uid) return res.status(401).json({ message: "unauthorized" });
    ensureSeedChannels(uid);
    const id = nanoid();
    const type = (req.body?.type || "custom").toString();
    const ch = { id, name: req.body?.name || "New Channel", type, connected: false, createdAt: new Date().toISOString() };
    db.channelsByUser.get(uid)!.push(ch);
    res.json(ch);
  });

  app.put("/api/channels/:id/config", (req, res) => {
    const uid = getCurrentUserId(req);
    if (!uid) return res.status(401).json({ message: "unauthorized" });
    ensureSeedChannels(uid);
    const list = db.channelsByUser.get(uid)!;
    const ch = list.find(c => c.id === req.params.id || c.id === req.params.id);
    if (!ch) return res.status(404).json({ message: "Not found" });
    const cfg = (req.body?.config ?? req.body ?? {}) as Dict;
    ch.config = { ...(ch.config || {}), ...cfg };

    // Mark connected based on required fields per type
    if (ch.type === "telegram") {
      const botToken = (cfg.botToken || ch.config?.botToken) as string | undefined;
      const secret = (cfg.secret || cfg.webhookSecret || ch.config?.secret || ch.config?.webhookSecret || nanoid()) as string;
      if (botToken) {
        db.telegramByUser.set(uid, { botToken, secret });
        ch.connected = true;
        ch.config!.secret = secret;
        ch.config!.webhookSecret = secret;
      }
    } else if (ch.type === "whatsapp") {
      const accessToken = (cfg.accessToken || ch.config?.accessToken) as string | undefined;
      const phoneNumberId = (cfg.phoneNumberId || ch.config?.phoneNumberId) as string | undefined;
      const verifyToken = (cfg.verifyToken || ch.config?.verifyToken || nanoid()) as string;
      if (accessToken && phoneNumberId) {
        db.whatsappByUser.set(uid, { accessToken, phoneNumberId, verifyToken });
        ch.connected = true;
        ch.config!.verifyToken = verifyToken;
      }
    } else if (ch.type === "gmail") {
      // Placeholder: mark connected when email is provided
      if (cfg.email) {
        db.gmailByUser.set(uid, { connected: true, email: cfg.email });
        ch.connected = true;
      }
    } else if (ch.type === "website") {
      ch.connected = true;
    }

    res.json(ch);
  });

  // Convenience helper to get recommended webhook URLs for current user
  app.get("/api/channels/telegram/webhook-url", (req, res) => {
    const uid = getCurrentUserId(req);
    if (!uid) return res.status(401).json({ message: "unauthorized" });
    const base = getBaseUrl(req);
    res.json({ url: `${base}/hooks/telegram/${uid}` });
  });

  app.post("/api/channels/telegram/set-webhook", async (req, res) => {
    try {
      const uid = getCurrentUserId(req);
      if (!uid) return res.status(401).json({ message: "unauthorized" });
      const cfg = db.telegramByUser.get(uid);
      if (!cfg) return res.status(400).json({ message: "Telegram not configured" });
      const base = (req.body?.publicUrl as string) || getBaseUrl(req);
      const url = `${base.replace(/\/$/, "")}/hooks/telegram/${uid}`;
      const resp = await fetch(`https://api.telegram.org/bot${cfg.botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, secret_token: cfg.secret }),
      });
      const data = await resp.json();
      res.json({ ok: true, webhook: url, telegram: data });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/channels/whatsapp/webhook-url", (req, res) => {
    const uid = getCurrentUserId(req);
    const base = getBaseUrl(req);
    res.json({ url: `${base}/hooks/whatsapp/${uid}` });
  });

  // Reminder preferences
  app.get("/api/reminder-preferences", (_req, res) => res.json(db.reminderPreferences));
  app.post("/api/reminder-preferences", (req, res) => {
    db.reminderPreferences = { ...(db.reminderPreferences || {}), ...(req.body ?? {}) };
    res.json(db.reminderPreferences);
  });

  // AI settings / training
  app.put("/api/ai-settings", (req, res) => {
    const uid = getCurrentUserId(req);
    if (!uid) return res.status(401).end();
    const me = usersById.get(uid);
    if (me) Object.assign(me, req.body ?? {});
    res.status(204).end();
  });
  app.get("/api/ai-training", (_req, res) => res.json(db.aiTraining));
  app.post("/api/ai-training", (req, res) => {
    const id = nanoid();
    const row = { id, content: req.body?.content || "", category: req.body?.category, createdAt: new Date().toISOString() };
    db.aiTraining.push(row);
    res.json(row);
  });

  // Placeholder API root
  app.get("/api", (_req, res) => res.json({ status: "ok" }));

  // Create HTTP server and attach WebSocket
  const httpServer = createServer(app);
  realtime.attach(httpServer, "/ws");

  // Webhook endpoints for external services (self-serve per-tenant)
  // Telegram webhook: POST /hooks/telegram/:userId
  app.post("/hooks/telegram/:userId", async (req, res) => {
    try {
      const { userId } = req.params as { userId: string };
      const cfg = db.telegramByUser.get(userId);
      if (!cfg) return res.status(404).json({ message: "Unknown tenant or Telegram not configured" });

      const headerToken = req.get("X-Telegram-Bot-Api-Secret-Token");
      if (headerToken !== cfg.secret) return res.status(401).end();

      const update = req.body ?? {};
      // Acknowledge immediately
      res.sendStatus(200);

      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text as string;

        // Record into in-memory conversations/messages
        const convId = nanoid();
        db.conversations.push({ id: convId, channel: "telegram", status: "active", createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString() });
        db.messages.set(convId, [
          { id: nanoid(), sender: "customer", content: text, createdAt: new Date().toISOString() },
        ]);
        realtime.broadcast(userId, { type: "conversation:update", conversationId: convId });

        // AI response and reply via Telegram API
        try {
          const ai = await generateAIResponse(text);
          db.messages.get(convId)!.push({ id: nanoid(), sender: "ai", content: ai.content, createdAt: new Date().toISOString() });
          await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: ai.content }),
          });
        } catch (err) {
          // Network may be restricted in local dev; log and continue
          console.warn("Telegram sendMessage failed:", err);
        }
      }
    } catch (err) {
      console.error("Telegram webhook error:", err);
      if (!res.headersSent) res.sendStatus(200); // avoid retries during dev
    }
  });

  // WhatsApp Cloud API webhook (verification + messages)
  app.get("/hooks/whatsapp/:userId", (req, res) => {
    const { userId } = req.params as { userId: string };
    const cfg = db.whatsappByUser.get(userId);
    const mode = req.query["hub.mode"]; // ?hub.mode=subscribe
    const token = req.query["hub.verify_token"]; // ?hub.verify_token=...
    const challenge = req.query["hub.challenge"]; // ?hub.challenge=...
    if (mode === "subscribe" && cfg && token === cfg.verifyToken) {
      return res.status(200).send(challenge as any);
    }
    return res.status(403).end();
  });

  app.post("/hooks/whatsapp/:userId", async (req, res) => {
    const { userId } = req.params as { userId: string };
    const cfg = db.whatsappByUser.get(userId);
    if (!cfg) return res.status(404).json({ message: "Unknown tenant or WhatsApp not configured" });
    // Acknowledge receipt
    res.sendStatus(200);
    try {
      const body: any = req.body || {};
      const changes = body?.entry?.[0]?.changes || [];
      for (const ch of changes) {
        const value = ch?.value;
        const messages = value?.messages || [];
        for (const msg of messages) {
          const from = msg.from || value?.contacts?.[0]?.wa_id;
          const type = msg.type;
          const text = type === "text" ? msg.text?.body : undefined;
          if (!from || !text) continue;

          // Record conversation
          const convId = nanoid();
          db.conversations.push({ id: convId, channel: "whatsapp", status: "active", createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString() });
          db.messages.set(convId, [
            { id: nanoid(), sender: "customer", content: text, createdAt: new Date().toISOString() },
          ]);
          realtime.broadcast(userId, { type: "conversation:update", conversationId: convId });

          // AI reply
          const ai = await generateAIResponse(text);
          db.messages.get(convId)!.push({ id: nanoid(), sender: "ai", content: ai.content, createdAt: new Date().toISOString() });

          // Send message via WhatsApp Cloud API
          try {
            await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${cfg.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: ai.content },
              }),
            });
          } catch (err) {
            console.warn("WhatsApp send message failed:", err);
          }
        }
      }
    } catch (err) {
      console.error("WhatsApp webhook parse error:", err);
    }
  });

  // Minimal website chat widget page for quick embedding/testing
  app.get("/widget/:userId", (req, res) => {
    const { userId } = req.params as { userId: string };
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chat Widget</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin:0; }
      #app { display:flex; flex-direction:column; height:100vh; }
      header { background:#111827; color:#fff; padding:8px 12px; font-size:14px; }
      .messages { flex:1; overflow:auto; padding:12px; background:#0f172a; color:#e5e7eb; }
      .msg { margin:6px 0; padding:8px 10px; border-radius:8px; max-width:80%; }
      .me { background:#2563eb; color:#fff; margin-left:auto; }
      .bot { background:#334155; }
      form { display:flex; gap:8px; padding:8px; border-top:1px solid #e5e7eb22; background:#0b1220; }
      input { flex:1; padding:8px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:#e5e7eb; }
      button { padding:8px 12px; border:0; border-radius:6px; background:#22c55e; color:#041014; font-weight:600; }
    </style>
  </head>
  <body>
    <div id="app">
      <header>AI Receptionist</header>
      <div class="messages" id="messages"></div>
      <form id="form">
        <input id="input" autocomplete="off" placeholder="Type your message..." />
        <button type="submit">Send</button>
      </form>
    </div>
    <script>
      const messagesEl = document.getElementById('messages');
      const form = document.getElementById('form');
      const input = document.getElementById('input');
      let conversationId = null;

      async function start() {
        const resp = await fetch('/api/conversations/start', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ channel:'website' })});
        const data = await resp.json();
        conversationId = data.id;
        add('bot','Hi! How can I help?');
      }

      function add(sender, text) {
        const div = document.createElement('div');
        div.className = 'msg ' + (sender === 'me' ? 'me' : 'bot');
        div.textContent = text;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text || !conversationId) return;
        add('me', text);
        input.value='';
        const resp = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message:text, conversationId }) });
        const data = await resp.json();
        add('bot', data.message || '...');
      });

      start();
    </script>
  </body>
</html>`;
    res.status(200).setHeader("Content-Type", "text/html").end(html);
  });

  return httpServer;
}
