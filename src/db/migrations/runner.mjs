import { SIKESRA_DB_MIGRATION_SEAM, SIKESRA_DB_MIGRATIONS } from "./index.mjs";

export function createSikesraMigrationRunner() {
  return Object.freeze({
    seam: SIKESRA_DB_MIGRATION_SEAM,
    listMigrations() {
      return SIKESRA_DB_MIGRATIONS;
    },
    getStatus({ appliedNames = [] } = {}) {
      const applied = new Set(Array.isArray(appliedNames) ? appliedNames : []);
      const entries = SIKESRA_DB_MIGRATIONS.map((migration) => ({
        ...migration,
        applied: applied.has(migration.name),
      }));

      return {
        seam: SIKESRA_DB_MIGRATION_SEAM,
        total: entries.length,
        applied: entries.filter((item) => item.applied).map((item) => item.name),
        pending: entries.filter((item) => !item.applied).map((item) => item.name),
        migrations: entries,
      };
    },
  });
}

export const sikesraMigrationRunner = createSikesraMigrationRunner();
