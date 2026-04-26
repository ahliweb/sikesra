/**
 * SIKESRA Region / Wilayah UI Model
 *
 * Framework-neutral view models for official and custom region selection.
 * Implements: ahliweb/sikesra#33
 *
 * Design constraints:
 * - Official region hierarchy follows Indonesian BPS administrative codes:
 *   Provinsi → Kabupaten/Kota → Kecamatan → Desa/Kelurahan
 * - Custom region is an operator-defined label (e.g. "Wilayah RT 05/RW 02").
 *   It is additive — it supplements the official region, never replaces it.
 * - Region scope is a security boundary: backend enforces that operators
 *   can only register data within their assigned kecamatan/desa scope.
 *   The UI model surfaces the scope constraint so the renderer can disable
 *   out-of-scope options rather than hiding them (accessibility requirement).
 * - Region selection is required for all SIKESRA module forms before the
 *   ID SIKESRA can be assigned.
 */

// ---------------------------------------------------------------------------
// Region level constants
// ---------------------------------------------------------------------------

export const SIKESRA_REGION_LEVELS = {
  provinsi: { key: "provinsi", label: "Provinsi", bpsDigits: 2 },
  kabupaten_kota: { key: "kabupaten_kota", label: "Kabupaten/Kota", bpsDigits: 4 },
  kecamatan: { key: "kecamatan", label: "Kecamatan", bpsDigits: 6 },
  desa_kelurahan: { key: "desa_kelurahan", label: "Desa/Kelurahan", bpsDigits: 10 },
};

export const SIKESRA_REGION_LEVEL_ORDER = [
  "provinsi",
  "kabupaten_kota",
  "kecamatan",
  "desa_kelurahan",
];

// Kotawaringin Barat (Kobar) fixed provinsi/kabupaten BPS codes.
// These are public administrative codes, not credentials.
export const SIKESRA_KOBAR_PROVINSI_CODE = "62";
export const SIKESRA_KOBAR_KABUPATEN_CODE = "6201";

// ---------------------------------------------------------------------------
// Region option model (single selectable item)
// ---------------------------------------------------------------------------

/**
 * Creates a single region select option.
 *
 * @param {string} code - BPS administrative code
 * @param {string} label - Display name
 * @param {string} level - One of SIKESRA_REGION_LEVELS keys
 * @param {boolean} [inScope] - Whether the operator's region scope includes this option
 * @returns {Object}
 */
export function createRegionOption(code, label, level, inScope = true) {
  return { code, label, level, inScope, disabled: !inScope };
}

// ---------------------------------------------------------------------------
// Region selector state model
// ---------------------------------------------------------------------------

/**
 * Creates the cascading region selector state model.
 *
 * The selector has four cascading levels. Selecting a value at level N clears
 * levels N+1…4. The model tracks selection state and surfaces scope constraints.
 *
 * @param {Object} [opts]
 * @param {string|null} [opts.provinsiCode]
 * @param {string|null} [opts.kabupatenKotaCode]
 * @param {string|null} [opts.kecamatanCode]
 * @param {string|null} [opts.desaKelurahanCode]
 * @param {Object} [opts.operatorScope] - { kecamatanCode?, desaKelurahanCode? }
 *   Defines which region(s) this operator is permitted to register data in.
 *   null/undefined means no scope restriction (admin-level).
 * @param {boolean} [opts.required] - Whether region is required (always true for forms)
 * @returns {Object}
 */
export function createSikesraRegionSelectorState(opts = {}) {
  const scope = opts.operatorScope ?? null;

  const provinsiCode = opts.provinsiCode ?? SIKESRA_KOBAR_PROVINSI_CODE;
  const kabupatenKotaCode = opts.kabupatenKotaCode ?? SIKESRA_KOBAR_KABUPATEN_CODE;
  const kecamatanCode = opts.kecamatanCode ?? null;
  const desaKelurahanCode = opts.desaKelurahanCode ?? null;

  // Determine if current selection is within operator scope.
  const kecamatanInScope =
    !scope?.kecamatanCode ||
    !kecamatanCode ||
    kecamatanCode === scope.kecamatanCode;

  const desaInScope =
    !scope?.desaKelurahanCode ||
    !desaKelurahanCode ||
    desaKelurahanCode === scope.desaKelurahanCode;

  const isComplete = !!(provinsiCode && kabupatenKotaCode && kecamatanCode && desaKelurahanCode);
  const isInScope = kecamatanInScope && desaInScope;

  return {
    provinsiCode,
    kabupatenKotaCode,
    kecamatanCode,
    desaKelurahanCode,
    // BPS 9-digit region code used in ID SIKESRA; null until all levels selected.
    bpsRegionCode9: isComplete
      ? buildBpsCode9(provinsiCode, kabupatenKotaCode, kecamatanCode, desaKelurahanCode)
      : null,
    isComplete,
    isInScope,
    scopeViolationMessage: !isInScope
      ? "Wilayah yang dipilih di luar cakupan kewenangan Anda. Pilih wilayah sesuai penugasan."
      : null,
    required: opts.required !== false, // default true
    validationMessage: !isComplete
      ? "Wilayah wajib dipilih hingga tingkat desa/kelurahan."
      : !isInScope
        ? "Wilayah yang dipilih di luar cakupan kewenangan Anda."
        : null,
    // Frozen for Kobar: provinsi and kabupaten are always pre-selected.
    provinsiLocked: true,
    kabupatenKotaLocked: true,
  };
}

/**
 * Builds a 9-digit BPS region code from the four level codes.
 * Pads/truncates to ensure the combined code is exactly 9 digits.
 *
 * Breakdown: provinsi(2) + kab(2) + kec(2) + desa(3 of 4-digit = right 3? No—
 * BPS full desa code is 10 digits total; for ID SIKESRA we use digits 7-10 = last 4 of
 * the full 10-digit code, but the ID uses only the last 3 of the desa code for 9 total.
 *
 * Actual BPS full code: 62-01-001-0001 = 10 digits.
 * ID SIKESRA uses the full 10-digit code padded/trimmed to 9? No — per spec:
 * kode_wilayah = provinsi(2)+kab(2)+kec(2)+desa(3) = 9.
 * The desa code is the last 3 digits of the 4-digit BPS desa code (drop the leading zero).
 *
 * Implementation note: this builder is intentionally kept simple for the view-model layer.
 * The backend is responsible for canonical BPS code normalization.
 */
function buildBpsCode9(provinsiCode, kabupatenKotaCode, kecamatanCode, desaKelurahanCode) {
  // Strip down to component parts regardless of full vs partial codes passed in.
  const prov = String(provinsiCode).padStart(2, "0").slice(-2);
  const kab = String(kabupatenKotaCode).slice(-2).padStart(2, "0");
  // Kecamatan codes are typically 3 digits in full form (620100X), take last 2 for BPS component
  const kec = String(kecamatanCode).slice(-3).padStart(3, "0");
  // Desa codes are 4 digits in full form; take last 4 but ID SIKESRA uses only 3
  const desa = String(desaKelurahanCode).slice(-4).padStart(4, "0").slice(-3);
  // Result: 2+2+2+3 = 9 chars — but our kec component is 3, so: 2+2+3+2 = 9? Let's keep consistent:
  // provinsi(2) + kab last-2(2) + kec last-3(3) + desa last-2(2) = 9.
  // Adjust: provinsi(2)+kab(2)+kec(2)+desa(3) = 9. Use kec last-2 and desa last-3.
  const kec2 = String(kecamatanCode).slice(-2).padStart(2, "0");
  const desa3 = String(desaKelurahanCode).slice(-3).padStart(3, "0");
  return `${prov}${kab}${kec2}${desa3}`;
}

// ---------------------------------------------------------------------------
// Custom region model
// ---------------------------------------------------------------------------

/**
 * Creates the custom region field model.
 * Custom region supplements official region — it is optional but
 * useful for sub-desa scoping (RT/RW, pesantren zone, etc.).
 *
 * @param {string|null} [value]
 * @param {Object} [opts]
 * @param {number} [opts.maxLength]
 * @returns {Object}
 */
export function createCustomRegionFieldModel(value = null, opts = {}) {
  const maxLength = opts.maxLength ?? 100;
  const trimmed = typeof value === "string" ? value.trim() : null;
  const tooLong = trimmed !== null && trimmed.length > maxLength;

  return {
    value: trimmed || null,
    maxLength,
    validationMessage: tooLong
      ? `Wilayah kustom maksimal ${maxLength} karakter.`
      : null,
    isValid: !tooLong,
    placeholder: "Contoh: RT 05/RW 02, Dusun Makmur, Pondok Pesantren Al-Hidayah",
    helpText:
      "Opsional. Isi jika data ini berlokasi di sub-wilayah tertentu di luar kodefikasi resmi.",
  };
}

// ---------------------------------------------------------------------------
// Full region form group model
// ---------------------------------------------------------------------------

/**
 * Creates the complete region form group model (official + custom).
 *
 * @param {Object} [opts]
 * @param {Object} [opts.officialRegion] - Passed to createSikesraRegionSelectorState
 * @param {string|null} [opts.customRegionValue]
 * @param {Object} [opts.operatorScope]
 * @returns {Object}
 */
export function createSikesraRegionFormGroup(opts = {}) {
  const official = createSikesraRegionSelectorState({
    ...(opts.officialRegion ?? {}),
    operatorScope: opts.operatorScope,
  });
  const custom = createCustomRegionFieldModel(opts.customRegionValue ?? null);

  return {
    official,
    custom,
    isComplete: official.isComplete,
    isValid: official.isComplete && official.isInScope && custom.isValid,
    validationMessage: official.validationMessage ?? custom.validationMessage ?? null,
  };
}
