# SIKESRA Implementation Decisions

Status: draft placeholder.

This file must be completed during Phase 0 discovery before feature implementation starts. Replace every `TBD` with real repository paths, helper names, commands, and decisions discovered from the actual codebase.

## Decision Log

| Area | Decision | Source / Evidence | Notes |
|---|---|---|---|
| Target module folder | TBD | TBD | Use repository convention; default only if none exists. |
| Plugin registration convention | TBD | TBD | Confirm `definePlugin()` usage and registration file. |
| Manifest convention | TBD | TBD | Confirm whether `module.manifest.json` or repository equivalent is used. |
| Admin route convention | TBD | TBD | Must resolve to `/_emdash/admin/plugins/sikesra/*`. |
| API route convention | TBD | TBD | Must resolve to `/_emdash/api/plugins/sikesra/v1/*`. |
| Public route convention | TBD | TBD | Must expose `/sikesra`. |
| D1 migration path | TBD | TBD | Confirm file naming and execution command. |
| Seed path | TBD | TBD | Confirm repeatable seed convention. |
| Test command | TBD | TBD | Confirm unit, integration, and e2e commands. |
| Auth/session helper | TBD | TBD | Must build trusted request context server-side. |
| Permission registry helper | TBD | TBD | Must register `awcms:sikesra:*` permissions. |
| ABAC extension point | TBD | TBD | Prefer shared ABAC; document local fallback if needed. |
| Audit service | TBD | TBD | Prefer shared audit; document local fallback if needed. |
| R2/media helper | TBD | TBD | Prefer shared media; document local fallback if needed. |
| Public data delivery | TBD | TBD | Prefer Astro loader backed by public-safe service. |
| Import parser | TBD | TBD | Must support staging before promotion. |
| PDF/document handling | TBD | TBD | Must avoid raw R2 key exposure. |
| Approved core adapters | None yet | TBD | Do not add core adapters without explicit approval. |

## Missing Extension Points

Document any missing extension point here before proposing code changes.

| Missing Extension Point | Impact | Smallest Adapter Proposal | Approved? |
|---|---|---|---|
| TBD | TBD | TBD | No |

## Phase 0 Acceptance

Phase 0 is complete only when:

1. Every row above has a real decision.
2. Later tickets can name exact files instead of placeholders.
3. Missing extension points are documented.
4. No SIKESRA business feature was implemented during discovery.
5. Any required core adapter is documented separately with compatibility and rollback notes.
