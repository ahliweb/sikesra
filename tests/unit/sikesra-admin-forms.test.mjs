import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_ID_MODULE_CODES,
  SIKESRA_ID_UI_STATES,
  createSikesraIdDisplayModel,
  createSikesraIdExplanationModal,
  formatSikesraIdDisplay,
  parseSikesraId,
  validateSikesraId,
} from "../../src/plugins/sikesra-admin/id-sikesra.mjs";
import {
  SIKESRA_KOBAR_KABUPATEN_CODE,
  SIKESRA_KOBAR_PROVINSI_CODE,
  createCustomRegionFieldModel,
  createRegionOption,
  createSikesraRegionFormGroup,
  createSikesraRegionSelectorState,
} from "../../src/plugins/sikesra-admin/region-model.mjs";
import {
  SIKESRA_MODULE_FORM_DEFINITIONS,
  SIKESRA_MODULE_FORM_ISSUES,
  createSikesraModuleFormModel,
} from "../../src/plugins/sikesra-admin/module-forms.mjs";

test("SIKESRA ID module codes cover all eight module forms", () => {
  assert.equal(Object.keys(SIKESRA_ID_MODULE_CODES).length, 8);
  assert.equal(SIKESRA_ID_MODULE_CODES["05"], "guru_agama");
  assert.equal(SIKESRA_ID_MODULE_CODES["08"], "lansia_terlantar");
});

test("SIKESRA ID parser splits 20 digit identifier into structural segments", () => {
  const parsed = parseSikesraId("62010100105202400001");
  assert.deepEqual(parsed, {
    regionCode: "620101001",
    moduleCode: "05",
    year: "2024",
    seq: "00001",
    moduleKey: "guru_agama",
  });
});

test("SIKESRA ID validation rejects invalid length and unknown module", () => {
  assert.equal(validateSikesraId("123").valid, false);
  assert.equal(validateSikesraId("62010100199202400001").valid, false);
});

test("SIKESRA ID display formatting adds readable separators", () => {
  assert.equal(
    formatSikesraIdDisplay("62010100105202400001"),
    "620101001-05-2024-00001"
  );
});

test("SIKESRA ID display model supports pending, assigned, and invalid states", () => {
  const pending = createSikesraIdDisplayModel(null);
  const assigned = createSikesraIdDisplayModel("62010100105202400001");
  const invalid = createSikesraIdDisplayModel("bad-id");

  assert.equal(pending.state.key, SIKESRA_ID_UI_STATES.pending_assignment.key);
  assert.equal(assigned.state.key, SIKESRA_ID_UI_STATES.assigned.key);
  assert.equal(invalid.state.key, SIKESRA_ID_UI_STATES.invalid_format.key);
});

test("SIKESRA ID explanation modal documents privacy-safe identifier structure", () => {
  const modal = createSikesraIdExplanationModal();
  assert.equal(modal.segments.length, 4);
  assert.match(modal.privacyNote, /tidak mengandung NIK/i);
});

test("SIKESRA region option is disabled when outside operator scope", () => {
  const option = createRegionOption("620101", "Arut Selatan", "kecamatan", false);
  assert.equal(option.inScope, false);
  assert.equal(option.disabled, true);
});

test("SIKESRA region selector defaults to Kobar fixed province and kabupaten", () => {
  const selector = createSikesraRegionSelectorState();
  assert.equal(selector.provinsiCode, SIKESRA_KOBAR_PROVINSI_CODE);
  assert.equal(selector.kabupatenKotaCode, SIKESRA_KOBAR_KABUPATEN_CODE);
  assert.equal(selector.provinsiLocked, true);
  assert.equal(selector.kabupatenKotaLocked, true);
});

test("SIKESRA region selector detects scope violations", () => {
  const selector = createSikesraRegionSelectorState({
    kecamatanCode: "03",
    desaKelurahanCode: "001",
    operatorScope: { kecamatanCode: "01" },
  });
  assert.equal(selector.isInScope, false);
  assert.match(selector.scopeViolationMessage, /di luar cakupan kewenangan/i);
});

test("SIKESRA region form group combines official and custom region validation", () => {
  const group = createSikesraRegionFormGroup({
    officialRegion: { kecamatanCode: "01", desaKelurahanCode: "001" },
    customRegionValue: "RT 05/RW 02",
  });
  assert.equal(group.official.isComplete, true);
  assert.equal(group.custom.isValid, true);
  assert.equal(group.isValid, true);
});

test("SIKESRA custom region field limits overly long labels", () => {
  const field = createCustomRegionFieldModel("x".repeat(101));
  assert.equal(field.isValid, false);
  assert.match(field.validationMessage, /maksimal 100 karakter/i);
});

test("SIKESRA module form definitions cover issues #20-#26 and #43", () => {
  assert.equal(Object.keys(SIKESRA_MODULE_FORM_DEFINITIONS).length, 8);
  assert.equal(SIKESRA_MODULE_FORM_ISSUES.rumah_ibadah, "ahliweb/sikesra#20");
  assert.equal(SIKESRA_MODULE_FORM_ISSUES.lansia_terlantar, "ahliweb/sikesra#43");
});

test("SIKESRA Guru Agama form exposes religion field and no required documents", () => {
  const model = createSikesraModuleFormModel("guru_agama", {
    mode: "create",
    grantedPermissions: ["sikesra.registry.read", "sikesra.registry.religion.read"],
  });

  assert.equal(model.label, "Guru Agama");
  assert.equal(model.requiresDocuments, false);
  assert.equal(model.privacy.vulnerablePerson, false);
  assert.ok(model.fields.primary_identity.some((field) => field.key === "agama"));
});

test("SIKESRA Anak Yatim form applies highly restricted privacy defaults", () => {
  const model = createSikesraModuleFormModel("anak_yatim", {
    mode: "create",
    grantedPermissions: ["sikesra.registry.read"],
  });

  const nikField = model.fields.primary_identity.find((field) => field.key === "nik");
  assert.equal(model.privacy.vulnerablePerson, true);
  assert.equal(model.privacy.classification, "highly_restricted");
  assert.equal(nikField.sensitiveDisplay.classification, "highly_restricted");
  assert.equal(nikField.sensitiveDisplay.mode, "masked");
});

test("SIKESRA Disabilitas and Lansia forms include sensitive health-related fields", () => {
  const disabilitas = createSikesraModuleFormModel("disabilitas", {
    mode: "edit_draft",
    grantedPermissions: ["sikesra.registry.read"],
  });
  const lansia = createSikesraModuleFormModel("lansia_terlantar", {
    mode: "edit_draft",
    grantedPermissions: ["sikesra.registry.read"],
  });

  assert.ok(disabilitas.fields.module_detail.some((field) => field.key === "catatan_disabilitas"));
  assert.ok(lansia.fields.module_detail.some((field) => field.key === "catatan_kesehatan"));
});

test("SIKESRA module form model attaches region and ID infrastructure", () => {
  const model = createSikesraModuleFormModel("rumah_ibadah", {
    mode: "create",
    idSikesra: null,
    officialRegion: { kecamatanCode: "01", desaKelurahanCode: "001" },
    customRegionValue: "RW 03",
    grantedPermissions: ["sikesra.registry.read"],
  });

  assert.equal(model.idSikesra.state.key, "pending_assignment");
  assert.equal(model.region.isComplete, true);
  assert.equal(model.region.custom.value, "RW 03");
});

test("SIKESRA agama fields stay hidden without explicit religion permission", () => {
  const model = createSikesraModuleFormModel("guru_agama", {
    mode: "create",
    grantedPermissions: ["sikesra.registry.read"],
  });
  const agamaField = model.fields.primary_identity.find((field) => field.key === "agama");
  assert.equal(agamaField.model.options.length, 0);
});

test("SIKESRA module form backend dependencies reference religion and document issues", () => {
  const rumahIbadah = createSikesraModuleFormModel("rumah_ibadah", {
    grantedPermissions: ["sikesra.registry.read"],
  });
  const guruAgama = createSikesraModuleFormModel("guru_agama", {
    grantedPermissions: ["sikesra.registry.read"],
  });

  assert.ok(rumahIbadah.backendDependencies.includes("ahliweb/sikesra#49"));
  assert.ok(rumahIbadah.backendDependencies.includes("ahliweb/sikesra#28"));
  assert.ok(guruAgama.backendDependencies.includes("ahliweb/sikesra#49"));
  assert.ok(!guruAgama.backendDependencies.includes("ahliweb/sikesra#28"));
});

test("SIKESRA module form rejects unknown module keys", () => {
  assert.throws(() => createSikesraModuleFormModel("unknown_module"), /Unknown SIKESRA module form/);
});
