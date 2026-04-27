import { spawnSync } from "node:child_process";

export const SIKESRA_PSQL_CLIENT_SEAM = Object.freeze({
  status: "repository_psql_execution_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#57",
  runtime: "psql_database_url",
  note: "Eksekusi migrasi repository menggunakan psql non-interaktif dengan kredensial dari environment runtime saja.",
});

export function createSikesraPsqlDatabaseClient({ env = process.env, spawn = spawnSync } = {}) {
  return Object.freeze({
    seam: SIKESRA_PSQL_CLIENT_SEAM,
    listAppliedMigrationNames() {
      const ledgerExists = executeSql({
        env,
        spawn,
        sql: "select to_regclass('public.sikesra_migrations') is not null;",
      });

      if (ledgerExists.stdout !== "t") return [];

      const result = executeSql({
        env,
        spawn,
        sql: "select name from public.sikesra_migrations order by name;",
      });

      return result.stdout ? result.stdout.split(/\r?\n/).filter(Boolean) : [];
    },
    applyMigration(migration, sql) {
      executeSql({ env, spawn, sql, timeoutMs: resolveTimeoutMs(env, 30000) });
      return { name: migration.name, applied: true };
    },
  });
}

function executeSql({ env, spawn, sql, timeoutMs = resolveTimeoutMs(env, 10000) }) {
  if (!hasValue(env.DATABASE_URL)) {
    throw databaseError("configuration", "missing_database_url", "DATABASE_URL is required for repository migration execution.");
  }

  const result = spawn(
    "psql",
    ["-X", "--no-password", "--dbname", env.DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-At", "-f", "-"],
    {
      input: sql,
      encoding: "utf8",
      timeout: timeoutMs,
      env: {
        ...env,
        PGCONNECT_TIMEOUT: String(Math.max(1, Math.ceil(resolveTimeoutMs(env, 10000) / 1000))),
      },
    },
  );

  if (result.error) {
    throw databaseError(
      "connection",
      result.error.code === "ETIMEDOUT" ? "timeout" : "psql_spawn_failed",
      "psql migration command failed before completing the repository-owned SQL execution.",
    );
  }

  if (result.signal === "SIGTERM") {
    throw databaseError("connection", "timeout", "psql migration command timed out while connecting to or querying PostgreSQL.");
  }

  if (result.status !== 0) {
    throw databaseError(
      "query",
      "psql_non_zero_exit",
      "psql migration command exited non-zero while executing repository-owned SQL.",
    );
  }

  return {
    stdout: String(result.stdout ?? "").trim(),
  };
}

function resolveTimeoutMs(env, fallback) {
  const raw = Number(env.DATABASE_CONNECT_TIMEOUT_MS || fallback);
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function databaseError(kind, reason, message) {
  const error = new Error(message);
  error.kind = kind;
  error.reason = reason;
  return error;
}
