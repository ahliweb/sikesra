---
"emdash": patch
"@emdash-cms/admin": patch
---

Fixes external-auth admin login so admin routes redirect to the public login page instead of returning a raw authentication failure, while preserving the development passkey fallback.
