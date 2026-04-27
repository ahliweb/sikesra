import { createSikesraPsqlDatabaseClient } from "./client/psql.mjs";

export const SIKESRA_DATABASE_ACCESS_SEAM = Object.freeze({
  status: "repository_db_execution_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#57",
  runtime: "postgresql_psql_database_url",
  note: "Surface database SIKESRA sekarang mendukung summary koneksi teredaksi dan eksekusi migrasi repository melalui psql non-interaktif.",
});

export function createSikesraDatabaseAccess(env = process.env) {
  return Object.freeze({
    seam: SIKESRA_DATABASE_ACCESS_SEAM,
    getConnectionSummary() {
      return summarizeConnection(env.DATABASE_URL);
    },
    createMigrationClient() {
      return createSikesraPsqlDatabaseClient({ env });
    },
  });
}

export const sikesraDatabaseAccess = createSikesraDatabaseAccess();

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
