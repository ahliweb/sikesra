import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	handlePluginDisable,
	handlePluginEnable,
	handlePluginGet,
	handlePluginList,
} from "../../../src/api/handlers/plugins.js";
import type { SandboxedPluginEntry } from "../../../src/emdash-runtime.js";
import type { ResolvedPlugin } from "../../../src/plugins/types.js";
import { setupTestDatabase, teardownTestDatabase } from "../../utils/test-db.js";

describe("plugin handlers", () => {
	let db: Awaited<ReturnType<typeof setupTestDatabase>>;

	const trustedPlugin: ResolvedPlugin = {
		id: "forms",
		version: "1.0.0",
		capabilities: ["content:read"],
		allowedHosts: [],
		storage: {},
		hooks: {
			"content:afterSave": {
				pluginId: "forms",
				priority: 100,
				timeout: 5000,
				dependencies: [],
				errorPolicy: "abort",
				exclusive: false,
				handler: async () => undefined,
			},
		},
		routes: {},
		admin: {
			pages: [{ path: "/forms", label: "Forms", icon: "list" }],
			widgets: [{ id: "forms-status", title: "Forms", size: "half" }],
		},
	};

	const sandboxedPlugin: SandboxedPluginEntry = {
		id: "sikesra",
		version: "0.1.0",
		options: {},
		code: "export default {}",
		capabilities: ["content:read", "content:write"],
		allowedHosts: [],
		storage: {},
		adminPages: [{ path: "/", label: "Dashboard", icon: "shield" }],
		adminWidgets: [{ id: "overview", title: "SIKESRA", size: "third" }],
	};

	beforeEach(async () => {
		db = await setupTestDatabase();
	});

	afterEach(async () => {
		await teardownTestDatabase(db);
	});

	it("lists both trusted and sandboxed plugins", async () => {
		const result = await handlePluginList(db, [trustedPlugin], [sandboxedPlugin]);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.data.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "forms",
					hasAdminPages: true,
					hasDashboardWidgets: true,
					hasHooks: true,
				}),
				expect.objectContaining({
					id: "sikesra",
					hasAdminPages: true,
					hasDashboardWidgets: true,
					hasHooks: false,
					capabilities: ["content:read", "content:write"],
				}),
			]),
		);
	});

	it("gets sandboxed plugin details", async () => {
		const result = await handlePluginGet(db, [trustedPlugin], [sandboxedPlugin], "sikesra");

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.data.item).toEqual(
			expect.objectContaining({
				id: "sikesra",
				version: "0.1.0",
				hasAdminPages: true,
				hasDashboardWidgets: true,
			}),
		);
	});

	it("enables and disables sandboxed plugins", async () => {
		const enableResult = await handlePluginEnable(db, [trustedPlugin], [sandboxedPlugin], "sikesra");
		expect(enableResult.success).toBe(true);
		if (!enableResult.success) return;

		expect(enableResult.data.item).toEqual(
			expect.objectContaining({ id: "sikesra", enabled: true, status: "active" }),
		);

		const disableResult = await handlePluginDisable(db, [trustedPlugin], [sandboxedPlugin], "sikesra");
		expect(disableResult.success).toBe(true);
		if (!disableResult.success) return;

		expect(disableResult.data.item).toEqual(
			expect.objectContaining({ id: "sikesra", enabled: false, status: "inactive" }),
		);
	});
});
