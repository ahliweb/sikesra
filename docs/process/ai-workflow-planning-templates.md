# AI Workflow Planning Templates

## Purpose

This document provides small, reusable prompt templates for common AI-assisted workflows in AWCMS Mini SIKESRA.

Use these templates as workflow starters, not as authority. The authority order remains:

1. `REQUIREMENTS.md`
2. `AGENTS.md`
3. `README.md`
4. `DOCS_INDEX.md`
5. the focused document for the task

## Rules For Every Template

- Keep AWCMS Mini SIKESRA EmDash-first.
- Start from a GitHub issue or create one before repository modifications.
- Keep changes atomic and dependency-aware.
- Document the real repository state, not aspirational completion.
- Validate with the repo baseline plus any issue-specific checks.

## Atomic And Token-Efficient Workflow Guidance

Use these rules to keep AI-assisted work scoped, reviewable, and efficient.

- Prefer one atomic GitHub issue per focused unit of work.
- If a task touches multiple independent seams, split the plan into dependency-ordered issues before implementation.
- Read only the highest-authority and most relevant files first instead of sweeping the whole repository.
- Prefer bounded searches and focused file reads over broad exploratory context gathering.
- Summarize confirmed repository state before proposing changes so speculative work does not expand the prompt.
- Reuse the current repo baseline instead of restating unchanged architecture in every task.
- Keep implementation prompts tight: describe the issue, the affected seams, the required validation, and any security or operator caveats.
- Prefer targeted validation first, then the repo baseline, instead of always running the broadest possible command set at the start.
- Create follow-on issues rather than folding unrelated cleanup into the current task.
- When a Cloudflare MCP or other external management surface cannot show live inventory, document the caveat explicitly instead of spending extra prompt budget restating the failure repeatedly.
- When a Coolify MCP or direct Coolify control surface is unavailable, update repository-side guidance and create an operator follow-on issue instead of pretending live Coolify secrets or settings were changed.

## Recommended Execution Order For AI Tasks

1. Identify or create the atomic issue.
2. Read only the highest-priority and most task-relevant docs or files.
3. Confirm the current implementation seam that will change.
4. State the smallest valid implementation or docs update.
5. Apply the change.
6. Run focused validation, then the repo baseline if still needed.
7. Create follow-on issues only for gaps that should not be folded into the current issue.

## Current Repository Baseline

Use these as the default current-state assumptions when adapting any template in this document.

- EmDash `0.8.0` is the current reviewed package baseline in `awcms-mini-sikesra`.
- AWCMS Mini SIKESRA remains single-tenant and PostgreSQL-backed.
- PostgreSQL is hosted on a protected VPS managed through Coolify.
- Cloudflare edge and frontend delivery with a Hono backend API on Coolify is the supported app-hosting baseline.
- The public hostname baseline is `APP_URL=https://sikesrakobar.ahlikoding.com`.
- The reviewed admin browser entry is `https://sikesrakobar.ahlikoding.com/_emdash/`, which redirects into EmDash's current `/_emdash/admin` surface.
- Turnstile currently protects the public login, password-reset request, and invite-activation flows when configured.
- Turnstile validation is server-side and supports hostname allowlists through `TURNSTILE_EXPECTED_HOSTNAMES`, with fallback derivation from `APP_URL`.
- The versioned external/mobile API baseline lives under `/api/v1/*` and currently includes `/api/v1/health`, `/api/v1/token`, and `/api/v1/session`.
- Edge API access tokens are short-lived JWT Bearer tokens and refresh tokens are opaque, hashed, and rotation-backed in PostgreSQL.
- The reviewed Coolify-managed VPS now uses key-only root SSH recovery rather than password-based root SSH recovery.
- For Coolify-managed resources, the reviewed secret surface is Coolify Environment Variables with locked secrets, explicit build-vs-runtime scoping, and Docker Build Secrets for reviewed build-time sensitive inputs.
- Coolify API inspection confirms the current PostgreSQL resource is private and healthy, while SSL enablement, runtime database role scope, and server SSH user hardening remain operator-side verification seams tracked through issue-scoped follow-up.
- The repository uses issue-driven execution and expects issues to be atomic with explicit validation.
- `pnpm check` is the default baseline validation path for routine implementation work.
- `pnpm lint` covers the maintained docs/config surface with Prettier rather than the full repository.

## Security And Operator Guardrails

- Keep OWASP-aligned server-side validation, least-privilege assumptions, and audit coverage explicit in prompts.
- Treat Cloudflare-managed secrets, R2 configuration, and custom domains as deployment/runtime seams, not as an in-app control plane.
- Treat Coolify-managed locked secrets, runtime/build scoping, and Docker Build Secrets as operator-side deployment seams, not as tracked repository configuration.
- Keep Turnstile, edge auth, and R2 guidance consistent with the current Cloudflare-and-Hono runtime docs.
- Keep PostgreSQL recovery, transport, and access-control assumptions aligned with the Coolify-managed VPS baseline.
- Treat Coolify API responses as management-plane data: redact passwords, connection strings, tokens, private keys, and URLs before copying findings into docs or issue comments.
- Keep no-Hyperdrive guidance aligned with the Hono-to-PostgreSQL runtime baseline.
- Keep VPS recovery guidance aligned with the current key-only SSH posture.
- Keep passwords and connection strings out of copied build arguments or generic shell snippets when Coolify-managed resources can store them as locked runtime secrets instead.
- Prefer host-only cookies unless a reviewed operator workflow requires cross-host sharing.
- Never describe rollout-only controls such as ABAC audit-only mode as the permanent steady-state policy model.

## Documentation Update Template

Use when the task is primarily documentation or runbook maintenance.

```text
Update AWCMS Mini SIKESRA documentation for the following scoped task:

Task:
<describe the docs task>

Requirements:
- Read `REQUIREMENTS.md`, `AGENTS.md`, `README.md`, `DOCS_INDEX.md`, and the most relevant focused docs first.
- Confirm the current implementation state before editing docs.
- Do not overstate rollout completeness.
- Keep the docs aligned with EmDash-first architecture, the Cloudflare-and-Hono baseline, and PostgreSQL on a Coolify-managed VPS.
- Reflect the current single-host, Turnstile, R2, edge-auth, and no-Hyperdrive baselines when they are relevant to the task.
- Reflect the current deployment-managed secret guidance when the task touches credentials or operator configuration.
- Update index or cross-reference docs when adding a new maintained document.
- Update repository-local skills when core documentation guidance materially changes.
- Recommend validation commands and operator impact where relevant.
- Prefer targeted file reads and avoid repository-wide restatement when a smaller context window is enough.

Output:
- concise summary of the real-state documentation changes
- files to update
- any follow-on issues that should be created if the docs reveal missing implementation work
```

## Feature Planning Template

Use when the task is to create a plan or recommendations before implementation.

```text
Create an issue-driven implementation plan for this AWCMS Mini SIKESRA feature:

Feature:
<describe the feature>

Constraints:
- EmDash remains the host architecture.
- PostgreSQL remains the single system of record.
- Mini work must stay additive in services, plugins, admin extensions, and edge routes.
- Cloudflare edge and frontend delivery with a Hono backend API on Coolify is the supported app runtime baseline.
- The database runs on a Coolify-managed VPS.
- Public traffic and the reviewed admin browser entry terminate on the same EmDash-first app surface unless an issue explicitly scopes a different architecture.
- `ADMIN_SITE_URL` is a compatibility path, not the default current-state assumption.
- Cloudflare-side secrets and operator credentials live in reviewed deployment-managed storage, while Coolify-managed resource-side secrets live in Coolify locked secrets with runtime-only scope by default.

Planning tasks:
- summarize the current repository baseline for this feature
- identify confirmed gaps only
- recommend an execution order with atomic issues
- include security, operator, and validation notes
- align terminology with current EmDash descriptor, plugin, and auth conventions
- call out Cloudflare-specific runtime assumptions such as custom domains, Turnstile hostname validation, reviewed R2 configuration, or `/api/v1/*` edge routes when relevant
- call out Coolify secret-storage and runtime/build-scope assumptions when the task touches passwords, connection strings, or deployment-managed credentials
- explicitly identify what should stay out of scope for the first issue so the implementation remains atomic

Output:
- a concise plan section or document outline
- a proposed issue breakdown with acceptance criteria
```

## Implementation Execution Template

Use when the task is to implement an already scoped issue.

```text
Implement the scoped AWCMS Mini SIKESRA issue below.

Issue:
<issue title and scope>

Workflow rules:
- inspect the current code first
- keep the change minimal and issue-scoped
- prefer shared services and existing authorization helpers over ad hoc route logic
- do not create a second platform core beside EmDash
- update tests and focused docs as needed
- run `pnpm check` plus issue-specific checks unless the issue is docs-only
- use `pnpm lint` for docs/config-only changes
- keep Cloudflare-hosted frontend assumptions, Coolify-managed PostgreSQL assumptions, Hono backend assumptions, and current single-host behavior accurate in any touched docs
- keep the current Worker required-secret contract and Coolify locked-secret guidance accurate in any touched docs or scripts
- close the issue only after validation succeeds
- read only the files needed to complete the scoped issue and avoid broad context pulls once the seam is clear
- move unrelated cleanup into follow-on issues instead of silently expanding the current task

Output:
- completed implementation
- validation results
- any residual risks or follow-on issues
```

## Security Review Template

Use when reviewing a proposed change, route, or architecture update.

```text
Review the following AWCMS Mini SIKESRA change with a code-review mindset focused on security and correctness:

Change:
<describe the change>

Review focus:
- authentication and authorization correctness
- EmDash-first architecture compliance
- Cloudflare Worker, custom-domain, Turnstile, R2 binding, and secret-handling assumptions
- Coolify locked-secret, runtime/build-scope, and Docker Build Secret assumptions when operator-managed credentials are relevant
- PostgreSQL and Coolify trust-boundary implications
- OWASP-aligned error handling, token handling, and audit coverage
- missing tests or validation gaps

Output:
- findings first, ordered by severity
- open questions or assumptions
- only brief summary after findings
```

## Release Or Migration Template

Use when changing deployment, migration, or operator-facing runbooks.

```text
Plan or update the deployment and migration guidance for this scoped AWCMS Mini SIKESRA change:

Change:
<describe deployment-affecting work>

Requirements:
- keep the guidance consistent with the Cloudflare-hosted Worker runtime and PostgreSQL on a Coolify-managed VPS
- call out required runtime variables, bindings, secrets, and migration order
- distinguish Cloudflare-managed Worker secrets from Coolify-managed locked secrets when both surfaces are involved
- identify rollback and recovery considerations
- update any checklist or runbook references affected by the change
- keep claims aligned with the current implementation state
- include hostname, Turnstile, R2, or `/api/v1/*` smoke tests when the scoped change touches those surfaces
- keep the rollout guidance issue-scoped and avoid bundling unrelated operational cleanup into the same release template

Output:
- the required docs or checklist updates
- validation or smoke-test commands
- operator-facing risks or sequencing notes
```

## Suggested Validation By Change Type

- docs-only changes: `pnpm lint`
- runtime/config/doc changes that alter deployment assumptions: `pnpm lint` plus focused smoke-test guidance updates
- TypeScript, Astro, runtime, service, auth, or route changes: `pnpm check`
- focused behavioral changes: targeted `node --test ...` or `pnpm test:unit -- ...` in addition to the baseline

## Prompt Construction Tips

- Prefer issue title plus acceptance criteria over long narrative context.
- Name only the files or docs that are likely to matter first.
- Include the validation command set up front so the execution path stays bounded.
- Reuse established repo terms such as EmDash-first, Cloudflare-hosted Worker runtime, Coolify-managed PostgreSQL, `MEDIA_BUCKET`, and `/api/v1/*` instead of re-explaining them.
- State explicit non-goals when a task could otherwise expand into adjacent Cloudflare, security, or admin work.

## When To Create Follow-On Issues

- Create a follow-on issue if the doc refresh reveals a missing implementation seam, rollout caveat, or operator gap that should not be folded into the current change.
- Do not create follow-on issues for wording-only cleanup that is already resolved by the current scoped edit.
- If Cloudflare account visibility or provisioning capability is unavailable in the current tool session, document that caveat explicitly and create a follow-on issue only if repository changes alone cannot close the operational gap.
- If a rollout issue becomes blocked on an operator prerequisite such as a reachable origin endpoint or account-managed binding, split that prerequisite into its own issue instead of leaving one mixed issue open indefinitely.

## Cross-References

- `docs/process/github-issue-workflow.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/runtime-smoke-test.md`
- `docs/process/migration-deployment-checklist.md`
- `docs/process/cloudflare-edge-jwt-permissions-ai-plan-2026.md`
- `docs/process/cloudflare-platform-expansion-plan-2026.md`
- `docs/process/cloudflare-hostname-turnstile-r2-automation-plan-2026.md`
- `sikesrakobar_emdash_implementation_planning_prompt.md`
