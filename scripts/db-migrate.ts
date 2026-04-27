#!/usr/bin/env tsx
/**
 * scripts/db-migrate.ts
 *
 * PostgreSQL migration CLI for SIKESRA.
 *
 * Usage:
 *   pnpm db:migrate:probe     — test connectivity
 *   pnpm db:migrate:status    — list applied / pending migrations
 *   pnpm db:migrate           — apply all pending migrations (up)
 *   tsx scripts/db-migrate.ts down <name>  — (not yet implemented)
 *
 * Reads DATABASE_MIGRATION_URL (preferred) or DATABASE_URL from environment.
 * Requires .env.local or exported env vars to be present.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SQL_DIR = join(__dirname, "../src/db/migrations/sql");

// All migrations in execution order. The first entry (001) is handled by the
// legacy .mjs runner; subsequent entries are plain SQL files.
const MIGRATION_FILES: readonly string[] = [
  "001_create_religion_reference_tables", // handled by legacy runner
  "002_create_auth_tables",
  "003_create_security_tables",
  "004_create_content_tables",
  "005_create_file_objects_table",
  "006_create_notification_tables",
  "007_create_app_role_grants",
];

function getMigrationUrl(): string {
  // Load .env.local manually (tsx does not auto-load dotenv)
  // We rely on the caller having sourced env or using cross-env / dotenv-cli.
  const url =
    process.env["DATABASE_MIGRATION_URL"] ?? process.env["DATABASE_URL"];
  if (!url) {
    console.error(
      "Error: DATABASE_MIGRATION_URL or DATABASE_URL must be set.\n" +
        "       Export from .env.local or pass via cross-env.",
    );
    process.exit(1);
  }
  return url;
}

function createClient(url: string): ReturnType<typeof postgres> {
  return postgres(url, {
    max: 1,
    idle_timeout: 10,
    connect_timeout: 20,
    ssl:
      process.env["NODE_ENV"] === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    onnotice: () => {},
  });
}

async function ensureMigrationsTable(
  sql: ReturnType<typeof postgres>,
): Promise<void> {
  await sql`
    create table if not exists public.sikesra_migrations (
      name       text        primary key,
      applied_at timestamptz not null default now()
    )
  `;
}

async function listApplied(
  sql: ReturnType<typeof postgres>,
): Promise<Set<string>> {
  const rows = await sql<
    { name: string }[]
  >`select name from public.sikesra_migrations order by applied_at`;
  return new Set(rows.map((r) => r.name));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdProbe(): Promise<void> {
  const url = getMigrationUrl();
  const sql = createClient(url);
  try {
    const result = await sql<{ ok: number }[]>`select 1 as ok`;
    const reachable = result[0]?.ok === 1;
    console.log(JSON.stringify({ ok: reachable, command: "probe" }, null, 2));
    process.exit(reachable ? 0 : 1);
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command: "probe",
          error: err instanceof Error ? err.message : String(err),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  } finally {
    await sql.end();
  }
}

async function cmdStatus(): Promise<void> {
  const url = getMigrationUrl();
  const sql = createClient(url);
  try {
    await ensureMigrationsTable(sql);
    const applied = await listApplied(sql);
    const migrations = MIGRATION_FILES.map((name) => ({
      name,
      applied: applied.has(name),
    }));
    console.log(
      JSON.stringify(
        {
          total: migrations.length,
          applied: migrations.filter((m) => m.applied).map((m) => m.name),
          pending: migrations.filter((m) => !m.applied).map((m) => m.name),
          migrations,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command: "status",
          error: err instanceof Error ? err.message : String(err),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  } finally {
    await sql.end();
  }
}

async function cmdUp(): Promise<void> {
  const url = getMigrationUrl();
  const sql = createClient(url);
  try {
    await ensureMigrationsTable(sql);
    const applied = await listApplied(sql);
    const pending = MIGRATION_FILES.filter((name) => !applied.has(name));

    if (pending.length === 0) {
      console.log(
        JSON.stringify(
          { ok: true, command: "up", applied: [], pending: [] },
          null,
          2,
        ),
      );
      process.exit(0);
    }

    const justApplied: string[] = [];

    for (const name of pending) {
      // Migration 001 was applied via the legacy .mjs runner; if somehow it
      // ended up missing from the table, record it without re-running DDL.
      if (name === "001_create_religion_reference_tables") {
        console.log(`  [skip-rerun] ${name} (applied via legacy runner)`);
        await sql`
          insert into public.sikesra_migrations (name, applied_at)
          values (${name}, now())
          on conflict (name) do nothing
        `;
        justApplied.push(name);
        continue;
      }

      const filePath = join(SQL_DIR, `${name}.sql`);
      let sqlText: string;
      try {
        sqlText = await readFile(filePath, "utf8");
      } catch {
        console.error(`  [error] SQL file not found: ${filePath}`);
        process.exit(1);
      }

      console.log(`  [applying] ${name}…`);
      // Execute the SQL as a raw unsafe query (the file contains its own transaction).
      await sql.unsafe(sqlText);
      justApplied.push(name);
      console.log(`  [done]     ${name}`);
    }

    console.log(
      JSON.stringify(
        { ok: true, command: "up", applied: justApplied, pending: [] },
        null,
        2,
      ),
    );
    process.exit(0);
  } catch (err) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command: "up",
          error: err instanceof Error ? err.message : String(err),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

const command = process.argv[2] ?? "up";

switch (command) {
  case "probe":
    await cmdProbe();
    break;
  case "status":
    await cmdStatus();
    break;
  case "up":
    await cmdUp();
    break;
  default:
    console.error(`Unknown command: ${command}. Use: probe | status | up`);
    process.exit(1);
}
