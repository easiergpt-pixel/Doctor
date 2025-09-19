import express, { type Request, type Response, type NextFunction } from "express";
// Load .env in development if available (no hard dependency in prod)
try { await import("dotenv/config"); } catch {}
import http from "http";
import { registerRoutes } from "./routes";
import session from "express-session";
import createMemoryStore from "memorystore";
import { setupVite, serveStatic, log } from "./vite";
import { reminderService } from "./services/reminderService";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sessions (dev-friendly MemoryStore; swap for PG/Redis in prod)
const MemoryStore = createMemoryStore(session);
app.use(
  session({
    store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: "lax",
      secure: app.get("env") !== "development",
    },
  })
);

// Simple request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const started = Date.now();
  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    const ms = Date.now() - started;
    log(`${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`, "req");
    return originalJson(body);
  };
  next();
});

(async () => {
  // Register API routes and create HTTP server
  const server = await registerRoutes(app);

  // Dev vs Prod static serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start reminder scheduler
  reminderService.startReminderScheduler();

  // Single exposed port (default 5000)
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
