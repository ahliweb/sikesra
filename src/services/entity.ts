// SIKESRA Entity Service
// Registry list, detail, access flags
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";
import type { PageMeta, OfficialRegionBreadcrumb, LocalRegionBreadcrumb, AuditHint } from "./types";

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
  return {
    id: row.id, sikesraId20: row.sikesra_id_20,
    objectTypeCode: row.object_type_code, objectTypeName: "",
    objectSubtypeCode: row.object_subtype_code, objectSubtypeName: "",
    entityKind: row.entity_kind, displayName: row.display_name, masked: false,
    officialRegion: {}, statusData: row.status_data,
    statusVerification: row.status_verification, verificationLevel: row.verification_level,
    sensitivityLevel: row.sensitivity_level, completenessPercent: row.completeness_percent,
    duplicateStatus: row.duplicate_status, sourceInput: row.source_input,
    createdAt: row.created_at, updatedAt: row.updated_at,
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
