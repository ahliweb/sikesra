# AWCMS-Micro Implementation Documentation

## Part 5 — ABAC and Permission Matrix GUI

**Document status:** Draft v0.1  
**Purpose:** Define the Attribute-Based Access Control (ABAC) architecture and Permission Matrix GUI for AWCMS-Micro while preserving compatibility with EmDash permissions, plugin architecture, admin conventions, and future upstream updates.

---

## 1. Objective of Part 5

Part 5 defines how AWCMS-Micro should implement an authorization layer that is stronger than simple role-based access control, while remaining compatible with EmDash.

This document covers:

1. RBAC vs ABAC model;
2. EmDash permission compatibility;
3. AWCMS permission registry;
4. ABAC policy model;
5. policy tables;
6. policy evaluator service;
7. permission matrix GUI;
8. effective access preview;
9. admin screens;
10. API route protection;
11. audit events;
12. testing;
13. rollback;
14. GitHub Issues;
15. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
Do not replace EmDash authorization destructively.
Extend it with an AWCMS-Micro ABAC overlay.
```

---

## 2. Core Authorization Principle

AWCMS-Micro should use a layered authorization model:

```txt
Authentication
  ↓
EmDash permission check
  ↓
AWCMS-Micro permission registry check
  ↓
AWCMS-Micro ABAC policy evaluation
  ↓
Tenant/site/module/resource condition check
  ↓
Allow or deny
```

This keeps EmDash compatibility while giving AWCMS-Micro enough control for:

- tenant-readiness;
- site-level access;
- module-specific permissions;
- sensitive document control;
- form submission privacy;
- mobile API permissions;
- future ERP-like modules;
- government/school compliance needs.

---

## 3. RBAC vs ABAC

### 3.1 RBAC Definition

RBAC means **Role-Based Access Control**.

Access is determined mainly by the user’s role.

Example:

```txt
User has role: editor
Editor can update posts
Therefore user can update posts
```

RBAC is simple and useful for most websites.

Common roles:

EmDash defines numeric role levels as the canonical upstream standard:

```txt
Administrator = 50
Editor = 40
Author = 30
Contributor = 20
```

AWCMS-Micro extends these with additional named roles for governance:

```txt
owner        (maps to Administrator, 50)
super_admin  (maps to Administrator, 50)
admin        (maps to Administrator, 50)
editor       (maps to Editor, 40)
author       (maps to Author, 30)
auditor      (custom AWCMS role)
member       (custom AWCMS role)
subscriber   (custom AWCMS role)
public       (anonymous)
no_access    (denied)
```

### 3.2 ABAC Definition

ABAC means **Attribute-Based Access Control**.

Access is determined by attributes of:

- subject;
- action;
- resource;
- environment;
- tenant;
- site;
- ownership;
- status;
- risk classification;
- time;
- module.

Example:

```txt
User has role: editor
Action: update
Resource: post
Condition: post.tenant_id == user.tenant_id
Condition: post.site_id == active_site.id
Condition: post.status in draft/review
Therefore user can update this specific post
```

### 3.3 Why AWCMS-Micro Needs ABAC

RBAC alone is not enough for AWCMS-Micro because the system may handle:

1. school student documents;
2. graduation announcement PDFs;
3. private forms and submissions;
4. government documents;
5. multi-site content;
6. future multi-tenant data;
7. mobile user data;
8. future ERP records;
9. marketplace plugins;
10. Cloudflare storage access.

ABAC allows fine-grained decisions such as:

```txt
An editor can update posts in the same site but cannot export form submissions.
A teacher can view only assigned student records.
An operator can upload documents but cannot publish them.
An auditor can read logs but cannot edit content.
A mobile user can read only their own private documents.
```

---

## 4. Compatibility with EmDash Authorization

### 4.1 Compatibility Rule

AWCMS-Micro must not break EmDash's existing permission model.

EmDash uses **passkey-first (WebAuthn) authentication** with OAuth and magic link fallbacks. The canonical auth model includes:

- **Passkeys** — primary auth method (WebAuthn)
- **OAuth providers** — GitHub (`github()`), Google (`google()`), AT Protocol (`atproto()`)
- **Cloudflare Access** — optional enterprise auth with role mapping
- **Self-signup** — domain-restricted auto-provisioning
- **Session management** — configurable `maxAge`, `sliding` expiry

Auth configuration in `astro.config.mjs`:

```ts
import { github } from "emdash/auth/providers/github";
import { google } from "emdash/auth/providers/google";

emdash({
  auth: {
    selfSignup: {
      domains: ["example.com"],
      defaultRole: 20, // Contributor
    },
    session: {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sliding: true,
    },
  },
  authProviders: [github(), google()],
});
```

Use this rule:

```txt
If EmDash denies the action, AWCMS-Micro must not allow it.
If EmDash allows the action, AWCMS-Micro may still apply stricter ABAC rules.
```

### 4.2 Recommended Evaluation Order

```txt
1. Is user authenticated when required?
2. Does EmDash permission system allow baseline action?
3. Is the AWCMS module enabled?
4. Does user have the AWCMS permission?
5. Does ABAC policy allow the action on this resource?
6. Is the tenant/site context valid?
7. Is the resource not soft-deleted?
8. Is the resource classification allowed?
9. Is there any explicit deny policy?
10. Final decision.
```

### 4.3 Deny Priority

Use this rule:

```txt
Explicit deny > explicit allow > inherited allow > default deny
```

This is important for high-risk modules.

Example:

```txt
Role editor allows document read.
But policy denies sensitive private document download.
Final decision: deny.
```

---

## 5. Authorization Layers

### 5.1 Layer 1 — Authentication

Answers:

```txt
Who is the user?
```

Examples:

- admin user;
- editor user;
- public anonymous user;
- mobile user;
- service account;
- plugin runtime identity.

### 5.2 Layer 2 — Basic Permission

Answers:

```txt
Does this subject generally have permission for this action?
```

Examples:

```txt
awcms:document:read
awcms:document:create
awcms:document:publish
awcms:form_submission:export
awcms:module:install
awcms:policy:write
```

### 5.3 Layer 3 — ABAC Policy

Answers:

```txt
Can this subject perform this action on this specific resource in this context?
```

Example:

```txt
Can editor A publish document B in tenant default, site main, module documents, classification internal?
```

### 5.4 Layer 4 — Resource State

Answers:

```txt
Is the resource in a state that allows this action?
```

Examples:

- draft;
- review;
- published;
- archived;
- deleted;
- locked;
- expired;
- private;
- restricted.

### 5.5 Layer 5 — Environment and Risk

Answers:

```txt
Is this action allowed in this environment and risk level?
```

Examples:

- production vs staging;
- office hours;
- high-risk action;
- data export;
- private file download;
- marketplace plugin installation;
- migration-required module install.

---

## 6. ABAC Dimensions

AWCMS-Micro should model these dimensions.

| Dimension | Meaning | Example |
| --- | --- | --- |
| Subject | Who performs the action | user, role, group, service account |
| Action | What is being done | read, create, update, delete, publish, export |
| Resource | What is being accessed | post, document, media, form submission |
| Tenant | Which tenant owns the data | default, future tenant A |
| Site | Which site owns the data | main, school-site, landing-site |
| Module | Which module controls the resource | documents, forms, mobile-api |
| Ownership | Relation between subject and resource | own, assigned, any |
| Status | Lifecycle state | draft, published, deleted |
| Classification | Sensitivity | public, internal, restricted, private, sensitive |
| Time | Temporal condition | office hours, deadline |
| Environment | Runtime environment | local, staging, production |
| Risk | Risk level | low, medium, high, critical |

---

## 7. Permission Naming Standard

### 7.1 Namespace Rule

AWCMS-Micro permissions must use:

```txt
awcms:<resource>:<action>
```

For mobile-specific permissions:

```txt
mobile:<resource_or_scope>:<action>
```

For future ERP modules:

```txt
erp:<module>:<action>
```

### 7.2 Core Permissions

Module permissions:

```txt
awcms:module:read
awcms:module:install
awcms:module:enable
awcms:module:disable
awcms:module:upgrade
awcms:module:remove
```

Policy permissions:

```txt
awcms:policy:read
awcms:policy:write
awcms:policy:test
awcms:policy:export
awcms:policy:import
```

Permission assignment:

```txt
awcms:permission:read
awcms:permission:assign
awcms:permission:revoke
```

Document permissions:

```txt
awcms:document:read
awcms:document:create
awcms:document:update
awcms:document:delete
awcms:document:restore
awcms:document:publish
awcms:document:private_download
awcms:document:export
```

Form permissions:

```txt
awcms:form:read
awcms:form:create
awcms:form:update
awcms:form:delete
awcms:form_submission:read
awcms:form_submission:export
awcms:form_submission:delete
```

Audit permissions:

```txt
awcms:audit:read
awcms:audit:export
```

Storage/media permissions:

```txt
awcms:media:read
awcms:media:upload
awcms:media:update
awcms:media:delete
awcms:media:restore
awcms:media:private_read
```

### 7.3 Permission Registry Rule

```txt
Do not declare random permissions directly inside route files.
All permissions must be registered in a central permission registry or module manifest.
```

---

## 8. Subject Model

### 8.1 Subject Types

Recommended subject types:

```txt
user
role
group
service_account
plugin
anonymous
mobile_user
```

### 8.2 Subject Attributes

Subject attributes may include:

```txt
user_id
roles
groups
tenant_id
site_ids
module_access
department
assigned_resources
clearance_level
is_service_account
is_plugin_runtime
```

### 8.3 Example Subject Context

```json
{
  "type": "user",
  "id": "user_123",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "siteIds": ["main"],
  "roles": ["editor"],
  "permissions": [
    "awcms:document:read",
    "awcms:document:create",
    "awcms:document:update"
  ],
  "attributes": {
    "department": "content",
    "clearanceLevel": "internal"
  }
}
```

---

## 9. Resource Model

### 9.1 Resource Types

Recommended resource types:

```txt
page
post
announcement
document
media_object
form
form_submission
module
policy
audit_event
mobile_session
plugin
storage_object
```

### 9.2 Resource Attributes

Resource attributes may include:

```txt
id
tenant_id
site_id
module_id
owner_user_id
created_by
status
publish_status
classification
visibility
deleted_at
locked
expires_at
metadata
```

### 9.3 Example Resource Context

```json
{
  "type": "document",
  "id": "doc_123",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "siteId": "main",
  "moduleId": "documents",
  "ownerUserId": "user_456",
  "classification": "private",
  "publishStatus": "published",
  "visibility": "private",
  "deletedAt": null
}
```

---

## 10. Policy Model

### 10.1 Policy Structure

An ABAC policy should include:

```txt
id
tenant_id
site_id optional
policy_set_id
effect
subject matcher
action matcher
resource matcher
conditions
priority
enabled
valid_from optional
valid_until optional
created_at
updated_at
deleted_at
created_by
updated_by
```

### 10.2 Policy Effect

Allowed values:

```txt
allow
deny
```

### 10.3 Policy Example

```json
{
  "id": "policy_documents_editor_update_own",
  "effect": "allow",
  "subject": {
    "roles": ["editor"]
  },
  "actions": ["awcms:document:update"],
  "resource": {
    "type": "document",
    "classification": ["public", "internal"]
  },
  "conditions": {
    "tenantMatch": true,
    "siteMatch": true,
    "ownership": "own_or_created_by"
  },
  "priority": 100,
  "enabled": true
}
```

### 10.4 Explicit Deny Example

```json
{
  "id": "deny_editor_private_document_download",
  "effect": "deny",
  "subject": {
    "roles": ["editor"]
  },
  "actions": ["awcms:document:private_download"],
  "resource": {
    "type": "document",
    "classification": ["private", "sensitive"]
  },
  "conditions": {
    "environment": "production"
  },
  "priority": 10,
  "enabled": true
}
```

---

## 11. Policy Sets

### 11.1 Purpose

A policy set groups related policies.

Examples:

```txt
Default Website Policy Set
School Website Policy Set
Government Portal Policy Set
Documents Module Policy Set
Forms Module Policy Set
Mobile API Policy Set
ERP Future Policy Set
```

### 11.2 Policy Set Status

Recommended values:

```txt
draft
active
disabled
archived
```

### 11.3 Policy Set Rule

```txt
Only active policy sets are evaluated in production authorization decisions.
```

Draft policy sets may be used in simulation/effective-access preview.

---

## 12. Database Tables

### 12.1 `awcms_permissions`

```sql
create table awcms_permissions (
  id text primary key,
  key text not null unique,
  name text not null,
  description text null,
  module_id text null,
  risk_level text not null default 'medium',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null
);
```

### 12.2 `awcms_roles`

```sql
create table awcms_roles (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  key text not null,
  name text not null,
  description text null,
  system_role integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, key)
);
```

### 12.3 `awcms_role_permissions`

```sql
create table awcms_role_permissions (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  role_id text not null,
  permission_key text not null,
  effect text not null default 'allow',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, role_id, permission_key)
);
```

### 12.4 `awcms_user_roles`

```sql
create table awcms_user_roles (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  user_id text not null,
  role_id text not null,
  valid_from text null,
  valid_until text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, user_id, role_id)
);
```

### 12.5 `awcms_policy_sets`

```sql
create table awcms_policy_sets (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  key text not null,
  name text not null,
  description text null,
  status text not null default 'draft',
  priority integer not null default 100,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, key)
);
```

### 12.6 `awcms_policies`

```sql
create table awcms_policies (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  policy_set_id text not null,
  key text not null,
  name text not null,
  description text null,
  effect text not null check (effect in ('allow', 'deny')),
  subject_json text not null,
  actions_json text not null,
  resource_json text not null,
  conditions_json text null,
  priority integer not null default 100,
  enabled integer not null default 1,
  valid_from text null,
  valid_until text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null,
  created_by text null,
  updated_by text null,
  unique (tenant_id, site_id, key)
);
```

### 12.7 `awcms_access_decision_logs`

This table is optional. It can be useful for debugging but may become large.

```sql
create table awcms_access_decision_logs (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  request_id text null,
  subject_type text not null,
  subject_id text null,
  action text not null,
  resource_type text not null,
  resource_id text null,
  decision text not null,
  reason_code text null,
  matched_policy_ids_json text null,
  metadata_json text null,
  created_at text not null default (datetime('now'))
);
```

Recommended retention:

```txt
Short retention for normal access decisions.
Longer retention for denied sensitive operations.
```

---

## 13. Evaluator Service

### 13.1 Evaluator Goal

The evaluator answers:

```txt
Can subject perform action on resource in context?
```

### 13.2 Evaluator Input

```ts
type AccessCheckInput = {
  subject: SubjectContext;
  action: string;
  resource: ResourceContext;
  context: AWCMSRequestContext;
};
```

### 13.3 Evaluator Output

```ts
type AccessDecision = {
  allowed: boolean;
  decision: "allow" | "deny";
  reasonCode: string;
  matchedPolicies: string[];
  missingPermissions?: string[];
  metadata?: Record<string, unknown>;
};
```

### 13.4 Reason Codes

Recommended reason codes:

```txt
ALLOW_EXPLICIT_POLICY
ALLOW_ROLE_PERMISSION
ALLOW_OWNER_POLICY
DENY_DEFAULT
DENY_EXPLICIT_POLICY
DENY_MISSING_PERMISSION
DENY_TENANT_MISMATCH
DENY_SITE_MISMATCH
DENY_MODULE_DISABLED
DENY_RESOURCE_DELETED
DENY_RESOURCE_LOCKED
DENY_CLASSIFICATION_RESTRICTED
DENY_OUTSIDE_VALID_TIME
DENY_ENVIRONMENT_POLICY
DENY_RISK_POLICY
```

### 13.5 Evaluator Pseudocode

```ts
async function canAccess(input: AccessCheckInput): Promise<AccessDecision> {
  const { subject, action, resource, context } = input;

  if (!subject) {
    return deny("DENY_MISSING_SUBJECT");
  }

  if (resource.deletedAt && !action.endsWith(":restore")) {
    return deny("DENY_RESOURCE_DELETED");
  }

  if (resource.tenantId !== context.tenantId) {
    return deny("DENY_TENANT_MISMATCH");
  }

  if (resource.siteId && context.siteId && resource.siteId !== context.siteId) {
    return deny("DENY_SITE_MISMATCH");
  }

  const hasBasePermission = subject.permissions.includes(action);
  if (!hasBasePermission) {
    return deny("DENY_MISSING_PERMISSION");
  }

  const policies = await loadActivePolicies(context.tenantId, context.siteId);
  const matched = matchPolicies(policies, subject, action, resource, context);

  const explicitDeny = matched.find((policy) => policy.effect === "deny");
  if (explicitDeny) {
    return deny("DENY_EXPLICIT_POLICY", [explicitDeny.id]);
  }

  const explicitAllow = matched.find((policy) => policy.effect === "allow");
  if (explicitAllow) {
    return allow("ALLOW_EXPLICIT_POLICY", matched.map((policy) => policy.id));
  }

  return deny("DENY_DEFAULT");
}
```

### 13.6 Evaluator Rule

```txt
The evaluator must be deterministic, testable, auditable, and independent from UI logic.
```

---

## 14. Permission Matrix GUI

### 14.1 Purpose

The Permission Matrix GUI allows administrators to manage access visually.

It should help answer:

```txt
Who can do what, on which module/resource, under what conditions?
```

### 14.2 Plugin Name

Recommended native plugin:

```txt
@awcms-micro/plugin-abac-matrix
```

Module ID:

```txt
abac-matrix
```

Admin path:

```txt
/_emdash/admin/plugins/abac-matrix
```

API namespace:

```txt
/_emdash/api/plugins/abac-matrix/v1/*
```

### 14.3 Why Native Plugin First

Build as native plugin first because it needs:

- React admin page;
- deep permission registry integration;
- ABAC evaluator testing;
- policy import/export;
- effective access preview;
- audit log integration;
- module registry integration.

Later, parts may be made marketplace-compatible if EmDash sandbox UI capabilities are sufficient.

---

## 15. Permission Matrix Screens

### 15.1 Overview Dashboard

Shows:

```txt
Total roles
Total permissions
Total active policies
Recent access denials
High-risk permissions
Modules with missing policy coverage
Last policy changes
```

### 15.2 Roles Screen

Features:

```txt
Create role
Edit role
Disable role
Assign role to user
View role permissions
View users with role
View policy impact
```

Columns:

```txt
Role
Scope
Users
Permissions
Status
System Role
Last Updated
Actions
```

### 15.3 Permissions Screen

Features:

```txt
View registered permissions
Filter by module
Filter by risk level
View permission usage
View roles using permission
View policies using permission
```

Columns:

```txt
Permission Key
Name
Module
Risk Level
Assigned Roles
Policies
Status
```

### 15.4 Matrix Screen

The main GUI.

Rows:

```txt
Modules/resources
```

Columns:

```txt
Read
Create
Update Own
Update Any
Delete
Restore
Publish
Export
Configure
```

Example:

| Resource | Read | Create | Update Own | Update Any | Delete | Restore | Publish | Export |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pages | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Posts | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Media | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Documents | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Form Submissions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 15.5 ABAC Rules Screen

Features:

```txt
Create allow/deny policy
Set subject matcher
Set action matcher
Set resource matcher
Set conditions
Set priority
Enable/disable policy
Test policy
```

### 15.6 Effective Access Preview Screen

This is required.

Inputs:

```txt
User
Role
Tenant
Site
Module
Action
Resource type
Resource ID or sample resource
Environment
```

Output:

```txt
ALLOW or DENY
Reason code
Matched policies
Missing permissions
Tenant/site match result
Resource status result
Classification result
```

Example output:

```txt
Decision: DENY
Reason: DENY_CLASSIFICATION_RESTRICTED

Details:
- User has awcms:document:read
- User does not have awcms:document:private_download
- Document classification is sensitive
- Explicit deny policy matched: deny_editor_private_document_download
```

### 15.7 Audit Screen

Shows:

```txt
Policy created
Policy updated
Policy disabled
Permission assigned
Permission revoked
Role created
Role deleted/disabled
Access denied high-risk action
Export performed
Import performed
```

### 15.8 Import/Export Screen

Features:

```txt
Export policy set JSON
Import policy set JSON
Validate before import
Dry-run import
Show diff
Require approval for high-risk changes
```

---

## 16. Matrix Editing Rules

### 16.1 Safe Defaults

Default state:

```txt
No access unless explicitly assigned.
```

### 16.2 High-Risk Permissions

High-risk permissions require confirmation:

```txt
awcms:policy:write
awcms:module:install
awcms:module:disable
awcms:document:private_download
awcms:form_submission:export
awcms:audit:export
awcms:media:delete
```

### 16.3 Bulk Changes

Bulk changes must show:

- affected roles;
- affected permissions;
- affected modules;
- risk level;
- rollback option;
- audit event preview.

### 16.4 Prevent Lockout

The GUI must prevent removing the last owner/super-admin access.

Rule:

```txt
At least one active owner or super_admin must retain policy management access.
```

---

## 17. API Routes for ABAC Matrix Plugin

Recommended API routes:

```txt
GET    /_emdash/api/plugins/abac-matrix/v1/roles
POST   /_emdash/api/plugins/abac-matrix/v1/roles
PATCH  /_emdash/api/plugins/abac-matrix/v1/roles/:id
DELETE /_emdash/api/plugins/abac-matrix/v1/roles/:id

GET    /_emdash/api/plugins/abac-matrix/v1/permissions
GET    /_emdash/api/plugins/abac-matrix/v1/permission-matrix
POST   /_emdash/api/plugins/abac-matrix/v1/permission-matrix

GET    /_emdash/api/plugins/abac-matrix/v1/policy-sets
POST   /_emdash/api/plugins/abac-matrix/v1/policy-sets
PATCH  /_emdash/api/plugins/abac-matrix/v1/policy-sets/:id

GET    /_emdash/api/plugins/abac-matrix/v1/policies
POST   /_emdash/api/plugins/abac-matrix/v1/policies
PATCH  /_emdash/api/plugins/abac-matrix/v1/policies/:id
DELETE /_emdash/api/plugins/abac-matrix/v1/policies/:id

POST   /_emdash/api/plugins/abac-matrix/v1/evaluate
POST   /_emdash/api/plugins/abac-matrix/v1/import
GET    /_emdash/api/plugins/abac-matrix/v1/export
GET    /_emdash/api/plugins/abac-matrix/v1/audit
```

### 17.1 Required Permissions for API Routes

| Route | Required Permission |
| --- | --- |
| Read roles | `awcms:policy:read` |
| Create/update roles | `awcms:policy:write` |
| Read permissions | `awcms:permission:read` |
| Change matrix | `awcms:permission:assign` |
| Read policies | `awcms:policy:read` |
| Write policies | `awcms:policy:write` |
| Evaluate access | `awcms:policy:test` |
| Export policies | `awcms:policy:export` |
| Import policies | `awcms:policy:import` |
| Read audit | `awcms:audit:read` |

---

## 18. API Security Rules

Every ABAC Matrix API route must:

```txt
1. parse request safely;
2. validate input;
3. derive tenant/site context;
4. authenticate user;
5. check EmDash permission where applicable;
6. check AWCMS permission;
7. check ABAC policy;
8. prevent last-owner lockout;
9. write audit event for changes;
10. return consistent response shape;
11. never expose secrets or internal stack traces.
```

State-changing routes must not use GET.

---

## 19. Policy Import/Export Format

### 19.1 Export Format

```json
{
  "format": "awcms-abac-policy-set",
  "version": "1.0",
  "exportedAt": "2026-05-05T00:00:00Z",
  "tenantCode": "default",
  "siteCode": "main",
  "policySets": [],
  "roles": [],
  "permissions": [],
  "policies": []
}
```

### 19.2 Import Rules

Import must:

- validate format;
- validate version;
- validate permissions exist;
- validate module dependencies;
- run dry-run first;
- show diff;
- require confirmation;
- write audit event;
- allow rollback via backup/export.

### 19.3 Import Risk Rule

If import changes high-risk permissions, require owner approval.

---

## 20. Audit Events

### 20.1 Required Audit Events

```txt
abac.role.created
abac.role.updated
abac.role.disabled
abac.role.deleted
abac.permission.registered
abac.permission.assigned
abac.permission.revoked
abac.policy_set.created
abac.policy_set.activated
abac.policy_set.disabled
abac.policy.created
abac.policy.updated
abac.policy.disabled
abac.policy.deleted
abac.policy.imported
abac.policy.exported
abac.effective_access.tested
abac.high_risk_permission.changed
abac.last_owner_change.blocked
abac.access.denied_high_risk
```

### 20.2 Audit Metadata

Audit events should include:

```txt
actor_user_id
tenant_id
site_id
action
resource_type
resource_id
old_value_hash
new_value_hash
reason
request_id
ip_address
user_agent
```

### 20.3 Audit Rule

```txt
Policy and permission changes must always be audited.
```

---

## 21. Default Roles

Recommended default roles:

| Role | Scope | Description |
| --- | --- | --- |
| owner | tenant/platform | Full control, cannot be fully removed accidentally |
| super_admin | platform/tenant | Broad administrative access |
| admin | site/tenant | Manage site content and users |
| editor | site/content | Manage content and documents |
| author | content | Create and edit own content |
| auditor | tenant/site | Read-only logs and reports |
| member | authenticated | Limited authenticated access |
| subscriber | public/authenticated | Read-only member content |
| public | anonymous | Public published content only |
| no_access | none | Explicitly blocked |

### 21.1 Role Rule

```txt
Roles are convenience groupings.
Final access decision is still permission + ABAC policy based.
```

---

## 22. Default Role Permission Matrix

### 22.1 Owner

```txt
All AWCMS permissions.
```

### 22.2 Admin

```txt
awcms:module:read
awcms:document:read
awcms:document:create
awcms:document:update
awcms:document:delete
awcms:document:restore
awcms:document:publish
awcms:form:read
awcms:form:create
awcms:form:update
awcms:form_submission:read
awcms:media:read
awcms:media:upload
awcms:media:update
awcms:audit:read
```

### 22.3 Editor

```txt
awcms:document:read
awcms:document:create
awcms:document:update
awcms:document:publish
awcms:media:read
awcms:media:upload
```

### 22.4 Author

```txt
awcms:document:read
awcms:document:create
awcms:document:update_own
awcms:media:read
awcms:media:upload
```

### 22.5 Auditor

```txt
awcms:audit:read
awcms:document:read
awcms:form_submission:read
```

### 22.6 Public

```txt
public:content:read
public:document:read_published
```

---

## 23. High-Risk Access Controls

### 23.1 High-Risk Actions

```txt
policy write
permission assignment
module install/disable
private document download
form submission export
audit export
hard delete
storage object delete
marketplace plugin install
network integration configuration
```

### 23.2 Extra Controls

For high-risk actions, require:

- explicit permission;
- ABAC policy allow;
- audit event;
- confirmation UI;
- optional owner approval;
- optional re-authentication;
- backup/export for bulk changes.

---

## 24. Integration with Module Registry

The ABAC Matrix plugin must integrate with the module registry.

When a module is installed:

```txt
1. read module manifest;
2. register permissions;
3. register default role mappings if provided;
4. add resources to matrix;
5. add default policies if approved;
6. write audit event.
```

When a module is disabled:

```txt
1. hide module resources from active matrix view;
2. preserve permissions and policies;
3. mark them inactive/contextual;
4. block API access through MODULE_DISABLED;
5. write audit event.
```

---

## 25. Integration with Storage and Documents

For private documents:

```txt
User requests file
  ↓
Check awcms:document:private_download
  ↓
Evaluate ABAC policy
  ↓
Check document classification
  ↓
Check tenant/site match
  ↓
Generate short signed URL
  ↓
Write audit event
```

ABAC can deny access based on:

- classification;
- role;
- ownership;
- site;
- tenant;
- expiry;
- environment;
- risk level.

---

## 26. Integration with Mobile API

Mobile API should use simplified scopes but still map to ABAC decisions.

Examples:

```txt
mobile:read_public
mobile:submit_form
mobile:upload_file
mobile:read_own_documents
```

Mobile private document access:

```txt
mobile user authenticated
  ↓
mobile:read_own_documents
  ↓
ABAC condition: resource.owner_user_id == subject.user_id
  ↓
signed URL issued
```

---

## 27. Testing Strategy

### 27.1 Unit Tests

Test evaluator behavior:

```txt
- deny by default
- allow explicit policy
- deny explicit policy overrides allow
- deny tenant mismatch
- deny site mismatch
- deny missing permission
- deny deleted resource
- allow owner policy
- deny restricted classification
- deny outside valid time
```

### 27.2 Integration Tests

Test:

```txt
- role assignment creates effective permission
- matrix change updates role permissions
- policy creation affects evaluator
- import validates policy format
- export produces valid JSON
- audit event written for policy update
```

### 27.3 API Tests

Test:

```txt
- anonymous cannot access ABAC admin API
- editor cannot write policies
- owner can write policies
- policy test endpoint returns reason code
- invalid policy returns validation error
- last owner removal is blocked
```

### 27.4 Playwright Tests

Minimum flows:

```txt
1. owner opens ABAC Matrix page;
2. owner creates a role;
3. owner assigns permission to role;
4. owner creates policy;
5. owner tests effective access;
6. editor sees allowed menu item;
7. unauthorized user does not see menu item;
8. unauthorized direct route access is denied;
9. owner attempts to remove last owner permission and is blocked;
10. audit page shows policy change events.
```

---

## 28. Performance Strategy

### 28.1 Policy Cache

ABAC evaluation can become expensive.

Use cache carefully:

```txt
Cache active policies per tenant/site.
Invalidate cache when policy changes.
Do not cache user-specific sensitive decisions too broadly.
```

### 28.2 Effective Permissions Cache

Possible cache key:

```txt
tenant_id:site_id:user_id:policy_version
```

Invalidate when:

- role changes;
- permission changes;
- policy changes;
- module changes;
- user disabled;
- tenant/site changes.

### 28.3 Performance Rule

```txt
Correctness and security are more important than speed for authorization.
```

---

## 29. Rollback Strategy

### 29.1 Disable ABAC Matrix GUI

If GUI is broken:

```txt
Disable GUI route.
Keep evaluator and existing permissions stable.
```

### 29.2 Disable New Policies

If a new policy causes problems:

```txt
Disable policy set.
Restore previous exported policy set.
Write audit event.
```

### 29.3 Emergency Owner Access

Provide safe recovery path:

```txt
Emergency CLI/script to restore owner access.
Must be local/server-only.
Must be audited if possible.
Must not be exposed publicly.
```

### 29.4 Rollback Checklist

Before deploying ABAC changes:

```txt
[ ] policy export exists
[ ] owner access verified
[ ] rollback script documented
[ ] tests pass
[ ] audit log active
[ ] staging tested
[ ] last-owner lockout protection tested
```

---

## 30. Security and Compliance

### 30.1 Minimum Security Requirements

```txt
- default deny
- explicit permission checks
- ABAC evaluation for sensitive resources
- tenant/site filtering
- soft-deleted resources hidden
- high-risk permission confirmation
- audit all policy changes
- prevent last-owner lockout
- no secrets in policy exports
- secure import validation
```

### 30.2 Privacy Requirements

ABAC must protect:

- form submissions;
- student records;
- private documents;
- mobile user records;
- audit logs;
- future ERP records.

### 30.3 Indonesian Context

For Indonesian deployments, ABAC should help enforce:

- personal data access limitation;
- role-based administrative responsibilities;
- auditability of sensitive data access;
- separation between public and private documents;
- student/child data protection;
- public-sector document governance.

---

## 31. ISO Alignment

### 31.1 ISO/IEC 27001

ABAC supports:

- access control;
- privileged access management;
- audit logging;
- risk treatment;
- change management.

### 31.2 ISO/IEC 27002

Relevant controls:

- identity management;
- access rights provisioning;
- privileged access rights;
- information classification;
- logging and monitoring.

### 31.3 ISO/IEC 27005

Use risk assessment for:

- high-risk permissions;
- policy changes;
- private document access;
- export permissions;
- marketplace plugin permissions.

### 31.4 ISO/IEC 27017 and 27018

Relevant for:

- cloud storage access;
- tenant/site separation;
- personal data in cloud systems;
- signed URL access.

### 31.5 ISO/IEC 27701

ABAC supports privacy governance:

- access limitation;
- data subject request handling;
- retention/deletion controls;
- auditability.

### 31.6 ISO/IEC 27034

Relevant for secure application development:

- secure route protection;
- permission testing;
- input validation;
- secure admin UI.

### 31.7 ISO/IEC 15408

Use as assurance thinking for:

- policy evaluator;
- permission matrix GUI;
- effective access preview;
- emergency access recovery.

---

## 32. Practical Implementation Examples

### Example 1 — School Editor

Rule:

```txt
Editor can create and update news posts in the same site, but cannot publish sensitive documents.
```

Policy:

```txt
allow editor awcms:document:update where tenant/site match and classification in public/internal
deny editor awcms:document:private_download where classification in private/sensitive
```

### Example 2 — Auditor

Rule:

```txt
Auditor can read audit logs and documents but cannot edit or export sensitive data.
```

Policy:

```txt
allow auditor awcms:audit:read
allow auditor awcms:document:read
deny auditor awcms:form_submission:export
```

### Example 3 — Form Operator

Rule:

```txt
Operator can read form submissions for assigned site only.
```

Policy:

```txt
allow operator awcms:form_submission:read where site_id in subject.site_ids
deny operator awcms:form_submission:export unless explicit export permission exists
```

### Example 4 — Mobile User

Rule:

```txt
Mobile user can view only their own private documents.
```

Policy:

```txt
allow mobile_user mobile:read_own_documents where resource.owner_user_id == subject.user_id
```

### Example 5 — Government Document Publisher

Rule:

```txt
Public information officer can publish public documents, but not restricted/internal documents.
```

Policy:

```txt
allow ppid_officer awcms:document:publish where classification == public
deny ppid_officer awcms:document:publish where classification in internal/restricted/private/sensitive
```

### Example 6 — Module Administrator

Rule:

```txt
Admin can enable low-risk modules but cannot install high-risk access-control modules without owner approval.
```

Policy:

```txt
allow admin awcms:module:enable where module.risk in low/medium
deny admin awcms:module:install where module.risk in high/critical
allow owner awcms:module:install
```

---

## 33. GitHub Issues for Part 5

### Issue 1 — Define ABAC Permission Registry

```md
## Goal
Create the AWCMS-Micro permission registry standard.

## Tasks
- Define permission namespace
- Define core permissions
- Define module permission registration
- Define high-risk permissions
- Add documentation and type/interface placeholders

## Validation
- Permissions are namespaced
- No random route-level permission strings
- Module manifests can declare permissions

## Rollback
Revert registry documentation/code.
```

### Issue 2 — Add ABAC Policy Data Model

```md
## Goal
Define the ABAC policy database model.

## Tasks
- Define roles table
- Define permissions table
- Define role_permissions table
- Define user_roles table
- Define policy_sets table
- Define policies table
- Define access decision log option

## Validation
- Tables are tenant-ready
- Soft delete columns exist
- Default deny model is documented

## Rollback
Revert migration or disable ABAC module.
```

### Issue 3 — Implement ABAC Evaluator Service

```md
## Goal
Create deterministic ABAC policy evaluator service.

## Tasks
- Define evaluator input
- Define evaluator output
- Implement deny-by-default
- Implement explicit deny priority
- Implement tenant/site checks
- Implement deleted resource checks
- Add reason codes

## Validation
- Unit tests cover allow/deny cases
- Explicit deny overrides allow
- Tenant mismatch is denied

## Rollback
Disable ABAC evaluator feature flag and fall back to existing permission behavior.
```

### Issue 4 — Add Permission Matrix GUI Plugin Skeleton

```md
## Goal
Create native EmDash plugin skeleton for ABAC Matrix GUI.

## Tasks
- Create plugin package
- Add module manifest
- Add admin route placeholder
- Add API route placeholders
- Add README
- Add screen plan

## Validation
- Plugin loads
- Admin page placeholder opens
- Permission checks protect route

## Rollback
Disable plugin in module registry.
```

### Issue 5 — Add Effective Access Preview

```md
## Goal
Allow admins to simulate access decisions.

## Tasks
- Add evaluate API endpoint
- Add preview UI
- Show allow/deny
- Show reason code
- Show matched policies
- Show missing permissions

## Validation
- Owner can test policy
- Unauthorized user cannot test policy
- Result is deterministic

## Rollback
Disable preview endpoint/UI.
```

### Issue 6 — Add ABAC Audit Events

```md
## Goal
Audit all permission and policy changes.

## Tasks
- Define audit event names
- Add audit writer integration
- Audit role changes
- Audit permission assignments
- Audit policy changes
- Audit imports/exports

## Validation
- Policy update creates audit event
- Permission assignment creates audit event
- Import/export creates audit event

## Rollback
Disable policy changes until audit integration is fixed.
```

---

## 34. OpenCode / Antigravity Implementation Prompt for Part 5

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, authorization, ABAC/RBAC, security, and admin UI implementation agent.

TASK:
Implement Part 5 of the AWCMS-Micro documentation: ABAC and Permission Matrix GUI.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/modules.md, docs/security.md, docs/tenancy.md, docs/storage.md, and docs/abac.md if it exists.
3. Inspect EmDash upstream authorization and permission conventions before coding.
4. Do not replace EmDash authorization destructively.
5. Implement AWCMS ABAC as an overlay.
6. Preserve EmDash plugin compatibility.
7. Use module manifest and permission registry patterns from Part 4.
8. Use default tenant: 00000000-0000-0000-0000-000000000001.
9. Use default site: main.
10. Use GitHub Issues for non-trivial work.
11. Create a branch before implementation.
12. Run validation before completion.
13. Do not commit secrets, local databases, uploaded files, or production config.

GOAL:
Add the ABAC authorization baseline and Permission Matrix GUI plugin skeleton while preserving EmDash compatibility.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Inspect EmDash permission/auth patterns.
- Inspect AWCMS module registry docs from Part 4.
- Summarize compatibility risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Define ABAC Permission Registry
2. Add ABAC Policy Data Model
3. Implement ABAC Evaluator Service
4. Add Permission Matrix GUI Plugin Skeleton
5. Add Effective Access Preview
6. Add ABAC Audit Events

PHASE 2 — BRANCH
Create branch:
feat/add-abac-permission-matrix-baseline

PHASE 3 — DOCUMENTATION
Create or update:
- docs/abac.md
- docs/security.md
- docs/modules.md
- docs/testing.md
- docs/rollback.md
- docs/compatibility-matrix.md

PHASE 4 — PERMISSION REGISTRY
Add or document:
- permission namespace
- core permissions
- high-risk permissions
- module permission registration
- no random route-level permissions rule

PHASE 5 — POLICY DATA MODEL
If migration system exists, add migrations for:
- awcms_permissions
- awcms_roles
- awcms_role_permissions
- awcms_user_roles
- awcms_policy_sets
- awcms_policies
- awcms_access_decision_logs optional

If migrations are not ready, create docs and placeholders only.

PHASE 6 — EVALUATOR SERVICE
Add evaluator package or placeholder under:
packages/awcms/permissions/

Include:
- AccessCheckInput type
- AccessDecision type
- reason codes
- deny-by-default behavior
- explicit deny priority
- tenant/site checks
- deleted resource checks
- unit tests if test framework exists

PHASE 7 — ABAC MATRIX PLUGIN SKELETON
Create or update:
packages/plugins/abac-matrix/

Include:
- README.md
- module.manifest.json
- src/index.ts placeholder
- routes placeholders
- admin page placeholder
- services placeholders
- tests placeholder

PHASE 8 — EFFECTIVE ACCESS PREVIEW
Add design or endpoint placeholder for:
POST /_emdash/api/plugins/abac-matrix/v1/evaluate

Return:
- allowed
- reasonCode
- matchedPolicies
- missingPermissions

PHASE 9 — AUDIT EVENTS
Add audit event list and integration placeholders for:
- policy created/updated/disabled
- permission assigned/revoked
- import/export
- effective access tested
- last owner change blocked

PHASE 10 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 11 — COMMIT
Commit:
feat: add ABAC and permission matrix baseline

PHASE 12 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. authorization compatibility impact
5. EmDash compatibility impact
6. validation results
7. risks
8. rollback plan
9. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- replacing EmDash authorization internals
- editing EmDash core permission logic
- changing production permissions
- running destructive migrations
- deleting users/roles/policies
- committing secrets
- force pushing
```

---

## 35. Definition of Done for Part 5

Part 5 is complete when:

```txt
[ ] RBAC vs ABAC model is documented
[ ] EmDash compatibility rule is documented
[ ] permission namespace is defined
[ ] subject model is defined
[ ] resource model is defined
[ ] policy model is defined
[ ] policy tables are defined
[ ] evaluator design exists
[ ] reason codes are defined
[ ] Permission Matrix GUI screens are defined
[ ] Effective Access Preview is defined
[ ] API routes are defined
[ ] audit events are defined
[ ] default roles are defined
[ ] high-risk controls are defined
[ ] tests are defined
[ ] rollback strategy exists
[ ] GitHub Issues are prepared
[ ] OpenCode implementation prompt exists
```

---

## 36. Next Part

Continue with **Part 6 — Admin, Public Frontend, Mobile API, and Theme System**.

Part 6 should include:

- public Astro frontend;
- EmDash admin extension rules;
- admin manifest compatibility;
- role-aware menu rendering;
- mobile API plugin;
- theme/layout manager;
- template compatibility;
- content rendering;
- SEO;
- frontend testing;
- deployment concerns.
