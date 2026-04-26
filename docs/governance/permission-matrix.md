# Permission Matrix

## Purpose

This document defines the current first-party permission inventory for SIKESRA (awcms-mini-sikesra) across core governance features, first-party plugins, and the current `/api/v1/*` edge API baseline.

## Rules

- Permission codes use the canonical `scope.resource.action` shape.
- Backend service authorization remains the authority.
- Route guards and UI visibility are convenience layers and must align to the same catalog.
- Plugin-declared permissions should normalize into the same catalog shape as core permissions.
- Edge API routes should declare and enforce canonical permissions through shared authorization services.

## Current First-Party Coverage

### Core Governance And Admin

| Feature surface                      | Permission codes                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| user records and profile detail      | `admin.users.read`, `admin.users.invite`, `admin.users.update`, `admin.users.disable`         |
| role catalog and assignments         | `admin.roles.read`, `admin.roles.assign`                                                      |
| permission catalog and matrix        | `admin.permissions.read`, `admin.permissions.update`                                          |
| audit log review                     | `audit.logs.read`, `audit.logs.export`                                                        |
| logical jobs and assignments         | `governance.jobs.read`, `governance.jobs.assign`                                              |
| logical regions                      | `governance.regions.read`                                                                     |
| administrative region assignments    | `governance.administrative_regions.assign`                                                    |
| session and login history operations | `security.sessions.read`, `security.sessions.revoke`                                          |
| two-factor inspection and reset      | `security.2fa.read`, `security.2fa.reset`                                                     |
| content authoring baseline           | `content.posts.read`, `content.posts.create`, `content.posts.update`, `content.posts.publish` |
| plugin management baseline           | `plugins.manage.read`, `plugins.manage.update`                                                |

### First-Party Plugins

#### `awcms-users-admin`

- Reuses the core catalog above for first-party governance and admin routes.
- Route guards resolve `permissionCode` values through the shared plugin route authorization helper and the shared authorization service.

### Edge API Baseline

| Edge route             | Permission code           | Notes                             |
| ---------------------- | ------------------------- | --------------------------------- |
| `GET /api/v1/health`   | none                      | public health endpoint            |
| `GET /api/v1/session`  | `edge.api_session.read`   | current authenticated caller only |
| `POST /api/v1/session` | `edge.api_session.revoke` | current authenticated caller only |

## Self-Service Rules

- Self-service permissions still require RBAC permission presence.
- ABAC scoped-allow rules then constrain self-targeted user and session actions.

## Follow-On Rules For New Features

- New first-party feature routes should not land without canonical permission codes.
- New edge routes should declare their required permission codes in the route module or a route-adjacent helper.
- New plugin routes should keep descriptor declarations, route guards, and service checks aligned to the same normalized permission codes.
- High-risk mutations should keep `is_protected` markers and step-up requirements aligned.

## Cross-References

- `docs/governance/auth-and-authorization.md`
- `docs/plugins/permission-registration.md`
- `docs/plugins/contract-overview.md`
- `src/plugins/awcms-users-admin/index.mjs`
- `src/api/edge/session.mjs`
