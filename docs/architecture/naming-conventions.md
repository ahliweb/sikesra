# SIKESRA Naming Conventions

## Purpose

This document standardizes naming across SIKESRA (awcms-mini-sikesra) so runtime code, database schema, policy logic, admin screens, plugins, and documentation use one shared vocabulary.

## Core Rule

Use explicit, stable, domain-specific names.

Avoid vague, overloaded, or product-drifting names. If a name could mean different things in auth, governance, content, or geography, choose a more specific term.

## General Naming Rules

- prefer ASCII, lowercase, and literal naming in paths, flags, and identifiers
- prefer full domain words over unclear abbreviations
- prefer consistency over cleverness
- prefer names that match the architecture documents and issue backlog
- do not introduce AWCMS multi-tenant vocabulary into Mini
- do not invent synonyms for already-established domain concepts

Examples:

- use `administrative-region` instead of `geo-unit`
- use `staff_level` instead of `rank` when referring to role hierarchy metadata
- use `job_level` instead of `grade` unless a future issue explicitly defines a separate concept
- use `Guru Agama` not `Guru Ngaji` for the general religious teacher module label

## Domain Vocabulary

### User

- Meaning: a canonical authenticated identity in the system
- Use for:
  - login identity
  - profile ownership
  - session ownership
  - role assignment target
  - job assignment target
  - region assignment target
- Do not substitute with:
  - member
  - account
  - actor

`actor` may be used only in policy and audit contexts when a user performs an action.

### Role

- Meaning: an authorization construct that grants permissions
- Use for:
  - RBAC assignment
  - protected role rules
  - `staff_level` metadata
- Do not use interchangeably with:
  - job
  - title
  - position

### Permission

- Meaning: an explicit grantable capability code
- Use for:
  - RBAC catalog entries
  - route/service guard checks
  - plugin capability registration
- Do not describe permissions as:
  - rights bundle
  - access mode
  - role rule

### Job

- Meaning: an organizational assignment, not an authorization grant
- Use for:
  - reporting structure
  - titles
  - levels
  - supervisor relationships
- Do not conflate with:
  - role
  - permission
  - region scope

### Logical Region

- Meaning: an internal operational hierarchy used for business scope
- Use for:
  - editorial or operational ownership
  - internal scope evaluation
  - management boundaries
- Do not conflate with:
  - administrative region
  - office location
  - legal geography

### Administrative Region

- Meaning: an Indonesian legal/geographic hierarchy
- Use for:
  - province
  - regency/city
  - district
  - village
- Do not shorten to:
  - geo
  - territory
  - area
    when the legal hierarchy is intended

### Policy

- Meaning: centralized authorization logic that evaluates whether an action is allowed
- Use for:
  - RBAC resolution
  - ABAC evaluation
  - allow/deny decisions

## Permission Naming

Permission codes must use:

`scope.resource.action`

This format is mandatory.

### Permission Segment Rules

- `scope`: top-level area such as `admin`, `content`, `security`, `audit`, `plugins`, `governance`
- `resource`: concrete target such as `users`, `roles`, `jobs`, `regions`, `administrative_regions`, `sessions`
- `action`: operation such as `read`, `create`, `update`, `delete`, `assign`, `publish`, `revoke`, `reset`

### Permission Examples

- `admin.users.read`
- `admin.users.update`
- `admin.roles.assign`
- `admin.permissions.update`
- `governance.jobs.assign`
- `governance.regions.read`
- `governance.administrative_regions.assign`
- `security.sessions.revoke`
- `security.2fa.reset`
- `audit.logs.read`
- `plugins.manage.update`

### Permission Rules

- permission codes should be lowercase with dot separators
- resource names should generally be plural nouns
- action names should be verbs
- do not encode role names inside permission codes
- do not encode region names inside permission codes
- do not create permission codes that mix multiple unrelated resources

## Table Naming

Database tables should use `snake_case` plural nouns.

Examples:

- `users`
- `user_profiles`
- `sessions`
- `login_security_events`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `job_levels`
- `job_titles`
- `user_jobs`
- `regions`
- `administrative_regions`
- `user_region_assignments`
- `user_administrative_region_assignments`
- `audit_logs`
- `security_events`

## Column Naming

Columns should use `snake_case`.

### Identifier Rules

- primary keys: `id`
- foreign keys: `<related>_id`
- timestamps: `<event>_at`
- booleans: `is_<state>` or `<verb>_at` depending on whether state or event timing matters

## Soft Delete Naming

Use these names consistently when soft delete is supported:

- `deleted_at`: timestamp marking logical deletion
- `deleted_by_user_id`: optional actor who performed the deletion
- `delete_reason`: optional operator-visible deletion reason

## Service Naming

Services should be named by domain and responsibility.

Preferred format:

- `<Domain>Service` for domain orchestration
- `<Domain>Repository` for persistence access
- `<Domain>Policy` or `<Domain>PolicyRules` for policy-specific modules

## Route and Path Naming

Route segments should be lowercase and literal.

Examples:

- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/jobs`
- `/admin/regions`
- `/admin/administrative-regions`
- `/admin/security`
- `/admin/audit-logs`

## Forbidden Vocabulary

Do not introduce these terms unless a later issue creates a clearly different concept:

- tenant
- workspace
- organization tree as a synonym for both jobs and regions
- geo when administrative region is intended
- rank when staff level is intended
- permission bundle as a replacement for role
- Guru Ngaji (use `Guru Agama` instead)
