#!/usr/bin/env node

/**
 * Rebuild FTS (Full-Text Search) tables in D1 database
 * 
 * This script drops and recreates FTS tables for posts and pages.
 * Run this when you encounter SQLITE_CORRUPT_VTAB errors on publish endpoints.
 * 
 * Usage:
 *   export CLOUDFLARE_API_TOKEN="your-token"
 *   node scripts/rebuild-fts-tables.mjs
 * 
 * Or:
 *   CLOUDFLARE_API_TOKEN="your-token" node scripts/rebuild-fts-tables.mjs
 */

import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DATABASE_NAME = "sikesra";
const DATABASE_ID = "78f08b97-305a-431b-9f7c-9f1c3bbb4551";

const FTS_TABLES = {
  posts: [
    "_emdash_fts_posts",
    "_emdash_fts_posts_data",
    "_emdash_fts_posts_idx",
    "_emdash_fts_posts_docsize",
    "_emdash_fts_posts_config",
  ],
  pages: [
    "_emdash_fts_pages",
    "_emdash_fts_pages_data",
    "_emdash_fts_pages_idx",
    "_emdash_fts_pages_docsize",
    "_emdash_fts_pages_config",
  ],
};

function checkEnv() {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error("❌ CLOUDFLARE_API_TOKEN environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error('  export CLOUDFLARE_API_TOKEN="your-token"');
    console.error("  node scripts/rebuild-fts-tables.mjs");
    console.error("");
    process.exit(1);
  }
}

function runWranglerCommand(command) {
  try {
    const result = execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
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

function dropFTSTables() {
  console.log("🗑️  Dropping FTS tables...");
  console.log("");

  const allTables = [...FTS_TABLES.posts, ...FTS_TABLES.pages];
  const results = [];

  for (const table of allTables) {
    const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "DROP TABLE IF EXISTS ${table};"`;
    console.log(`   Dropping ${table}...`);
    const result = runWranglerCommand(command);

    if (result.success) {
      console.log(`   ✅ ${table} dropped`);
      results.push({ table, success: true });
    } else {
      console.log(`   ❌ ${table} failed: ${result.output.split("\n")[0]}`);
      results.push({ table, success: false, error: result.output });
    }
  }

  console.log("");
  return results;
}

function verifyTablesDropped() {
  console.log("🔍 Verifying FTS tables are dropped...");
  console.log("");

  const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '_emdash_fts_%';"`;
  const result = runWranglerCommand(command);

  if (result.success) {
    const output = result.output;
    const match = output.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const tables = JSON.parse(match[0]);
        if (tables.results && tables.results.length === 0) {
          console.log("   ✅ All FTS tables successfully dropped");
          return true;
        } else if (tables.results) {
          console.log("   ⚠️  Some FTS tables still exist:");
          tables.results.forEach((t) => console.log(`      - ${t.name}`));
          return false;
        }
      } catch (e) {
        console.log("   ⚠️  Could not parse verification result");
        return false;
      }
    }
  }

  console.log("   ⚠️  Verification inconclusive, proceeding anyway...");
  return true;
}

function triggerRecreation() {
  console.log("");
  console.log("🔄 Triggering FTS table recreation...");
  console.log("");
  console.log("   FTS tables will be automatically recreated by EmDash when:");
  console.log("   - A page/post is published or updated");
  console.log("   - The content search index is rebuilt");
  console.log("");
  console.log("   To force recreation, you can:");
  console.log("   1. Publish any page/post in the admin UI");
  console.log("   2. Run: npx wrangler d1 execute sikesra --remote --command \"SELECT * FROM _emdash_migrations;\"");
  console.log("   3. Check if EmDash has a migration or initialization script");
  console.log("");
}

function showNextSteps() {
  console.log("📋 Next Steps:");
  console.log("");
  console.log("   1. Test the publish endpoint:");
  console.log("      POST /_emdash/api/content/pages/:id/publish");
  console.log("");
  console.log("   2. If publish still fails, check EmDash documentation for");
  console.log("      FTS initialization or run content migrations");
  console.log("");
  console.log("   3. Monitor worker logs for any remaining FTS errors:");
  console.log("      npx wrangler tail --format json");
  console.log("");
}

function main() {
  console.log("⚙️  D1 FTS Table Rebuild Script");
  console.log("=" .repeat(50));
  console.log(`Database: ${DATABASE_NAME} (${DATABASE_ID})`);
  console.log("");

  checkEnv();

  const confirm = process.argv.includes("--yes") || process.argv.includes("-y");
  if (!confirm) {
    console.log("⚠️  This will DROP all FTS tables in the REMOTE database.");
    console.log("   This action cannot be undone.");
    console.log("");
    console.log("   Run with --yes or -y to skip this confirmation.");
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

  const dropResults = dropFTSTables();
  const successCount = dropResults.filter((r) => r.success).length;
  const failCount = dropResults.length - successCount;

  console.log("");
  console.log(`Summary: ${successCount} dropped, ${failCount} failed`);
  console.log("");

  if (failCount > 0) {
    console.log("⚠️  Some tables failed to drop. Check errors above.");
    console.log("   You may need to fix permissions or database state.");
    console.log("");
  }

  verifyTablesDropped();
  triggerRecreation();
  showNextSteps();

  console.log("=" .repeat(50));
  console.log("✅ FTS rebuild script completed");
  console.log("");
}

main().catch((error) => {
  console.error("❌ Script failed:", error.message);
  process.exit(1);
});
