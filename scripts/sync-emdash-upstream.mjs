import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const baseUrl = process.env.EMDASH_UPSTREAM_RAW_BASE ?? "https://raw.githubusercontent.com/emdash-cms/emdash/main";
const template = "templates/blog-cloudflare";

// Files that define the public web (pages, components, layouts, utils, styles)
// SIKESRA keeps: routes/, api/, repositories/, services/, security/, index.ts
const publicFiles = [
  // Config and worker
  { source: `${template}/astro.config.mjs`, target: "astro.config.mjs" },
  { source: `${template}/src/worker.ts`, target: "src/worker.ts" },
  { source: `${template}/src/live.config.ts`, target: "src/live.config.ts" },
  // Pages
  { source: `${template}/src/pages/404.astro`, target: "src/pages/404.astro" },
  { source: `${template}/src/pages/index.astro`, target: "src/pages/index.astro" },
  { source: `${template}/src/pages/rss.xml.ts`, target: "src/pages/rss.xml.ts" },
  { source: `${template}/src/pages/search.astro`, target: "src/pages/search.astro" },
  { source: `${template}/src/pages/pages/[slug].astro`, target: "src/pages/pages/[slug].astro" },
  // Category pages
  { source: `${template}/src/pages/category/[slug].astro`, target: "src/pages/category/[slug].astro" },
  // Posts pages
  { source: `${template}/src/pages/posts/index.astro`, target: "src/pages/posts/index.astro" },
  { source: `${template}/src/pages/posts/[slug].astro`, target: "src/pages/posts/[slug].astro" },
  // Tag pages
  { source: `${template}/src/pages/tag/[slug].astro`, target: "src/pages/tag/[slug].astro" },
  // Components
  { source: `${template}/src/components/PostCard.astro`, target: "src/components/PostCard.astro" },
  // Layouts
  { source: `${template}/src/layouts/Base.astro`, target: "src/layouts/Base.astro" },
  // Utils
  { source: `${template}/src/utils/reading-time.ts`, target: "src/utils/reading-time.ts" },
  { source: `${template}/src/utils/site-identity.ts`, target: "src/utils/site-identity.ts" },
  // Styles (needed for Base.astro)
  { source: `${template}/src/styles/theme.css`, target: "src/styles/theme.css" },
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

for (const file of publicFiles) {
  const url = `${baseUrl}/${file.source}`;
  const targetPath = resolve(root, file.target);
  mkdirSync(dirname(targetPath), { recursive: true });
  const content = await fetchText(url);
  writeFileSync(targetPath, content);
  console.log(`[sync:emdash] updated ${file.target}`);
}

console.log("[sync:emdash] upstream scaffold refresh complete");
