import assert from "node:assert/strict";
import test from "node:test";

import { SIKESRA_RELIGION_REFERENCE_SOURCE } from "../../src/plugins/sikesra-admin/religion-reference.mjs";

test("religion reference source advertises reviewed backend route handoff", () => {
  assert.equal(SIKESRA_RELIGION_REFERENCE_SOURCE.route, "/api/v1/references/religions");
  assert.deepEqual(SIKESRA_RELIGION_REFERENCE_SOURCE.routeQuery, {
    includeInactive: "true|false",
  });
  assert.match(SIKESRA_RELIGION_REFERENCE_SOURCE.routeUsage, /consumer async\/runtime baru/i);
  assert.match(SIKESRA_RELIGION_REFERENCE_SOURCE.note, /handoff route runtime read-only/i);
});
