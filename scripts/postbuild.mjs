import { readFileSync, writeFileSync } from "fs";

// Patch generated wrangler.json to use our wrapper as main entry
const wranglerPath = "dist/server/wrangler.json";
const cfg = JSON.parse(readFileSync(wranglerPath, "utf8"));
cfg.main = "worker-wrapper.mjs";
writeFileSync(wranglerPath, JSON.stringify(cfg));

// Strip import "cloudflare:workers" from generated entry to allow re-use in wrapper
const entryPath = "dist/server/entry.mjs";
let entry = readFileSync(entryPath, "utf8");
entry = entry.replace(/^import "cloudflare:workers";\n/gm, "");
writeFileSync(entryPath, entry);

console.log("[postbuild] patched wrangler.json + entry.mjs");
