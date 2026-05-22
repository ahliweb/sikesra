import { sql } from "kysely";

import { getDetailModuleConfig } from "../detail-modules.js";
import { AUDIT_ACTIONS } from "../security/audit.js";
import type { SikesraRequestContext } from "../security/request-context.js";
import { guardRoute } from "../security/route-guard.js";

export interface DraftCreateInput {
	objectTypeCode: string;
	objectSubtypeCode: string;
	selectedSubtypeModuleCode?: string;
	entityKind: string;
	displayName: string;
	officialVillageCode: string;
	localRegionId?: string;
	addressText?: string;
	initialData?: Record<string, unknown>;
}

export interface DraftUpdateInput {
	entityId: string;
	section: string;
	patch: Record<string, unknown>;
}

export interface ValidationSection {
	sectionKey: string;
	errors: ValidationError[];
	isValid: boolean;
}

export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

export interface CompletenessResult {
	entityId: string;
	overallPercent: number;
	sections: ValidationSection[];
}

export interface CodeGenerationResult {
	entityId: string;
	sikesraId20: string;
	previousCode: string | null;
}

export interface CodeCorrectionInput {
	entityId: string;
	newCode: string;
	reason: string;
}

export interface DraftCreateResult {
	entityId: string;
	status: string;
	completenessPercent: number;
}

export interface DraftUpdateResult {
	entityId: string;
	status: string;
	completenessPercent: number;
	validationErrors: ValidationError[];
}

export interface DraftAutosaveInput {
	entityId: string;
	data: Record<string, unknown>;
}

export interface DraftAutosaveResult {
	entityId: string;
	status: string;
	completenessPercent: number;
	savedFields: string[];
}

const SECTION_DEFINITIONS = [
	{
		key: "identity",
		fields: ["display_name", "object_type_code", "object_subtype_code", "entity_kind"],
	},
	{ key: "location", fields: ["official_village_code", "local_region_id", "address_text"] },
	{ key: "details", fields: [] },
] as const;

const SIKESRA_ID_20_RE = /^\d{20}$/;

const ALLOWED_ENTITY_COLUMNS = new Set([
	"display_name",
	"object_type_code",
	"object_subtype_code",
	"entity_kind",
	"official_village_code",
	"local_region_id",
	"address_text",
	"sikesra_id_20",
	"status_data",
	"status_verification",
	"sensitivity_level",
	"completeness_percent",
	"source_input",
]);
const VALID_ENTITY_COLUMN_RE = /^[a-z][a-z0-9_]*$/;

function validateEntityColumn(name: string): string {
	if (!VALID_ENTITY_COLUMN_RE.test(name)) {
		throw new Error(`INVALID_COLUMN_NAME: ${name}`);
	}
	if (!ALLOWED_ENTITY_COLUMNS.has(name)) {
		throw new Error(`DISALLOWED_COLUMN: ${name}`);
	}
	return name;
}

export async function createDraft(
	db: unknown,
	ctx: SikesraRequestContext,
	input: DraftCreateInput,
): Promise<DraftCreateResult> {
	const denied = guardRoute(ctx, "entity:create");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const validationErrors = validateDraftInput(input);
	if (validationErrors.length > 0) {
		return throwRouteError(
			"VALIDATION_ERROR",
			validationErrors.map((e) => e.message).join("; "),
			400,
		);
	}

	const id = generateEntityId();

	await sql`
		INSERT INTO awcms_sikesra_entities (
			id, tenant_id, site_id, object_type_code, object_subtype_code,
			entity_kind, display_name, official_village_code, local_region_id,
			address_text, status_data, status_verification, sensitivity_level,
			completeness_percent, source_input, created_by, updated_by,
			created_at, updated_at
		) VALUES (
			${id}, ${ctx.tenantId}, ${ctx.siteId}, ${input.objectTypeCode},
			${input.objectSubtypeCode}, ${input.entityKind}, ${input.displayName},
			${input.officialVillageCode}, ${input.localRegionId ?? null},
			${input.addressText ?? null}, 'draft', 'draft', 'internal',
			0, 'manual', ${ctx.userId}, ${ctx.userId},
			datetime('now'), datetime('now')
		)
	`.execute(db as never);

	if (input.initialData && Object.keys(input.initialData).length > 0) {
		await storeDraftDetails(db, ctx, id, input.objectTypeCode, input.initialData);
	}

	const completeness = calculateCompleteness(db, ctx, id);

	await writeEntityAudit(db, ctx, AUDIT_ACTIONS.ENTITY_CREATE, id, {
		action: "draft_create",
		objectTypeCode: input.objectTypeCode,
	});

	return {
		entityId: id,
		status: "draft",
		completenessPercent: await completeness,
	};
}

export async function updateDraft(
	db: unknown,
	ctx: SikesraRequestContext,
	input: DraftUpdateInput,
): Promise<DraftUpdateResult> {
	const denied = guardRoute(ctx, "entity:update");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const entity = await getDraftEntity(db, ctx, input.entityId);
	if (!entity) return throwRouteError("NOT_FOUND", "Draft not found", 404);
	if (entity.status_data !== "draft") {
		return throwRouteError("VALIDATION_ERROR", "Only draft entities can be updated", 400);
	}

	const sectionErrors = validateSection(input.section, input.patch);
	const hasErrors = sectionErrors.length > 0;

	if (!hasErrors && Object.keys(input.patch).length > 0) {
		const { entityPatch, detailPatch } = partitionDraftData(entity.object_type_code, input.patch);
		const setClauses: string[] = [];
		const values: unknown[] = [];

		for (const [key, value] of Object.entries(entityPatch)) {
			if (value !== undefined) {
				const safeKey = validateEntityColumn(key);
				setClauses.push(`${safeKey} = ?`);
				values.push(value);
			}
		}

		if (setClauses.length > 0) {
			setClauses.push("updated_at = datetime('now')", "updated_by = ?");
			values.push(ctx.userId);
			values.push(ctx.tenantId);
			values.push(ctx.siteId);
			values.push(input.entityId);

			await sql
				.raw(
					`UPDATE awcms_sikesra_entities SET ${setClauses.join(", ")} WHERE tenant_id = ? AND site_id = ? AND id = ? AND deleted_at IS NULL`,
				)
				.execute(db as never);
		}

		if (Object.keys(detailPatch).length > 0) {
			await storeDraftDetails(db, ctx, input.entityId, entity.object_type_code, detailPatch);
		}
	}

	const completeness = await calculateCompleteness(db, ctx, input.entityId);

	await writeEntityAudit(db, ctx, AUDIT_ACTIONS.ENTITY_UPDATE, input.entityId, {
		section: input.section,
		updatedFields: Object.keys(input.patch),
		hasValidationErrors: hasErrors,
	});

	return {
		entityId: input.entityId,
		status: entity.status_data,
		completenessPercent: completeness,
		validationErrors: sectionErrors,
	};
}

export async function autosaveDraft(
	db: unknown,
	ctx: SikesraRequestContext,
	input: DraftAutosaveInput,
): Promise<DraftAutosaveResult> {
	const denied = guardRoute(ctx, "entity:update");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const entity = await getDraftEntity(db, ctx, input.entityId);
	if (!entity) return throwRouteError("NOT_FOUND", "Draft not found", 404);
	if (entity.status_data !== "draft") {
		return throwRouteError("VALIDATION_ERROR", "Only draft entities can be autosaved", 400);
	}

	const savedFields: string[] = [];
	const setClauses: string[] = [];
	const values: unknown[] = [];
	const { entityPatch, detailPatch } = partitionDraftData(entity.object_type_code, input.data);

	for (const [key, value] of Object.entries(entityPatch)) {
		if (value !== undefined && (ALLOWED_ENTITY_COLUMNS as ReadonlySet<string>).has(key)) {
			const safeKey = validateEntityColumn(key);
			setClauses.push(`${safeKey} = ?`);
			values.push(value);
			savedFields.push(key);
		}
	}

	for (const key of Object.keys(detailPatch)) {
		savedFields.push(key);
	}

	if (setClauses.length > 0) {
		setClauses.push("updated_at = datetime('now')", "updated_by = ?");
		values.push(ctx.userId);
		values.push(ctx.tenantId);
		values.push(ctx.siteId);
		values.push(input.entityId);

		await sql
			.raw(
				`UPDATE awcms_sikesra_entities SET ${setClauses.join(", ")} WHERE tenant_id = ? AND site_id = ? AND id = ? AND deleted_at IS NULL`,
			)
			.execute(db as never);
	}

	if (Object.keys(detailPatch).length > 0) {
		await storeDraftDetails(db, ctx, input.entityId, entity.object_type_code, detailPatch);
	}

	const completeness = await calculateCompleteness(db, ctx, input.entityId);

	await writeEntityAudit(db, ctx, AUDIT_ACTIONS.ENTITY_UPDATE, input.entityId, {
		action: "autosave",
		savedFields,
	});

	return {
		entityId: input.entityId,
		status: entity.status_data,
		completenessPercent: completeness,
		savedFields,
	};
}

export async function validateEntity(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<CompletenessResult> {
	const denied = guardRoute(ctx, "entity:read");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const entity = await getEntity(db, ctx, entityId);
	if (!entity) return throwRouteError("NOT_FOUND", "Entity not found", 404);
	const detailRecord = await getStoredDraftDetails(db, ctx, entityId, entity.object_type_code);

	const sections: ValidationSection[] = [];

	for (const sectionDef of SECTION_DEFINITIONS) {
		const errors = validateSectionData(sectionDef.key, entity, detailRecord);
		if (sectionDef.key === "details") {
			const personProfileErrors = await validatePersonProfileReference(db, ctx, detailRecord);
			errors.push(...personProfileErrors);
		}
		sections.push({
			sectionKey: sectionDef.key,
			errors,
			isValid: errors.length === 0,
		});
	}

	const validSections = sections.filter((s) => s.isValid).length;
	const overallPercent = Math.round((validSections / sections.length) * 100);

	return {
		entityId,
		overallPercent,
		sections,
	};
}

async function validatePersonProfileReference(
	db: unknown,
	ctx: SikesraRequestContext,
	detailRecord?: Record<string, unknown>,
): Promise<ValidationError[]> {
	const personProfileId =
		typeof detailRecord?.person_profile_id === "string" ? detailRecord.person_profile_id.trim() : "";
	if (!personProfileId) return [];

	const result = await sql<{ id: string }>`
		SELECT id
		FROM awcms_sikesra_person_profiles
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${personProfileId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	if (result.rows[0]) return [];

	return [
		{
			field: "person_profile_id",
			message: "Profil Orang yang dipilih belum ditemukan di tenant/site ini",
			code: "NOT_FOUND",
		},
	];
}

export async function calculateCompleteness(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<number> {
	const result = await validateEntity(db, ctx, entityId);
	return result.overallPercent;
}

export async function generateSikesraId20(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
): Promise<CodeGenerationResult> {
	const denied = guardRoute(ctx, "code:generate");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	const entity = await getEntity(db, ctx, entityId);
	if (!entity) return throwRouteError("NOT_FOUND", "Entity not found", 404);

	if (entity.status_data !== "draft") {
		return throwRouteError("VALIDATION_ERROR", "Only draft entities can generate codes", 400);
	}

	const validation = await validateEntity(db, ctx, entityId);
	const invalidSections = validation.sections.filter((s) => !s.isValid);
	if (invalidSections.length > 0) {
		return throwRouteError(
			"VALIDATION_ERROR",
			`Cannot generate code: sections ${invalidSections.map((s) => s.sectionKey).join(", ")} have errors`,
			400,
		);
	}

	const previousCode = entity.sikesra_id_20;
	const newCode = await buildSikesraId20(db, ctx, entity);

	await sql`
		UPDATE awcms_sikesra_entities
		SET sikesra_id_20 = ${newCode},
			updated_at = datetime('now'),
			updated_by = ${ctx.userId}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${entityId}
			AND deleted_at IS NULL
	`.execute(db as never);

	await writeEntityAudit(db, ctx, AUDIT_ACTIONS.CODE_GENERATE, entityId, {
		previousCode,
		newCode,
	});

	return {
		entityId,
		sikesraId20: newCode,
		previousCode,
	};
}

export async function correctSikesraId20(
	db: unknown,
	ctx: SikesraRequestContext,
	input: CodeCorrectionInput,
): Promise<CodeGenerationResult> {
	const denied = guardRoute(ctx, "code:correct");
	if (!denied.allowed)
		return throwRouteError("FORBIDDEN", denied.reasonMessage || "Forbidden", 403);

	if (!SIKESRA_ID_20_RE.test(input.newCode)) {
		return throwRouteError("VALIDATION_ERROR", "Code must be exactly 20 digits", 400);
	}

	if (!input.reason.trim()) {
		return throwRouteError("VALIDATION_ERROR", "Reason is required for code correction", 400);
	}

	const entity = await getEntity(db, ctx, input.entityId);
	if (!entity) return throwRouteError("NOT_FOUND", "Entity not found", 404);

	const previousCode = entity.sikesra_id_20;

	await sql`
		UPDATE awcms_sikesra_entities
		SET sikesra_id_20 = ${input.newCode},
			updated_at = datetime('now'),
			updated_by = ${ctx.userId}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${input.entityId}
			AND deleted_at IS NULL
	`.execute(db as never);

	await writeEntityAudit(db, ctx, AUDIT_ACTIONS.CODE_CORRECT, input.entityId, {
		previousCode,
		newCode: input.newCode,
		reason: input.reason,
	});

	return {
		entityId: input.entityId,
		sikesraId20: input.newCode,
		previousCode,
	};
}

function validateDraftInput(input: DraftCreateInput): ValidationError[] {
	const errors: ValidationError[] = [];

	if (!input.objectTypeCode?.trim()) {
		errors.push({ field: "objectTypeCode", message: "Object type is required", code: "REQUIRED" });
	}
	if (!input.objectSubtypeCode?.trim()) {
		errors.push({
			field: "objectSubtypeCode",
			message: "Object subtype is required",
			code: "REQUIRED",
		});
	}
	if (!input.entityKind?.trim()) {
		errors.push({ field: "entityKind", message: "Entity kind is required", code: "REQUIRED" });
	}
	if (!input.displayName?.trim()) {
		errors.push({ field: "displayName", message: "Display name is required", code: "REQUIRED" });
	}
	if (!input.officialVillageCode?.trim()) {
		errors.push({
			field: "officialVillageCode",
			message: "Official village is required",
			code: "REQUIRED",
		});
	}

	return errors;
}

function validateSection(section: string, patch: Record<string, unknown>): ValidationError[] {
	const errors: ValidationError[] = [];

	switch (section) {
		case "identity":
			if (
				patch.display_name &&
				typeof patch.display_name === "string" &&
				!patch.display_name.trim()
			) {
				errors.push({
					field: "display_name",
					message: "Display name cannot be empty",
					code: "REQUIRED",
				});
			}
			break;
		case "location":
			if (
				patch.official_village_code &&
				typeof patch.official_village_code === "string" &&
				!patch.official_village_code.trim()
			) {
				errors.push({
					field: "official_village_code",
					message: "Official village is required",
					code: "REQUIRED",
				});
			}
			break;
	}

	return errors;
}

function validateSectionData(
	sectionKey: string,
	entity: Record<string, unknown>,
	detailRecord?: Record<string, unknown>,
): ValidationError[] {
	const errors: ValidationError[] = [];

	switch (sectionKey) {
		case "identity":
			if (!entity.object_type_code) {
				errors.push({
					field: "object_type_code",
					message: "Object type is required",
					code: "REQUIRED",
				});
			}
			if (!entity.display_name) {
				errors.push({
					field: "display_name",
					message: "Display name is required",
					code: "REQUIRED",
				});
			}
			break;
		case "location":
			if (!entity.official_village_code) {
				errors.push({
					field: "official_village_code",
					message: "Official village is required",
					code: "REQUIRED",
				});
			}
			break;
		case "details": {
			const objectTypeCode =
				typeof entity.object_type_code === "string" ? entity.object_type_code : "";
			const detailModule = getDetailModuleConfig(objectTypeCode);
			if (!detailModule) break;

			for (const field of detailModule.requiredFields) {
				const value = detailRecord?.[field];
				if (typeof value === "string") {
					if (!value.trim()) {
						errors.push({ field, message: `${field} is required`, code: "REQUIRED" });
					}
					continue;
				}
				if (value === null || value === undefined) {
					errors.push({ field, message: `${field} is required`, code: "REQUIRED" });
				}
			}
			break;
		}
	}

	return errors;
}

async function buildSikesraId20(
	db: unknown,
	ctx: SikesraRequestContext,
	entity: Record<string, unknown>,
): Promise<string> {
	const villageCode =
		typeof entity.official_village_code === "string" ? entity.official_village_code : "0000000000";
	const objectTypeCode =
		typeof entity.object_type_code === "string"
			? entity.object_type_code.padEnd(2, "0").slice(0, 2)
			: "00";
	const objectSubtypeCode =
		typeof entity.object_subtype_code === "string"
			? entity.object_subtype_code.padEnd(2, "0").slice(0, 2)
			: "00";

	const sequence = await getNextSequence(db, ctx, villageCode, objectTypeCode, objectSubtypeCode);
	const sequenceStr = sequence.toString().padStart(6, "0");

	return `${villageCode}${objectTypeCode}${objectSubtypeCode}${sequenceStr}`;
}

async function getNextSequence(
	db: unknown,
	ctx: SikesraRequestContext,
	villageCode: string,
	objectTypeCode: string,
	objectSubtypeCode: string,
): Promise<number> {
	const sequenceId = `seq_${villageCode}_${objectTypeCode}_${objectSubtypeCode}`;

	await sql`
		INSERT INTO awcms_sikesra_code_sequences (
			id, tenant_id, site_id, official_village_code, object_type_code,
			object_subtype_code, last_sequence, created_by, updated_by
		) VALUES (
			${sequenceId}, ${ctx.tenantId}, ${ctx.siteId}, ${villageCode},
			${objectTypeCode}, ${objectSubtypeCode}, 0,
			${ctx.userId}, ${ctx.userId}
		)
		ON CONFLICT(tenant_id, site_id, official_village_code, object_type_code, object_subtype_code)
		DO UPDATE SET last_sequence = last_sequence + 1, updated_at = datetime('now')
	`.execute(db as never);

	const result = await sql<{ last_sequence: number }>`
		SELECT last_sequence
		FROM awcms_sikesra_code_sequences
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND official_village_code = ${villageCode}
			AND object_type_code = ${objectTypeCode}
			AND object_subtype_code = ${objectSubtypeCode}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	return (result.rows[0]?.last_sequence ?? 0) + 1;
}

async function getDraftEntity(db: unknown, ctx: SikesraRequestContext, entityId: string) {
	const result = await sql<{
		id: string;
		status_data: string;
		sikesra_id_20: string | null;
		object_type_code: string;
		object_subtype_code: string;
		display_name: string;
		official_village_code: string;
	}>`
		SELECT id, status_data, sikesra_id_20, object_type_code, object_subtype_code,
			display_name, official_village_code
		FROM awcms_sikesra_entities
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${entityId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	return result.rows[0];
}

async function getEntity(db: unknown, ctx: SikesraRequestContext, entityId: string) {
	const result = await sql<{
		id: string;
		status_data: string;
		sikesra_id_20: string | null;
		object_type_code: string;
		object_subtype_code: string;
		display_name: string;
		official_village_code: string;
	}>`
		SELECT id, status_data, sikesra_id_20, object_type_code, object_subtype_code,
			display_name, official_village_code
		FROM awcms_sikesra_entities
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND id = ${entityId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	return result.rows[0];
}

async function storeDraftDetails(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
	objectTypeCode: string,
	data: Record<string, unknown>,
): Promise<void> {
	const detailModule = getDetailModuleConfig(objectTypeCode);
	if (!detailModule) return;

	const detailPatch = sanitizeDetailPatch(detailModule.fields, data);
	if (Object.keys(detailPatch).length === 0) return;

	const existing = await sql<{ id: string }>`
		SELECT id FROM ${sql.ref(detailModule.tableName)}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND entity_id = ${entityId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	const columns = Object.keys(detailPatch);
	if (existing.rows[0]) {
		const setClauses = columns.map((column) => sql`${sql.ref(column)} = ${detailPatch[column]}`);
		await sql`
			UPDATE ${sql.ref(detailModule.tableName)}
			SET ${sql.join(
				[...setClauses, sql`updated_at = datetime('now')`, sql`updated_by = ${ctx.userId}`],
				sql`, `,
			)}
			WHERE tenant_id = ${ctx.tenantId}
				AND site_id = ${ctx.siteId}
				AND entity_id = ${entityId}
				AND deleted_at IS NULL
		`.execute(db as never);
		return;
	}

	await sql`
		INSERT INTO ${sql.ref(detailModule.tableName)} (
			${sql.join(
				[
					sql.ref("id"),
					sql.ref("tenant_id"),
					sql.ref("site_id"),
					sql.ref("entity_id"),
					...columns.map((column) => sql.ref(column)),
					sql.ref("created_by"),
					sql.ref("updated_by"),
					sql.ref("created_at"),
					sql.ref("updated_at"),
				],
				sql`, `,
			)}
		) VALUES (
			${sql.join(
				[
					sql`${`det_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}`,
					sql`${ctx.tenantId}`,
					sql`${ctx.siteId}`,
					sql`${entityId}`,
					...columns.map((column) => sql`${detailPatch[column]}`),
					sql`${ctx.userId}`,
					sql`${ctx.userId}`,
					sql`datetime('now')`,
					sql`datetime('now')`,
				],
				sql`, `,
			)}
		)
	`.execute(db as never);
}

async function getStoredDraftDetails(
	db: unknown,
	ctx: SikesraRequestContext,
	entityId: string,
	objectTypeCode: string,
) {
	const detailModule = getDetailModuleConfig(objectTypeCode);
	if (!detailModule) return undefined;

	const result = await sql<Record<string, unknown>>`
		SELECT *
		FROM ${sql.ref(detailModule.tableName)}
		WHERE tenant_id = ${ctx.tenantId}
			AND site_id = ${ctx.siteId}
			AND entity_id = ${entityId}
			AND deleted_at IS NULL
		LIMIT 1
	`.execute(db as never);

	return result.rows[0];
}

function partitionDraftData(objectTypeCode: string, data: Record<string, unknown>) {
	const entityPatch: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if ((ALLOWED_ENTITY_COLUMNS as ReadonlySet<string>).has(key)) {
			entityPatch[key] = value;
		}
	}

	const detailModule = getDetailModuleConfig(objectTypeCode);
	return {
		entityPatch,
		detailPatch: detailModule ? sanitizeDetailPatch(detailModule.fields, data) : {},
	};
}

function sanitizeDetailPatch(fields: readonly string[], data: Record<string, unknown>) {
	const allowed = new Set(fields);
	const detailPatch: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (allowed.has(key) && value !== undefined) {
			detailPatch[key] = value;
		}
	}
	return detailPatch;
}

function generateEntityId(): string {
	return `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function writeEntityAudit(
	db: unknown,
	ctx: SikesraRequestContext,
	action: string,
	entityId: string,
	metadata: Record<string, unknown>,
): Promise<void> {
	try {
		await sql`
			INSERT INTO awcms_sikesra_audit_logs (
				id, tenant_id, site_id, actor_id, actor_role, action,
				resource_type, resource_id, request_id, success,
				before_json, after_json, ip_address, user_agent, created_at
			) VALUES (
				${`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
				${ctx.tenantId}, ${ctx.siteId}, ${ctx.userId},
				${ctx.roles[0] ?? "unknown"}, ${action},
				'entity', ${entityId}, ${ctx.requestId}, 1,
				${null}, ${JSON.stringify(metadata)},
				${ctx.ipAddress ?? null}, ${ctx.userAgent ?? null},
				datetime('now')
			)
		`.execute(db as never);
	} catch {
		// Audit write failures should not block the main operation
	}
}

async function throwRouteError(code: string, message: string, status: number): Promise<never> {
	const { PluginRouteError } = await import("emdash");
	throw new PluginRouteError(code, message, status);
}
