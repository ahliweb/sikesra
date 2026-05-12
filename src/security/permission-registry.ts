// SIKESRA Permission Registry Adapter
// Exports SIKESRA permission catalog in EmDash-compatible format
// Source: docs/sikesra/06_security_rbac_abac.md, Issue #187

import { SIKESRA_PERMISSIONS, SIKESRA_PERMISSION_LIST } from "../security/permissions";

export interface PermissionRegistryEntry {
  id: string;
  displayName: string;
  description: string;
  resourceGroup: string;
  riskLevel: "standard" | "high";
}

export interface PermissionRegistry {
  pluginId: string;
  permissions: PermissionRegistryEntry[];
}

const PERMISSION_METADATA: Record<string, { displayName: string; description: string; resourceGroup: string; riskLevel: "standard" | "high" }> = {
  // Dashboard
  "awcms:sikesra:dashboard:read": {
    displayName: "Baca Dashboard",
    description: "Akses untuk melihat dashboard SIKESRA dan ringkasan data.",
    resourceGroup: "dashboard",
    riskLevel: "standard",
  },

  // Entity
  "awcms:sikesra:entity:read": {
    displayName: "Baca Entitas",
    description: "Akses untuk melihat daftar dan detail entitas.",
    resourceGroup: "entity",
    riskLevel: "standard",
  },
  "awcms:sikesra:entity:create": {
    displayName: "Buat Entitas",
    description: "Akses untuk membuat entitas baru.",
    resourceGroup: "entity",
    riskLevel: "standard",
  },
  "awcms:sikesra:entity:update": {
    displayName: "Ubah Entitas",
    description: "Akses untuk mengubah data entitas yang ada.",
    resourceGroup: "entity",
    riskLevel: "standard",
  },
  "awcms:sikesra:entity:delete": {
    displayName: "Hapus Entitas",
    description: "Akses untuk menghapus entitas (soft delete). Memerlukan alasan.",
    resourceGroup: "entity",
    riskLevel: "high",
  },
  "awcms:sikesra:entity:restore": {
    displayName: "Pulihkan Entitas",
    description: "Akses untuk memulihkan entitas yang dihapus. Memerlukan alasan.",
    resourceGroup: "entity",
    riskLevel: "high",
  },

  // Code
  "awcms:sikesra:code:generate": {
    displayName: "Generate ID SIKESRA",
    description: "Akses untuk menghasilkan ID SIKESRA baru.",
    resourceGroup: "code",
    riskLevel: "standard",
  },
  "awcms:sikesra:code:correct": {
    displayName: "Koreksi ID SIKESRA",
    description: "Akses untuk mengoreksi ID SIKESRA yang salah. Memerlukan alasan.",
    resourceGroup: "code",
    riskLevel: "high",
  },

  // Verification
  "awcms:sikesra:verification:submit": {
    displayName: "Submit Verifikasi",
    description: "Akses untuk submit entitas ke antrian verifikasi.",
    resourceGroup: "verification",
    riskLevel: "standard",
  },
  "awcms:sikesra:verification:verify": {
    displayName: "Verifikasi Entitas",
    description: "Akses untuk memverifikasi atau merevisi entitas dalam antrian.",
    resourceGroup: "verification",
    riskLevel: "high",
  },

  // Document
  "awcms:sikesra:document:upload": {
    displayName: "Upload Dokumen",
    description: "Akses untuk mengupload dokumen pendukung entitas.",
    resourceGroup: "document",
    riskLevel: "standard",
  },
  "awcms:sikesra:document:private_download": {
    displayName: "Download Dokumen Privat",
    description: "Akses untuk mengunduh dokumen dengan klasifikasi terbatas.",
    resourceGroup: "document",
    riskLevel: "high",
  },
  "awcms:sikesra:document:verify": {
    displayName: "Verifikasi Dokumen",
    description: "Akses untuk memverifikasi atau menolak dokumen.",
    resourceGroup: "document",
    riskLevel: "standard",
  },
  "awcms:sikesra:document:replace": {
    displayName: "Ganti Dokumen",
    description: "Akses untuk mengganti dokumen yang sudah ada.",
    resourceGroup: "document",
    riskLevel: "standard",
  },

  // Import
  "awcms:sikesra:import:create": {
    displayName: "Buat Import",
    description: "Akses untuk membuat batch import baru dari file Excel/CSV.",
    resourceGroup: "import",
    riskLevel: "standard",
  },
  "awcms:sikesra:import:read": {
    displayName: "Baca Import",
    description: "Akses untuk melihat daftar import dan staging rows.",
    resourceGroup: "import",
    riskLevel: "standard",
  },
  "awcms:sikesra:import:promote": {
    displayName: "Promosi Import",
    description: "Akses untuk mempromosikan staging rows ke entitas aktif.",
    resourceGroup: "import",
    riskLevel: "high",
  },

  // Duplicate
  "awcms:sikesra:duplicate:read": {
    displayName: "Baca Duplikat",
    description: "Akses untuk melihat kandidat duplikat entitas.",
    resourceGroup: "duplicate",
    riskLevel: "standard",
  },
  "awcms:sikesra:duplicate:decide": {
    displayName: "Keputusan Duplikat",
    description: "Akses untuk membuat keputusan pada kandidat duplikat.",
    resourceGroup: "duplicate",
    riskLevel: "standard",
  },
  "awcms:sikesra:duplicate:override": {
    displayName: "Override Duplikat",
    description: "Akses untuk mengoverride deteksi duplikat blocking.",
    resourceGroup: "duplicate",
    riskLevel: "high",
  },

  // Completeness
  "awcms:sikesra:completeness:read": {
    displayName: "Baca Kelengkapan",
    description: "Akses untuk melihat status kelengkapan data entitas.",
    resourceGroup: "completeness",
    riskLevel: "standard",
  },

  // Export
  "awcms:sikesra:export:create": {
    displayName: "Buat Export",
    description: "Akses untuk membuat job export data ringkasan.",
    resourceGroup: "export",
    riskLevel: "standard",
  },
  "awcms:sikesra:export:restricted": {
    displayName: "Export Restricted",
    description: "Akses untuk membuat export data terbatas. Memerlukan alasan.",
    resourceGroup: "export",
    riskLevel: "high",
  },
  "awcms:sikesra:export:audit": {
    displayName: "Export Audit",
    description: "Akses untuk membuat export bukti audit.",
    resourceGroup: "export",
    riskLevel: "high",
  },

  // Region
  "awcms:sikesra:region:read": {
    displayName: "Baca Wilayah",
    description: "Akses untuk melihat wilayah resmi dan lokal.",
    resourceGroup: "region",
    riskLevel: "standard",
  },
  "awcms:sikesra:region:manage": {
    displayName: "Kelola Wilayah Lokal",
    description: "Akses untuk menambah, mengubah, atau menghapus wilayah lokal.",
    resourceGroup: "region",
    riskLevel: "standard",
  },

  // Attribute
  "awcms:sikesra:attribute:read": {
    displayName: "Baca Atribut",
    description: "Akses untuk melihat definisi atribut ABAC.",
    resourceGroup: "attribute",
    riskLevel: "standard",
  },
  "awcms:sikesra:attribute:write": {
    displayName: "Ubah Atribut",
    description: "Akses untuk membuat, mengubah, atau menghapus definisi atribut ABAC.",
    resourceGroup: "attribute",
    riskLevel: "high",
  },

  // Policy
  "awcms:sikesra:policy:read": {
    displayName: "Baca Policy ABAC",
    description: "Akses untuk melihat policy ABAC dan preview akses.",
    resourceGroup: "policy",
    riskLevel: "standard",
  },
  "awcms:sikesra:policy:write": {
    displayName: "Ubah Policy ABAC",
    description: "Akses untuk membuat, mengubah, atau menghapus policy ABAC.",
    resourceGroup: "policy",
    riskLevel: "high",
  },
  "awcms:sikesra:policy:preview": {
    displayName: "Preview Policy ABAC",
    description: "Akses untuk menjalankan simulasi evaluasi policy ABAC.",
    resourceGroup: "policy",
    riskLevel: "standard",
  },

  // Audit
  "awcms:sikesra:audit:read": {
    displayName: "Baca Audit",
    description: "Akses untuk melihat log audit SIKESRA.",
    resourceGroup: "audit",
    riskLevel: "standard",
  },
  "awcms:sikesra:audit:export": {
    displayName: "Export Audit",
    description: "Akses untuk mengexport log audit.",
    resourceGroup: "audit",
    riskLevel: "high",
  },

  // Settings
  "awcms:sikesra:settings:read": {
    displayName: "Baca Pengaturan",
    description: "Akses untuk melihat pengaturan SIKESRA.",
    resourceGroup: "settings",
    riskLevel: "standard",
  },
  "awcms:sikesra:settings:update": {
    displayName: "Ubah Pengaturan",
    description: "Akses untuk mengubah pengaturan SIKESRA.",
    resourceGroup: "settings",
    riskLevel: "high",
  },

  // Sensitive
  "awcms:sikesra:sensitive:reveal": {
    displayName: "Reveal Data Sensitif",
    description: "Akses untuk melihat data sensitif yang di-mask (nama, telepon, email, alamat).",
    resourceGroup: "sensitive",
    riskLevel: "high",
  },
  "awcms:sikesra:sensitive:highly_restricted_read": {
    displayName: "Baca Data Sangat Terbatas",
    description: "Akses untuk melihat data sangat terbatas termasuk NIK/KIA asli.",
    resourceGroup: "sensitive",
    riskLevel: "high",
  },

  // Rate Limiting
  "awcms:sikesra:rate_limit:bypass": {
    displayName: "Bypass Rate Limit",
    description: "Akses untuk melewati pembatasan rate limit pada operasi sensitif.",
    resourceGroup: "rate_limit",
    riskLevel: "high",
  },
};

export function getPermissionRegistry(): PermissionRegistry {
  return {
    pluginId: "sikesra",
    permissions: SIKESRA_PERMISSION_LIST.map((permission) => {
      const meta = PERMISSION_METADATA[permission];
      return {
        id: permission,
        displayName: meta?.displayName ?? permission,
        description: meta?.description ?? "",
        resourceGroup: meta?.resourceGroup ?? "other",
        riskLevel: meta?.riskLevel ?? "standard",
      };
    }),
  };
}

export function getPermissionsByResourceGroup(): Record<string, PermissionRegistryEntry[]> {
  const registry = getPermissionRegistry();
  const grouped: Record<string, PermissionRegistryEntry[]> = {};

  for (const permission of registry.permissions) {
    const group = permission.resourceGroup;
    if (!grouped[group]) {
      grouped[group] = [];
    }
    grouped[group].push(permission);
  }

  return grouped;
}

export function getHighRiskPermissions(): PermissionRegistryEntry[] {
  return getPermissionRegistry().permissions.filter((p) => p.riskLevel === "high");
}

export function getStandardPermissions(): PermissionRegistryEntry[] {
  return getPermissionRegistry().permissions.filter((p) => p.riskLevel === "standard");
}
