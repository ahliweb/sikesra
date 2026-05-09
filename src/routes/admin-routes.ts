interface PluginAdminInteraction {
  type?: string;
  page?: string;
}

type Block = Record<string, unknown>;

// EmDash Block Kit admin interaction route
// POST /_emdash/api/plugins/sikesra/admin
// EmDash wraps the returned blocks in { success, data: { blocks } }
export async function pluginAdminHandler(routeCtx: { input?: PluginAdminInteraction }) {
  const input = routeCtx?.input ?? {};
  const page = (input.page || "").replace(/^\//, "") || "overview";

  return { blocks: getBlocksForPage(page) };
}

function getBlocksForPage(page: string): Block[] {
  switch (page) {
    case "overview": return overviewBlocks();
    case "entities": return entitiesBlocks();
    case "verification": return verificationBlocks();
    case "documents": return documentsBlocks();
    case "settings": return settingsBlocks();
    default: return overviewBlocks();
  }
}

function overviewBlocks(): Block[] {
  return [
    { type: "banner", variant: "default", title: "SIKESRA", description: "Sistem Informasi Kesejahteraan Rakyat — Admin Dashboard" },
    { type: "header", text: "Ringkasan" },
    {
      type: "stats",
      items: [
        { label: "Total Entitas", value: "—", description: "Jumlah data terdaftar" },
        { label: "Terverifikasi", value: "—", description: "Telah diverifikasi berjenjang" },
        { label: "Desa Aktif", value: "—", description: "Desa dengan data terinput" },
        { label: "Status Plugin", value: "online", description: "SIKESRA plugin berjalan", trend: "up" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Akses Cepat" },
    {
      type: "actions",
      elements: [
        { type: "button", label: "Lihat Data Utama", style: "primary", action_id: "nav_entities" },
        { type: "button", label: "Verifikasi", style: "secondary", action_id: "nav_verification" },
        { type: "button", label: "Dokumen", style: "secondary", action_id: "nav_documents" },
        { type: "button", label: "Pengaturan", style: "secondary", action_id: "nav_settings" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Workflow" },
    { type: "section", text: "1. Input data entitas melalui formulir isian bertahap (wizard 11 langkah)." },
    { type: "section", text: "2. Submit data ke antrean verifikasi berjenjang (Desa → Kecamatan → Kabupaten)." },
    { type: "section", text: "3. Verifikator meninjau, melengkapi dokumen, dan mengambil keputusan (verifikasi/perbaiki/tolak)." },
    { type: "section", text: "4. Data terverifikasi tampil di halaman publik /sikesra secara agregat dengan small-cell suppression." },
    { type: "divider" },
    {
      type: "context",
    },
    {
      type: "section",
      text: "Gunakan menu sidebar SIKESRA (Overview, Entities, Verification, Documents, Settings) untuk navigasi antar halaman admin.",
    },
  ];
}

function entitiesBlocks(): Block[] {
  return [
    { type: "banner", variant: "default", title: "Data Utama", description: "Registri entitas kesejahteraan rakyat" },
    { type: "header", text: "Entitas Terdaftar" },
    {
      type: "table",
    },
    { type: "divider" },
    { type: "header", text: "Fitur Registri" },
    { type: "section", text: "• Pencarian berdasarkan kata kunci, tipe objek, wilayah, status data, dan status verifikasi." },
    { type: "section", text: "• Pembuatan entitas baru melalui wizard 11 langkah dengan autosave per langkah." },
    { type: "section", text: "• Lihat detail entitas lengkap dengan tab: Ringkasan, Detail Modul, Atribut, Dokumen, Verifikasi, Riwayat, Audit." },
    { type: "section", text: "• Generate 20-digit SIKESRA ID otomatis berdasarkan kode desa, jenis, subjenis, dan sequence." },
    { type: "divider" },
    { type: "header", text: "Tipe Objek" },
    {
      type: "fields",
      fields: [
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
      type: "actions",
      elements: [
        { type: "button", label: "Tambah Entitas Baru", style: "primary", action_id: "entity_create" },
      ],
    },
  ];
}

function verificationBlocks(): Block[] {
  return [
    { type: "banner", variant: "default", title: "Verifikasi", description: "Antrean dan proses verifikasi berjenjang" },
    { type: "header", text: "Antrean Verifikasi" },
    {
      type: "stats",
      items: [
        { label: "Desa", value: "—", description: "Verifikasi tingkat desa" },
        { label: "Kecamatan", value: "—", description: "Verifikasi tingkat kecamatan" },
        { label: "Kabupaten", value: "—", description: "Verifikasi tingkat kabupaten" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Alur Verifikasi" },
    { type: "section", text: "1. Operator desa/kelurahan menginput dan mensubmit data." },
    { type: "section", text: "2. Verifikator desa meninjau kelengkapan data dan dokumen pendukung." },
    { type: "section", text: "3. Verifikator kecamatan melakukan pengecekan silang antar desa." },
    { type: "section", text: "4. Verifikator kabupaten/OPD melakukan verifikasi final." },
    { type: "divider" },
    { type: "header", text: "Keputusan Verifikasi" },
    {
      type: "actions",
      elements: [
        { type: "button", label: "Verifikasi", style: "primary", action_id: "verify_approve", confirm: { title: "Konfirmasi Verifikasi", text: "Data akan ditandai sebagai terverifikasi. Tindakan ini akan tercatat di audit.", confirm: "Ya, Verifikasi", deny: "Batal", style: "primary" } },
        { type: "button", label: "Perlu Perbaikan", style: "secondary", action_id: "verify_revise", confirm: { title: "Kirim Perbaikan", text: "Data akan dikembalikan ke penginput untuk diperbaiki. Alasan wajib diisi.", confirm: "Kirim", deny: "Batal", style: "primary" } },
        { type: "button", label: "Tolak", style: "destructive", action_id: "verify_reject", confirm: { title: "Tolak Data", text: "Data akan ditolak secara permanen. Tindakan ini tidak dapat dibatalkan.", confirm: "Ya, Tolak", deny: "Batal", style: "danger" } },
      ],
    },
    {
      type: "section",
      text: "Semua keputusan verifikasi memerlukan alasan dan tercatat di audit log.",
    },
  ];
}

function documentsBlocks(): Block[] {
  return [
    { type: "banner", variant: "default", title: "Dokumen", description: "Manajemen dokumen pendukung entitas" },
    { type: "header", text: "Dokumen Pendukung" },
    { type: "section", text: "Unggah dan kelola dokumen pendukung untuk setiap entitas: KTP/KK, surat keterangan, foto, dan dokumen lainnya." },
    { type: "divider" },
    { type: "header", text: "Klasifikasi Dokumen" },
    {
      type: "fields",
      fields: [
        { label: "Internal", value: "Dokumen untuk keperluan administrasi internal" },
        { label: "Restricted", value: "Dokumen dengan akses terbatas (default untuk KTP/KK)" },
        { label: "Highly Restricted", value: "Dokumen sangat rahasia (memerlukan alasan akses)" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Unggah Dokumen" },
    {
      type: "actions",
      elements: [
        { type: "button", label: "Unggah Dokumen", style: "primary", action_id: "doc_upload" },
      ],
    },
    {
      type: "section",
      text: "Format yang didukung: PDF, JPG, PNG (maks. 10 MB). Dokumen diverifikasi oleh verifikator bersama data entitas.",
    },
  ];
}

function settingsBlocks(): Block[] {
  return [
    { type: "banner", variant: "default", title: "Pengaturan", description: "Konfigurasi plugin SIKESRA" },
    { type: "header", text: "Visibilitas Publik" },
    { type: "section", text: "Halaman publik /sikesra menampilkan data agregat dengan small-cell suppression (threshold default: 5)." },
    {
      type: "fields",
      fields: [
        { label: "Halaman Publik", value: "/sikesra" },
        { label: "Small-Cell Threshold", value: "5" },
        { label: "Maks. Upload", value: "10 MB" },
        { label: "Maks. Baris Ekspor", value: "5000" },
        { label: "Alasan Wajib (Restricted)", value: "Ya" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "API Admin" },
    {
      type: "fields",
      fields: [
        { label: "Endpoint Entitas", value: "/_emdash/api/plugins/sikesra/v1/entities" },
        { label: "Endpoint Verifikasi", value: "/_emdash/api/plugins/sikesra/v1/verification/queue" },
        { label: "Endpoint Pengaturan", value: "/_emdash/api/plugins/sikesra/v1/settings" },
      ],
    },
    { type: "divider" },
    { type: "header", text: "Fitur" },
    {
      type: "actions",
      elements: [
        { type: "checkbox", label: "Verifikasi Berjenjang", action_id: "feature_verification", initial_value: ["enabled"] },
        { type: "checkbox", label: "Import Excel", action_id: "feature_import", initial_value: ["enabled"] },
        { type: "checkbox", label: "Ekspor Data", action_id: "feature_export", initial_value: ["enabled"] },
        { type: "checkbox", label: "Generate 20-digit ID", action_id: "feature_codegen", initial_value: ["enabled"] },
      ],
    },
  ];
}
