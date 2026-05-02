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
    async applyPendingAtomically(databaseClient) {
      const appliedNames = new Set(databaseClient.listAppliedMigrationNames());
      const pending = SIKESRA_DB_MIGRATIONS.filter((migration) => !appliedNames.has(migration.name));

      if (pending.length === 0) {
        return {
          seam: SIKESRA_DB_MIGRATION_SEAM,
          applied: [],
          skipped: SIKESRA_DB_MIGRATIONS.filter((migration) => appliedNames.has(migration.name)).map((migration) => migration.name),
          pending: [],
        };
      }

      let applied;

      if (typeof databaseClient.applyMigrationsAtomically === "function") {
        const result = await databaseClient.applyMigrationsAtomically(pending);
        applied = normalizeAppliedMigrationNames(result, pending);
      } else if (typeof databaseClient.begin === "function") {
        applied = await databaseClient.begin(async (transaction) => {
          const names = [];

          for (const migration of pending) {
            await transaction.unsafe(renderSikesraMigrationSql(migration));
            names.push(migration.name);
          }

          return names;
        });
      } else {
        applied = pending.map((migration) => databaseClient.applyMigration(migration, renderSikesraMigrationSql(migration)).name);
      }

      return {
        seam: SIKESRA_DB_MIGRATION_SEAM,
        applied: normalizeAppliedMigrationNames(applied, pending),
        skipped: SIKESRA_DB_MIGRATIONS.filter((migration) => appliedNames.has(migration.name)).map((migration) => migration.name),
        pending: [],
      };
    },
  });
}

function normalizeAppliedMigrationNames(value, pending) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.applied)) {
    return value.applied;
  }

  return pending.map((migration) => migration.name);
}

export const sikesraMigrationRunner = createSikesraMigrationRunner();
