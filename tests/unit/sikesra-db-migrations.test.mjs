import assert from "node:assert/strict";
import test from "node:test";

import { createSikesraDatabaseAccess } from "../../src/db/index.mjs";
import { SIKESRA_DB_MIGRATIONS, SIKESRA_DB_MIGRATION_SEAM } from "../../src/db/migrations/index.mjs";
import { createSikesraMigrationRunner } from "../../src/db/migrations/runner.mjs";

test("SIKESRA database scaffold exposes redacted connection summary only", () => {
  const database = createSikesraDatabaseAccess({
    DATABASE_URL: "postgresql://runtime_user:super-secret@example.com:5432/sikesrakobar",
  });

  assert.equal(database.seam.status, "repository_db_scaffold_ready");
  assert.equal(database.seam.sourceIssue, "ahliweb/sikesra#55");
  assert.deepEqual(database.getConnectionSummary(), {
    configured: true,
    parseable: true,
    database: "sikesrakobar",
    usernamePresent: true,
    passwordPresent: true,
  });
});

test("SIKESRA migration scaffold registers the first religion persistence contract", () => {
  assert.equal(SIKESRA_DB_MIGRATION_SEAM.status, "repository_migration_scaffold_ready");
  assert.deepEqual(SIKESRA_DB_MIGRATIONS.map((migration) => migration.name), [
    "001_religion_reference_persistence_contract",
  ]);
});

test("SIKESRA migration runner reports pending migrations from the registry", () => {
  const runner = createSikesraMigrationRunner();
  const pendingStatus = runner.getStatus();
  const appliedStatus = runner.getStatus({
    appliedNames: ["001_religion_reference_persistence_contract"],
  });

  assert.equal(pendingStatus.total, 1);
  assert.deepEqual(pendingStatus.pending, ["001_religion_reference_persistence_contract"]);
  assert.deepEqual(appliedStatus.applied, ["001_religion_reference_persistence_contract"]);
  assert.deepEqual(appliedStatus.pending, []);
});
