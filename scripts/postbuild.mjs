import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// 1. Patch generated wrangler.json to use our wrapper as main entry
const wranglerPath = resolve(root, "dist/server/wrangler.json");
const cfg = JSON.parse(readFileSync(wranglerPath, "utf8"));
cfg.main = "worker-wrapper.mjs";
writeFileSync(wranglerPath, JSON.stringify(cfg));

// 2. Keep generated entry as-is.
// EmDash Cloudflare adapters rely on cloudflare:workers runtime bindings,
// so we do not strip that import.

// 3. Load the SIKESRA public HTML from the template file
let publicHtml = "";
const htmlPath = resolve(__dirname, "sikesra-public-html.txt");
try { publicHtml = readFileSync(htmlPath, "utf8"); } catch {}

// 4. Load the wrapper template and inject the HTML
let wrapper = readFileSync(resolve(__dirname, "worker-wrapper-template.mjs"), "utf8");
wrapper = wrapper.replace("__SIKESRA_PUBLIC_HTML__", publicHtml
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\${/g, "\\${"));
writeFileSync(resolve(root, "dist/server/worker-wrapper.mjs"), wrapper);

console.log("[postbuild] patched wrangler.json + worker-wrapper.mjs");
