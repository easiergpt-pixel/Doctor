import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Allow dynamic host whitelisting for dev tunnels (generic, not ngrok-specific)
const extraHosts = (process.env.ALLOWED_HOSTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowAll = process.env.ALLOW_ALL_HOSTS === "1";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "client", "src"),
      "@shared": path.resolve(projectRoot, "shared"),
      "@assets": path.resolve(projectRoot, "attached_assets"),
    },
  },
  root: path.resolve(projectRoot, "client"),
  build: {
    outDir: path.resolve(projectRoot, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    // Allow external dev access; in production this file is not used.
    // Permit any host when ALLOW_ALL_HOSTS=1, otherwise localhost and optional ALLOWED_HOSTS values.
    allowedHosts: allowAll ? true : ["localhost", "127.0.0.1", "::1", ...extraHosts],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
