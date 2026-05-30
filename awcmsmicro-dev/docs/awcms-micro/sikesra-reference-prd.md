# SIKESRA Reference PRD

## Purpose

This PRD defines the SIKESRA-grade reference standard for AWCMS-Micro.

It is a reference design, not a production SIKESRA implementation, and it must stay inside the approved `awcmsmicro-dev` boundaries without modifying EmDash core.

## Scope

In scope:

- `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/`
- `awcmsmicro-dev/templates/awcms-micro-default/`
- `awcmsmicro-dev/templates/awcms-micro-default-cloudflare/`
- `awcmsmicro-dev/docs/awcms-micro/`
- `awcmsmicro-dev/e2e/awcms-micro/`

Out of scope:

- production SIKESRA code
- EmDash core changes
- uncontrolled paths outside the approved boundary list

## Reference Goals

The reference implementation should demonstrate:

- plugin manifest and runtime shape
- public-safe aggregate page and route
- registry, verification, documents, reports, audit, RBAC, and ABAC screens
- deterministic fixtures and masked sensitive data
- local and Cloudflare template parity
- validation and rollback guidance

## Data Patterns

Reference entities should model:

- registry_entity
- verification_event
- supporting_document
- public_aggregate
- audit_event
- access_permission
- access_role
- abac_subject
- abac_resource
- abac_policy

Region scope fields:

- province_code
- regency_code
- district_code
- village_code

Sensitivity levels:

- public_safe
- internal
- restricted
- highly_restricted

## Execution Order

1. Document the standard.
2. Build the reference plugin and fixtures.
3. Align admin UI.
4. Align local and Cloudflare templates.
5. Harden e2e validation.

## Backlog Map

- #51: PRD and execution standard
- #52: Reference plugin standard
- #54: Admin UI/UX reference
- #55: Data model and fixtures
- #56: Security tests
- #57: Public aggregate page
- #58: Cloudflare deployability
- #59: E2E validation

## Delivery Status

All backlog items linked above have been implemented and their corresponding GitHub issues are closed.

## Definition Of Done

- The reference plugin is buildable.
- The public aggregate stays privacy-safe.
- The templates register the example plugin.
- Validation scripts pass.
- This document links the rest of the SIKESRA work into atomic follow-up issues.
