# Prompt: Synchronize AWCMS Mini Development with Coolify, Hono, PostgreSQL Docker, Cloudflare R2, Cloudflare Pages, and EmDash-First Architecture

You are an expert full-stack software architect, backend engineer, DevOps engineer, and security engineer working on an AWCMS Mini–based application.

Your task is to synchronize the current AWCMS Mini development with the target architecture described below. Prioritize correctness, simplicity, maintainability, security, and incremental implementation.

## 1. Target Architecture

Synchronize the project with the following architecture:

1. **Coolify Managed Service**
   - Use Coolify as the deployment and service management layer.
   - Coolify manages the application services, Docker containers, environment variables, deployment lifecycle, and related service configuration.

2. **Single VPS Runtime Environment**
   - A VPS is used as the main backend runtime.
   - The VPS runs:
     - A Hono-based backend API service.
     - A Docker-based PostgreSQL database server on the same VPS instance.
   - The Hono backend connects to PostgreSQL through the internal Docker network whenever possible.
   - Avoid exposing PostgreSQL directly to the public internet.

3. **Hono Backend API**
   - Use Hono as the primary backend API framework.
   - The Hono API must handle:
     - Authentication-related backend endpoints where needed.
     - Login, logout, session/JWT validation, and secure password handling.
     - Cloudflare Turnstile verification for login, registration, password reset, and other abuse-prone forms.
     - Two-factor authentication (2FA) for privileged users and optional 2FA for regular users.
     - Database-backed CRUD operations.
     - ABAC/RBAC enforcement.
     - File metadata operations.
     - Cloudflare R2 signed upload/download flows.
     - Audit logging.
     - Integration endpoints and webhooks if required.
     - Mailketing Email API sender integration for transactional email and controlled email notifications.
     - Starsender WhatsApp API sender integration for WhatsApp notifications, OTP alternatives where allowed, operational alerts, and workflow messaging.
     - OpenAPI 3.1 documentation that is compatible with Swagger UI.
   - Keep the API modular, minimal, and aligned with EmDash simplicity.

4. **Docker-Based PostgreSQL Server**
   - PostgreSQL runs as a Docker service managed through Coolify.
   - The database is the primary source of truth.
   - Use migrations, constraints, indexes, seed data, and audit tables properly.
   - Never store raw uploaded files directly in PostgreSQL. Store file metadata only.

5. **Cloudflare R2 Bucket**
   - Use Cloudflare R2 for object/file storage.
   - Store only metadata in PostgreSQL.
   - Use structured object keys, for example:
     - `tenants/{tenant_id}/modules/{module_name}/{entity_id}/{file_id}-{safe_filename}`
     - `public/{site_code}/assets/{file_id}-{safe_filename}`
   - Implement signed upload/download or controlled proxy access through the Hono backend.
   - Validate MIME type, size, extension, checksum, visibility, and access policy.

6. **Cloudflare Pages**
   - Use Cloudflare Pages for the public/frontend deployment.
   - The public frontend should call the Hono backend API through a configured API base URL.
   - Do not connect Cloudflare Pages directly to PostgreSQL.
   - Do not expose database credentials to the frontend.
   - Do not use Cloudflare Hyperdrive for this architecture.

7. **No Cloudflare Hyperdrive**
   - Do not use Cloudflare Hyperdrive in this architecture.
   - Do not add Hyperdrive bindings, Hyperdrive environment variables, Hyperdrive migration steps, or Hyperdrive deployment instructions.
   - Do not connect Cloudflare Pages, Workers, or frontend code directly to PostgreSQL through Hyperdrive.
   - The Hono backend API on the Coolify-managed VPS is the only approved application layer for PostgreSQL access.
   - If existing Hyperdrive references are found, remove or archive them unless they are clearly marked as unrelated historical notes.

8. **EmDash-First Core Architecture**
   - Treat EmDash as the architectural inspiration and first-principle reference.
   - Keep the CMS core simple, modular, database-first, and extensible.
   - Avoid overengineering.
   - Prefer clear module boundaries, simple content models, public rendering compatibility, and plugin-ready architecture.
   - Adapt EmDash ideas without blindly copying code or introducing unnecessary complexity.

9. **Cloudflare Turnstile**
   - Use Cloudflare Turnstile as the anti-abuse and bot protection layer for public and authentication-related forms.
   - Apply Turnstile to login, registration, password reset, contact forms, public submissions, and high-risk endpoints.
   - Verify Turnstile tokens only on the Hono backend API.
   - Do not expose Turnstile secret keys to the frontend.
   - Store only verification results and audit events where necessary; do not store unnecessary challenge data.

10. **Two-Factor Authentication (2FA)**
   - Support 2FA for user accounts, especially privileged roles such as Super Admin, Admin, Auditor, and other sensitive operators.
   - Prefer TOTP-based 2FA using authenticator apps as the baseline implementation.
   - Support recovery codes for account recovery.
   - Store only hashed 2FA secrets or encrypted 2FA secrets using a server-side encryption key.
   - Require 2FA for high-privilege accounts and sensitive operations where appropriate.

11. **OpenAPI and Swagger-Compatible API Documentation**
   - Provide an OpenAPI 3.1 specification for the Hono backend API.
   - Ensure the OpenAPI document is compatible with Swagger UI or another standard OpenAPI viewer.
   - Expose API documentation safely through the Hono backend, for example:
     - `GET /openapi.json`
     - `GET /docs`
   - Do not expose sensitive internal-only endpoints in public documentation unless explicitly intended.
   - Clearly document request schemas, response schemas, error responses, authentication requirements, Turnstile requirements, 2FA requirements, pagination, filtering, sorting, and rate-limit behavior.

12. **Mailketing Email API Sender**
   - Use Mailketing as an email API sender integration where configured.
   - Support transactional email and controlled system notifications, such as:
     - Account verification email.
     - Password reset email.
     - 2FA recovery notification.
     - User invitation email.
     - Content publication notification.
     - Form submission notification.
     - System alert email.
   - Do not use Mailketing for unsolicited email or non-compliant bulk messaging.
   - Store outbound email metadata and delivery status in PostgreSQL.
   - Never store API secrets in frontend code or public documentation.
   - Add rate limiting, retry limits, idempotency keys, and audit logging for outbound email.

13. **Starsender WhatsApp API Sender**
   - Use Starsender as a WhatsApp API sender integration where configured.
   - Support controlled WhatsApp notifications, such as:
     - Admin operational alerts.
     - User invitation or account notification.
     - Verification workflow notification.
     - Public form follow-up notification.
     - Status update notification.
     - Optional OTP or 2FA backup messaging only if compliant with the project policy and provider capability.
   - Do not use Starsender for spam, unsolicited messaging, or non-compliant broadcast campaigns.
   - Store outbound WhatsApp metadata and delivery status in PostgreSQL.
   - Never store API secrets in frontend code or public documentation.
   - Add rate limiting, retry limits, idempotency keys, webhook verification where available, and audit logging for outbound WhatsApp messages.

## 2. Repository Scope

Work only in the current AWCMS Mini repository.

Do not modify unrelated repositories.

If there is a master/reference repository, use it only as a reference. Do not change it unless explicitly instructed.

## 3. Main Objective

Analyze the current project and update the architecture, configuration, documentation, and implementation plan so that AWCMS Mini consistently follows this stack:

```text
Cloudflare Pages
        |
        v
Hono Backend API on VPS managed by Coolify
        |
        +--> PostgreSQL Docker service on the same VPS
        |
        +--> Cloudflare R2 for object storage
        |
        +--> Mailketing Email API Sender
        |
        +--> Starsender WhatsApp API Sender
```

The final architecture must be secure-by-default, simple-first, scalable-later, and compatible with the EmDash-first direction.

## 4. Required Analysis Steps

Before changing code, perform a structured assessment:

1. Inspect the repository structure.
2. Identify existing frontend, backend, database, storage, auth, and deployment components.
3. Identify any Supabase, direct database, local file storage, or unused Cloudflare configurations.
4. Identify current environment variable usage.
5. Identify hardcoded credentials, unsafe secrets, or exposed service URLs.
6. Identify documentation that conflicts with the target architecture.
7. Identify missing components needed for:
   - Hono API deployment.
   - PostgreSQL Docker connection.
   - Cloudflare R2 integration.
   - Cloudflare Pages frontend configuration.
   - Coolify deployment.
   - ABAC/RBAC and audit logs.
   - OpenAPI 3.1 generation and Swagger-compatible documentation.
   - Mailketing Email API sender integration.
   - Starsender WhatsApp API sender integration.
   - Notification queue, delivery log, retry, and webhook handling if needed.

## 5. Implementation Principles

Use the following principles:

1. **Atomic approach**
   - Work in small, reviewable steps.
   - Avoid repeating the same work in loops.
   - Complete one coherent change at a time.

2. **Database-first**
   - PostgreSQL schema, migrations, constraints, and indexes must be treated as core architecture.
   - Do not let frontend assumptions define the database model.

3. **API-first backend**
   - The frontend communicates through the Hono API.
   - The API enforces authorization, validation, audit logging, and business rules.

4. **Secure-by-default**
   - Never expose PostgreSQL directly to Cloudflare Pages or public clients.
   - Never commit secrets.
   - Move credentials to appropriate `.env` files or Coolify environment variables.
   - Use strong validation for all inputs.

5. **EmDash-first simplicity**
   - Keep the system modular but not unnecessarily complex.
   - Prefer simple conventions over heavy abstractions.
   - Make each module understandable and extensible.

6. **Cloudflare-aware architecture**
   - Use Cloudflare Pages for frontend hosting.
   - Use R2 for storage.
   - Use Cloudflare DNS/CDN/WAF/Turnstile where relevant.
   - Do not use Cloudflare Hyperdrive.
   - Keep PostgreSQL access behind the Hono backend API running on the Coolify-managed VPS.

7. **Integration-safe communication architecture**
   - Treat outbound email and WhatsApp as backend-only integrations.
   - Route all outbound messages through the Hono backend.
   - Store templates, message requests, provider responses, delivery status, and audit events in PostgreSQL.
   - Use idempotency keys to prevent duplicate sends.
   - Use rate limits and retry policies to avoid provider abuse or accidental message storms.
   - Keep provider APIs replaceable through an internal provider abstraction.

## 6. Expected Backend Structure

Design or align the backend with a structure similar to:

```text
apps/api/
  src/
    index.ts
    app.ts
    config/
      env.ts
      database.ts
      r2.ts
      turnstile.ts
      two-factor.ts
      mailketing.ts
      starsender.ts
      notifications.ts
      openapi.ts
    db/
      client.ts
      migrations/
      seeds/
    modules/
      auth/
      two-factor/
      turnstile/
      notifications/
      mailketing/
      starsender/
      openapi/
      users/
      roles/
      permissions/
      files/
      audit/
      message-templates/
      delivery-logs/
      content/
      sites/
    middleware/
      auth.ts
      abac.ts
      error-handler.ts
      request-id.ts
      rate-limit.ts
      security-headers.ts
    lib/
      logger.ts
      validators.ts
      crypto.ts
      pagination.ts
      idempotency.ts
      template-renderer.ts
    routes/
      health.ts
      api.ts
      openapi.ts
      notifications.ts
      webhooks.ts
  package.json
  tsconfig.json
  Dockerfile
```

Adjust this structure to the current repository style. Do not force a structure if the repository already has a clean equivalent.

## 7. Expected Frontend Configuration

Cloudflare Pages frontend should use environment variables such as:

```text
PUBLIC_API_BASE_URL=https://api.example.com
PUBLIC_SITE_CODE=main
PUBLIC_APP_ENV=production
PUBLIC_TURNSTILE_SITE_KEY=replace_with_turnstile_site_key
```

Rules:

1. Frontend must not include database credentials.
2. Frontend must not include R2 secret keys.
3. Frontend must not include Turnstile secret keys.
4. Frontend should communicate only through the Hono API for protected operations.
5. Frontend may render Turnstile widgets using only the public Turnstile site key.
6. Public assets may use public R2 URLs only if explicitly marked public.

## 8. Expected Backend Environment Variables

Use environment variables similar to:

```text
NODE_ENV=production
PORT=3000
APP_URL=https://example.com
API_BASE_URL=https://api.example.com

DATABASE_URL=postgresql://app_user:strong_password@postgres:5432/awcms_mini

JWT_SECRET=replace_with_strong_secret
SESSION_SECRET=replace_with_strong_secret
PASSWORD_PEPPER=replace_with_strong_secret

CLOUDFLARE_ACCOUNT_ID=replace_with_account_id
R2_ACCESS_KEY_ID=replace_with_access_key
R2_SECRET_ACCESS_KEY=replace_with_secret_key
R2_BUCKET_NAME=awcms-mini
R2_PUBLIC_BASE_URL=https://assets.example.com

CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com

TURNSTILE_SITE_KEY=replace_with_turnstile_site_key
TURNSTILE_SECRET_KEY=replace_with_turnstile_secret_key
TURNSTILE_VERIFY_URL=https://challenges.cloudflare.com/turnstile/v0/siteverify

TWO_FACTOR_ISSUER=AWCMS Mini
TWO_FACTOR_ENCRYPTION_KEY=replace_with_32_byte_encryption_key
TWO_FACTOR_RECOVERY_CODE_PEPPER=replace_with_strong_secret

OPENAPI_ENABLED=true
OPENAPI_JSON_PATH=/openapi.json
SWAGGER_UI_ENABLED=true
SWAGGER_UI_PATH=/docs

MAILKETING_ENABLED=true
MAILKETING_API_BASE_URL=https://api.mailketing.example
MAILKETING_API_KEY=replace_with_mailketing_api_key
MAILKETING_SENDER_EMAIL=noreply@example.com
MAILKETING_SENDER_NAME=AWCMS Mini
MAILKETING_WEBHOOK_SECRET=replace_if_supported
MAILKETING_TIMEOUT_MS=10000
MAILKETING_MAX_RETRIES=3

STARSENDER_ENABLED=true
STARSENDER_API_BASE_URL=https://api.starsender.example
STARSENDER_API_KEY=replace_with_starsender_api_key
STARSENDER_DEVICE_ID=replace_with_starsender_device_id_if_required
STARSENDER_DEFAULT_COUNTRY_CODE=62
STARSENDER_WEBHOOK_SECRET=replace_if_supported
STARSENDER_TIMEOUT_MS=10000
STARSENDER_MAX_RETRIES=3

NOTIFICATION_RATE_LIMIT_PER_MINUTE=60
NOTIFICATION_RETRY_ENABLED=true
NOTIFICATION_DEFAULT_PROVIDER_EMAIL=mailketing
NOTIFICATION_DEFAULT_PROVIDER_WHATSAPP=starsender
```

Rules:

1. Do not commit real secrets.
2. Provide `.env.example` only.
3. Use Coolify environment variables for production secrets.
4. Keep `.env.local` ignored unless the repository has another convention.
5. Disable Swagger UI in production if the deployment policy requires private API documentation.
6. Never expose secret values, internal network names, database URLs, R2 secrets, Mailketing secrets, Starsender secrets, private IP addresses, or privileged operational notes in OpenAPI examples.
7. Provider API keys for Mailketing and Starsender must exist only in backend environment variables or Coolify secrets.
8. Frontend may request notification-related actions only through authorized Hono API endpoints, never directly to Mailketing or Starsender.

## 9. PostgreSQL Requirements

Ensure the database design supports:

1. Users.
2. Roles.
3. Permissions.
4. User-role mapping.
5. Role-permission mapping.
6. ABAC policy attributes.
7. Sites or single-tenant site configuration.
8. Content or module data.
9. File metadata.
10. Audit logs.
11. Two-factor authentication settings.
12. 2FA recovery codes.
13. Login attempt tracking.
14. Turnstile verification audit events where appropriate.
15. Message templates.
16. Notification requests.
17. Email delivery logs.
18. WhatsApp delivery logs.
19. Provider webhook events.
20. Idempotency records for outbound messages.
21. Soft delete fields.
22. Created/updated timestamps.

Recommended common fields:

```sql
id uuid primary key default gen_random_uuid(),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz null,
created_by uuid null,
updated_by uuid null,
deleted_by uuid null
```

For sensitive or important tables, add audit logging.

Recommended 2FA-related tables or equivalent fields:

```text
user_security_settings
  user_id
  two_factor_enabled
  two_factor_method
  two_factor_secret_encrypted
  two_factor_confirmed_at
  last_two_factor_verified_at
  created_at
  updated_at

user_recovery_codes
  id
  user_id
  code_hash
  used_at
  created_at
  expires_at
```

Recommended login security tracking:

```text
login_attempts
  id
  user_id
  email_or_identifier
  ip_address_hash
  user_agent_hash
  success
  failure_reason
  turnstile_verified
  two_factor_required
  two_factor_verified
  created_at
```

Do not store plaintext TOTP secrets, plaintext recovery codes, raw IP addresses, or unnecessary challenge data.

Recommended notification-related tables or equivalent fields:

```text
message_templates
  id
  channel
  provider
  template_key
  subject_template
  body_template
  language
  status
  created_at
  updated_at
  deleted_at

notification_requests
  id
  channel
  provider
  template_key
  recipient_hash
  recipient_masked
  subject
  body_preview
  payload_json
  status
  idempotency_key
  requested_by
  requested_at
  scheduled_at
  sent_at
  failed_at
  error_code
  error_message_safe
  created_at
  updated_at
  deleted_at

notification_delivery_logs
  id
  notification_request_id
  provider
  provider_message_id
  status
  provider_response_safe
  attempt_number
  next_retry_at
  created_at

provider_webhook_events
  id
  provider
  event_type
  provider_message_id
  payload_safe
  signature_verified
  received_at
  processed_at
```

Do not store unnecessary personal message content. Store masked recipients and safe previews where possible. Store full message body only when there is a valid business, legal, audit, or troubleshooting need.

## 10. File Metadata Requirements

Create or align a `file_objects` or equivalent table with fields similar to:

```text
id
entity_type
entity_id
bucket_name
storage_key
original_name
safe_name
mime_type
extension
size_bytes
checksum_sha256
visibility
access_policy
uploaded_by
uploaded_at
verified_at
status
created_at
updated_at
deleted_at
```

Rules:

1. Files are stored in Cloudflare R2.
2. Metadata is stored in PostgreSQL.
3. Protected files require signed access or API-mediated access.
4. Public files must be explicitly marked as public.
5. Every upload, download, delete, or permission change should be auditable.

## 11. ABAC/RBAC Requirements

Implement or align authorization using both RBAC and ABAC:

RBAC answers:

```text
What role does the user have?
```

ABAC answers:

```text
Is this user allowed to perform this action on this resource under this context?
```

Authorization context should support:

1. User ID.
2. Role.
3. Permission key.
4. Resource type.
5. Resource ID.
6. Site or tenant scope if applicable.
7. Ownership.
8. Data status.
9. Sensitivity level.
10. Request origin or channel.

Use permission keys like:

```text
users.read
users.create
users.update
users.delete
roles.manage
files.upload
files.read
files.delete
content.read
content.create
content.update
content.publish
audit.read
settings.manage
notifications.send
notifications.read
notifications.manage_templates
notifications.read_delivery_logs
integrations.mailketing.manage
integrations.starsender.manage
```

## 12. Hono API Requirements

The Hono backend should provide or plan endpoints like:

```text
GET    /health
GET    /openapi.json
GET    /docs
GET    /api/v1/me
POST   /api/v1/auth/login
POST   /api/v1/auth/login/verify-2fa
POST   /api/v1/auth/logout
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/roles
GET    /api/v1/permissions
POST   /api/v1/security/turnstile/verify
POST   /api/v1/security/2fa/setup
POST   /api/v1/security/2fa/confirm
POST   /api/v1/security/2fa/disable
POST   /api/v1/security/2fa/recovery-codes/regenerate
POST   /api/v1/files/upload-request
POST   /api/v1/files/complete-upload
GET    /api/v1/files/:id/signed-url
GET    /api/v1/audit-logs
GET    /api/v1/site-config
PATCH  /api/v1/site-config
GET    /api/v1/message-templates
POST   /api/v1/message-templates
POST   /api/v1/notifications/email/send
POST   /api/v1/notifications/whatsapp/send
GET    /api/v1/notifications/:id
GET    /api/v1/notifications/:id/delivery-logs
POST   /api/v1/webhooks/mailketing
POST   /api/v1/webhooks/starsender
```

For every endpoint:

1. Validate input.
2. Enforce ABAC/RBAC.
3. Verify Turnstile tokens for abuse-prone public/auth endpoints.
4. Enforce 2FA for privileged users and sensitive operations.
5. Log important actions.
6. Return consistent JSON responses.
7. Avoid leaking sensitive errors.
8. Document request, response, error, and security requirements in OpenAPI.
9. Use idempotency keys for outbound email and WhatsApp send endpoints.
10. Enforce provider-specific rate limits and safe retry policies for Mailketing and Starsender endpoints.
11. Verify webhook signatures for Mailketing and Starsender if the providers support signed webhooks.

## 13. OpenAPI and Swagger Documentation Requirements

Create or align OpenAPI documentation for the Hono backend API.

Minimum requirements:

1. Use OpenAPI 3.1 or newer if supported by the chosen tooling.
2. Provide `GET /openapi.json` for the raw OpenAPI document.
3. Provide `GET /docs` for Swagger-compatible API documentation.
4. Keep schemas close to route validation logic to reduce drift.
5. Prefer generated schemas from validation definitions where practical.
6. Document all public and protected API endpoints.
7. Document authentication requirements using `securitySchemes`.
8. Document bearer token or session-based authentication clearly.
9. Document Turnstile token requirements for protected public forms and abuse-prone endpoints.
10. Document 2FA flows separately from the first password login step.
11. Document standard error format.
12. Document pagination, sorting, filtering, and search conventions.
13. Document rate-limit responses.
14. Document file upload request and completion flows.
15. Document signed URL behavior without exposing signing secrets.
16. Keep internal-only operational endpoints hidden unless the project intentionally exposes them to administrators.

Recommended OpenAPI structure:

```text
apps/api/
  src/
    openapi/
      registry.ts
      schemas/
        common.schema.ts
        auth.schema.ts
        users.schema.ts
        roles.schema.ts
        files.schema.ts
        audit.schema.ts
        site-config.schema.ts
        notifications.schema.ts
        message-templates.schema.ts
        webhooks.schema.ts
      paths/
        health.path.ts
        auth.path.ts
        users.path.ts
        files.path.ts
        audit.path.ts
        site-config.path.ts
        notifications.path.ts
        webhooks.path.ts
      security.ts
      document.ts
```

Recommended OpenAPI security schemes:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    sessionCookie:
      type: apiKey
      in: cookie
      name: sid
    turnstileToken:
      type: apiKey
      in: header
      name: X-Turnstile-Token
    requestId:
      type: apiKey
      in: header
      name: X-Request-Id
    idempotencyKey:
      type: apiKey
      in: header
      name: Idempotency-Key
```

Recommended standard JSON response shape:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

Recommended standard error response shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": []
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

Swagger UI requirements:

1. Swagger UI must read from `/openapi.json`.
2. Swagger UI must not expose production secrets.
3. Swagger UI should be protected, disabled, or limited in production if required by security policy.
4. Swagger examples must use placeholder values only.
5. Swagger documentation must clearly mark endpoints requiring admin permission, Turnstile, or 2FA.
6. Swagger documentation must clearly mark notification endpoints that can send email or WhatsApp messages.
7. Swagger examples for Mailketing and Starsender must use placeholder recipients only, such as `user@example.com` and `6281234567890`.

## 14. Coolify Deployment Requirements

Prepare or update deployment documentation for Coolify:

1. How to deploy the Hono backend API.
2. How to configure PostgreSQL as a Docker service.
3. How to connect Hono to PostgreSQL using internal Docker networking.
4. How to configure environment variables in Coolify.
5. How to configure domain and HTTPS.
6. How to configure health checks.
7. How to run migrations and seeds safely.
8. How to back up PostgreSQL.
9. How to restore PostgreSQL.
10. How to rotate secrets.
11. How to configure Mailketing API environment variables.
12. How to configure Starsender API environment variables.
13. How to test outbound email and WhatsApp in staging before production.

Recommended services:

```text
awcms-mini-api
awcms-mini-postgres
```

Recommended internal database host:

```text
postgres
```

Avoid public database exposure unless there is a specific administrative need. If temporary external access is needed, restrict by firewall, VPN, SSH tunnel, or Cloudflare Zero Trust where appropriate.

## 15. Cloudflare Pages Requirements

Prepare or update Cloudflare Pages documentation:

1. Build command.
2. Output directory.
3. Environment variables.
4. Production and preview configuration.
5. API base URL configuration.
6. CORS alignment with Hono API.
7. No Cloudflare Hyperdrive usage or frontend-to-database connectivity.
8. Cache strategy for public content.
9. Handling of public R2 assets.
10. Frontend notification forms must call only the Hono backend API.
11. Frontend must never expose Mailketing or Starsender API keys.

## 16. Cloudflare R2 Requirements

Prepare or update R2 documentation:

1. Bucket naming convention.
2. Object key convention.
3. Public vs private asset strategy.
4. Signed URL flow.
5. Upload flow.
6. Download flow.
7. File validation rules.
8. Lifecycle cleanup for temporary uploads.
9. Metadata synchronization with PostgreSQL.
10. Audit logging for file actions.

## 17. Mailketing and Starsender Integration Requirements

Prepare or update communication integration documentation:

1. Use Mailketing for email sending through the Hono backend only.
2. Use Starsender for WhatsApp sending through the Hono backend only.
3. Keep API keys in Coolify environment variables or backend-only `.env` files.
4. Never expose provider API keys to Cloudflare Pages or client-side JavaScript.
5. Use message templates for repeated messages.
6. Use recipient validation and normalization.
7. Use recipient masking in logs.
8. Use idempotency keys to prevent duplicate sends.
9. Use rate limiting for send endpoints.
10. Use retry limits and safe backoff.
11. Store provider responses safely without secrets.
12. Verify webhook signatures if supported by the provider.
13. Record delivery status and webhook status changes.
14. Add audit logs for manual sends, template changes, provider config changes, and failed send retries.
15. Separate transactional notifications from marketing or broadcast campaigns.
16. Require explicit permission for broadcast-style features.
17. Comply with applicable consent, privacy, anti-spam, PDP, and electronic information regulations.
18. For WhatsApp messages, avoid sending sensitive data unless explicitly approved and protected by policy.
19. For email messages, avoid sending passwords, plaintext secrets, sensitive tokens, or full personal data.
20. Add staging/sandbox testing flows before production sends.

Recommended internal provider abstraction:

```text
NotificationService
  sendEmail(input)
  sendWhatsApp(input)
  getDeliveryStatus(id)
  processProviderWebhook(provider, payload)

EmailProvider
  send(input)
  normalizeResponse(response)

WhatsAppProvider
  send(input)
  normalizeResponse(response)
```

## 18. Security Requirements

Apply security recommendations based on:

1. OWASP Top 10.
2. OWASP ASVS.
3. OWASP API Security Top 10.
4. ISO/IEC 27001.
5. ISO/IEC 27002.
6. ISO/IEC 27005.
7. ISO/IEC 27017.
8. ISO/IEC 27018.
9. ISO/IEC 27034.
10. ISO/IEC 27701.
11. CIS Controls.
12. NIST Cybersecurity Framework.
13. Cloudflare Turnstile best practices.
14. NIST SP 800-63B digital identity guidance where applicable.

Minimum controls:

1. Password hashing with a strong algorithm.
2. Secure session or JWT handling.
3. CORS allowlist.
4. Rate limiting.
5. Request size limits.
6. File upload validation.
7. Security headers.
8. Input validation.
9. SQL injection prevention using parameterized queries/query builder.
10. XSS prevention.
11. CSRF protection where browser cookie authentication is used.
12. Audit logs for sensitive operations.
13. Least privilege database users.
14. Secret management through Coolify environment variables.
15. Encrypted backups where possible.
16. Restore testing documentation.
17. Cloudflare Turnstile verification for login, registration, password reset, contact forms, and other abuse-prone endpoints.
18. 2FA support using TOTP for privileged users.
19. 2FA recovery codes that are displayed once, stored only as hashes, and auditable when regenerated or used.
20. Step-up authentication for sensitive actions such as changing passwords, disabling 2FA, rotating API keys, changing roles, deleting data, and exporting sensitive data.
21. Login attempt monitoring with safe logging that avoids storing raw sensitive identifiers unnecessarily.
22. OpenAPI documentation that avoids leaking sensitive implementation details, secrets, internal hostnames, private IP addresses, database URLs, or privileged-only operational instructions.
23. Swagger UI access control or production disablement when required by policy.
24. Mailketing and Starsender API keys stored only as backend secrets.
25. Notification endpoints protected by ABAC/RBAC and rate limits.
26. Recipient data masked in logs where possible.
27. Outbound message content minimized to avoid unnecessary personal data exposure.
28. Webhook signature verification for Mailketing and Starsender when supported.
29. Idempotency and retry controls to prevent duplicate or repeated outbound messages.
30. No Cloudflare Hyperdrive usage; PostgreSQL must remain reachable only through the approved backend/service network path.

## 19. Documentation Updates Required

Update or create documentation for:

1. Architecture overview.
2. Deployment with Coolify.
3. PostgreSQL Docker setup.
4. Hono backend API setup.
5. Cloudflare Pages setup.
6. Cloudflare R2 setup.
7. No-Hyperdrive architecture decision record.
8. Environment variables.
9. Security baseline.
10. Cloudflare Turnstile integration.
11. Two-factor authentication setup and recovery flow.
12. ABAC/RBAC design.
13. OpenAPI and Swagger-compatible API documentation.
14. File storage strategy.
15. Mailketing Email API sender integration.
16. Starsender WhatsApp API sender integration.
17. Notification templates, delivery logs, retry policy, and webhook handling.
18. Migration and seed workflow.
19. Backup and restore SOP.
20. Local development guide.
21. Production readiness checklist.

## 20. Cleanup Requirements

Find and clean up:

1. Unused Cloudflare configurations.
2. Unused `.env.local` variables.
3. Hardcoded credentials.
4. Conflicting Supabase assumptions if the project is no longer using Supabase.
5. Direct frontend-to-database patterns.
6. Local file storage patterns that should move to R2.
7. Duplicate or outdated documentation.
8. Inconsistent API URLs.
9. Inconsistent deployment notes.
10. Deprecated scripts.
11. Outdated or manually maintained API documentation that conflicts with OpenAPI.
12. Hardcoded Mailketing or Starsender API keys.
13. Direct frontend-to-provider notification calls.
14. Unsafe notification scripts that can send duplicate messages.
15. Hyperdrive bindings, Hyperdrive environment variables, Hyperdrive documentation, or Hyperdrive deployment notes that conflict with the target architecture.

Do not delete anything blindly. Confirm usage by searching references before removing or changing files.

## 21. Deliverables

Produce the following deliverables:

1. A concise architecture summary.
2. A list of repository findings.
3. A migration or synchronization plan.
4. Required code/config changes.
5. Required documentation changes.
6. Updated `.env.example` if needed.
7. Coolify deployment notes.
8. Cloudflare Pages deployment notes.
9. Cloudflare R2 integration notes.
10. Security checklist.
11. Database checklist.
12. Testing checklist.
13. OpenAPI 3.1 specification and Swagger-compatible documentation route.
14. Mailketing Email API sender integration plan or implementation.
15. Starsender WhatsApp API sender integration plan or implementation.
16. Notification database tables, endpoints, and audit log notes.
17. GitHub issues or task list if issue creation is available.
18. Commit-ready changes if repository write access is available.

## 22. Testing Requirements

After implementation, verify:

1. Backend builds successfully.
2. Frontend builds successfully.
3. Hono API `/health` works.
4. Hono API can connect to PostgreSQL.
5. Migrations run successfully.
6. Seed data runs successfully where applicable.
7. Frontend can call the configured API base URL.
8. R2 upload request flow works.
9. R2 metadata is saved to PostgreSQL.
10. ABAC/RBAC checks prevent unauthorized access.
11. Audit logs are recorded for sensitive actions.
12. Turnstile verification works for configured auth/public endpoints.
13. 2FA setup, confirmation, login verification, disable flow, and recovery codes work correctly.
14. Privileged users are required to use 2FA where configured.
15. No secrets are committed.
16. Docker build works.
17. Coolify deployment configuration is documented.
18. No Hyperdrive binding, environment variable, or deployment requirement remains in the active architecture path.
19. `/openapi.json` returns a valid OpenAPI document.
20. `/docs` renders Swagger-compatible API documentation when enabled.
21. OpenAPI validation passes using the selected OpenAPI validation tool.
22. OpenAPI documentation does not expose secrets or internal-only infrastructure details.
23. Mailketing email send flow works in staging or test mode.
24. Starsender WhatsApp send flow works in staging or controlled test mode.
25. Notification send endpoints require proper permission.
26. Notification send endpoints enforce rate limits.
27. Idempotency prevents duplicate email or WhatsApp sends.
28. Delivery logs are saved correctly.
29. Provider webhook endpoints validate signatures when supported.
30. Notification logs do not expose unnecessary personal data or provider secrets.

## 23. Recommended Implementation Order

Follow this order:

1. Repository assessment.
2. Architecture documentation update.
3. Environment variable normalization.
4. Backend Hono structure alignment.
5. PostgreSQL connection and migration workflow.
6. ABAC/RBAC baseline.
7. Turnstile and 2FA authentication hardening.
8. File metadata and R2 integration plan.
9. OpenAPI and Swagger-compatible documentation.
10. Mailketing and Starsender notification integration baseline.
11. Frontend API base URL alignment.
12. Coolify deployment documentation.
13. Cloudflare Pages documentation.
14. Cleanup of unused configs, including any Hyperdrive-related configs.
15. Security hardening.
16. Tests and verification.
17. Final summary with next recommended tasks.

## 24. Output Format

Return your work in this structure:

```markdown
# AWCMS Mini Architecture Synchronization Report

## 1. Executive Summary

## 2. Current Repository Findings

## 3. Target Architecture Alignment

## 4. Changes Made

## 5. Environment Variables

## 6. Database and Migration Notes

## 7. Hono API Notes

## 8. Cloudflare R2 Notes

## 9. OpenAPI and Swagger Documentation Notes

## 10. Mailketing Email API Sender Notes

## 11. Starsender WhatsApp API Sender Notes

## 12. Notification Queue, Template, and Delivery Log Notes

## 13. Cloudflare Pages Notes

## 14. No-Hyperdrive Architecture Notes

## 15. Coolify Deployment Notes

## 16. Security Review

### 16.1 Cloudflare Turnstile Review

### 16.2 Two-Factor Authentication Review

### 16.3 OpenAPI Documentation Security Review

### 16.4 Mailketing Email Sender Security Review

### 16.5 Starsender WhatsApp Sender Security Review

### 16.6 No-Hyperdrive Security Review

## 17. Testing Result

## 18. Remaining Risks

## 19. Recommended Next Atomic Tasks
```

## 25. Important Constraints

1. Do not expose PostgreSQL publicly unless explicitly required.
2. Do not use Cloudflare Pages as a direct database client.
3. Do not commit secrets.
4. Do not store raw files in PostgreSQL.
5. Do not overcomplicate the EmDash-first architecture.
6. Do not bypass Turnstile verification on endpoints that require anti-abuse protection.
7. Do not allow privileged users to operate without 2FA when 2FA is required by policy.
8. Do not store plaintext 2FA secrets or plaintext recovery codes.
9. Do not expose secrets, internal hostnames, private IP addresses, database URLs, R2 credentials, Mailketing credentials, or Starsender credentials in OpenAPI or Swagger documentation.
10. Do not send unsolicited email or WhatsApp messages.
11. Do not expose Mailketing or Starsender API keys to frontend code.
12. Do not allow notification endpoints without authorization, rate limiting, idempotency, and audit logging.
13. Do not use Cloudflare Hyperdrive.
14. Do not add Hyperdrive bindings, Hyperdrive variables, Hyperdrive docs, or Hyperdrive deployment steps.
15. Do not modify unrelated repositories.
16. Do not delete files without checking references.
17. Do not create large, unreviewable changes.
18. Do not repeat the same task in a loop.
19. Prefer atomic, verifiable progress.

## 26. Final Goal

The final result should make AWCMS Mini ready for a clean production-oriented architecture where:

- Cloudflare Pages serves the frontend.
- Cloudflare Hyperdrive is not used.
- Hono serves as the backend API on a Coolify-managed VPS.
- PostgreSQL runs securely as a Docker service on the same VPS.
- Cloudflare R2 stores files and objects.
- PostgreSQL stores structured data and file metadata.
- ABAC/RBAC and audit logs protect important operations.
- Cloudflare Turnstile protects authentication and public submission flows from automated abuse.
- 2FA protects privileged accounts and sensitive operations.
- OpenAPI 3.1 and Swagger-compatible documentation make the Hono API easier to test, integrate, audit, and maintain.
- Mailketing sends controlled transactional email and system notifications through the backend API.
- Starsender sends controlled WhatsApp notifications through the backend API.
- Notification templates, delivery logs, idempotency, webhook handling, and audit logs make communication workflows safer and easier to maintain.
- The architecture remains simple, modular, database-first, EmDash-inspired, and scalable for future modules.

