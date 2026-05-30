# Synchronization Workflow

This repository syncs from [ahliweb/awcms-micro](https://github.com/ahliweb/awcms-micro) while preserving SIKESRA-specific implementation. `emdash-latest/` is kept only as the local EmDash comparison baseline.

## Sync Chain

```
ahliweb/awcms-micro ──▶ ahliweb/sikesra
```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm sync:dry-run` | Preview upstream changes |
| `pnpm sync:upstream` | Sync with backup and validation |
| `pnpm sync:force` | Sync without backup |
| `pnpm validate:boundaries` | Check protected paths |

## Protected Paths

Defined in `scripts/awcms-micro-protected-paths.txt`. These paths are:

1. Backed up before sync
2. Restored after merge
3. Verified post-sync

## Merge Strategy

Uses `git merge -s subtree` to pull `awcms-micro` content into this repository. This:

- Preserves SIKESRA git history
- Allows clean upstream updates
- Keeps protected paths intact

## When to Sync

- After `awcms-micro` releases a new version
- After relevant `awcms-micro` security updates
- Before starting major SIKESRA features

## Conflict Resolution

1. Run `pnpm sync:upstream`
2. If conflicts occur, protected paths are auto-restored
3. Resolve remaining conflicts manually
4. Commit when clean

## Automation

Add to CI for automated sync checks:

```yaml
# .github/workflows/sync-check.yml
name: Upstream Sync Check
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday 6AM
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: git remote add awcms-micro https://github.com/ahliweb/awcms-micro.git || true
      - run: git fetch awcms-micro main
      - run: git log --oneline HEAD..awcms-micro/main
```
