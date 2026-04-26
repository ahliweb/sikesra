export const SIKESRA_ADMIN_PLUGIN_ID = "sikesra-admin";

export const SIKESRA_ADMIN_PERMISSIONS = [
  {
    code: "sikesra.dashboard.read",
    label: "Lihat Dashboard SIKESRA",
    description: "Mengakses ringkasan agregat SIKESRA tanpa membuka data sensitif secara penuh.",
  },
  {
    code: "sikesra.registry.read",
    label: "Lihat Registry Data",
    description: "Mengakses daftar data SIKESRA sesuai cakupan wilayah dan izin pengguna.",
  },
  {
    code: "sikesra.verification.read",
    label: "Lihat Verifikasi Data",
    description: "Mengakses antrean dan riwayat verifikasi data SIKESRA.",
  },
  {
    code: "sikesra.documents.read",
    label: "Lihat Dokumen Pendukung",
    description: "Mengakses metadata dokumen pendukung tanpa membuka isi dokumen sensitif secara otomatis.",
  },
  {
    code: "sikesra.import.manage",
    label: "Kelola Import Excel",
    description: "Mengelola proses import Excel SIKESRA dengan validasi dan audit.",
  },
  {
    code: "sikesra.reports.export",
    label: "Buat Laporan dan Export",
    description: "Membuat laporan dan export sesuai pembatasan data sensitif.",
  },
  {
    code: "sikesra.reference.manage",
    label: "Kelola Wilayah dan Kodefikasi",
    description: "Mengelola referensi wilayah, kategori, agama, dan kodefikasi SIKESRA.",
  },
  {
    code: "sikesra.audit.read",
    label: "Lihat Audit Log",
    description: "Mengakses audit aktivitas SIKESRA untuk kebutuhan pengawasan.",
  },
  {
    code: "sikesra.access.manage",
    label: "Kelola Pengguna dan Akses",
    description: "Mengelola akses operator SIKESRA melalui kontrol RBAC/ABAC.",
  },
  {
    code: "sikesra.settings.manage",
    label: "Kelola Pengaturan SIKESRA",
    description: "Mengelola pengaturan SIKESRA yang tidak mengandung nilai rahasia.",
  },
];

const SIKESRA_MENU_GROUP = "SIKESRA";

export const SIKESRA_ADMIN_PAGES = [
  page("/", "Dashboard SIKESRA", "layout-dashboard", "sikesra.dashboard.read"),
  page("/registry", "Registry Data", "table", "sikesra.registry.read", [
    page("/registry/anak-yatim", "Anak Yatim/Piatu", "users", "sikesra.registry.read"),
    page("/registry/disabilitas", "Penyandang Disabilitas", "accessibility", "sikesra.registry.read"),
    page("/registry/lansia-terlantar", "Lansia Terlantar", "heart-handshake", "sikesra.registry.read"),
    page("/registry/guru-agama", "Guru Agama", "book-open", "sikesra.registry.read"),
  ]),
  page("/verification", "Verifikasi Data", "badge-check", "sikesra.verification.read"),
  page("/documents", "Dokumen Pendukung", "folder-lock", "sikesra.documents.read"),
  page("/imports", "Import Excel", "file-spreadsheet", "sikesra.import.manage"),
  page("/reports", "Laporan & Export", "file-down", "sikesra.reports.export"),
  page("/references", "Wilayah & Kodefikasi", "map", "sikesra.reference.manage"),
  page("/audit", "Audit Log", "clipboard-list", "sikesra.audit.read"),
  page("/access", "Pengguna & Akses", "shield-check", "sikesra.access.manage"),
  page("/settings", "Pengaturan", "settings", "sikesra.settings.manage"),
];

function page(path, label, icon, permissionCode, children = []) {
  return {
    path,
    label,
    icon,
    group: SIKESRA_MENU_GROUP,
    permissionCode,
    sensitivity: "restricted",
    children,
  };
}

export function sikesraAdminPlugin() {
  return {
    id: SIKESRA_ADMIN_PLUGIN_ID,
    version: "0.1.0",
    format: "native",
    entrypoint: "/src/plugins/sikesra-admin/index.mjs",
    adminEntry: "/src/plugins/sikesra-admin/index.mjs",
    permissions: SIKESRA_ADMIN_PERMISSIONS,
    adminPages: SIKESRA_ADMIN_PAGES,
  };
}
