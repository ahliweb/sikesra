import assert from "node:assert/strict";
import test from "node:test";

import { listReligionReferenceOptions } from "../../src/api/routes/references.ts";

test("religion reference route helper returns controlled options", async () => {
  const options = await listReligionReferenceOptions({ includeInactive: false });

  assert.deepEqual(
    options.map((item) => item.value),
    ["islam", "kristen", "katolik", "hindu", "buddha", "konghucu", "kepercayaan"],
  );
  assert.ok(options.every((item) => typeof item.referenceId === "string"));
  assert.ok(options.every((item) => item.active === true));
});

test("religion reference route helper supports includeInactive flag safely", async () => {
  const options = await listReligionReferenceOptions({ includeInactive: true });

  assert.ok(Array.isArray(options));
  assert.ok(options.length >= 7);
});
