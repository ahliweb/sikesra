export const SIKESRA_RELIGION_REFERENCE_SEAM = Object.freeze({
  status: "repository_backend_seam_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#52",
  storage: "pending_persistence",
  note: "Seam backend referensi agama siap dipasangi persistence saat migrasi, repository, dan service layer ditambahkan.",
});

export const SIKESRA_RELIGION_REFERENCE_SEED = Object.freeze([
  religion({
    id: "agama_islam",
    code: "islam",
    normalizedName: "islam",
    displayName: "Islam",
    aliases: ["moslem", "muslim"],
    sortOrder: 1,
  }),
  religion({
    id: "agama_kristen",
    code: "kristen",
    normalizedName: "kristen",
    displayName: "Kristen",
    aliases: ["kristen protestan", "protestan", "protestant"],
    sortOrder: 2,
  }),
  religion({
    id: "agama_katolik",
    code: "katolik",
    normalizedName: "katolik",
    displayName: "Katolik",
    aliases: ["katholik", "katholic", "katolic"],
    sortOrder: 3,
  }),
  religion({
    id: "agama_hindu",
    code: "hindu",
    normalizedName: "hindu",
    displayName: "Hindu",
    aliases: [],
    sortOrder: 4,
  }),
  religion({
    id: "agama_buddha",
    code: "buddha",
    normalizedName: "buddha",
    displayName: "Buddha",
    aliases: ["budha", "buddhist"],
    sortOrder: 5,
  }),
  religion({
    id: "agama_konghucu",
    code: "konghucu",
    normalizedName: "konghucu",
    displayName: "Konghucu",
    aliases: ["kong hu cu", "konghuchu", "khonghucu", "confucian"],
    sortOrder: 6,
  }),
  religion({
    id: "agama_kepercayaan",
    code: "kepercayaan",
    normalizedName: "kepercayaan_terhadap_tuhan_yme",
    displayName: "Kepercayaan Terhadap Tuhan YME",
    aliases: ["kepercayaan", "penghayat kepercayaan"],
    sortOrder: 7,
  }),
]);

export function listSikesraReligionReferences({ includeInactive = false } = {}) {
  return SIKESRA_RELIGION_REFERENCE_SEED.filter((item) => includeInactive || item.active);
}

export function findSikesraReligionReference(value) {
  const normalized = normalizeReferenceText(value);
  if (!normalized) return null;

  return (
    SIKESRA_RELIGION_REFERENCE_SEED.find(
      (item) =>
        item.code === normalized ||
        item.normalizedName === normalized ||
        item.aliases.some((alias) => normalizeReferenceText(alias) === normalized),
    ) ?? null
  );
}

export function mapSikesraReligionReferenceImport(value) {
  const normalizedInput = normalizeReferenceText(value);
  const match = findSikesraReligionReference(value);

  if (!normalizedInput) {
    return { ok: false, normalizedInput, reference: null, message: "Nilai agama kosong." };
  }

  if (!match) {
    return {
      ok: false,
      normalizedInput,
      reference: null,
      message: "Nilai agama tidak ditemukan dalam referensi backend terkontrol.",
    };
  }

  return {
    ok: true,
    normalizedInput,
    reference: match,
    message: "Nilai agama berhasil dipetakan ke referensi backend terkontrol.",
  };
}

export function toSikesraReligionOption(reference) {
  if (!reference) return null;

  return {
    value: reference.code,
    label: reference.displayName,
    active: reference.active,
    referenceId: reference.id,
  };
}

export function normalizeReferenceText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function religion({ id, code, normalizedName, displayName, aliases, active = true, sortOrder }) {
  return Object.freeze({
    id,
    code,
    normalizedName,
    displayName,
    aliases: Object.freeze(aliases),
    active,
    sortOrder,
  });
}
