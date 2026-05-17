# Operator Workflow

This document describes the current operator-facing SIKESRA admin workflow implemented in `packages/plugins/sikesra/`.

## Scope

Current admin route surface:

- `/_emdash/admin/plugins/sikesra/entities`
- `/_emdash/admin/plugins/sikesra/verification`
- `/_emdash/admin/plugins/sikesra/operations`

Current wizard implementation is block-based and progressive. It is implementation-aligned, not an aspirational redesign.

## 8 Data Modules

| Code | Module | Entity Kind | Initial Subtypes | Minimum Required Detail Fields |
| --- | --- | --- | --- | --- |
| `01` | Rumah Ibadah | `building` | Masjid, Musholla, Surau, Gereja, Pura, Wihara, Klenteng, Lainnya | `jenis_rumah_ibadah` |
| `02` | Lembaga Keagamaan | `institution` | Islam, Kristen, Katolik, Hindu, Buddha, Konghucu, Lainnya | `agama` |
| `03` | Pendidikan Keagamaan | `institution` | TPA/TPQ, Pondok Pesantren, Lainnya | `jenis_pendidikan` |
| `04` | LKS / Lembaga Kesejahteraan Sosial | `institution` | BAZNAS, PWRI, Panti Asuhan, Panti Yatim, Panti Jompo, Rukun Kematian, Majelis Taklim, LKS Lainnya | `jenis_lks` |
| `05` | Guru Agama | `person` | Rumahan, Lembaga, Lainnya | `person_profile_id`, `agama`, `status_guru`, `institusi_pengajaran` |
| `06` | Anak Yatim | `person` | Yatim, Piatu, Yatim Piatu | `person_profile_id`, `kategori_anak`, `hubungan_wali` |
| `07` | Disabilitas | `person` | Fisik, Intelektual, Mental, Sensorik | `person_profile_id`, `jenis_disabilitas`, `tingkat_keparahan` |
| `08` | Lansia Terlantar | `person` | Terlantar, Rawan Terlantar, Mandiri dengan Risiko | `person_profile_id`, `status_keterlantaran`, `kondisi_tempat_tinggal` |

Source of truth:

- `packages/plugins/sikesra/src/module-ui-config.ts`
- `packages/plugins/sikesra/src/detail-modules.ts`

## Current Wizard Steps

The current operator flow is:

1. Pilih modul data SIKESRA.
2. Pilih subjenis yang sesuai dengan modul.
3. Isi identitas dasar dan desa/kelurahan.
4. Simpan draft.
5. Lengkapi detail modul.
6. Catat dokumen pendukung.
7. Jalankan validasi dan review duplikat.
8. Review ringkasan lalu ajukan verifikasi.

Current block wizard markers shown in the UI:

- `1. Jenis Data`
- `2. Wilayah`
- `3. Detail Modul`
- `4. Dokumen`
- `5. Validasi`
- `6. Review`
- `7. Submit`

## Create Draft Behavior

Current create flow no longer asks operators to type raw module codes without context.

Implemented now:

- module names are shown with readable labels
- subtype selection is validated against the selected module
- entity kind is derived from module metadata, not typed by operator
- official village remains a select

Current guardrail:

- mismatched module/subtype pairs are blocked in the admin flow and backend normalization path

## Person Profile Workflow

For person-based modules (`05` to `08`), the current implementation now uses a clearer interim workflow.

Implemented now:

- operator sees a readable `Profil Orang` label
- helper text explains that the current path links an existing profile ID only
- the referenced `person_profile_id` must exist in the current tenant/site
- sensitive identity values remain server-side masked in normal views

Remaining gap:

- no full search/create person-profile UI yet

## Document Workflow

Current implemented document behavior is intentionally honest about shell limitations.

Implemented now:

- operator no longer types MIME type manually
- file size is derived from payload when `contentBase64` is provided
- direct shell path can complete upload metadata and file content together
- when binary upload is unavailable in the shell, the UI returns a resumable handoff with:
  - `entityId`
  - `fileObjectId`
  - `/_emdash/api/plugins/sikesra/v1/documents/complete`

Current limitation:

- block UI shell still does not provide a native binary file picker/upload control
- resumable handoff requires an upload-capable client/API caller

## Validation and Duplicate Review

Current validation behavior:

- validation errors are grouped by section
- field labels are shown in readable Indonesian labels where metadata exists
- duplicate preview is shown from `awcms_sikesra_duplicate_candidates`

Current submit gate:

- submit is blocked when required validation still fails
- submit is blocked when live `high` or `blocking` duplicate candidates remain
- blocked submit attempts are audited

Current next-action guidance in review/submit:

- complete missing required sections
- inspect duplicate candidates
- upload supporting documents if SOP requires them
- submit only when readiness passes

## Security and Privacy Rules

Operators and implementers must keep these rules intact:

- never trust frontend-supplied tenant, site, role, permission, or region scope
- all normal queries must enforce tenant/site/deleted guards
- duplicate preview must not expose protected details unsafely
- raw R2 keys and private file URLs must not be shown in unsafe UI
- blocked or sensitive actions should remain audited

## Merged Slices

The current operator flow reflects the merged work from these completed slices:

1. UI metadata coverage for all 8 modules
2. Safe module/subtype pairing during create flow
3. Submit gating for invalid and live high-risk duplicate records
4. Guided document-step handoff and direct-content completion path
5. Dedicated `Profil Orang` workflow guidance for person-based modules

## Manual Operator Checks

Minimum manual checks for current wizard behavior:

1. Open `/_emdash/admin/plugins/sikesra/entities`.
2. Start create flow and verify all 8 modules appear.
3. Choose a module and verify subtype mismatch is rejected.
4. Create a valid draft and complete required detail fields.
5. Open documents and verify MIME/size are no longer typed manually.
6. Run validation and confirm readable section labels appear.
7. Seed or simulate a high-risk duplicate and verify submit is blocked.
8. Verify review screen shows the next recommended action.

## Validation Commands

Targeted package checks for the current implementation:

```bash
cd packages/plugins/sikesra
pnpm typecheck
pnpm test -- --runInBand
```

Workspace baseline note:

- root `pnpm --silent lint:quick` currently fails from repository-wide oxlint config
- root `pnpm typecheck` currently fails outside SIKESRA in `packages/contentful-to-portable-text`
- root `pnpm test` currently fails outside SIKESRA in `packages/marketplace`
