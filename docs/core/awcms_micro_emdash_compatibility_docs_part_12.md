# AWCMS-Micro Implementation Documentation

## Part 12 — Mobile API SDK and Flutter Client Integration

**Document status:** Draft v0.1  
**Purpose:** Define the Mobile API contract, Flutter SDK/client architecture, secure public-content access, form submission flow, Kelulusan integration, future authentication/session strategy, offline cache, error handling, testing, and implementation prompt for AWCMS-Micro mobile applications while preserving EmDash compatibility and AWCMS governance.

---

## 1. Objective of Part 12

Part 12 defines how AWCMS-Micro can support mobile applications without exposing EmDash admin internals or weakening the website-first architecture.

This document covers:

1. mobile API role and boundaries;
2. API contract standard;
3. Flutter SDK package structure;
4. Flutter client application structure;
5. app bootstrap endpoint;
6. public content endpoints;
7. menu, news, announcement, document, and form APIs;
8. secure Kelulusan endpoint;
9. future authenticated endpoints;
10. token/session strategy;
11. offline cache strategy;
12. network error handling;
13. API versioning;
14. security and privacy;
15. testing;
16. GitHub Issues;
17. OpenCode/Antigravity implementation prompt.

The main principle:

```txt
Mobile apps must consume a stable AWCMS-Micro Mobile API layer.
Mobile apps must not call EmDash admin APIs directly.
```

---

## 2. Mobile API Philosophy

AWCMS-Micro is website-first, but it should be prepared to support mobile applications.

The mobile API should be:

- stable;
- versioned;
- public-content safe;
- mobile-friendly;
- secure;
- cache-aware;
- backward-compatible;
- tenant/site-aware;
- extensible through modules;
- compatible with EmDash architecture.

Core rule:

```txt
EmDash admin APIs (under /_emdash/*) are for admin and CMS operations.
EmDash uses passkey-first (WebAuthn) authentication for admin sessions.
AWCMS-Micro Mobile API (under /api/mobile/v1/*) is for mobile clients and public/private app experiences.
Mobile apps must never consume EmDash admin endpoints directly.
```

---

## 3. High-Level Mobile Architecture

```txt
Flutter App
  ↓
AWCMS Mobile SDK / API Client
  ↓
/api/mobile/v1/*
  ↓
AWCMS-Micro Mobile API Plugin
  ↓
AWCMS Service Layer
  ↓
EmDash-compatible Content / AWCMS Modules
  ↓
D1/PostgreSQL + R2/S3 + KV/Cache
```

The mobile API acts as a Backend-for-Frontend layer.

It should hide internal complexity and expose stable contracts.

---

## 4. Mobile API Plugin

### 4.1 Recommended Plugin

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

### 4.2 Why Use a Plugin

Use a plugin because:

- it preserves EmDash core compatibility;
- it can be enabled/disabled safely;
- it can declare permissions/capabilities;
- it can have versioned API routes;
- it can integrate with module registry;
- it can have tests and rollback plan.

### 4.3 Plugin Responsibilities

The mobile API plugin should provide:

```txt
app bootstrap
public site settings
menus
published posts/news
published announcements
public documents
forms submission endpoints
Kelulusan verification endpoints optional
future authenticated user endpoints
API response normalization
request ID
rate limiting integration
mobile maintenance mode
```

### 4.4 Plugin Must Not

The mobile API plugin must not:

```txt
expose admin-only API routes
return drafts/private/deleted content
return raw database structure
return storage object keys for private files
include secrets in responses
bypass ABAC/permission checks
cache private user-specific responses publicly
```

---

## 5. Mobile API Versioning

### 5.1 Version Namespace

Use:

```txt
/api/mobile/v1/*
```

Future:

```txt
/api/mobile/v2/*
```

### 5.2 Versioning Rule

```txt
Never silently break v1.
Add new fields safely.
Deprecate old fields gradually.
Create v2 for breaking changes.
```

### 5.3 Version Metadata

Every response should include:

```json
{
  "meta": {
    "apiVersion": "v1",
    "requestId": "req_..."
  }
}
```

---

## 6. API Response Contract

### 6.1 Success Response

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

### 6.2 List Response

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

### 6.3 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is invalid.",
    "details": null
  },
  "meta": {
    "requestId": "req_...",
    "apiVersion": "v1"
  }
}
```

### 6.4 Error Codes

Recommended error codes:

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
NETWORK_UNAVAILABLE
SERVER_UNAVAILABLE
INTERNAL_ERROR
```

### 6.5 Mobile Error Message Rule

```txt
Messages should be user-friendly.
Details should not leak internal system information.
```

---

## 7. Mobile API MVP Endpoints

### 7.1 Public App Bootstrap

```txt
GET /api/mobile/v1/bootstrap
```

Purpose:

```txt
Return site identity, feature flags, menu summary, API version, and maintenance status.
```

### 7.2 Homepage Data

```txt
GET /api/mobile/v1/home
```

Purpose:

```txt
Return homepage sections optimized for mobile.
```

### 7.3 Menus

```txt
GET /api/mobile/v1/menus/main
GET /api/mobile/v1/menus/footer
```

### 7.4 Posts / News

```txt
GET /api/mobile/v1/posts
GET /api/mobile/v1/posts/:slug
```

### 7.5 Announcements

```txt
GET /api/mobile/v1/announcements
GET /api/mobile/v1/announcements/:slug
```

### 7.6 Documents

```txt
GET /api/mobile/v1/documents
GET /api/mobile/v1/documents/:slug
```

Public documents only.

### 7.7 Forms

```txt
GET  /api/mobile/v1/forms/:slug
POST /api/mobile/v1/forms/:slug/submissions
```

### 7.8 Kelulusan

Optional:

```txt
GET  /api/mobile/v1/kelulusan/status
POST /api/mobile/v1/kelulusan/verify
POST /api/mobile/v1/kelulusan/download-url
```

---

## 8. Bootstrap Endpoint

### 8.1 Bootstrap Response Example

```json
{
  "success": true,
  "data": {
    "site": {
      "name": "AWCMS-Micro School",
      "tagline": "Official school website",
      "locale": "id-ID",
      "timezone": "Asia/Jakarta",
      "logoUrl": "https://example.com/logo.png"
    },
    "features": {
      "news": true,
      "announcements": true,
      "documents": true,
      "forms": true,
      "kelulusan": true,
      "secureDocumentLookup": true
    },
    "api": {
      "version": "v1",
      "minimumAppVersion": "1.0.0",
      "maintenanceMode": false,
      "maintenanceMessage": null
    },
    "links": {
      "privacyPolicy": "https://example.com/privacy",
      "contact": "https://example.com/contact"
    }
  },
  "meta": {
    "requestId": "req_...",
    "apiVersion": "v1"
  }
}
```

### 8.2 Bootstrap Cache Rule

Bootstrap may be cached briefly because it is public configuration.

Recommended:

```txt
Cache for 1–10 minutes.
Bypass cache if maintenance mode needs instant effect.
```

---

## 9. Public Content Filtering Rules

Every public mobile endpoint must return only:

```txt
published content
public visibility
not soft-deleted
not expired
tenant/site matched
```

Conceptual filter:

```sql
where tenant_id = :tenant_id
  and site_id = :site_id
  and publish_status = 'published'
  and visibility = 'public'
  and deleted_at is null
```

Mobile APIs must not expose:

```txt
draft content
private documents
restricted documents
internal admin metadata
R2 object keys
raw personal data
soft-deleted records
```

---

## 10. Pagination Strategy

### 10.1 Cursor Pagination

Prefer cursor pagination for mobile lists.

Example request:

```txt
GET /api/mobile/v1/posts?limit=20&cursor=abc
```

Example response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "nextCursor": "cursor_123",
    "hasMore": true
  },
  "meta": {
    "requestId": "req_...",
    "apiVersion": "v1"
  }
}
```

### 10.2 Limit Rule

Recommended limits:

```txt
default limit = 20
max limit = 50
```

### 10.3 Sorting

Recommended default:

```txt
published_at desc
```

---

## 11. Mobile API Security

### 11.1 Public Endpoint Controls

Required:

```txt
HTTPS only
CORS allowlist when applicable
rate limiting
request ID
input validation
public-content-only filtering
safe error messages
no secrets in response
```

### 11.2 Sensitive Endpoint Controls

For Kelulusan and private document flows:

```txt
rate limiting
safe error message
Turnstile after suspicious attempts
signed URLs
short sessions
no raw NISN exposure
audit events
no public cache
```

### 11.3 Future Authenticated Endpoint Controls

Required later:

```txt
short-lived access tokens
refresh token rotation
secure storage on device
session revocation
device tracking
ABAC policy checks
logout endpoint
audit events
```

---

## 12. Future Authentication and Session Strategy

### 12.1 Authentication Phases

Phase 1:

```txt
public-only mobile app
no login
content/news/announcements/documents/forms/Kelulusan verification
```

Phase 2:

```txt
authenticated user profile
read own documents
notifications
form history
```

Phase 3:

```txt
role-aware mobile admin/operator features
limited approvals
offline sync for selected modules
```

### 12.2 Token Strategy

Future authenticated mobile API should use:

```txt
short-lived access token
refresh token rotation
server-side session revocation
device session record
logout invalidation
```

### 12.3 Mobile Token Storage

Flutter app should store tokens using secure storage appropriate for the platform.

Rules:

```txt
do not store tokens in plain shared preferences
avoid logging tokens
clear tokens on logout
handle token refresh failure safely
```

### 12.4 Session Table Concept

```sql
create table awcms_mobile_sessions (
  id text primary key,
  tenant_id text not null,
  site_id text not null,
  user_id text not null,
  device_id text null,
  refresh_token_hash text not null,
  status text not null default 'active',
  expires_at text not null,
  revoked_at text null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
```

---

## 13. Flutter SDK Package Strategy

### 13.1 Recommended Package Name

```txt
awcms_micro_client
```

Alternative:

```txt
awcms_mobile_sdk
awcms_micro_api_client
```

### 13.2 SDK Responsibilities

The SDK should handle:

```txt
base URL configuration
HTTP requests
JSON decoding
typed models
API response wrapper
error mapping
pagination
request headers
future auth token injection
retry policy
logging hooks
```

The SDK should not:

```txt
contain business UI
store secrets
hardcode one client domain
bypass API contract
handle admin-only APIs
```

### 13.3 SDK Folder Structure

```txt
packages/flutter/awcms_micro_client/
  pubspec.yaml
  README.md
  lib/
    awcms_micro_client.dart
    src/
      awcms_api_client.dart
      awcms_config.dart
      awcms_response.dart
      awcms_error.dart
      endpoints/
        bootstrap_api.dart
        posts_api.dart
        announcements_api.dart
        documents_api.dart
        forms_api.dart
        kelulusan_api.dart
      models/
        site_bootstrap.dart
        post.dart
        announcement.dart
        document.dart
        form_definition.dart
        form_submission.dart
        kelulusan_result.dart
      auth/
        token_provider.dart
        auth_interceptor.dart
      cache/
        cache_policy.dart
      utils/
        json_utils.dart
  test/
    awcms_api_client_test.dart
    models_test.dart
    kelulusan_api_test.dart
```

---

## 14. Flutter Client App Structure

Recommended app folder:

```txt
apps/flutter/school_app/
  pubspec.yaml
  lib/
    main.dart
    app.dart
    core/
      config/
      network/
      errors/
      routing/
      theme/
      storage/
    features/
      bootstrap/
      home/
      news/
      announcements/
      documents/
      forms/
      kelulusan/
      settings/
    shared/
      widgets/
      models/
      utils/
  test/
  integration_test/
```

### 14.1 Feature-First Rule

Use feature-first organization for maintainability.

```txt
features/news
features/documents
features/kelulusan
features/forms
```

### 14.2 Separation Rule

Keep separation between:

```txt
SDK/API client
state management
UI widgets
feature logic
local cache
```

---

## 15. Flutter Networking Strategy

### 15.1 HTTP Client

Use a dedicated API client wrapper around a Dart/Flutter HTTP client.

Minimum:

```txt
http package
```

Optional for larger apps:

```txt
Dio or equivalent HTTP client
```

### 15.2 Network Client Requirements

The network client must support:

```txt
base URL
headers
timeouts
JSON decode
error mapping
request ID reading
retry policy
auth token injection later
logging without secrets
```

### 15.3 Timeout Defaults

Recommended:

```txt
connect timeout: 10 seconds
receive timeout: 20 seconds
form submission timeout: 30 seconds
file upload timeout: configurable
```

---

## 16. Dart Model Strategy

### 16.1 Small Project

Manual JSON models are acceptable for early MVP.

### 16.2 Medium/Large Project

Use code generation for JSON serialization when models grow.

Recommended direction:

```txt
json_serializable + build_runner
```

### 16.3 Model Rule

```txt
Do not pass raw Map<String, dynamic> throughout the app.
Decode API responses into typed models.
```

### 16.4 Example Model

```dart
class SiteBootstrap {
  const SiteBootstrap({
    required this.siteName,
    required this.locale,
    required this.timezone,
    required this.features,
  });

  final String siteName;
  final String locale;
  final String timezone;
  final Map<String, bool> features;

  factory SiteBootstrap.fromJson(Map<String, dynamic> json) {
    final site = json['site'] as Map<String, dynamic>;
    return SiteBootstrap(
      siteName: site['name'] as String,
      locale: site['locale'] as String,
      timezone: site['timezone'] as String,
      features: Map<String, bool>.from(json['features'] as Map),
    );
  }
}
```

---

## 17. Flutter API Client Example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class AwcmsApiException implements Exception {
  AwcmsApiException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => 'AwcmsApiException($code): $message';
}

class AwcmsApiClient {
  AwcmsApiClient({
    required this.baseUrl,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<Map<String, dynamic>> getJson(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _httpClient.get(
      uri,
      headers: {
        'Accept': 'application/json',
      },
    ).timeout(const Duration(seconds: 20));

    return _decodeResponse(response);
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body,
  ) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _httpClient
        .post(
          uri,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 30));

    return _decodeResponse(response);
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    final success = decoded['success'] == true;

    if (!success) {
      final error = decoded['error'] as Map<String, dynamic>?;
      throw AwcmsApiException(
        error?['code'] as String? ?? 'UNKNOWN_ERROR',
        error?['message'] as String? ?? 'Unknown error',
      );
    }

    return decoded;
  }

  void close() {
    _httpClient.close();
  }
}
```

---

## 18. SDK Endpoint Classes

### 18.1 Bootstrap API

```dart
class BootstrapApi {
  BootstrapApi(this._client);

  final AwcmsApiClient _client;

  Future<Map<String, dynamic>> fetchBootstrap() async {
    final response = await _client.getJson('/api/mobile/v1/bootstrap');
    return response['data'] as Map<String, dynamic>;
  }
}
```

### 18.2 Posts API

```dart
class PostsApi {
  PostsApi(this._client);

  final AwcmsApiClient _client;

  Future<List<dynamic>> fetchPosts({String? cursor, int limit = 20}) async {
    final query = <String, String>{
      'limit': '$limit',
      if (cursor != null) 'cursor': cursor,
    };

    final uri = Uri(path: '/api/mobile/v1/posts', queryParameters: query);
    final response = await _client.getJson(uri.toString());
    return response['data'] as List<dynamic>;
  }
}
```

### 18.3 Kelulusan API

```dart
class KelulusanApi {
  KelulusanApi(this._client);

  final AwcmsApiClient _client;

  Future<Map<String, dynamic>> verify({
    required String nisn,
    String? birthDate,
  }) async {
    final response = await _client.postJson(
      '/api/mobile/v1/kelulusan/verify',
      {
        'nisn': nisn,
        if (birthDate != null) 'birthDate': birthDate,
      },
    );

    return response['data'] as Map<String, dynamic>;
  }

  Future<String> requestDownloadUrl({
    required String downloadSessionId,
  }) async {
    final response = await _client.postJson(
      '/api/mobile/v1/kelulusan/download-url',
      {
        'downloadSessionId': downloadSessionId,
      },
    );

    final data = response['data'] as Map<String, dynamic>;
    return data['downloadUrl'] as String;
  }
}
```

---

## 19. State Management Strategy

### 19.1 Simple MVP

For simple MVP:

```txt
ValueNotifier
ChangeNotifier
FutureBuilder
```

### 19.2 Scalable App

For larger Flutter apps, use a structured state management solution.

Recommended options:

```txt
Riverpod
Bloc
Provider
```

### 19.3 State Rule

```txt
Keep network/data logic out of UI widgets.
Use repositories/services between UI and SDK.
```

### 19.4 Repository Pattern

```txt
UI Widget
  ↓
Controller / State Notifier
  ↓
Repository
  ↓
AWCMS SDK
  ↓
Mobile API
```

---

## 20. Offline Cache Strategy

### 20.1 What to Cache

Cache safely:

```txt
bootstrap
menus
published posts
published announcements
public documents metadata
homepage data
```

Do not cache casually:

```txt
private document signed URLs
Kelulusan verification result
access tokens without secure storage
sensitive form submissions
raw private PDF files
```

### 20.2 Cache Storage Options

Simple:

```txt
SharedPreferences for non-sensitive small config
```

Better structured local cache:

```txt
Hive
Isar
SQLite / Drift
```

Sensitive tokens:

```txt
secure storage
```

### 20.3 Cache Expiration

Recommended:

| Data | Cache Duration |
| --- | ---: |
| bootstrap | 5–30 minutes |
| menus | 30 minutes–24 hours |
| posts list | 5–30 minutes |
| announcements | 5–15 minutes |
| public documents metadata | 10–60 minutes |
| Kelulusan result | no persistent cache by default |
| signed URL | no persistent cache |

### 20.4 Offline Behavior

When offline:

```txt
show cached public content
show offline indicator
queue non-sensitive actions only if safe
avoid retry loops
never submit forms silently without user awareness
```

---

## 21. Forms from Flutter

### 21.1 Form Definition Flow

```txt
GET /api/mobile/v1/forms/contact
  ↓
Flutter renders fields dynamically or uses fixed UI
  ↓
User submits form
  ↓
POST /api/mobile/v1/forms/contact/submissions
```

### 21.2 Form Submission Payload

```json
{
  "fields": {
    "name": "Example User",
    "email": "user@example.com",
    "message": "Hello"
  },
  "consent": true,
  "client": {
    "platform": "android",
    "appVersion": "1.0.0"
  }
}
```

### 21.3 Form Security

Flutter forms should:

```txt
validate locally for UX
still rely on server validation for security
show privacy notice
require consent when configured
handle spam protection flow if enabled
handle retry carefully
```

---

## 22. Kelulusan Integration in Flutter

### 22.1 Kelulusan Screen Flow

```txt
Open Kelulusan screen
  ↓
Fetch event/status
  ↓
Show release information
  ↓
User enters NISN and optional birth date
  ↓
Submit verify request
  ↓
Show safe loading state
  ↓
Show result or safe error
  ↓
If PDF available, request signed download URL
  ↓
Open PDF in browser/PDF viewer
```

### 22.2 UX Rules

```txt
show release time clearly
show privacy notice
show safe failed message
avoid showing too much personal data
avoid storing result permanently
clear result on app close if required
```

### 22.3 Kelulusan Failure Handling

Map errors:

| API Code | UI Message |
| --- | --- |
| VALIDATION_ERROR | Check the entered data. |
| RATE_LIMITED | Too many attempts. Please try again later. |
| NOT_FOUND | Data not found or not yet available. |
| MAINTENANCE_MODE | Service is temporarily unavailable. |
| SERVER_UNAVAILABLE | Server is unavailable. Please try again later. |

---

## 23. File Download Strategy in Flutter

### 23.1 Public Documents

Public document URLs may be opened in browser or in-app viewer.

### 23.2 Private Signed URLs

Private signed URLs should:

```txt
be requested only when user clicks download
not be stored permanently
not be shared in logs
expire quickly
```

### 23.3 PDF Viewing Options

Options:

```txt
open external browser
open external PDF viewer
use in-app PDF viewer package after security review
```

### 23.4 Download Rule

```txt
Do not download and persist private PDFs by default unless the privacy policy and app security model allow it.
```

---

## 24. Flutter Security Requirements

### 24.1 Never Store Secrets in App

Do not include:

```txt
Cloudflare API token
R2 credentials
database URL
JWT signing secret
service-role keys
admin token
```

### 24.2 API Base URL

Safe to include:

```txt
public API base URL
public site URL
public Turnstile site key if needed
```

### 24.3 Logging Rule

Do not log:

```txt
access token
refresh token
NISN
birth date
signed URL
private document URL
raw form personal data
```

### 24.4 Transport Rule

Use HTTPS only in production.

---

## 25. Flutter Testing Strategy

### 25.1 SDK Unit Tests

Test:

```txt
response decoding
error decoding
bootstrap parsing
post parsing
announcement parsing
document parsing
Kelulusan verification response parsing
network timeout handling
```

### 25.2 Repository Tests

Test:

```txt
fetch posts success
fetch posts error
cache fallback
Kelulusan safe error mapping
form submission validation
```

### 25.3 Widget Tests

Test:

```txt
home screen loading/success/error
news list rendering
announcement list rendering
documents list rendering
contact form validation
Kelulusan form validation
Kelulusan result screen
```

### 25.4 Integration Tests

Test:

```txt
app bootstrap loads
news list opens detail
form submission flow works against staging
Kelulusan invalid data shows safe message
Kelulusan valid staging fixture returns expected result
```

### 25.5 Contract Tests

Backend and Flutter SDK must agree on:

```txt
response shape
error codes
field names
pagination format
Kelulusan result format
form submission format
```

---

## 26. Backend Test Requirements for Mobile API

Test:

```txt
bootstrap returns valid JSON
posts exclude drafts/private/deleted content
announcements exclude expired/deleted content
documents exclude private documents
forms validate server-side
Kelulusan verify does not expose raw NISN
Kelulusan download-url requires session
rate limiting works
maintenance mode returns expected error
```

---

## 27. CI/CD for Flutter Client

Recommended checks:

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

For release:

```bash
flutter build apk --release
flutter build appbundle --release
flutter build ios --release
```

Use actual platform needs.

### 27.1 CI Notes

CI should:

```txt
not include production secrets
use staging API for integration tests
run contract tests before release
separate debug/staging/production flavors
```

---

## 28. Flutter Flavors / Environments

Recommended flavors:

```txt
dev
staging
production
```

Configuration:

```txt
API_BASE_URL
APP_NAME
ENVIRONMENT
```

Rules:

```txt
production app points only to production API
staging app points only to staging API
never ship debug logging in production
```

---

## 29. Mobile Release Checklist

Before mobile release:

```txt
[ ] API contract stable
[ ] backend staging tested
[ ] Flutter analyze passes
[ ] Flutter tests pass
[ ] integration tests pass where possible
[ ] no secrets in app
[ ] no sensitive logs
[ ] privacy policy linked
[ ] app handles offline state
[ ] app handles maintenance mode
[ ] app handles rate limit errors
[ ] app points to correct production API
[ ] version number updated
```

---

## 30. Practical Implementation Examples

### Example 1 — School News App

Features:

```txt
bootstrap
latest news
announcement list
public documents
contact form
```

No login required.

### Example 2 — School Kelulusan App

Features:

```txt
Kelulusan status
NISN verification
safe result display
signed PDF download
rate limit message
privacy notice
```

No persistent Kelulusan result cache.

### Example 3 — Company Profile App

Features:

```txt
services
portfolio
blog
contact form
lead submission
```

CRM integration stays on backend, not in app.

### Example 4 — Government Portal App

Features:

```txt
public announcements
service information
public documents
complaint form
public contact
```

Citizen submissions must be protected.

### Example 5 — Future Authenticated Member App

Features:

```txt
login
profile
own documents
notifications
form history
logout
session revocation
```

Requires token/session strategy and ABAC.

---

## 31. GitHub Issues for Part 12

### Issue 1 — Define Mobile API Contract

```md
## Goal
Define stable Mobile API v1 contract for AWCMS-Micro.

## Tasks
- [ ] Define response shape
- [ ] Define error shape
- [ ] Define pagination shape
- [ ] Define error codes
- [ ] Define MVP endpoints
- [ ] Define versioning rule

## Acceptance Criteria
- [ ] docs/mobile-api.md updated
- [ ] response contract is consistent
- [ ] error codes are documented

## Rollback Plan
Revert API contract documentation or keep previous v1 contract.
```

### Issue 2 — Add Mobile API Plugin Skeleton

```md
## Goal
Create or update the Mobile API plugin skeleton.

## Tasks
- [ ] Add packages/plugins/mobile-api
- [ ] Add module.manifest.json
- [ ] Add route placeholders
- [ ] Add bootstrap endpoint design
- [ ] Add posts/documents/forms endpoint design
- [ ] Add tests placeholder

## Acceptance Criteria
- [ ] Plugin skeleton exists
- [ ] It does not expose EmDash admin APIs
- [ ] Public content filtering rules are documented

## Rollback Plan
Disable mobile-api module.
```

### Issue 3 — Add Flutter SDK Package Skeleton

```md
## Goal
Create Flutter SDK package skeleton for AWCMS-Micro Mobile API.

## Tasks
- [ ] Add packages/flutter/awcms_micro_client
- [ ] Add pubspec.yaml
- [ ] Add API client
- [ ] Add response/error models
- [ ] Add endpoint classes
- [ ] Add tests folder

## Acceptance Criteria
- [ ] SDK structure exists
- [ ] SDK is domain-neutral
- [ ] No secrets are included

## Rollback Plan
Remove SDK package skeleton.
```

### Issue 4 — Add Flutter School App Skeleton

```md
## Goal
Create optional Flutter school app skeleton.

## Tasks
- [ ] Add apps/flutter/school_app
- [ ] Add feature-first folder structure
- [ ] Add app config strategy
- [ ] Add bootstrap feature placeholder
- [ ] Add news/documents/forms/Kelulusan feature placeholders

## Acceptance Criteria
- [ ] App skeleton exists
- [ ] API base URL is configurable
- [ ] No production secrets are included

## Rollback Plan
Remove app skeleton.
```

### Issue 5 — Add Kelulusan Mobile Integration Plan

```md
## Goal
Define Kelulusan integration for mobile app.

## Tasks
- [ ] Define status endpoint
- [ ] Define verify endpoint
- [ ] Define download-url endpoint
- [ ] Define safe error mapping
- [ ] Define privacy and cache rules
- [ ] Define tests

## Acceptance Criteria
- [ ] Mobile Kelulusan flow is documented
- [ ] No raw NISN or signed URL is logged/stored
- [ ] Rate limit and maintenance behavior are handled

## Rollback Plan
Disable Kelulusan mobile feature flag.
```

### Issue 6 — Add Mobile API and Flutter Testing Plan

```md
## Goal
Define tests for backend Mobile API and Flutter SDK/app.

## Tasks
- [ ] Add backend API tests
- [ ] Add SDK unit tests
- [ ] Add repository tests
- [ ] Add widget tests
- [ ] Add integration tests
- [ ] Add contract tests

## Acceptance Criteria
- [ ] Testing plan exists
- [ ] API contract tests are defined
- [ ] Private content leak tests are included

## Rollback Plan
Mark tests pending or block release until tests are implemented.
```

---

## 32. OpenCode / Antigravity Implementation Prompt for Part 12

```txt
You are an expert Dart, Flutter, TypeScript, Astro, EmDash, AWCMS-Micro, mobile API, SDK architecture, security, privacy, and testing implementation agent.

TASK:
Implement Part 12 of the AWCMS-Micro documentation: Mobile API SDK and Flutter Client Integration.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Official Flutter documentation: https://docs.flutter.dev/
- Official Dart documentation: https://dart.dev/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun
- Existing project docs Parts 1–11

RULES:
1. Read AGENTS.md first.
2. Read docs/architecture.md, docs/mobile-api.md, docs/security.md, docs/privacy.md, docs/abac.md, docs/storage.md, docs/kelulusan.md, docs/testing.md, and docs/deployment.md.
3. Treat EmDash upstream as the architectural authority.
4. Treat the SMAN 2 repository as a reference implementation only.
5. Do not expose EmDash admin APIs directly to mobile apps.
6. Do not modify EmDash core.
7. Do not commit secrets, service keys, database files, uploaded files, real student data, raw NISN, or private PDFs.
8. Use GitHub Issues for non-trivial work.
9. Create a dedicated branch before implementation.
10. Make atomic changes.
11. Run validation before completion.
12. Preserve API contract compatibility.

GOAL:
Create the Mobile API v1 contract, Mobile API plugin skeleton, Flutter SDK package skeleton, optional school app structure, Kelulusan mobile integration plan, and test plan.

PHASE 0 — DISCOVERY
- Inspect git status and remotes.
- Read AGENTS.md.
- Inspect existing mobile-api plugin if present.
- Inspect current Flutter/mobile folders if present.
- Inspect docs Parts 1–11.
- Summarize compatibility, privacy, and API contract risks.

PHASE 1 — ISSUES
Create or update these GitHub Issues:
1. Define Mobile API Contract
2. Add Mobile API Plugin Skeleton
3. Add Flutter SDK Package Skeleton
4. Add Flutter School App Skeleton
5. Add Kelulusan Mobile Integration Plan
6. Add Mobile API and Flutter Testing Plan

PHASE 2 — BRANCH
Create branch:
feat/add-mobile-api-flutter-integration-baseline

PHASE 3 — DOCUMENTATION
Create or update:
- docs/mobile-api.md
- docs/flutter-client.md
- docs/mobile-sdk.md
- docs/kelulusan.md
- docs/testing.md
- docs/security.md
- docs/privacy.md

PHASE 4 — MOBILE API CONTRACT
Document:
- success response
- list response
- error response
- error codes
- pagination
- endpoint list
- versioning rules
- public content filtering rules

PHASE 5 — MOBILE API PLUGIN
Create or update:
- packages/plugins/mobile-api/README.md
- packages/plugins/mobile-api/module.manifest.json
- packages/plugins/mobile-api/src placeholders
- route placeholders for bootstrap/posts/announcements/documents/forms/Kelulusan
- tests placeholder

PHASE 6 — FLUTTER SDK
Create if appropriate:
- packages/flutter/awcms_micro_client/pubspec.yaml
- lib/awcms_micro_client.dart
- lib/src/awcms_api_client.dart
- lib/src/awcms_response.dart
- lib/src/awcms_error.dart
- endpoint classes placeholders
- model placeholders
- tests placeholders

PHASE 7 — FLUTTER APP SKELETON
Create if appropriate:
- apps/flutter/school_app/pubspec.yaml
- lib/main.dart
- lib/app.dart
- core folders
- features/bootstrap
- features/news
- features/announcements
- features/documents
- features/forms
- features/kelulusan

PHASE 8 — KELULUSAN MOBILE FLOW
Document or implement placeholders for:
- status endpoint
- verify endpoint
- download-url endpoint
- safe error mapping
- no persistent cache rule
- no raw NISN/signed URL logging rule

PHASE 9 — TEST PLAN
Add tests or test docs for:
- backend Mobile API
- Flutter SDK response parsing
- Flutter repository behavior
- Flutter widgets
- integration tests
- contract tests
- private content leak tests

PHASE 10 — VALIDATION
Run relevant checks:
Backend:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

Flutter, if Flutter project exists:
- flutter pub get
- flutter analyze
- flutter test

If scripts/tools are missing, document what is pending.

PHASE 11 — COMMIT
Commit:
feat: add mobile API and Flutter integration baseline

PHASE 12 — FINAL REPORT
Report:
1. issues created/updated
2. branch name
3. files changed
4. mobile API impact
5. Flutter impact
6. Kelulusan privacy impact
7. EmDash compatibility impact
8. validation results
9. risks
10. rollback plan
11. next recommended issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- modifying EmDash core
- exposing admin APIs to mobile app
- committing secrets or real student data
- storing raw NISN or private PDFs
- changing production Cloudflare resources
- running destructive migrations
- force pushing
```

---

## 33. Definition of Done for Part 12

Part 12 is complete when:

```txt
[ ] mobile API philosophy is documented
[ ] mobile architecture is defined
[ ] mobile API plugin responsibilities are defined
[ ] API versioning is defined
[ ] response contract is defined
[ ] MVP endpoints are defined
[ ] bootstrap endpoint is defined
[ ] public content filtering rules are defined
[ ] pagination is defined
[ ] security controls are defined
[ ] future auth/session strategy is defined
[ ] Flutter SDK package structure is defined
[ ] Flutter app structure is defined
[ ] networking strategy is defined
[ ] typed model strategy is defined
[ ] API client example exists
[ ] state management strategy is defined
[ ] offline cache strategy is defined
[ ] forms flow is defined
[ ] Kelulusan mobile flow is defined
[ ] file download strategy is defined
[ ] Flutter security rules are defined
[ ] testing strategy is defined
[ ] CI/CD and flavors are defined
[ ] mobile release checklist exists
[ ] GitHub Issues are prepared
[ ] OpenCode/Antigravity prompt exists
```

---

## 34. Recommended Next Part

Continue with:

```txt
Part 13 — AWCMS-Micro ERP-Ready Module Expansion Strategy
```

Part 13 should include:

- ERP-ready architecture without turning EmDash into Odoo;
- module boundaries;
- CRM, inventory, procurement, finance, HR as future modules;
- tenant and permission implications;
- data model isolation;
- integration with Odoo if needed;
- roadmap after website MVP;
- testing and rollback strategy;
- OpenCode implementation prompt.
