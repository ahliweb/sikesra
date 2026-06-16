# SIKESRA Plugin Admin UI — Rincian Redesign

**Status:** In Progress  
**Date:** 2026-05-28  
**Scope:** `src/admin.tsx`

## Ringkasan

Dokumen ini mencatat rincian teknis perubahan UI yang dilakukan pada plugin SIKESRA sebagai bagian dari sesi pengembangan. Perubahan ini murni kosmetik/UX, tidak mengubah logika bisnis.

## Perubahan yang Direncanakan

### 1. Shared Components

#### `PageHeader`
- Tambah gradient accent bar di bagian atas
- Eyebrow badge dengan styling yang lebih menonjol
- Layout action slot yang lebih baik di mobile dan desktop

#### `Card`
- Prop `icon` opsional untuk header section
- Header section spacing yang lebih baik

#### `MetricCard`
- Prop `icon` dengan dukungan SVG
- Display nilai yang lebih besar
- Hint text yang lebih informatif

#### `Pill` / `EntityTypePill`
- Komponen baru yang memetakan tipe entitas ke warna unik
- Ikon emoji per tipe entitas

#### `Field`
- Tanda asterisk `*` untuk field required
- Styling hint yang lebih baik

#### `LoadingState`
- Spinner animasi menggantikan teks polos

#### `EmptyState`
- Ikon terpusat
- Layout teks yang lebih engaging

#### `ErrorState`
- Visual yang lebih baik dengan ikon

#### `Feedback`
- Prefix ikon (✓ atau ✗)

#### `SectionDivider` (Baru)
- Komponen baru untuk pemisahan seksi dalam card

### 2. OverviewPage

- Kartu metric hero dengan ikon tipe entitas
- Kartu modul dashboard: lebih besar, dengan ikon, titik status berwarna
- Recent events: timeline-style list
- Form konfigurasi: layout dua kolom dengan field group

### 3. RegistryPage

- **Wizard stepper vertikal** menggantikan tombol step horizontal kecil
  - Panel kiri: daftar step dengan nomor dan deskripsi
  - Panel kanan: konten step saat ini
- Daftar registry: row design lebih baik
- Filter bar: layout yang lebih baik

### 4. VerificationPage

- UI approve/reject lebih menonjol
- Kartu status color-coded berdasarkan stage

### 5. DocumentsPage

- Ikon tipe file
- Tampilan metadata lebih baik
- Drag-zone untuk pemilih file

### 6. ReportsPage

- Visual bar untuk total
- Format catatan publik lebih baik

### 7. AuditPage

- Timeline-style dengan ikon kind
- Event berwarna berdasarkan tipe

## Entity Type → Color Mapping

```typescript
const ENTITY_TYPE_COLORS = {
  rumah_ibadah: { icon: "🕌", color: "blue" },
  lembaga_keagamaan: { icon: "🏛️", color: "purple" },
  pendidikan_keagamaan: { icon: "📚", color: "green" },
  lks: { icon: "🤝", color: "teal" },
  guru_agama: { icon: "👨‍🏫", color: "amber" },
  anak_yatim: { icon: "🧒", color: "rose" },
  disabilitas: { icon: "♿", color: "indigo" },
  lansia_terlantar: { icon: "👴", color: "orange" },
};
```

## Catatan Implementasi

- Semua perubahan hanya pada `src/admin.tsx`
- Menggunakan Kumo design token system (`kumo-*` classes)
- Ikon inline SVG dan emoji untuk penanda visual
- Tidak ada perubahan pada routing, API, permissions, atau business logic

## Status Verifikasi

- [ ] TypeScript typecheck lulus (`pnpm --filter @ahliweb/awcms-sikesra typecheck`)
- [ ] Build berhasil (`pnpm --filter @ahliweb/awcms-sikesra build`)  
- [ ] Tests lulus (`pnpm --filter @ahliweb/awcms-sikesra test`)
- [ ] Visual review: Overview page
- [ ] Visual review: Registry page (wizard)
- [ ] Visual review: Verification page
- [ ] Visual review: Documents page
