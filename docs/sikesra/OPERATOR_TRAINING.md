# SIKESRA Operator Training Notes

## Overview

SIKESRA is a community data management system built as a plugin within the EmDash admin platform. It manages entities (people, houses of worship, institutions) through a verification workflow from draft to verified/active status, with role-based and attribute-based access controls.

## Access URLs

| Surface | URL | Auth Required |
|---|---|---|
| Public dashboard | `https://sikesrakobar.ahlikoding.com/sikesra` | No |
| Worker health | `https://sikesrakobar.ahlikoding.com/health` | No |
| EmDash admin | `https://sikesrakobar.ahlikoding.com/_emdash/admin` | Yes |
| Admin API | `/_emdash/api/plugins/sikesra/v1/*` | Yes |
| Public API | `/_emdash/api/plugins/sikesra/public/*` | No |

## User Roles and Permissions

### Role Hierarchy

| Role | Scope | Key Permissions |
|---|---|---|
| Super Admin | System-wide | All permissions, user management, system configuration |
| Admin Kabupaten | Regency-level | Full CRUD within regency, verification at regency level |
| Admin Kecamatan | Subdistrict-level | CRUD within subdistrict, verification at subdistrict level |
| Admin Desa/Kelurahan | Village-level | CRUD within village, verification at village level |
| Petugas Input | Assigned scope | Create/edit drafts, submit for verification |
| Verifikator | Assigned scope | Verify/reject/revise entities at assigned level |
| Auditor | System-wide | Read audit logs, export audit data |
| Public User | None | View aggregate-safe public dashboard only |

### Permission Namespace

All SIKESRA permissions use the format:
```
awcms:sikesra:<resource>:<action>
```

Key permission groups:
- `dashboard:*` - Dashboard access
- `entity:*` - Entity CRUD operations
- `verification:*` - Verification workflow
- `document:*` - Document management
- `import:*` - Excel import workflow
- `export:*` - Export and reporting
- `audit:*` - Audit log access
- `code:*` - SIKESRA ID generation/correction
- `settings:*` - System settings
- `rate_limit:bypass` - Rate limit override

## Core Workflows

### 1. Manual Data Entry

**Purpose**: Create a new entity record through the admin UI.

**Steps**:
1. Login to EmDash admin
2. Navigate to SIKESRA plugin section
3. Click "Tambah Data" (Add Data)
4. Select object type (e.g., Penduduk, Rumah Ibadah, Lembaga)
5. Select object subtype
6. Fill in required sections:
   - Identity information
   - Region (official village code required)
   - Module-specific attributes
   - Related people (if applicable)
   - Supporting documents
7. Run validation check
8. Review duplicate candidates (if any)
9. Generate 20-digit SIKESRA ID
10. Submit for verification

**Key Rules**:
- Village code must be valid 10-digit kode desa/kelurahan
- Required fields must be complete before ID generation
- Duplicate detection runs automatically
- High-risk duplicates require decision and reason

### 2. Excel Import

**Purpose**: Bulk import data from Excel workbooks.

**Steps**:
1. Open Import Excel section
2. Upload workbook file
3. Select worksheet to import
4. Map Excel columns to SIKESRA fields
5. System parses rows into staging
6. Review validation results:
   - Valid rows: Ready for promotion
   - Invalid rows: Require correction
7. Review duplicate candidates
8. Make decisions on duplicates (skip, promote, merge, dismiss)
9. Promote valid rows to entities
10. Review import report

**Key Rules**:
- Staging data is protected (restricted/highly restricted)
- Invalid rows cannot be promoted
- High-risk duplicate overrides require reason
- Promoted rows are NOT automatically verified
- All import actions are audited

### 3. Verification Workflow

**Purpose**: Multi-level verification of entity records.

**Status Flow**:
```
draft → submitted_village → submitted_subdistrict → submitted_regency → verified + active
```

**Steps**:
1. Login as verifikator
2. Open verification queue (filtered by your level and region)
3. Select entity to verify
4. Review entity details:
   - Region validity
   - Completeness
   - Documents
   - Duplicate history
5. Make decision:
   - **Verify**: Advances to next level or final verification
   - **Need Revision**: Returns to submitter with note
   - **Reject**: Marks as rejected with note
6. Add note if required (for revision/reject)

**Key Rules**:
- Verification is hierarchical (village → subdistrict → regency)
- Revision/Rejection requires a note
- Final verification sets status to verified + active
- Only active + verified records appear on public dashboard

### 4. Document Management

**Purpose**: Upload and manage supporting documents.

**Steps**:
1. Open entity detail page
2. Navigate to documents section
3. Click "Upload Document"
4. Select document type
5. Select classification (public, internal, restricted, highly restricted)
6. Upload file
7. System validates:
   - MIME type
   - File extension
   - File size
   - Checksum
8. Document stored in R2, metadata in D1
9. Document linked to entity

**Access Rules**:
- Raw R2 keys are never exposed
- Highly restricted downloads require reason
- All downloads are audited
- Document replacement supersedes old version
- Hard delete is not available in normal UI

### 5. Export and Reporting

**Purpose**: Generate reports and export data.

**Steps**:
1. Open Reports section
2. Select report type
3. Apply filters (date range, region, type, status)
4. Select fields to include
5. System shows field sensitivity levels
6. System checks permissions:
   - Basic fields: Standard export permission
   - Restricted fields: Restricted export permission + reason required
   - Highly restricted: Excluded by default
7. Generate export
8. Download file (authenticated link)

**Key Rules**:
- Field sensitivity is shown before export
- Restricted fields require explicit permission and reason
- Highly restricted individual data is excluded
- All exports are audited with filters, fields, and reason

### 6. Audit Log Review

**Purpose**: Review system activity for compliance and troubleshooting.

**Steps**:
1. Open Audit section
2. Apply filters:
   - Date range
   - Actor
   - Action type
   - Resource
   - Risk level
   - Request ID
3. Review audit entries
4. Open detail view for specific events
5. Export audit logs (if authorized)

**Key Rules**:
- Sensitive before/after values are redacted based on viewer permissions
- Audit export requires special permission and reason
- Audit export itself is audited

## Common Operations

### View Public Dashboard

Open `https://sikesrakobar.ahlikoding.com/sikesra` in any browser. No login required. Shows aggregate-safe data only.

### Check System Health

```bash
curl https://sikesrakobar.ahlikoding.com/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

### List Object Types

```bash
curl https://sikesrakobar.ahlikoding.com/_emdash/api/plugins/sikesra/v1/object-types
```

### Query Entities

```bash
curl "https://sikesrakobar.ahlikoding.com/_emdash/api/plugins/sikesra/v1/entities?keyword=masjid&page=1&per_page=10"
```

### Open Admin Plugin Pages

Use the EmDash admin shell at `https://sikesrakobar.ahlikoding.com/_emdash/admin`, then open the SIKESRA plugin group.

## Data Security Rules

1. **Never share API tokens or credentials**
2. **Public page is aggregate-safe only** — no individual records
3. **Entity list API requires authentication** for production use
4. **Backup D1 before any manual schema changes**
5. **Never trust frontend-supplied tenant, site, role, or region scope**
6. **Never return NIK/KIA hash, raw R2 key, or private document URLs** through normal API responses
7. **All high-risk actions require reason** and are audited

## Troubleshooting

| Symptom | Possible Cause | Action |
|---|---|---|
| Page not loading | Worker down | Check health endpoint, review worker logs |
| Empty data | D1 connectivity issue | Check D1 binding, verify database exists |
| API errors (5xx) | Worker error | Run `wrangler tail sikesra` to see logs |
| Permission denied | Missing RBAC/ABAC | Check user roles and permissions |
| Import failing | Validation errors | Review import batch validation results |
| Export failing | Permission issue | Verify export permissions and field sensitivity |
| Slow responses | Query performance | Check D1 query latency, review indexes |
| Rate limited | Too many requests | Wait for rate limit window to reset, or use bypass permission |

### Debugging Commands

```bash
# Tail worker logs
wrangler tail sikesra

# Check D1 database
wrangler d1 list

# Execute D1 query
wrangler d1 execute sikesra --command "SELECT COUNT(*) FROM awcms_sikesra_entities;"

# List R2 objects
wrangler r2 object list sikesra

# Check KV namespace
wrangler kv:key list --namespace-id=<id>
```

## Deployment Process

### Build and Deploy

```bash
# Install dependencies
npm install

# Build
npm run build

# Deploy
npm run deploy
```

Or combined:
```bash
npm run build && npm run deploy
```

### Rollback

```bash
# List versions
wrangler versions list --name sikesra

# Rollback to specific version
wrangler rollback <version-id> --name sikesra
```

## Backup and Restore

### Manual Backup

```bash
# Export D1 database
wrangler d1 execute sikesra --command ".dump" > sikesra-backup-$(date +%Y%m%d).sql
```

### Automated Backups

- **Daily**: D1 entity/document/audit export to R2
- **Weekly**: R2 bucket listing inventory

Backup status tracked in `awcms_sikesra_backups` table.

### Restore

See `OPERATIONS.md` for detailed restore procedures.

## Incident Response

See `INCIDENT_RESPONSE_RUNBOOK.md` for detailed incident procedures.

### Quick Response Steps

1. **Assess**: Check health endpoint and worker logs
2. **Contain**: Rollback if recent deployment, disable affected routes
3. **Fix**: Apply patch or restore from backup
4. **Verify**: Run health check and test affected functionality
5. **Document**: Record incident timeline and actions

## Monthly Maintenance Checklist

- [ ] Verify D1 backup completes successfully
- [ ] Verify R2 bucket inventory is accessible
- [ ] Test restore procedure on staging
- [ ] Review audit logs for anomalies
- [ ] Update wrangler and dependency versions
- [ ] Validate worker health and response times
- [ ] Review and rotate API tokens if needed
- [ ] Review rate limit configuration
- [ ] Check for pending security updates

## Additional Resources

| Document | Purpose |
|---|---|
| `README.md` | Project overview and reading order |
| `07_operations_sop.md` | Standard operating procedures |
| `OPERATIONS.md` | Backup/restore procedures |
| `INCIDENT_RESPONSE_RUNBOOK.md` | Incident response procedures |
| `10_validation_checklist.md` | Pre-deployment validation |
| `MVP_GO_NO_GO_REPORT.md` | MVP status and risk assessment |
