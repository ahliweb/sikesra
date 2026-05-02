import assert from "node:assert/strict";
import test from "node:test";

import { createSikesraPsqlDatabaseClient } from "../../src/db/client/psql.mjs";
import { getDatabaseRuntimePosture } from "../../src/api/config/database.ts";
import { renderSikesraMigrationSql } from "../../src/db/migrations/sql.mjs";
import { createSikesraMigrationRunner } from "../../src/db/migrations/runner.mjs";
import { SIKESRA_DB_MIGRATIONS } from "../../src/db/migrations/index.mjs";

function buildDatabaseUrl(hostname, username) {
  return `postgresql://${username}:placeholder-secret@${hostname}:5432/sikesrakobar`;
}

test("SIKESRA psql client uses non-interactive redacted execution settings", () => {
  const calls = [];
  const client = createSikesraPsqlDatabaseClient({
    env: {
      DATABASE_URL: "postgresql://runtime_user:super-secret@example.com:5432/sikesrakobar",
      DATABASE_CONNECT_TIMEOUT_MS: "4321",
    },
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0, stdout: "f\n", stderr: "" };
    },
  });

  client.listAppliedMigrationNames();

  assert.equal(client.seam.sourceIssue, "ahliweb/sikesra#58");
  assert.equal(calls[0].command, "psql");
  assert.ok(calls[0].args.includes("--no-password"));
  assert.equal(calls[0].options.env.PGCONNECT_TIMEOUT, "5");
});

test("SIKESRA psql client batches migrations inside one transaction", () => {
  const calls = [];
  const client = createSikesraPsqlDatabaseClient({
    env: {
      DATABASE_URL: "postgresql://runtime_user:super-secret@example.com:5432/sikesrakobar",
    },
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0, stdout: "", stderr: "" };
    },
  });

  const result = client.applyMigrationsAtomically([SIKESRA_DB_MIGRATIONS[0]]);

  assert.deepEqual(result, { applied: ["001_create_religion_reference_tables"] });
  assert.equal(calls[0].command, "psql");
  assert.match(calls[0].options.input, /^begin;/i);
  assert.match(calls[0].options.input, /create table if not exists public\.religion_references/i);
  assert.match(calls[0].options.input, /commit;\s*$/i);
});

test("SIKESRA psql client exposes a redacted reachability probe", () => {
  const client = createSikesraPsqlDatabaseClient({
    env: {
      DATABASE_URL: "postgresql://runtime_user:super-secret@example.com:5432/sikesrakobar",
    },
    spawn() {
      return { status: 0, stdout: "sikesrakobar\n", stderr: "" };
    },
  });

  assert.deepEqual(client.probeReachability(), {
    ok: true,
    kind: "connection",
    reason: "reachable",
  });
});

test("SIKESRA API database posture helper reports the reviewed direct PostgreSQL shape", () => {
  const posture = getDatabaseRuntimePosture({
    DATABASE_URL: `${buildDatabaseUrl("postgres", "app_user")}?sslmode=require`,
  });

  assert.equal(posture.ok, true);
  assert.deepEqual(posture.posture, {
    transport: "direct",
    hostname: "postgres",
    sslmode: "require",
    source: "DATABASE_URL",
  });
});

test("SIKESRA psql client classifies timeout failures without exposing secrets", () => {
  const client = createSikesraPsqlDatabaseClient({
    env: {
      DATABASE_URL: "postgresql://runtime_user:super-secret@example.com:5432/sikesrakobar",
    },
    spawn() {
      return { status: null, signal: "SIGTERM", stdout: "", stderr: "" };
    },
  });

  assert.throws(
    () => client.listAppliedMigrationNames(),
    (error) => error.kind === "connection" && error.reason === "timeout" && /timed out/i.test(error.message),
  );
});

test("SIKESRA psql client classifies authentication failures without exposing secrets", () => {
  const client = createSikesraPsqlDatabaseClient({
    env: {
      DATABASE_URL: "postgresql://runtime_user:super-secret@example.com:5432/sikesrakobar",
    },
    spawn() {
      return { status: 2, signal: null, stdout: "", stderr: "psql: error: password authentication failed for user 'runtime_user'" };
    },
  });

  assert.throws(
    () => client.probeReachability(),
    (error) => error.kind === "authentication" && error.reason === "authentication_failed",
  );
});

test("SIKESRA migration SQL renderer includes ledger, tables, and seed inserts", () => {
  const sql = renderSikesraMigrationSql(SIKESRA_DB_MIGRATIONS[0]);

  assert.match(sql, /create table if not exists public\.sikesra_migrations/i);
  assert.match(sql, /create table if not exists public\.religion_references/i);
  assert.match(sql, /create table if not exists public\.religion_reference_aliases/i);
  assert.match(sql, /insert into public\.religion_references/i);
  assert.match(sql, /insert into public\.sikesra_migrations/i);
});

test("SIKESRA migration runner applies only pending repository-owned migrations", () => {
  const runner = createSikesraMigrationRunner();
  const appliedSql = [];
  const result = runner.applyPending({
    listAppliedMigrationNames() {
      return [];
    },
    applyMigration(migration, sql) {
      appliedSql.push({ migration: migration.name, sql });
      return { name: migration.name, applied: true };
    },
  });

  assert.deepEqual(result.applied, ["001_create_religion_reference_tables"]);
  assert.equal(appliedSql.length, 1);
  assert.match(appliedSql[0].sql, /religion_references/);
});

test("SIKESRA migration runner can apply pending migrations atomically", async () => {
  const runner = createSikesraMigrationRunner();
  const applied = [];

  const result = await runner.applyPendingAtomically({
    listAppliedMigrationNames() {
      return [];
    },
    async applyMigrationsAtomically(migrations) {
      applied.push(...migrations.map((migration) => migration.name));
      return { applied: applied.slice() };
    },
  });

  assert.deepEqual(applied, ["001_create_religion_reference_tables"]);
  assert.deepEqual(result.applied, ["001_create_religion_reference_tables"]);
  assert.deepEqual(result.pending, []);
});
