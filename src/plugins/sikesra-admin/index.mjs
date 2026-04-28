export const SIKESRA_ADMIN_PLUGIN_ID = "sikesra-admin";

export const SIKESRA_ADMIN_SHELL_SECTION_KEYS = Object.freeze({
  overview: "overview",
  content: "content",
  operations: "operations",
  manage: "manage",
  administration: "administration",
});

export const SIKESRA_ADMIN_SHELL_SECTIONS = [
  { key: SIKESRA_ADMIN_SHELL_SECTION_KEYS.overview, label: "Ringkasan" },
  { key: SIKESRA_ADMIN_SHELL_SECTION_KEYS.content, label: "Konten" },
  { key: SIKESRA_ADMIN_SHELL_SECTION_KEYS.operations, label: "Layanan SIKESRA" },
  { key: SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage, label: "Kelola" },
  { key: SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration, label: "Administrasi" },
];

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
  {
    code: "emdash.pages.read",
    label: "Lihat Halaman EmDash",
    description: "Mengakses daftar dan detail halaman konten EmDash di shell admin terpadu.",
  },
  {
    code: "emdash.posts.read",
    label: "Lihat Post EmDash",
    description: "Mengakses daftar dan detail post EmDash di shell admin terpadu.",
  },
  {
    code: "emdash.media.read",
    label: "Lihat Media EmDash",
    description: "Mengakses daftar aset media EmDash melalui alur backend yang ditinjau.",
  },
  {
    code: "emdash.comments.read",
    label: "Lihat Komentar EmDash",
    description: "Mengakses daftar komentar untuk moderasi konten pada shell admin terpadu.",
  },
  {
    code: "emdash.menus.read",
    label: "Lihat Menu EmDash",
    description: "Mengakses struktur menu konten EmDash yang dikelola secara terpusat.",
  },
  {
    code: "emdash.redirects.read",
    label: "Lihat Redirect EmDash",
    description: "Mengakses daftar redirect konten EmDash sesuai kontrol akses.",
  },
  {
    code: "emdash.widgets.read",
    label: "Lihat Widget EmDash",
    description: "Mengakses widget presentasi konten EmDash pada shell admin yang sama.",
  },
  {
    code: "emdash.sections.read",
    label: "Lihat Section EmDash",
    description: "Mengakses section konten EmDash untuk pengelolaan struktur halaman.",
  },
  {
    code: "emdash.categories.read",
    label: "Lihat Kategori EmDash",
    description: "Mengakses kategori konten EmDash pada shell admin terpadu.",
  },
  {
    code: "emdash.tags.read",
    label: "Lihat Tag EmDash",
    description: "Mengakses tag konten EmDash dengan visibilitas berbasis izin.",
  },
  {
    code: "emdash.bylines.read",
    label: "Lihat Bylines EmDash",
    description: "Mengakses bylines konten EmDash untuk atribut editorial terkontrol.",
  },
  {
    code: "emdash.content_types.read",
    label: "Lihat Content Types EmDash",
    description: "Mengakses konfigurasi tipe konten EmDash pada shell admin terpadu.",
  },
  {
    code: "emdash.users.read",
    label: "Lihat Pengguna EmDash",
    description: "Mengakses manajemen pengguna EmDash sesuai kontrol akses yang ditinjau.",
  },
  {
    code: "emdash.plugins.read",
    label: "Lihat Plugin EmDash",
    description: "Mengakses daftar plugin EmDash yang tersedia pada lingkungan terkelola.",
  },
  {
    code: "emdash.import.read",
    label: "Lihat Import EmDash",
    description: "Mengakses alur import EmDash yang terpisah dari import SIKESRA domain data.",
  },
  {
    code: "emdash.settings.read",
    label: "Lihat Pengaturan EmDash",
    description: "Mengakses pengaturan inti EmDash tanpa menggantikan pengaturan SIKESRA spesifik.",
  },
];

const SIKESRA_MENU_GROUP = "SIKESRA";

export const SIKESRA_ADMIN_PAGES = [
  page(
    "/",
    "Dashboard SIKESRA",
    "layout-dashboard",
    "sikesra.dashboard.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.overview,
  ),
  page(
    "/pages",
    "Pages",
    "file-text",
    "emdash.pages.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.content,
  ),
  page(
    "/posts",
    "Posts",
    "square-pen",
    "emdash.posts.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.content,
  ),
  page(
    "/media",
    "Media",
    "image",
    "emdash.media.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.content,
  ),
  page(
    "/comments",
    "Comments",
    "message-square",
    "emdash.comments.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/menus",
    "Menus",
    "list-tree",
    "emdash.menus.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/redirects",
    "Redirects",
    "route",
    "emdash.redirects.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/widgets",
    "Widgets",
    "layout-grid",
    "emdash.widgets.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/sections",
    "Sections",
    "rows-3",
    "emdash.sections.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/categories",
    "Categories",
    "folder-tree",
    "emdash.categories.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/tags",
    "Tags",
    "tags",
    "emdash.tags.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/bylines",
    "Bylines",
    "signature",
    "emdash.bylines.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.manage,
  ),
  page(
    "/content-types",
    "Content Types",
    "shapes",
    "emdash.content_types.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
  page(
    "/users",
    "Users",
    "users-round",
    "emdash.users.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
  page(
    "/plugins",
    "Plugins",
    "puzzle",
    "emdash.plugins.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
  page(
    "/import",
    "Import",
    "database-backup",
    "emdash.import.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
  page(
    "/core-settings",
    "Core Settings",
    "sliders-horizontal",
    "emdash.settings.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
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
  page(
    "/references",
    "Wilayah & Kodefikasi",
    "map",
    "sikesra.reference.manage",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
  page(
    "/audit",
    "Audit Log",
    "clipboard-list",
    "sikesra.audit.read",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
  page(
    "/access",
    "Pengguna & Akses",
    "shield-check",
    "sikesra.access.manage",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
  page(
    "/settings",
    "Pengaturan",
    "settings",
    "sikesra.settings.manage",
    [],
    SIKESRA_ADMIN_SHELL_SECTION_KEYS.administration,
  ),
];

export const SIKESRA_ADMIN_ROUTE_PLACEHOLDERS = flattenPages(SIKESRA_ADMIN_PAGES).map((page) => ({
  path: page.path,
  label: page.label,
  permissionCode: page.permissionCode,
  status: "placeholder",
  implementationIssue: "ahliweb/sikesra#13",
}));

function page(path, label, icon, permissionCode, children = [], sectionKey = SIKESRA_ADMIN_SHELL_SECTION_KEYS.operations) {
  return {
    path,
    label,
    icon,
    group: SIKESRA_MENU_GROUP,
    sectionKey,
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
    routePlaceholders: SIKESRA_ADMIN_ROUTE_PLACEHOLDERS,
  };
}

export function flattenSikesraAdminPages(pages = SIKESRA_ADMIN_PAGES) {
  return flattenPages(pages);
}

export function filterSikesraAdminPagesByPermissions(grantedPermissions, pages = SIKESRA_ADMIN_PAGES) {
  const permissionSet = new Set(grantedPermissions ?? []);

  return pages
    .map((item) => {
      const children = filterSikesraAdminPagesByPermissions(permissionSet, item.children ?? []);
      const allowed = permissionSet.has(item.permissionCode) || children.length > 0;
      if (!allowed) return null;
      return { ...item, children };
    })
    .filter(Boolean);
}

export function createSikesraAdminShellNavigation(input = {}) {
  const currentPath = normalizeCurrentPath(input.currentPath ?? "/");
  const visiblePages = filterSikesraAdminPagesByPermissions(input.grantedPermissions ?? [], input.pages ?? SIKESRA_ADMIN_PAGES);

  const sections = SIKESRA_ADMIN_SHELL_SECTIONS.map((section) => {
    const items = visiblePages
      .filter((page) => page.sectionKey === section.key)
      .map((page) => createNavigationItem(page, currentPath));
    const hasSelectedChild = items.some((item) => item.selected || item.expanded);

    return {
      ...section,
      items,
      selected: hasSelectedChild,
      expanded: hasSelectedChild,
    };
  }).filter((section) => section.items.length > 0);

  return {
    currentPath,
    sections,
    activeItem: findActiveItem(sections),
    hasNavigation: sections.length > 0,
  };
}

function createNavigationItem(page, currentPath) {
  const children = (page.children ?? []).map((child) => createNavigationItem(child, currentPath));
  const childSelected = children.some((child) => child.selected || child.expanded);
  const selected = matchesPath(currentPath, page.path) || childSelected;

  return {
    path: page.path,
    label: page.label,
    icon: page.icon,
    permissionCode: page.permissionCode,
    sectionKey: page.sectionKey,
    selected,
    expanded: childSelected,
    children,
  };
}

function findActiveItem(sections) {
  for (const section of sections) {
    for (const item of flattenNavigationItems(section.items)) {
      if (item.selected && item.children.length === 0) return item;
    }

    for (const item of flattenNavigationItems(section.items)) {
      if (item.selected) return item;
    }
  }

  return null;
}

function flattenNavigationItems(items) {
  return items.flatMap((item) => [item, ...flattenNavigationItems(item.children ?? [])]);
}

function matchesPath(currentPath, pagePath) {
  if (pagePath === "/") return currentPath === "/";
  return currentPath === pagePath || currentPath.startsWith(`${pagePath}/`);
}

function normalizeCurrentPath(value) {
  if (typeof value !== "string" || value.trim().length === 0) return "/";
  if (value === "/") return "/";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function flattenPages(pages) {
  return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}
