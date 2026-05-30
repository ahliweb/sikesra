# SIKESRA-Grade Reference Standard

## Purpose

This document defines the AWCMS-Micro reference direction inspired by the SIKESRA PRD.

It is a reference standard only. It does not change EmDash core and it does not promote SIKESRA as a production product inside this repository.

## Core Rule

- Keep upstream EmDash untouched.
- Keep AWCMS-Micro-owned work inside the approved `awcmsmicro-dev/` boundaries.
- Use the example plugin and templates as reference implementations, not as a full SIKESRA product.

## Reference Scope

The SIKESRA-grade reference should demonstrate:

- a registry-style entity model
- a verification workflow
- supporting document metadata
- a public-safe aggregate response
- region-scoped attributes
- sensitivity classification
- audit logging
- RBAC and ABAC decision points
- a progressive admin wizard

## SIKESRA-Inspired Fixture Shapes

Use these as reference names and patterns in docs, fixtures, tests, and UI examples:

- `registry_entity`
- `verification_event`
- `supporting_document`
- `public_aggregate`
- `audit_event`
- `access_permission`
- `access_role`
- `abac_subject`
- `abac_resource`
- `abac_policy`

## Sensitivity Levels

- `public_safe`
- `internal`
- `restricted`
- `highly_restricted`

## Region Attributes

- `province_code`
- `regency_code`
- `district_code`
- `village_code`

## Recommended Implementation Order

Follow this order for atomic work items:

1. documentation foundation
2. plugin standard upgrade
3. data model reference fixtures
4. security tests for RBAC, ABAC, masking, audit, and public-safe aggregate behavior
5. admin UI and UX reference surfaces
6. local and Cloudflare template alignment
7. public aggregate route and page
8. Cloudflare deployability hardening
9. e2e validation flows

## Non-Goals

- full SIKESRA production implementation
- EmDash core changes
- multi-tenant SaaS platform work
- marketplace packaging work
