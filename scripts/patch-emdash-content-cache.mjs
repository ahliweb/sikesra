import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let patchedCount = 0;

function patch(filePath, replacements) {
  if (!existsSync(filePath)) return false;
  let source = readFileSync(filePath, "utf8");
  let changed = false;
  for (const [old, replacement] of replacements) {
    if (source.includes(old) && !source.includes(replacement)) {
      source = source.replace(old, replacement);
      changed = true;
      patchedCount++;
    }
  }
  if (changed) writeFileSync(filePath, source);
  return changed;
}

// ── Patch 1: cache.enabled → cache?.enabled in route handlers ────────
const routeFiles = [
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

for (const relPath of routeFiles) {
  const filePath = resolve(root, relPath);
  if (existsSync(filePath)) {
    let source = readFileSync(filePath, "utf8");
    if (source.includes("cache.enabled")) {
      const next = source.replaceAll("cache.enabled", "cache?.enabled");
      if (next !== source) {
        writeFileSync(filePath, next);
        patchedCount++;
        console.log(`[patch:emdash] cache: ${relPath}`);
      }
    }
  }
}

// ── Patch 2: collectionHasSeo resilience ─────────────────────────────
// The emdash dist file is the pre-compiled source that gets bundled.
const searchDist = resolve(root, "node_modules/emdash/dist/search-DkN-BqsS.mjs");
patch(searchDist, [
  // Make collectionHasSeo resilient to missing has_seo column
  [
    `async function collectionHasSeo(db, collection) {
\treturn (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
}`,
    `async function collectionHasSeo(db, collection) {
\ttry {
\t\treturn (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
\t} catch {
\t\treturn false;
\t}
}`,
  ],
  // Surface actual error in handleContentPublish
  [
    `message: "Failed to publish content"`,
    'message: `Failed to publish content: ${error instanceof Error ? error.message : String(error)}`',
  ],
]);

// ── Patch 3: fallback — patch compiled output in dist/server ─────────
import { readdirSync } from "fs";
const chunksDir = resolve(root, "dist/server/chunks");
if (existsSync(chunksDir)) {
  for (const file of readdirSync(chunksDir)) {
    if (!file.endsWith(".mjs")) continue;
    const filePath = resolve(chunksDir, file);
    let source = readFileSync(filePath, "utf8");

    // Only process files containing the target functions
    if (!source.includes("CONTENT_PUBLISH_ERROR")) continue;

    let changed = false;

    // Patch collectionHasSeo
    const oldHasSeo = `async function collectionHasSeo(db, collection) {
  return (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
}`;
    const newHasSeo = `async function collectionHasSeo(db, collection) {
  try {
    return (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
  } catch {
    return false;
  }
}`;
    if (source.includes(oldHasSeo)) {
      source = source.replace(oldHasSeo, newHasSeo);
      changed = true;
      patchedCount++;
    }

    // Patch handleContentPublish error message
    const oldErrMsg = `message: "Failed to publish content"`;
    const newErrMsg = `message: \`Failed to publish content: \${error instanceof Error ? error.message : String(error)}\``;
    if (source.includes(oldErrMsg) && !source.includes(newErrMsg)) {
      source = source.replace(oldErrMsg, newErrMsg);
      changed = true;
      patchedCount++;
    }

    if (changed) {
      writeFileSync(filePath, source);
      console.log(`[patch:emdash] patched ${file}`);
    }
  }
}

console.log(`[patch:emdash] complete (${patchedCount} patches applied)`);
