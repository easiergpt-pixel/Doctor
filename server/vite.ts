import path from "path";
import fs from "fs";
import type { Express } from "express";
import express from "express";
import type { Server } from "http";
import { createServer as createViteServer, createLogger } from "vite";

const viteLogger = createLogger();

export function log(message: string, source = "server") {
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`[${ts}] [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Create Vite dev server in middleware mode and serve our SPA index
  const projectRoot = process.cwd();
  const clientRoot = path.resolve(projectRoot, "client");
  const indexHtmlPath = path.resolve(clientRoot, "index.html");

  const vite = await createViteServer({
    // Load the workspace-level Vite config so aliases like '@' work
    configFile: path.resolve(projectRoot, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom", // we will handle HTML serving below
  });

  // Mount Vite's middleware first so assets and HMR work
  app.use(vite.middlewares);

  // Fallback: serve client/index.html for any non-API route
  app.use("*", async (req, res, next) => {
    try {
      // Avoid intercepting API and WS upgrade paths
      if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/ws")) {
        return next();
      }
      let template = fs.readFileSync(indexHtmlPath, "utf-8");
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).setHeader("Content-Type", "text/html").end(template);
    } catch (err) {
      viteLogger.error(err as Error);
      next(err);
    }
  });

  log("Vite middleware enabled (development)", "vite");
}

export function serveStatic(app: Express) {
  const distDir = path.resolve(process.cwd(), "dist");
  const publicDir = path.join(distDir, "public");
  const indexHtml = path.join(publicDir, "index.html");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    if (fs.existsSync(indexHtml)) res.sendFile(indexHtml);
    else res.send("Build not found. Run `npm run build`.");
  });
  log("Serving static build (production)");
}
