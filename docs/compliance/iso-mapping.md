> **Documentation Authority**: [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) Section 2 (Data Integrity) and Section 2.3 (Permissions)

# ISO/IEC Control Mapping

## Purpose

Map AWCMS security and operational controls to ISO/IEC standards relevant for multi-tenant CMS platforms handling personal data.

## Prerequisites

- [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) — Primary authority for control implementation
- [AGENTS.md](../../AGENTS.md) — Implementation patterns and Context7 references

## ISO/IEC 27001:2022 — Information Security Management

| Control | Description | AWCMS Implementation | Reference |
|---------|-------------|---------------------|-----------|
| A.5.1 | Policies for information security | SYSTEM_MODEL.md + AGENTS.md | [SYSTEM_MODEL.md](../../SYSTEM_MODEL.md) |
| A.5.15 | Access control | ABAC + RLS enforcement | [abac.md](../security/abac.md) |
| A.5.17 | Authentication information | Supabase Auth + optional 2FA | [security/overview.md](../security/overview.md) |
| A.8.3 | Information access restriction | RLS tenant isolation | [rls.md](../security/rls.md) |
| A.8.9 | Configuration management | Versioned migrations + env config | [setup.md](../dev/setup.md) |
| A.8.15 | Logging | Audit trail (`audit_logs`) | [AUDIT_TRAIL.md](../modules/AUDIT_TRAIL.md) |
| A.8.16 | Monitoring activities | Audit logs + platform logs | [MONITORING.md](../modules/MONITORING.md) |
| A.8.24 | Use of cryptography | pgcrypto for admin profile data | [security/overview.md](../security/overview.md) |
| A.8.25 | Secure development lifecycle | CI/CD linting, security scanning | [ci-cd.md](../dev/ci-cd.md) |
| A.8.28 | Secure coding | Agent rules, sanitization pipeline | `.agents/rules/` |

## ISO/IEC 27002:2022 — Security Controls

Detailed guidance for 27001 controls. AWCMS implementation follows the same mapping as 27001 above with additional operational procedures documented in `.agents/rules/` and `.agents/workflows/`.

## ISO/IEC 27005:2022 — Information Security Risk Management

| Area | AWCMS Implementation | Reference |
|------|---------------------|-----------|
| Risk identification | Threat model (OWASP ASVS) | [threat-model.md](../security/threat-model.md) |
| Risk treatment | RLS, ABAC, sanitization, encryption | [security/overview.md](../security/overview.md) |

## ISO/IEC 27017:2015 — Cloud Security

| Control | AWCMS Implementation |
|---------|---------------------|
| CLD.8.1 Shared responsibility | Supabase manages infra; AWCMS manages app-level security |
| CLD.9.5 Virtual environment isolation | Tenant isolation via RLS (logical) |
| CLD.12.4 Cloud service monitoring | Audit logs + Cloudflare analytics |

## ISO/IEC 27018:2019 — PII in Public Clouds

| Control | AWCMS Implementation |
|---------|---------------------|
| A.2.1 Purpose limitation | Tenant-scoped processing, no cross-tenant data sharing |
| A.10.1 Encryption | TLS 1.3 in transit, Supabase encryption at rest, pgcrypto for sensitive fields |
| A.11.1 Data deletion | Soft delete with admin hard-delete capability |
| A.12.3 Subprocessor notification | Operator responsibility (Supabase, Cloudflare as subprocessors) |

## ISO/IEC 27701:2019 — Privacy Information Management

| Control | AWCMS Implementation | Reference |
|---------|---------------------|-----------|
| Data subject access | RLS + profile access | [security/overview.md](../security/overview.md) |
| Right to erasure | Soft delete + admin hard delete | [database.md](../architecture/database.md) |
| Processing boundaries | Tenant isolation | [tenancy/overview.md](../tenancy/overview.md) |
| Consent management | `analytics_consent` settings | [public.md](../dev/public.md) |

## ISO/IEC 27034:2011 — Application Security

| Control | AWCMS Implementation |
|---------|---------------------|
| Secure development | Agent rules (.agents/rules/), CI gates |
| Input validation | Sanitization pipeline (sanitize-and-render rule) |
| Output encoding | Allowlisted rendering in admin + public |
| Authentication | Supabase Auth, session management |

## ISO/IEC 20000-1:2018 — IT Service Management

| Area | AWCMS Implementation |
|------|---------------------|
| Service design | SYSTEM_MODEL.md + PRD.md |
| Change management | Migration workflow, plan mode for high-risk changes |
| Incident management | Audit logs, operator alerting (operator responsibility) |

## ISO/IEC 22301:2019 — Business Continuity

| Area | AWCMS Implementation |
|------|---------------------|
| Backup | Supabase PITR + daily backups |
| Recovery | Supabase restore, migration replay |
| Continuity planning | Operator responsibility with documented rollback strategies |

## ISO/IEC 15408 — Common Criteria

| Area | AWCMS Implementation |
|------|---------------------|
| Security functional requirements | ABAC, RLS, encryption, audit trail |
| Security assurance | CI/CD testing, agent-enforced review, documentation |

## References

- [compliance/overview.md](overview.md) — Compliance overview
- [compliance/pdp-uu27-2022.md](pdp-uu27-2022.md) — Indonesian PDP
- [compliance/pp71-2019-pste.md](pp71-2019-pste.md) — Indonesian PSTE
- [security/overview.md](../security/overview.md) — Security controls
