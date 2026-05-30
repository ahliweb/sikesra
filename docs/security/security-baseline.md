# Security Baseline

## Repository-Level Rules

- keep `emdash-latest/` clean and reviewable; do not carry a separate `emdash/` checkout
- isolate downstream behavior to approved boundaries
- record unavoidable divergence
- review protected-path changes before and after sync

## Product-Specific Security

For SIKESRA RBAC, ABAC, masking, and audit requirements, see `docs/sikesra/06_security_rbac_abac.md`.
