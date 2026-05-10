import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DIST_SERVER_DIR = resolve(root, "dist/server");
const WRAPPER_PLACEHOLDER = "__SIKESRA_PUBLIC_HTML__";

function readRequired(path, label) {
  if (!existsSync(path)) {
    throw new Error(`[postbuild] missing ${label}: ${path}`);
  }

  return readFileSync(path, "utf8");
}

function escapeTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function patchWranglerConfig() {
  const wranglerPath = resolve(DIST_SERVER_DIR, "wrangler.json");
  const cfg = JSON.parse(readRequired(wranglerPath, "generated wrangler config"));

  cfg.main = "worker-wrapper.mjs";
  delete cfg.images;
  if (cfg.previews) delete cfg.previews.images;

  writeFileSync(wranglerPath, JSON.stringify(cfg, null, 2));
}

function patchEntryImport() {
  const entryPath = resolve(DIST_SERVER_DIR, "entry.mjs");
  if (!existsSync(entryPath)) return false;

  const current = readFileSync(entryPath, "utf8");
  const next = current.replace(/import "cloudflare:workers";\n?/g, "");
  if (next === current) return false;

  writeFileSync(entryPath, next);
  return true;
}

function writeWorkerWrapper() {
  const htmlPath = resolve(__dirname, "sikesra-public-html.txt");
  const publicHtml = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";

  let wrapper = readRequired(resolve(__dirname, "worker-wrapper-template.mjs"), "worker wrapper template");
  if (!wrapper.includes(WRAPPER_PLACEHOLDER)) {
    throw new Error(`[postbuild] wrapper template is missing placeholder ${WRAPPER_PLACEHOLDER}`);
  }

  wrapper = wrapper.replace(WRAPPER_PLACEHOLDER, escapeTemplateLiteral(publicHtml));
  writeFileSync(resolve(DIST_SERVER_DIR, "worker-wrapper.mjs"), wrapper);
}

patchWranglerConfig();
const strippedEntryImport = patchEntryImport();
writeWorkerWrapper();

const parts = ["wrangler main", "worker wrapper"];
if (strippedEntryImport) parts.push("entry import");

console.log(`[postbuild] patched ${parts.join(" + ")}`);
