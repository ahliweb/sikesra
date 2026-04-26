# Cloudflare Pages Vs Workers Decision

## Purpose

This document records the current architecture decision for whether AWCMS Mini SIKESRA should split its public and admin surfaces across Cloudflare Pages and Cloudflare Workers.

## Decision

For the current AWCMS Mini SIKESRA baseline, do not split the deployment so that the public site runs on Cloudflare Pages while the admin/runtime surface runs on Cloudflare Workers.

Keep the current baseline as a single Cloudflare-hosted Worker deployment serving:

- `sikesrakobar.ahlikoding.com`

with the reviewed admin browser entry at `/_emdash/`, redirecting into the same EmDash admin surface under `/_emdash/admin`.

## Short Answer

Yes, a Pages-plus-Workers split is technically possible.

It is not the recommended baseline for the current repository state.

## Current Repository Context

- AWCMS Mini SIKESRA is currently a single EmDash-hosted application.
- Public, auth, admin, Turnstile, and runtime configuration assumptions are all part of the same application baseline.
- The current Worker deployment already owns:
  - the reviewed public custom domain for `sikesrakobar.ahlikoding.com`
  - runtime bindings such as `MEDIA_BUCKET`
  - Turnstile hostname-aware validation
  - JWT-backed `/api/v1/*` edge auth
  - the current healthcheck and deployment smoke-test path
- The current single-host baseline uses `/_emdash/` as the reviewed browser entry alias into the existing EmDash admin surface.

## Why A Split Is Technically Possible

- Cloudflare Pages supports custom domains, environment variables, and Pages Functions.
- Cloudflare Workers supports the current custom-domain, secret, and binding model already used by AWCMS Mini SIKESRA.
- A public-facing static-first website could, in principle, live on Pages while the authenticated governance runtime stayed on Workers.

## Why It Is Not The Recommended Baseline

### 1. The App Is Still One Dynamic EmDash-Hosted Surface

AWCMS Mini SIKESRA is not currently structured as:

- a standalone static public site
- plus a separate authenticated admin/runtime application

It is one EmDash-first app with shared runtime assumptions.

### 2. It Would Increase Auth And Session Complexity

A Pages-plus-Workers split would force a clearer boundary for:

- which hostname handles login
- how cookies are scoped across public and admin hosts
- where Turnstile is enforced and validated
- how redirects and origin checks behave across two deployment products

That raises complexity without a current product requirement that justifies it.

### 3. It Would Duplicate Deployment Configuration

The split would require separate management for:

- public Pages environment variables and bindings
- Worker environment variables and bindings
- hostname setup and smoke tests across two deployment surfaces
- release coordination and rollback handling

The current Worker baseline keeps those seams more unified and easier to review.

### 4. It Would Complicate Smoke Tests And Rollback

The current runbooks assume one reviewed Worker deployment path for:

- public hostname checks
- admin entry alias checks
- Turnstile validation
- `MEDIA_BUCKET` binding checks
- PostgreSQL reachability checks

Splitting public Pages from admin Workers would require separate deployment health, rollback, and coordination procedures.

### 5. It Does Not Match The Current Primary Need

The current need is secure, reviewable, Cloudflare-hosted application delivery on a single browser hostname.

That need is already met by the current Worker baseline without introducing another hosting product boundary.

## Route And Capability Mapping If Revisited Later

If this architecture is revisited later, these boundaries would need explicit review.

Potential Pages candidates:

- static-first marketing or public content pages
- public asset delivery that does not require app-authenticated governance logic

Worker-only candidates:

- EmDash admin surface under `/_emdash/admin`
- the reviewed admin entry alias at `/_emdash/`
- auth and session flows
- Turnstile-protected login and recovery flows
- `/api/v1/*` edge APIs
- governance-aware uploads and any route depending on `MEDIA_BUCKET`
- any route depending on the current app runtime and PostgreSQL-backed dynamic state

## Security Implications

- keep secrets and bindings scoped to the deployment product that actually needs them
- avoid broad cookie sharing across Pages and Workers unless a reviewed workflow requires it
- keep Turnstile hostname and action validation explicit across any split deployment
- keep rollback-safe boundaries clear so partial deployment changes do not strand auth or admin traffic
- keep least-privilege boundaries between public content delivery and admin/runtime operations

## Decision Trigger For Reopening

Reopen this decision only if there is a concrete requirement for one of the following:

- independently deployable static-first public content
- materially different release cadence for public site versus admin/runtime
- measurable operational or performance gain that cannot be achieved within the current Worker baseline

Absent one of those drivers, the default remains a single Worker-hosted runtime.

## Validation

- docs review against the current repository state
- `pnpm lint`

## Cross-References

- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/secret-hygiene-coolify-cloudflare-topology-plan-2026.md`
- `docs/process/runtime-smoke-test.md`
- `README.md`
