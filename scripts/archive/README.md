# Archived Scripts — Generasi 1 SIKESRA (Tidak Lagi Berlaku)

Script di direktori ini ditulis untuk implementasi SIKESRA standalone yang **ditinggalkan pada 22 Mei 2026** (commit `b1bb0b15`, "chore: replace repository with latest emdash root") saat repo direstrukturisasi ke layout `emdash-latest/` + `awcmsmicro-dev/` yang dipakai sekarang. Lihat `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8a untuk riwayat lengkap tiga generasi penamaan SIKESRA di repo ini.

## Mengapa Diarsipkan, Bukan Diperbaiki

Setiap script di sini merujuk path atau skema yang **tidak ada lagi**:

| Script | Merujuk (Tidak Ada) | Realita Saat Ini |
| --- | --- | --- |
| `sikesra-d1-overlay.mjs` | Tabel SQL `awcms_sikesra_*`, backup file `update-backup/d1/sikesra_full_*.sql` | Storage via `PluginStorageConfig` collections, lihat `docs/prd/04.DATABASE_SCHEMA.md` |
| `sikesra-seed.mjs` | Direktori `packages/plugins/sikesra/seeds/*.json`, tabel `awcms_sikesra_settings`/`object_types`/`object_subtypes` | Plugin sudah self-seed lewat hook `plugin:install`/`plugin:activate` (`ensureAccessCatalogSeeded()`, `DEFAULT_DATA_TYPES`) — tidak butuh script seed eksternal |
| `sikesra-seed-regions.mjs` | Tabel region D1 dengan kode Kemendagri | Region adalah `DEFAULT_REGION_TREE` statis di kode + override KV `custom:regions`, lihat `docs/prd/21.ADDENDUM_MASTER_DATA_WILAYAH.md` |
| `sikesra-postbuild.mjs` | `infra/sikesra/worker-wrapper-template.mjs` (direktori `infra/` tidak ada), build standalone `dist/server` | Deploy nyata lewat `pnpm wrangler deploy` langsung dari `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare`, tanpa patch postbuild — lihat `.github/workflows/deploy-sikesra.yml` |
| `sikesra-smoke-admin-route.mjs` | Halaman `/entities` (tidak ada di manifest nyata) dan response shape `data.blocks` (konsep page-builder yang tidak dipakai admin SIKESRA) | Halaman admin nyata: `/overview`, `/registry`, `/verification`, dst. — lihat `docs/prd/05.API_CONTRACT.md` §1 |

Menulis ulang script-script ini agar cocok dengan arsitektur collections-based saat ini berarti membangun tooling baru dari nol untuk kebutuhan yang sebagian besar sudah tertangani oleh hook plugin sendiri (seeding) atau tidak relevan lagi (worker wrapper standalone). Ini di luar scope hardening MVP (`docs/prd/02.IMPLEMENTATION_BACKLOG.md` EPIC-H1/H2/H3) — diarsipkan sebagai referensi historis, bukan dihapus, agar jejak desain Generasi 1 tetap bisa ditelusuri.

## Apa yang Tidak Diarsipkan

`scripts/sikesra-verify-access.mjs` **tetap ada** di `scripts/` (tidak diarsipkan) — script ini memverifikasi konfigurasi Cloudflare Access lewat HTTP/API generik, tidak bergantung pada skema storage apa pun. Hanya nilai default hostname-nya yang diperbaiki (dari `sikesrakobar.ahlikoding.com` yang salah menjadi `sikesra.ahlikoding.com` sesuai `wrangler.jsonc` produksi).

`scripts/backup-sikesra-d1.sh` (dipakai `pnpm d1:backup:sikesra`) juga tetap aktif — script ini generik (membaca `sqlite_master` apa adanya), tidak mengasumsikan nama tabel tertentu, jadi tetap valid untuk schema apa pun yang sebenarnya ada di D1 produksi.

## Jangan Jalankan Script di Direktori Ini

Semua script di sini akan gagal (file/tabel yang dirujuk tidak ada) atau — lebih buruk — berhasil menulis ke path/tabel yang salah jika dijalankan ulang secara naif di lingkungan yang sudah memakai arsitektur saat ini.
