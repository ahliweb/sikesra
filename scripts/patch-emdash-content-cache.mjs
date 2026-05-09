import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const targetFiles = [
  "node_modules/emdash/src/astro/routes/api/content/[collection]/index.ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id].ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/publish.ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/unpublish.ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/schedule.ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/restore.ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/permanent.ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/duplicate.ts",
  "node_modules/emdash/src/astro/routes/api/content/[collection]/[id]/discard-draft.ts",
];

let patchedCount = 0;

for (const relativePath of targetFiles) {
  const filePath = resolve(root, relativePath);
  if (!existsSync(filePath)) continue;

  const source = readFileSync(filePath, "utf8");
  if (!source.includes("cache.enabled")) continue;

  const next = source.replaceAll("cache.enabled", "cache?.enabled");
  if (next === source) continue;

  writeFileSync(filePath, next);
  patchedCount += 1;
  console.log(`[patch:emdash] patched ${relativePath}`);
}

console.log(`[patch:emdash] complete (${patchedCount} files)`);
