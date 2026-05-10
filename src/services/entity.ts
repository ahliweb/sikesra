// SIKESRA Entity Service
// Registry list, detail, access flags
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";
import type { PageMeta, OfficialRegionBreadcrumb, LocalRegionBreadcrumb, AuditHint } from "./types";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";

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
  displayName?: string;
  localRegionId?: string;
  addressText?: string;
  latitude?: number;
  longitude?: number;
  sensitivityLevel?: SensitivityLevel;
  [key: string]: unknown; // section patches
}

// ---------- Entity Service (Repository-aware) ----------

import type { D1Binding } from "../repositories/db";
import { listEntities as repoList, getEntityById, createEntity as repoCreate, patchEntity as repoPatch } from "../repositories/entity-repository";

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
  return {
    entity: {
      id: entity.id, sikesraId20: entity.sikesra_id_20,
      objectTypeCode: entity.object_type_code, objectTypeName: "",
      objectSubtypeCode: entity.object_subtype_code, objectSubtypeName: "",
      entityKind: entity.entity_kind,
      displayName: entity.display_name, masked: false,
      officialRegion: {}, statusData: entity.status_data,
      statusVerification: entity.status_verification, verificationLevel: entity.verification_level,
      sensitivityLevel: entity.sensitivity_level, completenessPercent: entity.completeness_percent,
      duplicateStatus: entity.duplicate_status, sourceInput: entity.source_input,
      createdAt: entity.created_at, updatedAt: entity.updated_at,
    },
    summary: {},
    access: {
      canEdit: true, canSubmit: false, canVerify: false,
      canGenerateCode: false, canRevealSensitive: false, canDownloadDocuments: false,
      deniedActions: [],
    },
  };
}

export async function createEntity(
  db: D1Binding,
  input: EntityCreateInput,
  ctx: SikesraRequestContext,
): Promise<SikesraEntitySummary> {
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
  input: EntityPatchInput,
  ctx: SikesraRequestContext,
): Promise<SikesraEntitySummary> {
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
