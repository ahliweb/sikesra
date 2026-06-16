#!/usr/bin/env node

// ============================================================================
// ARCHIVED (Juni 2026): Script ini merujuk arsitektur SIKESRA Generasi 1 yang
// ditinggalkan 22 Mei 2026 (commit b1bb0b15). Path/tabel yang dirujuk TIDAK ADA
// di repo saat ini. JANGAN dijalankan tanpa membaca scripts/archive/README.md
// dan docs/prd/03.PLUGIN_ARCHITECTURE.md §8a terlebih dahulu.
// ============================================================================

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const distDir = resolve(repoRoot, process.env.SIKESRA_DIST_DIR ?? "dist/server");
const CLOUDFLARE_IMPORT_PATTERN = /import "cloudflare:workers";\n?/g;
const wrapperTemplatePath = resolve(
	repoRoot,
	process.env.SIKESRA_WRAPPER_TEMPLATE ?? "infra/sikesra/worker-wrapper-template.mjs",
);

function readRequired(path, label) {
	if (!existsSync(path)) {
		throw new Error(`[sikesra-postbuild] missing ${label}: ${path}`);
	}
	return readFileSync(path, "utf8");
}

function patchWranglerConfig() {
	const wranglerPath = resolve(distDir, "wrangler.json");
	if (!existsSync(wranglerPath)) return false;

	const current = JSON.parse(readRequired(wranglerPath, "generated wrangler config"));
	current.main = "worker-wrapper.mjs";
	writeFileSync(wranglerPath, `${JSON.stringify(current, null, 2)}\n`);
	return true;
}

function patchEntryImport() {
	const entryPath = resolve(distDir, "entry.mjs");
	if (!existsSync(entryPath)) return false;

	const current = readFileSync(entryPath, "utf8");
	const next = current.replace(CLOUDFLARE_IMPORT_PATTERN, "");
	if (next === current) return false;
	writeFileSync(entryPath, next);
	return true;
}

function writeWorkerWrapper() {
	const wrapper = readRequired(wrapperTemplatePath, "SIKESRA worker wrapper template");
	writeFileSync(resolve(distDir, "worker-wrapper.mjs"), wrapper);
	return true;
}

const patched = [];
if (patchWranglerConfig()) patched.push("wrangler main");
if (patchEntryImport()) patched.push("entry import");
if (writeWorkerWrapper()) patched.push("worker wrapper");

process.stdout.write(`[sikesra-postbuild] patched ${patched.join(", ")}\n`);
