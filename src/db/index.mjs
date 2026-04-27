import { createSikesraPsqlDatabaseClient } from "./client/psql.mjs";

export const SIKESRA_DATABASE_ACCESS_SEAM = Object.freeze({
  status: "repository_db_execution_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#59",
  runtime: "postgresql_psql_database_url_with_migration_override",
  note: "Surface database SIKESRA sekarang mendukung summary koneksi teredaksi, override koneksi migrasi, dan eksekusi migrasi repository melalui psql non-interaktif.",
});

export function createSikesraDatabaseAccess(env = process.env) {
  return Object.freeze({
    seam: SIKESRA_DATABASE_ACCESS_SEAM,
    getConnectionSummary() {
      return summarizeConnection(env.DATABASE_URL);
    },
    getMigrationConnectionSummary() {
      return summarizeConnection(resolveMigrationDatabaseUrl(env));
    },
    createMigrationClient() {
      return createSikesraPsqlDatabaseClient({
        env: {
          ...env,
          DATABASE_URL: resolveMigrationDatabaseUrl(env),
        },
      });
    },
  });
}

export const sikesraDatabaseAccess = createSikesraDatabaseAccess();

export function resolveMigrationDatabaseUrl(env = process.env) {
  return hasValue(env.DATABASE_MIGRATION_URL) ? env.DATABASE_MIGRATION_URL : env.DATABASE_URL;
}

function summarizeConnection(raw) {
  if (!hasValue(raw)) {
    return { configured: false, parseable: false, database: null, usernamePresent: false, passwordPresent: false };
  }

  try {
    const url = new URL(raw);
    return {
      configured: true,
      parseable: true,
      database: url.pathname.replace(/^\//, "") || null,
      usernamePresent: hasValue(url.username),
      passwordPresent: hasValue(url.password),
    };
  } catch {
    return { configured: true, parseable: false, database: null, usernamePresent: false, passwordPresent: false };
  }
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}
