/**
 * SIKESRA ID 20-Digit Model
 *
 * Framework-neutral view model for the ID SIKESRA 20-digit identifier system.
 * Implements: ahliweb/sikesra#27
 *
 * Format (20 chars, zero-padded):
 *   [KODE_WILAYAH_9][KODE_MODUL_2][TAHUN_4][SEQ_5]
 *
 *   - KODE_WILAYAH_9  : 9-digit BPS region code (provinsi 2 + kab/kota 2 + kec 2 + desa 4)
 *   - KODE_MODUL_2    : 2-digit module code (see SIKESRA_ID_MODULE_CODES)
 *   - TAHUN_4         : 4-digit registration year
 *   - SEQ_5           : 5-digit zero-padded sequential counter within region+module+year
 *
 * Example: 62010010010120240000001
 *   → Provinsi 62, Kab 01, Kec 001, Desa 001, Modul 01 (Rumah Ibadah), 2024, seq 00001
 *   (Displayed with separators for readability: 620100100101-2024-00001)
 *
 * Security note:
 *   ID SIKESRA is a public-safe opaque identifier. It MUST NOT embed or encode
 *   NIK, KIA, No KK, or any personal data. The sequential counter is scoped to
 *   region+module+year to avoid cross-module enumeration.
 */

// ---------------------------------------------------------------------------
// Module code registry
// ---------------------------------------------------------------------------

export const SIKESRA_ID_MODULE_CODES = {
  "01": "rumah_ibadah",
  "02": "lembaga_keagamaan",
  "03": "lembaga_pendidikan_keagamaan",
  "04": "lembaga_kesejahteraan_sosial",
  "05": "guru_agama",
  "06": "anak_yatim",
  "07": "disabilitas",
  "08": "lansia_terlantar",
};

export const SIKESRA_MODULE_CODE_BY_KEY = Object.fromEntries(
  Object.entries(SIKESRA_ID_MODULE_CODES).map(([code, key]) => [key, code])
);

// ---------------------------------------------------------------------------
// Structural constants
// ---------------------------------------------------------------------------

export const SIKESRA_ID_TOTAL_LENGTH = 20;
export const SIKESRA_ID_REGION_LENGTH = 9;
export const SIKESRA_ID_MODULE_LENGTH = 2;
export const SIKESRA_ID_YEAR_LENGTH = 4;
export const SIKESRA_ID_SEQ_LENGTH = 5;

// Display separator for human-readable rendering (not stored)
export const SIKESRA_ID_DISPLAY_SEPARATOR = "-";

// ---------------------------------------------------------------------------
// Parse / validate
// ---------------------------------------------------------------------------

/**
 * Parses a raw 20-character ID SIKESRA string into its structural segments.
 * Returns null if the string is not a valid 20-digit numeric ID.
 *
 * @param {string} raw
 * @returns {{ regionCode: string, moduleCode: string, year: string, seq: string, moduleKey: string|null } | null}
 */
export function parseSikesraId(raw) {
  if (typeof raw !== "string") return null;
  const clean = raw.replace(/\D/g, ""); // strip non-digits (display separators)
  if (clean.length !== SIKESRA_ID_TOTAL_LENGTH) return null;

  const regionCode = clean.slice(0, SIKESRA_ID_REGION_LENGTH);
  const moduleCode = clean.slice(
    SIKESRA_ID_REGION_LENGTH,
    SIKESRA_ID_REGION_LENGTH + SIKESRA_ID_MODULE_LENGTH
  );
  const year = clean.slice(
    SIKESRA_ID_REGION_LENGTH + SIKESRA_ID_MODULE_LENGTH,
    SIKESRA_ID_REGION_LENGTH + SIKESRA_ID_MODULE_LENGTH + SIKESRA_ID_YEAR_LENGTH
  );
  const seq = clean.slice(
    SIKESRA_ID_REGION_LENGTH + SIKESRA_ID_MODULE_LENGTH + SIKESRA_ID_YEAR_LENGTH
  );

  return {
    regionCode,
    moduleCode,
    year,
    seq,
    moduleKey: SIKESRA_ID_MODULE_CODES[moduleCode] ?? null,
  };
}

/**
 * Validates a raw 20-character ID SIKESRA string.
 *
 * @param {string} raw
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validateSikesraId(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { valid: false, reason: "ID SIKESRA wajib diisi." };
  }
  const clean = raw.replace(/\D/g, "");
  if (clean.length !== SIKESRA_ID_TOTAL_LENGTH) {
    return {
      valid: false,
      reason: `ID SIKESRA harus terdiri dari ${SIKESRA_ID_TOTAL_LENGTH} digit angka (tanpa pemisah). Saat ini: ${clean.length} digit.`,
    };
  }
  const parsed = parseSikesraId(clean);
  if (!parsed) {
    return { valid: false, reason: "Format ID SIKESRA tidak dikenali." };
  }
  if (!SIKESRA_ID_MODULE_CODES[parsed.moduleCode]) {
    return {
      valid: false,
      reason: `Kode modul "${parsed.moduleCode}" tidak dikenal dalam sistem SIKESRA.`,
    };
  }
  const yearNum = parseInt(parsed.year, 10);
  if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2099) {
    return { valid: false, reason: `Tahun pada ID SIKESRA (${parsed.year}) tidak valid.` };
  }
  return { valid: true, reason: null };
}

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

/**
 * Formats a raw 20-digit ID SIKESRA for human-readable display.
 * Format: XXXXXXXXX-XX-XXXX-XXXXX  (region9 - module2 - year4 - seq5)
 *
 * @param {string} raw - Raw 20-digit string (or display-formatted input)
 * @returns {string} Human-readable display string, or raw if unparseable
 */
export function formatSikesraIdDisplay(raw) {
  const parsed = parseSikesraId(raw);
  if (!parsed) return raw ?? "";
  return [parsed.regionCode, parsed.moduleCode, parsed.year, parsed.seq].join(
    SIKESRA_ID_DISPLAY_SEPARATOR
  );
}

// ---------------------------------------------------------------------------
// UI state model
// ---------------------------------------------------------------------------

/**
 * UI states for ID SIKESRA display in forms and detail pages.
 */
export const SIKESRA_ID_UI_STATES = {
  /** ID has not yet been assigned (new draft record). */
  pending_assignment: {
    key: "pending_assignment",
    label: "Belum ditetapkan",
    description: "ID SIKESRA akan ditetapkan secara otomatis setelah data disimpan.",
    iconHint: "clock",
    isAssigned: false,
  },
  /** ID has been assigned and is valid. */
  assigned: {
    key: "assigned",
    label: "Ditetapkan",
    description: "ID SIKESRA telah ditetapkan dan dapat digunakan sebagai referensi.",
    iconHint: "badge-check",
    isAssigned: true,
  },
  /** ID was assigned but the record has been archived/cancelled. */
  archived: {
    key: "archived",
    label: "Diarsipkan",
    description: "ID SIKESRA ini telah diarsipkan. Data tetap tersimpan untuk keperluan audit.",
    iconHint: "archive",
    isAssigned: true,
  },
  /** ID format is invalid — shown during import review or manual entry correction. */
  invalid_format: {
    key: "invalid_format",
    label: "Format Tidak Valid",
    description: "Format ID SIKESRA tidak sesuai. Periksa kembali 20 digit angka.",
    iconHint: "alert-triangle",
    isAssigned: false,
  },
};

/**
 * Creates the ID SIKESRA UI display model for a given raw value.
 *
 * @param {string|null} rawId
 * @param {Object} [opts]
 * @param {boolean} [opts.isArchived]
 * @returns {Object}
 */
export function createSikesraIdDisplayModel(rawId, opts = {}) {
  if (!rawId) {
    return {
      raw: null,
      display: null,
      state: SIKESRA_ID_UI_STATES.pending_assignment,
      parsed: null,
      validation: null,
    };
  }

  const validation = validateSikesraId(rawId);
  if (!validation.valid) {
    return {
      raw: rawId,
      display: rawId,
      state: SIKESRA_ID_UI_STATES.invalid_format,
      parsed: null,
      validation,
    };
  }

  const parsed = parseSikesraId(rawId);
  const state = opts.isArchived
    ? SIKESRA_ID_UI_STATES.archived
    : SIKESRA_ID_UI_STATES.assigned;

  return {
    raw: rawId,
    display: formatSikesraIdDisplay(rawId),
    state,
    parsed,
    validation,
  };
}

// ---------------------------------------------------------------------------
// Explanation modal content model
// ---------------------------------------------------------------------------

/**
 * Creates the content model for the ID SIKESRA explanation modal.
 * Used by the UI to render a help/info modal describing the ID structure.
 *
 * @returns {Object}
 */
export function createSikesraIdExplanationModal() {
  return {
    title: "Tentang ID SIKESRA 20 Digit",
    intro:
      "ID SIKESRA adalah kode unik 20 digit yang ditetapkan secara otomatis oleh sistem untuk setiap data yang terdaftar.",
    segments: [
      {
        label: "Kode Wilayah (9 digit)",
        example: "620100100",
        description:
          "Kode wilayah BPS: 2 digit provinsi + 2 digit kab/kota + 2 digit kecamatan + 4 digit desa/kelurahan. Tidak dapat diubah setelah penetapan.",
      },
      {
        label: "Kode Modul (2 digit)",
        example: "01",
        description:
          "Kode jenis data: 01=Rumah Ibadah, 02=Lembaga Keagamaan, 03=Lembaga Pendidikan, 04=LKS, 05=Guru Agama, 06=Anak Yatim, 07=Disabilitas, 08=Lansia Terlantar.",
      },
      {
        label: "Tahun Pendaftaran (4 digit)",
        example: "2024",
        description: "Tahun saat data pertama kali didaftarkan ke sistem SIKESRA.",
      },
      {
        label: "Nomor Urut (5 digit)",
        example: "00001",
        description:
          "Nomor urut dalam kombinasi wilayah + modul + tahun. Ditetapkan otomatis; tidak mencerminkan urutan absolut di seluruh sistem.",
      },
    ],
    privacyNote:
      "ID SIKESRA tidak mengandung NIK, KIA, Nomor KK, atau informasi pribadi lainnya. Aman digunakan sebagai referensi publik.",
    formatExample: {
      raw: "62010010010120240000001",
      display: "620100100-01-2024-00001",
      explanation: "Provinsi 62, Kab 01, Kec 001, Desa 001 → Modul Rumah Ibadah → Tahun 2024 → Urutan ke-1",
    },
  };
}
