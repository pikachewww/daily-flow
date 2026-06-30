import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const webRoot = path.resolve(frontendRoot, "web");
const distRoot = path.resolve(frontendRoot, "dist");
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3001/api";

fs.rmSync(distRoot, { recursive: true, force: true });
fs.mkdirSync(distRoot, { recursive: true });

for (const file of fs.readdirSync(webRoot)) {
  const source = path.join(webRoot, file);
  const target = path.join(distRoot, file);
  if (fs.statSync(source).isFile()) {
    fs.copyFileSync(source, target);
  }
}

fs.writeFileSync(
  path.join(distRoot, "config.js"),
  `window.__APP_CONFIG__ = {\n  API_BASE_URL: ${JSON.stringify(apiBaseUrl)},\n};\n`,
);

console.log(`Web build complete. API_BASE_URL=${apiBaseUrl}`);
