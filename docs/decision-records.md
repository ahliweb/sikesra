# Decision Records

## Active Decisions

### PRD Documentation Suite (Juni 2026)

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
