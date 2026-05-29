# Decision Records

## Active Decisions

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
