# SIKESRA R2 Lifecycle Policy

**Date:** 2026-05-13
**Bucket:** `sikesra`
**Status:** Active

## Purpose

This document defines the lifecycle rules for R2 objects in the SIKESRA bucket. Rules ensure automatic cleanup of temporary data while preserving documents according to their classification and retention requirements.

## Bucket Structure

| Prefix | Purpose | Retention | Lifecycle Rule |
|--------|---------|-----------|----------------|
| `documents/` | Entity supporting documents | Based on classification | Manual cleanup (see below) |
| `imports/` | Import staging files | 90 days | Auto-delete |
| `exports/` | Export job output files | 30 days | Auto-delete |

## Lifecycle Rules

### Rule 1: Import Staging Cleanup

| Property | Value |
|----------|-------|
| Prefix | `imports/` |
| Action | Delete |
| Condition | Age > 90 days |
| Rationale | Import staging data is temporary and should not be retained after promotion |

**Wrangler Configuration:**
```toml
[[r2_lifecycle_rules]]
bucket = "sikesra"
enabled = true
prefix = "imports/"
actions = { delete = true }
conditions = { age = 90 }
```

### Rule 2: Export Job Cleanup

| Property | Value |
|----------|-------|
| Prefix | `exports/` |
| Action | Delete |
| Condition | Age > 30 days |
| Rationale | Export files are temporary downloads and should not accumulate |

**Wrangler Configuration:**
```toml
[[r2_lifecycle_rules]]
bucket = "sikesra"
enabled = true
prefix = "exports/"
actions = { delete = true }
conditions = { age = 30 }
```

### Rule 3: Document Retention (Manual)

Documents are retained based on their classification and entity status. No automatic deletion is applied.

| Classification | Retention Period | Deletion Trigger |
|----------------|------------------|------------------|
| `public_safe` | Retain while entity active | Entity deletion + 30 days |
| `internal` | Retain while entity active | Entity deletion + 90 days |
| `restricted` | Retain while entity active + 1 year | Entity deletion + 1 year |
| `highly_restricted` | Retain while entity active + 3 years | Entity deletion + 3 years |

**Document Cleanup Procedure:**

1. Identify deleted entities:
   ```sql
   SELECT id, deleted_at FROM awcms_sikesra_entities 
   WHERE deleted_at IS NOT NULL 
   AND deleted_at < datetime('now', '-30 days');
   ```

2. List documents for deleted entities:
   ```sql
   SELECT d.id, d.r2_key, d.classification, e.deleted_at 
   FROM awcms_sikesra_documents d
   JOIN awcms_sikesra_entities e ON d.entity_id = e.id
   WHERE e.deleted_at IS NOT NULL
   AND e.deleted_at < datetime('now', '-30 days');
   ```

3. Delete documents after retention period:
   ```bash
   wrangler r2 object delete sikesra <r2_key>
   ```

4. Update document metadata:
   ```sql
   UPDATE awcms_sikesra_documents 
   SET deleted_at = datetime('now') 
   WHERE id IN (<document_ids>);
   ```

## Document Key Structure

```
documents/{tenantId}/{siteId}/{entityId}/{documentId}-{timestamp}.{ext}
imports/{tenantId}/{siteId}/{batchId}/{filename}
exports/{tenantId}/{siteId}/{jobId}/{filename}
```

## Monitoring

### Storage Metrics

Monitor R2 bucket metrics in Cloudflare dashboard:

- Total object count
- Total storage size
- Object count by prefix
- Storage growth rate

### Alerts

Set up alerts for:

- Bucket size exceeds 10GB
- Object count exceeds 100,000
- Storage growth rate > 1GB/week

## Testing Lifecycle Rules

### Test Import Cleanup

1. Upload test file to `imports/test/`:
   ```bash
   wrangler r2 object put sikesra imports/test/test-file.txt --file test.txt
   ```

2. Verify object exists:
   ```bash
   wrangler r2 object list sikesra --prefix imports/test/
   ```

3. Wait 90 days (or adjust rule for testing)

4. Verify object deleted:
   ```bash
   wrangler r2 object get sikesra imports/test/test-file.txt
   # Should return 404
   ```

### Test Export Cleanup

1. Upload test file to `exports/test/`:
   ```bash
   wrangler r2 object put sikesra exports/test/test-file.txt --file test.txt
   ```

2. Wait 30 days (or adjust rule for testing)

3. Verify object deleted

## Compliance Notes

- Document retention periods comply with data protection regulations
- Highly restricted documents require extended retention for audit purposes
- All deletions are logged in audit trail
- Backup copies are retained per backup policy

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-05-13 | Initial lifecycle policy | System |
