// SIKESRA Admin Entry Point
// React components for plugin admin pages
// Source: Issue #204

import { PermissionRegistryPage } from "./components/PermissionRegistryPage";
import { DashboardPage } from "./components/DashboardPage";
import { PlaceholderPage } from "./components/PlaceholderPage";

export const pages = {
  "/": DashboardPage,
  "/entities": () => <PlaceholderPage title="Data Utama" description="Manajemen entitas data kesejahteraan rakyat." />,
  "/entities/new": () => <PlaceholderPage title="Buat Draft Baru" description="Formulir pembuatan entitas baru." />,
  "/verification": () => <PlaceholderPage title="Verifikasi" description="Antrian verifikasi entitas." />,
  "/imports": () => <PlaceholderPage title="Import Excel" description="Import data dari file Excel atau CSV." />,
  "/documents": () => <PlaceholderPage title="Dokumen" description="Manajemen dokumen pendukung." />,
  "/reports": () => <PlaceholderPage title="Laporan" description="Laporan dan analitik data." />,
  "/regions": () => <PlaceholderPage title="Wilayah" description="Manajemen wilayah resmi dan lokal." />,
  "/access": () => <PlaceholderPage title="Atribut & Akses" description="Konfigurasi ABAC dan atribut akses." />,
  "/audit": () => <PlaceholderPage title="Audit" description="Log audit aktivitas sistem." />,
  "/settings": () => <PlaceholderPage title="Pengaturan" description="Pengaturan sistem SIKESRA." />,
  "/permissions": PermissionRegistryPage,
};

export const widgets = {};
