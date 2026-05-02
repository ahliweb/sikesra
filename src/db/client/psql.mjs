import { spawnSync } from "node:child_process";

import { renderSikesraMigrationSql } from "../migrations/sql.mjs";

export const SIKESRA_PSQL_CLIENT_SEAM = Object.freeze({
  status: "repository_psql_execution_ready",
  followUpIssue: "ahliweb/sikesra#49",
  sourceIssue: "ahliweb/sikesra#58",
  runtime: "psql_database_url",
  note: "Eksekusi migrasi repository menggunakan psql non-interaktif dengan kredensial dari environment runtime saja.",
});

export function createSikesraPsqlDatabaseClient({ env = process.env, spawn = spawnSync } = {}) {
  return Object.freeze({
    seam: SIKESRA_PSQL_CLIENT_SEAM,
    probeReachability() {
      executeSql({
        env,
        spawn,
        sql: "select current_database();",
      });

      return {
        ok: true,
        kind: "connection",
        reason: "reachable",
      };
    },
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
    applyMigrationsAtomically(migrations) {
      const sql = buildAtomicMigrationSql(migrations);
      executeSql({ env, spawn, sql, timeoutMs: resolveTimeoutMs(env, 30000) });
      return { applied: migrations.map((migration) => migration.name) };
    },
  });
}

function buildAtomicMigrationSql(migrations) {
  const statements = migrations.map((migration) => renderSikesraMigrationSql(migration)).join("\n\n");
  return `begin;\n\n${statements}\n\ncommit;\n`;
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
      classifyStderr(String(result.stderr ?? "")).kind,
      classifyStderr(String(result.stderr ?? "")).reason,
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

function classifyStderr(stderr) {
  const input = String(stderr ?? "").toLowerCase();

  if (/password authentication failed|no password supplied|authentication failed/.test(input)) {
    return { kind: "authentication", reason: "authentication_failed" };
  }

  if (/could not translate host name|name or service not known|temporary failure in name resolution/.test(input)) {
    return { kind: "connection", reason: "dns_resolution_failed" };
  }

  if (/connection timed out|timeout expired/.test(input)) {
    return { kind: "connection", reason: "timeout" };
  }

  if (/could not connect to server|connection refused|network is unreachable|no route to host/.test(input)) {
    return { kind: "connection", reason: "connection_failed" };
  }

  if (/ssl|tls|certificate/.test(input)) {
    return { kind: "connection", reason: "tls_validation_failed" };
  }

  return { kind: "query", reason: "psql_non_zero_exit" };
}
