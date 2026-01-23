import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Get git hash from environment variable (set by build script)
const gitHash = process.env.VITE_GIT_HASH || 'unknown';
console.log(`[Vite Cloudflare Config] Building with git hash: ${gitHash}`);

export default defineConfig({
  define: {
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(gitHash),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
});
