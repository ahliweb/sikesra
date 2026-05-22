# AWCMS-Micro Implementation Documentation

## Part 10 — AWCMS-Micro Standard Website Template Specification

**Document status:** Draft v0.1  
**Purpose:** Define the standard website template specification for AWCMS-Micro so new websites can be created quickly, consistently, securely, and compatibly with original EmDash architecture, plugins, themes, seed data, and future AWCMS expansion.

---

## 1. Objective of Part 10

Part 10 defines the reusable website template standard for AWCMS-Micro.

This document covers:

1. standard website template architecture;
2. template folder structure;
3. template manifest;
4. reusable layout system;
5. reusable page sections;
6. content model presets;
7. seed data structure;
8. template variants;
9. school website template;
10. company profile template;
11. foundation/nonprofit template;
12. government/public portal template;
13. landing page template;
14. secure document publication template;
15. SEO presets;
16. accessibility checklist;
17. localization strategy;
18. testing strategy;
19. GitHub Issues;
20. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
AWCMS-Micro templates must be reusable, EmDash-compatible, client-neutral by default, and safe to customize without modifying EmDash core.
```

---

## 2. Template Philosophy

AWCMS-Micro templates are not just visual themes. They are reusable website implementation packages that combine:

- Astro pages;
- layouts;
- components;
- styles;
- content seed data;
- recommended modules;
- SEO defaults;
- accessibility baseline;
- privacy pages;
- deployment notes;
- rollback notes;
- testing instructions.

A template should help create a new website quickly, but must not lock the project into a fragile custom fork.

Core rule:

```txt
Template = content structure + layout pattern + theme preset + seed data + docs.
Template must not require EmDash core modification.
```

---

## 3. Template Categories

Recommended official AWCMS-Micro templates:

```txt
@awcms-micro/template-standard
@awcms-micro/template-school
@awcms-micro/template-company
@awcms-micro/template-foundation
@awcms-micro/template-government-portal
@awcms-micro/template-landing-page
@awcms-micro/template-secure-document-publication
```

### 3.1 Template Use Cases

| Template                    | Primary Use Case                                          |
| --------------------------- | --------------------------------------------------------- |
| Standard                    | Generic reusable website base                             |
| School                      | School, pesantren, campus, training center                |
| Company                     | Company profile, consultant, agency, service business     |
| Foundation                  | Nonprofit, social organization, community, mosque/yayasan |
| Government Portal           | Public agency, public information, public service portal  |
| Landing Page                | Campaign, product/service page, lead capture              |
| Secure Document Publication | Graduation, certificates, private document lookup         |

---

## 4. Template Compatibility Requirements

AWCMS-Micro templates must preserve compatibility with:

```txt
EmDash admin (React UI with @cloudflare/kumo components)
EmDash collections/content model (ec_ prefixed tables, Portable Text)
EmDash media storage abstraction (adapter-based: local(), r2(), s3())
EmDash plugin/module extension model (definePlugin() API)
EmDash official/community templates where possible
Astro 6+ page/layout/component structure
Cloudflare deployment profile
AWCMS tenant-ready custom modules (awcms_ prefixed tables)
AWCMS storage path policy
AWCMS ABAC and permission registry
```

Do not create templates that require:

```txt
editing EmDash core
hardcoded production Cloudflare IDs
hardcoded client private data
hardcoded private document URLs
hardcoded admin routes outside plugin conventions
unsafe direct database queries in public pages
```

---

## 5. Standard Template Repository Structure

Recommended structure:

```txt
templates/
  standard/
    README.md
    template.manifest.json
    package.json
    src/
      pages/
        index.astro
        about.astro
        news/
          index.astro
          [slug].astro
        documents/
          index.astro
          [slug].astro
        contact.astro
        privacy.astro
      layouts/
        BaseLayout.astro
        HomeLayout.astro
        PageLayout.astro
        ArticleLayout.astro
        DocumentLayout.astro
        FormLayout.astro
      components/
        navigation/
        sections/
        cards/
        forms/
        documents/
        seo/
        ui/
      styles/
        global.css
        tokens.css
      services/
        content.ts
        seo.ts
        menus.ts
    seed/
      site-settings.json
      menus.json
      pages.json
      posts.json
      announcements.json
      documents.json
      forms.json
      theme-settings.json
    docs/
      usage.md
      customization.md
      security-notes.md
      accessibility.md
      deployment.md
      rollback.md
    tests/
      template-smoke.spec.ts
```

---

## 6. Template Manifest Standard

Every template must include:

```txt
template.manifest.json
```

### 6.1 Minimum Manifest

```json
{
	"id": "template-standard",
	"name": "AWCMS-Micro Standard Website Template",
	"version": "0.1.0",
	"category": "standard",
	"description": "Generic EmDash-compatible website template for AWCMS-Micro.",
	"tenantReady": true,
	"siteScoped": true,
	"requiredModules": [],
	"optionalModules": [],
	"layouts": [],
	"sections": [],
	"seedFiles": [],
	"securityNotes": [],
	"accessibilityLevel": "baseline",
	"locales": ["id-ID", "en-US"],
	"deploymentTargets": ["local", "cloudflare"],
	"rollback": {
		"safeToDisable": true,
		"dataDestructive": false
	}
}
```

### 6.2 Full Standard Template Manifest Example

```json
{
	"id": "template-standard",
	"name": "AWCMS-Micro Standard Website Template",
	"version": "0.1.0",
	"category": "standard",
	"description": "A generic standard website template for AWCMS-Micro based on EmDash-compatible architecture.",
	"tenantReady": true,
	"siteScoped": true,
	"requiredModules": [
		"core-settings",
		"pages",
		"blog-news",
		"announcements",
		"menus",
		"media",
		"seo",
		"forms",
		"documents"
	],
	"optionalModules": ["audit-log", "module-registry", "mobile-api", "webhook-notifier"],
	"layouts": ["base", "home", "page", "article", "document-list", "form"],
	"sections": [
		"hero",
		"feature-grid",
		"latest-posts",
		"announcements",
		"documents-preview",
		"gallery-preview",
		"contact-cta"
	],
	"seedFiles": [
		"site-settings.json",
		"menus.json",
		"pages.json",
		"posts.json",
		"announcements.json",
		"documents.json",
		"forms.json",
		"theme-settings.json"
	],
	"securityNotes": [
		"Do not place private data in seed files.",
		"Public routes must render only published public content.",
		"Private documents require signed URLs and audit events."
	],
	"accessibilityLevel": "baseline",
	"locales": ["id-ID", "en-US"],
	"deploymentTargets": ["local", "cloudflare"],
	"rollback": {
		"safeToDisable": true,
		"dataDestructive": false,
		"notes": "Switch to previous template or restore previous theme settings."
	}
}
```

---

## 7. Base Layout Specification

### 7.1 Required Layouts

Every standard template should provide:

```txt
BaseLayout
HomeLayout
PageLayout
ArticleLayout
DocumentListLayout
FormLayout
LandingLayout
SecureLookupLayout optional
```

### 7.2 BaseLayout Responsibilities

```txt
HTML shell
language attribute
meta title and description
canonical URL
Open Graph defaults
global CSS
theme tokens
header
footer
main landmark
accessibility skip link
structured data slot
```

### 7.3 Layout Props

Recommended layout props:

```ts
type LayoutProps = {
	title: string;
	description?: string;
	canonicalUrl?: string;
	ogImage?: string;
	noindex?: boolean;
	layout?: string;
	locale?: string;
};
```

---

## 8. Reusable Components

### 8.1 Navigation Components

```txt
Header
Footer
MobileMenu
Breadcrumbs
SidebarNavigation
LanguageSwitcher optional
```

### 8.2 Section Components

```txt
HeroSection
FeatureGridSection
LatestPostsSection
AnnouncementsSection
DocumentsPreviewSection
GalleryPreviewSection
StatsSection
TestimonialsSection
FAQSection
ContactCTASection
```

### 8.3 Card Components

```txt
PostCard
AnnouncementCard
DocumentCard
FeatureCard
StaffCard
ProgramCard
ServiceCard
GalleryCard
```

### 8.4 Form Components

```txt
ContactForm
NewsletterForm
SearchForm
SecureLookupForm
ConsentCheckbox
FormErrorMessage
FormSuccessMessage
```

### 8.5 SEO Components

```txt
SeoHead
OpenGraphTags
StructuredData
BreadcrumbJsonLd
OrganizationJsonLd
ArticleJsonLd
```

### 8.6 UI Components

```txt
Button
Badge
Card
Container
Section
Alert
Tabs
Accordion
Pagination
```

---

## 9. Design Tokens

Templates should define reusable design tokens.

### 9.1 Token Categories

```txt
colors
typography
spacing
radius
shadow
breakpoints
z-index
layout widths
```

### 9.2 Example CSS Tokens

```css
:root {
	--color-background: #ffffff;
	--color-foreground: #0f172a;
	--color-muted: #64748b;
	--color-border: #e2e8f0;
	--color-primary: #2563eb;
	--color-primary-foreground: #ffffff;
	--color-accent: #f59e0b;

	--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	--font-serif: Georgia, serif;

	--space-section: clamp(3rem, 7vw, 6rem);
	--container-width: 1120px;
	--radius-card: 1rem;
	--shadow-card: 0 10px 30px rgb(15 23 42 / 0.08);
}
```

### 9.3 Token Rule

```txt
Client branding should be applied through tokens/settings, not by hardcoding colors throughout components.
```

---

## 10. Starter Content Model

### 10.1 Required Content Types

Standard template should support:

EmDash collections (stored in `ec_` prefixed tables, content as Portable Text):

```txt
pages          → ec_pages
posts          → ec_posts
media          → ec_media (EmDash managed)
```

AWCMS custom modules (stored in `awcms_` prefixed tables):

```txt
site_settings
menus
announcements
documents
forms
```

Content should be queried using `getEmDashCollection()` and `getEmDashEntry()` for EmDash collections, and custom service functions for AWCMS modules.

### 10.2 Optional Content Types

```txt
gallery_items
staff_profiles
programs
services
achievements
events
faqs
testimonials
```

### 10.3 Common Fields: Page

```txt
title
slug
excerpt
content (Portable Text JSON — requires renderer for HTML output)
featured_image
seo_title
seo_description
visibility
publish_status
published_at
updated_at
deleted_at
locale (for i18n: row-per-locale model, slug unique per locale)
```

### 10.4 Common Fields: Post

```txt
title
slug
excerpt
content
author
category
tags
featured_image
published_at
seo_title
seo_description
visibility
publish_status
```

### 10.5 Common Fields: Document

```txt
title
slug
description
category
media_object_id
classification
publish_status
published_at
expires_at
access_policy
```

### 10.6 Common Fields: Form

```txt
name
slug
description
fields_json
require_consent
success_message
notification_settings
status
```

---

## 11. Seed Data Specification

### 11.1 Seed Files

Standard seed folder:

```txt
seed/
  site-settings.json
  menus.json
  pages.json
  posts.json
  announcements.json
  documents.json
  forms.json
  theme-settings.json
```

### 11.2 Seed Data Rules

Seed data must be:

```txt
safe
public
client-neutral
non-sensitive
replaceable
versioned
reviewable
```

Never include:

```txt
real student data
private documents
real citizen submissions
production credentials
real internal phone numbers unless approved
real Cloudflare IDs
private URLs
```

### 11.3 Site Settings Seed

```json
{
	"siteName": "AWCMS-Micro Standard",
	"tagline": "EmDash-compatible website foundation",
	"locale": "id-ID",
	"timezone": "Asia/Jakarta",
	"contact": {
		"email": "info@example.com",
		"phone": "+62-000-0000-0000",
		"address": "Example address"
	},
	"defaultTenant": {
		"id": "00000000-0000-0000-0000-000000000001",
		"code": "default",
		"name": "Default Tenant"
	},
	"defaultSite": {
		"id": "main",
		"code": "main",
		"name": "Main Site"
	}
}
```

### 11.4 Menus Seed

```json
{
	"main": [
		{ "label": "Home", "href": "/" },
		{ "label": "About", "href": "/about" },
		{ "label": "News", "href": "/news" },
		{ "label": "Documents", "href": "/documents" },
		{ "label": "Contact", "href": "/contact" }
	],
	"footer": [
		{ "label": "Privacy Policy", "href": "/privacy" },
		{ "label": "Contact", "href": "/contact" }
	]
}
```

### 11.5 Forms Seed

```json
[
	{
		"name": "Contact Form",
		"slug": "contact",
		"description": "Standard contact form.",
		"requireConsent": true,
		"fields": [
			{ "name": "name", "type": "text", "label": "Name", "required": true },
			{ "name": "email", "type": "email", "label": "Email", "required": true },
			{ "name": "message", "type": "textarea", "label": "Message", "required": true }
		],
		"successMessage": "Thank you. Your message has been submitted."
	}
]
```

---

## 12. Standard Template Variant

### 12.1 Purpose

The standard template is the base for all other variants.

Use it for:

- generic websites;
- simple organization profile;
- early prototypes;
- reusable client base.

### 12.2 Required Pages

```txt
Home
About
News
Documents
Contact
Privacy Policy
```

### 12.3 Homepage Sections

```txt
Hero
About Summary
Feature Grid
Latest News
Announcements
Documents Preview
Contact CTA
```

### 12.4 Required Modules

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
```

---

## 13. School Template Specification

### 13.1 Purpose

The school template is for:

```txt
SD
SMP
SMA
SMK
Pesantren
Campus
Training center
Educational foundation
```

### 13.2 Required Pages

```txt
Home
Profile
Vision and Mission
Headmaster Message
News
Announcements
Academic Calendar
Teachers and Staff
Achievements
Gallery
Documents
Contact
Privacy Policy
```

### 13.3 Optional Pages

```txt
Admissions
Extracurricular Activities
Facilities
Alumni
Kelulusan
Student Services
```

### 13.4 Homepage Sections

```txt
Hero with school identity
Welcome message
Latest news
Announcements
Academic calendar preview
Achievements
Gallery preview
Documents/downloads
Contact/location CTA
```

### 13.5 Required Modules

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
audit-log
```

### 13.6 Optional Modules

```txt
academic-calendar
staff-directory
gallery
secure-document-lookup
kelulusan
webhook-notifier
mobile-api
```

### 13.7 School Security Notes

```txt
Do not publish private student data.
Do not publish bulk student identity lists.
Use signed URLs for private student documents.
Use verification for graduation/certificate documents.
Audit private document access.
Use consent/policy for student photos.
```

---

## 14. Company Template Specification

### 14.1 Purpose

The company template is for:

```txt
PT
CV
consultant
agency
service business
technology company
professional firm
local business
```

### 14.2 Required Pages

```txt
Home
About
Services
Portfolio or Case Studies
News/Blog
Contact
Privacy Policy
```

### 14.3 Optional Pages

```txt
Pricing
Team
Careers
Testimonials
FAQ
Resources
```

### 14.4 Homepage Sections

```txt
Hero value proposition
Services overview
Why choose us
Portfolio/case studies
Testimonials
Latest articles
Lead capture CTA
Contact information
```

### 14.5 Required Modules

```txt
core-settings
pages
blog-news
menus
media
seo
forms
documents
```

### 14.6 Optional Modules

```txt
webhook-notifier
crm-integration
portfolio
testimonials
mobile-api
```

### 14.7 Company Security Notes

```txt
Use consent for lead forms.
Audit CRM/webhook delivery.
Do not expose internal proposals/pricing documents unless public.
Protect client case study data.
```

---

## 15. Foundation / Nonprofit Template Specification

### 15.1 Purpose

The foundation template is for:

```txt
yayasan
nonprofit
community organization
mosque organization
social movement
education foundation
charity program
```

### 15.2 Required Pages

```txt
Home
About
Programs
News
Reports
Documents
Volunteer
Contact
Privacy Policy
```

### 15.3 Optional Pages

```txt
Donation Information
Impact Stories
Gallery
Partners
FAQ
```

### 15.4 Homepage Sections

```txt
Mission hero
Program highlights
Impact metrics
Latest news
Reports/documents
Volunteer CTA
Donation CTA optional
Contact CTA
```

### 15.5 Required Modules

```txt
core-settings
pages
blog-news
menus
media
seo
forms
documents
```

### 15.6 Optional Modules

```txt
programs
gallery
volunteer-forms
webhook-notifier
reports
```

### 15.7 Foundation Security Notes

```txt
Protect donor data.
Protect volunteer data.
Publish reports carefully.
Use consent for volunteer forms.
Audit document publication.
```

---

## 16. Government / Public Portal Template Specification

### 16.1 Purpose

The government/public portal template is for:

```txt
government office
public service portal
health office unit
village/subdistrict portal
public information portal
public document portal
```

### 16.2 Required Pages

```txt
Home
Profile
Public Information
Services
Announcements
Regulations
Documents
Forms
Contact
Privacy Policy
```

### 16.3 Optional Pages

```txt
PPID
Complaint Service
Service Standards
Public Satisfaction Survey
Download Center
FAQ
```

### 16.4 Homepage Sections

```txt
Official hero
Public service shortcuts
Announcements
Regulations/documents
Service information
Public forms
Contact/location
```

### 16.5 Required Modules

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
audit-log
users-roles
```

### 16.6 Optional Modules

```txt
complaints
public-information
survey
webhook-notifier
mobile-api
```

### 16.7 Government Security Notes

```txt
Classify public vs internal documents.
Audit document publication.
Protect citizen form submissions.
Avoid exposing internal correspondence.
Use role-based publication responsibility.
```

---

## 17. Landing Page Template Specification

### 17.1 Purpose

The landing page template is for:

```txt
campaigns
service offers
product launch
lead generation
event registration
advertising traffic
```

### 17.2 Required Pages

```txt
Landing page
Thank you page
Privacy Policy
```

### 17.3 Optional Pages

```txt
FAQ
Terms
Contact
```

### 17.4 Landing Sections

```txt
Hero with CTA
Problem statement
Solution overview
Benefits
Features
Social proof
Pricing/offer optional
FAQ
Lead form
Final CTA
```

### 17.5 Required Modules

```txt
pages
forms
media
seo
menus optional
```

### 17.6 Optional Modules

```txt
webhook-notifier
analytics
crm-integration
ab-test later
```

### 17.7 Landing Page Security Notes

```txt
Use form consent.
Prevent spam.
Do not overcollect personal data.
Audit webhook delivery.
Ensure privacy policy is linked near form.
```

---

## 18. Secure Document Publication Template Specification

### 18.1 Purpose

This template is for private or semi-private document access such as:

```txt
graduation letters
certificates
private announcements
student documents
employment documents
membership documents
```

### 18.2 Required Pages

```txt
Secure Lookup
Verification Result
Privacy Policy
Help/Contact
```

### 18.3 Required Modules

```txt
documents
media
audit-log
secure-document-lookup
forms optional
abac-matrix recommended later
```

### 18.4 Secure Lookup Flow

```txt
User enters verification data
  ↓
Rate limit check
  ↓
Validate input
  ↓
Match record securely
  ↓
Create short-lived access session
  ↓
Generate signed URL
  ↓
Audit success/failure
```

### 18.5 Security Notes

```txt
Never expose all records publicly.
Do not reveal whether an identifier exists too clearly on failed attempts.
Use rate limiting.
Use Turnstile after suspicious attempts.
Use signed URLs.
Use short expiration.
Audit every attempt.
```

---

## 19. SEO Presets

### 19.1 Standard SEO Defaults

```txt
site title
site description
canonical base URL
Open Graph default image
locale
robots policy
sitemap policy
```

### 19.2 Template SEO Presets

School:

```txt
Official school website, news, announcements, documents, achievements.
```

Company:

```txt
Professional service/business profile, services, portfolio, contact.
```

Foundation:

```txt
Programs, social impact, reports, volunteer opportunities.
```

Government:

```txt
Public information, services, announcements, regulations, documents.
```

Landing:

```txt
Specific offer, CTA, lead conversion.
```

### 19.3 SEO Rule

```txt
SEO defaults must never expose private content.
Sitemap must include only public published non-deleted content.
```

---

## 20. Accessibility Checklist

Every template must follow a baseline accessibility checklist.

```txt
[ ] semantic HTML landmarks
[ ] one h1 per page
[ ] logical heading order
[ ] keyboard navigation
[ ] visible focus states
[ ] sufficient color contrast
[ ] alt text for meaningful images
[ ] form labels
[ ] accessible error messages
[ ] skip to content link
[ ] responsive text sizing
[ ] no essential information conveyed by color alone
[ ] reduced motion consideration where needed
```

Accessibility rule:

```txt
A beautiful template that is hard to use is not acceptable.
```

---

## 21. Localization Strategy

### 21.1 Default Locale

For Indonesian deployments:

```txt
id-ID
Asia/Jakarta
```

### 21.2 Optional Locales

```txt
en-US
ar-SA optional for Islamic education/foundation content
```

### 21.3 Localization Files

Recommended:

```txt
src/i18n/
  id-ID.json
  en-US.json
```

### 21.4 Localization Rule

```txt
Do not hardcode reusable template text deeply inside business logic.
Keep common UI strings localizable.
```

---

## 22. Privacy Page Template

Every template should include a privacy page.

Minimum sections:

```txt
Data collected
Purpose of processing
How data is used
Who can access data
Third-party integrations
Retention period
User rights
Contact for privacy requests
Security measures
Policy update date
```

For schools, add:

```txt
student data protection
photo/video publication policy
private document access policy
```

For public-sector portals, add:

```txt
public submission data handling
official document publication responsibility
```

---

## 23. Contact Page Template

Contact page should include:

```txt
organization name
address
phone/email
map link optional
contact form
privacy notice
operating hours optional
social links optional
```

Contact form requirements:

```txt
input validation
consent checkbox
spam protection option
success message
error message
submission audit/log
```

---

## 24. Template Testing Strategy

### 24.1 Smoke Tests

Test each template:

```txt
homepage loads
about/profile page loads
news page loads
document page loads
contact page loads
privacy page loads
navigation works
footer links work
SEO tags render
mobile layout does not break
```

### 24.2 Security Tests

Test:

```txt
draft content hidden
private documents hidden
soft-deleted content hidden
form validates input
privacy link appears near form
no seed private data exists
```

### 24.3 Accessibility Tests

Test:

```txt
keyboard navigation
heading structure
alt text
form labels
contrast baseline
focus states
```

### 24.4 Template Compatibility Tests

Test:

```txt
works with EmDash-compatible content structure
works with AWCMS module registry
does not require EmDash core changes
seed data can be applied safely
Cloudflare build path documented
```

---

## 25. Template Rollback Strategy

If template breaks:

```txt
switch to previous template
disable new theme settings
restore previous seed backup
revert template commit
rollback deployment
```

If seed data breaks production:

```txt
restore database backup
apply corrective migration/seed
avoid destructive re-seeding
```

If public frontend leaks private content:

```txt
immediately disable affected route
purge cache
fix filtering
review audit/logs
create incident report
```

---

## 26. GitHub Issues for Part 10

### Issue 1 — Define Template Manifest Standard

```md
## Goal

Create the standard manifest format for AWCMS-Micro website templates.

## Tasks

- [ ] Define required manifest fields
- [ ] Define requiredModules and optionalModules
- [ ] Define layouts and sections
- [ ] Define seedFiles
- [ ] Define securityNotes
- [ ] Define rollback metadata

## Acceptance Criteria

- [ ] template.manifest.json standard exists
- [ ] standard template example validates conceptually

## Rollback Plan

Revert template manifest documentation.
```

### Issue 2 — Add Standard Template Structure

```md
## Goal

Create the folder structure for the standard website template.

## Tasks

- [ ] Add templates/standard
- [ ] Add src/pages
- [ ] Add src/layouts
- [ ] Add src/components
- [ ] Add src/styles
- [ ] Add seed folder
- [ ] Add docs folder
- [ ] Add tests folder

## Acceptance Criteria

- [ ] Standard template structure exists
- [ ] No client-specific data is included

## Rollback Plan

Remove template folder.
```

### Issue 3 — Add Reusable Layouts and Sections Specification

```md
## Goal

Define reusable layouts and sections for AWCMS-Micro templates.

## Tasks

- [ ] Define BaseLayout
- [ ] Define HomeLayout
- [ ] Define PageLayout
- [ ] Define ArticleLayout
- [ ] Define section components
- [ ] Define card components

## Acceptance Criteria

- [ ] Layout list exists
- [ ] Section list exists
- [ ] Components are client-neutral

## Rollback Plan

Revert layout/section docs or code.
```

### Issue 4 — Add Template Seed Data Standard

```md
## Goal

Define safe seed data for templates.

## Tasks

- [ ] Add site-settings seed
- [ ] Add menus seed
- [ ] Add pages seed
- [ ] Add posts seed
- [ ] Add forms seed
- [ ] Add documents seed
- [ ] Add theme-settings seed

## Acceptance Criteria

- [ ] Seed data is safe and non-sensitive
- [ ] No real private data exists
- [ ] Default tenant/site exists

## Rollback Plan

Revert seed files.
```

### Issue 5 — Add Template Variants Specification

```md
## Goal

Document template variants for school, company, foundation, government, landing page, and secure document publication.

## Tasks

- [ ] Define school template
- [ ] Define company template
- [ ] Define foundation template
- [ ] Define government portal template
- [ ] Define landing page template
- [ ] Define secure document publication template

## Acceptance Criteria

- [ ] Each variant has pages, sections, modules, and security notes

## Rollback Plan

Revert variant documentation.
```

### Issue 6 — Add Template Testing Checklist

```md
## Goal

Define smoke, security, accessibility, and compatibility tests for templates.

## Tasks

- [ ] Add smoke test checklist
- [ ] Add security test checklist
- [ ] Add accessibility checklist
- [ ] Add compatibility checklist

## Acceptance Criteria

- [ ] Template tests are documented
- [ ] Private content leak tests are included

## Rollback Plan

Revert testing documentation.
```

---

## 27. OpenCode / Antigravity Implementation Prompt for Part 10

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, frontend architecture, template system, SEO, accessibility, security, and Cloudflare-ready website implementation agent.

TASK:
Implement Part 10 of the AWCMS-Micro documentation: Standard Website Template Specification.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Existing project docs Parts 1–9

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/upstream-sync.md, docs/modules.md, docs/frontend.md, docs/theme-system.md, docs/security.md, docs/testing.md, and docs/deployment.md.
3. Treat EmDash upstream as the architectural authority.
4. Treat the SMAN 2 repository as reference only.
5. Do not modify EmDash core.
6. Do not commit secrets, local databases, uploaded files, or private seed data.
7. Use GitHub Issues for non-trivial work.
8. Create a dedicated branch before implementation.
9. Make atomic changes.
10. Run validation before completion.
11. Preserve EmDash template/plugin compatibility.

GOAL:
Create the AWCMS-Micro standard website template specification and initial template structure.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Inspect current template/theme/frontend structure.
- Inspect EmDash template conventions.
- Inspect SMAN 2 reference repo for safe reusable patterns only.
- Summarize compatibility risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Define Template Manifest Standard
2. Add Standard Template Structure
3. Add Reusable Layouts and Sections Specification
4. Add Template Seed Data Standard
5. Add Template Variants Specification
6. Add Template Testing Checklist

PHASE 2 — BRANCH
Create branch:
docs/add-standard-template-specification

PHASE 3 — DOCUMENTATION
Create or update:
- docs/template-system.md
- docs/standard-template.md
- docs/theme-system.md
- docs/frontend.md
- docs/seo.md
- docs/accessibility.md
- docs/testing.md

PHASE 4 — TEMPLATE STRUCTURE
Create if appropriate:
- templates/standard/README.md
- templates/standard/template.manifest.json
- templates/standard/src/pages
- templates/standard/src/layouts
- templates/standard/src/components
- templates/standard/src/styles
- templates/standard/seed
- templates/standard/docs
- templates/standard/tests

PHASE 5 — MANIFEST
Add template.manifest.json with:
- id
- name
- version
- category
- requiredModules
- optionalModules
- layouts
- sections
- seedFiles
- securityNotes
- accessibilityLevel
- deploymentTargets
- rollback

PHASE 6 — SEED DATA
Add safe starter seed files:
- site-settings.json
- menus.json
- pages.json
- posts.json
- announcements.json
- documents.json
- forms.json
- theme-settings.json

Ensure no real private/client data is included.

PHASE 7 — VARIANTS
Document variants:
- standard
- school
- company
- foundation
- government portal
- landing page
- secure document publication

PHASE 8 — TESTING
Add template testing checklist for:
- smoke tests
- security tests
- accessibility tests
- compatibility tests

PHASE 9 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 10 — COMMIT
Commit:
docs: add standard website template specification

PHASE 11 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. template compatibility impact
5. security impact
6. validation results
7. risks
8. rollback plan
9. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash core
- deleting existing template/theme files
- committing private seed data
- committing uploads/databases/secrets
- changing production Cloudflare resources
- force pushing
```

---

## 28. Definition of Done for Part 10

Part 10 is complete when:

```txt
[ ] template philosophy is documented
[ ] template categories are defined
[ ] compatibility requirements are defined
[ ] standard template structure is defined
[ ] template manifest standard exists
[ ] base layout specification exists
[ ] reusable components are listed
[ ] design tokens are defined
[ ] starter content model is defined
[ ] seed data specification exists
[ ] standard template variant is defined
[ ] school template is defined
[ ] company template is defined
[ ] foundation template is defined
[ ] government portal template is defined
[ ] landing page template is defined
[ ] secure document publication template is defined
[ ] SEO presets are defined
[ ] accessibility checklist exists
[ ] localization strategy exists
[ ] privacy/contact page templates are defined
[ ] testing strategy exists
[ ] rollback strategy exists
[ ] GitHub Issues are prepared
[ ] OpenCode/Antigravity prompt exists
```

---

## 29. Recommended Next Part

Continue with:

```txt
Part 11 — School Website Template and Kelulusan Module Implementation
```

Part 11 should include:

- school website detailed template;
- school homepage content structure;
- teacher/staff directory;
- academic calendar;
- announcements;
- documents/downloads;
- gallery;
- secure Kelulusan module;
- NISN verification;
- PDF storage in R2;
- signed URL flow;
- privacy and student data protection;
- test plan;
- OpenCode implementation prompt.
