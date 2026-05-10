#!/usr/bin/env node

/**
 * Complete FTS (Full-Text Search) table rebuild for D1 database
 * 
 * This script combines drop + recreate + populate in one operation.
 * Use this when you encounter SQLITE_CORRUPT_VTAB errors on publish endpoints.
 * 
 * Usage:
 *   export CLOUDFLARE_API_TOKEN="your-token"
 *   node scripts/fix-fts.mjs
 * 
 * Or with flags:
 *   CLOUDFLARE_API_TOKEN="your-token" node scripts/fix-fts.mjs --yes --populate
 */

import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DATABASE_NAME = "sikesra";
const DATABASE_ID = "78f08b97-305a-431b-9f7c-9f1c3bbb4551";

const FTS_TABLES = [
  "_emdash_fts_posts",
  "_emdash_fts_posts_data",
  "_emdash_fts_posts_idx",
  "_emdash_fts_posts_docsize",
  "_emdash_fts_posts_config",
  "_emdash_fts_pages",
  "_emdash_fts_pages_data",
  "_emdash_fts_pages_idx",
  "_emdash_fts_pages_docsize",
  "_emdash_fts_pages_config",
];

function checkEnv() {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error("❌ CLOUDFLARE_API_TOKEN environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error('  export CLOUDFLARE_API_TOKEN="your-token"');
    console.error("  node scripts/fix-fts.mjs");
    console.error("");
    process.exit(1);
  }
}

function runWranglerCommand(command, silent = false) {
  try {
    const result = execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: silent ? "pipe" : ["pipe", "pipe", "pipe"],
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message,
      error,
    };
  }
}

function dropAllFTSTables() {
  console.log("🗑️  Step 1: Dropping all FTS tables...");
  console.log("");

  for (const table of FTS_TABLES) {
    const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "DROP TABLE IF EXISTS ${table};"`;
    console.log(`   Dropping ${table}...`);
    const result = runWranglerCommand(command);
    
    if (result.success) {
      console.log(`   ✅ ${table} dropped`);
    } else {
      console.log(`   ⚠️  ${table} drop failed (may not exist)`);
    }
  }

  console.log("");
}

function createFTSTables() {
  console.log("📝 Step 2: Creating FTS tables...");
  console.log("");

  const createPages = `CREATE VIRTUAL TABLE _emdash_fts_pages USING fts5(id, title, body, status, published_at, created_at, updated_at, author_id);`;
  const createPosts = `CREATE VIRTUAL TABLE _emdash_fts_posts USING fts5(id, title, body, status, published_at, created_at, updated_at, author_id, collection);`;

  console.log("   Creating _emdash_fts_pages...");
  const pagesCmd = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${createPages.replace(/"/g, '\\"')}"`;
  const pagesResult = runWranglerCommand(pagesCmd);
  if (pagesResult.success) {
    console.log("   ✅ _emdash_fts_pages created");
  } else {
    console.log(`   ❌ _emdash_fts_pages failed: ${pagesResult.output.split("\n")[0]}`);
  }

  console.log("   Creating _emdash_fts_posts...");
  const postsCmd = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${createPosts.replace(/"/g, '\\"')}"`;
  const postsResult = runWranglerCommand(postsCmd);
  if (postsResult.success) {
    console.log("   ✅ _emdash_fts_posts created");
  } else {
    console.log(`   ❌ _emdash_fts_posts failed: ${postsResult.output.split("\n")[0]}`);
  }

  console.log("");
}

function populateFTSTables() {
  console.log("📊 Step 3: Populating FTS tables with existing content...");
  console.log("");

  const populatePages = `INSERT INTO _emdash_fts_pages (id, title, body, status, published_at, created_at, updated_at, author_id) SELECT id, title, COALESCE(body, ''), status, published_at, created_at, updated_at, author_id FROM ec_pages WHERE deleted_at IS NULL;`;
  const populatePosts = `INSERT INTO _emdash_fts_posts (id, title, body, status, published_at, created_at, updated_at, author_id, collection) SELECT id, title, COALESCE(body, ''), status, published_at, created_at, updated_at, author_id, 'posts' FROM ec_posts WHERE deleted_at IS NULL;`;

  console.log("   Populating pages...");
  const pagesCmd = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${populatePages.replace(/"/g, '\\"')}"`;
  const pagesResult = runWranglerCommand(pagesCmd);
  if (pagesResult.success) {
    console.log("   ✅ Pages populated");
  } else {
    console.log(`   ⚠️  Pages: ${pagesResult.output.split("\n")[0]}`);
  }

  console.log("   Populating posts...");
  const postsCmd = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${populatePosts.replace(/"/g, '\\"')}"`;
  const postsResult = runWranglerCommand(postsCmd);
  if (postsResult.success) {
    console.log("   ✅ Posts populated");
  } else {
    console.log(`   ⚠️  Posts: ${postsResult.output.split("\n")[0]}`);
  }

  console.log("");
}

function verifyFTSTables() {
  console.log("🔍 Step 4: Verifying FTS tables...");
  console.log("");

  const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '_emdash_fts_%' ORDER BY name;";`;
  const result = runWranglerCommand(command, true);

  if (result.success) {
    const output = result.output;
    const match = output.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const tables = JSON.parse(match[0]);
        if (tables.results && tables.results.length > 0) {
          console.log("   ✅ FTS tables created:");
          tables.results.forEach((t) => console.log(`      - ${t.name}`));
          console.log("");
          return true;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  console.log("   ⚠️  Could not verify tables. Check manually.");
  console.log("");
  return false;
}

function showSummary() {
  console.log("=" .repeat(50));
  console.log("✅ FTS rebuild completed!");
  console.log("");
  console.log("📋 Test the fix:");
  console.log("");
  console.log("   1. Test publish endpoint:");
  console.log("      POST /_emdash/api/content/pages/:id/publish");
  console.log("");
  console.log("   2. Monitor logs:");
  console.log("      npx wrangler tail --format json");
  console.log("");
  console.log("   3. Search should now work:");
  console.log("      GET /_emdash/api/content/search?q=your-query");
  console.log("");
}

async function main() {
  console.log("⚙️  D1 FTS Complete Fix Script");
  console.log("=" .repeat(50));
  console.log(`Database: ${DATABASE_NAME} (${DATABASE_ID})`);
  console.log("");

  checkEnv();

  const confirm = process.argv.includes("--yes") || process.argv.includes("-y");
  const skipPopulate = process.argv.includes("--no-populate");
  
  if (!confirm) {
    console.log("⚠️  This will DROP and RECREATE all FTS tables in the REMOTE database.");
    console.log("   This action cannot be undone.");
    console.log("");
    console.log("   Run with --yes or -y to skip this confirmation.");
    console.log("   Add --no-populate to skip populating existing content.");
    console.log("");
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await new Promise((resolve) => {
      rl.question("Continue? [y/N] ", (answer) => {
        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
          console.log("Aborted.");
          process.exit(0);
        }
        rl.close();
        resolve();
      });
    });
  }

  dropAllFTSTables();
  createFTSTables();
  
  if (!skipPopulate) {
    populateFTSTables();
  }
  
  verifyFTSTables();
  showSummary();
}

main().catch((error) => {
  console.error("❌ Script failed:", error.message);
  console.error(error.stack);
  process.exit(1);
});
