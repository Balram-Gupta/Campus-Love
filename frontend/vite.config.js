import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
const backendUrl = process.env.VITE_API_URL || "http://127.0.0.1:8000";

export default defineConfig({
  root: frontendRoot,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true
      },
      "/socket.io": {
        target: backendUrl,
        changeOrigin: true,
        ws: true
      }
    }
  }
});
