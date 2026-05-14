# AWCMS-Micro Implementation Documentation

## Part 2 — Repository Structure and Initial Implementation

**Document status:** Draft v0.1  
**Purpose:** Provide a practical, step-by-step implementation guide for starting a clean AWCMS-Micro standard website while remaining compatible with the original EmDash architecture.

---

## 1. Objective of Part 2

Part 2 translates the architecture and governance rules from Part 1 into an actionable implementation plan.

The goal is to create a clean AWCMS-Micro standard website repository that can be used for:

1. school websites;
2. company profile websites;
3. foundation websites;
4. government/public-sector portals;
5. landing pages;
6. secure document publication;
7. future mobile API-backed applications;
8. future AWCMS multi-tenant expansion.

The implementation must preserve this principle:

```txt
EmDash upstream remains the architectural authority.
AWCMS-Micro adds implementation, governance, plugins, modules, docs, and tests.
```

---

## 2. Starting Strategy

### 2.1 Recommended Development Mode

Use this development sequence:

```txt
1. Study official EmDash upstream.
2. Study the SMAN 2 AWCMS-Micro repository as reference only.
3. Create a clean AWCMS-Micro standard repository.
4. Add documentation first.
5. Add local development baseline.
6. Add standard public theme.
7. Add standard content model.
8. Add validation scripts.
9. Add tests.
10. Add Cloudflare deployment baseline.
```

### 2.2 Repository Roles

| Repository | Role | Rule |
| --- | --- | --- |
| `emdash-cms/emdash` | Canonical upstream | Follow architecture, standards, package boundaries |
| `awcms-micro-sman2pangkalanbun` | Reference implementation | Study and copy safe patterns only |
| `awcms-micro-standard` | New reusable base | Build clean, documented, reusable foundation |
| client-specific repo | Website implementation | Add branding, content, deployment, site-specific plugins |

### 2.3 Do Not Start by Editing the SMAN 2 Repo

The SMAN 2 repository is useful as a working example, but it should not become the universal base for all new websites.

Copy or adapt:

- documentation patterns;
- local demo pattern;
- Cloudflare deployment pattern;
- plugin organization ideas;
- Playwright/e2e testing approach;
- school website feature ideas.

Do not copy blindly:

- school branding;
- production Cloudflare IDs;
- student data;
- uploaded files;
- local database files;
- hardcoded domain names;
- one-off issue-specific fixes.

---

## 3. Initial Repository Name

Recommended standard repository name:

```txt
awcms-micro-standard
```

Alternative names:

```txt
awcms-micro-base
awcms-micro-starter
awcms-micro-template
awcms-micro-site-standard
```

Recommended final usage:

```txt
awcms-micro-standard       = reusable base
awcms-micro-school         = school-focused template
awcms-micro-company        = company profile template
awcms-micro-foundation     = foundation template
awcms-micro-govportal      = government portal template
```

---

## 4. Local Development Requirements

### 4.1 Required Tools

Minimum tools:

```txt
Node.js 22+
pnpm
Git
GitHub CLI or GitHub MCP
Code editor / Antigravity IDE
OpenCode extension
Astro 6+ (required for EmDash Live Collections)
```

Recommended tools:

```txt
Context7 MCP
GitHub MCP
EmDash Docs MCP (https://docs.emdashcms.com/docs-mcp/)
Cloudflare MCP
Playwright
Docker, optional for supporting services
```

### 4.3 EmDash Quick Start

To scaffold a new EmDash site directly (before adding AWCMS layers):

```bash
npm create emdash@latest
```

Or using an official template:

```bash
npm create astro@latest -- --template @emdash-cms/template-blog
```

The EmDash documentation index for AI tools is available at:

```txt
https://docs.emdashcms.com/llms.txt
```

### 4.2 Initial Environment Check

Run:

```bash
node -v
corepack --version
pnpm -v
git --version
```

Enable pnpm using Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

If the target repository uses a pinned pnpm version in `packageManager`, use that version.

---

## 5. Initial Directory Creation

### 5.1 Create Workspace

```bash
mkdir -p ~/dev/awcms
cd ~/dev/awcms
```

### 5.2 Clone SMAN 2 Reference Repository

```bash
git clone https://github.com/ahliweb/awcms-micro-sman2pangkalanbun awcms-micro-sman2-reference
```

Use it only for reading, comparison, and pattern extraction.

### 5.3 Create New Standard Repository

```bash
cd ~/dev/awcms
mkdir awcms-micro-standard
cd awcms-micro-standard
git init
```

### 5.4 Add EmDash Upstream Remote

```bash
git remote add upstream https://github.com/emdash-cms/emdash.git
git remote -v
```

If a GitHub repository already exists for the new project:

```bash
git remote add origin https://github.com/<organization>/awcms-micro-standard.git
```

---

## 6. Recommended Repository Structure

Create this structure first:

```txt
awcms-micro-standard/
  AGENTS.md
  README.md
  package.json
  pnpm-workspace.yaml
  .gitignore
  .env.example

  docs/
    architecture.md
    upstream-sync.md
    compatibility-matrix.md
    divergence-log.md
    security.md
    privacy.md
    tenancy.md
    storage.md
    modules.md
    mobile-api.md
    abac.md
    testing.md
    deployment.md
    rollback.md
    operations.md

  sites/
    main/
      README.md
      package.json
      astro.config.mjs
      src/
        live.config.ts
        pages/
          index.astro
        layouts/
          BaseLayout.astro
        components/
          Header.astro
          Footer.astro
        styles/
          global.css
      seed/
        site-settings.json
        menus.json
        pages.json
        posts.json
        documents.json

  packages/
    awcms/
      compatibility/
        README.md
      tenancy/
        README.md
      permissions/
        README.md
      audit/
        README.md
      module-registry/
        README.md
      theme-standard/
        README.md

    plugins/
      documents/
        README.md
      forms/
        README.md
      announcements/
        README.md
      audit-log/
        README.md
      mobile-api/
        README.md
      abac-matrix/
        README.md

  tests/
    compatibility/
      README.md
    e2e/
      README.md
    security/
      README.md

  scripts/
    validate.sh
    sync-upstream.sh
    seed-site.sh
```

---

## 7. Bootstrap Commands

Run:

```bash
mkdir -p docs
mkdir -p sites/main/src/{pages,layouts,components,styles}
mkdir -p sites/main/seed
mkdir -p packages/awcms/{compatibility,tenancy,permissions,audit,module-registry,theme-standard}
mkdir -p packages/plugins/{documents,forms,announcements,audit-log,mobile-api,abac-matrix}
mkdir -p tests/{compatibility,e2e,security}
mkdir -p scripts

touch AGENTS.md README.md package.json pnpm-workspace.yaml .gitignore .env.example

touch docs/{architecture,upstream-sync,compatibility-matrix,divergence-log,security,privacy,tenancy,storage,modules,mobile-api,abac,testing,deployment,rollback,operations}.md

touch sites/main/README.md sites/main/package.json sites/main/astro.config.mjs

touch sites/main/src/pages/index.astro

touch sites/main/src/layouts/BaseLayout.astro

touch sites/main/src/components/Header.astro sites/main/src/components/Footer.astro

touch sites/main/src/styles/global.css

touch sites/main/seed/{site-settings,menus,pages,posts,documents}.json

find packages -name README.md -type f -print
find tests -name README.md -type f -print

touch scripts/validate.sh scripts/sync-upstream.sh scripts/seed-site.sh
chmod +x scripts/*.sh
```

---

## 8. Root `AGENTS.md`

Create a root `AGENTS.md` to guide coding agents.

Recommended content:

```md
# AWCMS-Micro Agent Instructions

## Mission

Build AWCMS-Micro as an EmDash-compatible, single-tenant-first website system that is tenant-ready and future-ready for AWCMS multi-tenant expansion.

## Canonical References

1. Original EmDash repository: https://github.com/emdash-cms/emdash
2. Official EmDash documentation: https://docs.emdashcms.com/
3. EmDash docs index for AI tools: https://docs.emdashcms.com/llms.txt
4. EmDash MCP server for AI integration: https://docs.emdashcms.com/docs-mcp/
5. AWCMS-Micro reference implementation: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun

## Core Rules

- EmDash upstream is the architectural authority.
- AWCMS-Micro must not become a fragile fork.
- Do not modify EmDash core unless there is no safe extension path.
- Prefer configuration, plugins, modules, themes, adapters, docs, and tests.
- Document every divergence in `docs/divergence-log.md`.
- Preserve EmDash plugin and template compatibility.
- Keep tenant-readiness in AWCMS custom layers first.
- Do not force multi-tenancy into EmDash core prematurely.

## Required Workflow

1. Read this file before implementation.
2. Inspect related docs before changing code.
3. Create or update GitHub Issues for non-trivial work.
4. Create a dedicated branch for implementation.
5. Make atomic changes.
6. Run validation.
7. Commit and push.
8. Open or update PR.
9. Merge after validation.
10. Delete branch after merge.

## Required Validation

Run before completion:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If a script does not exist, inspect `package.json` and add or document the equivalent.

## Safety Rules

- Never commit secrets.
- Never commit `.env`.
- Never commit private uploaded files.
- Never modify production Cloudflare resources without explicit approval.
- Never run destructive database migrations without backup and rollback notes.
- Never expose admin APIs directly to public mobile applications.

```text

## Upstream Toolchain

- **pnpm** — package manager
- **oxfmt** — code formatting (tabs for indentation)
- **oxlint** — fast linting
- **vitest** — test runner
- **tsdown** — TypeScript builds (ESM + DTS)
- **Playwright** — end-to-end testing

---

## 9. Root `README.md`

Recommended initial content:

```md
# AWCMS-Micro Standard

AWCMS-Micro Standard is a clean EmDash-compatible implementation base for building single-tenant-first websites that are structurally prepared for future multi-tenancy and AWCMS ecosystem growth.

## Goals

- Follow original EmDash architecture.
- Preserve EmDash plugin and template compatibility.
- Provide AWCMS governance for security, tenancy, modules, storage, audit logging, and future expansion.
- Support standard websites for schools, companies, foundations, government portals, landing pages, and secure document publication.

## Core Principle

```txt
EmDash upstream is the architectural authority.
AWCMS-Micro is the governed implementation layer.
```

## Repository Structure

```txt
docs/              Architecture, security, deployment, governance
sites/main/         Main standard website implementation
packages/awcms/     AWCMS compatibility and governance packages
packages/plugins/   AWCMS-Micro plugins
tests/              Compatibility, e2e, and security tests
scripts/            Validation and operational scripts
```

## Development

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Documentation

Start with:

- `docs/architecture.md`
- `docs/upstream-sync.md`
- `docs/compatibility-matrix.md`
- `docs/security.md`
- `docs/modules.md`

---

## 10. Root `package.json` Strategy

### 10.1 Initial Minimal `package.json`

Use this only as a starter and adjust after inspecting EmDash upstream package conventions.

```json
{
  "name": "awcms-micro-standard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.28.0",
  "scripts": {
    "dev": "pnpm --filter @awcms-micro/site-main dev",
    "build": "pnpm --filter @awcms-micro/site-main build",
    "preview": "pnpm --filter @awcms-micro/site-main preview",
    "lint": "echo \"TODO: configure lint\"",
    "typecheck": "echo \"TODO: configure typecheck\"",
    "test": "echo \"TODO: configure tests\"",
    "test:e2e": "echo \"TODO: configure Playwright\"",
    "validate": "./scripts/validate.sh"
  },
  "devDependencies": {}
}
```

### 10.2 Rule

Do not keep placeholder scripts forever. Replace them with real project scripts as soon as the local baseline is configured.

---

## 11. `pnpm-workspace.yaml`

Recommended starter:

```yaml
packages:
  - "sites/*"
  - "packages/awcms/*"
  - "packages/plugins/*"
```

---

## 12. `.gitignore`

Recommended starter:

```gitignore
# dependencies
node_modules/
.pnpm-store/

# build output
dist/
.output/
.astro/
.vercel/
.netlify/

# local env
.env
.env.*
!.env.example

# local databases
*.db
*.db-shm
*.db-wal

# local uploads
uploads/
media/

# logs
*.log
npm-debug.log*
pnpm-debug.log*

# OS/editor
.DS_Store
.idea/
.vscode/

# Cloudflare local state
.wrangler/
.dev.vars
```

Important:

```txt
Never commit private uploads, real databases, production secrets, or `.dev.vars`.
```

---

## 13. `.env.example`

Recommended starter:

```env
# Application
NODE_ENV=development
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_SITE_NAME="AWCMS-Micro Standard"

# EmDash / CMS
# EmDash uses config-based adapters in astro.config.mjs, not env vars.
# Database and storage are configured via emdash() integration options.
# See: https://docs.emdashcms.com/reference/configuration/

# AWCMS tenant defaults
AWCMS_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
AWCMS_DEFAULT_TENANT_CODE=default
AWCMS_DEFAULT_SITE_ID=main

# Cloudflare production placeholders
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_KV_NAMESPACE_ID=

# OAuth providers (optional, for EmDash auth)
# EMDASH_OAUTH_GITHUB_CLIENT_ID=
# EMDASH_OAUTH_GITHUB_CLIENT_SECRET=
# EMDASH_OAUTH_GOOGLE_CLIENT_ID=
# EMDASH_OAUTH_GOOGLE_CLIENT_SECRET=
```

---

## 14. Site Package: `sites/main/package.json`

Recommended initial shape:

```json
{
  "name": "@awcms-micro/site-main",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev --host 127.0.0.1 --port 4321",
    "build": "astro build",
    "preview": "astro preview --host 127.0.0.1 --port 4321",
    "typecheck": "astro check"
  },
  "dependencies": {
    "@astrojs/node": "^10.0.0",
    "@astrojs/react": "^5.0.0",
    "astro": "^6.0.1",
    "emdash": "latest",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {}
}
```

After inspecting upstream EmDash package names and import paths, add the correct EmDash dependencies according to the official project structure.

---

## 15. Site Config: `sites/main/astro.config.mjs`

Initial conceptual pattern:

```js
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    react(),
    emdash({
      database: sqlite({ url: "file:./data.db" }),
      storage: local({
        directory: "./uploads",
        baseUrl: "/_emdash/api/media/file",
      }),
      plugins: [],
    }),
  ],
  devToolbar: {
    enabled: false,
  },
});
```

### 15.2 Live Collections Config: `sites/main/src/live.config.ts`

EmDash uses Astro 6 Live Collections for runtime content access. Create:

```ts
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({
    loader: emdashLoader(),
  }),
};
```

Implementation rule:

```txt
Import EmDash integration from "emdash/astro".
Import database adapters from "emdash/db".
Import storage adapters (local, r2, s3) from "emdash/astro".
For Cloudflare D1, import from "@emdash-cms/cloudflare".
Do not guess EmDash import paths if the upstream package changed.
Inspect official EmDash docs and the reference repositories first.
```

---

## 16. Initial Public Theme Files

### 16.1 `sites/main/src/layouts/BaseLayout.astro`

```astro
---
import "../styles/global.css";
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";

const {
  title = "AWCMS-Micro Standard",
  description = "A standard EmDash-compatible AWCMS-Micro website.",
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

### 16.2 `sites/main/src/components/Header.astro`

```astro
---
const siteName = "AWCMS-Micro Standard";
---

<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="brand">{siteName}</a>
    <nav aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/news">News</a>
      <a href="/documents">Documents</a>
      <a href="/contact">Contact</a>
    </nav>
  </div>
</header>
```

### 16.3 `sites/main/src/components/Footer.astro`

```astro
<footer class="site-footer">
  <div class="container">
    <p>Built with AWCMS-Micro based on EmDash.</p>
  </div>
</footer>
```

### 16.4 `sites/main/src/pages/index.astro`

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout
  title="AWCMS-Micro Standard"
  description="A clean EmDash-compatible AWCMS-Micro standard website."
>
  <section class="hero">
    <div class="container">
      <p class="eyebrow">AWCMS-Micro Standard</p>
      <h1>Build standard websites while staying compatible with EmDash.</h1>
      <p>
        A clean foundation for schools, companies, foundations, government portals,
        landing pages, and future mobile API-backed applications.
      </p>
      <div class="hero-actions">
        <a href="/about" class="button">Learn More</a>
        <a href="/_emdash/admin" class="button button-secondary">Open Admin</a>
      </div>
    </div>
  </section>
</BaseLayout>
```

### 16.5 `sites/main/src/styles/global.css`

```css
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
  --color-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --container: 1120px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

a {
  color: inherit;
  text-decoration: none;
}

.container {
  width: min(100% - 2rem, var(--container));
  margin-inline: auto;
}

.site-header,
.site-footer {
  border-bottom: 1px solid var(--color-border);
}

.site-footer {
  border-top: 1px solid var(--color-border);
  border-bottom: 0;
  padding: 2rem 0;
  color: var(--color-muted);
}

.header-inner {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.brand {
  font-weight: 700;
}

nav {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: var(--color-muted);
}

.hero {
  padding: 6rem 0;
}

.hero h1 {
  max-width: 760px;
  font-size: clamp(2.25rem, 6vw, 4.75rem);
  line-height: 1;
  letter-spacing: -0.05em;
  margin: 0 0 1.5rem;
}

.hero p {
  max-width: 680px;
  color: var(--color-muted);
  font-size: 1.125rem;
}

.eyebrow {
  color: var(--color-primary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.875rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.875rem 1.25rem;
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 700;
}

.button:hover {
  background: var(--color-primary-dark);
}

.button-secondary {
  background: #f3f4f6;
  color: var(--color-text);
}

.button-secondary:hover {
  background: #e5e7eb;
}
```

---

## 17. Initial Documentation Files

### 17.1 `docs/architecture.md`

```md
# Architecture

AWCMS-Micro Standard is an EmDash-compatible website implementation base.

## Principle

EmDash upstream is the architectural authority. AWCMS-Micro adds governance, templates, modules, plugins, tenancy readiness, and operational discipline.

## Layers

1. EmDash upstream
2. AWCMS compatibility layer
3. AWCMS modules and plugins
4. Website implementation
5. Cloudflare deployment profile

## Non-goals for MVP

- full ERP
- billing
- marketplace publishing
- complex workflow
- full visual builder
- forced shared-database multi-tenancy
```

### 17.2 `docs/upstream-sync.md`

```md
# EmDash Upstream Sync Policy

## Upstream

https://github.com/emdash-cms/emdash

## Sync Questions

Every sync must answer:

1. What changed upstream?
2. What affects AWCMS-Micro?
3. Does it affect plugin API?
4. Does it affect marketplace compatibility?
5. Does it affect admin manifest?
6. Does it affect storage/media?
7. Does it affect authentication or permissions?
8. Does it affect content schema or migrations?
9. Does it affect templates or seed files?
10. Decision: adopt, adapt, delay, or reject?

## Validation

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

### 17.3 `docs/divergence-log.md`

```md
# Divergence Log

| Date | Area | Upstream Behavior | AWCMS-Micro Behavior | Reason | Risk | Rollback |
|---|---|---|---|---|---|---|
| 2026-05-05 | Initial | Follow EmDash | No divergence yet | New standard base | Low | N/A |
```

### 17.4 `docs/compatibility-matrix.md`

```md
# Compatibility Matrix

| Area | Compatibility Target | Status | Risk | Test |
|---|---|---|---|---|
| EmDash core | Latest upstream | Pending | Medium | Build/test |
| Admin UI | Manifest-driven admin works | Pending | High | Admin smoke test |
| Native plugins | Plugins load | Pending | High | Plugin load test |
| Marketplace plugins | Sandbox/capability model preserved | Pending | High | Marketplace test |
| Templates | Official templates usable | Pending | Medium | Template seed test |
| Storage | Local and R2/S3 work | Pending | High | Upload/download test |
| Content schema | Collections and fields work | Pending | High | CRUD test |
| Soft delete | Soft delete works as expected | Pending | Medium | Delete/restore test |
| ABAC overlay | Does not break EmDash permissions | Pending | High | Effective access test |
```

---

## 18. Validation Script

Create `scripts/validate.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

run_if_available() {
  local script="$1"
  if pnpm run | grep -q "^  $script"; then
    echo "Running pnpm $script..."
    pnpm "$script"
  else
    echo "Skipping pnpm $script because it is not configured."
  fi
}

echo "Starting AWCMS-Micro validation..."

run_if_available "lint"
run_if_available "typecheck"
run_if_available "test"
run_if_available "build"

if pnpm run | grep -q "^  test:e2e"; then
  echo "E2E script is available. Run manually when browser/test environment is ready: pnpm test:e2e"
fi

echo "Validation completed."
```

Important:

```txt
Once real scripts exist, update this script to call them explicitly and fail clearly.
```

---

## 19. Upstream Sync Script

Create `scripts/sync-upstream.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REMOTE="upstream"
UPSTREAM_BRANCH="main"

if ! git remote | grep -q "^${UPSTREAM_REMOTE}$"; then
  echo "Missing upstream remote. Add it with:"
  echo "git remote add upstream https://github.com/emdash-cms/emdash.git"
  exit 1
fi

echo "Fetching EmDash upstream..."
git fetch "$UPSTREAM_REMOTE"

echo "Current branch:"
git branch --show-current

echo "Latest upstream commit:"
git log --oneline -1 "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"

echo "Review upstream changes before merging."
echo "Suggested next step:"
echo "git checkout -b sync/emdash-YYYY-MM-DD"
echo "git merge $UPSTREAM_REMOTE/$UPSTREAM_BRANCH"
echo "Then update docs/divergence-log.md and docs/compatibility-matrix.md"
```

---

## 20. Seed Strategy

### 20.1 Seed Folder

Use:

```txt
sites/main/seed/
  site-settings.json
  menus.json
  pages.json
  posts.json
  documents.json
```

### 20.2 `site-settings.json`

```json
{
  "siteName": "AWCMS-Micro Standard",
  "tagline": "EmDash-compatible website foundation",
  "locale": "en-US",
  "timezone": "Asia/Jakarta",
  "defaultTenant": {
    "id": "00000000-0000-0000-0000-000000000001",
    "code": "default",
    "name": "Default Tenant"
  }
}
```

### 20.3 `menus.json`

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

### 20.4 Rule

Seed data must be:

- non-sensitive;
- reusable;
- client-neutral;
- safe for public repository;
- replaceable by site-specific seed files later.

---

## 21. GitHub Issues for Initial Implementation

### Issue 1 — Initialize AWCMS-Micro Standard Repository

```md
## Goal
Create a clean EmDash-compatible AWCMS-Micro standard repository structure.

## Scope
Repository skeleton only. No advanced features.

## Tasks
- Add root AGENTS.md
- Add README.md
- Add package.json
- Add pnpm-workspace.yaml
- Add .gitignore
- Add .env.example
- Add docs folder
- Add sites/main folder
- Add packages/awcms folder
- Add packages/plugins folder
- Add tests folder
- Add scripts folder

## Validation
- Repository structure exists
- No private data committed
- No production secrets committed
- Initial commit created

## Rollback
Revert the initialization commit.
```

### Issue 2 — Add EmDash Compatibility Documentation

```md
## Goal
Document how this repository preserves compatibility with original EmDash.

## Tasks
- Add docs/architecture.md
- Add docs/upstream-sync.md
- Add docs/compatibility-matrix.md
- Add docs/divergence-log.md
- Add docs/rollback.md

## Validation
- Upstream sync policy is clear
- Divergence log format exists
- Compatibility matrix exists

## Rollback
Revert documentation commit.
```

### Issue 3 — Add Local Development Baseline

```md
## Goal
Prepare a local EmDash-compatible website baseline.

## Tasks
- Add sites/main/package.json
- Add sites/main/astro.config.mjs
- Add BaseLayout
- Add Header and Footer
- Add homepage
- Add global CSS
- Confirm local development command

## Validation
- pnpm install works
- pnpm dev starts local site
- homepage loads
- no EmDash core modifications

## Rollback
Revert local baseline branch.
```

### Issue 4 — Add Standard Seed Strategy

```md
## Goal
Create safe, reusable starter seed files.

## Tasks
- Add site-settings.json
- Add menus.json
- Add pages.json
- Add posts.json
- Add documents.json
- Document seed policy

## Validation
- Seed data contains no private data
- Seed structure is reusable
- Tenant default is documented

## Rollback
Revert seed files.
```

### Issue 5 — Add Validation Script

```md
## Goal
Add repeatable validation process.

## Tasks
- Add scripts/validate.sh
- Add validate script to package.json
- Document required validation commands

## Validation
- ./scripts/validate.sh runs
- Missing scripts are handled clearly
- Future real scripts can replace placeholders

## Rollback
Revert validation script commit.
```

### Issue 6 — Add Playwright Smoke Test Plan

```md
## Goal
Define e2e smoke tests for standard website behavior.

## Tasks
- Add tests/e2e/README.md
- Define homepage test
- Define admin route test
- Define content page test
- Define media/upload test placeholder
- Define form submission test placeholder

## Validation
- Test plan exists
- Future Playwright implementation can follow it

## Rollback
Revert e2e docs commit.
```

### Issue 7 — Add Cloudflare Deployment Baseline

```md
## Goal
Prepare deployment documentation without touching production resources.

## Tasks
- Add docs/deployment.md
- Add Cloudflare Workers notes
- Add D1 notes
- Add R2 notes
- Add KV notes
- Add .env.example placeholders
- Add rollback checklist

## Validation
- No production resource is modified
- No secrets committed
- Deployment plan is clear

## Rollback
Revert deployment docs commit.
```

---

## 22. Branch Workflow

### 22.1 Initial Branches

Use these branches:

```txt
chore/init-awcms-micro-standard
docs/add-emdash-compatibility-docs
feat/add-local-development-baseline
docs/add-seed-strategy
chore/add-validation-script
test/add-smoke-test-plan
docs/add-cloudflare-deployment-baseline
```

### 22.2 Standard Branch Procedure

```bash
git status
git checkout -b chore/init-awcms-micro-standard
# make changes
git add .
git commit -m "chore: initialize AWCMS-Micro standard repository"
git push -u origin chore/init-awcms-micro-standard
```

After PR merge:

```bash
git checkout main
git pull origin main
git branch -d chore/init-awcms-micro-standard
git push origin --delete chore/init-awcms-micro-standard
```

### 22.3 Rule

Do not merge until:

- related issue exists;
- branch is pushed;
- validation is run;
- PR description explains changes;
- no secrets/private files are included;
- EmDash compatibility impact is documented.

---

## 23. Initial Commit Plan

### Commit 1

```txt
chore: initialize AWCMS-Micro standard repository structure
```

Includes:

- root files;
- docs folder;
- sites/main folder;
- packages folders;
- tests folders;
- scripts folder.

### Commit 2

```txt
docs: add EmDash compatibility governance baseline
```

Includes:

- architecture;
- upstream sync;
- compatibility matrix;
- divergence log.

### Commit 3

```txt
feat: add standard public website shell
```

Includes:

- BaseLayout;
- Header;
- Footer;
- homepage;
- global CSS.

### Commit 4

```txt
docs: add seed strategy and default tenant configuration
```

Includes:

- seed JSON files;
- default tenant information.

### Commit 5

```txt
chore: add validation script
```

Includes:

- scripts/validate.sh;
- package script.

---

## 24. Local Development Baseline Checklist

The first local baseline is complete when:

```txt
[ ] repository structure exists
[ ] AGENTS.md exists
[ ] README.md exists
[ ] upstream remote exists
[ ] docs/architecture.md exists
[ ] docs/upstream-sync.md exists
[ ] docs/compatibility-matrix.md exists
[ ] docs/divergence-log.md exists
[ ] sites/main exists
[ ] homepage file exists
[ ] base layout exists
[ ] header/footer exist
[ ] global CSS exists
[ ] seed files exist
[ ] scripts/validate.sh exists
[ ] .env.example exists
[ ] .gitignore excludes secrets and local databases
[ ] initial GitHub Issues exist
[ ] implementation branch exists
[ ] first commit is created
```

---

## 25. OpenCode / Antigravity Implementation Prompt

Use this prompt inside OpenCode in Antigravity IDE.

```txt
You are an expert TypeScript, Astro, EmDash, AWCMS-Micro, security, and Cloudflare implementation agent.

TASK:
Implement Part 2 of the AWCMS-Micro documentation: Repository Structure and Initial Implementation.

CANONICAL REFERENCES:
- Original EmDash repository: https://github.com/emdash-cms/emdash
- Official EmDash documentation: https://docs.emdashcms.com/
- Reference implementation only: https://github.com/ahliweb/awcms-micro-sman2pangkalanbun

RULES:
1. Read AGENTS.md first.
2. Read README.md, package.json, pnpm-workspace.yaml, docs, and project-docs where relevant.
3. Treat the SMAN 2 repo as reference only.
4. Do not modify EmDash core unless there is no safe extension path.
5. Do not commit secrets, `.env`, local databases, or uploads.
6. Use GitHub Issues when needed.
7. Create a new branch before implementation.
8. Make atomic changes.
9. Run validation before completion.
10. Merge only after validation passes.
11. Delete branch after merge.

GOAL:
Create a clean AWCMS-Micro standard repository skeleton that remains compatible with EmDash.

IMPLEMENTATION STEPS:

Phase 0 — Discovery
- Inspect git status and remotes.
- Read AGENTS.md if it exists.
- Read related docs.
- Inspect EmDash upstream if available.
- Inspect SMAN 2 reference repo only for patterns.
- Summarize reusable and non-reusable patterns.

Phase 1 — GitHub Issues
Create or update these issues:
1. Initialize AWCMS-Micro Standard Repository
2. Add EmDash Compatibility Documentation
3. Add Local Development Baseline
4. Add Standard Seed Strategy
5. Add Validation Script
6. Add Playwright Smoke Test Plan
7. Add Cloudflare Deployment Baseline

Phase 2 — Branch
Create branch:
chore/init-awcms-micro-standard

Phase 3 — Repository Structure
Create:
- AGENTS.md
- README.md
- package.json
- pnpm-workspace.yaml
- .gitignore
- .env.example
- docs/*
- sites/main/*
- packages/awcms/*
- packages/plugins/*
- tests/*
- scripts/*

Phase 4 — Documentation
Add initial content to:
- docs/architecture.md
- docs/upstream-sync.md
- docs/compatibility-matrix.md
- docs/divergence-log.md
- docs/security.md
- docs/privacy.md
- docs/tenancy.md
- docs/storage.md
- docs/modules.md
- docs/deployment.md
- docs/rollback.md

Phase 5 — Site Shell
Add:
- sites/main/package.json
- sites/main/astro.config.mjs
- sites/main/src/layouts/BaseLayout.astro
- sites/main/src/components/Header.astro
- sites/main/src/components/Footer.astro
- sites/main/src/pages/index.astro
- sites/main/src/styles/global.css

Phase 6 — Seed Files
Add:
- site-settings.json
- menus.json
- pages.json
- posts.json
- documents.json

Phase 7 — Scripts
Add:
- scripts/validate.sh
- scripts/sync-upstream.sh
- scripts/seed-site.sh placeholder

Phase 8 — Validation
Run:
- pnpm install if dependencies are configured
- pnpm validate
- pnpm build if possible

If scripts are placeholders, document what is pending.

Phase 9 — Commit
Commit with:
chore: initialize AWCMS-Micro standard repository

Phase 10 — Final Report
Report:
1. files created
2. issues created or updated
3. branch name
4. commit hash
5. validation results
6. risks
7. rollback plan
8. recommended next issue

SAFETY STOP CONDITIONS:
Stop and ask before:
- deleting files
- force pushing
- changing production Cloudflare resources
- committing secrets
- modifying upstream EmDash core
- running destructive database changes
```

---

## 26. Rollback Plan for Part 2

If the initial structure is wrong:

```bash
git revert <commit-hash>
```

If branch should be discarded before merge:

```bash
git checkout main
git branch -D chore/init-awcms-micro-standard
git push origin --delete chore/init-awcms-micro-standard
```

If files were created accidentally in the wrong repository:

```bash
git status
git clean -nd
```

Review dry-run output first. Only then:

```bash
git clean -fd
```

Do not run destructive cleanup without checking the target path.

---

## 27. Definition of Done for Part 2

Part 2 is complete when:

```txt
[ ] clean repository structure exists
[ ] AGENTS.md guides future agents
[ ] README.md explains purpose
[ ] upstream remote is documented
[ ] docs baseline exists
[ ] local site shell exists
[ ] seed strategy exists
[ ] validation script exists
[ ] initial GitHub Issues exist
[ ] first implementation branch exists
[ ] first commit exists
[ ] no secrets/private files committed
[ ] next implementation issue is clear
```

---

## 28. Next Part

Continue with **Part 3 — Database, Tenancy, Soft Delete, and Storage**.

Part 3 should include:

- default tenant implementation;
- tenant-ready custom table standards;
- EmDash schema boundary;
- soft delete rules;
- media metadata strategy;
- Cloudflare R2/S3-compatible storage paths;
- upload validation;
- backup and restore;
- migration and rollback strategy.
