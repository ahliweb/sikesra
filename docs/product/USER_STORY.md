> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) -> [AGENTS.md](../../AGENTS.md) -> [PRD.md](PRD.md)

# SIKESRA MVP User Stories

> This document aligns to `docs/product/PRD.md` and groups MVP stories by workflow and operating role.

## 1. Regional Data Entry and Registration

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| DE-1 | Village or Kelurahan Admin | As a village admin, I can register a new social welfare entity so that local data no longer depends on spreadsheets or ad hoc files. | The record is saved with the correct tenant, regional scope, and draft status. |
| DE-2 | Village or Kelurahan Admin | As a village admin, I can assign a 20-digit SIKESRA ID to a verified registration candidate so that each entity has one canonical identifier. | The generated ID follows the 20D format and remains immutable after issuance. |
| DE-3 | Village or Kelurahan Admin | As a village admin, I can capture micro-region details such as RT, RW, or Dusun as attributes so that location context is preserved without changing the entity ID. | Micro-region data is stored as contextual metadata and is excluded from ID generation. |
| DE-4 | Village or Kelurahan Admin | As a village admin, I can create records for houses of worship, social or religious institutions, religious teachers or figures, orphans, and people with disabilities so that MVP target domains are covered. | The form surface supports the required entity groups with consistent validation rules. |

## 2. Document Collection and Evidence Handling

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| DC-1 | Village or Kelurahan Admin | As a data entry operator, I can upload required supporting documents so that every submission includes evidence for verification. | Required files are attached before submit and stored in private object storage. |
| DC-2 | Kecamatan Verifier | As a sub-district verifier, I can review uploaded evidence for completeness and legibility so that poor submissions are stopped early. | Verifiers can inspect permitted files without exposing them publicly. |
| DC-3 | Authorized Reviewer | As an authorized reviewer, I can access files through signed links so that private documents stay protected while still being reviewable. | File access is time-limited, permission-checked, and auditable. |

## 3. Verification and Approval Workflow

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| WF-1 | Village or Kelurahan Admin | As a village admin, I can save incomplete work as draft so that I can finish registrations over multiple sessions. | Draft records remain editable and are not treated as active master data. |
| WF-2 | Village or Kelurahan Admin | As a village admin, I can submit a completed record for review so that the next verification tier can process it. | Submission is blocked until minimum fields and mandatory evidence are complete. |
| WF-3 | Kecamatan Verifier | As a sub-district verifier, I can approve, reject, or request revision on incoming submissions so that administrative quality is enforced before regency review. | The status changes are permission-gated and every decision includes timestamped tracking. |
| WF-4 | Institutional Validator | As a sectoral validator, I can perform optional domain validation so that specialized agencies can contribute to data quality when required. | Optional validation steps can be inserted without bypassing the main approval chain. |
| WF-5 | Regency Admin | As a regency admin, I can perform final approval so that validated records become active operational master data. | Only approved records become active and visible in operational master datasets. |
| WF-6 | Any Reviewer | As a reviewer, I can provide a rejection or revision reason so that the submitter knows what must be corrected. | Every negative decision stores a reason and appears in the workflow audit trail. |

## 4. Role-Based Operations and Sensitive Data Protection

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| RB-1 | All Internal Users | As an internal user, I see only records and actions allowed for my role and regional scope so that unauthorized operations are prevented by design. | Views, actions, and row access remain aligned to ABAC permissions and RLS policies. |
| RB-2 | Authorized Officer | As an authorized officer, I can reveal masked sensitive fields only when my role allows it so that personal data is protected by default. | Sensitive values such as NIK are masked by default and revealed selectively. |
| RB-3 | Auditor | As an auditor, I can review workflow and access history so that governance checks can be performed without changing business data. | Audit access is read-only and scoped to the correct operating region or tenant. |

## 5. Task-Oriented Dashboard and Work Management

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| DB-1 | Village or Kelurahan Admin | As a local operator, I can see drafts, returned revisions, and pending submissions so that I know what requires action next. | The dashboard prioritizes work queues instead of only showing totals. |
| DB-2 | Kecamatan Verifier | As a verifier, I can see pending reviews, overdue items, and quality issues so that I can focus on bottlenecks. | Dashboard widgets surface actionable queues and SLA-related indicators. |
| DB-3 | Regency Admin | As a regency admin, I can see approval backlog and data quality summaries so that I can manage final operational throughput. | Approval workload and exception trends are visible in one place. |

## 6. Public-Safe Views and Future DTSEN Readiness

| ID | Persona | Story | Expected Outcome |
| --- | --- | --- | --- |
| PV-1 | Public User | As a public visitor, I can view safe, non-sensitive information so that public transparency is supported without exposing protected data. | Public views contain only approved, non-sensitive, explicitly publishable data. |
| PV-2 | System Administrator | As a system administrator, I can keep internal operational data separate from public-safe projections so that security boundaries stay intact. | Internal and public data access paths are clearly separated. |
| PV-3 | Regency Admin | As a future DTSEN-integrated operator, I can compare local records with national reference data so that discrepancies can become operational proposals instead of silent overwrites. | DTSEN-ready flows treat national data as read-only reference input. |

## References

- [PRD.md](PRD.md) - Product requirements and MVP scope
- [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) - Testable checks aligned to these stories
- [README.md](../../README.md) - Monorepo overview and SIKESRA runtime baseline
- [docs/security/abac.md](../security/abac.md) - Permission model details
- [docs/security/rls.md](../security/rls.md) - Database enforcement details
- [docs/dev/edge-functions.md](../dev/edge-functions.md) - Cloudflare Worker patterns for signed access and privileged operations
