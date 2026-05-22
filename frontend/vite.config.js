import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: frontendRoot,
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000"
    }
  }
});
