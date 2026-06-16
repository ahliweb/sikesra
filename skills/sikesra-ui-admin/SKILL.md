# Skill: sikesra-ui-admin

Use this skill when implementing admin UI components, pages, or interactions for the SIKESRA plugin.

---

## 1. Quick Rules (Wajib Diikuti)

```
✅ Kumo ONLY — import dari @cloudflare/kumo
✅ Lingui i18n — t`...` atau <Trans>
✅ Logical Tailwind — ms-* me-* ps-* pe-* start-* end-*
✅ Kumo semantic tokens — bg-kumo-* text-kumo-*
❌ TIDAK boleh: ml-* mr-* pl-* pr-* left-* right-*
❌ TIDAK boleh: dark: prefix
❌ TIDAK boleh: hard-coded string di JSX
❌ TIDAK boleh: HTML native button/input/select/dialog (pakai Kumo)
```

## 2. Import Template

```typescript
// Kumo components
import { Badge, Button, Dialog, Input, InputArea, Loader, Select, Switch, Tooltip } from "@cloudflare/kumo"

// Lingui i18n
import { useLingui } from "@lingui/react/macro"
import { Trans } from "@lingui/react/macro"
import { msg } from "@lingui/core/macro"
import type { MessageDescriptor } from "@lingui/core"

// React
import * as React from "react"
import { useState, useEffect, useCallback } from "react"

// Plugin utils
import { apiFetch, getErrorMessage, parseApiResponse } from "emdash/plugin-utils"

// Plugin constants/types
import { AWCMS_SIKESRA_MANIFEST } from "./runtime.js"
import { SIKESRA_REFERENCE_FIXTURES } from "./fixtures.js"
import type { SikesraUserLevel, SikesraSensitivity } from "./fixtures.js"
```

## 3. Component Pattern

```tsx
function RegistryList() {
  const { t } = useLingui()
  const [items, setItems] = useState<RegistryEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/_emdash/api/plugins/awcms-sikesra/registry")
        const json = await parseApiResponse<{ items: RegistryEntity[] }>(res)
        setItems(json.data.items)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (items.length === 0) return (
    <EmptyState
      title={t`Belum ada entitas`}
      description={t`Tambahkan entitas pertama Anda.`}
    />
  )

  return (
    <div className="flex flex-col gap-2">
      {items.map(item => (
        <RegistryRow key={item.id} entity={item} />
      ))}
    </div>
  )
}
```

## 4. Kumo Components Cheat Sheet

```tsx
// Button variants
<Button variant="primary">{t`Simpan`}</Button>
<Button variant="secondary">{t`Batal`}</Button>
<Button variant="ghost" shape="square" icon={TrashIcon} aria-label={t`Hapus`} />
<Button variant="primary" loading={mutation.isPending}>{t`Memproses...`}</Button>

// Input
<Input label={t`Nama Entitas`} placeholder={t`Masukkan nama`} required />
<InputArea label={t`Catatan`} rows={4} />

// Select
<Select label={t`Tipe Entitas`}>
  <option value="rumah_ibadah">{t`Rumah Ibadah`}</option>
  <option value="lembaga_keagamaan">{t`Lembaga Keagamaan`}</option>
</Select>

// Badge
<Badge variant="success">{t`Terverifikasi`}</Badge>
<Badge variant="warning">{t`Pending`}</Badge>
<Badge variant="danger">{t`Ditolak`}</Badge>
<Badge variant="info">{t`Draft`}</Badge>

// Dialog (confirm dialog)
<Dialog open={isOpen} onClose={() => setIsOpen(false)}>
  <Dialog.Panel>
    <Dialog.Title>{t`Konfirmasi Hapus`}</Dialog.Title>
    <p><Trans>Yakin ingin menghapus <strong>{entityName}</strong>?</Trans></p>
    <div className="flex gap-2 justify-end mt-4">
      <Button variant="secondary" onClick={() => setIsOpen(false)}>{t`Batal`}</Button>
      <Button variant="primary" onClick={handleDelete} loading={deleting}>{t`Hapus`}</Button>
    </div>
  </Dialog.Panel>
</Dialog>

// Loader
<Loader />

// Switch (toggle)
<Switch
  checked={settings.sikesraPublicEnabled}
  onChange={(checked) => updateSetting("sikesraPublicEnabled", checked)}
  label={t`Aktifkan halaman publik`}
/>
```

## 5. EntityTypePill Component

```tsx
const ENTITY_TYPE_META: Record<string, { emoji: string; variant: BadgeVariant }> = {
  rumah_ibadah:         { emoji: "🕌", variant: "info" },
  lembaga_keagamaan:    { emoji: "🏛️", variant: "secondary" },
  pendidikan_keagamaan: { emoji: "📚", variant: "success" },
  lks:                  { emoji: "🤝", variant: "info" },
  guru_agama:           { emoji: "👨‍🏫", variant: "warning" },
  anak_yatim:           { emoji: "🧒", variant: "danger" },
  disabilitas:          { emoji: "♿", variant: "secondary" },
  lansia_terlantar:     { emoji: "👴", variant: "warning" },
}

function EntityTypePill({ entityType }: { entityType: string }) {
  const { t } = useLingui()
  const meta = ENTITY_TYPE_META[entityType] ?? { emoji: "📋", variant: "info" as const }
  const label = ENTITY_TYPE_LABELS[entityType as keyof typeof ENTITY_TYPE_LABELS] ?? entityType
  return (
    <Badge variant={meta.variant}>
      {meta.emoji} {label}
    </Badge>
  )
}
```

## 6. SensitivityBadge Component

```tsx
const SENSITIVITY_VARIANTS: Record<SikesraSensitivity, BadgeVariant> = {
  public_safe: "success",
  internal: "info",
  restricted: "warning",
  highly_restricted: "danger",
}

const SENSITIVITY_LABELS: Record<SikesraSensitivity, MessageDescriptor> = {
  public_safe: msg`Publik Aman`,
  internal: msg`Internal`,
  restricted: msg`Terbatas`,
  highly_restricted: msg`Sangat Terbatas`,
}

function SensitivityBadge({ sensitivity }: { sensitivity: SikesraSensitivity }) {
  const { t } = useLingui()
  return (
    <Badge variant={SENSITIVITY_VARIANTS[sensitivity]}>
      {t(SENSITIVITY_LABELS[sensitivity])}
    </Badge>
  )
}
```

## 7. RegionSelector Component

```tsx
function RegionSelector({
  value,
  onChange,
  regionTree,
}: {
  value: { provinceCode?: string; regencyCode?: string; districtCode?: string; villageCode?: string }
  onChange: (v: typeof value) => void
  regionTree: AdministrativeProvince[]
}) {
  const { t } = useLingui()

  const selectedProvince = regionTree.find(p => p.code === value.provinceCode)
  const selectedRegency = selectedProvince?.regencies.find(r => r.code === value.regencyCode)
  const selectedDistrict = selectedRegency?.districts.find(d => d.code === value.districtCode)

  return (
    <div className="grid grid-cols-2 gap-4">
      <Select
        label={t`Provinsi`}
        value={value.provinceCode ?? ""}
        onChange={e => onChange({ provinceCode: e.target.value })}
        required
      >
        <option value="">{t`-- Pilih Provinsi --`}</option>
        {regionTree.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
      </Select>

      <Select
        label={t`Kabupaten/Kota`}
        value={value.regencyCode ?? ""}
        onChange={e => onChange({ ...value, regencyCode: e.target.value, districtCode: undefined, villageCode: undefined })}
        disabled={!value.provinceCode}
        required
      >
        <option value="">{t`-- Pilih Kabupaten --`}</option>
        {selectedProvince?.regencies.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
      </Select>

      <Select
        label={t`Kecamatan`}
        value={value.districtCode ?? ""}
        onChange={e => onChange({ ...value, districtCode: e.target.value, villageCode: undefined })}
        disabled={!value.regencyCode}
        required
      >
        <option value="">{t`-- Pilih Kecamatan --`}</option>
        {selectedRegency?.districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
      </Select>

      <Select
        label={t`Desa/Kelurahan`}
        value={value.villageCode ?? ""}
        onChange={e => onChange({ ...value, villageCode: e.target.value })}
        disabled={!value.districtCode}
        required
      >
        <option value="">{t`-- Pilih Desa --`}</option>
        {selectedDistrict?.villages.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
      </Select>
    </div>
  )
}
```

## 8. VerificationStepper Component

```tsx
const STAGE_LABELS: Record<string, MessageDescriptor> = {
  draft: msg`Draft`,
  submitted_village: msg`Diajukan ke Desa`,
  verified_village: msg`Terverifikasi Desa`,
  submitted_district: msg`Diajukan ke Kecamatan`,
  verified_district: msg`Terverifikasi Kecamatan`,
  submitted_sopd: msg`Diajukan ke SOPD`,
  verified_sopd: msg`Terverifikasi SOPD`,
  submitted_regency: msg`Diajukan ke Kabupaten`,
  active_verified: msg`Aktif Terverifikasi`,
}

const ALL_STAGES = Object.keys(STAGE_LABELS)

function VerificationStepper({ currentStage }: { currentStage: string }) {
  const { t } = useLingui()
  const currentIdx = ALL_STAGES.indexOf(currentStage)

  return (
    <div className="flex flex-col gap-1">
      {ALL_STAGES.map((stage, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx
        const isFuture = idx > currentIdx

        return (
          <div key={stage} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              isCurrent ? "bg-kumo-brand" :
              isPast ? "bg-kumo-success" : "bg-kumo-muted"
            }`} />
            <span className={`text-sm ${
              isCurrent ? "text-kumo-brand font-medium" :
              isPast ? "text-kumo-success" : "text-kumo-subtle"
            }`}>
              {t(STAGE_LABELS[stage]!)}
            </span>
            {isCurrent && <Badge variant="info" className="ms-auto">{t`Saat Ini`}</Badge>}
          </div>
        )
      })}
    </div>
  )
}
```

## 9. API Fetch Pattern

```typescript
// GET request
async function fetchRegistry(params: Record<string, string>) {
  const url = new URL("/_emdash/api/plugins/awcms-sikesra/registry", location.origin)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await apiFetch(url.toString())
  if (!res.ok) {
    const data = await res.json() as { error: { message: string } }
    throw new Error(data.error.message)
  }
  return res.json() as Promise<{ data: { items: RegistryEntity[]; nextCursor?: string } }>
}

// POST request (state-changing — perlu X-EmDash-Request: 1)
async function createEntity(body: CreateEntityInput) {
  const res = await apiFetch("/_emdash/api/plugins/awcms-sikesra/registry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EmDash-Request": "1",  // WAJIB untuk POST/PUT/DELETE
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json() as { error: { message: string } }
    throw new Error(data.error.message)
  }
  return res.json() as Promise<{ data: RegistryEntity }>
}
```

## 10. Cek Kumo Components

```bash
# Sebelum pakai komponen baru, cek API-nya:
npx @cloudflare/kumo doc Button
npx @cloudflare/kumo doc Select
npx @cloudflare/kumo doc Dialog
npx @cloudflare/kumo ls  # list semua available components
```
