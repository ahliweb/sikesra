Act as a senior backend architect, database architect, security engineer, API designer, data privacy analyst, DevOps engineer, and GitHub issue planner for the SIKESRA application built on AWCMS Mini.

You are working in this repository:

`https://github.com/ahliweb/sikesra`

Repository boundary instruction:

- Only analyze, plan, create issues for, open pull requests in, push commits to, and modify files in `https://github.com/ahliweb/sikesra`.
- Do not change, create issues in, open pull requests in, push commits to, or modify any other repositories.
- The master repository used as a reference example is `https://github.com/ahliweb/awcms-mini`.
- Do not modify anything in the reference repository `https://github.com/ahliweb/awcms-mini`.
- If related work appears to belong to another repository or operator-only environment, document it as a dependency or note inside `ahliweb/sikesra`, but do not perform changes outside this repository.
- If the agent has access to multiple GitHub repositories, treat all repositories other than `ahliweb/sikesra` as read-only references unless the user gives a separate explicit instruction.

Your task is to analyze the current repository state and the current SIKESRA PRDs, then create or update the backend GitHub issue plan for the real remaining backend MVP work of SIKESRA.

Primary inputs:

- `prd_mvp_sikesra_awcms_mini_single_tenant_field_kelengkapan.md`
- `prd_ui_ux_sikesra_awcms_mini_detail.md`
- `docs/process/ai-workflow-planning-templates.md`
- `docs/process/sikesra-uiux-github-issue-plan.md`
- `docs/process/sikesra-religion-reference.md`
- `docs/admin/sikesra-uiux-implementation.md`

Do not implement backend code immediately unless explicitly instructed later. Start with repository analysis, current-state alignment, issue-gap analysis, and issue creation or issue updates only for confirmed remaining backend work.

---

## Critical Current-State Rule

Do not treat this repository as greenfield backend work.

The repository has already converged to this current baseline:

- the UI/model-layer SIKESRA admin/plugin work under `src/plugins/sikesra-admin/` is already implemented and issue-tracked as completed;
- the reviewed Cloudflare Worker runtime is already live on `https://sikesrakobar.ahlikoding.com` with EmDash under `/_emdash/`;
- the prior live host-build integration follow-on tracked in `#48` is already satisfied and closed;
- the remaining confirmed follow-on from this planning chain is `#49` for backend-controlled religion master/reference data;
- backend persistence seams such as migrations, repositories, services, and database tables may still be absent in this repository and must be verified before planning any code issue expansion.

Because of that:

- do not recreate a broad backend MVP issue set unless repository analysis proves that the current repo state genuinely requires it;
- prefer updating or refining existing issue `#49` over creating duplicate or overly broad backend issues;
- only create new backend follow-on issues if they are directly justified by the current repository state and cannot be cleanly represented inside `#49`;
- if the repo still lacks writable backend seams, say so explicitly and keep the plan narrow.

---

## Product And Terminology Rules

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

Do not use **Guru Ngaji** as a general module label because guru ngaji is part of an Islam-specific teaching context. If Islamic teaching details are required, represent them as contextual teaching activity/place fields inside the Guru Agama module, not as the module title.

### 4. Religion Reference Requirement

Religion must use controlled master/reference data, not arbitrary free text by default.

Suggested normalized values:

- Islam
- Kristen
- Katolik/Katholik, normalized consistently
- Hindu
- Buddha/Budha, normalized consistently
- Konghucu/Konghuchu, normalized consistently
- Kepercayaan Terhadap Tuhan YME only if aligned with legal/operator requirements
- Belum Dicatat only if legally and operationally acceptable

Backend/reference requirements:

- stable internal ID/code;
- normalized label and operator-facing label;
- active/inactive lifecycle;
- alias mapping for import normalization;
- service-layer authorization for admin changes;
- audit coverage for changes and sensitive export/report access involving individual-level religion.

UI-facing rules that backend planning must preserve:

- operator labels stay Indonesian such as `Agama`, `Agama Guru`, `Agama Anak`, `Agama Lansia`, `Agama Pengurus`, and `Agama Pendamping/Penanggung Jawab`;
- do not expose internal names such as `religion_reference_id` or `religion_code` in operator-facing UI copy;
- treat individual-level religion as personal data;
- keep default dashboard/report behavior aggregate-only unless explicit permission allows more.

### 5. Lansia Terlantar

Treat **Lansia Terlantar** as vulnerable-person data.

Backend planning must preserve the PRD expectation that this module, if and when backend persistence work becomes writable in this repository, remains privacy-aware, region-aware, audited, and permission-gated.

Do not reopen a broad Lansia backend program unless repository inspection proves that the current repo now contains a writable backend seam and the work is not already captured elsewhere.

---

## Required Repository Analysis

Before creating or updating GitHub issues, inspect only this repository:

`https://github.com/ahliweb/sikesra`

Use this repository only as a read-only reference example:

`https://github.com/ahliweb/awcms-mini`

Inspect the implementation repository and identify only the seams relevant to backend planning:

- whether writable backend folders such as `src/db`, migrations, repositories, services, or API handlers exist in this repository;
- whether the repo currently contains only model-layer/admin-plugin code under `src/plugins/sikesra-admin/`;
- whether religion/agama reference data is still UI-only, backend-backed, or partially implemented;
- whether there are existing backend issues beyond `#49` that are still valid and not stale;
- whether current docs already declare the remaining backend blocker;
- whether test/package conventions support backend validation in this repo;
- whether any operator/runtime-only steps are being incorrectly represented as repo-local work.

If a capability already exists in `sikesra`, update or close planning issues accordingly.

If a capability is missing in `sikesra`, create a focused issue only when the missing work is still implementable from this repository.

If the repo does not contain a writable backend seam, do not invent a full backend issue tree. Record the blocker and keep the issue plan narrow.

If a useful pattern exists in `awcms-mini`, cite it as a read-only reference in the issue, but do not modify that repository.

---

## Planning Principles

Use these principles:

- repository-state-first, not greenfield-assumption-first;
- simple-first-scalable-later;
- database-first where a writable database seam exists;
- service-layer authorization;
- secure-by-default;
- least privilege;
- privacy-aware and sensitive-data-minimizing;
- audit-friendly;
- issue-driven and dependency-aware;
- no duplicate issues for work already completed or already captured;
- no claims of backend persistence work that the repository cannot actually support;
- implementation changes only in `ahliweb/sikesra`;
- `ahliweb/awcms-mini` remains read-only reference material.

---

## Current-State Planning Goal

The goal is not to recreate the original full backend MVP issue set blindly.

Instead:

1. Compare the updated PRDs with the current repository state.
2. Compare the current repository state with the current open and closed GitHub issues.
3. Identify:
   - already completed runtime or planning issues that should stay closed;
   - the remaining valid backend blocker or blockers;
   - whether `#49` is still the correct primary backend issue;
   - whether `#49` should be updated, narrowed, or split into a very small number of dependency-ordered follow-ons;
   - any docs/planning references that still need syncing.
4. Create new issues only for real remaining backend gaps.
5. Prefer updating existing issues instead of duplicating them.

---

## Known Baseline Expectations

Use these as expected current-state checks while analyzing the repo:

- the SIKESRA admin/plugin surface lives under `src/plugins/sikesra-admin/`;
- UI/model-layer work for navigation, dashboard, registry, detail, forms, ID, region, documents, verification, import/export, governance, accessibility, and responsive behavior already exists;
- `src/plugins/sikesra-admin/religion-reference.mjs` currently provides a controlled UI contract and alias normalization;
- `docs/process/sikesra-religion-reference.md` explicitly states that backend religion reference persistence does not yet exist;
- `docs/process/sikesra-uiux-github-issue-plan.md` now treats `#49` as the remaining follow-on and `#48` as already satisfied;
- the reviewed live Worker baseline is already deployed and should not be reopened as unresolved backend scope;
- `pnpm lint` is the minimum docs/config validation path;
- `pnpm check` remains the baseline if a planning task also changes runtime/source code.

---

## What To Avoid

Do not do the following unless repository inspection proves they are still required and currently writable in this repository:

- create a new 20+ issue backend program for all modules;
- reopen deployment/runtime issues already completed by `#44` and `#48`;
- pretend this repo already contains migrations, repositories, services, or API handlers if it does not;
- create speculative issues for tables, services, or OpenAPI contracts with no writable backend seam;
- restate operator-only Cloudflare or Coolify actions as repository implementation work;
- duplicate `#49` with another issue that says the same thing.

---

## Required Output

Produce a backend planning document, issue-planning summary, or issue action set with these sections:

### 1. Repository Analysis Summary

Summarize the actual current state for:

- writable backend seams present or absent;
- current SIKESRA model-layer/admin-plugin coverage;
- religion-reference current state;
- runtime/deployment current state;
- current docs/test/package conventions relevant to backend planning.

### 2. Current Issue Status Map

List:

- completed issues that remain correctly closed;
- still-open backend issues that remain valid;
- outdated or duplicate issues that should be updated or closed;
- any missing backend issues that should be created only if justified.

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

- true backend/data/master-reference blockers;
- missing writable backend implementation seams;
- operator/runtime-only work that should stay out of scope;
- work that should not be reopened as a broad backend MVP program.

---

## Default Expected Issue Outcome

Unless repository analysis proves otherwise, the expected issue outcome is:

1. Keep `#49` as the primary backend follow-on issue.
2. Update `#49` with any missing repository evidence, acceptance criteria, or security notes.
3. Create a small follow-on issue only if one of these is true:
   - the repo now has a writable backend seam and the work needs an atomic schema issue plus a separate service/use issue;
   - docs are still stale and need a dedicated docs sync issue;
   - an operator/runtime dependency is blocking `#49` and should be split out clearly.
4. Otherwise, do not create more issues.

---

## Suggested Issue Body Template

Use this body format for every backend issue you create or substantially update:

```markdown
## Summary

<!-- Explain the backend gap briefly. -->

## Current Repository State

<!-- Describe the confirmed local repo evidence. -->

## PRD Context

<!-- Cite the relevant PRD requirement. -->

## Repository Boundary

- Implementation repository: `https://github.com/ahliweb/sikesra`
- Reference repository only: `https://github.com/ahliweb/awcms-mini`
- Do not modify the reference repository.

## Scope

- [ ] ...
- [ ] ...

## Out of Scope

- ...

## Security And Privacy Requirements

- [ ] Service-layer authorization remains required
- [ ] Do not log raw sensitive values
- [ ] Mask or omit sensitive fields by default where applicable
- [ ] Audit important changes and sensitive export/reveal actions
- [ ] Keep credentials in ignored local env files or deployment-managed secret surfaces only

## Acceptance Criteria

- [ ] ...
- [ ] ...

## Validation

- [ ] `pnpm lint` for docs/config-only issue changes
- [ ] `pnpm check` if code or runtime/source files are changed
- [ ] focused tests or checks where practical

## Dependencies

- Depends on: #...
- Blocks: #...

## References

- `prd_mvp_sikesra_awcms_mini_single_tenant_field_kelengkapan.md`
- `docs/process/ai-workflow-planning-templates.md`
- `docs/process/sikesra-uiux-github-issue-plan.md`
- `docs/process/sikesra-religion-reference.md`
```

---

## Issue Creation Instructions

After repository analysis and planning, perform these actions in `https://github.com/ahliweb/sikesra` only:

1. Read the current issue state first.
2. Confirm whether `#49` already covers the remaining backend blocker.
3. Update `#49` if it is still correct but needs sharper scope or acceptance criteria.
4. Search for duplicates before creating anything new.
5. Create a new issue only if it is clearly distinct, atomic, and justified by current repository evidence.
6. Reuse existing labels and milestones whenever possible.
7. Add a final summary comment or planning summary only if it adds new actionable information.

Do not create duplicate issues. If `#49` already covers the real backend blocker, prefer improving `#49` instead of creating another issue.

Do not create or update any issue, pull request, branch, commit, workflow, label, milestone, or file in `https://github.com/ahliweb/awcms-mini`.

---

## Backend Quality Bar

The final backend planning result is acceptable only if:

- it reflects the real current repository state, not an outdated greenfield assumption;
- it does not reopen already completed runtime integration work;
- it clearly identifies whether a writable backend seam exists in this repository;
- it keeps backend-controlled religion reference data as the confirmed remaining blocker unless newer evidence proves otherwise;
- it preserves Guru Agama terminology and religion/privacy requirements from the PRDs;
- it keeps individual-level religion access permission-aware and audit-covered;
- it does not fabricate migrations, repositories, or services that are not actually present;
- it does not create duplicate or overly broad issues;
- it respects AWCMS Mini single-tenant architecture;
- all issues, changes, commits, branches, and PRs target only `https://github.com/ahliweb/sikesra`.

---

## Final Response Format

After creating or updating GitHub issues, respond with:

```markdown
# SIKESRA Backend GitHub Planning Completed

## Repository Reviewed
- Implementation repository: `https://github.com/ahliweb/sikesra`
- Reference repository only: `https://github.com/ahliweb/awcms-mini`
- Confirmation: no changes were made to any other repositories.

## Current-State Findings
- Backend writable seam: ...
- Model-layer/admin-plugin state: ...
- Runtime baseline: ...
- Religion reference state: ...

## Issues Updated
- #49 ...

## Issues Created
- #... ...

## Remaining Dependency Order
1. ...

## Risks / Blockers
- ...

## Recommended Next Step
- ...
```

---

## Important Constraints

- Do not change, create issues in, open pull requests in, push commits to, or modify any repository other than `https://github.com/ahliweb/sikesra`.
- The master repository `https://github.com/ahliweb/awcms-mini` is a read-only reference example only; do not modify it.
- Do not hardcode secrets.
- Do not expose credentials in issues.
- Do not expose NIK/KIA, No KK, or sample real personal data.
- Do not expose real individual religion data in examples.
- Do not expose real elderly/vulnerable-person data in examples.
- Do not implement public access to sensitive data.
- Do not assume Supabase-first architecture.
- Do not assume AWCMS full multi-tenant behavior.
- Do not use arbitrary free text for religion fields by default.
- Do not use `Guru Ngaji` as the general backend module/table/API label.
- Use respectful and non-stigmatizing language for Lansia Terlantar.
- Keep SIKESRA MVP aligned with AWCMS Mini single-tenant.
- Keep all sensitive backend behavior aligned with RBAC/ABAC, region scope, auditability, privacy, and data minimization.
