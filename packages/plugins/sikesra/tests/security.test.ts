import { describe, expect, it } from "vitest";

import {
	AUDIT_ACTIONS,
	SIKESRA_PERMISSIONS,
	SIKESRA_PERMISSION_LIST,
	buildAbacSubject,
	buildTrustedRequestContext,
	evaluateAbac,
	guardRoute,
	isHighRiskAction,
	maskNikKia,
	maskPhone,
	maskProtectedName,
	maskR2Key,
	checkRegionScope,
	writeAuditEvent,
} from "../src/index.js";

function makeContext(overrides = {}) {
	return buildTrustedRequestContext({
		requestId: "req-1",
		tenantId: "tenant-1",
		siteId: "site-1",
		userId: "user-1",
		roles: ["admin"],
		permissions: [...SIKESRA_PERMISSION_LIST],
		regionScope: { villageCodes: [] },
		...overrides,
	});
}

describe("SIKESRA security overlay", () => {
	it("keeps all permissions under the awcms:sikesra namespace", () => {
		for (const permission of SIKESRA_PERMISSION_LIST) {
			expect(permission.startsWith("awcms:sikesra:")).toBe(true);
		}
	});

	it("denies guarded routes without the required permission", () => {
		const ctx = makeContext({ permissions: [] });
		expect(guardRoute(ctx, "entity:read")).toEqual(
			expect.objectContaining({
				allowed: false,
				reasonCode: "FORBIDDEN",
			}),
		);
	});

	it("allows guarded routes with the required permission", () => {
		const ctx = makeContext({ permissions: [SIKESRA_PERMISSIONS.ENTITY_READ] });
		expect(guardRoute(ctx, "entity:read")).toEqual({ allowed: true });
	});

	it("enforces village scope checks", () => {
		const ctx = makeContext({ regionScope: { villageCodes: ["6201021001"] } });
		expect(checkRegionScope(ctx, "6201021001")).toBe(true);
		expect(checkRegionScope(ctx, "6201021002")).toBe(false);
	});

	it("denies public access to entity detail in ABAC", () => {
		const result = evaluateAbac(
			{
				subject: { roles: ["public"], permissions: [], tenantId: "tenant-1", siteId: "site-1" },
				resource: { resourceType: "entity" },
				action: "read",
				environment: {},
			},
			[],
			makeContext(),
		);
		expect(result.allowed).toBe(false);
		expect(result.reasonCode).toBe("public_denied_entity_detail");
	});

	it("applies deny precedence in ABAC policy evaluation", () => {
		const result = evaluateAbac(
			{
				subject: buildAbacSubject(makeContext()),
				resource: { resourceType: "entity", statusData: "archived" },
				action: "update",
				environment: {},
			},
			[
				{ id: "allow", name: "Allow update", effect: "allow", priority: 10, conditions: [] },
				{
					id: "deny",
					name: "Deny archived",
					effect: "deny",
					priority: 100,
					conditions: [
						{
							attributeCategory: "resource",
							attributeName: "statusData",
							operator: "equals",
							value: "archived",
						},
					],
				},
			],
			makeContext(),
		);
		expect(result.allowed).toBe(false);
		expect(result.matchedPolicyId).toBe("deny");
	});

	it("masks sensitive values by default", () => {
		expect(maskNikKia("1234567890123456", {
			canRevealSensitive: false,
			canRevealHighlyRestricted: false,
		})).toBe("************3456");
		expect(maskPhone("081234567890", {
			canRevealSensitive: false,
			canRevealHighlyRestricted: false,
		})).toBe("******7890");
		expect(maskProtectedName("Ahmad Fauzi", {
			canRevealSensitive: false,
			canRevealHighlyRestricted: false,
		})).not.toBe("Ahmad Fauzi");
		expect(maskR2Key()).toBeNull();
	});

	it("flags high-risk audit actions", () => {
		expect(isHighRiskAction(AUDIT_ACTIONS.CODE_CORRECT)).toBe(true);
		expect(isHighRiskAction(AUDIT_ACTIONS.SENSITIVE_REVEAL)).toBe(true);
		expect(isHighRiskAction(AUDIT_ACTIONS.ENTITY_UPDATE)).toBe(false);
	});

	it("writes audit records through the overlay helper", async () => {
		const calls = [];
		const db = {
			prepare(query) {
				return {
					bind(...values) {
						calls.push({ query, values });
						return {
							async run() {
								return { success: true };
							},
						};
					},
				};
			},
		};

		const result = await writeAuditEvent(
			db,
			{
				tenantId: "tenant-1",
				siteId: "site-1",
				action: AUDIT_ACTIONS.ENTITY_CREATE,
				resourceType: "entity",
				resourceId: "entity-1",
			},
			makeContext(),
		);

		expect(result.ok).toBe(true);
		expect(calls).toHaveLength(1);
		expect(calls[0].query).toContain("INSERT INTO awcms_sikesra_audit_logs");
	});
});
