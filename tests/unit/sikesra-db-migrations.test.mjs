import assert from "node:assert/strict";
import test from "node:test";

import { createSikesraDatabaseAccess, resolveMigrationDatabaseUrl } from "../../src/db/index.mjs";
import { SIKESRA_DB_MIGRATIONS, SIKESRA_DB_MIGRATION_SEAM } from "../../src/db/migrations/index.mjs";
import { createSikesraMigrationRunner } from "../../src/db/migrations/runner.mjs";

test("SIKESRA database scaffold exposes redacted connection summary only", () => {
  const database = createSikesraDatabaseAccess({
    DATABASE_URL: buildDatabaseUrl("example.com", "runtime_user"),
    DATABASE_MIGRATION_URL: buildDatabaseUrl("private-db.example.com", "migration_user"),
  });

  assert.equal(database.seam.status, "repository_db_execution_ready");
  assert.equal(database.seam.sourceIssue, "ahliweb/sikesra#59");
  assert.deepEqual(database.getConnectionSummary(), {
    configured: true,
    parseable: true,
    database: "sikesrakobar",
    usernamePresent: true,
    passwordPresent: true,
  });
  assert.deepEqual(database.getMigrationConnectionSummary(), {
    configured: true,
    parseable: true,
    database: "sikesrakobar",
    usernamePresent: true,
    passwordPresent: true,
  });
  assert.equal(database.createMigrationClient().seam.sourceIssue, "ahliweb/sikesra#58");
});

test("SIKESRA migration URL resolution prefers DATABASE_MIGRATION_URL when provided", () => {
  assert.equal(
    resolveMigrationDatabaseUrl({
      DATABASE_URL: buildDatabaseUrl("example.com", "runtime_user"),
      DATABASE_MIGRATION_URL: buildDatabaseUrl("private-db.example.com", "migration_user"),
    }),
    buildDatabaseUrl("private-db.example.com", "migration_user"),
  );

  assert.equal(
    resolveMigrationDatabaseUrl({
      DATABASE_URL: buildDatabaseUrl("example.com", "runtime_user"),
    }),
    buildDatabaseUrl("example.com", "runtime_user"),
  );
});

function buildDatabaseUrl(hostname, username) {
  return `postgresql://${username}:placeholder-secret@${hostname}:5432/sikesrakobar`;
}

test("SIKESRA migration scaffold registers the first religion persistence contract", () => {
  assert.equal(SIKESRA_DB_MIGRATION_SEAM.status, "repository_migration_scaffold_ready");
  assert.equal(SIKESRA_DB_MIGRATION_SEAM.sourceIssue, "ahliweb/sikesra#56");
  assert.deepEqual(SIKESRA_DB_MIGRATIONS.map((migration) => migration.name), [
    "001_create_religion_reference_tables",
  ]);

  const migration = SIKESRA_DB_MIGRATIONS[0];
  assert.equal(migration.kind, "table_contract");
  assert.deepEqual(migration.tables.map((table) => table.name), ["religion_references", "religion_reference_aliases"]);
  assert.equal(migration.seeds.religionReferences.length, 7);
  assert.ok(migration.seeds.religionAliases.some((alias) => alias.normalizedAlias === "kristen_protestan"));
});

test("SIKESRA migration runner reports pending migrations from the registry", () => {
  const runner = createSikesraMigrationRunner();
  const pendingStatus = runner.getStatus();
  const appliedStatus = runner.getStatus({
    appliedNames: ["001_create_religion_reference_tables"],
  });

  assert.equal(pendingStatus.total, 1);
  assert.deepEqual(pendingStatus.pending, ["001_create_religion_reference_tables"]);
  assert.deepEqual(appliedStatus.applied, ["001_create_religion_reference_tables"]);
  assert.deepEqual(appliedStatus.pending, []);
});
