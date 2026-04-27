import assert from "node:assert/strict";
import test from "node:test";

import { listReligionReferenceOptions } from "../../src/api/routes/references.ts";

test("religion reference route helper returns controlled options", async () => {
  const result = await listReligionReferenceOptions({ includeInactive: false, permissions: [] });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.options.map((item) => item.value),
    ["islam", "kristen", "katolik", "hindu", "buddha", "konghucu", "kepercayaan"],
  );
  assert.ok(result.options.every((item) => typeof item.referenceId === "string"));
  assert.ok(result.options.every((item) => item.active === true));
  assert.equal(result.auditAction, null);
});

test("religion reference route helper denies includeInactive without reference.manage", async () => {
  const result = await listReligionReferenceOptions({ includeInactive: true, permissions: [] });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 403);
  assert.equal(result.code, "RELIGION_REFERENCE_INACTIVE_FORBIDDEN");
});

test("religion reference route helper supports includeInactive with reference.manage", async () => {
  const result = await listReligionReferenceOptions({
    includeInactive: true,
    permissions: ["sikesra.reference.manage"],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(Array.isArray(result.options));
  assert.ok(result.options.length >= 7);
  assert.equal(result.auditAction, "sikesra.reference.inactive_read");
});
