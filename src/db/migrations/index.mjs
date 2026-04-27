export const SIKESRA_DB_MIGRATION_SEAM = Object.freeze({
  status: "repository_migration_scaffold_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#56",
  ledger: "repository_registry_with_table_contracts",
  note: "Registry migrasi repository sekarang memuat kontrak tabel dan seed persistensi referensi agama; eksekusi database runtime masih menjadi follow-up berikutnya.",
});

export const SIKESRA_DB_MIGRATIONS = Object.freeze([
  Object.freeze({
    name: "001_create_religion_reference_tables",
    kind: "table_contract",
    issue: "ahliweb/sikesra#56",
    description: "Mendefinisikan tabel persistensi referensi agama dan alias import terkontrol untuk SIKESRA.",
    tables: Object.freeze([
      Object.freeze({
        name: "religion_references",
        purpose: "Menyimpan master data agama terkontrol untuk form, filter, import, dan laporan.",
        columns: Object.freeze([
          column("id", "text", { primaryKey: true }),
          column("code", "text", { unique: true }),
          column("normalized_name", "text", { unique: true }),
          column("display_name", "text"),
          column("is_active", "boolean", { default: true }),
          column("sort_order", "integer"),
          column("created_at", "timestamptz", { default: "now()" }),
          column("updated_at", "timestamptz", { default: "now()" }),
        ]),
      }),
      Object.freeze({
        name: "religion_reference_aliases",
        purpose: "Menyimpan alias import dan variasi ejaan yang dipetakan ke referensi agama terkontrol.",
        columns: Object.freeze([
          column("id", "text", { primaryKey: true }),
          column("religion_reference_id", "text", { references: "religion_references.id" }),
          column("alias_text", "text"),
          column("normalized_alias", "text", { unique: true }),
          column("created_at", "timestamptz", { default: "now()" }),
        ]),
      }),
    ]),
    seeds: Object.freeze({
      religionReferences: Object.freeze([
        referenceSeed("agama_islam", "islam", "Islam", "islam", 1),
        referenceSeed("agama_kristen", "kristen", "Kristen", "kristen", 2),
        referenceSeed("agama_katolik", "katolik", "Katolik", "katolik", 3),
        referenceSeed("agama_hindu", "hindu", "Hindu", "hindu", 4),
        referenceSeed("agama_buddha", "buddha", "Buddha", "buddha", 5),
        referenceSeed("agama_konghucu", "konghucu", "Konghucu", "konghucu", 6),
        referenceSeed(
          "agama_kepercayaan",
          "kepercayaan",
          "Kepercayaan Terhadap Tuhan YME",
          "kepercayaan_terhadap_tuhan_yme",
          7,
        ),
      ]),
      religionAliases: Object.freeze([
        aliasSeed("agama_islam", "muslim"),
        aliasSeed("agama_islam", "moslem"),
        aliasSeed("agama_kristen", "Kristen Protestan"),
        aliasSeed("agama_kristen", "Protestan"),
        aliasSeed("agama_kristen", "Protestant"),
        aliasSeed("agama_katolik", "Katholik"),
        aliasSeed("agama_katolik", "Catholic"),
        aliasSeed("agama_katolik", "Katolic"),
        aliasSeed("agama_buddha", "Budha"),
        aliasSeed("agama_buddha", "Buddhist"),
        aliasSeed("agama_konghucu", "Kong Hu Cu"),
        aliasSeed("agama_konghucu", "Konghuchu"),
        aliasSeed("agama_konghucu", "Khonghucu"),
        aliasSeed("agama_konghucu", "Confucian"),
        aliasSeed("agama_kepercayaan", "Kepercayaan"),
        aliasSeed("agama_kepercayaan", "Penghayat Kepercayaan"),
      ]),
    }),
  }),
]);

function column(name, type, options = {}) {
  return Object.freeze({ name, type, ...options });
}

function referenceSeed(id, code, displayName, normalizedName, sortOrder) {
  return Object.freeze({
    id,
    code,
    displayName,
    normalizedName,
    isActive: true,
    sortOrder,
  });
}

function aliasSeed(religionReferenceId, aliasText) {
  return Object.freeze({
    id: `${religionReferenceId}__${normalizeSeedKey(aliasText)}`,
    religionReferenceId,
    aliasText,
    normalizedAlias: normalizeSeedKey(aliasText),
  });
}

function normalizeSeedKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}
