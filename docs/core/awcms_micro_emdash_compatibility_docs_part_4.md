# AWCMS-Micro Implementation Documentation

## Part 4 — Plugin and Module System

**Document status:** Draft v0.1  
**Purpose:** Define how AWCMS-Micro should implement plugins and modules while preserving compatibility with original EmDash plugin architecture, official templates, marketplace plugins, admin conventions, and future upstream updates.

---

## 1. Objective of Part 4

Part 4 defines the plugin and module system for AWCMS-Micro.

This document covers:

1. EmDash plugin compatibility principles;
2. native plugin strategy;
3. marketplace/sandbox plugin strategy;
4. AWCMS-Micro module concept;
5. module manifest standard;
6. module registry;
7. plugin and module lifecycle;
8. module installation and disable behavior;
9. permission and capability model;
10. storage scopes;
11. API route strategy;
12. admin page strategy;
13. testing;
14. rollback;
15. GitHub Issues;
16. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
Use EmDash plugins for compatibility.
Use AWCMS-Micro modules for governed business/product expansion.
Do not modify EmDash plugin runtime unless absolutely necessary and documented.
```

---

## 2. Core Principle

AWCMS-Micro must preserve EmDash extensibility while adding AWCMS governance.

```txt
EmDash plugin system = extension mechanism.
AWCMS-Micro module system = governed product discipline.
```

A plugin is a technical extension.
A module is a product/business capability.

A module may be implemented by one or more plugins, packages, database tables, admin pages, API routes, permissions, and storage scopes.

---

## 3. Terminology

### 3.1 Plugin

A plugin is a technical extension loaded through the EmDash-compatible plugin system.

A plugin may provide:

- API routes;
- admin pages;
- admin widgets;
- lifecycle hooks;
- settings;
- storage access;
- external integration;
- content processing;
- UI extensions.

### 3.2 Module

A module is an AWCMS-Micro governed feature package.

A module may include:

- plugin implementation;
- module manifest;
- permissions;
- database schema;
- admin navigation;
- public routes;
- mobile API routes;
- storage scope;
- validation rules;
- test plan;
- documentation;
- rollback instructions.

### 3.3 Native Plugin

A native plugin runs in the application process and can deeply integrate with the website/admin runtime.

Use native plugins for:

- AWCMS internal modules;
- ABAC matrix GUI;
- audit log;
- mobile API;
- secure document lookup;
- complex React admin pages;
- internal platform features.

### 3.4 Marketplace/Sandbox Plugin

A marketplace or sandbox plugin is installed through the EmDash marketplace/plugin mechanism and runs in V8 isolates via **Dynamic Worker Loaders** with declared capabilities.

Use sandbox plugins for:

- safer third-party extensions;
- analytics;
- simple integrations;
- content utilities;
- external services with limited capability access.

Sandboxed plugins run in isolated V8 environments on Cloudflare Workers with capability-based permissions.

### 3.5 Capability

A capability is a declared technical permission requested by a plugin.

Examples:

```txt
content:read
content:write
media:read
media:write
network:request
settings:read
settings:write
```

### 3.6 Permission

A permission is a user or role access control rule used inside AWCMS-Micro and EmDash admin/API workflows.

Examples:

```txt
awcms:module:install
awcms:module:disable
awcms:document:read
awcms:document:create
awcms:policy:write
```

---

## 4. Plugin vs Module Boundary

### 4.1 Plugin Boundary

A plugin answers:

```txt
How is the feature technically connected to EmDash/AWCMS-Micro?
```

Examples:

- plugin API route;
- plugin admin page;
- plugin hook;
- plugin setting;
- plugin capability.

### 4.2 Module Boundary

A module answers:

```txt
What product/business feature is installed, governed, versioned, permissioned, tested, and documented?
```

Examples:

- Documents module;
- Forms module;
- Audit Log module;
- Mobile API module;
- ABAC Matrix module;
- Academic Calendar module;
- Kelulusan module;
- Future CRM module.

### 4.3 Boundary Rule

```txt
Every AWCMS-Micro module must be explicit, versioned, permission-aware, tenant-ready, documented, and testable.
```

---

## 5. Compatibility Requirements

AWCMS-Micro must preserve EmDash plugin compatibility.

EmDash plugins are defined using the `definePlugin()` API and loaded through the integration's `plugins` array in `astro.config.mjs`:

```ts
import emdash from "emdash/astro";
import seoPlugin from "@emdash-cms/plugin-seo";

emdash({
  plugins: [seoPlugin({ maxTitleLength: 60 })],
});
```

EmDash ships these first-party plugins that AWCMS-Micro should use instead of rebuilding:

- `@emdash-cms/plugin-forms` — Form handling
- `@emdash-cms/plugin-seo` — SEO metadata
- `@emdash-cms/plugin-audit-log` — Audit logging
- `@emdash-cms/plugin-embeds` — Content embeds

Plugin lifecycle hooks available in EmDash:

```txt
content:beforeSave
content:afterSave
content:beforeDelete
content:afterDelete
media:beforeUpload
media:afterUpload
```

Plugin features:

- **Isolated KV storage** — each plugin gets namespaced key-value storage
- **Admin UI extensions** — dashboard widgets, settings pages, custom field editors
- **API routes** — under `/_emdash/api/plugins/{plugin-id}/`
- **Custom block types** — Block Kit for rich text editor extensions

Do not break:

1. native plugin loading;
2. marketplace plugin installation;
3. sandbox plugin execution (Dynamic Worker Loaders);
4. plugin capability declaration;
5. plugin route namespace (`/_emdash/api/plugins/`);
6. plugin settings;
7. plugin KV storage isolation;
8. plugin lifecycle hooks;
9. admin plugin pages/widgets;
10. official template usage;
11. plugin update behavior;
12. plugin removal behavior.

### 5.1 Compatibility Rule

```txt
AWCMS-Micro may add governance around plugins.
AWCMS-Micro must not silently change the meaning of EmDash plugin behavior.
```

### 5.2 Marketplace Plugin Policy

AWCMS-Micro should support marketplace plugins, but with review:

| Plugin Risk | Example | Policy |
| --- | --- | --- |
| Low | SEO metadata helper | Allow after capability review |
| Medium | Webhook sender | Allow with network allowlist and audit |
| High | Content writer/importer | Install first in staging, require approval |
| Critical | Broad content/media/network access | Block or require security review |

---

## 6. Recommended Plugin Directory Structure

```txt
packages/plugins/
  documents/
    package.json
    README.md
    module.manifest.json
    src/
      index.ts
      routes/
      admin/
      services/
      schemas/
      migrations/
      tests/

  forms/
    package.json
    README.md
    module.manifest.json
    src/
      index.ts
      routes/
      admin/
      services/
      schemas/
      migrations/
      tests/

  audit-log/
    package.json
    README.md
    module.manifest.json
    src/
      index.ts
      routes/
      admin/
      services/
      schemas/
      migrations/
      tests/

  mobile-api/
    package.json
    README.md
    module.manifest.json
    src/
      index.ts
      routes/
      services/
      schemas/
      tests/

  abac-matrix/
    package.json
    README.md
    module.manifest.json
    src/
      index.ts
      routes/
      admin/
      services/
      schemas/
      tests/
```

---

## 7. Recommended AWCMS Package Structure

```txt
packages/awcms/
  compatibility/
    README.md
    src/
      emdash-adapter.ts
      plugin-compatibility.ts
      template-compatibility.ts

  module-registry/
    README.md
    src/
      registry.ts
      manifest.ts
      installer.ts
      lifecycle.ts
      validation.ts

  permissions/
    README.md
    src/
      permission-registry.ts
      permission-checker.ts
      abac-bridge.ts

  tenancy/
    README.md
    src/
      context.ts
      default-tenant.ts
      site-context.ts

  audit/
    README.md
    src/
      audit-service.ts
      audit-event.ts
      audit-writer.ts

  storage/
    README.md
    src/
      object-key.ts
      safe-filename.ts
      storage-scope.ts
```

---

## 8. AWCMS Module Manifest Standard

Every AWCMS-Micro module should include:

```txt
module.manifest.json
```

### 8.1 Minimum Manifest

```json
{
  "id": "documents",
  "name": "Documents",
  "description": "Manage public, internal, and private documents.",
  "version": "0.1.0",
  "tenantReady": true,
  "siteScoped": true,
  "status": "experimental",
  "category": "content",
  "author": "AWCMS-Micro",
  "permissions": [],
  "capabilities": [],
  "routes": [],
  "adminPages": [],
  "storageScopes": [],
  "database": {
    "migrations": []
  },
  "dependencies": [],
  "validation": {
    "requiredSettings": []
  },
  "rollback": {
    "disableSafe": true,
    "dataDestructive": false
  }
}
```

### 8.2 Full Manifest Example: Documents Module

```json
{
  "id": "documents",
  "name": "Documents",
  "description": "Manage public, internal, restricted, and private documents.",
  "version": "0.1.0",
  "tenantReady": true,
  "siteScoped": true,
  "status": "experimental",
  "category": "content",
  "author": "AWCMS-Micro",
  "permissions": [
    "awcms:document:read",
    "awcms:document:create",
    "awcms:document:update",
    "awcms:document:delete",
    "awcms:document:restore",
    "awcms:document:publish",
    "awcms:document:private_download"
  ],
  "capabilities": [
    "content:read",
    "media:read",
    "media:write"
  ],
  "routes": [
    {
      "type": "api",
      "method": "GET",
      "path": "/_emdash/api/plugins/documents/v1/documents",
      "permission": "awcms:document:read"
    },
    {
      "type": "api",
      "method": "POST",
      "path": "/_emdash/api/plugins/documents/v1/documents",
      "permission": "awcms:document:create"
    }
  ],
  "adminPages": [
    {
      "label": "Documents",
      "path": "/_emdash/admin/plugins/documents",
      "permission": "awcms:document:read"
    }
  ],
  "storageScopes": [
    {
      "id": "documents-public",
      "prefix": "tenants/{tenant_id}/sites/{site_id}/modules/documents/public/",
      "visibility": "public"
    },
    {
      "id": "documents-private",
      "prefix": "tenants/{tenant_id}/sites/{site_id}/modules/documents/private/",
      "visibility": "private"
    }
  ],
  "database": {
    "migrations": [
      "202605050930_create_documents.sql"
    ]
  },
  "dependencies": [
    "audit-log"
  ],
  "validation": {
    "requiredSettings": [
      "documents.maxFileSizeBytes",
      "documents.allowedMimeTypes"
    ]
  },
  "rollback": {
    "disableSafe": true,
    "dataDestructive": false,
    "notes": "Disabling the module hides admin routes but keeps document metadata and media objects."
  }
}
```

---

## 9. Module Registry

### 9.1 Purpose

The module registry tracks which modules exist, their versions, installation state, permissions, dependencies, storage scopes, and migration status.

### 9.2 Required Registry Data

```txt
module id
module name
version
status
installed_at
enabled_at
disabled_at
tenant_id
site_id
settings_json
manifest_json
migration_state
created_at
updated_at
deleted_at
```

### 9.3 Tables

Recommended tables (use `awcms_` prefix):

```txt
awcms_modules
awcms_module_installations
awcms_module_settings
awcms_module_events
```

### 9.4 `modules` Conceptual Schema

```sql
create table awcms_modules (
  id text primary key,
  name text not null,
  description text null,
  version text not null,
  category text null,
  tenant_ready integer not null default 0,
  site_scoped integer not null default 1,
  manifest_json text not null,
  status text not null default 'available',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null
);
```

### 9.5 `module_installations` Conceptual Schema

```sql
create table awcms_module_installations (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  module_id text not null,
  version text not null,
  status text not null default 'installed',
  settings_json text null,
  installed_at text not null default (datetime('now')),
  enabled_at text null,
  disabled_at text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, module_id)
);
```

### 9.6 Installation Status Values

```txt
available
installed
enabled
disabled
upgrade_available
migration_required
failed
removed
```

---

## 10. Module Lifecycle

### 10.1 Lifecycle States

```txt
registered
installed
enabled
disabled
upgraded
rolled_back
removed
failed
```

### 10.2 Lifecycle Flow

```txt
Discover module
  ↓
Validate manifest
  ↓
Check dependencies
  ↓
Check permissions/capabilities
  ↓
Run migrations if needed
  ↓
Install module
  ↓
Enable routes/admin pages
  ↓
Register permissions
  ↓
Register storage scopes
  ↓
Write audit event
```

### 10.3 Disable Flow

```txt
Request disable
  ↓
Check permission: awcms:module:disable
  ↓
Check dependent modules
  ↓
Disable routes/admin visibility
  ↓
Keep data by default
  ↓
Write audit event
```

### 10.4 Remove Flow

Removing is more dangerous than disabling.

```txt
Request remove
  ↓
Check permission: awcms:module:remove
  ↓
Require backup confirmation
  ↓
Disable module first
  ↓
Optionally remove settings
  ↓
Do not destroy data unless explicitly approved
  ↓
Write audit event
```

### 10.5 Upgrade Flow

```txt
Check current version
  ↓
Read new manifest
  ↓
Compare permissions/capabilities
  ↓
Require approval for new capabilities
  ↓
Backup if migration needed
  ↓
Run migration
  ↓
Run tests/smoke checks
  ↓
Mark upgraded
  ↓
Write audit event
```

---

## 11. Permission Model for Modules

### 11.1 Permission Namespace

AWCMS-specific permissions should use:

```txt
awcms:<resource>:<action>
```

Examples:

```txt
awcms:module:read
awcms:module:install
awcms:module:disable
awcms:module:upgrade
awcms:module:remove
awcms:document:read
awcms:document:create
awcms:document:update
awcms:document:delete
awcms:document:restore
awcms:document:publish
awcms:form_submission:read
awcms:form_submission:export
awcms:audit:read
awcms:policy:read
awcms:policy:write
awcms:policy:test
```

### 11.2 Permission Rule

```txt
Do not invent unnamespaced permission strings inside route files.
All permissions must be declared in module manifest or permission registry.
```

### 11.3 Permission Registration

When a module is installed:

1. read permissions from manifest;
2. validate naming;
3. register permissions;
4. assign default role mappings if configured;
5. audit registration.

### 11.4 Default Module Roles

Optional default role mappings:

| Role | Example Access |
| --- | --- |
| owner | full access |
| admin | install, configure, manage |
| editor | create/update/publish content |
| author | create/update own content |
| auditor | read-only logs/reports |
| public | public read only |

---

## 12. Capability Model for Marketplace Compatibility

### 12.1 Capability vs Permission

Capability answers:

```txt
What can this plugin technically access?
```

Permission answers:

```txt
What can this user do?
```

Both are required.

### 12.2 Capability Review

Each plugin must declare technical capability needs.

Examples:

```txt
content:read
content:write
media:read
media:write
settings:read
settings:write
network:request
admin:page
storage:read
storage:write
```

### 12.3 Capability Approval Matrix

| Capability | Risk | Requirement |
| --- | --- | --- |
| content:read | Low/Medium | Review data exposure |
| content:write | Medium/High | Audit and staging test |
| media:read | Medium | Storage scope review |
| media:write | High | File validation and quota |
| settings:write | High | Admin approval |
| network:request | Medium/High | Allowlist external hosts |
| admin:page | Medium | UI and permission review |
| storage:write | High | Prefix scope and audit |

### 12.4 New Capability Rule

If a plugin update requests new capabilities:

```txt
Require explicit admin approval before update is activated.
```

---

## 13. Storage Scopes for Modules

### 13.1 Why Storage Scopes Are Required

Each module must be restricted to a defined storage prefix to avoid uncontrolled file access.

### 13.2 Storage Scope Format

```json
{
  "id": "documents-private",
  "prefix": "tenants/{tenant_id}/sites/{site_id}/modules/documents/private/",
  "visibility": "private",
  "maxFileSizeBytes": 10485760,
  "allowedMimeTypes": [
    "application/pdf"
  ]
}
```

### 13.3 Storage Scope Rules

1. prefix must include tenant context;
2. prefix should include site context where site-scoped;
3. prefix should include module ID;
4. visibility must be explicit;
5. file size and MIME policy should be configurable;
6. private files require signed URLs;
7. sensitive file access must be audited.

### 13.4 Storage Scope Examples

Documents:

```txt
tenants/default/sites/main/modules/documents/public/
tenants/default/sites/main/modules/documents/private/
```

Forms:

```txt
tenants/default/sites/main/modules/forms/attachments/
```

Kelulusan:

```txt
tenants/default/sites/main/modules/kelulusan/2026/
```

Media Library:

```txt
tenants/default/sites/main/media/
```

---

## 14. API Route Strategy

### 14.1 Plugin API Namespace

Use EmDash-compatible plugin namespace:

```txt
/_emdash/api/plugins/{plugin_id}/{version}/{route}
```

Examples:

```txt
/_emdash/api/plugins/documents/v1/documents
/_emdash/api/plugins/forms/v1/submissions
/_emdash/api/plugins/mobile-api/v1/bootstrap
/_emdash/api/plugins/abac-matrix/v1/policies
```

Optional public aliases may exist:

```txt
/api/mobile/v1/*
/api/public/v1/*
```

But aliases should route through stable AWCMS API adapters, not bypass permission checks.

### 14.2 API Versioning

Every module API should version routes:

```txt
v1
v2
```

Rules:

- do not break `v1` silently;
- add new fields instead of removing old fields;
- document deprecations;
- keep mobile-facing APIs stable;
- add tests for API contracts.

### 14.3 API Response Shape

Recommended success response:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_...",
    "apiVersion": "v1"
  }
}
```

Recommended error response:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action.",
    "details": null
  },
  "meta": {
    "requestId": "req_...",
    "apiVersion": "v1"
  }
}
```

### 14.4 State-Changing Route Rule

For state-changing operations:

- require authentication where needed;
- require permission;
- validate CSRF or trusted request header according to EmDash conventions;
- never use GET for mutation;
- write audit event.

---

## 15. Admin Page Strategy

### 15.1 Admin Extension Rule

Prefer EmDash-compatible admin extension patterns.

Do not hardcode module navigation into unrelated admin core files.

### 15.2 Admin Page Manifest

Each module admin page should declare:

```json
{
  "label": "Documents",
  "path": "/_emdash/admin/plugins/documents",
  "permission": "awcms:document:read",
  "icon": "FileText",
  "group": "Content"
}
```

### 15.3 Role-Aware Navigation

Admin menu visibility must depend on effective permission.

Rules:

- users without permission do not see menu item;
- direct route access still checks permission;
- hidden menu is not security by itself;
- all API routes check permission separately.

### 15.4 Standard Admin Groups

Recommended admin groups:

```txt
Dashboard
Content
Media
Forms
Documents
Appearance
Users & Access
Modules
Integrations
System
Audit
```

---

## 16. Module Settings

### 16.1 Settings Storage

Use `module_settings` or `module_installations.settings_json`.

Settings should be tenant/site-scoped when needed.

### 16.2 Example Settings

Documents module:

```json
{
  "maxFileSizeBytes": 10485760,
  "allowedMimeTypes": ["application/pdf"],
  "defaultVisibility": "private",
  "signedUrlExpirationSeconds": 300
}
```

Forms module:

```json
{
  "requireConsent": true,
  "allowAnonymousSubmissions": true,
  "maxAttachmentSizeBytes": 5242880,
  "spamProtection": "turnstile"
}
```

Mobile API module:

```json
{
  "enabled": true,
  "apiVersion": "v1",
  "minimumAppVersion": "1.0.0",
  "maintenanceMode": false
}
```

### 16.3 Settings Rule

Settings changes must be audited when they affect:

- permissions;
- public visibility;
- upload policy;
- external integrations;
- privacy behavior;
- security controls.

---

## 17. Module Dependencies

### 17.1 Dependency Declaration

Manifest example:

```json
{
  "dependencies": [
    "audit-log",
    "media"
  ]
}
```

### 17.2 Dependency Rule

A module cannot be enabled if required dependencies are missing or disabled.

### 17.3 Dependency Examples

| Module | Depends On |
| --- | --- |
| Documents | Media, Audit Log |
| Forms | Audit Log, optional Turnstile |
| Kelulusan | Documents, Media, Audit Log |
| ABAC Matrix | Permissions, Audit Log |
| Mobile API | Content services, Documents optional |
| Webhook Notifier | Audit Log, Integration Settings |

---

## 18. Module Categories

Recommended categories:

```txt
core
content
media
forms
security
access-control
integration
appearance
public-service
mobile-api
future-erp
```

Examples:

| Module | Category |
| --- | --- |
| Pages | core/content |
| Blog/News | content |
| Documents | content |
| Forms | forms |
| Audit Log | security |
| ABAC Matrix | access-control |
| Mobile API | mobile-api |
| Webhook Notifier | integration |
| Theme Manager | appearance |
| Kelulusan | public-service |

---

## 19. MVP Modules

### 19.1 Required MVP Modules

```txt
core-settings
pages
blog-news
announcements
menus
media
seo
forms
documents
users-roles
module-registry
audit-log
default-tenant
theme-layout-manager
```

### 19.2 First Optional Modules

```txt
academic-calendar
staff-directory
gallery
secure-document-lookup
kelulusan
webhook-notifier
mobile-api
```

### 19.3 Avoid in MVP

```txt
billing
marketplace publishing
full ERP
accounting
inventory
HR
procurement
complex workflow
full visual builder
AI writing automation
```

---

## 20. Recommended First Native Plugins

### 20.1 Audit Log Plugin

Why first:

```txt
All important module actions need audit trails.
```

Provides:

- audit event service;
- admin audit page;
- audit API;
- event filtering;
- export later.

### 20.2 Documents Plugin

Why early:

```txt
Most school/company/government sites need downloadable documents.
```

Provides:

- document metadata;
- media link;
- classification;
- public/private access;
- signed URLs;
- audit on download.

### 20.3 Forms Plugin

Why early:

```txt
Public websites need contact and registration forms.
```

Provides:

- form definitions;
- submissions;
- consent;
- spam protection;
- admin submission view;
- export permission.

### 20.4 Module Registry Plugin

Why early:

```txt
AWCMS-Micro needs disciplined module visibility and lifecycle.
```

Provides:

- installed modules list;
- module status;
- dependencies;
- settings;
- enable/disable.

### 20.5 ABAC Matrix Plugin

Why after basic permissions:

```txt
Access control must be manageable visually, but only after permission registry is stable.
```

Provides:

- role/permission matrix;
- ABAC rule UI;
- effective access preview;
- audit of policy changes.

---

## 21. Module Install/Disable UX

### 21.1 Module List Page

Columns:

```txt
Module
Version
Category
Status
Tenant Ready
Site Scoped
Dependencies
Risk Level
Actions
```

Actions:

```txt
View
Install
Enable
Disable
Configure
Upgrade
View Logs
```

### 21.2 Module Detail Page

Sections:

```txt
Overview
Permissions
Capabilities
Storage Scopes
Routes
Admin Pages
Dependencies
Settings
Migrations
Audit Events
Rollback
```

### 21.3 Install Confirmation

Before install, show:

- requested permissions;
- technical capabilities;
- storage scopes;
- database migrations;
- dependencies;
- rollback notes;
- risk level.

---

## 22. Risk Classification

### 22.1 Module Risk Levels

| Risk | Criteria | Example |
| --- | --- | --- |
| Low | Public read-only, no external network | SEO helper |
| Medium | Writes content or sends webhooks | Forms, webhook notifier |
| High | Handles private files or user data | Documents, secure lookup |
| Critical | Changes permissions/auth or broad data access | ABAC Matrix, auth plugin |

### 22.2 Required Review by Risk

| Risk | Review Required |
| --- | --- |
| Low | Admin approval |
| Medium | Admin approval + audit |
| High | Security review + staging test |
| Critical | Security review + backup + rollback plan + owner approval |

---

## 23. Marketplace Plugin Compatibility Gate

### 23.1 Purpose

AWCMS-Micro should allow EmDash marketplace plugins, but safely.

### 23.2 Compatibility Gate Checks

Before activating marketplace plugin:

1. validate plugin signature/source if available;
2. review capabilities;
3. review network access;
4. review storage access;
5. review admin UI extension;
6. check compatibility with current EmDash version;
7. install in staging first when high risk;
8. approve or reject;
9. write audit event.

### 23.3 Block Conditions

Block plugin when:

- capability request is too broad;
- source is untrusted;
- plugin requires unsupported EmDash version;
- plugin requests unrestricted network access;
- plugin writes outside allowed storage scope;
- plugin tries to bypass permissions;
- plugin conflicts with AWCMS tenant/security policy.

---

## 24. Module API Security

Every module API route must follow:

```txt
1. parse request safely;
2. validate input;
3. derive tenant/site context;
4. authenticate when required;
5. check permission;
6. check ABAC policy when applicable;
7. perform action;
8. write audit event when needed;
9. return consistent response;
10. avoid leaking internal errors.
```

### 24.1 Error Codes

Recommended:

```txt
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
PAYLOAD_TOO_LARGE
UNSUPPORTED_MEDIA_TYPE
MODULE_DISABLED
DEPENDENCY_MISSING
INTERNAL_ERROR
```

### 24.2 Public Route Safety

Public routes must:

- expose only published/public data;
- exclude soft-deleted records;
- filter by tenant/site;
- avoid leaking private fields;
- use cache headers carefully;
- rate-limit sensitive actions.

---

## 25. Testing Strategy

### 25.1 Plugin Load Tests

Test:

```txt
- plugin can be imported;
- manifest is valid;
- routes register;
- admin pages register;
- permissions register;
- storage scopes validate;
- dependencies validate.
```

### 25.2 Module Lifecycle Tests

Test:

```txt
- install module;
- enable module;
- disable module;
- upgrade module;
- reject missing dependency;
- reject invalid manifest;
- audit events are written.
```

### 25.3 Permission Tests

Test:

```txt
- user without permission cannot access admin page;
- user without permission cannot call API;
- hidden menu is not treated as security;
- direct route access still checks permission;
- effective permission is correctly evaluated.
```

### 25.4 Storage Scope Tests

Test:

```txt
- module writes only to allowed prefix;
- unsafe filename is rejected or sanitized;
- private file requires signed URL;
- public file uses correct visibility;
- deleted media is hidden.
```

### 25.5 Marketplace Compatibility Tests

Test:

```txt
- sandbox plugin can install in staging;
- capability change requires approval;
- unsupported plugin is rejected;
- plugin removal does not destroy data unexpectedly.
```

---

## 26. Playwright Flows

Minimum e2e flows:

```txt
1. admin opens module registry;
2. admin views installed modules;
3. admin enables documents module;
4. admin sees documents menu item;
5. unauthorized user cannot see documents menu item;
6. unauthorized direct URL access is denied;
7. admin uploads a document;
8. public user can access public document;
9. private document requires signed URL/permission;
10. admin disables module;
11. disabled module menu disappears;
12. disabled module API returns MODULE_DISABLED;
13. audit log records actions.
```

---

## 27. Rollback Strategy

### 27.1 Disable First

Default rollback action:

```txt
Disable the module.
Do not delete data.
```

### 27.2 Rollback Types

| Problem | Rollback |
| --- | --- |
| Broken admin UI | Disable module admin page |
| Broken API route | Disable module routes |
| Bad migration | Restore backup or corrective migration |
| Bad plugin update | Revert plugin version |
| Data corruption | Restore affected records from backup |
| Security issue | Disable module immediately, rotate secrets if needed |
| Bad marketplace plugin | Disable/remove plugin, revoke capability, audit |

### 27.3 Rollback Checklist

Before enabling high-risk module:

```txt
[ ] backup exists
[ ] module can be disabled
[ ] migration impact is known
[ ] storage scope is known
[ ] permissions are known
[ ] audit is active
[ ] owner approval exists
```

### 27.4 Data Destruction Rule

```txt
Module removal must not hard-delete data unless explicitly approved, backed up, and documented.
```

---

## 28. Security and Compliance Requirements

### 28.1 Minimum Controls

Every module must support:

- permission checks;
- tenant/site filtering;
- input validation;
- output filtering;
- audit events;
- soft delete where applicable;
- secure storage scope;
- no secrets in code;
- rollback plan.

### 28.2 Privacy Controls

Modules handling personal data must define:

- purpose of processing;
- data fields collected;
- retention policy;
- export process;
- delete/anonymize process;
- access control;
- audit events.

### 28.3 Indonesian Context

For Indonesia-oriented websites, modules must consider:

- personal data protection;
- electronic system governance;
- consent for public forms;
- retention rules;
- public-sector document responsibility;
- student/child data protection for school modules.

---

## 29. ISO Alignment

### 29.1 ISO/IEC 27001

Module governance supports:

- access control;
- change management;
- supplier/plugin risk;
- logging;
- incident response.

### 29.2 ISO/IEC 27002

Module controls should align with:

- secure configuration;
- privileged access;
- malware protection for uploads;
- logging and monitoring;
- information classification.

### 29.3 ISO/IEC 27005

Use risk assessment for:

- marketplace plugins;
- private document modules;
- network integrations;
- permission management plugins;
- upload modules.

### 29.4 ISO/IEC 27017 and 27018

Relevant to:

- cloud storage scopes;
- R2/S3 access;
- cloud-hosted personal data;
- provider responsibility.

### 29.5 ISO/IEC 27701

Relevant to:

- personal data modules;
- form submissions;
- mobile API users;
- consent and retention.

### 29.6 ISO/IEC 27034

Relevant to:

- secure module development;
- secure API implementation;
- code review;
- validation tests.

### 29.7 ISO/IEC 20000-1

Relevant to:

- module release management;
- incident handling;
- change records;
- service continuity.

### 29.8 ISO 22301

Relevant to:

- module rollback;
- backup;
- restore;
- continuity after plugin failure.

### 29.9 ISO/IEC 15408

Useful for assurance thinking around:

- ABAC Matrix;
- secure document lookup;
- authentication modules;
- marketplace plugin execution.

---

## 30. Practical Implementation Examples

### Example 1 — Documents Module

Purpose:

```txt
Manage public, internal, restricted, and private documents.
```

Components:

- native plugin;
- documents table;
- media_objects integration;
- admin page;
- public documents route;
- signed URL API;
- storage scope;
- audit events.

Permissions:

```txt
awcms:document:read
awcms:document:create
awcms:document:update
awcms:document:delete
awcms:document:restore
awcms:document:publish
awcms:document:private_download
```

### Example 2 — Forms Module

Purpose:

```txt
Create public forms and manage submissions.
```

Components:

- form definitions;
- public submission route;
- admin submissions page;
- consent checkbox;
- spam protection;
- export permission;
- audit events.

Permissions:

```txt
awcms:form:read
awcms:form:create
awcms:form:update
awcms:form_submission:read
awcms:form_submission:export
awcms:form_submission:delete
```

### Example 3 — Audit Log Module

Purpose:

```txt
Record important system, security, and content actions.
```

Components:

- audit_events table;
- audit writer service;
- admin audit page;
- filtering;
- export later;
- immutable-by-default policy.

Permissions:

```txt
awcms:audit:read
awcms:audit:export
```

### Example 4 — ABAC Matrix Module

Purpose:

```txt
Manage role/permission/policy matrix visually.
```

Components:

- policy tables;
- evaluator service;
- React admin page;
- effective access preview;
- permission import/export;
- audit events.

Permissions:

```txt
awcms:policy:read
awcms:policy:write
awcms:policy:test
awcms:permission:assign
awcms:permission:revoke
```

### Example 5 — Mobile API Module

Purpose:

```txt
Provide stable versioned API for mobile applications.
```

Components:

- `/api/mobile/v1` alias;
- bootstrap endpoint;
- posts endpoint;
- documents endpoint;
- forms endpoint;
- auth/session later;
- rate limiting through gateway;
- API contract tests.

Permissions:

```txt
mobile:read_public
mobile:submit_form
mobile:upload_file
mobile:read_own_documents
```

### Example 6 — Kelulusan Module

Purpose:

```txt
Provide secure graduation announcement and document lookup.
```

Components:

- student verification;
- no public bulk listing;
- private document session;
- signed PDF URL;
- rate limiting;
- audit log;
- storage prefix per school year.

Permissions:

```txt
awcms:kelulusan:manage
awcms:kelulusan:import
awcms:kelulusan:publish
awcms:kelulusan:audit
```

---

## 31. GitHub Issues for Part 4

### Issue 1 — Define AWCMS Module Manifest Standard

```md
## Goal
Create the standard manifest format for AWCMS-Micro modules.

## Tasks
- Define required manifest fields
- Define permissions section
- Define capabilities section
- Define routes section
- Define adminPages section
- Define storageScopes section
- Define dependencies section
- Define rollback section

## Validation
- Example manifest validates
- Documents module manifest can be represented
- ABAC Matrix module manifest can be represented

## Rollback
Revert manifest documentation and schema changes.
```

### Issue 2 — Add Module Registry Baseline

```md
## Goal
Design and implement the baseline module registry.

## Tasks
- Define modules table
- Define module_installations table
- Define module lifecycle states
- Define install/enable/disable flow
- Add registry documentation

## Validation
- Module can be registered
- Module can be installed/enabled/disabled conceptually
- Module status is tracked

## Rollback
Disable module registry feature flag or revert implementation.
```

### Issue 3 — Add Plugin Permission and Capability Policy

```md
## Goal
Define how permissions and capabilities are declared, reviewed, and enforced.

## Tasks
- Define AWCMS permission namespace
- Define capability review matrix
- Define plugin risk levels
- Define capability approval rule
- Add audit events for permission changes

## Validation
- Permissions are namespaced
- Capabilities are reviewed before activation
- New capabilities require approval

## Rollback
Revert policy changes or disable plugin installation UI.
```

### Issue 4 — Add Storage Scope Policy for Modules

```md
## Goal
Ensure every module uses tenant/site/module-aware storage paths.

## Tasks
- Define storage scope format
- Define path variables
- Define visibility rules
- Define file size and MIME rules
- Add examples for documents/forms/kelulusan

## Validation
- No module writes to bare uploads path
- Storage scope includes tenant and site context

## Rollback
Revert storage scope implementation or disable affected module.
```

### Issue 5 — Add Native Plugin Skeleton Standard

```md
## Goal
Create the standard structure for native AWCMS-Micro plugins.

## Tasks
- Define package structure
- Define src/index.ts contract
- Define routes folder
- Define admin folder
- Define services folder
- Define schemas folder
- Define tests folder
- Add README template

## Validation
- New plugin can follow the skeleton
- Documents plugin can use the skeleton
- Audit Log plugin can use the skeleton

## Rollback
Revert skeleton templates.
```

### Issue 6 — Add Module Lifecycle Tests

```md
## Goal
Create tests for module manifest, lifecycle, permissions, and storage scopes.

## Tasks
- Test valid manifest
- Reject invalid manifest
- Test install flow
- Test disable flow
- Test missing dependency
- Test permission registration
- Test storage scope validation

## Validation
- Tests pass
- Invalid module is rejected
- Audit events are expected for lifecycle changes

## Rollback
Revert tests or mark pending if implementation not ready.
```

---

## 32. OpenCode / Antigravity Implementation Prompt for Part 4

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, plugin architecture, security, and Cloudflare implementation agent.

TASK:
Implement Part 4 of the AWCMS-Micro documentation: Plugin and Module System.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/compatibility-matrix.md, docs/modules.md, docs/security.md, docs/storage.md, and docs/tenancy.md.
3. Inspect EmDash upstream plugin architecture before coding.
4. Preserve EmDash plugin compatibility.
5. Do not modify EmDash plugin runtime unless no safe extension path exists.
6. Treat SMAN 2 repository as reference only.
7. Use GitHub Issues for non-trivial work.
8. Create a dedicated branch before implementation.
9. Make atomic changes.
10. Run validation before completion.
11. Do not commit secrets, local databases, uploaded files, or production config.

GOAL:
Add the baseline module/plugin governance system for AWCMS-Micro while staying compatible with EmDash native plugins, marketplace plugins, admin pages, API routes, storage scopes, and templates.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Inspect EmDash plugin docs and examples.
- Inspect current package structure.
- Inspect SMAN 2 plugin patterns if available.
- Summarize reusable patterns and compatibility risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Define AWCMS Module Manifest Standard
2. Add Module Registry Baseline
3. Add Plugin Permission and Capability Policy
4. Add Storage Scope Policy for Modules
5. Add Native Plugin Skeleton Standard
6. Add Module Lifecycle Tests

PHASE 2 — BRANCH
Create branch:
feat/add-plugin-module-system-baseline

PHASE 3 — DOCUMENTATION
Update or create:
- docs/modules.md
- docs/security.md
- docs/storage.md
- docs/compatibility-matrix.md
- docs/rollback.md
- docs/testing.md

PHASE 4 — MANIFEST STANDARD
Create schema or documentation for:
- module.manifest.json
- required fields
- permissions
- capabilities
- routes
- admin pages
- storage scopes
- dependencies
- rollback

PHASE 5 — MODULE REGISTRY
If implementation layer exists, add baseline registry code under:
packages/awcms/module-registry/

Include:
- manifest parser
- manifest validator
- registry type definitions
- lifecycle state definitions
- install/enable/disable conceptual services

If implementation layer is not ready, add README and type/interface placeholders only.

PHASE 6 — PLUGIN SKELETON
Create plugin skeleton templates for:
- documents
- forms
- audit-log
- mobile-api
- abac-matrix

Each plugin should include:
- README.md
- module.manifest.json
- src/index.ts placeholder where appropriate
- routes folder
- admin folder when needed
- services folder
- schemas folder
- tests folder

PHASE 7 — PERMISSIONS AND CAPABILITIES
Add:
- permission namespace policy
- capability review policy
- risk classification
- approval rule for new capabilities
- audit event names

PHASE 8 — STORAGE SCOPES
Add storage scope examples for:
- documents
- forms
- kelulusan
- media library

Ensure every example includes tenant/site/module context.

PHASE 9 — TEST PLAN
Add tests or test documentation for:
- manifest validation
- module lifecycle
- permission registration
- storage scope validation
- disabled module behavior
- unauthorized admin/API access

PHASE 10 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 11 — COMMIT
Commit:
feat: add plugin and module system baseline

PHASE 12 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. plugin compatibility impact
5. EmDash compatibility impact
6. validation results
7. risks
8. rollback plan
9. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash plugin runtime
- changing marketplace plugin behavior
- deleting module data
- changing production Cloudflare resources
- committing secrets
- running destructive migrations
```

---

## 33. Definition of Done for Part 4

Part 4 is complete when:

```txt
[ ] plugin vs module boundary is documented
[ ] native plugin strategy is documented
[ ] marketplace/sandbox plugin strategy is documented
[ ] module manifest standard exists
[ ] module registry design exists
[ ] module lifecycle is documented
[ ] module permission namespace is documented
[ ] capability review policy exists
[ ] storage scope policy exists
[ ] admin page strategy exists
[ ] API route strategy exists
[ ] module risk classification exists
[ ] rollback strategy exists
[ ] GitHub Issues are prepared
[ ] OpenCode implementation prompt exists
[ ] test strategy exists
```

---

## 34. Next Part

Continue with **Part 5 — ABAC and Permission Matrix GUI**.

Part 5 should include:

- RBAC vs ABAC model;
- ABAC policy engine;
- permission registry;
- policy tables;
- evaluator service;
- effective access preview;
- permission matrix GUI plugin;
- admin screens;
- audit events;
- tests;
- rollback strategy.
