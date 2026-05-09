// SIKESRA Admin Block Kit Route Handler
// Dynamic D1-backed blocks for all 10 admin pages
// Source: docs/sikesra/05_ui_ux.md, docs/sikesra/04_api_contracts.md

import type { EmDashRouteContext, RouteEnv } from "./handler-utils";
import type { D1Binding } from "../repositories/db";

interface PluginAdminInteraction {
  type?: string;
  page?: string;
}

type Block = Record<string, unknown>;

// Helper: safe D1 count query
async function countWhere(db: D1Binding, table: string, tenantId: string, siteId: string, extra = ""): Promise<number> {
  const sql = `SELECT COUNT(*) as cnt FROM ${table} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL ${extra}`;
  const row = await db.prepare(sql).bind(tenantId, siteId).first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

// Main handler — POST /_emdash/api/plugins/sikesra/admin
export async function pluginAdminHandler(routeCtx: EmDashRouteContext<PluginAdminInteraction>) {
  const input = routeCtx?.input ?? {};
  const page = (input.page || "").replace(/^\//, "") || "overview";
  const db = routeCtx.env?.SIKESRA_DB;
  const tenantId = routeCtx.site?.tenantId ?? "default";
  const siteId = routeCtx.site?.id ?? "default";

  return { blocks: await getBlocksForPage(page, db, tenantId, siteId) };
}

async function getBlocksForPage(page: string, db: D1Binding | undefined, tid: string, sid: string): Promise<Block[]> {
  if (!db) return [{ type: "banner", variant: "warning", title: "SIKESRA", description: "Database tidak tersedia." }];
  switch (page) {
    case "overview": return overviewBlocks(db, tid, sid);
    case "entities": return entitiesBlocks(db, tid, sid);
    case "verification": return verificationBlocks(db, tid, sid);
    case "imports": return importsBlocks(db, tid, sid);
    case "documents": return documentsBlocks(db, tid, sid);
    case "reports": return reportsBlocks(db, tid, sid);
    case "regions": return regionsBlocks(db, tid, sid);
    case "access": return accessBlocks(db, tid, sid);
    case "audit": return auditBlocks(db, tid, sid);
    case "settings": return settingsBlocks(db, tid, sid);
    default: return overviewBlocks(db, tid, sid);
  }
}

// ─── Page 1: Dashboard (overview) ───
async function overviewBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const [total, draft, submitted, verified, needRevision, rejected] = await Promise.all([
    countWhere(db, "awcms_sikesra_entities", tid, sid),
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_data = 'draft'"),
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_data = 'submitted'"),
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_verification = 'verified'"),
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_verification = 'need_revision'"),
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_verification = 'rejected'"),
  ]);

  const pendingVerif = await countWhere(db, "awcms_sikesra_entities", tid, sid,
    "AND status_verification IN ('submitted_village','submitted_subdistrict','submitted_regency')");

  const recentAudit = await db.prepare(
    `SELECT action, resource_type, actor_id, created_at FROM awcms_sikesra_audit_logs
     WHERE tenant_id = ? AND site_id = ? ORDER BY created_at DESC LIMIT 5`
  ).bind(tid, sid).all<Record<string, unknown>>();

  const activityLines = recentAudit.results.map(r =>
    `${String(r.action)} pada ${String(r.resource_type)} oleh ${String(r.actor_id)} (${String(r.created_at)})`
  );

  return [
    { type: "banner", variant: "default", title: "SIKESRA", description: "Sistem Informasi Kesejahteraan Rakyat — Admin Dashboard" },
    { type: "header", text: "Ringkasan KPI" },
    {
      type: "stats", items: [
        { label: "Total Entitas", value: String(total), description: "Jumlah data terdaftar" },
        { label: "Draft", value: String(draft), description: "Belum disubmit" },
        { label: "Submitted", value: String(submitted), description: "Menunggu proses" },
        { label: "Terverifikasi", value: String(verified), description: "Verifikasi selesai", trend: "up" },
        { label: "Perlu Perbaikan", value: String(needRevision), description: "Dikembalikan" },
        { label: "Ditolak", value: String(rejected), description: "Ditolak permanen" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Antrean Kerja" },
    {
      type: "stats", items: [
        { label: "Menunggu Verifikasi", value: String(pendingVerif), description: "Semua tingkat" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Aktivitas Terbaru" },
    ...(activityLines.length > 0
      ? activityLines.map(line => ({ type: "section", text: line }))
      : [{ type: "empty", title: "Belum ada aktivitas", description: "Log audit akan tampil di sini.", size: "sm" }]),
    { type: "divider" },
    { type: "header", text: "Akses Cepat" },
    {
      type: "actions", elements: [
        { type: "button", label: "Data Utama", style: "primary", action_id: "nav_entities" },
        { type: "button", label: "Verifikasi", style: "secondary", action_id: "nav_verification" },
        { type: "button", label: "Import Excel", style: "secondary", action_id: "nav_imports" },
        { type: "button", label: "Laporan", style: "secondary", action_id: "nav_reports" },
        { type: "button", label: "Audit", style: "secondary", action_id: "nav_audit" },
      ],
    },
  ];
}

// ─── Page 2: Data Utama (entities) ───
async function entitiesBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const total = await countWhere(db, "awcms_sikesra_entities", tid, sid);

  const rows = await db.prepare(
    `SELECT id, sikesra_id_20, display_name, object_type_code, status_data, status_verification, completeness_percent, created_at
     FROM awcms_sikesra_entities WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT 20`
  ).bind(tid, sid).all<Record<string, unknown>>();

  const entitySections: Block[] = rows.results.map(r => ({
    type: "section",
    text: `**${String(r.display_name)}** — ${String(r.sikesra_id_20 ?? "ID belum digenerate")} | Tipe: ${String(r.object_type_code)} | Status: ${String(r.status_data)}/${String(r.status_verification)} | Kelengkapan: ${r.completeness_percent}%`,
  }));

  return [
    { type: "banner", variant: "default", title: "Data Utama", description: "Registri entitas kesejahteraan rakyat" },
    { type: "header", text: `Entitas Terdaftar (${total})` },
    ...(entitySections.length > 0 ? entitySections : [
      { type: "empty", title: "Tidak ada data", description: "Data entitas akan tampil di sini setelah diinput.", size: "sm" },
    ]),
    { type: "divider" },
    { type: "header", text: "Tipe Objek" },
    {
      type: "fields", fields: [
        { label: "01 - Rumah Ibadah", value: "Building" },
        { label: "02 - Lembaga Keagamaan", value: "Institution" },
        { label: "03 - Pendidikan Keagamaan", value: "Institution" },
        { label: "04 - LKS (Panti)", value: "Institution" },
        { label: "05 - Guru Agama", value: "Person" },
        { label: "06 - Anak Yatim", value: "Person" },
        { label: "07 - Disabilitas", value: "Person" },
        { label: "08 - Lansia Terlantar", value: "Person" },
      ],
    },
    {
      type: "actions", elements: [
        { type: "button", label: "Tambah Entitas Baru", style: "primary", action_id: "entity_create" },
      ],
    },
  ];
}

// ─── Page 3: Verifikasi ───
async function verificationBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const [village, subdistrict, regency] = await Promise.all([
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_verification = 'submitted_village'"),
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_verification = 'submitted_subdistrict'"),
    countWhere(db, "awcms_sikesra_entities", tid, sid, "AND status_verification = 'submitted_regency'"),
  ]);

  return [
    { type: "banner", variant: "default", title: "Verifikasi", description: "Antrean dan proses verifikasi berjenjang" },
    { type: "header", text: "Antrean Verifikasi" },
    {
      type: "stats", items: [
        { label: "Tingkat Desa", value: String(village), description: "submitted_village" },
        { label: "Tingkat Kecamatan", value: String(subdistrict), description: "submitted_subdistrict" },
        { label: "Tingkat Kabupaten", value: String(regency), description: "submitted_regency" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Alur Verifikasi" },
    { type: "section", text: "1. Operator desa/kelurahan menginput dan mensubmit data." },
    { type: "section", text: "2. Verifikator desa meninjau kelengkapan data dan dokumen pendukung." },
    { type: "section", text: "3. Verifikator kecamatan melakukan pengecekan silang antar desa." },
    { type: "section", text: "4. Verifikator kabupaten/OPD melakukan verifikasi final." },
    { type: "divider" },
    {
      type: "actions", elements: [
        { type: "button", label: "Verifikasi", style: "primary", action_id: "verify_approve",
          confirm: { title: "Konfirmasi Verifikasi", text: "Data akan ditandai terverifikasi. Tercatat di audit.", confirm: "Ya, Verifikasi", deny: "Batal", style: "primary" } },
        { type: "button", label: "Perlu Perbaikan", style: "secondary", action_id: "verify_revise",
          confirm: { title: "Kirim Perbaikan", text: "Data dikembalikan ke penginput. Alasan wajib diisi.", confirm: "Kirim", deny: "Batal", style: "primary" } },
        { type: "button", label: "Tolak", style: "destructive", action_id: "verify_reject",
          confirm: { title: "Tolak Data", text: "Data ditolak permanen. Tidak dapat dibatalkan.", confirm: "Ya, Tolak", deny: "Batal", style: "danger" } },
      ],
    },
    { type: "section", text: "Semua keputusan verifikasi memerlukan alasan dan tercatat di audit log." },
  ];
}

// ─── Placeholder stubs for pages 4-10 (will be filled in next atoms) ───
async function importsBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const total = await countWhere(db, "awcms_sikesra_import_batches", tid, sid);
  const rows = await db.prepare(
    `SELECT id, original_filename, status, row_count, valid_row_count, invalid_row_count, promoted_row_count, created_at
     FROM awcms_sikesra_import_batches WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 10`
  ).bind(tid, sid).all<Record<string, unknown>>();

  const batchSections: Block[] = rows.results.map(r => ({
    type: "section",
    text: `**${String(r.original_filename)}** — Status: ${String(r.status)} | Total: ${r.row_count} | Valid: ${r.valid_row_count} | Invalid: ${r.invalid_row_count} | Promoted: ${r.promoted_row_count} | ${String(r.created_at)}`,
  }));

  return [
    { type: "banner", variant: "default", title: "Import Excel", description: "Manajemen import data dari workbook Excel" },
    { type: "header", text: `Batch Import (${total})` },
    ...(batchSections.length > 0 ? batchSections : [
      { type: "empty", title: "Belum ada import", description: "Upload workbook Excel untuk memulai proses import.", size: "sm" },
    ]),
    { type: "divider" },
    { type: "header", text: "Alur Import" },
    { type: "section", text: "1. Upload workbook → 2. Pilih sheet → 3. Mapping kolom → 4. Validasi → 5. Preview staging → 6. Koreksi → 7. Review duplikat → 8. Promote → 9. Laporan import" },
    { type: "divider" },
    { type: "actions", elements: [
      { type: "button", label: "Upload Workbook Baru", style: "primary", action_id: "import_upload" },
    ] },
    { type: "section", text: "Semua baris import melewati staging sebelum promosi. Baris invalid tidak dapat dipromosikan." },
  ];
}
async function documentsBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const total = await countWhere(db, "awcms_sikesra_file_objects", tid, sid);
  const verified = await countWhere(db, "awcms_sikesra_file_objects", tid, sid, "AND is_verified = 1");

  return [
    { type: "banner", variant: "default", title: "Dokumen", description: "Manajemen dokumen pendukung entitas" },
    { type: "header", text: "Ringkasan Dokumen" },
    { type: "stats", items: [
      { label: "Total Dokumen", value: String(total), description: "Semua file terunggah" },
      { label: "Terverifikasi", value: String(verified), description: "Sudah diverifikasi" },
      { label: "Belum Verifikasi", value: String(total - verified), description: "Menunggu review" },
    ] },
    { type: "divider" },
    { type: "header", text: "Klasifikasi Dokumen" },
    { type: "fields", fields: [
      { label: "Internal", value: "Dokumen untuk administrasi internal" },
      { label: "Restricted", value: "Dokumen dengan akses terbatas (default KTP/KK)" },
      { label: "Highly Restricted", value: "Dokumen sangat rahasia (memerlukan alasan akses)" },
    ] },
    { type: "divider" },
    { type: "actions", elements: [
      { type: "button", label: "Unggah Dokumen", style: "primary", action_id: "doc_upload" },
    ] },
    { type: "section", text: "Format didukung: PDF, JPG, PNG (maks. 10 MB). Dokumen diverifikasi bersama data entitas." },
  ];
}
async function reportsBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const totalExports = await countWhere(db, "awcms_sikesra_export_jobs", tid, sid);
  const pendingExports = await countWhere(db, "awcms_sikesra_export_jobs", tid, sid, "AND status = 'pending'");

  return [
    { type: "banner", variant: "default", title: "Laporan", description: "Laporan dan ekspor data" },
    { type: "header", text: "Jenis Laporan" },
    { type: "fields", fields: [
      { label: "Ringkasan Entitas", value: "Rekapitulasi per jenis, subjenis, wilayah (CSV/XLSX)" },
      { label: "Status Verifikasi", value: "Daftar entitas dengan status verifikasi (Restricted)" },
      { label: "Data Detail (Terbatas)", value: "Data detail dengan kolom sensitif — memerlukan alasan (XLSX)" },
      { label: "Bukti Audit", value: "Log audit untuk pemeriksaan — nilai sensitif disamarkan (CSV)" },
    ] },
    { type: "divider" },
    { type: "header", text: `Ekspor (${totalExports})` },
    { type: "stats", items: [
      { label: "Total Job Ekspor", value: String(totalExports) },
      { label: "Pending", value: String(pendingExports), description: "Sedang diproses" },
    ] },
    { type: "divider" },
    { type: "actions", elements: [
      { type: "button", label: "Buat Ekspor Baru", style: "primary", action_id: "export_create" },
    ] },
    { type: "section", text: "Ekspor restricted memerlukan izin khusus dan alasan. Semua ekspor tercatat di audit log." },
  ];
}
async function regionsBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const officialCount = await countWhere(db, "awcms_sikesra_official_regions", tid, sid);
  const localCount = await countWhere(db, "awcms_sikesra_local_regions", tid, sid);

  const levels = await db.prepare(
    `SELECT level, COUNT(*) as cnt FROM awcms_sikesra_official_regions
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL GROUP BY level`
  ).bind(tid, sid).all<Record<string, unknown>>();

  const levelFields = levels.results.map(r => ({
    label: String(r.level), value: String(r.cnt),
  }));

  return [
    { type: "banner", variant: "default", title: "Wilayah", description: "Manajemen wilayah resmi dan lokal" },
    { type: "header", text: "Wilayah Resmi (Kemendagri)" },
    { type: "stats", items: [
      { label: "Total Wilayah Resmi", value: String(officialCount) },
      { label: "Wilayah Lokal", value: String(localCount), description: "Dusun, RT, RW, dll." },
    ] },
    ...(levelFields.length > 0 ? [{ type: "fields" as const, fields: levelFields }] : []),
    { type: "divider" },
    { type: "header", text: "Wilayah Lokal" },
    { type: "section", text: "Wilayah lokal (dusun, lingkungan, RW, RT, blok, zona, area petugas) bersifat operasional dan tidak mempengaruhi SIKESRA ID." },
    { type: "actions", elements: [
      { type: "button", label: "Tambah Wilayah Lokal", style: "primary", action_id: "region_create" },
    ] },
  ];
}
async function accessBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const policyCount = await countWhere(db, "awcms_sikesra_abac_policies", tid, sid);
  const activePolicies = await countWhere(db, "awcms_sikesra_abac_policies", tid, sid, "AND is_active = 1");
  const attrDefCount = await countWhere(db, "awcms_sikesra_attribute_definitions", tid, sid);

  const categories = await db.prepare(
    `SELECT category, COUNT(*) as cnt FROM awcms_sikesra_attribute_definitions
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL GROUP BY category ORDER BY cnt DESC`
  ).bind(tid, sid).all<Record<string, unknown>>();

  const catFields = categories.results.map(r => ({
    label: String(r.category), value: String(r.cnt),
  }));

  return [
    { type: "banner", variant: "default", title: "Atribut & Akses", description: "Definisi atribut dan kebijakan ABAC" },
    { type: "header", text: "Kebijakan ABAC" },
    { type: "stats", items: [
      { label: "Total Kebijakan", value: String(policyCount) },
      { label: "Aktif", value: String(activePolicies), description: "Kebijakan yang berlaku" },
      { label: "Definisi Atribut", value: String(attrDefCount) },
    ] },
    ...(catFields.length > 0 ? [
      { type: "divider" as const },
      { type: "header" as const, text: "Kategori Atribut" },
      { type: "fields" as const, fields: catFields },
    ] : []),
    { type: "divider" },
    { type: "section", text: "Kebijakan ABAC menentukan akses berdasarkan atribut subjek, resource, dan lingkungan. Deny selalu menang atas allow." },
  ];
}
async function auditBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const totalLogs = await db.prepare(
    `SELECT COUNT(*) as cnt FROM awcms_sikesra_audit_logs WHERE tenant_id = ? AND site_id = ?`
  ).bind(tid, sid).first<{ cnt: number }>();

  const recentLogs = await db.prepare(
    `SELECT id, action, resource_type, resource_id, actor_id, success, created_at
     FROM awcms_sikesra_audit_logs WHERE tenant_id = ? AND site_id = ?
     ORDER BY created_at DESC LIMIT 15`
  ).bind(tid, sid).all<Record<string, unknown>>();

  const logSections: Block[] = recentLogs.results.map(r => ({
    type: "section",
    text: `${r.success ? "✓" : "✗"} **${String(r.action)}** pada ${String(r.resource_type)}/${String(r.resource_id)} oleh ${String(r.actor_id)} — ${String(r.created_at)}`,
  }));

  return [
    { type: "banner", variant: "default", title: "Audit", description: "Log audit aksi kritikal" },
    { type: "header", text: `Log Audit (${totalLogs?.cnt ?? 0} total)` },
    ...(logSections.length > 0 ? logSections : [
      { type: "empty", title: "Belum ada log", description: "Audit events akan muncul setelah ada aksi kritikal.", size: "sm" },
    ]),
    { type: "divider" },
    { type: "section", text: "Log audit bersifat immutable. Nilai sensitif di before/after disamarkan sesuai izin viewer." },
  ];
}
async function settingsBlocks(db: D1Binding, tid: string, sid: string): Promise<Block[]> {
  const settings = await db.prepare(
    `SELECT public_enabled, public_title, small_cell_threshold, max_upload_bytes, export_max_sync_rows,
            require_reason_for_highly_restricted_download, feature_flags_json
     FROM awcms_sikesra_settings WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL LIMIT 1`
  ).bind(tid, sid).first<Record<string, unknown>>();

  const s = settings ?? {};
  const maxUploadMb = Math.round(Number(s.max_upload_bytes ?? 10485760) / 1048576);

  return [
    { type: "banner", variant: "default", title: "Pengaturan", description: "Konfigurasi plugin SIKESRA" },
    { type: "header", text: "Pengaturan Saat Ini" },
    { type: "fields", fields: [
      { label: "Halaman Publik", value: Number(s.public_enabled) === 1 ? "Aktif" : "Nonaktif" },
      { label: "Judul Publik", value: String(s.public_title ?? "SIKESRA") },
      { label: "Small-Cell Threshold", value: String(s.small_cell_threshold ?? 5) },
      { label: "Maks. Upload", value: `${maxUploadMb} MB` },
      { label: "Maks. Baris Ekspor", value: String(s.export_max_sync_rows ?? 5000) },
      { label: "Alasan Wajib (Highly Restricted)", value: Number(s.require_reason_for_highly_restricted_download) === 1 ? "Ya" : "Tidak" },
    ] },
    { type: "divider" },
    { type: "header", text: "API Admin" },
    { type: "fields", fields: [
      { label: "Entitas", value: "/_emdash/api/plugins/sikesra/v1/entities" },
      { label: "Verifikasi", value: "/_emdash/api/plugins/sikesra/v1/verification/queue" },
      { label: "Import", value: "/_emdash/api/plugins/sikesra/v1/imports" },
      { label: "Ekspor", value: "/_emdash/api/plugins/sikesra/v1/exports" },
      { label: "Pengaturan", value: "/_emdash/api/plugins/sikesra/v1/settings" },
    ] },
    { type: "divider" },
    { type: "header", text: "Fitur" },
    { type: "actions", elements: [
      { type: "checkbox", label: "Verifikasi Berjenjang", action_id: "feature_verification", options: [{ value: "enabled", label: "Aktif" }], initial_value: ["enabled"] },
      { type: "checkbox", label: "Import Excel", action_id: "feature_import", options: [{ value: "enabled", label: "Aktif" }], initial_value: ["enabled"] },
      { type: "checkbox", label: "Ekspor Data", action_id: "feature_export", options: [{ value: "enabled", label: "Aktif" }], initial_value: ["enabled"] },
      { type: "checkbox", label: "Generate 20-digit ID", action_id: "feature_codegen", options: [{ value: "enabled", label: "Aktif" }], initial_value: ["enabled"] },
    ] },
    { type: "section", text: "Perubahan pengaturan memerlukan izin awcms:sikesra:settings:update dan tercatat di audit log." },
  ];
}
