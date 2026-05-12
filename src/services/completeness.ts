// SIKESRA Completeness Validation Service
// Validates entity data completeness per object type/subtype
// Source: docs/sikesra/03_data_model.md, docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";
import { AUDIT_ACTIONS, writeAuditEvent } from "./audit";

// ---------- Types ----------

export interface CompletenessFieldRule {
  field: string;
  label: string;
  required: boolean;
  weight: number;
}

export interface CompletenessValidationResult {
  entityId: string;
  objectTypeCode: string;
  objectSubtypeCode: string;
  completenessPercent: number;
  totalWeight: number;
  filledWeight: number;
  missingRequired: string[];
  missingOptional: string[];
  canSubmit: boolean;
  warnings: string[];
}

export interface CompletenessCheckParams {
  entityId: string;
  minThreshold?: number;
  blockOnMissingRequired?: boolean;
}

// ---------- Field Rules per Object Type ----------

const CORE_FIELDS: CompletenessFieldRule[] = [
  { field: "display_name", label: "Nama entitas", required: true, weight: 10 },
  { field: "official_village_code", label: "Wilayah resmi", required: true, weight: 10 },
  { field: "address_text", label: "Alamat", required: false, weight: 5 },
  { field: "latitude", label: "Latitude", required: false, weight: 3 },
  { field: "longitude", label: "Longitude", required: false, weight: 3 },
];

const DETAIL_MODULE_FIELDS: Record<string, CompletenessFieldRule[]> = {
  "01": [
    { field: "jenis_rumah_ibadah", label: "Jenis rumah ibadah", required: true, weight: 10 },
    { field: "status_pembangunan", label: "Status pembangunan", required: true, weight: 8 },
    { field: "luas_bangunan", label: "Luas bangunan", required: false, weight: 5 },
    { field: "luas_tanah", label: "Luas tanah", required: false, weight: 5 },
    { field: "kapasitas_jamaah", label: "Kapasitas jamaah", required: false, weight: 4 },
    { field: "tahun_didirikan", label: "Tahun didirikan", required: false, weight: 4 },
    { field: "sumber_dana", label: "Sumber dana", required: false, weight: 3 },
  ],
  "02": [
    { field: "agama", label: "Agama", required: true, weight: 10 },
    { field: "nomor_sk", label: "Nomor SK", required: true, weight: 8 },
    { field: "tanggal_sk", label: "Tanggal SK", required: false, weight: 5 },
    { field: "nama_pimpinan", label: "Nama pimpinan", required: true, weight: 8 },
    { field: "jumlah_pengurus", label: "Jumlah pengurus", required: false, weight: 4 },
    { field: "jumlah_anggota", label: "Jumlah anggota", required: false, weight: 4 },
    { field: "kegiatan_utama", label: "Kegiatan utama", required: false, weight: 3 },
    { field: "sumber_dana", label: "Sumber dana", required: false, weight: 3 },
  ],
  "03": [
    { field: "jenis_pendidikan", label: "Jenis pendidikan", required: true, weight: 10 },
    { field: "jumlah_santri_lk", label: "Jumlah santri LK", required: false, weight: 4 },
    { field: "jumlah_santri_pr", label: "Jumlah santri PR", required: false, weight: 4 },
    { field: "jumlah_guru_lk", label: "Jumlah guru LK", required: false, weight: 4 },
    { field: "jumlah_guru_pr", label: "Jumlah guru PR", required: false, weight: 4 },
    { field: "kurikulum", label: "Kurikulum", required: false, weight: 3 },
    { field: "nomor_sk_operasional", label: "No SK Operasional", required: false, weight: 5 },
    { field: "status_akreditasi", label: "Status akreditasi", required: false, weight: 5 },
    { field: "sumber_dana", label: "Sumber dana", required: false, weight: 3 },
  ],
  "04": [
    { field: "jenis_lks", label: "Jenis LKS", required: true, weight: 10 },
    { field: "nama_pimpinan", label: "Nama pimpinan", required: true, weight: 8 },
    { field: "jumlah_pengasuh", label: "Jumlah pengasuh", required: false, weight: 5 },
    { field: "jumlah_penerima_manfaat", label: "Jumlah penerima manfaat", required: false, weight: 5 },
    { field: "nomor_sk", label: "Nomor SK", required: false, weight: 5 },
    { field: "tanggal_sk", label: "Tanggal SK", required: false, weight: 4 },
    { field: "sumber_dana", label: "Sumber dana", required: false, weight: 3 },
    { field: "program_unggulan", label: "Program unggulan", required: false, weight: 3 },
  ],
  "05": [
    { field: "agama", label: "Agama", required: true, weight: 10 },
    { field: "status_guru", label: "Status guru", required: true, weight: 8 },
    { field: "bidang_pengajaran", label: "Bidang pengajaran", required: false, weight: 5 },
    { field: "institusi_pengajaran", label: "Institusi pengajaran", required: false, weight: 5 },
    { field: "jumlah_murid", label: "Jumlah murid", required: false, weight: 4 },
    { field: "pendidikan_terakhir", label: "Pendidikan terakhir", required: false, weight: 4 },
    { field: "sertifikasi", label: "Sertifikasi", required: false, weight: 4 },
  ],
  "06": [
    { field: "kategori_anak", label: "Kategori anak", required: true, weight: 10 },
    { field: "status_sekolah", label: "Status sekolah", required: true, weight: 8 },
    { field: "tingkat_pendidikan", label: "Tingkat pendidikan", required: false, weight: 5 },
    { field: "nama_sekolah", label: "Nama sekolah", required: false, weight: 4 },
    { field: "nama_wali", label: "Nama wali", required: false, weight: 4 },
    { field: "hubungan_wali", label: "Hubungan wali", required: false, weight: 3 },
    { field: "sumber_bantuan", label: "Sumber bantuan", required: false, weight: 3 },
  ],
  "07": [
    { field: "jenis_disabilitas", label: "Jenis disabilitas", required: true, weight: 10 },
    { field: "tingkat_keparahan", label: "Tingkat keparahan", required: true, weight: 8 },
    { field: "alat_bantu_dibutuhkan", label: "Alat bantu dibutuhkan", required: false, weight: 4 },
    { field: "jenis_alat_bantu", label: "Jenis alat bantu", required: false, weight: 4 },
    { field: "akses_layanan_kesehatan", label: "Akses layanan kesehatan", required: false, weight: 4 },
    { field: "partisipasi_sekolah_kerja", label: "Partisipasi sekolah/kerja", required: false, weight: 4 },
    { field: "kebutuhan_pendampingan", label: "Kebutuhan pendampingan", required: false, weight: 3 },
    { field: "sumber_bantuan", label: "Sumber bantuan", required: false, weight: 3 },
  ],
  "08": [
    { field: "status_keterlantaran", label: "Status keterlantaran", required: true, weight: 10 },
    { field: "kondisi_tempat_tinggal", label: "Kondisi tempat tinggal", required: false, weight: 5 },
    { field: "status_tinggal", label: "Status tinggal", required: false, weight: 5 },
    { field: "sumber_penghasilan", label: "Sumber penghasilan", required: false, weight: 4 },
    { field: "akses_jaminan_sosial", label: "Akses jaminan sosial", required: false, weight: 4 },
    { field: "riwayat_penyakit", label: "Riwayat penyakit", required: false, weight: 4 },
    { field: "kebutuhan_prioritas", label: "Kebutuhan prioritas", required: false, weight: 3 },
  ],
};

const DETAIL_TABLE_MAP: Record<string, string> = {
  "01": "awcms_sikesra_rumah_ibadah_details",
  "02": "awcms_sikesra_lembaga_keagamaan_details",
  "03": "awcms_sikesra_pendidikan_keagamaan_details",
  "04": "awcms_sikesra_lks_details",
  "05": "awcms_sikesra_guru_agama_details",
  "06": "awcms_sikesra_anak_yatim_details",
  "07": "awcms_sikesra_disabilitas_details",
  "08": "awcms_sikesra_lansia_terlantar_details",
};

// ---------- Helper Functions ----------

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  return false;
}

function calculateCompleteness(
  fields: CompletenessFieldRule[],
  entityData: Record<string, unknown>,
  detailData: Record<string, unknown> | null,
): { completenessPercent: number; totalWeight: number; filledWeight: number; missingRequired: string[]; missingOptional: string[] } {
  const allFields = [...CORE_FIELDS, ...fields];
  let totalWeight = 0;
  let filledWeight = 0;
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const rule of allFields) {
    totalWeight += rule.weight;
    const isCoreField = CORE_FIELDS.includes(rule);
    const value = isCoreField ? entityData[rule.field] : (detailData?.[rule.field] ?? null);

    if (isFieldFilled(value)) {
      filledWeight += rule.weight;
    } else if (rule.required) {
      missingRequired.push(rule.label);
    } else {
      missingOptional.push(rule.label);
    }
  }

  const completenessPercent = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0;

  return { completenessPercent, totalWeight, filledWeight, missingRequired, missingOptional };
}

// ---------- Service Functions ----------

export async function validateCompleteness(
  db: D1Binding,
  params: CompletenessCheckParams,
  ctx: SikesraRequestContext,
): Promise<CompletenessValidationResult> {
  const entity = await db.prepare(
    `SELECT id, object_type_code, object_subtype_code, display_name, official_village_code,
      address_text, latitude, longitude FROM awcms_sikesra_entities
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(params.entityId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!entity) {
    throw new Error("Entity not found");
  }

  const objectTypeCode = String(entity.object_type_code);
  const detailFields = DETAIL_MODULE_FIELDS[objectTypeCode] ?? [];
  const detailTable = DETAIL_TABLE_MAP[objectTypeCode];

  let detailData: Record<string, unknown> | null = null;
  if (detailTable) {
    detailData = await db.prepare(
      `SELECT * FROM ${detailTable} WHERE tenant_id = ? AND site_id = ? AND entity_id = ? AND deleted_at IS NULL`,
    ).bind(ctx.tenantId, ctx.siteId, params.entityId).first<Record<string, unknown>>();
  }

  const entityData: Record<string, unknown> = {
    display_name: entity.display_name,
    official_village_code: entity.official_village_code,
    address_text: entity.address_text,
    latitude: entity.latitude,
    longitude: entity.longitude,
  };

  const { completenessPercent, totalWeight, filledWeight, missingRequired, missingOptional } =
    calculateCompleteness(detailFields, entityData, detailData);

  const minThreshold = params.minThreshold ?? 50;
  const canSubmit = missingRequired.length === 0 && completenessPercent >= minThreshold;

  const warnings: string[] = [];
  if (missingRequired.length > 0) {
    warnings.push(`${missingRequired.length} field wajib belum diisi`);
  }
  if (completenessPercent < minThreshold) {
    warnings.push(`Kelengkapan ${completenessPercent}% di bawah threshold ${minThreshold}%`);
  }

  const result: CompletenessValidationResult = {
    entityId: params.entityId,
    objectTypeCode,
    objectSubtypeCode: String(entity.object_subtype_code ?? ""),
    completenessPercent,
    totalWeight,
    filledWeight,
    missingRequired,
    missingOptional,
    canSubmit,
    warnings,
  };

  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.COMPLETENESS_CHECK,
    resourceType: "entity",
    resourceId: params.entityId,
    success: true,
    after: {
      completenessPercent,
      missingRequiredCount: missingRequired.length,
      canSubmit,
    },
  }, ctx);

  return result;
}

export async function batchValidateCompleteness(
  db: D1Binding,
  entityIds: string[],
  ctx: SikesraRequestContext,
): Promise<CompletenessValidationResult[]> {
  const results: CompletenessValidationResult[] = [];

  for (const entityId of entityIds) {
    try {
      const result = await validateCompleteness(db, { entityId }, ctx);
      results.push(result);
    } catch {
      results.push({
        entityId,
        objectTypeCode: "",
        objectSubtypeCode: "",
        completenessPercent: 0,
        totalWeight: 0,
        filledWeight: 0,
        missingRequired: ["Entity not found or inaccessible"],
        missingOptional: [],
        canSubmit: false,
        warnings: ["Entity tidak ditemukan atau tidak dapat diakses"],
      });
    }
  }

  return results;
}

export async function updateCompletenessPercent(
  db: D1Binding,
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<number> {
  const validationResult = await validateCompleteness(db, { entityId }, ctx);

  await db.prepare(
    `UPDATE awcms_sikesra_entities SET completeness_percent = ?, updated_at = datetime('now'), updated_by = ?
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(validationResult.completenessPercent, ctx.userId, entityId, ctx.tenantId, ctx.siteId).run();

  return validationResult.completenessPercent;
}
