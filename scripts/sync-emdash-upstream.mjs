import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const baseUrl = process.env.EMDASH_UPSTREAM_RAW_BASE ?? "https://raw.githubusercontent.com/emdash-cms/emdash/main";

const files = [
  {
    source: "templates/starter-cloudflare/astro.config.mjs",
    target: "astro.config.mjs",
  },
  {
    source: "templates/starter-cloudflare/src/worker.ts",
    target: "src/worker.ts",
  },
  {
    source: "templates/starter-cloudflare/src/live.config.ts",
    target: "src/live.config.ts",
  },
];

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "awcms-sikesra-sync",
      Accept: "text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

for (const file of files) {
  const url = `${baseUrl}/${file.source}`;
  const targetPath = resolve(root, file.target);
  mkdirSync(dirname(targetPath), { recursive: true });
  const content = await fetchText(url);
  writeFileSync(targetPath, content);
  console.log(`[sync:emdash] updated ${file.target}`);
}

console.log("[sync:emdash] upstream scaffold refresh complete");
