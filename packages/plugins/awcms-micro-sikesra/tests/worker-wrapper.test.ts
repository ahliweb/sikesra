import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const wrapperTemplatePath = new URL("../../../../infra/sikesra/worker-wrapper-template.mjs", import.meta.url);

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function loadWrapperWithEntry(entrySource: string) {
	const dir = await mkdtemp(join(tmpdir(), "sikesra-wrapper-"));
	tempDirs.push(dir);

	await writeFile(join(dir, "entry.mjs"), entrySource, "utf8");
	await writeFile(join(dir, "worker-wrapper.mjs"), await readFile(wrapperTemplatePath, "utf8"), "utf8");

	return import(pathToFileURL(join(dir, "worker-wrapper.mjs")).href);
}

describe("sikesra worker wrapper", () => {
	it("serves favicon requests without touching the host app worker", async () => {
		const mod = await loadWrapperWithEntry(
			"export default { async fetch() { throw new Error('host worker should not run'); } };",
		);

		const response = await mod.default.fetch(new Request("https://example.com/favicon.ico"), {}, {});

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("image/svg+xml");
		expect(response.headers.get("X-Route")).toBe("favicon");
		await expect(response.text()).resolves.toContain("<svg");
	});

	it("blocks non-SIKESRA plugin routes in production (#323)", async () => {
		const mod = await loadWrapperWithEntry(
			"export default { async fetch() { return new Response('ok'); } };",
		);

		const blockedPaths = [
			"/_emdash/api/plugins/forms/v1/status",
			"/_emdash/api/plugins/webhook-notifier/v1/hook",
			"/_emdash/admin/plugins/forms/",
			"/_emdash/admin/plugins/audit-log/",
			"/_emdash/api/admin/plugins/updates",
			"/_emdash/api/admin/plugins/marketplace",
			"/_emdash/api/admin/plugins/forms/disable",
		];

		for (const path of blockedPaths) {
			const response = await mod.default.fetch(new Request(`https://example.com${path}`), {}, {});
			expect(response.status).toBe(404);
			expect(response.headers.get("X-Route")).toBe("blocked-plugin");
			const body = await response.json();
			expect(body.error).toBe("Plugin not available in SIKESRA runtime");
		}
	});

	it("allows SIKESRA plugin routes through (#323)", async () => {
		const mod = await loadWrapperWithEntry(
			"export default { async fetch() { return new Response('sikesra-ok', { status: 200 }); } };",
		);

		const allowedPaths = [
			"/_emdash/api/plugins/sikesra/v1/status",
			"/_emdash/api/plugins/sikesra/admin",
			"/_emdash/api/plugins/sikesra/public/metadata",
		];

		for (const path of allowedPaths) {
			const response = await mod.default.fetch(new Request(`https://example.com${path}`), {}, {});
			expect(response.status).toBe(200);
			expect(response.headers.get("X-Route")).not.toBe("blocked-plugin");
		}
	});
});
