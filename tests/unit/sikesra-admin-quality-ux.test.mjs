import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_ACCESSIBILITY_CHECKS,
  SIKESRA_RESPONSIVE_BREAKPOINTS,
  createSikesraAccessibilityChecklistModel,
  createSikesraControlAccessibilityModel,
  createSikesraInlineErrorAccessibilityModel,
  createSikesraKeyboardFlowModel,
  createSikesraResponsiveFormModel,
  createSikesraResponsiveLayoutModel,
  createSikesraResponsiveTableModel,
} from "../../src/plugins/sikesra-admin/quality-ux.mjs";

test("SIKESRA accessibility checklist covers required MVP usability checks", () => {
  const keys = SIKESRA_ACCESSIBILITY_CHECKS.map((item) => item.key);
  assert.deepEqual(keys, [
    "explicit_labels",
    "badge_not_color_only",
    "inline_error_messages",
    "keyboard_navigation",
    "table_usability",
  ]);
});

test("SIKESRA accessibility checklist can mark passed checks", () => {
  const checklist = createSikesraAccessibilityChecklistModel({
    passedChecks: ["explicit_labels", "keyboard_navigation"],
  });
  assert.equal(checklist.checks.find((item) => item.key === "explicit_labels").passed, true);
  assert.equal(checklist.checks.find((item) => item.key === "badge_not_color_only").passed, false);
});

test("SIKESRA control accessibility model requires explicit label or aria-label", () => {
  const invalid = createSikesraControlAccessibilityModel({
    controlType: "icon_button",
    iconOnly: true,
    keyboardFocusable: true,
  });
  const valid = createSikesraControlAccessibilityModel({
    controlType: "icon_button",
    iconOnly: true,
    ariaLabel: "Buka Detail",
    keyboardFocusable: true,
  });

  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.includes("label_required"));
  assert.equal(valid.valid, true);
});

test("SIKESRA control accessibility model rejects status that relies on color only", () => {
  const invalid = createSikesraControlAccessibilityModel({
    visibleLabel: "Status",
    keyboardFocusable: true,
    statusUsesColorOnly: true,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.includes("status_text_required"));
});

test("SIKESRA inline error accessibility model requires near-field Indonesian message", () => {
  const valid = createSikesraInlineErrorAccessibilityModel({
    fieldLabel: "NIK",
    message: "NIK: Wajib diisi.",
    nearField: true,
  });
  const invalid = createSikesraInlineErrorAccessibilityModel({
    fieldLabel: "NIK",
    message: "",
    nearField: false,
  });

  assert.equal(valid.valid, true);
  assert.equal(valid.language, "id");
  assert.equal(invalid.valid, false);
});

test("SIKESRA keyboard flow model validates reachable focus steps", () => {
  const valid = createSikesraKeyboardFlowModel({
    flowName: "Form Utama",
    steps: [
      { target: "Nama", action: "Tab", reachable: true },
      { target: "Simpan", action: "Tab", reachable: true },
    ],
  });
  const invalid = createSikesraKeyboardFlowModel({
    flowName: "Modal Dokumen",
    steps: [{ target: "Tutup", action: "Esc", reachable: false }],
  });

  assert.equal(valid.valid, true);
  assert.equal(invalid.valid, false);
});

test("SIKESRA responsive breakpoints cover desktop tablet and mobile review", () => {
  const keys = SIKESRA_RESPONSIVE_BREAKPOINTS.map((item) => item.key);
  assert.deepEqual(keys, ["desktop", "tablet", "mobile_review"]);
});

test("SIKESRA responsive layout model describes dashboard behavior across breakpoints", () => {
  const model = createSikesraResponsiveLayoutModel({ surface: "dashboard" });
  assert.equal(model.breakpoints.length, 3);
  assert.match(model.breakpoints[0].behavior, /Grid/i);
  assert.match(model.maskingInvariant, /sensitif/i);
});

test("SIKESRA responsive table model uses card fallback on mobile review", () => {
  const model = createSikesraResponsiveTableModel({ surface: "registry", rows: [{ id: 1 }, { id: 2 }] });
  assert.equal(model.desktop.mode, "wide_table");
  assert.equal(model.tablet.mode, "scrollable_table");
  assert.equal(model.mobileReview.mode, "card_list");
  assert.equal(model.mobileReview.cardCount, 2);
});

test("SIKESRA responsive form model uses step mode on mobile review", () => {
  const model = createSikesraResponsiveFormModel({ surface: "form", readOnlyPreferred: true });
  assert.equal(model.desktop.mode, "sectioned_form");
  assert.equal(model.mobileReview.mode, "step_mode");
  assert.equal(model.mobileReview.readOnlyPreferred, true);
});
