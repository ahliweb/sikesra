# AWCMS-Micro Implementation Documentation

## Part 13 — AWCMS-Micro ERP-Ready Module Expansion Strategy

**Document status:** Draft v0.1  
**Purpose:** Define how AWCMS-Micro can become ERP-ready in the future without turning EmDash into Odoo, without overloading the website MVP, and without breaking EmDash compatibility, AWCMS governance, tenant-readiness, security, and plugin/module discipline.

---

## 1. Objective of Part 13

Part 13 defines the long-term ERP-ready expansion strategy for AWCMS-Micro.

This document covers:

1. ERP-ready strategy;
2. what AWCMS-Micro should and should not become;
3. EmDash compatibility boundary;
4. Odoo-inspired module thinking;
5. future module categories;
6. CRM, inventory, procurement, finance, HR, and project modules;
7. data model isolation;
8. tenant and permission implications;
9. workflow and approval strategy;
10. reporting and dashboard strategy;
11. integration with Odoo where needed;
12. integration with CRM, payment, WhatsApp, and email tools;
13. post-MVP roadmap;
14. testing and rollback;
15. GitHub Issues;
16. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
AWCMS-Micro should be ERP-ready, not ERP-heavy in MVP.
```

---

## 2. Core Strategic Principle

AWCMS-Micro starts as a website system.

It may grow toward business and organization applications, but it must not overload the MVP with ERP complexity.

Correct direction:

```txt
Website-first CMS
  ↓
Module-ready website operating system
  ↓
Public-service modules
  ↓
Lightweight business modules
  ↓
ERP integration or ERP-ready expansion
  ↓
AWCMS multi-application ecosystem
```

Wrong direction:

```txt
Website MVP
  ↓
Immediately becomes full ERP clone
  ↓
Complex, fragile, hard to update, incompatible with EmDash
```

---

## 3. What ERP-Ready Means

ERP-ready does not mean AWCMS-Micro must implement a full ERP immediately.

ERP-ready means AWCMS-Micro has:

- clean module boundaries;
- tenant-ready data model;
- permission and ABAC readiness;
- audit logging;
- secure workflow patterns;
- API integration layer;
- stable reporting foundation;
- reversible deployment;
- documentation discipline;
- future integration points with Odoo or other ERP systems.

### 3.1 ERP-Ready Formula

```txt
ERP-ready AWCMS-Micro
= module discipline
+ tenant-ready schema
+ ABAC/RBAC
+ audit log
+ approval workflow baseline
+ reporting/export baseline
+ integration adapters
+ rollback discipline
```

---

## 4. What AWCMS-Micro Should Not Become

AWCMS-Micro should not become:

```txt
an Odoo clone inside EmDash core
a full accounting system in MVP
a full inventory system in MVP
a procurement system in MVP
a HRIS system in MVP
a payroll system in MVP
a billing marketplace in MVP
a fragile fork of EmDash
a monolithic custom admin system
```

These may become future modules or integrations, not MVP core.

---

## 5. EmDash Compatibility Boundary

EmDash remains the architectural authority for CMS/admin/plugin structure.

AWCMS-Micro ERP-ready modules must not:

- modify EmDash core unnecessarily;
- hijack EmDash admin internals;
- break plugin marketplace compatibility;
- change core content behavior silently;
- force ERP tables into EmDash content tables;
- expose ERP data through public content APIs accidentally.

Preferred approach:

EmDash content collections use `ec_` prefixed tables. AWCMS-Micro ERP-ready modules must use `awcms_` prefixed tables to ensure zero collisions with EmDash system tables (`_emdash_`) or content tables.

```txt
ERP-like features live in AWCMS modules/plugins (awcms_ tables).
Core EmDash remains content/admin/plugin foundation (ec_ / _emdash_ tables).
```

---

## 6. Odoo-Inspired Thinking Without Odoo Scope Creep

AWCMS-Micro may learn from Odoo in these areas:

- modular installation;
- app/module registry;
- permission separation;
- menu/action organization;
- business object lifecycle;
- approval workflows;
- audit trails;
- reporting dashboards;
- integration between modules.

AWCMS-Micro should not copy Odoo’s full ERP scope into MVP.

### 6.1 Useful Odoo Lessons

| Odoo Concept      | AWCMS-Micro Adaptation           |
| ----------------- | -------------------------------- |
| Apps/modules      | AWCMS module registry            |
| Menu/action model | Manifest-driven admin pages      |
| Access rights     | AWCMS permission registry + ABAC |
| Record rules      | Future ABAC/RLS policies         |
| Workflows         | Lightweight approval module      |
| Chatter/logs      | Audit log and activity log       |
| Reports           | Dashboard/report module          |
| Integrations      | Adapter modules                  |

---

## 7. ERP-Ready Module Categories

Future module categories:

```txt
core-website
public-service
crm
sales
finance
inventory
procurement
project-management
hr
asset-management
reporting
integration
workflow
communication
```

### 7.1 Module Category Examples

| Category           | Future Modules                                         |
| ------------------ | ------------------------------------------------------ |
| core-website       | Pages, News, Menus, SEO, Media                         |
| public-service     | Kelulusan, Secure Documents, Public Forms              |
| crm                | Leads, Contacts, Opportunities                         |
| sales              | Quotations, Orders, Invoices integration               |
| finance            | Simple billing integration, payment logs               |
| inventory          | Items, stock movements, warehouse integration          |
| procurement        | Purchase requests, vendor records                      |
| project-management | Tasks, milestones, client portals                      |
| hr                 | Staff directory, leave request, attendance integration |
| asset-management   | Assets, maintenance logs                               |
| reporting          | Dashboard, exports, KPIs                               |
| integration        | Odoo, Kommo, Duitku, Xendit, WhatsApp, Email           |
| workflow           | Approval rules, status transitions                     |
| communication      | Notifications, email, WhatsApp, webhook                |

---

## 8. Post-MVP Expansion Levels

### Level 0 — Website MVP

Includes:

```txt
pages
news
announcements
menus
media
SEO
forms
documents
audit baseline
module registry baseline
Cloudflare baseline
```

### Level 1 — Public-Service Website OS

Includes:

```txt
secure document lookup
Kelulusan
staff directory
academic calendar
gallery
public service forms
role-aware admin
```

### Level 2 — Lightweight CRM and Communication

Includes:

```txt
lead capture
contact records
form-to-CRM webhook
WhatsApp notification
email notification
simple follow-up status
```

### Level 3 — Client/Member Portal

Includes:

```txt
authenticated users
private documents
own submissions
notifications
mobile app support
```

### Level 4 — Workflow and Approval

Includes:

```txt
draft/review/publish
approval routes
document approval
form submission review
module-specific approval states
```

### Level 5 — ERP Integration Layer

Includes:

```txt
Odoo integration
Kommo integration
payment gateway integration
inventory/procurement sync
accounting handoff
```

### Level 6 — Native Lightweight ERP Modules

Includes only when truly needed:

```txt
simple inventory
simple procurement
simple project/task tracking
simple billing request
asset management
```

### Level 7 — AWCMS Multi-Tenant Platform

Includes:

```txt
tenant domains
tenant limits
tenant billing integration
tenant storage quotas
tenant module plans
tenant backups
```

---

## 9. ERP-Ready Architecture Pattern

```txt
AWCMS-Micro Core
  ↓
Module Registry
  ↓
Permission Registry + ABAC
  ↓
Audit Log
  ↓
Workflow Engine optional
  ↓
Business Modules
  ↓
Integration Adapters
  ↓
External ERP/CRM/Payment/Communication Systems
```

### 9.1 Module Layering

```txt
Presentation layer
  - admin pages
  - public pages
  - mobile screens

API layer
  - module API routes
  - mobile API endpoints
  - webhook endpoints

Service layer
  - business logic
  - permission checks
  - validation
  - audit events

Data layer
  - module-specific tables
  - tenant/site columns
  - soft delete
  - migrations

Integration layer
  - Odoo adapter
  - Kommo adapter
  - payment adapter
  - WhatsApp/email adapter
```

---

## 10. Data Model Isolation

### 10.1 Data Isolation Rule

```txt
Future ERP modules must use separate AWCMS module tables.
Do not force ERP records into EmDash content collections unless they are truly content.
```

Examples:

| Data                     | Recommended Storage                             |
| ------------------------ | ----------------------------------------------- |
| News article             | EmDash content collection                       |
| Public page              | EmDash content collection                       |
| Public document          | Documents module + media metadata               |
| Lead                     | CRM module table                                |
| Quotation                | Sales module table or Odoo integration          |
| Invoice                  | Odoo/accounting integration, not MVP AWCMS core |
| Stock movement           | Inventory module table or Odoo integration      |
| Purchase request         | Procurement module table                        |
| Staff profile public bio | Content/staff module                            |
| Payroll                  | External HR/payroll system, not AWCMS-Micro MVP |

### 10.2 Standard ERP Module Columns

Every future business module table should include:

```txt
tenant_id
site_id optional
created_at
updated_at
deleted_at
created_by
updated_by
status
metadata_json optional
```

For approval/workflow records:

```txt
submitted_at
submitted_by
approved_at
approved_by
rejected_at
rejected_by
approval_status
```

---

## 11. Tenant and Permission Implications

ERP-ready modules increase risk.

They require stronger controls:

- tenant isolation;
- site/module scope;
- ABAC policy;
- audit logs;
- approval workflow;
- role separation;
- data retention;
- integration secrets management.

### 11.1 Permission Namespaces

Use clear namespaces:

```txt
crm:lead:read
crm:lead:create
crm:lead:update
crm:lead:delete
crm:lead:export

sales:quotation:read
sales:quotation:create
sales:quotation:approve
sales:quotation:send

inventory:item:read
inventory:item:create
inventory:stock_movement:create
inventory:stock_movement:approve

procurement:request:read
procurement:request:create
procurement:request:approve

finance:payment_log:read
finance:payment_log:reconcile

hr:staff:read
hr:leave_request:create
hr:leave_request:approve
```

### 11.2 High-Risk ERP Permissions

High-risk:

```txt
export leads
approve quotation
sync invoice to accounting
approve purchase request
adjust inventory stock
view financial records
view HR private records
configure integration tokens
```

Controls:

```txt
explicit permission
ABAC rule
audit event
confirmation UI
approval workflow if needed
```

---

## 12. Workflow and Approval Strategy

### 12.1 Workflow Need

ERP-like modules usually need approval.

Examples:

```txt
publish document
approve quotation
approve purchase request
approve stock adjustment
approve leave request
approve public announcement
```

### 12.2 Minimal Workflow Model

Start with simple status transitions:

```txt
draft
submitted
review
approved
rejected
published
archived
cancelled
```

### 12.3 Workflow Rules Table

Future table:

```txt
workflow_definitions
workflow_steps
workflow_transitions
workflow_actions
```

MVP should only document workflow strategy. Do not build full workflow engine yet unless needed.

### 12.4 Simple Approval Record

```sql
create table awcms_approval_requests (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  module_id text not null,
  resource_type text not null,
  resource_id text not null,
  status text not null default 'pending',
  submitted_by text not null,
  submitted_at text not null,
  decided_by text null,
  decided_at text null,
  decision_note text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  deleted_at text null
);
```

---

## 13. CRM-Ready Module Strategy

### 13.1 Purpose

CRM-ready modules help convert public website interactions into managed leads.

Sources:

```txt
contact forms
landing page forms
event registration
school admission inquiry
service inquiry
WhatsApp click tracking
```

### 13.2 CRM MVP Scope

Not full CRM. Start with:

```txt
lead capture
lead status
lead source
basic contact info
notes
assignment optional
webhook to Kommo/Odoo optional
```

### 13.3 CRM Tables

Future conceptual tables:

```txt
crm_leads
crm_contacts
crm_activities
crm_webhook_deliveries
```

### 13.4 Lead Fields

```txt
name
email
phone
organization
message
source
status
assigned_to
consent
metadata_json
```

### 13.5 CRM Permissions

```txt
crm:lead:read
crm:lead:create
crm:lead:update
crm:lead:delete
crm:lead:export
crm:lead:assign
```

### 13.6 Integration Strategy

Prefer adapter modules:

```txt
@awcms-micro/plugin-kommo-integration
@awcms-micro/plugin-odoo-integration
@awcms-micro/plugin-webhook-notifier
```

---

## 14. Sales and Payment-Ready Strategy

### 14.1 Sales Scope

AWCMS-Micro may support simple sales lead and quotation request workflows, but should not become full accounting in MVP.

Allowed early features:

```txt
quotation request form
service inquiry
package/product landing page
payment link redirect
payment webhook log
```

Avoid early:

```txt
full invoicing
accounting journal
tax calculation
payroll
financial statement generation
```

### 14.2 Payment Gateway Integration

Payment-related integration should be isolated.

Possible adapters:

```txt
Duitku adapter
Xendit adapter
QRIS adapter
Odoo invoice sync
```

### 14.3 Payment Log Table

```sql
create table awcms_payment_events (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  provider text not null,
  external_reference text not null,
  event_type text not null,
  status text not null,
  amount integer null,
  currency text null,
  payload_json text null,
  created_at text not null default (datetime('now'))
);
```

### 14.4 Security Rule

```txt
Never trust payment callback data without signature verification.
```

---

## 15. Inventory-Ready Strategy

### 15.1 Scope

Inventory should be future module only.

Possible use cases:

```txt
school asset inventory
office equipment
publication stock
donation item tracking
simple product catalog
```

### 15.2 Early Safe Scope

Start with:

```txt
item catalog
asset list
stock summary
manual stock movement request
```

Avoid early:

```txt
complex warehouse logic
costing
full accounting integration
multi-warehouse optimization
```

### 15.3 Future Tables

```txt
inventory_items
inventory_locations
inventory_stock_balances
inventory_stock_movements
inventory_adjustment_requests
```

### 15.4 Permissions

```txt
inventory:item:read
inventory:item:create
inventory:item:update
inventory:stock_movement:read
inventory:stock_movement:create
inventory:stock_movement:approve
inventory:stock_adjustment:approve
```

---

## 16. Procurement-Ready Strategy

### 16.1 Scope

Procurement can support internal request workflows later.

Possible use cases:

```txt
school procurement request
office purchase request
government supporting document workflow
vendor document collection
```

### 16.2 MVP Avoidance

Do not include procurement in website MVP.

Start after:

- audit log is stable;
- permissions are stable;
- workflow pattern is stable;
- document module is stable.

### 16.3 Future Tables

```txt
procurement_requests
procurement_request_items
procurement_vendors
procurement_documents
procurement_approvals
```

### 16.4 Permissions

```txt
procurement:request:read
procurement:request:create
procurement:request:update
procurement:request:submit
procurement:request:approve
procurement:vendor:manage
```

---

## 17. HR-Ready Strategy

### 17.1 Scope

HR features should be separated into public and private parts.

Public:

```txt
staff directory
teacher profile
organizational structure
```

Private future:

```txt
leave request
attendance integration
staff documents
performance notes
```

### 17.2 MVP Scope

Allowed in school/company template:

```txt
staff public directory only
```

Avoid:

```txt
payroll
private employee records
performance appraisal
attendance system
```

unless a dedicated module is designed with privacy and security controls.

### 17.3 Permissions

```txt
hr:staff_public:read
hr:staff_public:update
hr:leave_request:create
hr:leave_request:approve
hr:staff_private:read
```

---

## 18. Project Management Module Strategy

### 18.1 Scope

A lightweight project module may be useful for agencies, schools, and internal teams.

Possible features:

```txt
project list
task list
milestones
attachments
status reports
client portal later
```

### 18.2 Early Scope

```txt
simple project/task tracking
public/private project documents
activity log
```

Avoid early:

```txt
complex resource planning
billing automation
advanced Gantt dependency engine
```

### 18.3 Permissions

```txt
project:task:read
project:task:create
project:task:update
project:task:assign
project:task:close
project:report:read
project:report:create
```

---

## 19. Reporting and Dashboard Strategy

### 19.1 Reporting Purpose

Reporting helps admins understand operations.

MVP reporting:

```txt
content count
form submissions count
document downloads count
media storage usage
recent audit events
```

Future ERP reporting:

```txt
leads by source
conversion status
payment event status
inventory stock summary
procurement request status
project task progress
```

### 19.2 Reporting Rule

```txt
Reports must respect permissions, tenant/site scope, and privacy rules.
```

### 19.3 Dashboard Widgets

Dashboard widget format:

```json
{
	"id": "lead-count",
	"label": "Leads",
	"moduleId": "crm",
	"permission": "crm:lead:read",
	"component": "LeadCountWidget"
}
```

---

## 20. Integration Strategy with Odoo

### 20.1 When to Integrate with Odoo

Integrate with Odoo when the business needs:

```txt
accounting
invoicing
inventory
procurement
HR
CRM pipeline
sales order
purchase order
ERP reporting
```

### 20.2 AWCMS-Micro Role with Odoo

AWCMS-Micro should act as:

```txt
website frontend
lead capture gateway
public portal
client/member portal
content/document layer
integration gateway
```

Odoo should handle:

```txt
accounting
complex CRM/sales
inventory
procurement
HR/payroll
ERP master data
```

### 20.3 Odoo Adapter Module

Recommended module:

```txt
@awcms-micro/plugin-odoo-integration
```

Responsibilities:

```txt
store integration settings securely
map AWCMS forms to Odoo leads
sync selected records
receive webhook callbacks if needed
log sync status
retry failed syncs
protect credentials
```

### 20.4 Odoo Integration Table

```sql
create table awcms_integration_odoo_sync_logs (
  id text primary key,
  tenant_id text not null,
  site_id text null,
  module_id text not null,
  local_resource_type text not null,
  local_resource_id text not null,
  odoo_model text not null,
  odoo_record_id text null,
  status text not null,
  error_message text null,
  payload_hash text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
```

### 20.5 Odoo Security Rule

```txt
Never expose Odoo API credentials to the frontend or mobile app.
All Odoo calls must happen server-side through integration adapter.
```

---

## 21. Integration with Kommo, WhatsApp, Email, and Payment

### 21.1 Kommo CRM

Use for:

```txt
lead pipeline
sales follow-up
contact management
```

AWCMS role:

```txt
capture lead
validate consent
send to Kommo via secure backend adapter
log delivery
retry failures
```

### 21.2 WhatsApp Integration

Use for:

```txt
admin notification
lead follow-up
form confirmation
public service notification
```

Controls:

```txt
consent
rate limits
template approval where applicable
no sensitive data in message unless policy allows
```

### 21.3 Email Integration

Use for:

```txt
form notification
account emails
document notifications
reports
```

Controls:

```txt
SPF/DKIM/DMARC
unsubscribe where applicable
no secrets in email
privacy-aware content
```

### 21.4 Payment Integration

Use for:

```txt
payment link
registration payment
donation confirmation
invoice handoff
```

Controls:

```txt
callback signature validation
idempotency
payment event logging
no client-side secret
no accounting logic in MVP core
```

---

## 22. ERP-Ready Admin UX

### 22.1 Admin Menu Strategy

Future ERP modules should appear only when installed.

Admin groups:

```txt
Dashboard
Content
Documents
Forms
CRM
Sales
Inventory
Procurement
Projects
HR
Finance
Integrations
Reports
Settings
Audit
```

### 22.2 Role-Aware Visibility

```txt
Users see only modules and actions they are allowed to access.
Direct route/API access still requires permission checks.
```

### 22.3 Record List Standard

Every future ERP module list should support:

```txt
search
filter
status chips
pagination
export if permitted
audit/history link
soft delete/trash where appropriate
```

### 22.4 Record Form Standard

Every business form should support:

```txt
validation
save draft
submit for approval optional
attachment support optional
audit event
clear error messages
```

---

## 23. ERP-Ready API Strategy

### 23.1 API Namespace

Use module versioned APIs:

```txt
/_emdash/api/plugins/crm/v1/leads
/_emdash/api/plugins/procurement/v1/requests
/_emdash/api/plugins/inventory/v1/items
```

Public/mobile aliases should be carefully limited:

```txt
/api/mobile/v1/leads/submit
/api/portal/v1/me/requests
```

### 23.2 API Contract Rule

Use stable response shape:

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

### 23.3 Mutation Rule

```txt
No GET mutations.
Validate input.
Check permission.
Evaluate ABAC.
Write audit event.
Use idempotency where needed.
```

---

## 24. ERP-Ready Security and Compliance

### 24.1 Increased Risk

ERP modules may involve:

```txt
financial records
vendor records
employee records
customer records
inventory values
approval decisions
payment events
```

These require stronger governance than public website content.

### 24.2 Minimum Controls

```txt
ABAC policies
audit logs
approval workflow
data classification
data retention
export controls
integration secret management
backup/restore
incident response
```

### 24.3 Indonesian Context

Consider:

```txt
personal data protection
business document retention
tax/accounting implications
public-sector procurement rules if used by government
employment privacy if HR data is included
payment and electronic transaction governance
```

---

## 25. ISO Alignment for ERP-Ready Expansion

### 25.1 ISO/IEC 27001 and 27002

Relevant for:

- access control;
- privileged access;
- information classification;
- supplier relationships;
- logging;
- secure development;
- incident management.

### 25.2 ISO/IEC 27005

Use risk assessment before adding:

- finance module;
- HR module;
- procurement module;
- Odoo integration;
- payment integration;
- marketplace plugin with broad access.

### 25.3 ISO/IEC 27701

Relevant for:

- leads;
- contacts;
- employee data;
- citizen/user submissions;
- mobile user data.

### 25.4 ISO/IEC 27034

Relevant for:

- secure module development;
- API tests;
- integration security;
- validation and authorization.

### 25.5 ISO/IEC 20000-1 and ISO 22301

Relevant for:

- service management;
- release/change control;
- backup and continuity;
- incident recovery.

---

## 26. ERP-Ready Roadmap After Website MVP

### Phase A — Stabilize Website MVP

```txt
complete pages/news/media/forms/documents
complete Cloudflare deployment
complete security and test baseline
```

### Phase B — Add Public-Service Modules

```txt
Kelulusan
secure document lookup
academic calendar
staff directory
gallery
```

### Phase C — Add Lead and Communication Modules

```txt
CRM lead capture
webhook notifier
email notifier
WhatsApp notifier
Kommo integration
```

### Phase D — Add Portal and Mobile Features

```txt
authenticated member/client portal
mobile API
own documents
notifications
```

### Phase E — Add Workflow and Approval

```txt
approval requests
status transitions
review/publish flows
submission review
```

### Phase F — Add ERP Integrations

```txt
Odoo integration
payment gateway event logging
inventory/procurement sync
finance handoff
```

### Phase G — Add Native Lightweight ERP Modules If Needed

```txt
simple inventory
simple procurement
simple project tasks
asset tracking
```

---

## 27. Five Practical Expansion Examples

### Example 1 — School Website to School Portal

Start:

```txt
school website + Kelulusan
```

Expand:

```txt
student document portal
teacher/staff directory
academic calendar
parent communication form
```

Avoid early:

```txt
full student information system
payroll
complex academic ERP
```

### Example 2 — Company Website to CRM Gateway

Start:

```txt
company profile + contact forms
```

Expand:

```txt
lead capture
Kommo integration
WhatsApp follow-up
quotation request
```

Avoid early:

```txt
full accounting
sales order engine
inventory costing
```

### Example 3 — Foundation Website to Program Management

Start:

```txt
foundation profile + programs + volunteer form
```

Expand:

```txt
volunteer database
program reports
document archive
donation inquiry integration
```

Avoid early:

```txt
complex donor accounting
payroll
full grant management
```

### Example 4 — Government Portal to Public Service Gateway

Start:

```txt
public information portal + forms + documents
```

Expand:

```txt
complaint submission
service request tracking
public document classification
reporting dashboard
```

Avoid early:

```txt
full procurement system without legal and process design
sensitive citizen data without strong governance
```

### Example 5 — Landing Page Factory to Sales Ecosystem

Start:

```txt
landing pages + forms
```

Expand:

```txt
lead routing
CRM sync
WhatsApp notification
campaign analytics
A/B testing later
```

Avoid early:

```txt
complex billing marketplace
multi-tenant billing before tenant model is stable
```

---

## 28. Testing Strategy for ERP-Ready Modules

### 28.1 Required Tests

Every future ERP-ready module should include:

```txt
unit tests
API tests
permission tests
ABAC tests
audit tests
migration tests
integration tests if external system used
rollback tests or rollback checklist
```

### 28.2 ERP Module Test Cases

Test:

```txt
unauthorized user cannot access record
tenant mismatch denied
soft-deleted record hidden
approval transition requires permission
export requires high-risk permission
integration secret not exposed
webhook signature verified
sync failure logged
```

### 28.3 Playwright Flows

Examples:

```txt
admin creates lead
admin assigns lead
operator submits procurement request
approver approves request
auditor views audit log
unauthorized user denied direct URL
```

---

## 29. Rollback Strategy for ERP-Ready Modules

### 29.1 General Rollback

```txt
disable module
hide admin menu
block API routes
preserve data
revert code
restore backup if needed
write audit event
```

### 29.2 Integration Rollback

If integration fails:

```txt
disable sync job
pause webhook delivery
keep failed sync logs
retry after fix
rotate credentials if exposed
```

### 29.3 Data Migration Rollback

If migration fails:

```txt
restore backup
or apply corrective migration
or disable module
or revert deployment
```

### 29.4 Financial/Legal Data Rule

```txt
Do not hard-delete financial, procurement, HR, or audit records casually.
Use void/cancel/reversal patterns where appropriate.
```

---

## 30. GitHub Issues for Part 13

### Issue 1 — Define ERP-Ready Expansion Boundary

```md
## Goal

Document what ERP-ready means for AWCMS-Micro and what must stay out of MVP.

## Tasks

- [ ] Define ERP-ready concept
- [ ] Define non-goals
- [ ] Define EmDash compatibility boundary
- [ ] Define Odoo-inspired but not Odoo-clone strategy

## Acceptance Criteria

- [ ] ERP-ready boundary is documented
- [ ] MVP scope creep is explicitly prevented

## Rollback Plan

Revert documentation changes.
```

### Issue 2 — Define Future Module Categories

```md
## Goal

Create future ERP-ready module taxonomy.

## Tasks

- [ ] Define CRM category
- [ ] Define sales/payment category
- [ ] Define inventory category
- [ ] Define procurement category
- [ ] Define HR category
- [ ] Define project/reporting/integration categories

## Acceptance Criteria

- [ ] Module taxonomy exists
- [ ] Each category has examples and non-goals

## Rollback Plan

Revert module taxonomy docs.
```

### Issue 3 — Add ERP-Ready Data and Permission Standards

```md
## Goal

Define data model and permission standards for future ERP-ready modules.

## Tasks

- [ ] Define module table columns
- [ ] Define approval fields
- [ ] Define permission namespace examples
- [ ] Define high-risk permissions
- [ ] Define ABAC/audit requirements

## Acceptance Criteria

- [ ] Future modules have clear table standards
- [ ] Permission naming is consistent
- [ ] High-risk controls are documented

## Rollback Plan

Revert standards documentation.
```

### Issue 4 — Define Odoo Integration Strategy

```md
## Goal

Define how AWCMS-Micro should integrate with Odoo without becoming Odoo.

## Tasks

- [ ] Define when to use Odoo
- [ ] Define AWCMS-Micro role
- [ ] Define Odoo adapter module
- [ ] Define sync log table
- [ ] Define security rules

## Acceptance Criteria

- [ ] Odoo integration boundary is documented
- [ ] Odoo credentials are server-side only
- [ ] Sync logs are defined

## Rollback Plan

Disable Odoo integration module.
```

### Issue 5 — Define Workflow and Approval Baseline

```md
## Goal

Define minimal workflow and approval strategy for future modules.

## Tasks

- [ ] Define status transitions
- [ ] Define approval request model
- [ ] Define audit events
- [ ] Define permission requirements
- [ ] Define out-of-scope workflow engine details

## Acceptance Criteria

- [ ] Simple workflow strategy exists
- [ ] Full workflow engine is kept out of MVP

## Rollback Plan

Disable workflow module or revert docs.
```

### Issue 6 — Add ERP-Ready Testing and Rollback Strategy

```md
## Goal

Define tests and rollback strategy for future ERP-ready modules.

## Tasks

- [ ] Define unit/API/permission tests
- [ ] Define integration tests
- [ ] Define migration tests
- [ ] Define module disable rollback
- [ ] Define integration rollback

## Acceptance Criteria

- [ ] Future ERP modules have test requirements
- [ ] Rollback strategy is clear

## Rollback Plan

Revert docs changes.
```

---

## 31. OpenCode / Antigravity Implementation Prompt for Part 13

```txt
You are an expert AI-native software architect, TypeScript/Astro developer, EmDash-compatible CMS engineer, AWCMS-Micro product strategist, ERP architect, Odoo integration strategist, security engineer, database designer, and GitHub project manager.

TASK:
Implement Part 13 of the AWCMS-Micro documentation: ERP-Ready Module Expansion Strategy.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Odoo as modular product-thinking reference only, not MVP scope
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Existing project docs Parts 1–12

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/modules.md, docs/abac.md, docs/security.md, docs/storage.md, docs/deployment.md, docs/mvp-sprint-plan.md, and docs/mobile-api.md.
3. Treat EmDash upstream as the architectural authority.
4. Do not turn AWCMS-Micro MVP into a full ERP.
5. Do not modify EmDash core.
6. Treat Odoo as a product architecture reference or integration target, not something to clone inside EmDash.
7. Use GitHub Issues for non-trivial work.
8. Create a dedicated branch before implementation.
9. Make atomic changes.
10. Run validation before completion.
11. Do not commit secrets, local DB files, uploaded files, or production config.

GOAL:
Document and structure the ERP-ready expansion strategy for AWCMS-Micro without creating MVP scope creep or EmDash incompatibility.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Read existing docs Parts 1–12.
- Inspect current module registry and plugin docs.
- Identify where ERP-ready guidance should live.
- Summarize scope creep risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Define ERP-Ready Expansion Boundary
2. Define Future Module Categories
3. Add ERP-Ready Data and Permission Standards
4. Define Odoo Integration Strategy
5. Define Workflow and Approval Baseline
6. Add ERP-Ready Testing and Rollback Strategy

PHASE 2 — BRANCH
Create branch:
docs/add-erp-ready-expansion-strategy

PHASE 3 — DOCUMENTATION
Create or update:
- docs/erp-ready-strategy.md
- docs/modules.md
- docs/integrations.md
- docs/odoo-integration.md
- docs/workflow-approval.md
- docs/permissions.md
- docs/testing.md
- docs/rollback.md
- docs/risk-register.md

PHASE 4 — ERP BOUNDARY
Document:
- what ERP-ready means
- what is out of MVP
- EmDash compatibility boundary
- Odoo-inspired but not Odoo-clone rule

PHASE 5 — MODULE TAXONOMY
Document future module categories:
- CRM
- sales/payment
- inventory
- procurement
- HR
- project management
- reporting
- integration
- workflow

PHASE 6 — DATA AND PERMISSION STANDARDS
Document:
- standard module columns
- approval fields
- permission namespaces
- high-risk permissions
- ABAC and audit requirements

PHASE 7 — INTEGRATION STRATEGY
Document:
- Odoo adapter strategy
- Kommo adapter strategy
- WhatsApp/email/payment integration strategy
- sync logs
- credential security
- webhook verification

PHASE 8 — ROADMAP
Document post-MVP roadmap:
- website MVP
- public-service modules
- CRM/communication
- client/member portal
- workflow/approval
- ERP integration
- native lightweight ERP modules if needed

PHASE 9 — TESTING AND ROLLBACK
Document:
- ERP module test requirements
- permission tests
- integration tests
- migration tests
- module disable rollback
- integration rollback
- financial/legal data no-hard-delete rule

PHASE 10 — VALIDATION
Run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

If scripts are missing, document what is pending.

PHASE 11 — COMMIT
Commit:
docs: add ERP-ready module expansion strategy

PHASE 12 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. ERP scope impact
5. EmDash compatibility impact
6. security/privacy impact
7. validation results
8. risks
9. rollback plan
10. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash core
- implementing full ERP modules in MVP
- adding accounting/payroll/procurement production logic
- committing secrets or production credentials
- changing production Odoo/CRM/payment integrations
- running destructive migrations
- force pushing
```

---

## 32. Definition of Done for Part 13

Part 13 is complete when:

```txt
[ ] ERP-ready concept is defined
[ ] non-goals are defined
[ ] EmDash compatibility boundary is defined
[ ] Odoo-inspired strategy is documented
[ ] future module categories are defined
[ ] post-MVP expansion levels are defined
[ ] data model isolation rules are defined
[ ] tenant and permission implications are defined
[ ] workflow and approval strategy is defined
[ ] CRM-ready strategy is defined
[ ] sales/payment-ready strategy is defined
[ ] inventory-ready strategy is defined
[ ] procurement-ready strategy is defined
[ ] HR-ready strategy is defined
[ ] project management strategy is defined
[ ] reporting/dashboard strategy is defined
[ ] Odoo integration strategy is defined
[ ] Kommo/WhatsApp/email/payment integration strategy is defined
[ ] ERP-ready admin/API strategy is defined
[ ] security and compliance concerns are documented
[ ] ISO alignment is documented
[ ] post-MVP roadmap exists
[ ] practical examples exist
[ ] testing strategy exists
[ ] rollback strategy exists
[ ] GitHub Issues are prepared
[ ] OpenCode/Antigravity prompt exists
```

---

## 33. Recommended Next Part

Continue with:

```txt
Part 14 — EmDash Upstream Sync and Compatibility Maintenance Playbook
```

Part 14 should include:

- upstream remote strategy;
- sync frequency;
- pre-sync checklist;
- merge/rebase policy;
- compatibility matrix update;
- divergence log update;
- plugin/template compatibility tests;
- rollback from bad upstream sync;
- GitHub Issues and PR workflow;
- OpenCode implementation prompt.
