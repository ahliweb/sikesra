import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

let patchedCount = 0;

function applyReplace(filePath, oldStr, newStr, label) {
  if (!existsSync(filePath)) return false;
  const source = readFileSync(filePath, "utf8");
  if (!source.includes(oldStr)) return false;
  if (source.includes(newStr)) return false;
  writeFileSync(filePath, source.replace(oldStr, newStr));
  patchedCount++;
  console.log(`[patch:emdash] ${label}`);
  return true;
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
  if (!existsSync(filePath)) continue;
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

// ── Patch 2: Robust error handling in handleContentPublish ────────────
// Target: node_modules/emdash/dist/search-DkN-BqsS.mjs (pre-compiled)

const searchDist = resolve(root, "node_modules/emdash/dist/search-DkN-BqsS.mjs");

// The two possible "old" catch blocks (original + our previous patch)
const oldCatches = [
  // Original (unpatched)
  `\t} catch (error) {
\t\tif (error instanceof EmDashValidationError) return {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "VALIDATION_ERROR",
\t\t\t\tmessage: error.message
\t\t\t}
\t\t};
\t\tconsole.error("Content publish error:", error);
\t\treturn {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "CONTENT_PUBLISH_ERROR",
\t\t\t\tmessage: "Failed to publish content"
\t\t\t}
\t\t};
\t}\n}`,
  // Previous patch (with template literal message)
  `\t} catch (error) {
\t\tif (error instanceof EmDashValidationError) return {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "VALIDATION_ERROR",
\t\t\t\tmessage: error.message
\t\t\t}
\t\t};
\t\tconsole.error("Content publish error:", error);
\t\treturn {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "CONTENT_PUBLISH_ERROR",
\t\t\t\tmessage: \`Failed to publish content: \${error instanceof Error ? error.message : String(error)}\`
\t\t\t}
\t\t};
\t}\n}`,
];

// New robust catch block
const newPublishCatch = `\t} catch (error) {
\t\tconst errMsg = error instanceof Error ? error.message : String(error);
\t\tconst errName = error instanceof Error ? error.constructor.name : "";
\t\tif (hasApiError(error)) return {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: error.apiError.code,
\t\t\t\tmessage: error.message
\t\t\t}
\t\t};
\t\tif (isMissingTableError(error)) return {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "COLLECTION_NOT_FOUND",
\t\t\t\tmessage: \`Collection '\${collection}' not found\`
\t\t\t}
\t\t};
\t\tif (errName === "IdentifierError") return {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "VALIDATION_ERROR",
\t\t\t\tmessage: errMsg
\t\t\t}
\t\t};
\t\tif (error instanceof EmDashValidationError) return {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "VALIDATION_ERROR",
\t\t\t\tmessage: error.message
\t\t\t}
\t\t};
\t\tconst msgLower = errMsg.toLowerCase();
\t\tif (msgLower.includes("unique constraint failed") || msgLower.includes("duplicate key")) {
\t\t\tif (msgLower.includes("slug")) return {
\t\t\t\tsuccess: false,
\t\t\t\terror: {
\t\t\t\t\tcode: "SLUG_CONFLICT",
\t\t\t\t\tmessage: \`Slug already exists in collection '\${collection}'\`
\t\t\t\t}
\t\t\t};
\t\t\treturn {
\t\t\t\tsuccess: false,
\t\t\t\terror: {
\t\t\t\t\tcode: "CONFLICT",
\t\t\t\t\tmessage: "Unique constraint violation"
\t\t\t\t}
\t\t\t};
\t\t}
\t\tif (msgLower.includes("foreign key constraint") || msgLower.includes("foreign key")) return {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "REFERENCE_ERROR",
\t\t\t\tmessage: \`Referenced data not found: \${errMsg}\`
\t\t\t}
\t\t};
\t\tconsole.error("Content publish error:", error);
\t\treturn {
\t\t\tsuccess: false,
\t\t\terror: {
\t\t\t\tcode: "CONTENT_PUBLISH_ERROR",
\t\t\t\tmessage: \`Failed to publish content: \${errMsg}\`
\t\t\t}
\t\t};
\t}\n}`;

let appliedSource = false;
for (const oldCatch of oldCatches) {
  if (applyReplace(searchDist, oldCatch, newPublishCatch, "handleContentPublish robust errors")) {
    appliedSource = true;
    break;
  }
}

// ── Patch 3: collectionHasSeo resilience ────────────────────────────
const oldHasSeo = `async function collectionHasSeo(db, collection) {
\treturn (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
}`;

const newHasSeo = `async function collectionHasSeo(db, collection) {
\ttry {
\t\treturn (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
\t} catch {
\t\treturn false;
\t}
}`;

applyReplace(searchDist, oldHasSeo, newHasSeo, "collectionHasSeo resilience");

// ── Patch 4: Fallback — patch compiled output in dist/server ─────────
import { readdirSync } from "fs";
const chunksDir = resolve(root, "dist/server/chunks");
if (existsSync(chunksDir)) {
  for (const file of readdirSync(chunksDir)) {
    if (!file.endsWith(".mjs")) continue;
    const filePath = resolve(chunksDir, file);
    let source = readFileSync(filePath, "utf8");
    if (!source.includes("CONTENT_PUBLISH_ERROR")) continue;

    let changed = false;

    // Patch collectionHasSeo
    const compiledOldHasSeo = `async function collectionHasSeo(db, collection) {
  return (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
}`;
    const compiledNewHasSeo = `async function collectionHasSeo(db, collection) {
  try {
    return (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
  } catch {
    return false;
  }
}`;
    if (source.includes(compiledOldHasSeo) && !source.includes(compiledNewHasSeo)) {
      source = source.replaceAll(compiledOldHasSeo, compiledNewHasSeo);
      changed = true;
      patchedCount++;
    }

    // Compiled catch block patterns (two possible states)
    const compiledOldCatches = [
      `  } catch (error) {
    if (error instanceof EmDashValidationError) return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message
      }
    };
    console.error("Content publish error:", error);
    return {
      success: false,
      error: {
        code: "CONTENT_PUBLISH_ERROR",
        message: "Failed to publish content"
      }
    };
  }`,
      `  } catch (error) {
    if (error instanceof EmDashValidationError) return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message
      }
    };
    console.error("Content publish error:", error);
    return {
      success: false,
      error: {
        code: "CONTENT_PUBLISH_ERROR",
        message: \`Failed to publish content: \${error instanceof Error ? error.message : String(error)}\`
      }
    };
  }`,
    ];

    const compiledNewCatch = `  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errName = error instanceof Error ? error.constructor.name : "";
    if (hasApiError(error)) return {
      success: false,
      error: {
        code: error.apiError.code,
        message: error.message
      }
    };
    if (isMissingTableError(error)) return {
      success: false,
      error: {
        code: "COLLECTION_NOT_FOUND",
        message: \`Collection '\${collection}' not found\`
      }
    };
    if (errName === "IdentifierError") return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: errMsg
      }
    };
    if (error instanceof EmDashValidationError) return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message
      }
    };
    const msgLower = errMsg.toLowerCase();
    if (msgLower.includes("unique constraint failed") || msgLower.includes("duplicate key")) {
      if (msgLower.includes("slug")) return {
        success: false,
        error: {
          code: "SLUG_CONFLICT",
          message: \`Slug already exists in collection '\${collection}'\`
        }
      };
      return {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Unique constraint violation"
        }
      };
    }
    if (msgLower.includes("foreign key constraint") || msgLower.includes("foreign key")) return {
      success: false,
      error: {
        code: "REFERENCE_ERROR",
        message: \`Referenced data not found: \${errMsg}\`
      }
    };
    console.error("Content publish error:", error);
    return {
      success: false,
      error: {
        code: "CONTENT_PUBLISH_ERROR",
        message: \`Failed to publish content: \${errMsg}\`
      }
    };
  }`;

    for (const compiledOldCatch of compiledOldCatches) {
      if (source.includes(compiledOldCatch) && !source.includes('isMissingTableError(error)')) {
        source = source.replace(compiledOldCatch, compiledNewCatch);
        changed = true;
        patchedCount++;
        break;
      }
    }

    if (changed) {
      writeFileSync(filePath, source);
      console.log(`[patch:emdash] compiled: ${file}`);
    }
  }
}

console.log(`[patch:emdash] complete (${patchedCount} patches applied)`);
