// SIKESRA Entity Service
// Registry list, detail, access flags
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";
import type { PageMeta, OfficialRegionBreadcrumb, LocalRegionBreadcrumb, AuditHint } from "./types";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";
import { SIKESRA_PERMISSIONS } from "../security/permissions";

// ---------- Entity Types ----------

export type EntityKind = "person" | "institution" | "building" | "group" | "service_record";
export type DataStatus = "draft" | "submitted" | "active" | "archived";
export type SensitivityLevel = "public_safe" | "internal" | "restricted" | "highly_restricted";
export type DuplicateStatus = "unknown" | "none" | "candidate" | "confirmed" | "resolved";
export type SourceInput = "manual" | "import" | "integration";

export interface SikesraEntitySummary {
  id: string;
  sikesraId20?: string;
  objectTypeCode: string;
  objectTypeName: string;
  objectSubtypeCode: string;
  objectSubtypeName: string;
  entityKind: EntityKind;
  displayName: string;
  masked: boolean;
  officialRegion: OfficialRegionBreadcrumb;
  localRegion?: LocalRegionBreadcrumb;
  statusData: DataStatus;
  statusVerification: string;
  verificationLevel?: string;
  sensitivityLevel: SensitivityLevel;
  completenessPercent: number;
  duplicateStatus?: DuplicateStatus;
  sourceInput: SourceInput;
  createdAt: string;
  updatedAt: string;
}

export interface EntityListFilters {
  keyword?: string;
  objectTypeCode?: string;
  objectSubtypeCode?: string;
  districtCode?: string;
  villageCode?: string;
  localRegionId?: string;
  statusData?: DataStatus;
  statusVerification?: string;
  sensitivityLevel?: SensitivityLevel;
  sourceInput?: SourceInput;
  duplicateStatus?: DuplicateStatus;
  completenessMin?: number;
  completenessMax?: number;
}

export interface EntityListParams {
  filters?: EntityListFilters;
  page?: number;
  perPage?: number;
  cursor?: string;
}

export interface EntityListResponse {
  items: SikesraEntitySummary[];
  meta: PageMeta;
}

export interface EntityAccessFlags {
  canEdit: boolean;
  canSubmit: boolean;
  canVerify: boolean;
  canGenerateCode: boolean;
  canRevealSensitive: boolean;
  canDownloadDocuments: boolean;
  deniedActions: Array<{ action: string; reasonCode: string }>;
}

export interface EntityDetailResponse {
  entity: SikesraEntitySummary;
  summary: Record<string, unknown>;
  details?: Record<string, unknown>;
  attributes?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  verification?: Record<string, unknown>;
  benefits?: Record<string, unknown>[];
  audit?: Record<string, unknown>[];
  access: EntityAccessFlags;
}

export interface EntityCreateInput {
  objectTypeCode: string;
  objectSubtypeCode: string;
  displayName: string;
  officialVillageCode: string;
  localRegionId?: string;
  sensitivityLevel?: SensitivityLevel;
  sourceInput?: SourceInput;
  sourceInstitution?: string;
}

export interface EntityPatchInput {
  entityId: string;
  displayName?: string;
  localRegionId?: string;
  addressText?: string;
  latitude?: number;
  longitude?: number;
  sensitivityLevel?: SensitivityLevel;
  [key: string]: unknown; // section patches
}

export type EntityPatchData = Omit<EntityPatchInput, "entityId">;

// ---------- Validation ----------

function validateEntityCreate(input: EntityCreateInput): string[] {
  const errors: string[] = [];
  if (!input.objectTypeCode) errors.push("objectTypeCode is required");
  if (!input.objectSubtypeCode) errors.push("objectSubtypeCode is required");
  if (!input.displayName || String(input.displayName).trim().length === 0) errors.push("displayName is required");
  if (input.displayName && String(input.displayName).length > 255) errors.push("displayName must be 255 characters or less");
  if (!input.officialVillageCode) errors.push("officialVillageCode is required");
  if (input.officialVillageCode && !/^\d{10}$/.test(String(input.officialVillageCode))) errors.push("officialVillageCode must be 10 digits");
  if (input.sensitivityLevel && !["public_safe", "internal", "restricted", "highly_restricted"].includes(String(input.sensitivityLevel))) {
    errors.push("Invalid sensitivityLevel");
  }
  if (input.sourceInput && !["manual", "import", "integration"].includes(String(input.sourceInput))) {
    errors.push("Invalid sourceInput");
  }
  return errors;
}

function validateEntityPatch(input: EntityPatchData): string[] {
  const errors: string[] = [];
  if (input.displayName !== undefined) {
    const name = String(input.displayName);
    if (name.trim().length === 0) errors.push("displayName cannot be empty");
    if (name.length > 255) errors.push("displayName must be 255 characters or less");
  }
  if (input.sensitivityLevel !== undefined && !["public_safe", "internal", "restricted", "highly_restricted"].includes(String(input.sensitivityLevel))) {
    errors.push("Invalid sensitivityLevel");
  }
  if (input.latitude !== undefined) {
    const lat = Number(input.latitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push("latitude must be between -90 and 90");
  }
  if (input.longitude !== undefined) {
    const lon = Number(input.longitude);
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push("longitude must be between -180 and 180");
  }
  return errors;
}

// ---------- Entity Service (Repository-aware) ----------

import type { D1Binding } from "../repositories/db";
import { listEntities as repoList, getEntityById, createEntity as repoCreate, patchEntity as repoPatch, hydrateEntitySummary } from "../repositories/entity-repository";

const REPO_ENTITY_KIND_MAP: Record<string, EntityKind> = {
  "01": "building", "02": "institution", "03": "institution", "04": "institution",
  "05": "person", "06": "person", "07": "person", "08": "person",
};

function inferEntityKind(typeCode: string): EntityKind {
  return REPO_ENTITY_KIND_MAP[typeCode] ?? "institution";
}

export async function listEntities(
  db: D1Binding,
  params: EntityListParams,
  ctx: SikesraRequestContext,
): Promise<EntityListResponse> {
  const result = await repoList(db, params, ctx);
  return {
    items: result.items,
    meta: { page: params.page ?? 1, perPage: params.perPage ?? 50, total: result.total, hasMore: (params.page ?? 1) * (params.perPage ?? 50) < result.total },
  };
}

export async function getEntityDetail(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<EntityDetailResponse | null> {
  const entity = await getEntityById(db, entityId, ctx);
  if (!entity) return null;

  const summaryEntity = await hydrateEntitySummary(db, entity, ctx);
  const canEdit = ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE) && entity.status_data === "draft";
  const canSubmit = ctx.permissions.includes(SIKESRA_PERMISSIONS.VERIFICATION_SUBMIT)
    && (entity.status_data === "draft" || entity.status_verification === "need_revision");
  const canVerify = ctx.permissions.includes(SIKESRA_PERMISSIONS.VERIFICATION_VERIFY)
    && String(entity.status_verification).startsWith("submitted");
  const canGenerateCode = ctx.permissions.includes(SIKESRA_PERMISSIONS.CODE_GENERATE)
    && !entity.sikesra_id_20
    && entity.status_data !== "archived";
  const canRevealSensitive = ctx.permissions.includes(SIKESRA_PERMISSIONS.SENSITIVE_REVEAL)
    || ctx.permissions.includes(SIKESRA_PERMISSIONS.SENSITIVE_HIGHLY_RESTRICTED_READ);
  const canDownloadDocuments = ctx.permissions.includes(SIKESRA_PERMISSIONS.DOCUMENT_PRIVATE_DOWNLOAD);

  const deniedActions = [
    !canEdit ? { action: "edit", reasonCode: entity.status_data !== "draft" ? "status_locked" : "missing_permission" } : null,
    !canSubmit ? { action: "submit", reasonCode: entity.status_data === "archived" ? "archived" : "missing_permission_or_status" } : null,
    !canVerify ? { action: "verify", reasonCode: "missing_permission_or_not_submitted" } : null,
    !canGenerateCode ? { action: "generate_code", reasonCode: entity.sikesra_id_20 ? "already_generated" : "missing_permission_or_validation" } : null,
    !canDownloadDocuments ? { action: "download_documents", reasonCode: "missing_permission" } : null,
  ].filter(Boolean) as Array<{ action: string; reasonCode: string }>;

  const [documentCount, benefitCount, recentAudit] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as cnt FROM awcms_sikesra_supporting_documents WHERE tenant_id = ? AND site_id = ? AND entity_id = ? AND deleted_at IS NULL`,
    ).bind(ctx.tenantId, ctx.siteId, entityId).first<{ cnt: number }>(),
    db.prepare(
      `SELECT COUNT(*) as cnt FROM awcms_sikesra_benefit_service_history WHERE tenant_id = ? AND site_id = ? AND entity_id = ? AND deleted_at IS NULL`,
    ).bind(ctx.tenantId, ctx.siteId, entityId).first<{ cnt: number }>(),
    db.prepare(
      `SELECT id, action, actor_id, created_at, reason FROM awcms_sikesra_audit_logs WHERE tenant_id = ? AND site_id = ? AND resource_type = 'entity' AND resource_id = ? ORDER BY created_at DESC LIMIT 5`,
    ).bind(ctx.tenantId, ctx.siteId, entityId).all<Record<string, unknown>>(),
  ]);

  return {
    entity: summaryEntity,
    summary: {
      typeLabel: `${summaryEntity.objectTypeName} / ${summaryEntity.objectSubtypeName}`,
      officialRegion: summaryEntity.officialRegion,
      localRegion: summaryEntity.localRegion,
      sourceInput: summaryEntity.sourceInput,
      sourceInstitution: entity.source_institution ?? null,
      createdAt: summaryEntity.createdAt,
      updatedAt: summaryEntity.updatedAt,
      verifiedAt: entity.verified_at ?? null,
      verifiedBy: entity.verified_by ?? null,
      addressText: entity.address_text ?? null,
      coordinates: entity.latitude != null && entity.longitude != null ? `${entity.latitude}, ${entity.longitude}` : null,
    },
    details: {
      moduleStatus: "Detail modul bertahap sesuai jenis data",
      entityKind: summaryEntity.entityKind,
      addressText: entity.address_text ?? null,
      coordinateAccuracyMeters: entity.coordinate_accuracy_meters ?? null,
      coordinateSource: entity.coordinate_source ?? null,
    },
    attributes: [
      { key: "religion_attribute", label: "Agama", value: entity.religion_attribute ?? "-" },
      { key: "neglected_attribute", label: "Status Keterlantaran", value: entity.neglected_attribute ?? "-" },
      { key: "desil_attribute", label: "Desil", value: canRevealSensitive ? (entity.desil_attribute ?? "-") : "Terlindungi" },
    ],
    documents: [
      { label: "Dokumen terkait", value: documentCount?.cnt ?? 0, access: canDownloadDocuments ? "download diizinkan" : "download terbatas" },
    ],
    verification: {
      statusVerification: summaryEntity.statusVerification,
      verificationLevel: summaryEntity.verificationLevel ?? "none",
      nextAction: canVerify ? "Tinjau dan verifikasi" : canSubmit ? "Siapkan submit" : "Menunggu permission / status",
    },
    benefits: [
      { label: "Riwayat bantuan / layanan", value: benefitCount?.cnt ?? 0 },
    ],
    audit: recentAudit.results.map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      createdAt: row.created_at,
      reason: row.reason,
    })),
    access: {
      canEdit,
      canSubmit,
      canVerify,
      canGenerateCode,
      canRevealSensitive,
      canDownloadDocuments,
      deniedActions,
    },
  };
}

export async function createEntity(
  db: D1Binding,
  input: EntityCreateInput,
  ctx: SikesraRequestContext,
): Promise<SikesraEntitySummary> {
  const validationErrors = validateEntityCreate(input);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
  }

  // Validate region scope: user can only create entities in villages they have access to
  if (ctx.regionScope.villageCodes && ctx.regionScope.villageCodes.length > 0) {
    if (!ctx.regionScope.villageCodes.includes(input.officialVillageCode)) {
      throw new Error(`REGION_SCOPE_VIOLATION: User does not have access to village ${input.officialVillageCode}`);
    }
  }

  const id = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = await repoCreate(db, {
    id, objectTypeCode: input.objectTypeCode, objectSubtypeCode: input.objectSubtypeCode,
    entityKind: inferEntityKind(input.objectTypeCode),
    displayName: input.displayName, officialVillageCode: input.officialVillageCode,
    localRegionId: input.localRegionId, sensitivityLevel: input.sensitivityLevel,
    sourceInput: input.sourceInput, sourceInstitution: input.sourceInstitution,
    createdBy: ctx.userId,
  }, ctx);
  const safeRow = row ?? {
    id,
    sikesra_id_20: null,
    object_type_code: input.objectTypeCode,
    object_subtype_code: input.objectSubtypeCode,
    entity_kind: inferEntityKind(input.objectTypeCode),
    display_name: input.displayName,
    official_village_code: input.officialVillageCode,
    status_data: "draft",
    status_verification: "unverified",
    verification_level: "desa",
    sensitivity_level: input.sensitivityLevel ?? "internal",
    completeness_percent: 0,
    duplicate_status: "unknown",
    source_input: input.sourceInput ?? "manual",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Write audit event for entity creation
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.ENTITY_CREATE,
    resourceType: "entity",
    resourceId: id,
    success: true,
    after: {
      displayName: input.displayName,
      objectTypeCode: input.objectTypeCode,
      officialVillageCode: input.officialVillageCode,
    },
  }, ctx);

  return {
    id: safeRow.id, sikesraId20: safeRow.sikesra_id_20,
    objectTypeCode: safeRow.object_type_code, objectTypeName: "",
    objectSubtypeCode: safeRow.object_subtype_code, objectSubtypeName: "",
    entityKind: safeRow.entity_kind, displayName: safeRow.display_name, masked: false,
    officialRegion: {}, statusData: safeRow.status_data,
    statusVerification: safeRow.status_verification, verificationLevel: safeRow.verification_level,
    sensitivityLevel: safeRow.sensitivity_level, completenessPercent: safeRow.completeness_percent,
    duplicateStatus: safeRow.duplicate_status, sourceInput: safeRow.source_input,
    createdAt: safeRow.created_at, updatedAt: safeRow.updated_at,
  };
}

export async function patchEntity(
  db: D1Binding,
  entityId: string,
  input: EntityPatchData,
  ctx: SikesraRequestContext,
): Promise<SikesraEntitySummary> {
  const validationErrors = validateEntityPatch(input);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
  }

  const updated = await repoPatch(db, entityId, input as Record<string, unknown>, ctx.userId, ctx);
  if (!updated) throw new Error("Entity not found");

  // Write audit event for entity update
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.ENTITY_UPDATE,
    resourceType: "entity",
    resourceId: entityId,
    success: true,
    after: input as Record<string, unknown>,
  }, ctx);

  return {
    id: updated.id, sikesraId20: updated.sikesra_id_20,
    objectTypeCode: updated.object_type_code, objectTypeName: "",
    objectSubtypeCode: updated.object_subtype_code, objectSubtypeName: "",
    entityKind: updated.entity_kind, displayName: updated.display_name, masked: false,
    officialRegion: {}, statusData: updated.status_data,
    statusVerification: updated.status_verification, verificationLevel: updated.verification_level,
    sensitivityLevel: updated.sensitivity_level, completenessPercent: updated.completeness_percent,
    duplicateStatus: updated.duplicate_status, sourceInput: updated.source_input,
    createdAt: updated.created_at, updatedAt: updated.updated_at,
  };
}

export interface EntityDeleteInput {
  entityId: string;
  reason?: string;
}

export async function deleteEntity(
  db: D1Binding,
  input: EntityDeleteInput,
  ctx: SikesraRequestContext,
): Promise<{ success: boolean; entityId: string }> {
  const entity = await getEntityById(db, input.entityId, ctx);
  if (!entity) throw new Error("ENTITY_NOT_FOUND");
  if (entity.status_data === "archived") throw new Error("ENTITY_ALREADY_ARCHIVED");
  if (!input.reason || input.reason.trim().length < 20) {
    throw new Error("REASON_REQUIRED_MIN_20_CHARS");
  }

  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE awcms_sikesra_entities SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(now, now, ctx.userId, input.entityId, ctx.tenantId, ctx.siteId).run();

  // Write audit event for entity deletion
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.ENTITY_ARCHIVE,
    resourceType: "entity",
    resourceId: input.entityId,
    success: true,
    reason: input.reason,
    before: {
      displayName: entity.display_name,
      statusData: entity.status_data,
      statusVerification: entity.status_verification,
    },
  }, ctx);

  return { success: true, entityId: input.entityId };
}

export async function restoreEntity(
  db: D1Binding,
  input: { entityId: string; reason?: string },
  ctx: SikesraRequestContext,
): Promise<{ success: boolean; entityId: string }> {
  const row = await db.prepare(
    `SELECT * FROM awcms_sikesra_entities WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NOT NULL`
  ).bind(input.entityId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) throw new Error("ENTITY_NOT_FOUND_OR_NOT_DELETED");
  if (!input.reason || input.reason.trim().length < 20) {
    throw new Error("REASON_REQUIRED_MIN_20_CHARS");
  }

  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE awcms_sikesra_entities SET deleted_at = NULL, updated_at = ?, updated_by = ? WHERE id = ? AND tenant_id = ? AND site_id = ?`
  ).bind(now, ctx.userId, input.entityId, ctx.tenantId, ctx.siteId).run();

  // Write audit event for entity restoration
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.ENTITY_RESTORE,
    resourceType: "entity",
    resourceId: input.entityId,
    success: true,
    reason: input.reason,
    after: {
      displayName: row.display_name,
      statusData: row.status_data,
      statusVerification: row.status_verification,
    },
  }, ctx);

  return { success: true, entityId: input.entityId };
}
