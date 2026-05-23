import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(scriptDir, "..");
const distDir = join(frontendDir, "dist");
const indexFile = join(distDir, "index.html");

const routes = [
  "signup",
  "upload-id",
  "pending",
  "login",
  "forgot-password",
  "profile",
  "swipe",
  "matches",
  "chat",
  "settings",
  "admin",
  "admin/login",
  "admin/reports"
];

if (!existsSync(indexFile)) {
  throw new Error("frontend/dist/index.html was not found. Run the Vite build first.");
}

copyFileSync(indexFile, join(distDir, "404.html"));

for (const route of routes) {
  const routeDir = join(distDir, route);
  mkdirSync(routeDir, { recursive: true });
  copyFileSync(indexFile, join(routeDir, "index.html"));
}

console.log(`Generated SPA fallback files for ${routes.length} routes plus 404.html.`);
