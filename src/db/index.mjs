export const SIKESRA_DATABASE_ACCESS_SEAM = Object.freeze({
  status: "repository_db_scaffold_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#55",
  runtime: "postgresql_hyperdrive_client_pending",
  note: "Scaffold database SIKESRA sudah tersedia untuk summary konfigurasi dan wiring migration, tetapi client PostgreSQL runtime belum ditambahkan.",
});

export function createSikesraDatabaseAccess(env = process.env) {
  return Object.freeze({
    seam: SIKESRA_DATABASE_ACCESS_SEAM,
    getConnectionSummary() {
      return summarizeConnection(env.DATABASE_URL);
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
