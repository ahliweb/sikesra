import { SIKESRA_DB_MIGRATION_SEAM, SIKESRA_DB_MIGRATIONS } from "./index.mjs";
import { renderSikesraMigrationSql } from "./sql.mjs";

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
    getLiveStatus(databaseClient) {
      const appliedNames = databaseClient ? databaseClient.listAppliedMigrationNames() : [];
      return this.getStatus({ appliedNames });
    },
    applyPending(databaseClient) {
      const appliedNames = new Set(databaseClient.listAppliedMigrationNames());
      const pending = SIKESRA_DB_MIGRATIONS.filter((migration) => !appliedNames.has(migration.name));
      const applied = pending.map((migration) => databaseClient.applyMigration(migration, renderSikesraMigrationSql(migration)));

      return {
        seam: SIKESRA_DB_MIGRATION_SEAM,
        applied: applied.map((item) => item.name),
        skipped: SIKESRA_DB_MIGRATIONS.filter((migration) => appliedNames.has(migration.name)).map((migration) => migration.name),
        pending: [],
      };
    },
  });
}

export const sikesraMigrationRunner = createSikesraMigrationRunner();
