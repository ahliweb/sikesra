# Divergence Log

## 2026-05-22 Parent Structure Adaptation

### Divergence

The repository was not physically re-rooted into:

```txt
sikesra/
  emdash-latest/
  awcmsmicro-dev/
```

### Reason

This repository is already the active pnpm workspace and test root. Moving the entire tree in one change would create a high-risk repository rewrite with broad path churn.

### Current Behavior

- The repo root acts as the implementation workspace.
- Canonical prompt paths are scaffolded in-place.
- The SIKESRA runtime plugin remains at `packages/plugins/sikesra/`.
- Parent-layout sync scripts run against either `awcmsmicro-dev/` or the current root.

### Risk

- The current layout does not yet satisfy the literal parent/sibling structure from the prompt.
- Runtime imports still point at the legacy plugin package and demo wiring.

### Rollback

- Remove the parent-architecture docs and scripts.
- Revert `README.md`, `AGENTS.md`, and `package.json` script additions.

### Tests

- `pnpm lint:quick`
- `pnpm typecheck`
- targeted SIKESRA plugin tests where feasible
