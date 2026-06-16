#!/usr/bin/env node

// ============================================================================
// ARCHIVED (Juni 2026): Script ini merujuk arsitektur SIKESRA Generasi 1 yang
// ditinggalkan 22 Mei 2026 (commit b1bb0b15). Path/tabel yang dirujuk TIDAK ADA
// di repo saat ini. JANGAN dijalankan tanpa membaca scripts/archive/README.md
// dan docs/prd/03.PLUGIN_ARCHITECTURE.md §8a terlebih dahulu.
// ============================================================================

const baseUrl = process.env.SIKESRA_BASE_URL || "http://127.0.0.1:4321";
const defaultPages = ["/", "/entities", "/verification"];
const pages = parsePages();
const cookie = process.env.SIKESRA_ADMIN_COOKIE || "";
const expectUnauthorized = process.env.SIKESRA_EXPECT_UNAUTHORIZED === "1";

function fail(message) {
	console.error(`[sikesra-smoke-admin-route] ${message}`);
	process.exit(1);
}

function extractBlocks(payload) {
	return payload?.data?.blocks ?? payload?.data?.data?.blocks ?? null;
}

function parsePages() {
	const rawPages = process.env.SIKESRA_ADMIN_PAGES || process.env.SIKESRA_ADMIN_PAGE || "";
	const parsed = rawPages
		.split(",")
		.map((page) => page.trim())
		.filter(Boolean);
	return parsed.length > 0 ? parsed : defaultPages;
}

function assertBlockShape(blocks, page) {
	if (!Array.isArray(blocks)) {
		fail(`expected data.blocks array for page=${page}`);
	}

	for (const [index, block] of blocks.entries()) {
		if (!block || typeof block !== "object" || typeof block.type !== "string") {
			fail(
				`invalid block response shape for page=${page} at index=${index}: ${JSON.stringify(block)}`,
			);
		}
	}
}

async function smokePage(headers, page) {
	const response = await fetch(`${baseUrl}/_emdash/api/plugins/sikesra/admin`, {
		method: "POST",
		headers,
		body: JSON.stringify({ type: "page_load", page }),
	});

	const text = await response.text();
	let payload = null;
	try {
		payload = JSON.parse(text);
	} catch {
		fail(`expected JSON response for page=${page}, received: ${text.slice(0, 200)}`);
	}

	if (expectUnauthorized) {
		if (response.status !== 401 || payload?.error?.message !== "Authentication required") {
			fail(`expected 401 Authentication required for page=${page}, received status=${response.status}`);
		}
		process.stdout.write(`[sikesra-smoke-admin-route] unauthorized path verified for page=${page}\n`);
		return;
	}

	if (!response.ok) {
		fail(`expected authenticated success for page=${page}, received status=${response.status}`);
	}

	const blocks = extractBlocks(payload);
	assertBlockShape(blocks, page);
	process.stdout.write(`[sikesra-smoke-admin-route] ok page=${page} blocks=${blocks.length}\n`);
}

async function main() {
	const headers = {
		"Content-Type": "application/json",
		"X-EmDash-Request": "1",
	};

	if (cookie) headers.Cookie = cookie;

	for (const page of pages) {
		await smokePage(headers, page);
	}
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});
