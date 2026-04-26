export const SIKESRA_ACCESSIBILITY_CHECKS = Object.freeze([
  check("explicit_labels", "Semua tombol dan kontrol memiliki label yang jelas."),
  check("badge_not_color_only", "Status badge tidak bergantung pada warna saja."),
  check("inline_error_messages", "Pesan error tampil dekat field dengan bahasa Indonesia yang jelas."),
  check("keyboard_navigation", "Navigasi keyboard berfungsi untuk form, tabel, dan modal utama."),
  check("table_usability", "Tabel tetap terbaca dan dapat digunakan pada desktop dan tablet."),
]);

export const SIKESRA_RESPONSIVE_BREAKPOINTS = Object.freeze([
  breakpoint("desktop", 1280, "Desktop lebar"),
  breakpoint("tablet", 768, "Tablet"),
  breakpoint("mobile_review", 360, "Mobile review"),
]);

export function createSikesraAccessibilityChecklistModel(input = {}) {
  return {
    implementationIssue: "ahliweb/sikesra#36",
    checks: SIKESRA_ACCESSIBILITY_CHECKS.map((item) => ({
      ...item,
      passed: (input.passedChecks ?? []).includes(item.key),
      manual: true,
    })),
    guidance: {
      labelPolicy: "Gunakan label eksplisit pada tombol, ikon aksi, dan kontrol form.",
      languagePolicy: "Gunakan bahasa Indonesia yang jelas dan tidak ambigu untuk error, status, dan bantuan operator.",
      maskingPolicy: "Perubahan aksesibilitas tidak boleh membuka data sensitif atau menghapus masking yang ada.",
    },
  };
}

export function createSikesraControlAccessibilityModel(input = {}) {
  return {
    controlType: input.controlType ?? "button",
    visibleLabel: input.visibleLabel ?? null,
    ariaLabel: input.ariaLabel ?? input.visibleLabel ?? null,
    iconOnly: input.iconOnly === true,
    keyboardFocusable: input.keyboardFocusable !== false,
    statusText: input.statusText ?? null,
    valid:
      Boolean(input.visibleLabel || input.ariaLabel)
      && input.keyboardFocusable !== false
      && !(input.statusUsesColorOnly === true && !input.statusText),
    issues: collectControlIssues(input),
  };
}

export function createSikesraInlineErrorAccessibilityModel(input = {}) {
  const fieldLabel = input.fieldLabel ?? "Kolom";
  const message = input.message ?? "";

  return {
    fieldLabel,
    message,
    nearField: input.nearField !== false,
    language: "id",
    ariaDescribedBy: input.ariaDescribedBy ?? null,
    valid: Boolean(message.trim()) && input.nearField !== false,
  };
}

export function createSikesraKeyboardFlowModel(input = {}) {
  const steps = input.steps ?? [];
  return {
    flowName: input.flowName ?? "Alur Keyboard",
    steps: steps.map((item, index) => ({
      order: index + 1,
      target: item.target,
      action: item.action,
      reachable: item.reachable !== false,
    })),
    valid: steps.every((item) => item.reachable !== false),
  };
}

export function createSikesraResponsiveLayoutModel(input = {}) {
  return {
    implementationIssue: "ahliweb/sikesra#37",
    surface: input.surface ?? "dashboard",
    breakpoints: SIKESRA_RESPONSIVE_BREAKPOINTS.map((point) => ({
      ...point,
      behavior: describeResponsiveBehavior(input.surface, point.key),
    })),
    maskingInvariant: "Transformasi responsif tidak boleh membuka nilai sensitif yang sebelumnya dimask atau menyembunyikan kontrol izin secara tidak konsisten.",
  };
}

export function createSikesraResponsiveTableModel(input = {}) {
  const rows = input.rows ?? [];
  return {
    surface: input.surface ?? "registry",
    desktop: {
      mode: "wide_table",
      stickyActions: true,
      horizontalScroll: false,
    },
    tablet: {
      mode: "scrollable_table",
      stickyActions: false,
      horizontalScroll: true,
    },
    mobileReview: {
      mode: "card_list",
      readOnlyPreferred: true,
      cardCount: rows.length,
    },
  };
}

export function createSikesraResponsiveFormModel(input = {}) {
  return {
    surface: input.surface ?? "form",
    desktop: {
      mode: "sectioned_form",
      sidebarVisible: true,
    },
    tablet: {
      mode: "sectioned_form",
      sidebarVisible: false,
      sectionSwitcher: true,
    },
    mobileReview: {
      mode: "step_mode",
      readOnlyPreferred: input.readOnlyPreferred !== false,
      stickyActionBar: true,
    },
  };
}

function collectControlIssues(input) {
  const issues = [];
  if (!input.visibleLabel && !input.ariaLabel) issues.push("label_required");
  if (input.keyboardFocusable === false) issues.push("keyboard_focus_required");
  if (input.statusUsesColorOnly === true && !input.statusText) issues.push("status_text_required");
  return issues;
}

function describeResponsiveBehavior(surface, breakpointKey) {
  if (surface === "dashboard") {
    if (breakpointKey === "desktop") return "Grid multi-kolom untuk widget dan sidebar tetap/collapsible.";
    if (breakpointKey === "tablet") return "Grid dua kolom, widget diringkas, tabel memakai scroll horizontal.";
    return "Mode review baca-saja dengan tumpukan kartu dan ringkasan prioritas.";
  }

  if (surface === "registry" || surface === "audit") {
    if (breakpointKey === "desktop") return "Tabel lebar dengan aksi inline dan filter penuh.";
    if (breakpointKey === "tablet") return "Tabel scrollable dengan filter ringkas dan aksi dropdown.";
    return "Fallback kartu untuk review cepat; aksi sensitif tetap permission-aware.";
  }

  if (surface === "detail" || surface === "form") {
    if (breakpointKey === "desktop") return "Header/detail lengkap, tab/section tetap terlihat.";
    if (breakpointKey === "tablet") return "Tab/section switcher, konten satu kolom, dokumen/tabel bisa scroll.";
    return "Mode langkah/seksi untuk layar sempit, fokus pada baca dan edit terbatas.";
  }

  return "Perilaku responsif standar sesuai visual language admin yang ada.";
}

function check(key, label) {
  return Object.freeze({ key, label });
}

function breakpoint(key, minWidth, label) {
  return Object.freeze({ key, minWidth, label });
}
