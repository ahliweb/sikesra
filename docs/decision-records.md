# Decision Records

## Active Decisions

### PRD Documentation Suite Code Audit and Correction (Juni 2026)

**Decision:** Rewrite the entire `docs/prd/` suite (25 documents + main PRD), all 4 `skills/sikesra-*` files, and root `README.md`/`AGENTS.md` after a direct code audit of `src/runtime.ts` found the original PRD Documentation Suite (see entry below) described an architecture that didn't match the real plugin.

**Rationale:**

- Plugin ID was documented as `awcms-micro-sikesra`; the real `AWCMS_SIKESRA_PLUGIN_ID` in code is `awcms-sikesra`.
- Storage was documented as raw SQL tables (`CREATE TABLE sikesra_*`); the real plugin persists data via `PluginStorageConfig` collections (`ctx.storage.<collectionName>`), never writing SQL.
- Implementation status was documented as "MVP not yet built, Sprint 0-4 backlog"; the real plugin already has 39 routes and 16 admin pages implemented (closed issues #155-167, May 2026) — it's a feature-complete reference implementation, not a greenfield project.
- The real critical gap is different from what was assumed: no route in the plugin checks permission or verified identity before mutating data, and the ABAC evaluation engine (`evaluateAbacDecision()`) is only ever called from preview/demo routes, never from a real mutation path.
- Backlog was reframed from "EPIC-00..07 build from scratch" to "EPIC-H1/H2/H3 hardening" (server-side authorization, internal type consistency, test coverage) to reflect the real gap.

**Artifacts:**

- All 25 `docs/prd/*.md` + `docs/prd/PRODUCT_REQUIREMENT_DOCUMENT.md` — rewritten or corrected
- `skills/sikesra-plugin-execution/SKILL.md`, `skills/sikesra-data-d1/SKILL.md`, `skills/sikesra-api-rbac/SKILL.md`, `skills/sikesra-ui-admin/SKILL.md` — rewritten
- GitHub issues #377-390 (old "build from scratch" backlog) closed with explanatory comments; issues #391-402 (EPIC-H1/H2/H3 hardening) created; pinned capsule issue #376 updated
- `README.md`, `AGENTS.md` — plugin ID and status corrected

**Date:** 2026-06-16

### PRD Documentation Suite (Juni 2026, superseded by audit above)

**Decision:** Create a full PRD suite in `docs/prd/` following the satusehatkobar documentation pattern.

**Rationale:**

- Provides self-contained context for AI agent execution per issue
- Reduces token waste (agents read only the relevant 1-2 sections)
- Creates a single source of truth for SIKESRA implementation
- Enables junior AI models to work on atomic issues without full codebase context

**Artifacts:**

- `docs/prd/PRODUCT_REQUIREMENT_DOCUMENT.md` — main PRD
- `docs/prd/01.AI_IMPLEMENTATION_PROMPT.md` — hard rules for AI agents
- `docs/prd/02-09, 20, 25.*` — technical specs + backlog + sprint plan + issue playbook
- `skills/sikesra-*/SKILL.md` — 4 execution skills for plugin/data/API/UI work

**Date:** 2026-06-16

### SIKESRA Skills (Juni 2026)

**Decision:** Create 4 dedicated AI execution skills under `skills/sikesra-*/`.

**Rationale:**

- Each skill is scoped to one type of work (plugin, D1, API, UI)
- Skills embed code patterns, preventing agents from guessing at APIs
- Skills are symlinked to `.claude/skills` and `.opencode/skills` automatically

**Skills:**

- `sikesra-plugin-execution` — scaffold, hooks, navigation wiring
- `sikesra-data-d1` — migrations, storage, KV, R2 patterns
- `sikesra-api-rbac` — route handler template, RBAC, ABAC, audit
- `sikesra-ui-admin` — Kumo components, Lingui, RTL-safe Tailwind

**Date:** 2026-06-16

## Prior Decisions

### Independent Downstream Model

**Decision:** This repository is an independent downstream of `awcms-micro`, not a submodule or workspace child.

**Rationale:**
- Allows independent release cycles for SIKESRA features
- Enables safe upstream sync without affecting awcms-micro
- Keeps SIKESRA-specific code isolated

**Date:** 2026-05-29

### Unique Naming Convention

**Decision:** All SIKESRA plugins and templates use `sikesra` or `sikesraTemplate` suffix.

**Rationale:**
- Avoids conflicts with upstream `awcms-micro-default` template
- Makes SIKESRA ownership clear in package names
- Prevents accidental overwrites during sync

**Examples:**
- `awcms-micro-sikesraTemplate` (not `awcms-micro-default`)
- `awcms-micro-sikesra` plugin package
- `@ahliweb/awcms-micro-sikesra` npm scope

**Date:** 2026-05-29

### Protected Paths Strategy

**Decision:** Use file-based protected paths list with backup/restore during sync.

**Rationale:**
- Simple to understand and modify
- Works with any git workflow
- Provides automatic rollback capability

**Date:** 2026-05-29

### Subtree Merge Strategy

**Decision:** Use `git merge -s subtree` for upstream sync.

**Rationale:**
- Preserves full git history from both repos
- Allows clean diff between sync points
- Better than subtree split for this use case

**Date:** 2026-05-29
