import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
	AWCMS_SIKESRA_DASHBOARD_MODULE_CARDS,
	AWCMS_SIKESRA_PLUGIN_HEADER_MENU,
	filterPluginHeaderMenu,
} from "../src/admin.js";
import { SIKESRA_REFERENCE_FIXTURES, maskSensitive } from "../src/fixtures.js";
import { awcmsMicroExamplePlugin } from "../src/index.js";
import { AWCMS_SIKESRA_PERMISSION_LIST } from "../src/permissions.js";
import {
	AWCMS_SIKESRA_ADMIN_PAGES,
	AWCMS_SIKESRA_ADMIN_WIDGETS,
	AWCMS_SIKESRA_CAPABILITIES,
	AWCMS_SIKESRA_DESCRIPTOR_STORAGE,
	AWCMS_SIKESRA_FIELD_WIDGETS,
	AWCMS_SIKESRA_PLUGIN_ID,
	AWCMS_SIKESRA_PORTABLE_TEXT_BLOCKS,
	AWCMS_SIKESRA_STORAGE,
	createAuditRecord,
	createNativeRoutes,
	createSharedHooks,
} from "../src/runtime.js";
import sandboxPlugin from "../src/sandbox.js";

function parseJsoncObject<T>(source: string): T {
	let output = "";
	let index = 0;
	let inString = false;
	let escaped = false;
	let quote = "";

	while (index < source.length) {
		const char = source[index];
		const next = source[index + 1];

		if (inString) {
			output += char;
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === quote) {
				inString = false;
				quote = "";
			}
			index += 1;
			continue;
		}

		if (char === '"' || char === "'") {
			inString = true;
			quote = char;
			output += char;
			index += 1;
			continue;
		}

		if (char === "/" && next === "/") {
			index += 2;
			while (index < source.length && source[index] !== "\n") {
				index += 1;
			}
			continue;
		}

		if (char === "/" && next === "*") {
			index += 2;
			while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
				index += 1;
			}
			index += 2;
			continue;
		}

		output += char;
		index += 1;
	}

	return JSON.parse(output.replace(/,\s*([}\]])/g, "$1")) as T;
}

function createMockContext() {
	const kvData = new Map<string, unknown>();
	const collections = {
		auditEvents: new Map<string, unknown>(),
		accessChangeEvents: new Map<string, unknown>(),
		abacChangeEvents: new Map<string, unknown>(),
		registryEntities: new Map<string, unknown>(),
		settingsState: new Map<string, unknown>(),
		pluginState: new Map<string, unknown>(),
		verificationStageState: new Map<string, unknown>(),
		abacAttributeCatalog: new Map<string, unknown>(),
		abacPolicyRules: new Map<string, unknown>(),
		abacResourceAssignments: new Map<string, unknown>(),
		abacSubjectAssignments: new Map<string, unknown>(),
		contentSnapshots: new Map<string, unknown>(),
		permissionCatalog: new Map<string, unknown>(),
		roleCatalog: new Map<string, unknown>(),
		rolePermissionAssignments: new Map<string, unknown>(),
		userRoleAssignments: new Map<string, unknown>(),
		supportingDocuments: new Map<string, unknown>(),
		verificationEvents: new Map<string, unknown>(),
	};
	const auditTableRows: Array<Record<string, unknown>> = [];
	const storageByCollectionName: Record<string, Map<string, unknown>> = {
		sikesra_audit_events: collections.auditEvents,
		sikesra_access_change_events: collections.accessChangeEvents,
		sikesra_abac_change_events: collections.abacChangeEvents,
		sikesra_registry_entities: collections.registryEntities,
		sikesra_settings_state: collections.settingsState,
		sikesra_plugin_state: collections.pluginState,
		sikesra_verification_stage_state: collections.verificationStageState,
		sikesra_abac_attribute_catalog: collections.abacAttributeCatalog,
		sikesra_abac_policy_rules: collections.abacPolicyRules,
		sikesra_abac_resource_assignments: collections.abacResourceAssignments,
		sikesra_abac_subject_assignments: collections.abacSubjectAssignments,
		sikesra_content_snapshots: collections.contentSnapshots,
		sikesra_permission_catalog: collections.permissionCatalog,
		sikesra_role_catalog: collections.roleCatalog,
		sikesra_role_permission_assignments: collections.rolePermissionAssignments,
		sikesra_user_role_assignments: collections.userRoleAssignments,
		sikesra_supporting_documents: collections.supportingDocuments,
		sikesra_verification_events: collections.verificationEvents,
	};
	type DbRow = {
		plugin_id: string;
		collection: string;
		id: string;
		data: string;
		created_at: string;
		updated_at: string;
	};
	const dbRows: DbRow[] = [];
	const syncCollectionMap = (row: DbRow) => {
		const target = storageByCollectionName[row.collection];
		if (!target) return;
		target.set(row.id, JSON.parse(row.data));
	};
	const unsyncCollectionMap = (row: DbRow) => {
		const target = storageByCollectionName[row.collection];
		if (!target) return;
		target.delete(row.id);
	};
	const cloneRow = (row: DbRow) => ({ ...row });
	const auditRowToData = (row: Record<string, unknown>) => ({
		id: row.id,
		timestamp: row.timestamp,
		kind: row.kind,
		scope: row.scope,
		actor: row.actor,
		summary: row.summary,
		metadata: JSON.parse(String(row.metadata ?? "{}")),
		userId: row.user_id ?? undefined,
		userName: row.user_name ?? undefined,
	});
	const schemaBuilder = {
		ifNotExists() {
			return schemaBuilder;
		},
		addColumn() {
			return schemaBuilder;
		},
		execute: vi.fn(async () => undefined),
	};
	const queryRows = (filters: Record<string, string>) =>
		dbRows
			.filter((row) => {
				for (const [key, value] of Object.entries(filters)) {
					if ((row as Record<string, string>)[key] !== value) return false;
				}
				return true;
			})
			.map(cloneRow);
	const seedDbRow = (row: DbRow) => {
		dbRows.push(row);
		syncCollectionMap(row);
	};
	const db = {
		schema: {
			createTable: vi.fn(() => schemaBuilder),
		},
		selectFrom(_table: string) {
			const filters: Record<string, string> = {};
			const query = {
				select(_columns: string[]) {
					return query;
				},
				orderBy() {
					return query;
				},
				limit() {
					return query;
				},
				where(column: string, _op: string, value: string) {
					filters[column] = value;
					return query;
				},
				async execute() {
					if (_table === "sikesra_audit_events") {
						return auditTableRows
							.filter((row) => {
								for (const [key, value] of Object.entries(filters)) {
									if ((row as Record<string, string>)[key] !== value) return false;
								}
								return true;
							})
							.map((row) => ({ ...row }));
					}
					return queryRows(filters);
				},
			};
			return query;
		},
		insertInto(_table: string) {
			let row: DbRow | Record<string, unknown> | null = null;
			return {
				values(nextRow: Record<string, unknown>) {
					row =
						_table === "sikesra_audit_events"
							? {
									id: String(nextRow.id ?? ""),
									timestamp: String(nextRow.timestamp ?? ""),
									kind: String(nextRow.kind ?? ""),
									scope: String(nextRow.scope ?? ""),
									actor: String(nextRow.actor ?? ""),
									summary: String(nextRow.summary ?? ""),
									metadata: String(nextRow.metadata ?? "{}"),
									user_id: nextRow.user_id ?? null,
									user_name: nextRow.user_name ?? null,
									created_at: String(nextRow.created_at ?? ""),
									updated_at: String(nextRow.updated_at ?? ""),
								}
							: {
									plugin_id: String(nextRow.plugin_id ?? ""),
									collection: String(nextRow.collection ?? ""),
									id: String(nextRow.id ?? ""),
									data: String(nextRow.data ?? "{}"),
									created_at: String(nextRow.created_at ?? ""),
									updated_at: String(nextRow.updated_at ?? ""),
								};
					const operation = {
						onConflict(_handler: unknown) {
							const statement = {
								async execute() {
									if (!row) return;
									if (_table === "sikesra_audit_events") {
										const auditRow = row as Record<string, unknown>;
										const index = auditTableRows.findIndex(
											(existing) => existing.id === auditRow.id,
										);
										if (index >= 0) {
											auditTableRows[index] = auditRow;
										} else {
											auditTableRows.push(auditRow);
										}
										collections.auditEvents.set(String(auditRow.id), auditRowToData(auditRow));
										return;
									}
									const storedRow = row as DbRow;
									const index = dbRows.findIndex(
										(existing) =>
											existing.plugin_id === storedRow.plugin_id &&
											existing.collection === storedRow.collection &&
											existing.id === storedRow.id,
									);
									if (index >= 0) {
										unsyncCollectionMap(dbRows[index]!);
										dbRows[index] = storedRow;
									} else {
										dbRows.push(storedRow);
									}
									syncCollectionMap(storedRow);
								},
							};
							return statement;
						},
						execute: async () => {
							if (!row) return;
							if (_table === "sikesra_audit_events") {
								const auditRow = row as Record<string, unknown>;
								const index = auditTableRows.findIndex((existing) => existing.id === auditRow.id);
								if (index >= 0) {
									auditTableRows[index] = auditRow;
								} else {
									auditTableRows.push(auditRow);
								}
								collections.auditEvents.set(String(auditRow.id), auditRowToData(auditRow));
								return;
							}
							const storedRow = row as DbRow;
							const index = dbRows.findIndex(
								(existing) =>
									existing.plugin_id === storedRow.plugin_id &&
									existing.collection === storedRow.collection &&
									existing.id === storedRow.id,
							);
							if (index >= 0) {
								unsyncCollectionMap(dbRows[index]!);
								dbRows[index] = storedRow;
							} else {
								dbRows.push(storedRow);
							}
							syncCollectionMap(storedRow);
						},
					};
					return operation;
				},
			};
		},
		deleteFrom(_table: string) {
			const filters: Record<string, string> = {};
			const query = {
				where(column: string, _op: string, value: string) {
					filters[column] = value;
					return query;
				},
				async execute() {
					if (_table === "sikesra_audit_events") {
						for (let index = auditTableRows.length - 1; index >= 0; index -= 1) {
							const row = auditTableRows[index]!;
							let matches = true;
							for (const [key, value] of Object.entries(filters)) {
								if ((row as Record<string, string>)[key] !== value) {
									matches = false;
									break;
								}
							}
							if (!matches) continue;
							collections.auditEvents.delete(String(row.id));
							auditTableRows.splice(index, 1);
						}
						return;
					}
					for (let index = dbRows.length - 1; index >= 0; index -= 1) {
						const row = dbRows[index]!;
						let matches = true;
						for (const [key, value] of Object.entries(filters)) {
							if ((row as Record<string, string>)[key] !== value) {
								matches = false;
								break;
							}
						}
						if (!matches) continue;
						unsyncCollectionMap(row);
						dbRows.splice(index, 1);
					}
				},
			};
			return query;
		},
	};
	const cron = {
		schedule: vi.fn(async () => {}),
		cancel: vi.fn(async () => {}),
	};

	const createCollection = (store: Map<string, unknown>) => ({
		put: vi.fn(async (id: string, value: unknown) => {
			store.set(id, value);
		}),
		get: vi.fn(async (id: string) => (store.has(id) ? store.get(id) : null)),
		delete: vi.fn(async (id: string) => store.delete(id)),
		count: vi.fn(async () => store.size),
		query: vi.fn(async () => ({
			items: Array.from(store.entries(), ([id, data]) => ({ id, data })),
			cursor: undefined,
			hasMore: false,
		})),
	});

	return {
		ctx: {
			plugin: { id: AWCMS_SIKESRA_PLUGIN_ID, version: "0.0.1" },
			request: new Request("https://example.test"),
			requestMeta: { ip: "127.0.0.1" },
			input: {},
			db,
			cron,
			log: {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			},
			kv: {
				get: vi.fn(async (key: string) => (kvData.has(key) ? kvData.get(key) : null)),
				set: vi.fn(async (key: string, value: unknown) => {
					kvData.set(key, value);
				}),
				delete: vi.fn(async (key: string) => kvData.delete(key)),
				list: vi.fn(async (prefix?: string) =>
					[...kvData.entries()]
						.filter(([key]) => !prefix || key.startsWith(prefix))
						.map(([key, value]) => ({ key, value })),
				),
			},
			storage: {
				sikesra_audit_events: createCollection(collections.auditEvents),
				sikesra_access_change_events: createCollection(collections.accessChangeEvents),
				sikesra_abac_change_events: createCollection(collections.abacChangeEvents),
				sikesra_registry_entities: createCollection(collections.registryEntities),
				sikesra_settings_state: createCollection(collections.settingsState),
				sikesra_plugin_state: createCollection(collections.pluginState),
				sikesra_verification_stage_state: createCollection(collections.verificationStageState),
				sikesra_abac_attribute_catalog: createCollection(collections.abacAttributeCatalog),
				sikesra_abac_policy_rules: createCollection(collections.abacPolicyRules),
				sikesra_abac_resource_assignments: createCollection(collections.abacResourceAssignments),
				sikesra_abac_subject_assignments: createCollection(collections.abacSubjectAssignments),
				sikesra_content_snapshots: createCollection(collections.contentSnapshots),
				sikesra_permission_catalog: createCollection(collections.permissionCatalog),
				sikesra_role_catalog: createCollection(collections.roleCatalog),
				sikesra_role_permission_assignments: createCollection(
					collections.rolePermissionAssignments,
				),
				sikesra_user_role_assignments: createCollection(collections.userRoleAssignments),
				sikesra_supporting_documents: createCollection(collections.supportingDocuments),
				sikesra_verification_events: createCollection(collections.verificationEvents),
			},
		},
		collections,
		db,
		dbRows,
		auditTableRows,
		seedDbRow,
		kvData,
		cron,
	};
}

describe("awcms micro example plugin", () => {
	it("builds a descriptor without touching EmDash core", () => {
		const descriptor = awcmsMicroExamplePlugin();
		const storage = descriptor.storage ?? {};

		expect(descriptor.id).toBe("awcms-micro-sikesra");
		expect(descriptor.adminEntry).toBe("@awcms-micro/plugin-sikesra/admin");
		expect(descriptor.capabilities).toEqual([...AWCMS_SIKESRA_CAPABILITIES]);
		expect(descriptor.storage).toEqual(AWCMS_SIKESRA_DESCRIPTOR_STORAGE);
		expect(Object.keys(storage)).toEqual(
			expect.arrayContaining([
				"sikesra_access_change_events",
				"sikesra_abac_change_events",
				"sikesra_registry_entities",
				"sikesra_settings_state",
				"sikesra_plugin_state",
				"sikesra_verification_stage_state",
				"sikesra_abac_attribute_catalog",
				"sikesra_abac_policy_rules",
				"sikesra_abac_resource_assignments",
				"sikesra_abac_subject_assignments",
				"sikesra_content_snapshots",
				"sikesra_permission_catalog",
				"sikesra_role_catalog",
				"sikesra_role_permission_assignments",
				"sikesra_user_role_assignments",
				"sikesra_supporting_documents",
				"sikesra_verification_events",
			]),
		);
		expect(Object.keys(storage).every((key) => key.startsWith("sikesra_"))).toBe(true);
		expect(AWCMS_SIKESRA_STORAGE.sikesra_access_change_events.indexes).toEqual([
			"timestamp",
			"kind",
			"scope",
			["scope", "timestamp"],
		]);
		expect(AWCMS_SIKESRA_STORAGE.sikesra_abac_change_events.indexes).toEqual([
			"timestamp",
			"kind",
			"scope",
			["scope", "timestamp"],
		]);
		expect(AWCMS_SIKESRA_STORAGE.sikesra_content_snapshots.indexes).toContainEqual([
			"contentId",
			"timestamp",
		]);
		expect(descriptor.adminPages).toEqual(AWCMS_SIKESRA_ADMIN_PAGES);
		expect(descriptor.adminWidgets).toEqual(AWCMS_SIKESRA_ADMIN_WIDGETS);
	});

	it("exposes the expected permission namespace", () => {
		expect(AWCMS_SIKESRA_PERMISSION_LIST).toContain("awcms:sikesra:dashboard:read");
		expect(AWCMS_SIKESRA_PERMISSION_LIST).toContain("awcms:sikesra:audit:read");
		expect(AWCMS_SIKESRA_PERMISSION_LIST).toContain("awcms:sikesra:permissions:write");
	});

	it("creates structured audit records", () => {
		const record = createAuditRecord({
			kind: "settings.update",
			scope: "settings",
			actor: "system",
			summary: "Updated settings",
			metadata: { governanceMode: "review" },
		});

		expect(record.kind).toBe("settings.update");
		expect(record.scope).toBe("settings");
		expect(record.actor).toBe("system");
		expect(record.summary).toBe("Updated settings");
	});

	it("stamps audit events with request user headers", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();
		const request = new Request("https://example.test", {
			headers: {
				"X-Sikesra-User-Id": "user-123",
				"X-Sikesra-User-Name": "Ada Lovelace",
			},
		});

		await routes["state/touch"]!.handler({
			...ctx,
			request,
			input: { note: "stamp check" },
		} as any);

		const stored = [...collections.auditEvents.values()].find(
			(item: any) => item.kind === "state.touch",
		) as any;
		expect(stored).toMatchObject({ userId: "user-123", userName: "Ada Lovelace" });
	});

	it("declares admin pages, widgets, blocks, and field widgets", () => {
		expect(AWCMS_SIKESRA_ADMIN_PAGES).toHaveLength(16);
		expect(AWCMS_SIKESRA_ADMIN_WIDGETS[0]?.id).toBe("governance-status");
		expect(AWCMS_SIKESRA_ADMIN_WIDGETS[1]?.id).toBe("access-rights-health");
		expect(AWCMS_SIKESRA_ADMIN_WIDGETS[2]?.id).toBe("abac-policy-status");
		expect(AWCMS_SIKESRA_PORTABLE_TEXT_BLOCKS[0]?.type).toBe("awcms-access-note");
		expect(AWCMS_SIKESRA_FIELD_WIDGETS[0]?.name).toBe("status-badge");
		expect(AWCMS_SIKESRA_ADMIN_PAGES.map((page) => page.path).toSorted()).toEqual(
			[
				"/abac/attributes",
				"/abac/policies",
				"/abac/preview",
				"/access/matrix",
				"/access/permissions",
				"/access/preview",
				"/access/roles",
				"/audit",
				"/data-types",
				"/documents",
				"/import",
				"/overview",
				"/regions",
				"/registry",
				"/reports",
				"/verification",
			].toSorted(),
		);
	});

	it("declares dashboard module cards and a filtered header menu model", () => {
		expect(AWCMS_SIKESRA_DASHBOARD_MODULE_CARDS).toHaveLength(8);
		expect(AWCMS_SIKESRA_DASHBOARD_MODULE_CARDS[0]?.href).toBe("/registry");
		expect(AWCMS_SIKESRA_PLUGIN_HEADER_MENU.map((item) => item.label)).toEqual([
			"Overview",
			"Data Entry",
			"Verification",
			"Reports",
			"Settings",
		]);

		const filtered = filterPluginHeaderMenu(
			[
				{
					id: "parent",
					label: "Parent",
					href: "/parent",
					permission: undefined,
					children: [
						{
							id: "read-child",
							label: "Read child",
							href: "/parent/read",
							permission: "awcms:sikesra:parent:read",
						},
						{
							id: "write-child",
							label: "Write child",
							href: "/parent/write",
							permission: "awcms:sikesra:parent:write",
						},
					],
				},
				{
					id: "blocked",
					label: "Blocked",
					href: "/blocked",
					permission: "awcms:sikesra:blocked:write",
					children: [
						{
							id: "blocked-child",
							label: "Blocked child",
							href: "/blocked/child",
							permission: "awcms:sikesra:blocked:write",
						},
					],
				},
			] as any,
			(permission) => !permission || permission === "awcms:sikesra:parent:read",
		);

		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.children).toHaveLength(1);
		expect(filtered[0]?.children?.[0]?.label).toBe("Read child");
	});

	it("ships deterministic SIKESRA reference fixtures", () => {
		expect(SIKESRA_REFERENCE_FIXTURES.registryEntities).toHaveLength(3);
		expect(SIKESRA_REFERENCE_FIXTURES.supportingDocuments).toHaveLength(4);
		expect(SIKESRA_REFERENCE_FIXTURES.verificationEvents).toHaveLength(3);
		expect(SIKESRA_REFERENCE_FIXTURES.publicAggregate.caveat).toContain("coarse counts");
		expect(SIKESRA_REFERENCE_FIXTURES.registryEntities[0]?.verificationStage).toBe(
			"active_verified",
		);
		expect(SIKESRA_REFERENCE_FIXTURES.registryEntities[2]?.sensitivity).toBe("highly_restricted");
		expect(
			SIKESRA_REFERENCE_FIXTURES.publicAggregate.categories.some((item) => item.suppressed),
		).toBe(true);
		expect(SIKESRA_REFERENCE_FIXTURES.abacPolicies[0]?.effect).toBe("deny");
	});

	it("masks sensitive values when access is denied", () => {
		expect(maskSensitive("0912345678", true)).toBe("0912345678");
		expect(maskSensitive("0912345678", false)).toBe("••••••");
		expect(maskSensitive(undefined, false)).toBeNull();
	});

	it("exposes public and protected routes", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();

		await routes["settings/save"]!.handler({
			...ctx,
			input: {
				publicStatusLabel: "green",
				auditRetentionDays: 14,
				governanceMode: "observe",
				metadataCanonicalBase: "https://example.test",
			},
		} as any);

		const publicResult = (await routes["public/status"]!.handler({
			...ctx,
			input: {},
		} as any)) as any;
		expect(Object.keys(publicResult).toSorted()).toEqual([
			"governanceMode",
			"plugin",
			"publicAggregate",
			"status",
		]);
		expect(publicResult.status).toBe("green");
		expect(publicResult.plugin.visibility).toBe("public-safe");
		expect(publicResult).not.toHaveProperty("storageKey");
		expect(publicResult).not.toHaveProperty("userId");
		expect(collections.settingsState.size).toBe(6);
		expect(collections.pluginState.size).toBeGreaterThan(0);
		expect(collections.pluginState.get("state:publicStatusHits")).toMatchObject({
			key: "state:publicStatusHits",
			value: 1,
		});
		expect(collections.settingsState.get("governanceMode")).toMatchObject({
			key: "governanceMode",
			value: "observe",
		});
		expect(collections.auditEvents.size).toBeGreaterThan(0);
	});

	it("advances one verification stage and persists the new state", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();

		const before = (await routes["verification/list"]!.handler({
			...ctx,
			request: new Request("https://example.test", {
				headers: { "X-Sikesra-User-Id": "user-demo-sopd" },
			}),
			input: {},
		} as any)) as any;
		expect(
			before.items.find((item: any) => item.registryEntityId === "registry-entity-guru-agama-01")
				?.verificationStage,
		).toBe("submitted_sopd");
		expect(before.currentVerifierLevels).toContain("sopd");
		expect(before.items).toHaveLength(1);

		const result = (await routes["verification/advance"]!.handler({
			...ctx,
			request: new Request("https://example.test", {
				headers: { "X-Sikesra-User-Id": "user-demo-sopd" },
			}),
			input: {
				registryEntityId: "registry-entity-guru-agama-01",
				actor: "sopd-officer",
				verifierLevel: "sopd",
				notes: "Promoted from district review",
			},
		} as any)) as any;

		expect(result.success).toBe(true);
		expect(result.item.verificationStage).toBe("verified_sopd");
		expect(result.item.currentLevel).toBe("sopd");
		expect(result.item.nextStage).toBe("submitted_regency");
		expect(result.item.nextLevel).toBe("kabupaten_admin");
		expect(result.item.inputLevel).toBe("kecamatan");
		expect(result.event.kind).toBe("verification.stage.advance");
		expect(result.verificationEvent.stage).toBe("verified_sopd");
		expect(result.verificationEvent.inputLevel).toBe("kecamatan");
		expect(result.verificationEvent.verifierLevel).toBe("sopd");
		expect(result.verificationEvent.verifierRegionScope).toBe("3171");
		expect(result.verificationEvent.verifierOrgScope).toBe("site-main");

		const after = (await routes["verification/list"]!.handler({ ...ctx, input: {} } as any)) as any;
		const afterItem = after.items.find(
			(item: any) => item.registryEntityId === "registry-entity-guru-agama-01",
		);
		expect(afterItem?.verificationStage).toBe("verified_sopd");
		expect(afterItem?.currentLevel).toBe("kabupaten_admin");
		expect(afterItem?.nextLevel).toBe("kabupaten_admin");
		expect(after.events).toHaveLength(1);
		expect(collections.auditEvents.size).toBeGreaterThan(0);
		expect(collections.verificationEvents.size).toBe(1);
		expect(collections.verificationStageState.get("registry-entity-guru-agama-01")).toMatchObject({
			registryEntityId: "registry-entity-guru-agama-01",
			stage: "verified_sopd",
		});
		expect(collections.pluginState.get("state:lastVerificationEventId")).toMatchObject({
			key: "state:lastVerificationEventId",
			value: expect.stringContaining("registry-entity-guru-agama-01"),
		});
	});

	it("rejects verification advances from the wrong user level", async () => {
		const { ctx, kvData } = createMockContext();
		kvData.set("state:sikesraVerificationStages", {
			"registry-entity-guru-agama-01": "submitted_village",
		});
		const routes = createNativeRoutes();

		const result = (await routes["verification/advance"]!.handler({
			...ctx,
			input: {
				registryEntityId: "registry-entity-guru-agama-01",
				actor: "district-officer",
				verifierLevel: "kecamatan",
				notes: "Attempted from wrong level",
			},
		} as any)) as any;

		expect(result.success).toBe(false);
		expect(result.error.code).toBe("INVALID_LEVEL");
	});

	it("lets admin sikesra see the full verification queue", async () => {
		const { ctx } = createMockContext();
		const routes = createNativeRoutes();

		const result = (await routes["verification/list"]!.handler({
			...ctx,
			request: new Request("https://example.test", {
				headers: { "X-Sikesra-User-Id": "user-demo-sikesra-admin" },
			}),
			input: {},
		} as any)) as any;

		expect(result.currentVerifierLevels).toContain("admin_sikesra");
		expect(result.items.length).toBeGreaterThan(1);
	});

	it("filters the verification queue by regional scope for SOPD verifiers", async () => {
		const { ctx, collections } = createMockContext();
		collections.registryEntities.set("registry-entity-outside-scope", {
			id: "registry-entity-outside-scope",
			code: "OS-001",
			label: "Outside Scope Entity",
			entityType: "guru_agama",
			sensitivity: "restricted",
			region: {
				provinceCode: "32",
				regencyCode: "3273",
				districtCode: "3273010",
				villageCode: "3273010001",
			},
			verificationStage: "submitted_sopd",
			inputLevel: "kecamatan",
			supportingDocumentIds: [],
			publicSummary: "Should be hidden from Jakarta SOPD verifier.",
		});
		const routes = createNativeRoutes();

		const result = (await routes["verification/list"]!.handler({
			...ctx,
			request: new Request("https://example.test", {
				headers: { "X-Sikesra-User-Id": "user-demo-sopd" },
			}),
			input: {},
		} as any)) as any;

		expect(result.currentVerifierLevels).toContain("sopd");
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.registryEntityId).toBe("registry-entity-guru-agama-01");
	});

	it("returns verification to the previous review level on needs revision", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();

		const result = (await routes["verification/reject"]!.handler({
			...ctx,
			input: {
				registryEntityId: "registry-entity-guru-agama-01",
				actor: "sopd-officer",
				verifierLevel: "sopd",
				notes: "Returned to district for correction",
			},
		} as any)) as any;

		expect(result.success).toBe(true);
		expect(result.item.verificationStage).toBe("submitted_district");
		expect(result.event.kind).toBe("verification.stage.reject");
		expect(result.verificationEvent.result).toBe("needs_review");
		expect(collections.verificationStageState.get("registry-entity-guru-agama-01")).toMatchObject({
			registryEntityId: "registry-entity-guru-agama-01",
			stage: "submitted_district",
		});
	});

	it("records manual touch state in plugin storage", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();

		const result = (await routes["state/touch"]!.handler({
			...ctx,
			input: { note: "manual review" },
		} as any)) as any;

		expect(result.success).toBe(true);
		expect(result.counter).toBe(1);
		expect(collections.pluginState.get("state:lastManualTouch")).toMatchObject({
			key: "state:lastManualTouch",
		});
		expect(collections.pluginState.get("state:manualTouches")).toMatchObject({
			key: "state:manualTouches",
			value: 1,
		});
	});

	it("migrates legacy verification state blobs into plugin storage on read", async () => {
		const { ctx, collections, kvData } = createMockContext();
		kvData.set("state:sikesraVerificationStages", {
			"registry-entity-guru-agama-01": "submitted_regency",
		});
		const routes = createNativeRoutes();

		const result = (await routes["verification/list"]!.handler({
			...ctx,
			input: {},
		} as any)) as any;

		expect(
			result.items.find((item: any) => item.registryEntityId === "registry-entity-guru-agama-01")
				?.verificationStage,
		).toBe("submitted_regency");
		expect(kvData.has("state:sikesraVerificationStages")).toBe(false);
		expect(collections.verificationStageState.get("registry-entity-guru-agama-01")).toMatchObject({
			registryEntityId: "registry-entity-guru-agama-01",
			stage: "submitted_regency",
		});
	});

	it("persists registry and document records in plugin storage", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();

		await routes["registry/save"]!.handler({
			...ctx,
			input: {
				id: "registry-entity-custom-01",
				code: "CU-001",
				label: "Custom Registry Entity",
				entityType: "rumah_ibadah",
				sensitivity: "public_safe",
				provinceCode: "31",
				regencyCode: "3171",
				districtCode: "3171010",
				villageCode: "3171010001",
				publicSummary: "Custom summary",
				inputLevel: "admin_sikesra",
			},
		} as any);

		await routes["documents/save"]!.handler({
			...ctx,
			input: {
				id: "doc-custom-01",
				registryEntityId: "registry-entity-custom-01",
				documentType: "surat_keterangan",
				title: "Custom Document",
				sensitivity: "internal",
			},
		} as any);

		const registry = (await routes["registry/list"]!.handler({ ...ctx, input: {} } as any)) as any;
		const documents = (await routes["documents/list"]!.handler({
			...ctx,
			input: {},
		} as any)) as any;

		expect(registry.items.some((item: any) => item.id === "registry-entity-custom-01")).toBe(true);
		expect(
			registry.items.find((item: any) => item.id === "registry-entity-custom-01")
				?.verificationStage,
		).toBe("submitted_village");
		expect(
			registry.items.find((item: any) => item.id === "registry-entity-custom-01")?.inputLevel,
		).toBe("admin_sikesra");
		expect(documents.items.some((item: any) => item.id === "doc-custom-01")).toBe(true);
		expect(collections.registryEntities.size).toBe(1);
		expect(collections.supportingDocuments.size).toBe(1);
	});

	it("migrates legacy registry and document blobs into plugin storage on read", async () => {
		const { ctx, collections, kvData } = createMockContext();
		kvData.set("custom:registryEntities", [
			{
				id: "registry-entity-legacy-01",
				code: "LG-001",
				label: "Legacy Registry Entity",
				entityType: "rumah_ibadah",
				sensitivity: "public_safe",
				region: {
					provinceCode: "31",
					regencyCode: "3171",
					districtCode: "3171010",
					villageCode: "3171010001",
				},
				verificationStage: "draft",
				supportingDocumentIds: [],
				publicSummary: "Legacy registry summary",
			},
		]);
		kvData.set("custom:supportingDocuments", [
			{
				id: "doc-legacy-01",
				registryEntityId: "registry-entity-legacy-01",
				documentType: "surat_keterangan",
				title: "Legacy Document",
				sensitivity: "internal",
				issuedAt: "2026-01-01T00:00:00.000Z",
				verifiedBy: "legacy-verifier",
			},
		]);
		const routes = createNativeRoutes();

		const registry = (await routes["registry/list"]!.handler({ ...ctx, input: {} } as any)) as any;
		const documents = (await routes["documents/list"]!.handler({
			...ctx,
			input: {},
		} as any)) as any;

		expect(registry.items.some((item: any) => item.id === "registry-entity-legacy-01")).toBe(true);
		expect(documents.items.some((item: any) => item.id === "doc-legacy-01")).toBe(true);
		expect(kvData.has("custom:registryEntities")).toBe(false);
		expect(kvData.has("custom:supportingDocuments")).toBe(false);
		expect(collections.registryEntities.get("registry-entity-legacy-01")).toMatchObject({
			id: "registry-entity-legacy-01",
			code: "LG-001",
		});
		expect(collections.supportingDocuments.get("doc-legacy-01")).toMatchObject({
			id: "doc-legacy-01",
			registryEntityId: "registry-entity-legacy-01",
		});
	});

	it("records lifecycle and cron behavior", async () => {
		const { ctx, cron, collections } = createMockContext();
		const hooks = createSharedHooks();

		const activate =
			typeof hooks?.["plugin:activate"] === "function"
				? hooks["plugin:activate"]
				: hooks?.["plugin:activate"]?.handler;
		const cronHook = typeof hooks?.cron === "function" ? hooks.cron : hooks?.cron?.handler;

		await activate!({} as any, ctx as any);
		await cronHook!(
			{
				name: "governance-summary",
				schedule: "0 * * * *",
				triggeredAt: new Date().toISOString(),
			} as any,
			ctx as any,
		);

		expect(cron.schedule).toHaveBeenCalledWith("governance-summary", { schedule: "0 * * * *" });
		expect(collections.auditEvents.size).toBeGreaterThan(1);
		expect(collections.permissionCatalog.size).toBeGreaterThan(0);
		expect(collections.roleCatalog.get("admin-sikesra")).toMatchObject({ slug: "admin-sikesra" });
		expect(collections.userRoleAssignments.get("user-demo-village")).toMatchObject({
			userId: "user-demo-village",
			roles: ["verifier-desa-kelurahan"],
		});
		expect(collections.pluginState.size).toBeGreaterThan(0);
		expect(collections.pluginState.get("state:lastLifecycle")).toMatchObject({
			key: "state:lastLifecycle",
			value: "plugin:activate",
		});
		expect(collections.pluginState.get("state:lastCronAt")).toMatchObject({
			key: "state:lastCronAt",
		});
		expect(collections.pluginState.get("state:lastPreviewUserId")).toMatchObject({
			key: "state:lastPreviewUserId",
			value: "user-demo-editor",
		});
		expect(collections.pluginState.get("state:lastAbacPreviewSubjectId")).toMatchObject({
			key: "state:lastAbacPreviewSubjectId",
			value: "user-demo-editor",
		});
		expect(collections.pluginState.get("state:lastAbacPreviewResourceId")).toMatchObject({
			key: "state:lastAbacPreviewResourceId",
			value: "resource-public-post",
		});
	});

	it("migrates legacy plugin storage collections into prefixed collections on activate", async () => {
		const { ctx, collections, dbRows, seedDbRow, auditTableRows } = createMockContext();
		const hooks = createSharedHooks();
		const activate =
			typeof hooks?.["plugin:activate"] === "function"
				? hooks["plugin:activate"]
				: hooks?.["plugin:activate"]?.handler;

		seedDbRow({
			plugin_id: "awcms-micro-example",
			collection: "auditEvents",
			id: "audit-legacy-01",
			data: JSON.stringify({
				id: "audit-legacy-01",
				timestamp: "2026-01-01T00:00:00.000Z",
				kind: "legacy.audit",
				scope: "lifecycle",
				actor: "system",
				summary: "Legacy audit row",
				metadata: {},
			}),
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
		});
		seedDbRow({
			plugin_id: AWCMS_SIKESRA_PLUGIN_ID,
			collection: "sikesra_audit_events",
			id: "audit-legacy-01",
			data: JSON.stringify({
				id: "audit-legacy-01",
				timestamp: "2026-02-01T00:00:00.000Z",
				kind: "current.audit",
				scope: "lifecycle",
				actor: "system",
				summary: "Current audit row",
				metadata: {},
			}),
			created_at: "2026-02-01T00:00:00.000Z",
			updated_at: "2026-02-01T00:00:00.000Z",
		});
		auditTableRows.push({
			id: "audit-legacy-01",
			timestamp: "2026-02-01T00:00:00.000Z",
			kind: "current.audit",
			scope: "lifecycle",
			actor: "system",
			summary: "Current audit row",
			metadata: "{}",
			user_id: null,
			user_name: null,
			created_at: "2026-02-01T00:00:00.000Z",
			updated_at: "2026-02-01T00:00:00.000Z",
		});

		await activate!({} as any, ctx as any);

		const auditList = (await createNativeRoutes()["audit/list"]!.handler({
			...ctx,
			input: {},
		} as any)) as any;
		expect(
			auditList.items.some(
				(item: any) => item.id === "audit-legacy-01" && item.summary === "Current audit row",
			),
		).toBe(true);
		expect(dbRows.some((row) => row.collection === "auditEvents")).toBe(false);
		expect(auditTableRows.some((row) => row.id === "audit-legacy-01")).toBe(true);
		expect(collections.auditEvents.get("audit-legacy-01")).toMatchObject({
			kind: "current.audit",
			summary: "Current audit row",
		});
	});

	it("records content and media hooks", async () => {
		const { ctx, collections } = createMockContext();
		const hooks = createSharedHooks();

		const beforeSave =
			typeof hooks?.["content:beforeSave"] === "function"
				? hooks["content:beforeSave"]
				: hooks?.["content:beforeSave"]?.handler;
		const afterPublish =
			typeof hooks?.["content:afterPublish"] === "function"
				? hooks["content:afterPublish"]
				: hooks?.["content:afterPublish"]?.handler;
		const beforeUpload =
			typeof hooks?.["media:beforeUpload"] === "function"
				? hooks["media:beforeUpload"]
				: hooks?.["media:beforeUpload"]?.handler;
		const afterUpload =
			typeof hooks?.["media:afterUpload"] === "function"
				? hooks["media:afterUpload"]
				: hooks?.["media:afterUpload"]?.handler;

		await beforeSave!(
			{ collection: "posts", isNew: false, content: { id: "post-1", slug: "hello" } } as any,
			ctx as any,
		);
		await afterPublish!(
			{ collection: "posts", content: { id: "post-1", authorId: "user-1" } } as any,
			ctx as any,
		);
		await beforeUpload!(
			{ file: { name: "logo.png", type: "image/png", size: 1234 } } as any,
			ctx as any,
		);
		await afterUpload!({ media: { id: "media-1", mimeType: "image/png" } } as any, ctx as any);

		expect(collections.contentSnapshots.size).toBe(1);
		expect(collections.auditEvents.size).toBeGreaterThanOrEqual(4);
	});

	it("supports access-rights catalog create, list, matrix, and preview flows", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();

		const permissionsBefore = (await routes["access/permissions/list"]!.handler({
			...ctx,
			input: {},
		} as any)) as any;
		expect(permissionsBefore.items.length).toBeGreaterThan(0);

		await routes["access/permissions/save"]!.handler({
			...ctx,
			input: {
				slug: "documents.review",
				label: "Review Documents",
				description: "Allows reviewing governed documents.",
				scope: "documents",
			},
		} as any);

		await routes["access/roles/save"]!.handler({
			...ctx,
			input: {
				slug: "document-reviewer",
				label: "Document Reviewer",
				description: "Reviews controlled documents.",
			},
		} as any);

		await routes["access/matrix/save"]!.handler({
			...ctx,
			input: {
				roleSlug: "document-reviewer",
				permissions: ["documents.review", "audit.read.events"],
			},
		} as any);

		await routes["access/users/save"]!.handler({
			...ctx,
			input: {
				userId: "user-demo-doc-reviewer",
				roles: ["document-reviewer"],
			},
		} as any);

		const preview = (await routes["access/preview"]!.handler({
			...ctx,
			input: { userId: "user-demo-doc-reviewer", permissionSlug: "documents.review" },
		} as any)) as any;

		expect(preview.allowed).toBe(true);
		expect(preview.matchedRoles).toContain("document-reviewer");
		expect(collections.accessChangeEvents.size).toBeGreaterThanOrEqual(4);
	});

	it("returns a deterministic denied access preview when roles do not grant the permission", async () => {
		const { ctx } = createMockContext();
		const routes = createNativeRoutes();

		const preview = (await routes["access/preview"]!.handler({
			...ctx,
			input: { userId: "user-demo-editor", permissionSlug: "content.review.publish" },
		} as any)) as any;

		expect(preview.allowed).toBe(false);
		expect(preview.reason).toContain("not granted");
	});

	it("supports ABAC attribute, policy, preview, and sensitive-action audit flows", async () => {
		const { ctx, collections } = createMockContext();
		const routes = createNativeRoutes();

		const attributes = (await routes["abac/attributes/list"]!.handler({
			...ctx,
			input: {},
		} as any)) as any;
		expect(attributes.items.length).toBeGreaterThan(0);

		await routes["abac/attributes/save"]!.handler({
			...ctx,
			input: {
				key: "action",
				label: "Action",
				targetType: "context",
				description: "Action under review",
			},
		} as any);

		await routes["abac/policies/save"]!.handler({
			...ctx,
			input: {
				id: "allow-published-read-jakarta",
				label: "Allow published read in Jakarta",
				effect: "allow",
				actions: ["content.read"],
				requiredSubject: { tenant_id: "tenant-a" },
				requiredResource: { resource_status: "published", resource_sensitivity: "public" },
				requiredContext: { region_scope: "id-jakarta" },
			},
		} as any);

		const allow = (await routes["abac/preview"]!.handler({
			...ctx,
			input: {
				subjectId: "user-demo-editor",
				resourceId: "resource-public-post",
				action: "content.read",
				contextAttributes: { region_scope: "id-jakarta" },
			},
		} as any)) as any;

		expect(allow.allowed).toBe(true);
		expect(allow.effect).toBe("allow");

		const deny = (await routes["abac/preview"]!.handler({
			...ctx,
			input: {
				subjectId: "user-demo-reviewer",
				resourceId: "resource-sensitive-policy",
				action: "content.publish_sensitive",
				contextAttributes: {},
			},
		} as any)) as any;

		expect(deny.allowed).toBe(false);
		expect(deny.reason).toContain("Explicit deny");

		const missing = (await routes["abac/preview"]!.handler({
			...ctx,
			input: {
				subjectId: "user-demo-editor",
				resourceId: "resource-public-post",
				action: "content.read",
				contextAttributes: {},
			},
		} as any)) as any;

		expect(missing.allowed).toBe(false);
		expect(missing.reason).toContain("Missing required attributes");

		const regionMismatch = (await routes["abac/preview"]!.handler({
			...ctx,
			input: {
				subjectId: "user-demo-editor",
				resourceId: "resource-public-post",
				action: "content.read",
				contextAttributes: { region_scope: "id-bandung" },
			},
		} as any)) as any;

		expect(regionMismatch.allowed).toBe(false);
		expect(regionMismatch.reason).toBe("No matching allow policy for action content.read");

		await routes["abac/enforce-demo"]!.handler({
			...ctx,
			input: {
				subjectId: "user-demo-reviewer",
				resourceId: "resource-sensitive-policy",
				action: "content.publish_sensitive",
				contextAttributes: { action: "content.publish_sensitive" },
			},
		} as any);

		expect(collections.abacChangeEvents.size).toBeGreaterThanOrEqual(3);
	});

	it("exports a sandbox-compatible server entry", () => {
		expect(sandboxPlugin.hooks?.["plugin:install"]).toBeTruthy();
		expect(sandboxPlugin.routes?.["public/status"]).toBeTruthy();
	});

	it("keeps the manifest aligned with the implemented plugin surface", () => {
		const manifestPath = resolve(import.meta.dirname, "../emdash-plugin.jsonc");
		const manifest = parseJsoncObject<any>(readFileSync(manifestPath, "utf8"));

		expect(manifest.slug).toBe("awcms-micro-sikesra");
		expect(manifest.capabilities).toEqual([...AWCMS_SIKESRA_CAPABILITIES]);
		expect(manifest.admin.pages).toHaveLength(14);
		expect(manifest.admin.widgets[0].id).toBe("governance-status");
		expect(manifest.admin.widgets[1].id).toBe("access-rights-health");
		expect(manifest.admin.widgets[2].id).toBe("abac-policy-status");
		expect(Object.keys(manifest.storage).toSorted()).toEqual([
			"abacAttributeCatalog",
			"abacChangeEvents",
			"abacPolicyRules",
			"abacResourceAssignments",
			"abacSubjectAssignments",
			"accessChangeEvents",
			"contentSnapshots",
			"permissionCatalog",
			"roleCatalog",
			"rolePermissionAssignments",
			"userRoleAssignments",
		]);
	});
});
