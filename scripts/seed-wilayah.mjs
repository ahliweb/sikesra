#!/usr/bin/env node

// Seed official regions from canonical wilayah data
// Source: https://github.com/cahyadsn/wilayah
// Target: awcms_sikesra_official_regions table in D1
//
// Usage:
//   node scripts/seed-wilayah.mjs [tenant_id] [site_id]
//   Defaults: tenant_id="default", site_id="default"
//
// Requires: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const TENANT_ID = process.argv[2] || "default";
const SITE_ID = process.argv[3] || "default";
const SQL_URL = "https://raw.githubusercontent.com/cahyadsn/wilayah/refs/heads/master/db/wilayah.sql";
const CACHE_DIR = "/tmp/sikesra-seed";
const CACHE_FILE = `${CACHE_DIR}/wilayah.sql`;

// Level mapping based on code structure
// XX = province, XX.XX = regency, XX.XX.XX = district, XX.XX.XX.XXXX = village
function getLevel(code) {
  const parts = code.split(".");
  if (parts.length === 1) return "province";
  if (parts.length === 2) return "regency";
  if (parts.length === 3) return "district";
  if (parts.length === 4) return "village";
  return "unknown";
}

function getParentCode(code) {
  const parts = code.split(".");
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join(".");
}

function parseWilayahSQL(sqlContent) {
  const regions = [];
  // Match INSERT VALUES
  const valuesMatch = sqlContent.match(/INSERT INTO wilayah \(kode, nama\)\s*VALUES\s*\(([\s\S]*?)\);/);
  if (!valuesMatch) {
    console.error("Failed to parse wilayah SQL - no INSERT VALUES found");
    process.exit(1);
  }

  const valuesStr = valuesMatch[1];
  // Parse each row: ('XX','Name'),
  const rowRegex = /\('([^']+)','([^']+)'\)/g;
  let match;
  while ((match = rowRegex.exec(valuesStr)) !== null) {
    const code = match[1];
    const name = match[2];
    const level = getLevel(code);
    const parentCode = getParentCode(code);
    regions.push({ code, name, level, parentCode });
  }

  return regions;
}

function generateD1Inserts(regions, tenantId, siteId) {
  const nowIso = new Date().toISOString();
  const inserts = [];

  // Find all unique province codes (parent of regencies)
  const provinceCodes = new Set();
  for (const region of regions) {
    if (region.level === "regency" && region.parentCode) {
      provinceCodes.add(region.parentCode);
    }
  }

  // Insert province records first (not in original SQL data)
  const provinceNames = {
    "11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau",
    "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung",
    "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta",
    "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur",
    "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur",
    "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan",
    "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara",
    "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara",
    "75": "Gorontalo", "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara",
    "91": "Papua Barat", "92": "Papua Barat Daya", "93": "Papua", "94": "Papua Selatan",
    "95": "Papua Tengah", "96": "Papua Pegunungan",
  };

  for (const code of provinceCodes) {
    const name = provinceNames[code] || `Provinsi ${code}`;
    inserts.push(
      `INSERT OR IGNORE INTO awcms_sikesra_official_regions ` +
      `(code, tenant_id, site_id, name, level, parent_code, kemendagri_version, is_active, created_at, updated_at) ` +
      `VALUES ('${code}', '${tenantId}', '${siteId}', '${name}', 'province', NULL, '2025', 1, '${nowIso}', '${nowIso}');`
    );
  }

  // Insert regency, district, and village records
  for (const region of regions) {
    const parentIdValue = region.parentCode ? `'${region.parentCode}'` : "NULL";
    const escapedName = region.name.replace(/'/g, "''");
    const kemendagriVersion = "2025";

    inserts.push(
      `INSERT OR IGNORE INTO awcms_sikesra_official_regions ` +
      `(code, tenant_id, site_id, name, level, parent_code, kemendagri_version, is_active, created_at, updated_at) ` +
      `VALUES ('${region.code}', '${tenantId}', '${siteId}', '${escapedName}', '${region.level}', ${parentIdValue}, '${kemendagriVersion}', 1, '${nowIso}', '${nowIso}');`
    );
  }

  return inserts;
}

async function fetchWilayahSQL() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  if (existsSync(CACHE_FILE)) {
    console.log("Using cached wilayah.sql");
    return readFileSync(CACHE_FILE, "utf8");
  }

  console.log("Fetching wilayah.sql from GitHub...");
  const response = await fetch(SQL_URL);
  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
    process.exit(1);
  }
  const content = await response.text();
  writeFileSync(CACHE_FILE, content);
  return content;
}

async function main() {
  console.log(`Seeding official regions for tenant=${TENANT_ID}, site=${SITE_ID}`);

  // Fetch SQL
  const sqlContent = await fetchWilayahSQL();
  console.log("Parsing wilayah data...");
  const regions = parseWilayahSQL(sqlContent);
  console.log(`Found ${regions.length} regions`);

  // Count by level
  const counts = {};
  for (const region of regions) {
    counts[region.level] = (counts[region.level] || 0) + 1;
  }
  console.log("Breakdown:", JSON.stringify(counts, null, 2));

  // Generate inserts
  console.log("Generating D1 inserts...");
  const inserts = generateD1Inserts(regions, TENANT_ID, SITE_ID);
  const outputFile = `${CACHE_DIR}/seed-wilayah-${TENANT_ID}-${SITE_ID}.sql`;
  writeFileSync(outputFile, inserts.join("\n"));
  console.log(`Generated ${inserts.length} INSERT statements -> ${outputFile}`);

  // Execute against D1
  console.log("Executing against D1...");
  try {
    // Read wrangler.toml to get database name
    const wranglerContent = readFileSync("wrangler.toml", "utf8");
    const dbNameMatch = wranglerContent.match(/database_name\s*=\s*"([^"]+)"/);
    const dbName = dbNameMatch ? dbNameMatch[1] : "sikesra";

    // Execute in batches of 100 to avoid command line limits
    const batchSize = 100;
    let executed = 0;

    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize);
      const batchFile = `${CACHE_DIR}/batch-${i}.sql`;
      writeFileSync(batchFile, batch.join("\n"));

      try {
        execSync(`npx wrangler d1 execute ${dbName} --file "${batchFile}" --remote`, {
          stdio: "pipe",
          timeout: 60000,
        });
        executed += batch.length;
        console.log(`  Executed ${executed}/${inserts.length} inserts`);
      } catch (err) {
        // Check if it's a duplicate key error (already seeded)
        const stderr = err.stderr?.toString() || "";
        if (stderr.includes("UNIQUE constraint failed") || stderr.includes("already exists")) {
          console.log(`  Batch ${i} skipped (already exists)`);
          executed += batch.length;
        } else {
          console.error(`  Failed at batch ${i}: ${stderr}`);
          throw err;
        }
      }
    }

    console.log(`\n✅ Seeded ${executed} official regions to D1 database "${dbName}"`);
  } catch (err) {
    console.error("\n❌ Failed to execute D1 inserts:", err.message);
    console.log(`\nSQL file saved to: ${outputFile}`);
    console.log("You can manually execute it with:");
    console.log(`  npx wrangler d1 execute sikesra --file "${outputFile}" --remote`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
