Act as a senior product manager, system analyst, UI/UX architect, accessibility reviewer, security engineer, data privacy analyst, and GitHub issue planner for the SIKESRA application built on AWCMS Mini.

You are working in this repository:

`https://github.com/ahliweb/sikesra`

Repository boundary instruction:

- Only analyze, plan, create issues for, open pull requests in, push commits to, and modify files in `https://github.com/ahliweb/sikesra`.
- Do not change, create issues in, open pull requests in, push commits to, or modify any other repositories.
- The master repository used as a reference example is `https://github.com/ahliweb/awcms-mini`.
- Do not modify anything in the reference repository `https://github.com/ahliweb/awcms-mini`.
- If related work appears to belong to another repository, document it as a note or dependency inside `ahliweb/sikesra` issues, but do not perform changes outside this repository.
- If the agent has access to multiple GitHub repositories, treat all repositories other than `ahliweb/sikesra` as read-only references unless the user gives a separate explicit instruction.

Your task is to analyze the current repository state and the current SIKESRA PRDs, then create or update a complete GitHub issue breakdown for the UI/UX MVP of SIKESRA.

Primary PRD inputs:

- `prd_ui_ux_sikesra_awcms_mini_detail.md`
- `prd_mvp_sikesra_awcms_mini_single_tenant_field_kelengkapan.md`

Do not implement code immediately unless explicitly instructed later. Start with repository analysis, current-state alignment, issue-gap analysis, and GitHub issue creation or update.

---

## Critical Product and Terminology Rules

### 1. AWCMS Mini Single-Tenant

- Do not assume full AWCMS multi-tenant architecture.
- Do not assume Supabase-first architecture.
- Do not require Supabase Auth or Supabase RLS.
- Use AWCMS Mini internal auth/session/service-layer authorization patterns where available in `ahliweb/sikesra`.
- Use `ahliweb/awcms-mini` only as a read-only reference example.
- If future-proofing is needed, use optional `site_id`, `app_scope`, or config patterns only after repository inspection.

### 2. Runtime Baseline

- Keep the app EmDash-first and single-tenant.
- Use Cloudflare Worker runtime as the reviewed production hosting baseline.
- Use `https://sikesrakobar.ahlikoding.com` as the reviewed public host.
- Use `/_emdash/` as the reviewed admin entry alias on the same host.
- Use Cloudflare R2 bucket `sikesra` through Worker binding `MEDIA_BUCKET`.
- Use PostgreSQL database `sikesrakobar` on the Coolify-managed VPS.
- Use Hyperdrive binding `HYPERDRIVE` as the reviewed production database transport baseline.

### 3. Guru Agama Terminology

Use **Guru Agama** as the general module label.

Do not use **Guru Ngaji** as a general module label because guru ngaji is part of Islamic religious teaching context. If Islamic teaching details are required, represent them as contextual teaching activity/place fields inside the Guru Agama module, not as the module title.

### 4. Religion Reference Requirement

Add a religion reference field to all related personal data and all relevant modules.

Religion must use controlled master/reference data, not arbitrary free text by default.

Suggested normalized values:

- Islam
- Kristen
- Katolik/Katholik, normalized consistently
- Hindu
- Buddha/Budha, normalized consistently
- Konghucu/Konghuchu, normalized consistently
- Lainnya/Other only if approved
- Belum Dicatat/Unknown only if legally and operationally acceptable

UI rules for religion handling:

- Use operator-facing Indonesian labels such as `Agama`, `Agama Guru`, `Agama Anak`, `Agama Lansia`, `Agama Pendamping/Penanggung Jawab`, `Agama Pengurus`, and `Agama Lembaga`.
- Do not expose internal names such as `religion_reference_id` or `religion_code` in operator-facing UI.
- Use select/dropdown from controlled reference data.
- Keep individual-level religion permission-aware and privacy-aware.
- Allow aggregate-only reporting where authorized; do not expose individual-level religion casually in dashboards or exports.

### 5. Lansia Terlantar Module

Add a **Lansia Terlantar** module with fields and rules similar to Anak Yatim but adapted for abandoned elderly people.

Treat Lansia Terlantar as vulnerable-person data.

UI/UX planning must cover:

- dedicated navigation and registry/list presence;
- dedicated form sections and detail tabs;
- religion fields for elderly person and caregiver/guardian where relevant;
- privacy warning copy;
- masking/minimization for NIK, No KK, contact, health-related notes, and living-condition notes;
- permission-aware exports and reporting;
- respectful and non-stigmatizing operator language.

### 6. Current Repository State Matters

Do not plan this as greenfield UI work.

The current repository already contains model-layer SIKESRA admin/plugin work under `src/plugins/sikesra-admin/` and related unit tests. The issue plan must reflect the real current state:

- completed UI/UX model-layer/admin-plugin issues should be treated as done;
- missing live host-build integration should remain a focused follow-on issue, not be re-expanded into broad UI planning;
- missing backend-controlled religion master data should remain a focused backend follow-on issue;
- planning must update or create issues only for confirmed gaps, not for work already completed.

---

## Required Repository Analysis

Before creating or updating GitHub issues, inspect only this repository:

`https://github.com/ahliweb/sikesra`

Use this repository only as a read-only reference example:

`https://github.com/ahliweb/awcms-mini`

Inspect the implementation repository and identify:

- current admin/plugin extension structure;
- current route/menu/admin descriptor structure;
- current UI model/component patterns;
- current auth/session implementation;
- current RBAC/ABAC and region-scope patterns;
- current document/storage/R2 patterns;
- current audit log patterns;
- current import/export workflow models;
- current test framework and package scripts;
- current environment/runtime documentation conventions;
- current SIKESRA module coverage in `src/plugins/sikesra-admin/`;
- whether religion/agama reference data is UI-only, backend-backed, or still pending;
- whether Lansia Terlantar is already planned, modeled, partially implemented, or blocked.

If a capability already exists in `sikesra`, update or close planning issues accordingly.
If a capability is missing in `sikesra`, create a focused issue.
If a useful pattern exists in `awcms-mini`, cite it as a read-only reference in the issue, but do not modify that repository.
If the current repository state conflicts with older PRD assumptions, the issue plan must follow the updated PRDs and real repository state.

---

## Planning Principles

Use these principles:

- simple-first-scalable-later;
- repository-state-first, not greenfield-assumption-first;
- UI follows updated PRDs and current repo baseline;
- secure-by-default;
- audit-friendly;
- accessibility-aware;
- responsive for desktop and tablet, usable on mobile for light review;
- permission-aware and region-aware;
- privacy-aware and sensitive-data-minimizing;
- clear operator-facing Indonesian labels;
- explicit dependency tracking;
- no duplicate issues for work already completed;
- implementation changes only in `ahliweb/sikesra`;
- `ahliweb/awcms-mini` remains read-only reference material.

---

## Current-State Issue Planning Goal

The goal is not to recreate the original full UI/UX issue set blindly.

Instead:

1. Compare the updated PRDs with the current repository state.
2. Compare the current repository state with the current open and closed GitHub issues.
3. Identify:
   - already completed UI/UX issue groups;
   - still-open real UI/UX/runtime gaps;
   - backend blockers that should stay backend-scoped;
   - docs/planning issues that should be updated to reflect reality.
4. Create new issues only for real remaining gaps.
5. Update existing issues instead of duplicating them whenever practical.

---

## Known Baseline Expectations

Use these as expected current-state checks while analyzing the repo:

- the SIKESRA admin/plugin surface lives under `src/plugins/sikesra-admin/`;
- model-layer/admin descriptors, dashboard, registry, detail, form, ID, region, document, verification, import/export, governance, accessibility, and responsive work may already exist;
- `host-registration.mjs` documents the safe seam for appending `sikesraAdminPlugin()` to the live EmDash host;
- live build integration may still be blocked because the writable host build workspace is not in this repo;
- backend-controlled religion master data may still be blocked because no writable backend persistence seam exists in this repo;
- `pnpm check` is the default baseline validation path for runtime or source changes.

---

## Required Output

Produce a planning document or issue-planning summary with these sections:

### 1. Repository Analysis Summary

Summarize the actual current state for:

- admin/plugin UI seams;
- navigation/menu/route coverage;
- dashboard/list/detail/form/document/verification/import-export/access/audit coverage;
- religion-reference UI handling;
- Lansia Terlantar coverage;
- runtime integration blockers;
- backend blockers;
- tests and docs coverage.

### 2. Current Issue Status Map

List:

- completed issue groups;
- still-open issues that remain valid;
- outdated/duplicate issues that should be updated or closed;
- any missing issues that should be created.

### 3. Recommended Issue Actions

For each issue to create or update, include:

- title;
- why it is still needed;
- current repository evidence;
- scope;
- out of scope;
- dependencies;
- security/privacy notes;
- acceptance criteria;
- validation notes;
- labels;
- milestone.

### 4. Dependency Order

Provide a minimal dependency order for the remaining work only.

### 5. Blockers And Non-Goals

Explicitly separate:

- live host-build/runtime integration blockers;
- backend/data/master-reference blockers;
- things that should not be reopened as broad UI planning work.

---

## Labels To Reuse Where Relevant

- `sikesra`
- `uiux`
- `admin`
- `dashboard`
- `registry`
- `forms`
- `documents`
- `verification`
- `import-excel`
- `export-report`
- `audit-log`
- `rbac-abac`
- `region-scope`
- `sensitive-data`
- `privacy`
- `security`
- `accessibility`
- `responsive`
- `testing`
- `documentation`
- `backend-needed`
- `blocked`
- `religion-reference`
- `master-data`
- `lansia-terlantar`
- `vulnerable-person`

Type labels when supported:

- `type: epic`
- `type: feature`
- `type: task`
- `type: security`
- `type: docs`
- `type: test`

Priority labels when supported:

- `priority: critical`
- `priority: high`
- `priority: medium`
- `priority: low`

---

## Security And Privacy Requirements For Issue Planning

- Treat NIK/KIA, No KK, child data, disability data, elderly/vulnerable-person data, individual-level religion, contact data, health-related notes, and documents as sensitive.
- Keep service-layer authorization as the actual security boundary; menu visibility is not a security boundary.
- Keep exports and sensitive reveals permission-aware and audit-aware.
- Keep dashboard and report defaults aggregate-only where sensitive dimensions are involved.
- Keep secrets, tokens, passwords, connection strings, and private URLs out of issues, comments, and copied examples.
- Prefer Cloudflare Worker secrets and Coolify locked runtime secrets for operator/runtime secret handling.
- Keep guidance aligned with OWASP least privilege, fail-closed behavior, data minimization, and auditable privileged actions.

---

## Final Instruction

When you finish planning, do not pretend that all work is still open.

Reflect the current repository truth:

- what is already done;
- what remains open;
- what is blocked;
- what belongs to runtime integration;
- what belongs to backend implementation;
- and what should remain out of scope for the next UI/UX issue.
