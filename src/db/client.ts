/**
 * src/db/client.ts
 *
 * PostgreSQL connection pool for SIKESRA Hono API and migration tooling.
 * Runtime: uses DATABASE_URL (resolves to DATABASE_INTERNAL_URL in production via Coolify).
 * Migration: uses DATABASE_MIGRATION_URL if set, otherwise falls back to DATABASE_URL.
 */

import postgres from "postgres";

// ---------------------------------------------------------------------------
// Runtime client (singleton, lazy)
// ---------------------------------------------------------------------------

let _runtimeSql: ReturnType<typeof postgres> | undefined;

/**
 * Returns the singleton runtime connection pool.
 * Reads DATABASE_URL from process.env at first call.
 */
export function getDb(): ReturnType<typeof postgres> {
  if (_runtimeSql) return _runtimeSql;

  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");

  _runtimeSql = postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 15,
    ssl:
      process.env["NODE_ENV"] === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return _runtimeSql;
}

export async function closeDb(): Promise<void> {
  if (_runtimeSql) {
    await _runtimeSql.end();
    _runtimeSql = undefined;
  }
}

export async function checkDbConnectivity(): Promise<"ok" | "error"> {
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

// ---------------------------------------------------------------------------
// Migration client (separate pool, short-lived, uses migration superuser URL)
// ---------------------------------------------------------------------------

/**
 * Creates a one-off migration client.
 * Uses DATABASE_MIGRATION_URL if set; otherwise DATABASE_URL.
 * Caller must call .end() when done.
 */
export function createMigrationClient(): ReturnType<typeof postgres> {
  const url =
    process.env["DATABASE_MIGRATION_URL"] ?? process.env["DATABASE_URL"];
  if (!url)
    throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL must be set");

  return postgres(url, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 20,
    ssl:
      process.env["NODE_ENV"] === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    onnotice: () => {}, // suppress notices during migrations
  });
}
