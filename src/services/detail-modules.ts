// SIKESRA Detail Modules Service
// CRUD operations for entity-specific detail tables
// Source: docs/sikesra/03_data_model.md, migration 0004

import type { SikesraRequestContext } from "../security/request-context";
import type { D1Binding } from "../repositories/db";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";

export interface DetailModuleField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  options?: string[];
}

export interface DetailModuleSchema {
  objectTypeCode: string;
  tableName: string;
  fields: DetailModuleField[];
}

export const DETAIL_MODULE_SCHEMAS: Record<string, DetailModuleSchema> = {
  "01": {
    objectTypeCode: "01",
    tableName: "awcms_sikesra_rumah_ibadah_details",
    fields: [
      { key: "jenis_rumah_ibadah", label: "Jenis Rumah Ibadah", type: "select", options: ["Masjid", "Musholla", "Gereja", "Pura", "Vihara", "Klenteng"] },
      { key: "status_pembangunan", label: "Status Pembangunan", type: "select", options: ["Permanen", "Semi Permanen", "Darurat"] },
      { key: "luas_bangunan", label: "Luas Bangunan (m²)", type: "number" },
      { key: "luas_tanah", label: "Luas Tanah (m²)", type: "number" },
      { key: "kapasitas_jamaah", label: "Kapasitas Jamaah", type: "number" },
      { key: "tahun_didirikan", label: "Tahun Didirikan", type: "number" },
      { key: "imam_nama", label: "Nama Imam/Pemimpin", type: "text" },
      { key: "pengurus_nama", label: "Nama Pengurus", type: "text" },
      { key: "kegiatan_rutin", label: "Kegiatan Rutin", type: "text" },
      { key: "sumber_dana", label: "Sumber Dana", type: "text" },
    ],
  },
  "02": {
    objectTypeCode: "02",
    tableName: "awcms_sikesra_lembaga_keagamaan_details",
    fields: [
      { key: "agama", label: "Agama", type: "select", options: ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"] },
      { key: "nomor_sk", label: "Nomor SK", type: "text" },
      { key: "tanggal_sk", label: "Tanggal SK", type: "date" },
      { key: "nama_pimpinan", label: "Nama Pimpinan", type: "text" },
      { key: "jumlah_pengurus", label: "Jumlah Pengurus", type: "number" },
      { key: "jumlah_anggota", label: "Jumlah Anggota", type: "number" },
      { key: "kegiatan_utama", label: "Kegiatan Utama", type: "text" },
      { key: "sumber_dana", label: "Sumber Dana", type: "text" },
    ],
  },
  "03": {
    objectTypeCode: "03",
    tableName: "awcms_sikesra_pendidikan_keagamaan_details",
    fields: [
      { key: "jenis_pendidikan", label: "Jenis Pendidikan", type: "select", options: ["TPA", "TPQ", "Madrasah Diniyah", "Pesantren", "Sekolah Minggu", "Kursus"] },
      { key: "jumlah_santri_lk", label: "Jumlah Santri LK", type: "number" },
      { key: "jumlah_santri_pr", label: "Jumlah Santri PR", type: "number" },
      { key: "jumlah_guru_lk", label: "Jumlah Guru LK", type: "number" },
      { key: "jumlah_guru_pr", label: "Jumlah Guru PR", type: "number" },
      { key: "kurikulum", label: "Kurikulum", type: "text" },
      { key: "nomor_sk_operasional", label: "Nomor SK Operasional", type: "text" },
      { key: "status_akreditasi", label: "Status Akreditasi", type: "select", options: ["A", "B", "C", "Belum Terakreditasi"] },
      { key: "sumber_dana", label: "Sumber Dana", type: "text" },
    ],
  },
  "04": {
    objectTypeCode: "04",
    tableName: "awcms_sikesra_lks_details",
    fields: [
      { key: "jenis_lks", label: "Jenis LKS", type: "text" },
      { key: "nama_pimpinan", label: "Nama Pimpinan", type: "text" },
      { key: "jumlah_pengasuh", label: "Jumlah Pengasuh", type: "number" },
      { key: "jumlah_penerima_manfaat", label: "Jumlah Penerima Manfaat", type: "number" },
      { key: "nomor_sk", label: "Nomor SK", type: "text" },
      { key: "tanggal_sk", label: "Tanggal SK", type: "date" },
      { key: "sumber_dana", label: "Sumber Dana", type: "text" },
      { key: "program_unggulan", label: "Program Unggulan", type: "text" },
    ],
  },
  "05": {
    objectTypeCode: "05",
    tableName: "awcms_sikesra_guru_agama_details",
    fields: [
      { key: "agama", label: "Agama", type: "select", options: ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"] },
      { key: "status_guru", label: "Status Guru", type: "select", options: ["aktif", "tidak_aktif", "pensiun", "almarhum"] },
      { key: "bidang_pengajaran", label: "Bidang Pengajaran", type: "text" },
      { key: "institusi_pengajaran", label: "Institusi Pengajaran", type: "text" },
      { key: "jumlah_murid", label: "Jumlah Murid", type: "number" },
      { key: "pendidikan_terakhir", label: "Pendidikan Terakhir", type: "text" },
      { key: "sertifikasi", label: "Sertifikasi", type: "text" },
    ],
  },
  "06": {
    objectTypeCode: "06",
    tableName: "awcms_sikesra_anak_yatim_details",
    fields: [
      { key: "kategori_anak", label: "Kategori Anak", type: "select", options: ["yatim", "piatu", "yatim_piatu"] },
      { key: "status_sekolah", label: "Status Sekolah", type: "select", options: ["Bersekolah", "Tidak Bersekolah", "Putus Sekolah"] },
      { key: "tingkat_pendidikan", label: "Tingkat Pendidikan", type: "text" },
      { key: "nama_sekolah", label: "Nama Sekolah", type: "text" },
      { key: "nama_wali", label: "Nama Wali", type: "text" },
      { key: "hubungan_wali", label: "Hubungan Wali", type: "text" },
      { key: "alamat_wali", label: "Alamat Wali", type: "text" },
      { key: "sumber_bantuan", label: "Sumber Bantuan", type: "text" },
    ],
  },
  "07": {
    objectTypeCode: "07",
    tableName: "awcms_sikesra_disabilitas_details",
    fields: [
      { key: "jenis_disabilitas", label: "Jenis Disabilitas", type: "text" },
      { key: "tingkat_keparahan", label: "Tingkat Keparahan", type: "select", options: ["ringan", "sedang", "berat"] },
      { key: "alat_bantu_dibutuhkan", label: "Alat Bantu Dibutuhkan", type: "number" },
      { key: "jenis_alat_bantu", label: "Jenis Alat Bantu", type: "text" },
      { key: "akses_layanan_kesehatan", label: "Akses Layanan Kesehatan", type: "text" },
      { key: "partisipasi_sekolah_kerja", label: "Partisipasi Sekolah/Kerja", type: "text" },
      { key: "kebutuhan_pendampingan", label: "Kebutuhan Pendampingan", type: "text" },
      { key: "sumber_bantuan", label: "Sumber Bantuan", type: "text" },
    ],
  },
  "08": {
    objectTypeCode: "08",
    tableName: "awcms_sikesra_lansia_terlantar_details",
    fields: [
      { key: "status_keterlantaran", label: "Status Keterlantaran", type: "select", options: ["terlantar", "rawan_terlantar", "mandiri_risiko"] },
      { key: "kondisi_tempat_tinggal", label: "Kondisi Tempat Tinggal", type: "text" },
      { key: "status_tinggal", label: "Status Tinggal", type: "select", options: ["sendiri", "pasangan", "keluarga", "panti"] },
      { key: "sumber_penghasilan", label: "Sumber Penghasilan", type: "text" },
      { key: "akses_jaminan_sosial", label: "Akses Jaminan Sosial", type: "text" },
      { key: "riwayat_penyakit", label: "Riwayat Penyakit", type: "text" },
      { key: "kebutuhan_prioritas", label: "Kebutuhan Prioritas", type: "text" },
    ],
  },
};

export interface DetailModuleData {
  id?: string;
  [key: string]: unknown;
}

export async function getEntityDetailModule(
  db: D1Binding,
  entityId: string,
  objectTypeCode: string,
  ctx: SikesraRequestContext,
): Promise<DetailModuleData | null> {
  const schema = DETAIL_MODULE_SCHEMAS[objectTypeCode];
  if (!schema) return null;

  const row = await db.prepare(
    `SELECT * FROM ${schema.tableName} WHERE entity_id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(entityId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!row) return null;

  const result: DetailModuleData = { id: row.id as string };
  for (const field of schema.fields) {
    result[field.key] = row[field.key];
  }
  result.created_at = row.created_at;
  result.updated_at = row.updated_at;

  return result;
}

export async function upsertEntityDetailModule(
  db: D1Binding,
  entityId: string,
  objectTypeCode: string,
  data: DetailModuleData,
  ctx: SikesraRequestContext,
): Promise<{ id: string; action: "created" | "updated" }> {
  const schema = DETAIL_MODULE_SCHEMAS[objectTypeCode];
  if (!schema) throw new Error("INVALID_OBJECT_TYPE_CODE");

  const existing = await getEntityDetailModule(db, entityId, objectTypeCode, ctx);
  const now = new Date().toISOString();
  const id = existing?.id as string || `detail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const fieldKeys = schema.fields.map((f) => f.key);
  const columns = ["id", "tenant_id", "site_id", "entity_id", ...fieldKeys, "updated_by", "updated_at"];
  const placeholders = ["?", "?", "?", "?", ...fieldKeys.map(() => "?"), "?", "?"];
  const values = [id, ctx.tenantId, ctx.siteId, entityId, ...fieldKeys.map((k) => data[k] ?? null), ctx.userId, now];

  if (!existing) {
    columns.push("created_by", "created_at");
    placeholders.push("?", "?");
    values.push(ctx.userId, now);

    await db.prepare(
      `INSERT INTO ${schema.tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`
    ).bind(...values).run();

    await writeAuditEvent(
      db,
      {
        tenantId: ctx.tenantId,
        siteId: ctx.siteId,
        actorId: ctx.userId,
        actorRole: ctx.roles[0],
        action: AUDIT_ACTIONS.ENTITY_DETAIL_CREATE,
        resourceType: "entity_detail",
        resourceId: id,
        requestId: ctx.requestId,
        success: true,
        reason: `create detail for entity ${entityId} (${objectTypeCode})`,
        after: { entityId, objectTypeCode, id },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      ctx,
    );

    return { id, action: "created" };
  } else {
    const updateColumns = fieldKeys.map((k) => `${k} = ?`);
    updateColumns.push("updated_by = ?", "updated_at = ?");
    const updateValues = [...fieldKeys.map((k) => data[k] ?? null), ctx.userId, now, id, ctx.tenantId, ctx.siteId, entityId];

    await db.prepare(
      `UPDATE ${schema.tableName} SET ${updateColumns.join(", ")} WHERE id = ? AND tenant_id = ? AND site_id = ? AND entity_id = ? AND deleted_at IS NULL`
    ).bind(...updateValues).run();

    await writeAuditEvent(
      db,
      {
        tenantId: ctx.tenantId,
        siteId: ctx.siteId,
        actorId: ctx.userId,
        actorRole: ctx.roles[0],
        action: AUDIT_ACTIONS.ENTITY_DETAIL_UPDATE,
        resourceType: "entity_detail",
        resourceId: id,
        requestId: ctx.requestId,
        success: true,
        reason: `update detail for entity ${entityId} (${objectTypeCode})`,
        before: existing,
        after: data,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
      ctx,
    );

    return { id, action: "updated" };
  }
}

export async function deleteEntityDetailModule(
  db: D1Binding,
  entityId: string,
  objectTypeCode: string,
  ctx: SikesraRequestContext,
): Promise<void> {
  const schema = DETAIL_MODULE_SCHEMAS[objectTypeCode];
  if (!schema) throw new Error("INVALID_OBJECT_TYPE_CODE");

  const existing = await getEntityDetailModule(db, entityId, objectTypeCode, ctx);
  if (!existing) return;

  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE ${schema.tableName} SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE entity_id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
  ).bind(now, now, ctx.userId, entityId, ctx.tenantId, ctx.siteId).run();

  await writeAuditEvent(
    db,
    {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      actorId: ctx.userId,
      actorRole: ctx.roles[0],
      action: AUDIT_ACTIONS.ENTITY_DETAIL_DELETE,
      resourceType: "entity_detail",
      resourceId: existing.id as string,
      requestId: ctx.requestId,
      success: true,
      reason: `delete detail for entity ${entityId} (${objectTypeCode})`,
      before: existing,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    ctx,
  );
}
