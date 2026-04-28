import assert from "node:assert/strict";
import test from "node:test";

import {
  SIKESRA_ADMIN_PAGES,
  SIKESRA_ADMIN_PERMISSIONS,
  SIKESRA_ADMIN_ROUTE_PLACEHOLDERS,
  SIKESRA_ADMIN_SHELL_SECTIONS,
  filterSikesraAdminPagesByPermissions,
  flattenSikesraAdminPages,
  createSikesraAdminShellNavigation,
  sikesraAdminPlugin,
} from "../../src/plugins/sikesra-admin/index.mjs";
import {
  SIKESRA_HOST_REGISTRATION,
  appendSikesraAdminPlugin,
  createSikesraAdminHostShellState,
  createAstroConfigRegistrationPatch,
} from "../../src/plugins/sikesra-admin/host-registration.mjs";
import {
  SIKESRA_STATUS_BADGE_CLASS_BY_TONE,
  SIKESRA_STATUS_BADGE_DEFINITIONS,
  createSikesraStatusBadgeProps,
  getSikesraStatusBadge,
  listSikesraStatusBadgeDefinitions,
} from "../../src/plugins/sikesra-admin/status-badges.mjs";
import {
  SIKESRA_SENSITIVE_CLASSIFICATIONS,
  createSikesraSensitiveFieldProps,
  maskSikesraSensitiveValue,
} from "../../src/plugins/sikesra-admin/sensitive-fields.mjs";
import {
  SIKESRA_FORM_INLINE_MESSAGES,
  SIKESRA_FORM_MODES,
  SIKESRA_FORM_SECTIONS,
  createSikesraFormWizardState,
  createSikesraInlineValidation,
} from "../../src/plugins/sikesra-admin/form-wizard.mjs";
import {
  SIKESRA_AGAMA_FIELD_CONTEXTS,
  SIKESRA_RELIGION_OPTIONS,
  createSikesraAgamaSelectModel,
  mapSikesraReligionImportValue,
  normalizeSikesraReligionValue,
} from "../../src/plugins/sikesra-admin/religion-reference.mjs";
import {
  SIKESRA_MODULE_KEYS,
  SIKESRA_MODULE_LABELS,
  SIKESRA_VULNERABLE_PERSON_MODULES,
  SIKESRA_DASHBOARD_QUICK_ACTIONS,
  createSikesraDashboardQuickActions,
  createSikesraDashboardFilter,
  createSikesraStatCard,
  createSikesraStatCards,
  createVerificationStatusWidget,
  createAttentionSummaryEntry,
  createActivityTimelineItem,
  createSikesraDashboardLayout,
} from "../../src/plugins/sikesra-admin/dashboard-widgets.mjs";
import {
  SIKESRA_REGISTRY_COLUMNS,
  createSikesraRegistryFilter,
  createSikesraRegistryRow,
  createSikesraRegistryRowActions,
  createSikesraRegistryListModel,
  getSikesraRegistryVisibleColumns,
  SIKESRA_REGISTRY_LIST_STATE_LABELS,
} from "../../src/plugins/sikesra-admin/registry-list.mjs";
import {
  SIKESRA_DETAIL_TABS,
  getSikesraDetailVisibleTabs,
  createSikesraDetailHeader,
  createSikesraDetailActions,
  createSikesraDetailSensitiveFieldModel,
  createSikesraDetailPageModel,
  SIKESRA_DETAIL_SENSITIVE_FIELD_KEYS,
} from "../../src/plugins/sikesra-admin/detail-page.mjs";

test("SIKESRA admin plugin exposes an EmDash-compatible descriptor", () => {
  const plugin = sikesraAdminPlugin();

  assert.equal(plugin.id, "sikesra-admin");
  assert.equal(plugin.format, "native");
  assert.equal(plugin.entrypoint, "/src/plugins/sikesra-admin/index.mjs");
  assert.equal(plugin.adminEntry, "/src/plugins/sikesra-admin/index.mjs");
  assert.deepEqual(plugin.permissions, SIKESRA_ADMIN_PERMISSIONS);
  assert.deepEqual(plugin.adminPages, SIKESRA_ADMIN_PAGES);
  assert.deepEqual(plugin.routePlaceholders, SIKESRA_ADMIN_ROUTE_PLACEHOLDERS);
});

test("SIKESRA admin pages cover the MVP menu labels", () => {
  const labels = flattenPages(SIKESRA_ADMIN_PAGES).map((page) => page.label);

  assert.deepEqual(
    [
      "Dashboard SIKESRA",
      "Pages",
      "Posts",
      "Media",
      "Registry Data",
      "Verifikasi Data",
      "Dokumen Pendukung",
      "Import Excel",
      "Laporan & Export",
      "Wilayah & Kodefikasi",
      "Audit Log",
      "Pengguna & Akses",
      "Pengaturan",
      "Lansia Terlantar",
      "Guru Agama",
    ].every((label) => labels.includes(label)),
    true,
  );
});

test("SIKESRA menu entries avoid technical operator-facing labels", () => {
  for (const page of flattenPages(SIKESRA_ADMIN_PAGES)) {
    assert.equal(/entity|object_type_code|uuid/i.test(page.label), false, page.label);
    assert.equal(page.group, "SIKESRA");
    assert.equal(typeof page.permissionCode, "string");
    assert.equal(page.sensitivity, "restricted");
  }
});

test("SIKESRA permissions use one permission code per top-level admin page", () => {
  const permissionCodes = new Set(SIKESRA_ADMIN_PERMISSIONS.map((permission) => permission.code));

  for (const page of SIKESRA_ADMIN_PAGES) {
    assert.equal(permissionCodes.has(page.permissionCode), true, page.permissionCode);
  }
});

test("SIKESRA admin route placeholders mirror the flattened menu", () => {
  const pagePaths = flattenSikesraAdminPages().map((page) => page.path).sort();
  const routePaths = SIKESRA_ADMIN_ROUTE_PLACEHOLDERS.map((route) => route.path).sort();

  assert.deepEqual(routePaths, pagePaths);

  for (const route of SIKESRA_ADMIN_ROUTE_PLACEHOLDERS) {
    assert.equal(route.status, "placeholder");
    assert.equal(route.implementationIssue, "ahliweb/sikesra#13");
    assert.equal(typeof route.permissionCode, "string");
  }
});

test("SIKESRA admin menu can be filtered by permission metadata", () => {
  const visible = filterSikesraAdminPagesByPermissions(["sikesra.dashboard.read", "sikesra.registry.read"]);
  const labels = flattenPages(visible).map((page) => page.label);

  assert.equal(labels.includes("Dashboard SIKESRA"), true);
  assert.equal(labels.includes("Registry Data"), true);
  assert.equal(labels.includes("Anak Yatim/Piatu"), true);
  assert.equal(labels.includes("Audit Log"), false);
  assert.equal(labels.includes("Pengaturan"), false);
});

test("SIKESRA shell sections group overview operations and administration routes", () => {
  const navigation = createSikesraAdminShellNavigation({
    grantedPermissions: SIKESRA_ADMIN_PERMISSIONS.map((permission) => permission.code),
    currentPath: "/",
  });

  assert.deepEqual(
    navigation.sections.map((section) => section.label),
    SIKESRA_ADMIN_SHELL_SECTIONS.map((section) => section.label),
  );
  assert.equal(navigation.sections[0].items.some((item) => item.label === "Dashboard SIKESRA"), true);
  assert.equal(navigation.sections[1].items.some((item) => item.label === "Pages"), true);
  assert.equal(navigation.sections[2].items.some((item) => item.label === "Registry Data"), true);
  assert.equal(navigation.sections[3].items.some((item) => item.label === "Pengguna & Akses"), true);
});

test("SIKESRA content shell section only shows pages posts and media when permissions are granted", () => {
  const navigation = createSikesraAdminShellNavigation({
    grantedPermissions: ["emdash.pages.read", "emdash.posts.read", "emdash.media.read"],
    currentPath: "/media",
  });

  assert.deepEqual(navigation.sections.map((section) => section.label), ["Konten"]);
  assert.deepEqual(
    navigation.sections[0].items.map((item) => item.label),
    ["Pages", "Posts", "Media"],
  );
  assert.equal(navigation.activeItem.label, "Media");
});

test("SIKESRA shell navigation marks parent items expanded for active child routes", () => {
  const navigation = createSikesraAdminShellNavigation({
    grantedPermissions: ["sikesra.registry.read"],
    currentPath: "/registry/guru-agama",
  });

  const operations = navigation.sections.find((section) => section.label === "Layanan SIKESRA");
  const registry = operations.items.find((item) => item.label === "Registry Data");
  const teacher = registry.children.find((item) => item.label === "Guru Agama");

  assert.equal(operations.selected, true);
  assert.equal(registry.selected, true);
  assert.equal(registry.expanded, true);
  assert.equal(teacher.selected, true);
  assert.equal(navigation.activeItem.label, "Guru Agama");
});

test("SIKESRA shell navigation hides empty sections after permission filtering", () => {
  const navigation = createSikesraAdminShellNavigation({
    grantedPermissions: ["sikesra.dashboard.read"],
    currentPath: "/",
  });

  assert.deepEqual(navigation.sections.map((section) => section.label), ["Ringkasan"]);
  assert.equal(navigation.hasNavigation, true);
  assert.equal(navigation.activeItem.label, "Dashboard SIKESRA");
});

test("SIKESRA host registration appends the plugin once", () => {
  const existing = [{ id: "awcms-users-admin" }];
  const plugins = appendSikesraAdminPlugin(existing);
  const registeredTwice = appendSikesraAdminPlugin(plugins);

  assert.equal(plugins.length, 2);
  assert.equal(plugins[1].id, "sikesra-admin");
  assert.equal(registeredTwice.length, 2);
});

test("SIKESRA host registration documents the EmDash integration seam", () => {
  const patch = createAstroConfigRegistrationPatch();

  assert.equal(SIKESRA_HOST_REGISTRATION.upstreamConfigFile, "astro.config.mjs");
  assert.equal(SIKESRA_HOST_REGISTRATION.emdashIntegrationOption, "plugins");
  assert.match(patch, /sikesraAdminPlugin/);
  assert.match(patch, /plugins: \[awcmsUsersAdminPlugin\(\), sikesraAdminPlugin\(\)\]/);
  assert.match(patch, /createSikesraAdminHostShellState/);
});

test("SIKESRA host shell state derives grouped navigation from the plugin descriptor", () => {
  const shell = createSikesraAdminHostShellState({
    currentPath: "/audit",
    grantedPermissions: ["sikesra.audit.read"],
  });

  assert.equal(shell.pluginId, "sikesra-admin");
  assert.equal(shell.currentPath, "/audit");
  assert.equal(shell.navigation.sections.length, 1);
  assert.equal(shell.navigation.sections[0].label, "Administrasi");
  assert.equal(shell.navigation.activeItem.label, "Audit Log");
});

test("SIKESRA host shell state rejects non-SIKESRA plugin descriptors", () => {
  assert.throws(
    () => createSikesraAdminHostShellState({ plugin: { id: "awcms-users-admin", adminPages: [] } }),
    /valid SIKESRA admin plugin descriptor/
  );
});

test("SIKESRA status badges cover required MVP states", () => {
  const requiredStates = [
    "draft",
    "submitted",
    "verified",
    "need_revision",
    "rejected",
    "active",
    "archived",
    "pending",
    "incomplete",
    "restricted",
    "highly_restricted",
  ];

  assert.deepEqual(Object.keys(SIKESRA_STATUS_BADGE_DEFINITIONS).sort(), requiredStates.sort());
});

test("SIKESRA status badges provide accessible Indonesian text labels", () => {
  for (const definition of Object.values(SIKESRA_STATUS_BADGE_DEFINITIONS)) {
    const props = createSikesraStatusBadgeProps(definition.status, { context: "Status data" });

    assert.equal(typeof props.label, "string");
    assert.equal(props.label.length > 0, true);
    assert.equal(props.textOnly, props.label);
    assert.equal(props.ariaLabel, `Status data: ${props.label}`);
    assert.equal(props.className, SIKESRA_STATUS_BADGE_CLASS_BY_TONE[props.tone]);
    assert.equal(/nik|kia|kk|uuid|entity|object_type/i.test(props.label), false);
  }
});

test("SIKESRA status badge helpers normalize aliases and fall back safely", () => {
  assert.equal(getSikesraStatusBadge("need-revision").status, "need_revision");
  assert.equal(getSikesraStatusBadge("HIGHLY RESTRICTED").status, "highly_restricted");
  assert.equal(getSikesraStatusBadge("unknown").status, "pending");
});

test("SIKESRA status badge categories cover data, verification, document, and sensitivity", () => {
  assert.equal(listSikesraStatusBadgeDefinitions("data").length > 0, true);
  assert.equal(listSikesraStatusBadgeDefinitions("verification").length > 0, true);
  assert.equal(listSikesraStatusBadgeDefinitions("document").length > 0, true);
  assert.equal(listSikesraStatusBadgeDefinitions("sensitivity").length, 2);
});

test("SIKESRA sensitive fields mask NIK/KIA by default", () => {
  const props = createSikesraSensitiveFieldProps({ value: "6201010101010001", fieldType: "nik" });

  assert.equal(props.mode, "masked");
  assert.equal(props.displayValue.endsWith("0001"), true);
  assert.equal(props.displayValue.includes("620101010101"), false);
  assert.equal(props.canCopy, false);
  assert.equal(props.auditAction, null);
});

test("SIKESRA sensitive fields support hidden, masked, and full modes", () => {
  assert.equal(createSikesraSensitiveFieldProps({ value: "" }).mode, "hidden");
  assert.equal(createSikesraSensitiveFieldProps({ value: "6201010101010001" }).mode, "masked");
  assert.equal(
    createSikesraSensitiveFieldProps({
      value: "6201010101010001",
      canReveal: true,
      revealRequested: true,
    }).mode,
    "full",
  );
});

test("SIKESRA highly restricted fields require step-up before full reveal", () => {
  const blocked = createSikesraSensitiveFieldProps({
    value: "6201010101010001",
    classification: "highly_restricted",
    canReveal: true,
    revealRequested: true,
  });
  const revealed = createSikesraSensitiveFieldProps({
    value: "6201010101010001",
    classification: "highly_restricted",
    canReveal: true,
    revealRequested: true,
    stepUpSatisfied: true,
    canCopy: true,
  });

  assert.equal(blocked.mode, "masked");
  assert.equal(blocked.revealBlockedReason, "step_up_required");
  assert.equal(revealed.mode, "full");
  assert.equal(revealed.canCopy, true);
  assert.equal(revealed.auditAction, "sikesra.sensitive_field.reveal");
});

test("SIKESRA sensitive field copy and reveal affordances require permission", () => {
  const blocked = createSikesraSensitiveFieldProps({
    value: "6201010101010001",
    canReveal: false,
    canCopy: true,
    revealRequested: true,
  });

  assert.equal(blocked.mode, "masked");
  assert.equal(blocked.canCopy, false);
  assert.equal(blocked.revealBlockedReason, "permission_required");
});

test("SIKESRA sensitive field helpers avoid exposing personal values in labels", () => {
  assert.equal(Object.keys(SIKESRA_SENSITIVE_CLASSIFICATIONS).sort().join(","), "highly_restricted,restricted");
  assert.equal(maskSikesraSensitiveValue("081234567890", "phone").endsWith("890"), true);

  const props = createSikesraSensitiveFieldProps({ value: "Anak Contoh", fieldType: "child_name", context: "Nama anak" });
  assert.equal(props.ariaLabel, "Nama anak: disamarkan");
  assert.equal(props.displayValue.includes("Contoh"), false);
  assert.match(props.warning, /terbatas/i);
});

test("SIKESRA form wizard covers the global PRD sections", () => {
  const labels = SIKESRA_FORM_SECTIONS.map((section) => section.label);

  assert.deepEqual(labels, [
    "Kode dan Kategori",
    "Wilayah dan Alamat",
    "Identitas Utama",
    "Detail Khusus Modul",
    "Personil Terkait",
    "Dokumen",
    "Status dan Catatan",
    "Ringkasan Sebelum Submit",
  ]);
});

test("SIKESRA form wizard supports required modes and progress", () => {
  assert.deepEqual(SIKESRA_FORM_MODES, ["create", "edit_draft", "edit_need_revision", "read_only", "verify"]);

  const state = createSikesraFormWizardState({
    mode: "edit-need-revision",
    hasUnsavedChanges: true,
    values: {
      completeness: {
        code_category: true,
        region_address: true,
        primary_identity: true,
      },
    },
  });

  assert.equal(state.mode, "edit_need_revision");
  assert.equal(state.progress.completed, 3);
  assert.equal(state.progress.total, 8);
  assert.match(state.unsavedChangesWarning, /belum disimpan/i);
});

test("SIKESRA form wizard applies conditional visibility", () => {
  const createState = createSikesraFormWizardState({ mode: "create" });
  const readOnlyState = createSikesraFormWizardState({ mode: "read_only" });
  const createLabels = createState.sections.map((section) => section.label);
  const readOnlyLabels = readOnlyState.sections.map((section) => section.label);

  assert.equal(createLabels.includes("Status dan Catatan"), false);
  assert.equal(createLabels.includes("Ringkasan Sebelum Submit"), true);
  assert.equal(readOnlyLabels.includes("Ringkasan Sebelum Submit"), false);
  assert.equal(readOnlyState.readOnly, true);
});

test("SIKESRA form wizard supports verify/read-only behavior", () => {
  const verifyState = createSikesraFormWizardState({ mode: "verify" });
  const readOnlyState = createSikesraFormWizardState({ mode: "read_only" });

  assert.equal(verifyState.verifyMode, true);
  assert.equal(verifyState.readOnly, true);
  assert.equal(readOnlyState.canSubmit, false);
});

test("SIKESRA inline validation messages are clear Indonesian text", () => {
  const validation = createSikesraInlineValidation("NIK/KIA", "required");

  assert.equal(validation.message, "NIK/KIA: Wajib diisi.");
  assert.match(SIKESRA_FORM_INLINE_MESSAGES.sensitive_masked, /disamarkan/i);
  assert.equal(/object_type|uuid|entity/i.test(validation.message), false);
});

test("SIKESRA religion reference uses controlled Indonesian labels", () => {
  const labels = SIKESRA_RELIGION_OPTIONS.map((option) => option.label);

  assert.deepEqual(labels, ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Kepercayaan Terhadap Tuhan YME"]);
  assert.equal(SIKESRA_AGAMA_FIELD_CONTEXTS.elderly, "Agama Lansia");
  assert.equal(SIKESRA_AGAMA_FIELD_CONTEXTS.caregiver, "Agama Pendamping/Penanggung Jawab");
});

test("SIKESRA religion reference normalizes spelling variants", () => {
  assert.deepEqual(normalizeSikesraReligionValue("Katholik"), { value: "katolik", label: "Katolik" });
  assert.deepEqual(normalizeSikesraReligionValue("Budha"), { value: "buddha", label: "Buddha" });
  assert.deepEqual(normalizeSikesraReligionValue("Konghuchu"), { value: "konghucu", label: "Konghucu" });
});

test("SIKESRA religion import mapping rejects unknown free text", () => {
  const mapped = mapSikesraReligionImportValue("Kristen Protestan");
  const unknown = mapSikesraReligionImportValue("Agama Tidak Dikenal");

  assert.equal(mapped.ok, true);
  assert.equal(mapped.value, "kristen");
  assert.equal(unknown.ok, false);
  assert.match(unknown.message, /tidak ditemukan/i);
});

test("SIKESRA Agama select model supports required, read-only, and privacy states", () => {
  const model = createSikesraAgamaSelectModel({ subject: "child", value: "Islam", required: true, canViewIndividualReligion: true });
  const restricted = createSikesraAgamaSelectModel({ subject: "elderly", value: "Katolik", canViewIndividualReligion: false });
  const readOnly = createSikesraAgamaSelectModel({ subject: "institution", value: "Hindu", readOnly: true, individualLevel: false });

  assert.equal(model.label, "Agama Anak");
  assert.equal(model.freeTextAllowed, false);
  assert.equal(model.validation, null);
  assert.equal(restricted.label, "Agama Lansia");
  assert.equal(restricted.displayValue, "Disamarkan");
  assert.equal(restricted.options.length, 0);
  assert.equal(model.loadStrategy.mode, "sync_seed_fallback");
  assert.equal(model.loadStrategy.handoffState, "async_route_ready");
  assert.equal(model.loadStrategy.runtimeRoute, "/api/v1/references/religions");
  assert.equal(model.optionsSource.kind, "reference_route_handoff");
  assert.equal(model.optionsSource.route, "/api/v1/references/religions");
  assert.equal(readOnly.readOnly, true);
  assert.equal(readOnly.disabled, true);
  assert.equal(readOnly.displayValue, "Hindu");
});

test("SIKESRA Agama select model avoids internal field names", () => {
  const model = createSikesraAgamaSelectModel({ subject: "teacher", usage: "filter" });
  const serialized = JSON.stringify(model);

  assert.equal(model.label, "Agama Guru");
  assert.equal(/religion_reference_id|religion_code/i.test(serialized), false);
});

function flattenPages(pages) {
  return pages.flatMap((page) => [page, ...flattenPages(page.children ?? [])]);
}

// ---------------------------------------------------------------------------
// Dashboard widget model tests (#17)
// ---------------------------------------------------------------------------

test("SIKESRA dashboard module keys cover all eight MVP modules", () => {
  assert.equal(SIKESRA_MODULE_KEYS.length, 8);
  assert.ok(SIKESRA_MODULE_KEYS.includes("lansia_terlantar"));
  assert.ok(SIKESRA_MODULE_KEYS.includes("anak_yatim"));
  assert.ok(SIKESRA_MODULE_KEYS.includes("disabilitas"));
  assert.ok(SIKESRA_MODULE_KEYS.includes("guru_agama"));
});

test("SIKESRA vulnerable person modules are correctly identified", () => {
  assert.ok(SIKESRA_VULNERABLE_PERSON_MODULES.has("anak_yatim"));
  assert.ok(SIKESRA_VULNERABLE_PERSON_MODULES.has("disabilitas"));
  assert.ok(SIKESRA_VULNERABLE_PERSON_MODULES.has("lansia_terlantar"));
  assert.ok(!SIKESRA_VULNERABLE_PERSON_MODULES.has("guru_agama"));
  assert.ok(!SIKESRA_VULNERABLE_PERSON_MODULES.has("rumah_ibadah"));
});

test("SIKESRA stat card model has expected shape and never contains personal data", () => {
  const card = createSikesraStatCard("lansia_terlantar", { total: 42, regionScope: "Kec. Kobar" });
  assert.equal(card.moduleKey, "lansia_terlantar");
  assert.equal(card.label, "Lansia Terlantar");
  assert.equal(card.total, 42);
  assert.equal(card.regionScope, "Kec. Kobar");
  assert.equal(card.isVulnerablePerson, true);
  assert.equal(card.containsPersonalData, false);
  assert.ok(card.routeTarget.includes("lansia_terlantar"));
});

test("SIKESRA stat cards returns all eight module stubs", () => {
  const cards = createSikesraStatCards();
  assert.equal(cards.length, 8);
  assert.ok(cards.every((c) => c.total === null));
  assert.ok(cards.every((c) => c.containsPersonalData === false));
});

test("SIKESRA dashboard filter defaults all fields to null", () => {
  const filter = createSikesraDashboardFilter();
  assert.equal(filter.wilayah_kecamatan, null);
  assert.equal(filter.module_key, null);
  assert.equal(filter.period_year, null);
});

test("SIKESRA dashboard quick actions map to reviewed EmDash parity actions", () => {
  assert.deepEqual(
    SIKESRA_DASHBOARD_QUICK_ACTIONS.map((action) => action.label),
    ["Halaman Baru", "Post Baru", "Unggah Media"],
  );
});

test("SIKESRA dashboard quick actions are permission-aware", () => {
  const hidden = createSikesraDashboardQuickActions(["sikesra.dashboard.read"]);
  const visible = createSikesraDashboardQuickActions([
    "sikesra.dashboard.read",
    "emdash.pages.write",
    "emdash.posts.write",
    "emdash.media.upload",
  ]);

  assert.equal(hidden.length, 0);
  assert.deepEqual(
    visible.map((action) => action.key),
    ["create_page", "create_post", "upload_media"],
  );
});

test("SIKESRA verification status widget has all required status keys", () => {
  const widget = createVerificationStatusWidget({ verified: 10, draft: 3 });
  assert.equal(widget.widgetType, "verification_status_distribution");
  const keys = widget.statuses.map((s) => s.key);
  assert.ok(keys.includes("draft"));
  assert.ok(keys.includes("verified"));
  assert.ok(keys.includes("need_revision"));
  const verified = widget.statuses.find((s) => s.key === "verified");
  assert.equal(verified.count, 10);
  const submitted = widget.statuses.find((s) => s.key === "submitted");
  assert.equal(submitted.count, null);
});

test("SIKESRA attention summary entry never contains personal data", () => {
  const entry = createAttentionSummaryEntry("anak_yatim", 5, 2);
  assert.equal(entry.moduleKey, "anak_yatim");
  assert.equal(entry.incompleteDocuments, 5);
  assert.equal(entry.needRevision, 2);
  assert.equal(entry.containsPersonalData, false);
});

test("SIKESRA activity timeline item rejects unsafe event types", () => {
  assert.throws(
    () =>
      createActivityTimelineItem({
        eventType: "field_value_changed",
        moduleKey: "guru_agama",
        entityId: "SK-2026-0001",
        actorRole: "Operator",
        occurredAt: "2026-04-27T00:00:00Z",
      }),
    /Unsafe activity event type/
  );
});

test("SIKESRA activity timeline item accepts safe event types", () => {
  const item = createActivityTimelineItem({
    eventType: "record_verified",
    moduleKey: "guru_agama",
    entityId: "SK-2026-0001",
    actorRole: "Verifikator",
    occurredAt: "2026-04-27T00:00:00Z",
  });
  assert.equal(item.eventType, "record_verified");
  assert.equal(item.containsPersonalData, false);
  assert.equal(item.entityId, "SK-2026-0001");
});

test("SIKESRA dashboard layout suppresses religion distribution without explicit permission", () => {
  const layout = createSikesraDashboardLayout({
    roleContext: "admin",
    grantedPermissions: ["sikesra.dashboard.read"],
    filter: createSikesraDashboardFilter(),
  });
  assert.equal(layout.canRender, true);
  assert.equal(layout.visibility.showReligionDistribution, false);
  assert.equal(layout.religionDistribution, null);
  assert.equal(layout.quickActions.length, 0);
});

test("SIKESRA dashboard layout includes quick actions when permissions are granted", () => {
  const layout = createSikesraDashboardLayout({
    roleContext: "admin",
    grantedPermissions: [
      "sikesra.dashboard.read",
      "emdash.pages.write",
      "emdash.posts.write",
      "emdash.media.upload",
    ],
    filter: createSikesraDashboardFilter(),
  });

  assert.deepEqual(
    layout.quickActions.map((action) => action.key),
    ["create_page", "create_post", "upload_media"],
  );
});

test("SIKESRA pimpinan dashboard suppresses attention summary but shows stat cards", () => {
  const layout = createSikesraDashboardLayout({
    roleContext: "pimpinan",
    grantedPermissions: ["sikesra.dashboard.read"],
    filter: createSikesraDashboardFilter(),
  });
  assert.equal(layout.visibility.showAttentionSummary, false);
  assert.equal(layout.visibility.showStatCards, true);
  assert.ok(Array.isArray(layout.statCards));
  assert.ok(layout.attentionSummary.length === 0);
});

// ---------------------------------------------------------------------------
// Registry list view model tests (#18)
// ---------------------------------------------------------------------------

test("SIKESRA registry filter defaults all fields to null/false", () => {
  const filter = createSikesraRegistryFilter();
  assert.equal(filter.module_key, null);
  assert.equal(filter.wilayah_kecamatan, null);
  assert.equal(filter.quick_search, null);
  assert.equal(filter.attention_only, false);
});

test("SIKESRA registry columns include required PRD columns", () => {
  const keys = SIKESRA_REGISTRY_COLUMNS.map((c) => c.key);
  assert.ok(keys.includes("id_sikesra"));
  assert.ok(keys.includes("name"));
  assert.ok(keys.includes("verification_status"));
  assert.ok(keys.includes("document_completeness"));
  assert.ok(keys.includes("actions"));
});

test("SIKESRA registry row model sets isVulnerablePerson correctly", () => {
  const row = createSikesraRegistryRow(
    { module_key: "anak_yatim", id_sikesra: "SK-0001", name: "Test", verification_status: "draft" },
    ["sikesra.registry.read"]
  );
  assert.equal(row.isVulnerablePerson, true);
  assert.equal(row.module_label, "Anak Yatim/Piatu");
});

test("SIKESRA registry row actions are empty without permissions", () => {
  const row = createSikesraRegistryRow(
    { module_key: "guru_agama", verification_status: "draft" },
    []
  );
  assert.equal(row.actions.length, 0);
});

test("SIKESRA registry row actions respect verification status gating", () => {
  const entity = { module_key: "guru_agama", verification_status: "verified" };
  const perms = new Set(["sikesra.registry.write", "sikesra.verification.write", "sikesra.registry.manage"]);
  const actions = createSikesraRegistryRowActions(entity, perms);
  const editAction = actions.find((a) => a.key === "edit");
  const archiveAction = actions.find((a) => a.key === "archive");
  assert.ok(editAction, "edit action should be present for registry.write");
  assert.equal(editAction.enabled, false, "edit should be disabled for verified status");
  assert.ok(archiveAction, "archive action should be present for registry.manage");
  assert.equal(archiveAction.enabled, true, "archive should be enabled for verified status");
});

test("SIKESRA registry list model hides religion filter when no explicit permission", () => {
  const model = createSikesraRegistryListModel({
    grantedPermissions: ["sikesra.registry.read"],
    filter: createSikesraRegistryFilter({ module_key: "guru_agama" }),
    loadState: "loaded",
    rows: [],
    totalCount: 0,
  });
  assert.equal(model.showReligionFilter, false);
  assert.equal(model.religionFilterOptionsSource, null);
});

test("SIKESRA registry list model shows religion filter with explicit permission and module filter", () => {
  const model = createSikesraRegistryListModel({
    grantedPermissions: ["sikesra.registry.read", "sikesra.registry.religion_filter.read"],
    filter: createSikesraRegistryFilter({ module_key: "guru_agama" }),
    loadState: "loaded",
    rows: [],
    totalCount: 0,
  });
  assert.equal(model.showReligionFilter, true);
  assert.equal(model.religionFilterOptionsSource.kind, "reference_route_handoff");
  assert.equal(model.religionFilterOptionsSource.route, "/api/v1/references/religions");
});

test("SIKESRA registry list model loading state label is in Indonesian", () => {
  const model = createSikesraRegistryListModel({
    grantedPermissions: ["sikesra.registry.read"],
    filter: createSikesraRegistryFilter(),
    loadState: "loading",
    rows: [],
  });
  assert.equal(model.stateLabel, SIKESRA_REGISTRY_LIST_STATE_LABELS.loading);
  assert.ok(model.stateLabel.includes("Memuat"));
});

// ---------------------------------------------------------------------------
// Generic detail page model tests (#19)
// ---------------------------------------------------------------------------

test("SIKESRA detail tabs are all covered by base permission set", () => {
  const tabs = getSikesraDetailVisibleTabs(["sikesra.registry.read"]);
  const keys = tabs.map((t) => t.key);
  assert.ok(keys.includes("ringkasan"));
  assert.ok(keys.includes("data_utama"));
  assert.ok(keys.includes("catatan"));
  // Dokumen and Verifikasi require elevated permissions.
  assert.ok(!keys.includes("dokumen"));
  assert.ok(!keys.includes("verifikasi"));
});

test("SIKESRA detail tabs include audit tab only with audit permission", () => {
  const tabsWithAudit = getSikesraDetailVisibleTabs([
    "sikesra.registry.read",
    "sikesra.audit.read",
  ]);
  assert.ok(tabsWithAudit.map((t) => t.key).includes("riwayat_perubahan"));
});

test("SIKESRA detail header masks religion without explicit permission", () => {
  const header = createSikesraDetailHeader(
    { module_key: "guru_agama", agama: "Islam", verification_status: "verified" },
    ["sikesra.registry.read"]
  );
  assert.equal(header.agama, null);
  assert.equal(header.agamaIsRevealed, false);
});

test("SIKESRA detail header reveals religion with explicit permission", () => {
  const header = createSikesraDetailHeader(
    { module_key: "guru_agama", agama: "Kristen" },
    ["sikesra.registry.read", "sikesra.registry.religion.read"]
  );
  assert.equal(header.agama, "Kristen");
  assert.equal(header.agamaIsRevealed, true);
});

test("SIKESRA detail header marks vulnerable person modules correctly", () => {
  const header = createSikesraDetailHeader({ module_key: "disabilitas" }, [
    "sikesra.registry.read",
  ]);
  assert.equal(header.isVulnerablePerson, true);
});

test("SIKESRA detail actions require audit for sensitive operations", () => {
  const actions = createSikesraDetailActions(
    { verification_status: "submitted" },
    ["sikesra.verification.write", "sikesra.reports.export", "sikesra.registry.sensitive.read"]
  );
  const verifyAction = actions.find((a) => a.key === "verify");
  const exportAction = actions.find((a) => a.key === "export_record");
  const revealAction = actions.find((a) => a.key === "reveal_sensitive");
  assert.ok(verifyAction?.auditRequired);
  assert.ok(exportAction?.auditRequired);
  assert.ok(revealAction?.auditRequired);
});

test("SIKESRA detail sensitive fields default to masked display value", () => {
  const model = createSikesraDetailSensitiveFieldModel(
    "nik",
    "1234567890123456",
    new Set(["sikesra.registry.read"])
  );
  assert.equal(model.isRevealed, false);
  assert.equal(model.displayValue, "••••••••");
  assert.equal(model.requiresAuditOnReveal, true);
});

test("SIKESRA detail sensitive fields reveal value with sensitive.read permission", () => {
  const model = createSikesraDetailSensitiveFieldModel(
    "nik",
    "1234567890123456",
    new Set(["sikesra.registry.read", "sikesra.registry.sensitive.read"])
  );
  assert.equal(model.isRevealed, true);
  assert.equal(model.displayValue, "1234567890123456");
});

test("SIKESRA detail page model is not renderable without registry.read permission", () => {
  const model = createSikesraDetailPageModel({
    entity: { module_key: "guru_agama" },
    grantedPermissions: [],
    loadState: "loaded",
  });
  assert.equal(model.canRender, false);
  assert.equal(model.header, null);
  assert.deepEqual(model.actions, []);
});

test("SIKESRA detail page model has all sensitive field stubs for data_utama tab", () => {
  const model = createSikesraDetailPageModel({
    entity: { module_key: "lansia_terlantar" },
    grantedPermissions: ["sikesra.registry.read"],
    loadState: "loaded",
  });
  assert.equal(model.canRender, true);
  assert.equal(model.sensitiveFields.length, SIKESRA_DETAIL_SENSITIVE_FIELD_KEYS.length);
  assert.ok(model.sensitiveFields.every((f) => f.isRevealed === false));
});
