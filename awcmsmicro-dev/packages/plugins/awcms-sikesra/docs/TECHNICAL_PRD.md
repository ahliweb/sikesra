# AWCMS-Micro SIKESRA Technical PRD

> **Note (Juni 2026):** package/plugin identifiers below were corrected to match the real published package — see `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8a in the repository root for the full naming history. For the complete, code-verified product/technical reference (storage model, 39 routes, security gap, etc.), see `docs/prd/` in the repository root — this file remains a useful overview of intent but `docs/prd/` is canonical.

## 1. Overview

This document describes the technical implementation shape of `@ahliweb/awcms-sikesra`.

The canonical, code-verified reference is the repository-root `docs/prd/` suite. This file is a package-local overview for consumers who need the plugin surface quickly without reading the full PRD set.

### Purpose

- provide a native SIKESRA plugin with admin UI, server routes, storage, and hooks
- provide a reusable reference for plugin-owned navigation and governance workflows
- keep security-sensitive behavior explicit, auditable, and localized

### Product Shape

- package: `@ahliweb/awcms-sikesra`
- plugin id: `awcms-sikesra`
- package version: `0.1.1` in `package.json`
- localization: `en` default, `id` supported
- UI system: Kumo components for admin surfaces
- status: 39 routes, 16 admin pages, 3 widgets, 1 field widget
- known gap: mutating routes still lack verified-identity and permission enforcement server-side

```mermaid
flowchart LR
  Admin[Admin UI] --> Plugin[SIKESRA Plugin]
  Plugin --> Nav[Plugin Navigation]
  Plugin --> Access[Access Catalog]
  Plugin --> ABAC[ABAC Engine]
  Plugin --> Audit[Audit Log]
  Plugin --> Store[(Plugin Storage)]
  Plugin --> Routes[API Routes]
  Routes --> Admin
  Routes --> Public[Public Safe Status]
```

## 2. Requirements

### Functional Requirements

- expose a native plugin entry and a resolved plugin entry
- provide grouped admin navigation placed above default EmDash menus
- provide admin pages, widgets, and field widgets
- provide registry, verification, document, access-rights, ABAC, and audit workflows
- provide a public-safe status route
- keep policy and preview logic inside plugin-owned routes
- support install, activate, deactivate, and uninstall lifecycle hooks
- record plugin-owned data in plugin-owned storage namespaces

### Non-Functional Requirements

- all user-facing strings must be localized
- admin layout must remain RTL-safe
- sensitive decisions must be auditable
- validation must be deterministic
- changes must remain additive unless a breaking package bump is intentional

### Security Requirements

- no global admin enforcement replacement
- no EmDash core auth fork
- no secret values in tracked source or docs
- no unchecked public route exposure beyond the explicit public-safe status endpoint
- no assumption that preview routes already enforce real authorization on mutating flows

## 3. Core Features

### Navigation and Admin Modules

- overview dashboard summary
- registry, documents, and import views
- verification flow
- audit log and reports views
- access control pages
- ABAC pages
- official regions and data-type management views

### Route Groups

- public-safe status route
- registry, document, import, and overview routes
- verification routes
- settings, regions, and data-type routes
- audit routes
- access-rights routes
- ABAC routes
- health and preview routes

### Data and Behavior Modules

- access catalog CRUD
- role catalog CRUD
- user-to-role assignments
- role-to-permission assignments
- ABAC attribute catalog
- ABAC subject/resource assignments
- ABAC policy CRUD
- audit event capture
- content snapshot references

### Hook Surface

- lifecycle hooks
- content hooks
- media hooks
- cron hooks
- page metadata hook

## 4. User Flow

### Operator Flow

1. install the package in a workspace or standalone project
2. register the plugin through standard EmDash configuration
3. open the admin and validate that plugin navigation appears at the top
4. configure settings, roles, permissions, attributes, and policies
5. run access previews and ABAC previews
6. review audit trails and report pages
7. publish or uninstall after validation

### Reviewer Flow

1. inspect plugin boundaries and manifests
2. confirm locale support and public-safe route exposure
3. verify audit and storage behavior
4. confirm the plugin does not alter core auth behavior

## 5. Architecture

### Implementation Files

- `src/index.ts`: plugin descriptor and resolved plugin entry
- `src/admin.tsx`: native admin surface
- `src/runtime.ts`: source of truth for storage, routes, hooks, manifest, region tree, data types, audit helpers, and seed catalogs
- `src/navigation.ts`: navigation models and adapters
- `src/permissions.ts`: test-only permission constants; not consumed by `runtime.ts`
- `src/audit.ts`: legacy dead code; the active audit helpers live in `src/runtime.ts`
- `src/sandbox.ts`: sandbox-compatible server-side entry

### Data Flow

```mermaid
flowchart TD
  Config[EmDash plugin config] --> Entry[src/index.ts]
  Entry --> Runtime[src/runtime.ts]
  Runtime --> Admin[src/admin.tsx]
  Runtime --> Sandbox[src/sandbox.ts]
  Admin --> Routes[Plugin routes]
  Routes --> Storage[(Plugin-owned storage)]
  Routes --> Audit[(Audit events)]
  Storage --> Preview[Access/ABAC preview]
  Audit --> Reviewer[Reviewer]
```

### Runtime Boundaries

- native entry owns admin page and widget registration
- runtime entry owns plugin descriptor and route wiring
- sandbox entry owns server-side route compatibility
- navigation module owns plugin-local menu generation and adaptation

## 6. Database Schema

The plugin uses plugin-owned storage namespaces rather than EmDash core schema changes.

### Storage Entities

- `auditEvents`
- `accessChangeEvents`
- `abacChangeEvents`
- `registryEntities`
- `supportingDocuments`
- `verificationStageState`
- `verificationEvents`
- `abacAttributeCatalog`
- `abacPolicyRules`
- `abacResourceAssignments`
- `abacSubjectAssignments`
- `contentSnapshots`
- `settingsState`
- `pluginState`
- `permissionCatalog`
- `roleCatalog`
- `rolePermissionAssignments`
- `userRoleAssignments`

### Logical Relationships

```mermaid
erDiagram
  roleCatalog ||--o{ rolePermissionAssignments : maps
  permissionCatalog ||--o{ rolePermissionAssignments : grants
  userRoleAssignments ||--o{ roleCatalog : assigns
  abacAttributeCatalog ||--o{ abacPolicyRules : constrains
  abacSubjectAssignments ||--o{ abacPolicyRules : evaluates
  abacResourceAssignments ||--o{ abacPolicyRules : evaluates
  auditEvents ||--o{ accessChangeEvents : captures
  auditEvents ||--o{ abacChangeEvents : captures
```

### Schema Rules

- indexes must support timestamp, scope, and role/permission lookup
- no direct dependence on upstream core tables unless already provided by EmDash plugin APIs
- sensitive metadata must be stored only in plugin-owned storage

## 7. Design & Technical Constraints

### UI/UX Constraints

- use Kumo for admin controls
- keep labels localized
- group menu items into a distinct collapsible plugin group
- keep controls readable in light and dark themes

### Backend Constraints

- routes must be explicit and reviewable
- preview logic must not silently enforce global permissions
- audit writes must accompany sensitive changes
- public-safe routes must not leak private state
- hardening work must treat `registry/save`, `documents/save`, `import/promote`, `verification/advance`, and `verification/reject` as currently under-protected

### Integration Constraints

- do not modify EmDash auth internals
- do not require template code to duplicate plugin logic
- do not introduce AI behaviors without a separate AI governance decision and approval path

### Testing Constraints

- typecheck admin and runtime code
- test navigation normalization and permissions logic
- test validation, audit writes, and public-safe route responses
- test English and Indonesian copy paths where applicable

## 8. Acceptance Criteria

- plugin registers and loads successfully in an EmDash project
- admin pages and navigation render correctly
- access preview and ABAC preview return deterministic results
- audit events are recorded for sensitive operations
- public-safe status route stays public and safe
- package changelog reflects all technical releases

## 9. Out Of Scope

- replacing EmDash core auth
- adding product-wide shared logic outside plugin boundaries
- adding template-specific presentation code here
- storing secrets in tracked files
- unreviewed AI-based enforcement or automation
