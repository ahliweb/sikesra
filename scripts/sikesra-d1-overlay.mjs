#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const backupDir = resolve(repoRoot, "update-backup", "d1");

const FILES = {
	full: "sikesra_full_20260514T014316Z.sql",
	schema: "sikesra_schema_20260514T014316Z.sql",
	data: "sikesra_data_20260514T014316Z.sql",
	extras: "schema_objects_20260514T014316Z_extras.sql",
	fts: "schema_objects_20260514T014316Z_fts_rebuild.sql",
	tables: "schema_objects_20260514T014316Z_tables.txt",
	objects: "schema_objects_20260514T014316Z.json",
};
const NEWLINE_PATTERN = /\r?\n/;

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "inventory") {
	runInventory(args.slice(1));
	process.exit(0);
}

if (command === "restore") {
	runRestore(args.slice(1));
	process.exit(0);
}

printHelp();
process.exit(command === "help" ? 0 : 1);

function runInventory(rest) {
	ensureFiles();
	const json = rest.includes("--json");
	const tables = readTables();
	const objects = readObjects();
	const sikesraTables = tables.filter((table) => table.startsWith("awcms_sikesra_"));
	const inventory = {
		backupDir,
		totalTables: tables.length,
		sikesraTableCount: sikesraTables.length,
		sikesraTables,
		coreTableCount: tables.filter((table) => table.startsWith("_emdash_")).length,
		pluginTableCount: tables.filter((table) => table.startsWith("_plugin_")).length,
		otherTableCount: tables.filter((table) => !table.startsWith("_emdash_") && !table.startsWith("_plugin_") && !table.startsWith("awcms_sikesra_")).length,
		sikesraObjectCount: objects.filter(isSikesraObject).length,
		restoreFiles: buildPlan({ split: false }).map((step) => step.file),
	};

	if (json) {
		process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
		return;
	}

	process.stdout.write(`Backup directory: ${inventory.backupDir}\n`);
	process.stdout.write(`Total tables: ${inventory.totalTables}\n`);
	process.stdout.write(`SIKESRA tables: ${inventory.sikesraTableCount}\n`);
	process.stdout.write(`Core EmDash tables: ${inventory.coreTableCount}\n`);
	process.stdout.write(`Plugin infrastructure tables: ${inventory.pluginTableCount}\n`);
	process.stdout.write(`Other tables: ${inventory.otherTableCount}\n`);
	process.stdout.write(`SIKESRA schema objects: ${inventory.sikesraObjectCount}\n`);
	process.stdout.write("\nSIKESRA tables:\n");
	for (const table of sikesraTables) {
		process.stdout.write(`- ${table}\n`);
	}
}

function runRestore(rest) {
	ensureFiles();
	const database = readFlagValue(rest, "--database") ?? process.env.SIKESRA_D1_DATABASE ?? process.env.D1_DATABASE;
	if (!database) {
		process.stderr.write("Missing database name. Pass --database <name> or set SIKESRA_D1_DATABASE.\n");
		process.exit(1);
	}

	const execute = rest.includes("--execute");
	const split = rest.includes("--split");
	const target = rest.includes("--local") ? "--local" : "--remote";
	const plan = buildPlan({ split });

	process.stdout.write(`Restore mode: ${split ? "split" : "full"}\n`);
	process.stdout.write(`Database: ${database}\n`);
	process.stdout.write(`Target: ${target}\n`);
	process.stdout.write(`Execution: ${execute ? "apply" : "dry-run"}\n\n`);

	for (const step of plan) {
		const file = resolve(backupDir, step.file);
		process.stdout.write(`${step.label}\n`);
		process.stdout.write(`npx wrangler d1 execute ${database} ${target} --file ${file}\n\n`);
		if (!execute) continue;

		const result = spawnSync("npx", ["wrangler", "d1", "execute", database, target, "--file", file], {
			cwd: repoRoot,
			stdio: "inherit",
		});
		if (result.status !== 0) process.exit(result.status ?? 1);
	}
}

function buildPlan({ split }) {
	return split
		? [
				{ label: "1. Import regular schema", file: FILES.schema },
				{ label: "2. Import regular data", file: FILES.data },
				{ label: "3. Apply excluded schema objects", file: FILES.extras },
				{ label: "4. Rebuild FTS structures", file: FILES.fts },
			]
		: [
				{ label: "1. Import combined schema and data", file: FILES.full },
				{ label: "2. Apply excluded schema objects", file: FILES.extras },
				{ label: "3. Rebuild FTS structures", file: FILES.fts },
			];
}

function readTables() {
	return readFileSync(resolve(backupDir, FILES.tables), "utf8")
		.split(NEWLINE_PATTERN)
		.map((line) => line.trim())
		.filter(Boolean);
}

function readObjects() {
	const raw = JSON.parse(readFileSync(resolve(backupDir, FILES.objects), "utf8"));
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((entry) => (Array.isArray(entry?.results) ? entry.results : []));
}

function isSikesraObject(object) {
	const name = typeof object?.name === "string" ? object.name : "";
	const sql = typeof object?.sql === "string" ? object.sql : "";
	return name.includes("awcms_sikesra_") || sql.includes("awcms_sikesra_");
}

function ensureFiles() {
	for (const file of Object.values(FILES)) {
		const fullPath = resolve(backupDir, file);
		if (!existsSync(fullPath)) {
			process.stderr.write(`Missing backup artifact: ${fullPath}\n`);
			process.exit(1);
		}
	}
}

function readFlagValue(rest, flag) {
	const index = rest.indexOf(flag);
	if (index === -1) return null;
	return rest[index + 1] ?? null;
}

function printHelp() {
	process.stdout.write("Usage:\n");
	process.stdout.write("  node scripts/sikesra-d1-overlay.mjs inventory [--json]\n");
	process.stdout.write(
		"  node scripts/sikesra-d1-overlay.mjs restore --database <name> [--split] [--local] [--execute]\n",
	);
}
