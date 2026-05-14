# AWCMS-Micro Implementation Documentation

## Part 6 — Admin, Public Frontend, Mobile API, and Theme System

**Document status:** Draft v0.1  
**Purpose:** Define how AWCMS-Micro should implement the admin experience, public Astro frontend, mobile API layer, and theme/layout system while preserving compatibility with original EmDash architecture, admin conventions, plugins, templates, and future upstream updates.

---

## 1. Objective of Part 6

Part 6 defines how AWCMS-Micro should connect four major presentation and integration layers:

1. EmDash-compatible admin;
2. Astro-first public frontend;
3. mobile API layer;
4. theme/layout/template system.

The main objective is:

```txt
AWCMS-Micro must remain a website-first CMS implementation, while being prepared for mobile apps, multi-channel delivery, and future AWCMS platform expansion.
```

This document covers:

- admin extension rules;
- admin manifest compatibility;
- role-aware and permission-aware admin navigation;
- public Astro frontend architecture;
- content rendering strategy;
- SEO strategy;
- mobile API plugin;
- API contract strategy;
- theme/layout manager;
- template compatibility;
- public route strategy;
- frontend testing;
- GitHub Issues;
- OpenCode/Antigravity implementation prompt.

---

## 2. Core Principle

AWCMS-Micro should use EmDash as the CMS/admin foundation and Astro as the public frontend foundation.

```txt
EmDash admin = content and system management.
Astro public frontend = website rendering.
AWCMS-Micro mobile API = controlled mobile/backend channel.
Theme/layout manager = reusable visual layer.
```

Do not rebuild the entire admin system if EmDash already provides extension points.

EmDash admin uses the `@cloudflare/kumo` React component library with semantic color tokens (not raw Tailwind colors) and automatic dark mode via CSS `light-dark()`. EmDash generates virtual modules at build time (`virtual:emdash/config`, `virtual:emdash/dialect`, `virtual:emdash/plugin-admins`) for runtime configuration.

Do not expose internal EmDash admin APIs directly to mobile apps or public clients.

---

## 3. High-Level Architecture

```txt
┌─────────────────────────────────────────────┐
│ Admin Users                                 │
│ - owner                                     │
│ - admin                                     │
│ - editor                                    │
│ - author                                    │
│ - auditor                                   │
└───────────────────┬─────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ EmDash-Compatible Admin                     │
│ - manifest-driven navigation                │
│ - collection editors                         │
│ - media manager                              │
│ - plugin admin pages                         │
│ - ABAC Matrix plugin                         │
│ - module registry                            │
└───────────────────┬─────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ AWCMS-Micro Governance Layer                 │
│ - permission registry                        │
│ - ABAC evaluator                             │
│ - tenant/site context                        │
│ - audit log                                  │
│ - storage policy                             │
│ - module registry                            │
└───────────────────┬─────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Content, Modules, and Services               │
│ - pages                                      │
│ - posts/news                                 │
│ - documents                                  │
│ - forms                                      │
│ - media                                      │
│ - settings                                   │
│ - mobile API                                 │
└──────────────┬────────────────────┬─────────┘
               ↓                    ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│ Astro Public Frontend     │  │ Mobile API Layer          │
│ - website pages           │  │ - /api/mobile/v1          │
│ - layouts                 │  │ - JSON contracts          │
│ - SEO                     │  │ - app bootstrap           │
│ - static/SSR rendering    │  │ - secure endpoints        │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 4. Admin Strategy

### 4.1 Admin Role

The admin is responsible for:

- managing content;
- managing media;
- managing menus;
- managing forms and submissions;
- managing documents;
- managing modules;
- managing users and permissions;
- reviewing audit logs;
- configuring website/theme settings;
- preparing public content.

### 4.2 Admin Compatibility Rule

```txt
AWCMS-Micro should extend the EmDash admin through plugins, manifests, settings, and admin pages.
Do not hardcode custom module behavior into unrelated EmDash admin core files.
```

### 4.3 Admin Extension Priority

Preferred extension order:

1. EmDash plugin admin page;
2. EmDash admin widget;
3. admin manifest contribution;
4. AWCMS module registry contribution;
5. wrapper/adaptor;
6. core change only when no safe extension path exists.

---

## 5. Admin Manifest Compatibility

### 5.1 Manifest Principle

The admin should be driven by metadata wherever possible.

Admin navigation, collection forms, module pages, and plugin pages should be discoverable from:

- EmDash manifest;
- AWCMS module manifest;
- plugin manifest;
- permission registry;
- module registry.

### 5.2 AWCMS Admin Menu Item Shape

Recommended shape:

```json
{
  "id": "documents",
  "label": "Documents",
  "path": "/_emdash/admin/plugins/documents",
  "group": "Documents",
  "icon": "FileText",
  "moduleId": "documents",
  "permission": "awcms:document:read",
  "order": 40,
  "enabled": true
}
```

### 5.3 Menu Groups

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

### 5.4 Menu Rendering Rule

```txt
The admin sidebar must be role-aware and permission-aware.
A menu item may be hidden from users without access, but route and API checks must still enforce security.
```

Hidden menu is not security.

---

## 6. Admin Access Control

### 6.1 Required Checks

Every admin page must check:

1. authentication;
2. EmDash baseline permission when applicable;
3. AWCMS permission;
4. ABAC policy when applicable;
5. module enabled status;
6. tenant/site context.

### 6.2 Admin Page Access Example

Documents admin page:

```txt
User opens /_emdash/admin/plugins/documents
  ↓
Check authenticated admin session
  ↓
Check module documents is enabled
  ↓
Check awcms:document:read
  ↓
Check ABAC tenant/site access
  ↓
Render page or deny
```

### 6.3 Unauthorized Behavior

If access is denied:

- return 403 for API;
- show access denied screen for admin UI;
- avoid leaking resource existence for sensitive objects;
- write audit event for high-risk denial.

---

## 7. Standard Admin Screens

### 7.1 Dashboard

Shows:

- site status;
- recent content updates;
- module status;
- pending submissions;
- recent audit events;
- storage usage;
- security warnings;
- deployment environment.

### 7.2 Content

Includes:

- pages;
- posts/news;
- announcements;
- categories;
- tags where appropriate;
- content status.

### 7.3 Media

Includes:

- media library;
- upload;
- metadata;
- visibility;
- storage path;
- file validation status.

### 7.4 Forms

Includes:

- form builder/configuration;
- public form settings;
- consent setting;
- submissions;
- export permission.

### 7.5 Documents

Includes:

- document list;
- upload document;
- public/private classification;
- signed URL policy;
- publication status;
- audit access.

### 7.6 Appearance

Includes:

- active theme;
- layout presets;
- header settings;
- footer settings;
- homepage sections;
- typography/color settings;
- SEO defaults.

### 7.7 Users & Access

Includes:

- users;
- roles;
- permissions;
- ABAC Matrix;
- effective access preview;
- policy import/export.

### 7.8 Modules

Includes:

- module registry;
- install/enable/disable;
- module settings;
- module permissions;
- module storage scopes;
- module audit.

### 7.9 Integrations

Includes:

- webhooks;
- CRM integration;
- email integration;
- WhatsApp integration;
- Cloudflare settings where safe;
- external API logs.

### 7.10 Audit

Includes:

- security events;
- content events;
- permission events;
- document access events;
- module lifecycle events;
- export capability.

---

## 8. Public Frontend Strategy

### 8.1 Public Frontend Role

The public frontend is the website visitors see.

It should be:

- Astro-first;
- SEO-ready;
- mobile-first;
- fast;
- accessible;
- structured-content driven;
- static-first when possible;
- SSR/dynamic-ready when needed.

### 8.2 Public Frontend Rule

```txt
Public frontend must consume published and public-safe content only.
Draft, private, restricted, deleted, or internal content must never leak to public routes.
```

### 8.3 Rendering Modes

AWCMS-Micro should support:

| Mode | Use Case |
| --- | --- |
| Static generation | marketing pages, company profile, school profile |
| Server rendering | forms, secure documents, dynamic pages |
| Hybrid | public content static, private endpoints dynamic |
| Edge rendering | Cloudflare Workers deployment |

### 8.4 Recommended Public Routes

```txt
/
/about
/profile
/news
/news/[slug]
/announcements
/documents
/documents/[slug]
/gallery
/contact
/privacy
/search
```

School-specific optional routes:

```txt
/academic-calendar
/teachers
/staff
/achievements
/kelulusan
```

Company-specific optional routes:

```txt
/services
/portfolio
/case-studies
/pricing
```

Government/public portal optional routes:

```txt
/regulations
/public-information
/services
/complaints
```

---

## 9. Public Content Query Rules

Every public content query must filter by:

```txt
tenant_id/site context when applicable
published status
visibility public
not soft-deleted
not expired
not restricted/private
```

Conceptual filter:

```sql
where tenant_id = :tenant_id
  and site_id = :site_id
  and publish_status = 'published'
  and visibility = 'public'
  and deleted_at is null
```

If EmDash collections are used, apply equivalent EmDash-compatible filtering using the canonical content query API:

```ts
import { getEmDashCollection, getEmDashEntry } from "emdash";

// Get all published posts
const { entries: posts } = await getEmDashCollection("posts");

// Get drafts (admin only, behind auth)
const { entries: drafts } = await getEmDashCollection("posts", {
  status: "draft",
});

// Get a single entry by slug
const { entry: post } = await getEmDashEntry("posts", "my-post-slug");
```

EmDash stores rich text content as **Portable Text** (structured JSON via TipTap editor). Public pages must use a Portable Text renderer to convert this to HTML. Do not assume content is raw HTML.

For i18n-aware queries, always include `locale` filtering. EmDash uses a row-per-locale model where slug uniqueness is `UNIQUE(slug, locale)`.

---

## 10. Public Layout System

### 10.1 Base Layout

Required base layout responsibilities:

- HTML structure;
- meta tags;
- global CSS;
- header;
- footer;
- theme variables;
- Open Graph defaults;
- accessibility landmarks.

### 10.2 Page Layouts

Recommended layouts:

```txt
DefaultPageLayout
HomePageLayout
ArticleLayout
DocumentListLayout
FormPageLayout
LandingPageLayout
SecureLookupLayout
```

### 10.3 Component Groups

Recommended component groups:

```txt
navigation
hero
sections
cards
forms
documents
media
seo
layout
feedback
```

### 10.4 Mobile-First Rule

```txt
Design for mobile first, then enhance for tablet and desktop.
```

---

## 11. Theme System

### 11.1 Theme Definition

A theme is a reusable visual and layout package.

It may include:

- layouts;
- components;
- CSS variables;
- typography;
- color tokens;
- section presets;
- header/footer variants;
- page templates;
- content rendering rules;
- seed files;
- documentation.

### 11.2 Theme Directory Structure

```txt
packages/awcms/theme-standard/
  README.md
  theme.manifest.json
  src/
    layouts/
    components/
    styles/
    sections/
    templates/
  seed/
    theme-settings.json
  tests/
```

### 11.3 Theme Manifest

```json
{
  "id": "theme-standard",
  "name": "AWCMS Standard Theme",
  "version": "0.1.0",
  "description": "A clean, responsive, EmDash-compatible theme for AWCMS-Micro websites.",
  "supports": {
    "pages": true,
    "posts": true,
    "documents": true,
    "forms": true,
    "menus": true,
    "seo": true
  },
  "layouts": [
    "default",
    "homepage",
    "article",
    "landing",
    "document-list"
  ],
  "settings": [
    "brand.logo",
    "brand.primaryColor",
    "brand.accentColor",
    "typography.fontFamily",
    "header.variant",
    "footer.variant"
  ]
}
```

### 11.4 Theme Settings

Recommended settings:

```json
{
  "brand": {
    "logoUrl": null,
    "siteName": "AWCMS-Micro Standard",
    "primaryColor": "#2563eb",
    "accentColor": "#0f172a"
  },
  "typography": {
    "fontFamily": "system-ui"
  },
  "header": {
    "variant": "standard",
    "sticky": false
  },
  "footer": {
    "variant": "standard"
  }
}
```

### 11.5 Theme Rule

```txt
A theme must not require EmDash core modification.
A theme should work through Astro layouts, components, seed data, settings, and documented content assumptions.
```

---

## 12. Theme/Layout Manager

### 12.1 Purpose

The Theme/Layout Manager allows admins to configure visual presentation without editing code for common settings.

### 12.2 Admin Features

Recommended features:

```txt
Select active theme
Configure logo
Configure colors
Configure typography
Configure header variant
Configure footer variant
Configure homepage sections
Configure page layout presets
Preview before publish
Restore previous theme settings
```

### 12.3 Theme Change Safety

Changing theme settings should:

- validate input;
- preview before publishing;
- audit changes;
- allow rollback;
- avoid breaking content rendering;
- preserve accessibility.

### 12.4 Theme Versioning

Theme settings should include:

```txt
theme_id
theme_version
settings_version
updated_at
updated_by
```

---

## 13. Template Compatibility

### 13.1 EmDash Template Compatibility Rule

AWCMS-Micro should remain compatible with official and community EmDash templates.

Do not break assumptions around:

- Astro project structure;
- content collections;
- seed files;
- media usage;
- admin routes;
- plugin extension points;
- deployment modes.

### 13.2 AWCMS-Micro Templates

Recommended AWCMS-Micro templates (extending, not replacing, upstream EmDash templates):

EmDash upstream templates:

```txt
@emdash-cms/template-blog
@emdash-cms/template-marketing
@emdash-cms/template-portfolio
@emdash-cms/template-starter
@emdash-cms/template-blank
```

AWCMS-Micro custom templates (built on top of EmDash):

```txt
@awcms-micro/template-school
@awcms-micro/template-company
@awcms-micro/template-foundation
@awcms-micro/template-government-portal
@awcms-micro/template-landing-page
@awcms-micro/template-secure-document-publication
```

### 13.3 Template Structure

```txt
templates/school/
  README.md
  template.manifest.json
  src/
    pages/
    layouts/
    components/
    styles/
  seed/
    collections.json
    pages.json
    posts.json
    menus.json
    site-settings.json
  docs/
    usage.md
    security-notes.md
    deployment.md
```

### 13.4 Template Manifest

```json
{
  "id": "template-school",
  "name": "School Website Template",
  "version": "0.1.0",
  "category": "school",
  "requiredModules": [
    "pages",
    "blog-news",
    "announcements",
    "documents",
    "forms",
    "media",
    "menus",
    "seo"
  ],
  "optionalModules": [
    "academic-calendar",
    "staff-directory",
    "gallery",
    "kelulusan"
  ],
  "securityNotes": [
    "Do not publish student private data.",
    "Use signed URLs for private documents."
  ]
}
```

---

## 14. Content Rendering Strategy

### 14.1 Rendering Rule

```txt
Render content through stable content services or EmDash-compatible APIs.
Do not scatter raw database queries throughout public pages.
```

### 14.2 Recommended Content Service Functions

```ts
getSiteSettings(context)
getMainMenu(context)
getPublishedPages(context)
getPageBySlug(context, slug)
getPublishedPosts(context, options)
getPostBySlug(context, slug)
getPublishedAnnouncements(context)
getPublicDocuments(context, options)
getPublicDocumentBySlug(context, slug)
```

### 14.3 Content Safety Filter

All public-facing content services must enforce:

```txt
published only
public visibility only
not deleted
not expired
tenant/site context
```

### 14.4 Content Preview

Admin preview may show draft content, but must require authenticated permission.

Preview route pattern:

```txt
/_emdash/preview/pages/{id}
/_emdash/preview/posts/{id}
```

Preview URLs should be protected and time-limited when shared.

---

## 15. SEO Strategy

### 15.1 SEO Goals

AWCMS-Micro should provide:

- page title;
- meta description;
- canonical URL;
- Open Graph tags;
- Twitter/X card tags;
- sitemap;
- robots.txt;
- structured data where appropriate;
- image alt text;
- clean slug strategy.

### 15.2 SEO Fields

Recommended fields:

```txt
seo_title
seo_description
seo_canonical_url
seo_og_title
seo_og_description
seo_og_image
seo_noindex
seo_nofollow
seo_schema_json
```

### 15.3 SEO Defaults

Site-level SEO defaults:

```txt
site name
default title suffix
default description
default OG image
default locale
default canonical base URL
```

### 15.4 SEO Rendering Rule

```txt
Use page-specific SEO first.
Fallback to collection defaults.
Fallback to site defaults.
```

### 15.5 Sitemap Rule

Sitemap must include only:

- published public pages;
- published public posts;
- public documents where appropriate;
- non-deleted content;
- canonical URLs.

---

## 16. Forms in Public Frontend

### 16.1 Public Form Requirements

Public forms should include:

- input validation;
- CSRF/spam protection where appropriate;
- consent checkbox;
- privacy policy link;
- rate limiting;
- success/failure messaging;
- audit/submission log;
- safe file upload if attachments are enabled.

### 16.2 Form Submission Flow

```txt
User submits form
  ↓
Validate fields
  ↓
Check consent if required
  ↓
Check spam protection
  ↓
Store submission
  ↓
Write audit/submission event
  ↓
Send webhook/email if configured
  ↓
Return success message
```

### 16.3 Privacy Rule

```txt
Public form pages must clearly state what data is collected and why.
```

---

## 17. Documents in Public Frontend

### 17.1 Public Documents

Public document route:

```txt
/documents
/documents/[slug]
```

Show only:

- published documents;
- public classification;
- not deleted;
- not expired.

### 17.2 Private Documents

Private documents must not appear in public listing.

Access should use:

- verification flow;
- authenticated user flow;
- signed URL;
- short expiration;
- audit event.

### 17.3 Secure Lookup Route

Example:

```txt
/secure-documents
/kelulusan
```

Flow:

```txt
User enters verification data
  ↓
Rate limit check
  ↓
Verify record
  ↓
Create short session
  ↓
Generate signed URL
  ↓
Audit access
```

---

## 18. Mobile API Strategy

### 18.1 Mobile API Role

The mobile API should be a stable Backend-for-Frontend layer for mobile applications.

It should not expose EmDash internal admin APIs directly.

```txt
Mobile app consumes /api/mobile/v1/*
AWCMS-Micro maps requests to safe services
EmDash admin APIs remain internal/admin-oriented
```

### 18.2 Recommended Plugin

```txt
@awcms-micro/plugin-mobile-api
```

Module ID:

```txt
mobile-api
```

Internal namespace:

```txt
/_emdash/api/plugins/mobile-api/v1/*
```

Public alias:

```txt
/api/mobile/v1/*
```

### 18.3 Mobile API MVP Endpoints

```txt
GET  /api/mobile/v1/bootstrap
GET  /api/mobile/v1/home
GET  /api/mobile/v1/posts
GET  /api/mobile/v1/posts/:slug
GET  /api/mobile/v1/announcements
GET  /api/mobile/v1/menus/main
GET  /api/mobile/v1/documents
POST /api/mobile/v1/forms/contact/submissions
```

### 18.4 Future Authenticated Endpoints

```txt
POST /api/mobile/v1/auth/login
POST /api/mobile/v1/auth/refresh
POST /api/mobile/v1/auth/logout
GET  /api/mobile/v1/me
GET  /api/mobile/v1/me/notifications
POST /api/mobile/v1/uploads/request
POST /api/mobile/v1/uploads/confirm
GET  /api/mobile/v1/me/documents
```

### 18.5 Mobile Bootstrap Response

```json
{
  "success": true,
  "data": {
    "site": {
      "name": "AWCMS-Micro Standard",
      "tagline": "EmDash-compatible website foundation",
      "locale": "id-ID",
      "timezone": "Asia/Jakarta"
    },
    "features": {
      "news": true,
      "announcements": true,
      "documents": true,
      "forms": true,
      "secureDocumentLookup": false
    },
    "api": {
      "version": "v1",
      "minimumAppVersion": "1.0.0",
      "maintenanceMode": false
    }
  },
  "meta": {
    "apiVersion": "v1"
  }
}
```

---

## 19. Mobile API Contract

### 19.1 Success Response

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

### 19.2 List Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "nextCursor": null,
    "hasMore": false
  },
  "meta": {
    "requestId": "req_...",
    "apiVersion": "v1"
  }
}
```

### 19.3 Error Response

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource.",
    "details": null
  },
  "meta": {
    "requestId": "req_...",
    "apiVersion": "v1"
  }
}
```

### 19.4 Error Codes

```txt
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
RATE_LIMITED
CONFLICT
PAYLOAD_TOO_LARGE
UNSUPPORTED_MEDIA_TYPE
MAINTENANCE_MODE
INTERNAL_ERROR
```

---

## 20. Mobile API Security

### 20.1 Public Mobile API Controls

Required:

- HTTPS only;
- CORS allowlist;
- rate limiting;
- request ID;
- versioned API;
- public-only content filtering;
- no draft/private content exposure;
- cache headers where safe.

### 20.2 Authenticated Mobile API Controls

Required later:

- short-lived access token;
- refresh token rotation;
- device session record;
- logout/revocation;
- audit log;
- ABAC checks;
- signed URLs for private files.

### 20.3 Mobile API Rule

```txt
Mobile apps must never contain server secrets, service-role keys, or unrestricted storage credentials.
```

---

## 21. API Gateway Strategy

### 21.1 Cloudflare Worker Gateway

For production, use a Cloudflare Worker gateway when appropriate.

Responsibilities:

- route `/api/mobile/v1/*`;
- CORS;
- rate limiting;
- cache public responses;
- request ID;
- maintenance mode;
- origin protection;
- optional Turnstile verification for public forms.

### 21.2 Gateway Rule

```txt
The gateway may enforce edge controls, but origin/API services must still enforce permissions and validation.
```

---

## 22. Public Assets and Media

### 22.1 Public Media

Public media can be cached and served directly when approved.

### 22.2 Private Media

Private media must use signed URL flow.

### 22.3 Image Strategy

Recommended:

- store original image;
- generate optimized variants where supported;
- use responsive images;
- require alt text for public content;
- compress images before publication;
- avoid exposing private media variants publicly.

---

## 23. Accessibility Requirements

Public frontend must consider:

- semantic HTML;
- keyboard navigation;
- sufficient contrast;
- alt text;
- form labels;
- focus states;
- skip links;
- responsive text;
- accessible error messages.

Admin custom pages must also follow accessibility expectations.

---

## 24. Internationalization and Localization

### 24.1 Default Locale

For Indonesian deployments:

```txt
id-ID
Asia/Jakarta
```

### 24.2 Supported Future Locales

Recommended structure:

```txt
id-ID
en-US
ar-SA optional for Islamic education content
```

### 24.3 Localization Rule

```txt
Do not hardcode user-facing text deeply inside business logic.
Keep UI text configurable or localizable where practical.
```

---

## 25. Indonesian Website Context

### 25.1 School Website

Typical sections:

```txt
Home
Profile
Vision and Mission
News
Announcements
Academic Calendar
Teachers/Staff
Achievements
Gallery
Documents
Contact
Kelulusan optional
```

Special controls:

- do not expose private student records;
- secure graduation documents;
- consent for student photos where required;
- audit document publication.

### 25.2 Company Website

Typical sections:

```txt
Home
About
Services
Portfolio
Blog
Contact
Privacy Policy
```

Special controls:

- lead consent;
- CRM/webhook audit;
- public company profile accuracy.

### 25.3 Foundation Website

Typical sections:

```txt
Programs
News
Reports
Donation Information
Gallery
Volunteer Form
Documents
Contact
```

Special controls:

- donor data protection;
- public reporting accuracy;
- volunteer form consent.

### 25.4 Government/Public Portal

Typical sections:

```txt
Profile
Public Information
Regulations
Announcements
Services
Documents
Forms
Contact
```

Special controls:

- document classification;
- publication responsibility;
- public-sector data governance;
- audit trail.

---

## 26. ISO Alignment

### 26.1 ISO/IEC 27001

Relevant to:

- admin access control;
- content governance;
- audit logging;
- secure deployment;
- incident handling.

### 26.2 ISO/IEC 27002

Relevant controls:

- privileged access;
- user access provisioning;
- information classification;
- logging;
- secure configuration;
- protection against malware in uploads.

### 26.3 ISO/IEC 27005

Use risk assessment for:

- mobile API;
- private document access;
- admin plugin pages;
- marketplace templates/plugins;
- public forms.

### 26.4 ISO/IEC 27017 and 27018

Relevant to:

- Cloudflare hosting;
- R2/S3 storage;
- D1/KV data;
- personal data in cloud environments.

### 26.5 ISO/IEC 27701

Relevant to:

- privacy notices;
- consent;
- form submissions;
- data subject requests;
- mobile user data.

### 26.6 ISO/IEC 27034

Relevant to:

- secure public frontend development;
- secure API development;
- validation and testing;
- secure coding for plugins.

### 26.7 ISO/IEC 20000-1

Relevant to:

- operational support;
- incident response;
- change management;
- release process.

### 26.8 ISO 22301

Relevant to:

- continuity of public website;
- backup/restore;
- disaster recovery;
- failover planning.

### 26.9 ISO/IEC 15408

Useful for assurance thinking around:

- admin access control;
- mobile API authentication;
- secure document download;
- ABAC policy evaluation.

---

## 27. Practical Implementation Examples

### Example 1 — School Website Frontend

Public routes:

```txt
/
/profile
/news
/announcements
/academic-calendar
/documents
/contact
/kelulusan
```

Admin modules:

```txt
Pages
News
Announcements
Documents
Forms
Media
Kelulusan
Audit Log
```

Mobile API:

```txt
GET /api/mobile/v1/bootstrap
GET /api/mobile/v1/posts
GET /api/mobile/v1/announcements
GET /api/mobile/v1/documents
```

### Example 2 — Company Profile

Public routes:

```txt
/
/about
/services
/portfolio
/news
/contact
/privacy
```

Admin modules:

```txt
Pages
Posts
Forms
Media
SEO
Webhook Notifier
```

Mobile API:

```txt
GET /api/mobile/v1/bootstrap
GET /api/mobile/v1/posts
POST /api/mobile/v1/forms/contact/submissions
```

### Example 3 — Foundation Website

Public routes:

```txt
/
/programs
/news
/reports
/gallery
/volunteer
/contact
```

Admin modules:

```txt
Pages
Programs
News
Documents
Forms
Gallery
Audit Log
```

Mobile API:

```txt
GET /api/mobile/v1/programs
GET /api/mobile/v1/posts
POST /api/mobile/v1/forms/volunteer/submissions
```

### Example 4 — Government Portal

Public routes:

```txt
/
/profile
/public-information
/regulations
/services
/documents
/forms
/contact
```

Admin modules:

```txt
Pages
Documents
Announcements
Forms
Audit Log
Users & Access
```

Security:

```txt
Document publication must be audited.
Restricted documents must not appear publicly.
```

### Example 5 — Landing Page Factory

Public routes:

```txt
/{landing-slug}
/{landing-slug}/contact
```

Admin modules:

```txt
Pages
Theme Manager
Forms
SEO
Media
```

Theme system:

```txt
Multiple layout presets
Reusable section blocks
Per-site branding
```

---

## 28. Testing Strategy

### 28.1 Admin Tests

Test:

```txt
admin login
admin sidebar renders role-aware items
unauthorized menu hidden
unauthorized direct route denied
module admin page opens when enabled
module admin page hidden when disabled
ABAC Matrix link visible only to allowed users
```

### 28.2 Public Frontend Tests

Test:

```txt
homepage loads
navigation works
public page renders
news listing renders
news detail renders
public documents render
private documents hidden
form submits successfully
SEO tags exist
sitemap includes public content only
```

### 28.3 Mobile API Tests

Test:

```txt
GET /api/mobile/v1/bootstrap returns valid contract
posts endpoint excludes drafts
announcements endpoint excludes deleted data
documents endpoint excludes private documents
form submission validates input
rate limit behavior documented/tested
```

### 28.4 Theme Tests

Test:

```txt
theme settings load
header variant renders
footer variant renders
homepage sections render
invalid theme setting rejected
rollback theme setting works
```

### 28.5 Playwright Flows

Minimum flows:

```txt
1. visit homepage;
2. visit public news page;
3. visit public document page;
4. submit contact form;
5. open admin;
6. verify role-aware admin menu;
7. create page in admin;
8. publish page;
9. visit published page;
10. change theme setting;
11. verify public frontend changed;
12. call mobile bootstrap endpoint;
13. verify drafts/private content are not exposed.
```

---

## 29. Performance Strategy

### 29.1 Public Frontend

Use:

- static generation where possible;
- edge caching;
- image optimization;
- minimal JavaScript;
- CSS efficiency;
- lazy loading;
- cache invalidation on publish.

### 29.2 Admin

Use:

- pagination;
- search/filter;
- lazy-loaded module pages;
- optimistic UI only when safe;
- clear loading/error states.

### 29.3 Mobile API

Use:

- small payloads;
- cursor pagination;
- updated_since filters;
- ETag/Last-Modified where appropriate;
- cache public endpoints;
- avoid sending full HTML content unless needed.

---

## 30. Rollback Strategy

### 30.1 Admin Rollback

If a custom admin plugin breaks:

```txt
Disable plugin admin page.
Keep EmDash admin core intact.
Revert plugin version.
```

### 30.2 Public Frontend Rollback

If theme breaks:

```txt
Revert theme settings.
Switch to previous theme.
Revert deployment.
```

### 30.3 Mobile API Rollback

If mobile API breaks:

```txt
Keep previous API version active.
Disable new endpoint.
Return maintenance mode for affected feature.
Revert gateway route if needed.
```

### 30.4 Template Rollback

If template seed is wrong:

```txt
Restore database backup.
Re-run corrected seed on staging.
Do not run destructive seed in production without approval.
```

---

## 31. GitHub Issues for Part 6

### Issue 1 — Define Admin Extension and Manifest Compatibility Rules

```md
## Goal
Document how AWCMS-Micro extends EmDash admin without creating a fragile fork.

## Tasks
- Define admin extension priority
- Define admin menu item shape
- Define role-aware menu behavior
- Define module admin page rule
- Define unauthorized behavior

## Validation
- Admin extension does not require EmDash core modification
- Menu visibility depends on permission
- Direct route access still checks permission

## Rollback
Revert admin extension documentation or disable custom admin page.
```

### Issue 2 — Add Public Frontend Architecture

```md
## Goal
Define Astro-first public frontend architecture.

## Tasks
- Define public route strategy
- Define content rendering rules
- Define layout system
- Define SEO requirements
- Define public content filtering

## Validation
- Public routes expose only public published content
- Draft/private/deleted content is hidden
- SEO fields are documented

## Rollback
Revert frontend shell or theme changes.
```

### Issue 3 — Add Theme/Layout Manager Design

```md
## Goal
Create the theme/layout manager design.

## Tasks
- Define theme manifest
- Define theme settings
- Define theme admin features
- Define preview and rollback behavior
- Define template compatibility rules

## Validation
- Theme does not require EmDash core modification
- Theme settings can be rolled back
- Template structure is documented

## Rollback
Switch to previous theme or revert theme settings.
```

### Issue 4 — Add Mobile API Plugin Baseline

```md
## Goal
Define the mobile API plugin and MVP endpoints.

## Tasks
- Define plugin namespace
- Define public alias
- Define bootstrap endpoint
- Define posts/documents/forms endpoints
- Define API response contract
- Define security rules

## Validation
- Mobile API does not expose EmDash admin APIs directly
- Public endpoints filter private/draft/deleted content
- Response contract is stable

## Rollback
Disable mobile API plugin or revert gateway route.
```

### Issue 5 — Add SEO and Public Metadata Baseline

```md
## Goal
Define SEO and public metadata strategy.

## Tasks
- Define SEO fields
- Define fallback rules
- Define sitemap rules
- Define robots.txt requirements
- Define Open Graph fields

## Validation
- Public pages render title and description
- Sitemap includes only public published content
- Private content is excluded

## Rollback
Revert SEO rendering changes.
```

### Issue 6 — Add Admin/Public/Mobile E2E Test Plan

```md
## Goal
Create Playwright test plan for admin, public frontend, mobile API, and theme behavior.

## Tasks
- Add admin tests
- Add public frontend tests
- Add mobile API tests
- Add theme tests
- Add private content leak tests

## Validation
- Test plan covers critical flows
- Future test implementation can follow plan

## Rollback
Revert test plan or mark pending flows.
```

---

## 32. OpenCode / Antigravity Implementation Prompt for Part 6

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, admin architecture, frontend architecture, mobile API, SEO, security, and Cloudflare implementation agent.

TASK:
Implement Part 6 of the AWCMS-Micro documentation: Admin, Public Frontend, Mobile API, and Theme System.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/modules.md, docs/abac.md, docs/security.md, docs/storage.md, and docs/testing.md.
3. Inspect EmDash admin and plugin extension conventions before coding.
4. Do not hardcode custom module behavior into EmDash admin core.
5. Do not expose EmDash internal admin APIs directly to mobile apps.
6. Use Astro-first public frontend patterns.
7. Use plugin/module manifests for admin pages where possible.
8. Preserve EmDash template compatibility.
9. Use GitHub Issues for non-trivial work.
10. Create a branch before implementation.
11. Run validation before completion.
12. Do not commit secrets, local databases, uploaded files, or production config.

GOAL:
Add the admin/public/mobile/theme baseline for AWCMS-Micro while staying compatible with EmDash architecture and extension rules.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Inspect EmDash admin/plugin docs and examples.
- Inspect current frontend structure.
- Inspect SMAN 2 reference repo only for patterns.
- Summarize compatibility risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Define Admin Extension and Manifest Compatibility Rules
2. Add Public Frontend Architecture
3. Add Theme/Layout Manager Design
4. Add Mobile API Plugin Baseline
5. Add SEO and Public Metadata Baseline
6. Add Admin/Public/Mobile E2E Test Plan

PHASE 2 — BRANCH
Create branch:
feat/add-admin-public-mobile-theme-baseline

PHASE 3 — DOCUMENTATION
Create or update:
- docs/admin.md
- docs/frontend.md
- docs/mobile-api.md
- docs/theme-system.md
- docs/seo.md
- docs/testing.md
- docs/security.md
- docs/compatibility-matrix.md

PHASE 4 — ADMIN BASELINE
Add or document:
- admin extension rules
- admin menu item shape
- role-aware menu behavior
- admin screen plan
- module admin page rules
- unauthorized behavior

PHASE 5 — PUBLIC FRONTEND BASELINE
Add or update:
- public route strategy
- BaseLayout
- Header
- Footer
- homepage sections
- SEO-ready metadata
- public content filtering rules

PHASE 6 — THEME SYSTEM
Add or document:
- theme manifest
- theme settings
- theme/layout manager screens
- preview and rollback behavior
- template compatibility rules

PHASE 7 — MOBILE API
Create or update mobile-api plugin skeleton:
packages/plugins/mobile-api/

Include:
- README.md
- module.manifest.json
- route placeholders
- API contract docs
- bootstrap endpoint design
- security rules

PHASE 8 — SEO
Add or document:
- SEO fields
- fallback rules
- sitemap requirements
- robots.txt requirements
- Open Graph requirements

PHASE 9 — TEST PLAN
Add tests or test docs for:
- admin menu permission behavior
- public frontend published-only behavior
- mobile API bootstrap contract
- SEO tag rendering
- theme setting rollback
- private content leak prevention

PHASE 10 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 11 — COMMIT
Commit:
feat: add admin public mobile and theme baseline

PHASE 12 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. admin compatibility impact
5. frontend compatibility impact
6. mobile API compatibility impact
7. validation results
8. risks
9. rollback plan
10. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash admin core
- exposing admin APIs to public clients
- changing production Cloudflare routes
- committing secrets
- running destructive migrations
- deleting existing theme/content files
- force pushing
```

---

## 33. Definition of Done for Part 6

Part 6 is complete when:

```txt
[ ] admin extension rules are documented
[ ] admin manifest compatibility is documented
[ ] role-aware admin menu behavior is defined
[ ] public Astro frontend strategy is defined
[ ] public content filtering rules are defined
[ ] route strategy is defined
[ ] theme system is defined
[ ] theme/layout manager is defined
[ ] template compatibility rules are defined
[ ] SEO strategy is defined
[ ] mobile API plugin strategy is defined
[ ] mobile API MVP endpoints are defined
[ ] API contract is defined
[ ] API gateway strategy is defined
[ ] accessibility requirements are defined
[ ] localization direction is defined
[ ] testing strategy exists
[ ] GitHub Issues are prepared
[ ] OpenCode implementation prompt exists
[ ] rollback strategy exists
```

---

## 34. Next Part

Continue with **Part 7 — Security, Compliance, ISO Alignment, and Testing**.

Part 7 should include:

- secure-by-default engineering baseline;
- Indonesian PDP compliance;
- PP 71/2019 alignment;
- privacy policy requirements;
- consent and data retention;
- secure upload controls;
- audit log requirements;
- Cloudflare security controls;
- ISO/IEC 27001, 27002, 27005, 27017, 27018, 27701, 27034, 20000-1, 22301, 15408 alignment;
- unit/integration/e2e/security tests;
- release validation checklist.
