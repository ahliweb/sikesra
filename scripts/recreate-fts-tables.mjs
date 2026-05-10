#!/usr/bin/env node

/**
 * Recreate FTS (Full-Text Search) tables in D1 database with proper schema
 * 
 * This script drops and recreates FTS tables for posts and pages with correct
 * SQLite FTS5 schema. Use this after running rebuild-fts-tables.mjs or when
 * FTS tables are corrupted.
 * 
 * Usage:
 *   export CLOUDFLARE_API_TOKEN="your-token"
 *   node scripts/recreate-fts-tables.mjs
 * 
 * Or:
 *   CLOUDFLARE_API_TOKEN="your-token" node scripts/recreate-fts-tables.mjs
 */

import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DATABASE_NAME = "sikesra";
const DATABASE_ID = "78f08b97-305a-431b-9f7c-9f1c3bbb4551";

const FTS_SCHEMA = {
  posts: {
    table: "_emdash_fts_posts",
    columns: [
      "id TEXT PRIMARY KEY",
      "title TEXT",
      "body TEXT",
      "status TEXT",
      "published_at TEXT",
      "created_at TEXT",
      "updated_at TEXT",
      "author_id TEXT",
      "collection TEXT",
    ],
  },
  pages: {
    table: "_emdash_fts_pages",
    columns: [
      "id TEXT PRIMARY KEY",
      "title TEXT",
      "body TEXT",
      "status TEXT",
      "published_at TEXT",
      "created_at TEXT",
      "updated_at TEXT",
      "author_id TEXT",
    ],
  },
};

function checkEnv() {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.error("❌ CLOUDFLARE_API_TOKEN environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error('  export CLOUDFLARE_API_TOKEN="your-token"');
    console.error("  node scripts/recreate-fts-tables.mjs");
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

function dropFTSTable(table) {
  const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "DROP TABLE IF EXISTS ${table};"`;
  const result = runWranglerCommand(command);
  return result.success;
}

function createFTSTable(name, config) {
  console.log(`   Creating ${config.table}...`);
  
  const columns = config.columns.join(", ");
  const createSQL = `CREATE VIRTUAL TABLE ${config.table} USING fts5(${columns}, content='', tokenize='porter');`;
  
  const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${createSQL.replace(/"/g, '\\"')}"`;
  const result = runWranglerCommand(command);
  
  if (result.success) {
    console.log(`   ✅ ${config.table} created`);
    return true;
  } else {
    console.log(`   ❌ ${config.table} failed: ${result.output.split("\n")[0]}`);
    return false;
  }
}

function createFTSTableSimple(name, config) {
  console.log(`   Creating ${config.table}...`);
  
  const columns = config.columns.join(", ");
  const createSQL = `CREATE VIRTUAL TABLE ${config.table} USING fts5(${columns});`;
  
  const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${createSQL.replace(/"/g, '\\"')}"`;
  const result = runWranglerCommand(command);
  
  if (result.success) {
    console.log(`   ✅ ${config.table} created`);
    return true;
  } else {
    console.log(`   ❌ ${config.table} failed: ${result.output.split("\n")[0]}`);
    return false;
  }
}

function verifyTableExists(table) {
  const command = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';"`;
  const result = runWranglerCommand(command, true);
  
  if (result.success) {
    const output = result.output;
    const match = output.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const tables = JSON.parse(match[0]);
        return tables.results && tables.results.length > 0;
      } catch (e) {
        return false;
      }
    }
  }
  return false;
}

function recreateFTSTables() {
  console.log("🗑️  Dropping existing FTS tables...");
  console.log("");

  const allTables = [...Object.values(FTS_SCHEMA).map(t => t.table)];
  
  for (const table of allTables) {
    console.log(`   Dropping ${table}...`);
    const success = dropFTSTable(table);
    if (success) {
      console.log(`   ✅ ${table} dropped`);
    } else {
      console.log(`   ⚠️  ${table} drop failed (may not exist)`);
    }
  }

  console.log("");
  console.log("📝 Creating FTS tables with schema...");
  console.log("");

  const results = [];
  
  for (const [name, config] of Object.entries(FTS_SCHEMA)) {
    const success = createFTSTableSimple(name, config);
    results.push({ name, table: config.table, success });
  }

  console.log("");
  return results;
}

function verifyCreation(results) {
  console.log("🔍 Verifying FTS tables were created...");
  console.log("");

  let allSuccess = true;
  
  for (const result of results) {
    const exists = verifyTableExists(result.table);
    if (exists) {
      console.log(`   ✅ ${result.table} exists`);
    } else {
      console.log(`   ❌ ${result.table} NOT found`);
      allSuccess = false;
    }
  }

  console.log("");
  return allSuccess;
}

function showSchema() {
  console.log("📋 FTS Schema Created:");
  console.log("");
  
  for (const [name, config] of Object.entries(FTS_SCHEMA)) {
    console.log(`   ${config.table}:`);
    console.log(`      CREATE VIRTUAL TABLE ${config.table} USING fts5(`);
    config.columns.forEach((col, i) => {
      const comma = i < config.columns.length - 1 ? "," : "";
      console.log(`        ${col}${comma}`);
    });
    console.log("      );");
    console.log("");
  }
}

function showNextSteps() {
  console.log("📋 Next Steps:");
  console.log("");
  console.log("   1. Populate FTS tables with existing content:");
  console.log("      Run this SQL to sync existing pages:");
  console.log("");
  console.log("      INSERT INTO _emdash_fts_pages (id, title, body, status, published_at, created_at, updated_at, author_id)");
  console.log("      SELECT id, title, COALESCE(body, ''), status, published_at, created_at, updated_at, author_id");
  console.log("      FROM ec_pages WHERE status = 'published';");
  console.log("");
  console.log("   2. Test the publish endpoint:");
  console.log("      POST /_emdash/api/content/pages/:id/publish");
  console.log("");
  console.log("   3. Monitor worker logs:");
  console.log("      npx wrangler tail --format json");
  console.log("");
  console.log("   4. If you want to auto-populate, run:");
  console.log("      node scripts/recreate-fts-tables.mjs --populate");
  console.log("");
}

function populateFTSTables() {
  console.log("");
  console.log("📊 Populating FTS tables with existing content...");
  console.log("");

  const populatePages = `
    INSERT INTO _emdash_fts_pages (id, title, body, status, published_at, created_at, updated_at, author_id)
    SELECT id, title, COALESCE(body, ''), status, published_at, created_at, updated_at, author_id
    FROM ec_pages WHERE deleted_at IS NULL;
  `.trim();

  const populatePosts = `
    INSERT INTO _emdash_fts_posts (id, title, body, status, published_at, created_at, updated_at, author_id, collection)
    SELECT id, title, COALESCE(body, ''), status, published_at, created_at, updated_at, author_id, 'posts'
    FROM ec_posts WHERE deleted_at IS NULL;
  `.trim();

  console.log("   Populating pages...");
  const pagesCmd = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${populatePages.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
  const pagesResult = runWranglerCommand(pagesCmd);
  if (pagesResult.success) {
    console.log("   ✅ Pages populated");
  } else {
    console.log(`   ⚠️  Pages population failed or no data: ${pagesResult.output.split("\n")[0]}`);
  }

  console.log("   Populating posts...");
  const postsCmd = `npx wrangler d1 execute ${DATABASE_NAME} --remote --command "${populatePosts.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
  const postsResult = runWranglerCommand(postsCmd);
  if (postsResult.success) {
    console.log("   ✅ Posts populated");
  } else {
    console.log(`   ⚠️  Posts population failed or no data: ${postsResult.output.split("\n")[0]}`);
  }

  console.log("");
}

async function main() {
  console.log("⚙️  D1 FTS Table Recreation Script");
  console.log("=" .repeat(50));
  console.log(`Database: ${DATABASE_NAME} (${DATABASE_ID})`);
  console.log("");

  checkEnv();

  const confirm = process.argv.includes("--yes") || process.argv.includes("-y");
  const populate = process.argv.includes("--populate") || process.argv.includes("-p");
  
  if (!confirm) {
    console.log("⚠️  This will DROP and RECREATE all FTS tables in the REMOTE database.");
    console.log("   This action cannot be undone.");
    console.log("");
    console.log("   Run with --yes or -y to skip this confirmation.");
    console.log("   Add --populate to also copy existing content into FTS tables.");
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

  const results = recreateFTSTables();
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  console.log("");
  console.log(`Summary: ${successCount} created, ${failCount} failed`);
  console.log("");

  if (failCount > 0) {
    console.log("❌ Some tables failed to create. Check errors above.");
    console.log("   You may need to fix permissions or database state.");
    console.log("");
    process.exit(1);
  }

  const verified = verifyCreation(results);
  
  if (verified) {
    showSchema();
    
    if (populate) {
      populateFTSTables();
    }
  }

  showNextSteps();

  console.log("=" .repeat(50));
  console.log("✅ FTS recreation script completed");
  console.log("");
}

main().catch((error) => {
  console.error("❌ Script failed:", error.message);
  console.error(error.stack);
  process.exit(1);
});
