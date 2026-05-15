#!/usr/bin/env node

/**
 * Fix official region codes to use 10-digit Kemendagri format (no dots)
 * and seed local regions for the target deployment area.
 *
 * Usage:
 *   node scripts/sikesra-seed-regions.mjs fix-codes --database <d1-name> [--remote] [--execute]
 *   node scripts/sikesra-seed-regions.mjs seed-local --database <d1-name> [--remote] [--execute]
 *   node scripts/sikesra-seed-regions.mjs sql-fix-codes
 *   node scripts/sikesra-seed-regions.mjs sql-seed-local
 *
 * Options:
 *   --database <name>  D1 database name (required, or set SIKESRA_D1_DATABASE)
 *   --remote           Target remote D1 (default: --local)
 *   --execute          Actually run the SQL (default: dry-run, prints SQL)
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SITE_ID = "main";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "fix-codes") {
	runCommand("fix-codes", args.slice(1));
	process.exit(0);
}

if (command === "seed-local") {
	runCommand("seed-local", args.slice(1));
	process.exit(0);
}

if (command === "sql-fix-codes") {
	process.stdout.write(generateFixCodesSql());
	process.exit(0);
}

if (command === "sql-seed-local") {
	process.stdout.write(generateSeedLocalSql());
	process.exit(0);
}

printHelp();
process.exit(command === "help" ? 0 : 1);

function runCommand(cmdType, rest) {
	const database =
		readFlagValue(rest, "--database") ?? process.env.SIKESRA_D1_DATABASE ?? process.env.D1_DATABASE;
	if (!database) {
		process.stderr.write("Missing database name. Pass --database <name> or set SIKESRA_D1_DATABASE.\n");
		process.exit(1);
	}

	const execute = rest.includes("--execute");
	const target = rest.includes("--remote") ? "--remote" : "--local";
	const sql = cmdType === "fix-codes" ? generateFixCodesSql() : generateSeedLocalSql();

	if (!execute) {
		process.stdout.write(`Database: ${database}\n`);
		process.stdout.write(`Target: ${target}\n`);
		process.stdout.write(`Command: ${cmdType}\n`);
		process.stdout.write(`Execution: dry-run\n\n`);
		process.stdout.write("Generated SQL:\n");
		process.stdout.write(sql);
		process.stdout.write("\n\nPass --execute to apply.\n");
		return;
	}

	const tmpFile = resolve(repoRoot, ".tmp-sikesra-regions.sql");
	writeFileSync(tmpFile, sql);

	process.stdout.write(`Applying ${cmdType} to ${database} (${target})...\n`);

	const result = spawnSync("npx", ["wrangler", "d1", "execute", database, target, "--file", tmpFile], {
		cwd: repoRoot,
		stdio: "inherit",
	});

	try {
		unlinkSync(tmpFile);
	} catch {
		// ignore
	}

	if (result.status !== 0) process.exit(result.status ?? 1);
	process.stdout.write(`${cmdType} applied successfully.\n`);
}

/**
 * Fix official region codes: convert dot notation to 10-digit format.
 *
 * Current format: 11.01.01.2001 (province.regency.district.village)
 * Target format:  1101012001 (10 digits)
 *
 * Also updates parent_code references to match.
 */
function generateFixCodesSql() {
	const sqlParts = [];
	sqlParts.push("-- Fix official region codes: convert dot notation to 10-digit Kemendagri format");

	// Step 1: Add a temporary column to store the new code
	sqlParts.push(`
-- Add temporary column for new codes
ALTER TABLE awcms_sikesra_official_regions ADD COLUMN new_code TEXT;`);

	// Step 2: Compute new codes based on level
	sqlParts.push(`
-- Compute new codes for each level
-- Province: 2 digits (e.g., 11 -> 11)
UPDATE awcms_sikesra_official_regions
SET new_code = REPLACE(code, '.', '')
WHERE level = 'province';

-- Regency: 4 digits (e.g., 11.01 -> 1101)
UPDATE awcms_sikesra_official_regions
SET new_code = REPLACE(code, '.', '')
WHERE level = 'regency';

-- District: 6 digits (e.g., 11.01.01 -> 110101)
UPDATE awcms_sikesra_official_regions
SET new_code = REPLACE(code, '.', '')
WHERE level = 'district';

-- Village: 10 digits (e.g., 11.01.01.2001 -> 1101012001)
UPDATE awcms_sikesra_official_regions
SET new_code = REPLACE(code, '.', '')
WHERE level = 'village';`);

	// Step 3: Update parent_code references
	sqlParts.push(`
-- Update parent_code to reference new codes
UPDATE awcms_sikesra_official_regions
SET parent_code = (
	SELECT new_code FROM awcms_sikesra_official_regions AS parent
	WHERE parent.code = awcms_sikesra_official_regions.parent_code
)
WHERE parent_code IS NOT NULL;`);

	// Step 4: Swap code and new_code
	sqlParts.push(`
-- Swap: update code to new_code, then drop temp column
-- Since SQLite doesn't support column rename easily, we'll use a transaction approach
-- First, create a mapping table
CREATE TABLE IF NOT EXISTS _region_code_map (old_code TEXT PRIMARY KEY, new_code TEXT);
INSERT OR REPLACE INTO _region_code_map (old_code, new_code)
SELECT code, new_code FROM awcms_sikesra_official_regions WHERE new_code IS NOT NULL;`);

	// Step 5: Update entities that reference village codes
	sqlParts.push(`
-- Update entity references to use new village codes
UPDATE awcms_sikesra_entities
SET official_village_code = (
	SELECT new_code FROM _region_code_map
	WHERE old_code = awcms_sikesra_entities.official_village_code
)
WHERE official_village_code IN (SELECT old_code FROM _region_code_map);

-- Update local region references
UPDATE awcms_sikesra_local_regions
SET official_village_code = (
	SELECT new_code FROM _region_code_map
	WHERE old_code = awcms_sikesra_local_regions.official_village_code
)
WHERE official_village_code IN (SELECT old_code FROM _region_code_map);

-- Update code sequence references
UPDATE awcms_sikesra_code_sequences
SET official_village_code = (
	SELECT new_code FROM _region_code_map
	WHERE old_code = awcms_sikesra_code_sequences.official_village_code
)
WHERE official_village_code IN (SELECT old_code FROM _region_code_map);`);

	// Step 6: Since SQLite can't easily update PRIMARY KEY columns, we need to recreate rows
	// This is complex - instead, let's use a simpler approach: just update the codes that need fixing
	// and handle the PK constraint by using INSERT OR REPLACE with all columns

	sqlParts.push(`
-- For villages, we need to handle the PRIMARY KEY constraint
-- Create new rows with correct codes and delete old ones
INSERT OR REPLACE INTO awcms_sikesra_official_regions (
	code, tenant_id, site_id, name, level, parent_code, kemendagri_version,
	is_active, created_at, updated_at, deleted_at, created_by, updated_by
)
SELECT
	new_code, tenant_id, site_id, name, level, parent_code, kemendagri_version,
	is_active, created_at, updated_at, deleted_at, created_by, updated_by
FROM awcms_sikesra_official_regions
WHERE new_code IS NOT NULL AND code != new_code;

-- Delete old rows
DELETE FROM awcms_sikesra_official_regions WHERE code IN (SELECT old_code FROM _region_code_map);

-- Cleanup
DROP TABLE IF EXISTS _region_code_map;
ALTER TABLE awcms_sikesra_official_regions DROP COLUMN new_code;`);

	return sqlParts.join("\n") + "\n";
}

/**
 * Seed local regions for a sample village.
 * Creates RT/RW structure for demonstration.
 */
function generateSeedLocalSql() {
	const sqlParts = [];
	sqlParts.push("-- Seed local regions (RT/RW structure) for sample villages");

	// Sample villages from the database (we'll use a few from Aceh Selatan)
	const sampleVillages = [
		{ code: "1101012001", name: "Keude Bakongan", district: "Bakongan" },
		{ code: "1101012002", name: "Ujong Mangki", district: "Bakongan" },
		{ code: "1101012003", name: "Ujong Padang", district: "Bakongan" },
	];

	for (const village of sampleVillages) {
		const villagePrefix = village.code;

		// Create RW (Rukun Warga) for each village
		for (let rw = 1; rw <= 3; rw++) {
			const rwId = `rw-${villagePrefix}-${String(rw).padStart(2, "0")}`;
			const rwCode = String(rw).padStart(2, "0");
			sqlParts.push(`
INSERT OR IGNORE INTO awcms_sikesra_local_regions (
	id, tenant_id, site_id, official_village_code, parent_id, level,
	code_local, name, is_active
) VALUES (
	'${rwId}', '${TENANT_ID}', '${SITE_ID}', '${village.code}', NULL, 'rw',
	'${rwCode}', 'RW ${rw}', 1
);`);

			// Create RT (Rukun Tetangga) for each RW
			for (let rt = 1; rt <= 4; rt++) {
				const rtId = `rt-${villagePrefix}-${rwCode}-${String(rt).padStart(2, "0")}`;
				const rtCode = String(rt).padStart(2, "0");
				sqlParts.push(`
INSERT OR IGNORE INTO awcms_sikesra_local_regions (
	id, tenant_id, site_id, official_village_code, parent_id, level,
	code_local, name, is_active
) VALUES (
	'${rtId}', '${TENANT_ID}', '${SITE_ID}', '${village.code}', '${rwId}', 'rt',
	'${rtCode}', 'RT ${rt}', 1
);`);
			}
		}
	}

	return sqlParts.join("\n") + "\n";
}

function readFlagValue(rest, flag) {
	const index = rest.indexOf(flag);
	if (index === -1) return null;
	return rest[index + 1] ?? null;
}

function printHelp() {
	process.stdout.write("Usage:\n");
	process.stdout.write("  node scripts/sikesra-seed-regions.mjs fix-codes --database <name> [--remote] [--execute]\n");
	process.stdout.write("  node scripts/sikesra-seed-regions.mjs seed-local --database <name> [--remote] [--execute]\n");
	process.stdout.write("  node scripts/sikesra-seed-regions.mjs sql-fix-codes\n");
	process.stdout.write("  node scripts/sikesra-seed-regions.mjs sql-seed-local\n");
}
