# SIKESRA

SIKESRA (Sistem Informasi Kesejahteraan Rakyat) adalah modul/plugin native AWCMS-Micro dan EmDash untuk registri data kesejahteraan, keagamaan, lembaga, warga rentan, dokumen, verifikasi, impor, laporan, dan agregasi publik yang aman.

## Ringkasan

- Public page: `/sikesra`
- Admin UI: `/_emdash/admin/plugins/sikesra/*`
- Admin API: `/_emdash/api/plugins/sikesra/v1/*`
- Fokus: data operasional terstruktur, aman, dan terverifikasi
- Target: pemerintah daerah, petugas input, verifikator, auditor, dan pembaca agregat publik

## Fitur Utama

- Wizard input bertahap dengan autosave dan validasi
- ID stabil `sikesra_id_20`
- Verifikasi berjenjang desa, kecamatan, kabupaten/OPD
- Manajemen dokumen dengan metadata D1 dan file R2
- Import Excel melalui staging, mapping, validasi, deduplikasi, lalu promosi
- Export dan laporan dengan kontrol sensitivitas data
- RBAC, ABAC, masking, audit trail, dan pembatasan data publik

## Data Publik

Halaman publik `/sikesra` hanya boleh menampilkan data agregat yang aman. Data individual sensitif, dokumen mentah, dan detail terlindungi tidak boleh diekspos.

## Arsitektur

SIKESRA dibangun sebagai plugin/modul modular, bukan fork EmDash core. Penyimpanan utama memakai D1, file memakai R2, dan seluruh tabel fisik memakai prefix `awcms_sikesra_*`.

## Dokumentasi

- [docs/sikesra/README.md](docs/sikesra/README.md)
- [docs/sikesra/01_product_requirements.md](docs/sikesra/01_product_requirements.md)
- [docs/sikesra/02_architecture.md](docs/sikesra/02_architecture.md)
- [docs/sikesra/03_data_model.md](docs/sikesra/03_data_model.md)
- [docs/sikesra/06_security_rbac_abac.md](docs/sikesra/06_security_rbac_abac.md)

## Pengembangan

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk alur kontribusi, testing, dan aturan kerja repo.
