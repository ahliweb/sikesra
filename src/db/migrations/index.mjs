export const SIKESRA_DB_MIGRATION_SEAM = Object.freeze({
  status: "repository_migration_scaffold_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#55",
  ledger: "repository_registry_only",
  note: "Registry migrasi repository sudah tersedia untuk status dan wiring awal; eksekusi SQL/Kysely nyata masih menjadi follow-up persistence.",
});

export const SIKESRA_DB_MIGRATIONS = Object.freeze([
  Object.freeze({
    name: "001_religion_reference_persistence_contract",
    kind: "scaffold",
    issue: "ahliweb/sikesra#55",
    description: "Menetapkan kontrak migrasi awal untuk persistence referensi agama terkontrol.",
  }),
]);
