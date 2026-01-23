import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { execSync } from "child_process";

// Get git commit hash from environment variable or git command
function getGitHash(): string {
  // First, check if it's provided as environment variable (Cloudflare Pages build)
  if (process.env.VITE_GIT_HASH) {
    console.log(`[Vite Config] Using VITE_GIT_HASH from env: ${process.env.VITE_GIT_HASH}`);
    return process.env.VITE_GIT_HASH;
  }
  
  // Otherwise, try to get it from git
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    console.log(`[Vite Config] Git hash from command: ${hash}`);
    return hash;
  } catch (error) {
    console.warn('[Vite Config] Could not get git hash:', error);
    return 'dev';
  }
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(getGitHash()),
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
