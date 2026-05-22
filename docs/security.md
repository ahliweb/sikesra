# Security

## SIKESRA Controls

- RBAC permission namespace: `awcms:sikesra:<resource>:<action>`
- ABAC evaluation with subject, resource, and environment attributes
- Sensitive-field masking and explicit reveal permissions
- Audit logging for high-risk actions
- Public aggregate-only exposure for `/sikesra`

## Source Locations

- `packages/plugins/sikesra/src/security/`
- `docs/awcms-micro/sikesra/security-rbac-abac.md`
- `docs/sikesra/06_security_rbac_abac.md`

## Operational Requirement

Cross-region access, restricted exports, code correction, and private-document access must remain guarded by permission checks, ABAC scope checks, and audit records.
