# GitHub Issue Workflow

## Rule

All repository modifications should begin from a GitHub issue.

This applies to:

- code changes,
- schema changes,
- admin UI changes,
- security changes,
- plugin changes,
- documentation changes that affect implementation behavior or operating procedure.

## Required Flow

1. Create or identify an issue.
2. Confirm the issue is atomic and has clear acceptance criteria.
3. Confirm dependencies and sequence relative to other issues.
4. Implement only the scoped change.
5. Validate the change using the issue's validation section and the repo baseline such as `pnpm check` when applicable.
6. Open a pull request that references the issue.
7. Close the issue only after validation is complete.

## Scope Rules

- One issue should represent one focused unit of work.
- If a change grows beyond the original issue scope, split follow-up work into a new issue.
- Do not silently fold blocked dependency work into the current issue.
- Keep architecture decisions aligned with `sikesrakobar_implementation_plan.md`.
- Keep execution aligned with `sikesrakobar_atomic_backlog.md`.

## Canonical References

- `sikesrakobar_implementation_plan.md`
- `sikesrakobar_atomic_backlog.md`
- `docs/process/github-issue-workflow.md`

## Non-Goals

- No direct modification workflow outside GitHub issues.
- No untracked architectural drift.
- No scope expansion that bypasses dependency ordering.
