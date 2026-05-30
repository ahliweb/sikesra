import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DatabaseSync } from "node:sqlite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mirrorPath = path.join(rootDir, ".local/d1-mirror/awcms-micro-d1.dbeaver.sqlite");

if (!existsSync(mirrorPath)) {
	console.error(`D1 mirror not found: ${mirrorPath}`);
	process.exitCode = 1;
	process.exit();
}

const stats = statSync(mirrorPath);
const db = new DatabaseSync(mirrorPath, { readonly: true, fileMustExist: true });

try {
	const collectionSlugs = db
		.prepare("SELECT slug FROM _emdash_collections ORDER BY slug")
		.all()
		.map((row) => row.slug);
	const contentTables = db
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'ec_%' ORDER BY name")
		.all()
		.map((row) => row.name);
	const expectedContentTables = collectionSlugs.map((slug) => `ec_${slug}`);
	const missingContentTables = expectedContentTables.filter((name) => !contentTables.includes(name));
	const extraContentTables = contentTables.filter((name) => !expectedContentTables.includes(name));

	const objects = db
		.prepare(
			"SELECT type, name, tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
		)
		.all();
	const byType = db
		.prepare(
			"SELECT type, COUNT(*) AS count FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' GROUP BY type ORDER BY type",
		)
		.all();
	const galleriesIndexes = db
		.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'idx_ec_galleries%' ORDER BY name")
		.all();

	console.log(`Mirror: ${mirrorPath}`);
	console.log(`Size: ${stats.size} bytes`);
	console.log(`Modified: ${stats.mtime.toISOString()}`);
	console.log("");
	console.log(`Collections: ${collectionSlugs.length}`);
	console.log(`Content tables: ${contentTables.length}`);
	console.log(`Content table parity: ${missingContentTables.length === 0 && extraContentTables.length === 0 ? "ok" : "drift"}`);
	if (missingContentTables.length > 0) {
		console.log(`Missing content tables: ${missingContentTables.join(", ")}`);
	}
	if (extraContentTables.length > 0) {
		console.log(`Extra content tables: ${extraContentTables.join(", ")}`);
	}
	console.log("");
	for (const row of byType) {
		console.log(`${row.type}: ${row.count}`);
	}
	console.log("");
	console.log("Objects:");
	for (const row of objects) {
		console.log(`- ${row.type}: ${row.name}${row.tbl_name !== row.name ? ` (${row.tbl_name})` : ""}`);
	}
	console.log("");
	console.log("ec_galleries indexes:");
	if (galleriesIndexes.length === 0) {
		console.log("- none");
	} else {
		for (const row of galleriesIndexes) {
			console.log(`- ${row.name}`);
		}
	}

	if (missingContentTables.length > 0 || extraContentTables.length > 0) {
		process.exitCode = 1;
	}
} finally {
	db.close();
}
