# 11 AI and Junior Implementation Handoff

Use this document to turn the SIKESRA documentation set into small implementation tickets for junior programmers or AI coding agents with limited context windows.

## Handoff Goal

Each implementation ticket must be small enough to complete with only:

1. The ticket text.
2. One or two referenced SIKESRA documentation sections.
3. Repository files discovered in Phase 0.
4. The mandatory safety rules in this document.

Do not ask a limited-context implementer to load the full documentation set for every ticket.

## Required Phase 0 Output

Before creating implementation tickets beyond discovery, complete `SIKESRA-001` and `SIKESRA-002` from `08_implementation_backlog.md` and write a decision log.

The decision log must include:

1. Target module folder.
2. Plugin registration convention.
3. Manifest convention.
4. Admin route convention.
5. API route convention.
6. Public route convention.
7. D1 migration and seed convention.
8. Test command and test file convention.
9. Auth/session context helper.
10. Permission registration helper.
11. ABAC extension point or local fallback.
12. Audit service or local fallback.
13. R2/media helper or local fallback.
14. Any approved core adapter work.

No feature ticket should use speculative paths after Phase 0. Replace placeholders with real repository paths.

## Universal Safety Rules

Repeat these rules in every AI or junior ticket:

1. Do not modify EmDash core unless the ticket explicitly says the Phase 0 decision log approved a core adapter.
2. Enforce `tenant_id`, `site_id`, soft-delete, permission, ABAC, and region scope server-side.
3. Never trust frontend-supplied tenant, site, role, permission, or region scope.
4. Never return NIK/KIA hash, raw R2 key, highly restricted values, or private document URLs through normal API responses.
5. Public `/sikesra` output must be aggregate-only and must apply small-cell suppression.
6. Excel import must use staging before promotion.
7. High-risk actions must require reason when configured and must write audit events.
8. Add tests when the repository has a test convention. If not, add documented manual checks to the ticket result.
9. Keep changes limited to the files named in the ticket unless repository discovery proves an additional file is required.
10. Stop and ask for review if the implementation requires changing an unrelated shared service or public API.

## Limited-Context Ticket Template

Use this template for GitHub issues or AI coding prompts.

```txt
Title:
SIKESRA-<id>: <one concrete deliverable>

Goal:
Implement <single behavior> for the SIKESRA module.

Read Only These Docs First:
- advance/sikesra/<doc>.md: <exact section>
- advance/sikesra/11_ai_implementation_handoff.md: Universal Safety Rules

Repository Context From Phase 0:
- Module path: <real path>
- Migration path: <real path or not applicable>
- Route path: <real path or not applicable>
- Test command: <real command or manual check>
- Shared helpers: <auth/audit/permission/media helpers or local fallback>

Files To Create/Edit:
- <exact file path>
- <exact file path>

Do:
- <specific implementation step>
- <specific implementation step>
- Enforce tenant/site/scope and masking where applicable.

Do Not:
- Do not modify unrelated core files.
- Do not expose sensitive data.
- Do not bypass service/repository/audit boundaries.

Acceptance Checks:
- <specific observable check>
- <specific test or manual verification>
- No raw NIK/KIA hash or R2 key appears in responses/log output.

Completion Note Required:
- List changed files.
- List tests or manual checks run.
- List any assumptions or blockers.
```

## Ticket Size Rules

One ticket should create or modify one cohesive unit only.

Good ticket sizes:

1. One migration file.
2. One seed file.
3. One service with focused behavior.
4. One API endpoint group with the same resource and same permission pattern.
5. One UI screen that consumes an already implemented API.
6. One test file for one risk area.

Too large for a limited-context implementer:

1. All migrations at once.
2. All imports and deduplication at once.
3. API, service, repository, UI, and tests in one ticket.
4. Security foundation plus business workflow in one ticket.
5. Any ticket that requires reading more than three SIKESRA documents.

## Required Ticket Splits

Split these broad backlog items before assigning them to a junior programmer or AI agent.

| Backlog Item                                             | Split Into                                                                                                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SIKESRA-011` detail module migrations                   | One migration ticket per two detail tables, or one per table if fields are complex.                                                                                                            |
| `SIKESRA-012` relationships, attributes, ABAC migrations | Entity people, attribute definitions, entity attributes, user scopes, ABAC policies, ABAC conditions.                                                                                          |
| `SIKESRA-013` remaining infrastructure migrations        | Verification events, file objects, supporting documents, import batches, staging rows, mapping templates, duplicate candidates, duplicate decisions, benefit history, export jobs, audit logs. |
| `SIKESRA-014` baseline seeds                             | Attribute vocabulary seeds, verification seeds, ABAC baseline policies, settings defaults.                                                                                                     |
| `SIKESRA-017` ABAC evaluator                             | Input types, policy loader, condition evaluator, deny precedence, region scope checks, sensitivity checks, tests.                                                                              |
| `SIKESRA-018` masking utility                            | Person masking, contact/address masking, document metadata masking, audit redaction, negative tests.                                                                                           |
| `SIKESRA-024` admin dashboard API                        | KPI query, work queue query, regional summary query, activity feed query, response serializer.                                                                                                 |
| `SIKESRA-036` wizard UI                                  | Step shell, autosave wiring, validation display, duplicate warning panel, review/submit step.                                                                                                  |
| `SIKESRA-043` verification UI                            | Queue list, review detail, decision form, notes/history panel.                                                                                                                                 |
| `SIKESRA-047` document verification and replacement      | Verify/reject document endpoint, replace document endpoint, supersede metadata update, audit tests.                                                                                            |
| `SIKESRA-050` sheet reading and mapping                  | Workbook parser, sheet detector, column mapper, mapping template persistence.                                                                                                                  |
| `SIKESRA-056` import promotion                           | Promotion eligibility, entity creation, detail/person/attribute creation, ID generation integration, duplicate override audit.                                                                 |
| `SIKESRA-058` export job creation                        | Field sensitivity resolver, export request validator, job record creation, file generation, private download.                                                                                  |
| `SIKESRA-064` security tests                             | RBAC route tests, ABAC object tests, masking tests, cross-region tests.                                                                                                                        |
| `SIKESRA-069` backup/restore linkage                     | D1 backup check, R2 inventory check, restore dry run, metadata/object linkage validation.                                                                                                      |

## Minimal Doc Context Map

Use this map to keep prompts small.

| Work Area              | Required Docs                                                                    |
| ---------------------- | -------------------------------------------------------------------------------- |
| Discovery and skeleton | `02_architecture.md`, `08_implementation_backlog.md`, this handoff.              |
| Product seeds          | `01_product_requirements.md`, `03_data_model.md`.                                |
| Database migrations    | `03_data_model.md`, relevant backlog ticket, this handoff.                       |
| API endpoint           | `04_api_contracts.md`, `06_security_rbac_abac.md`, this handoff.                 |
| Public page            | `01_product_requirements.md`, `05_ui_ux.md`, `06_security_rbac_abac.md`.         |
| Admin UI               | `05_ui_ux.md`, `04_api_contracts.md`, `operator-workflow.md`, this handoff.      |
| Security and ABAC      | `06_security_rbac_abac.md`, `02_architecture.md`, `10_validation_checklist.md`.  |
| Import workflow        | `07_operations_sop.md`, `03_data_model.md`, `04_api_contracts.md`.               |
| Documents and R2       | `02_architecture.md`, `03_data_model.md`, `06_security_rbac_abac.md`.            |
| Verification workflow  | `07_operations_sop.md`, `04_api_contracts.md`, `06_security_rbac_abac.md`.       |
| Reports and exports    | `04_api_contracts.md`, `06_security_rbac_abac.md`, `10_validation_checklist.md`. |
| Release validation     | `09_12_week_mvp_plan.md`, `10_validation_checklist.md`, `operator-workflow.md`.  |

## Phase 0 Prompt Pack

Use this first. It prepares the repository for all later limited-context tickets.

```txt
Title:
SIKESRA-001/002: Discover repository conventions and create implementation decision log

Goal:
Find the real extension points for implementing SIKESRA and write a decision log. Do not implement business features yet.

Read Only These Docs First:
- advance/sikesra/02_architecture.md: Recommended Module Layout, Plugin Manifest Requirements
- advance/sikesra/08_implementation_backlog.md: Phase 0
- advance/sikesra/11_ai_implementation_handoff.md: Required Phase 0 Output, Universal Safety Rules

Files To Create/Edit:
- <decision log path chosen after repository discovery>

Do:
- Find plugin/module registration convention.
- Find admin, API, public route, migration, seed, test, auth, permission, audit, ABAC, and media conventions.
- Record exact paths and helper names.
- Record missing extension points and the smallest approved adapter proposal.

Do Not:
- Do not scaffold SIKESRA yet.
- Do not create speculative feature files.
- Do not modify EmDash core.

Acceptance Checks:
- Decision log exists and covers every item in Required Phase 0 Output.
- Later tickets can name exact files instead of placeholders.
- No business implementation was added.
```

## Phase 1 Starter Tickets

Use these after Phase 0 replaces placeholders with real paths.

```txt
Title:
SIKESRA-003A: Create SIKESRA module folder and empty registration shell

Goal:
Create the smallest compile-safe SIKESRA module shell.

Read Only These Docs First:
- advance/sikesra/02_architecture.md: Route Boundaries, Recommended Module Layout
- advance/sikesra/11_ai_implementation_handoff.md: Universal Safety Rules

Files To Create/Edit:
- <real module path>/src/plugin.ts
- <real module path>/README.md if the repository convention uses per-module notes

Acceptance Checks:
- Module exports or registers using the discovered convention.
- No routes expose sensitive data.
- No core files changed unless Phase 0 approved the adapter.
```

```txt
Title:
SIKESRA-004A: Add SIKESRA manifest with routes and permissions declaration

Goal:
Add `module.manifest.json` or the repository equivalent for SIKESRA.

Read Only These Docs First:
- advance/sikesra/02_architecture.md: Plugin Manifest Requirements
- advance/sikesra/06_security_rbac_abac.md: Permission Catalog

Files To Create/Edit:
- <real module path>/module.manifest.json

Acceptance Checks:
- Module ID is `sikesra`.
- Public route, admin route, API namespace, permissions, storage scope, migration ownership, dependencies, and rollback behavior are declared.
```

```txt
Title:
SIKESRA-005A: Add API response envelope helpers

Goal:
Implement common success/failure helpers with request ID support.

Read Only These Docs First:
- advance/sikesra/04_api_contracts.md: Response Envelope
- advance/sikesra/02_architecture.md: Request Handling Sequence

Files To Create/Edit:
- <real module path>/src/api/response.ts
- <real test path>/response.test.ts

Acceptance Checks:
- Success and failure responses match `ApiSuccess<T>` and `ApiFailure`.
- Request ID is generated or propagated.
- Tests or manual checks cover response shape.
```

```txt
Title:
SIKESRA-006A: Add trusted request context builder

Goal:
Build SIKESRA request context from trusted EmDash session and site configuration.

Read Only These Docs First:
- advance/sikesra/02_architecture.md: Request Context
- advance/sikesra/06_security_rbac_abac.md: ABAC Inputs

Files To Create/Edit:
- <real module path>/src/security/context.ts
- <real test path>/context.test.ts

Acceptance Checks:
- Context includes request ID, tenant, site, user, roles, permissions, region scope, and request metadata.
- Public context derives tenant/site from trusted host/site configuration.
- Frontend-supplied tenant/site/scope is ignored.
```

## Database Ticket Pattern

Use one ticket per migration file or smaller.

```txt
Title:
SIKESRA-<id>: Add <table group> D1 migration

Goal:
Create the D1 migration for <specific tables only>.

Read Only These Docs First:
- advance/sikesra/03_data_model.md: <exact table definitions>
- advance/sikesra/11_ai_implementation_handoff.md: Universal Safety Rules

Files To Create/Edit:
- <real migration path>/<migration_name>.sql
- <real test or migration index path if required>

Acceptance Checks:
- Tables use `awcms_sikesra_` prefix.
- Business tables include standard tenant/site/audit/soft-delete columns.
- SQL is D1-compatible and avoids PostgreSQL-only features.
- Required indexes exist for the table group's main query paths.
- Migration runs locally or manual validation is documented.
```

## API Ticket Pattern

Use one resource group per ticket.

```txt
Title:
SIKESRA-<id>: Implement <endpoint> API

Goal:
Implement one API behavior behind the SIKESRA route namespace.

Read Only These Docs First:
- advance/sikesra/04_api_contracts.md: Endpoint Summary and relevant endpoint section
- advance/sikesra/06_security_rbac_abac.md: API Permission Matrix
- advance/sikesra/11_ai_implementation_handoff.md: Universal Safety Rules

Files To Create/Edit:
- <real route file>
- <real service file>
- <real repository file if needed>
- <real test file>

Acceptance Checks:
- Handler follows the Request Handling Sequence from `02_architecture.md`.
- Authentication, RBAC, ABAC, tenant/site, deleted, and region scope are enforced where applicable.
- Response uses the common envelope.
- Sensitive fields are masked before serialization.
- Audit is written for high-risk actions.
```

## UI Ticket Pattern

Implement UI only after the API exists.

```txt
Title:
SIKESRA-<id>: Build <screen/component> UI

Goal:
Build one SIKESRA UI screen using existing API client methods.

Read Only These Docs First:
- advance/sikesra/05_ui_ux.md: <relevant screen section>
- advance/sikesra/04_api_contracts.md: <relevant response types>
- advance/sikesra/11_ai_implementation_handoff.md: Universal Safety Rules

Files To Create/Edit:
- <real UI route/component path>
- <real API client path if needed>
- <real test path if available>

Acceptance Checks:
- UI calls typed API client only.
- UI does not call D1/R2 directly.
- UI uses backend access flags and does not treat hidden controls as security.
- Sensitive states are displayed as masked/locked where required.
- Screen is usable on desktop and basic mobile widths.
```

## Completion Review Checklist

Before closing any implementation ticket, verify:

1. Changed files match the ticket scope.
2. Security rules were applied server-side, not only in UI.
3. No sensitive value, hash, raw R2 key, or private URL appears in normal responses.
4. Tenant/site/deleted filters exist in repository queries where applicable.
5. Region scope is backend-computed.
6. Audit exists for high-risk actions.
7. Tests or manual checks are listed in the completion note.
8. Any assumption is recorded for senior review.
