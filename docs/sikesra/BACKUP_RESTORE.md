# SIKESRA D1/R2 Backup & Restore Procedures

**Status:** Active operations runbook  
**Last Updated:** 2026-05-12  
**Classification:** Internal - Operations Team Only

## Overview

This document defines the backup and restore procedures for SIKESRA's Cloudflare D1 database and R2 storage. These procedures are critical for disaster recovery, data migration, and compliance requirements.

## Infrastructure

| Component | Binding | Description |
|---|---|---|
| D1 Database | `SIKESRA_DB` | Primary relational data (entities, documents metadata, audit logs, etc.) |
| R2 Bucket | `SIKESRA_DOCUMENTS` | Document storage (PDFs, images, imports, exports) |
| R2 Bucket | `MEDIA` | EmDash media storage (shared with host) |
| KV Namespace | `SESSION` | Session storage (ephemeral, not backed up) |

## Backup Schedule

| Component | Frequency | Retention | Method |
|---|---|---|---|
| D1 Database | Daily (automated) | 30 days | Cloudflare D1 backup API |
| D1 Database | Weekly (manual) | 90 days | Export to R2 |
| R2 Documents | Continuous | Per bucket lifecycle | R2 versioning |
| R2 Documents | Weekly (manual) | 90 days | Cross-region copy |

## D1 Backup Procedures

### Automated Daily Backups

Cloudflare D1 automatically maintains daily backups for the past 30 days. To restore from an automated backup:

```bash
# List available backups
wrangler d1 backups list sikesra

# Restore from a specific backup
wrangler d1 backups restore sikesra --backup-id <backup-id>
```

**Warning:** Restoring from a backup will overwrite the current database. Always verify the backup timestamp before restoring.

### Manual Weekly Export

For long-term retention (>30 days), export the database to R2:

```bash
#!/bin/bash
# backup-d1-to-r2.sh
# Exports D1 database to R2 with timestamp

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
BACKUP_FILE="sikesra_backup_${TIMESTAMP}.sql"

# Export D1 to SQL file
wrangler d1 export sikesra --output /tmp/${BACKUP_FILE}

# Upload to R2 backup prefix
wrangler r2 object put sikesra/backups/d1/${BACKUP_FILE} --file /tmp/${BACKUP_FILE}

# Cleanup local file
rm /tmp/${BACKUP_FILE}

echo "Backup completed: ${BACKUP_FILE}"
```

### D1 Backup Verification

After any backup operation, verify the backup integrity:

```bash
# Create a temporary database from backup
wrangler d1 create sikesra-verify-${TIMESTAMP}

# Import backup to temp database
wrangler d1 execute sikesra-verify-${TIMESTAMP} --file /tmp/backup.sql

# Run verification queries
wrangler d1 execute sikesra-verify-${TIMESTAMP} --command "SELECT COUNT(*) as entity_count FROM awcms_sikesra_entities WHERE deleted_at IS NULL"
wrangler d1 execute sikesra-verify-${TIMESTAMP} --command "SELECT COUNT(*) as audit_count FROM awcms_sikesra_audit_logs"

# Cleanup temp database when verified
wrangler d1 delete sikesra-verify-${TIMESTAMP}
```

## R2 Backup Procedures

### R2 Versioning

Enable R2 versioning to maintain object history:

```bash
# Versioning is enabled per-bucket in Cloudflare dashboard
# Or via API:
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/sikesra" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"versioning": "enabled"}'
```

### Manual R2 Backup to Secondary Location

For disaster recovery, copy R2 objects to a secondary location:

```bash
#!/bin/bash
# backup-r2-secondary.sh
# Copies R2 objects to secondary bucket or external storage

SOURCE_BUCKET="sikesra"
DEST_BUCKET="sikesra-backup"
PREFIX="tenants/"

# List and copy objects (use rclone for large buckets)
rclone sync cloudflare:${SOURCE_BUCKET}/${PREFIX} cloudflare:${DEST_BUCKET}/${PREFIX} \
  --progress \
  --transfers 10 \
  --checkers 20

echo "R2 backup completed for prefix: ${PREFIX}"
```

### R2 Backup Verification

```bash
# List objects in backup bucket
wrangler r2 object list sikesra-backup --prefix "tenants/"

# Verify object count matches source
SOURCE_COUNT=$(wrangler r2 object list sikesra --prefix "tenants/" --limit 1000 | grep -c "key")
BACKUP_COUNT=$(wrangler r2 object list sikesra-backup --prefix "tenants/" --limit 1000 | grep -c "key")

echo "Source: ${SOURCE_COUNT}, Backup: ${BACKUP_COUNT}"
```

## Restore Procedures

### D1 Restore from SQL Export

```bash
# Restore from SQL file
wrangler d1 execute sikesra --file /path/to/backup.sql

# Verify restore
wrangler d1 execute sikesra --command "SELECT COUNT(*) FROM awcms_sikesra_entities"
```

### D1 Restore from Automated Backup

```bash
# List backups
wrangler d1 backups list sikesra

# Restore (this will overwrite current database)
wrangler d1 backups restore sikesra --backup-id <backup-id>

# Verify restore
wrangler d1 execute sikesra --command "SELECT COUNT(*) FROM awcms_sikesra_entities"
```

### R2 Object Restore

To restore a specific object from R2 versioning:

```bash
# List object versions
wrangler r2 object list sikesra --prefix "tenants/tenant-1/sites/site-1/documents/"

# Download specific version
wrangler r2 object get sikesra <object-key> --version <version-id> --file /tmp/restored-file.pdf

# Re-upload if needed
wrangler r2 object put sikesra <object-key> --file /tmp/restored-file.pdf
```

## Disaster Recovery Runbook

### Scenario 1: Accidental Data Deletion

1. **Stop:** Immediately halt any write operations to prevent overwriting
2. **Assess:** Determine the scope of deletion (which tables, time range)
3. **Restore:** Use the most recent backup before the deletion event
4. **Verify:** Run verification queries to confirm data integrity
5. **Notify:** Alert affected users and stakeholders

```bash
# Quick restore from automated backup
wrangler d1 backups list sikesra
wrangler d1 backups restore sikesra --backup-id <backup-id-before-deletion>
```

### Scenario 2: Database Corruption

1. **Stop:** Halt the worker to prevent further corruption
2. **Assess:** Identify corrupted tables/indexes
3. **Restore:** Use the most recent verified backup
4. **Replay:** If applicable, replay audit logs to recover recent changes
5. **Verify:** Run full verification suite
6. **Resume:** Restart the worker

### Scenario 3: R2 Data Loss

1. **Assess:** Determine which objects are missing
2. **Restore from versioning:** If versioning is enabled, restore from previous versions
3. **Restore from backup:** If backup exists, copy from secondary location
4. **Reconcile:** Update D1 metadata to reflect restored objects
5. **Verify:** Test document access for restored objects

## Maintenance Tasks

### Monthly Backup Audit

```bash
#!/bin/bash
# monthly-backup-audit.sh

echo "=== D1 Backup Audit ==="
wrangler d1 backups list sikesra

echo "=== R2 Backup Audit ==="
wrangler r2 object list sikesra --prefix "backups/"

echo "=== Database Health ==="
wrangler d1 execute sikesra --command "SELECT 'entities' as table_name, COUNT(*) as row_count FROM awcms_sikesra_entities UNION ALL SELECT 'audit_logs', COUNT(*) FROM awcms_sikesra_audit_logs UNION ALL SELECT 'documents', COUNT(*) FROM awcms_sikesra_supporting_documents"
```

### Quarterly Restore Test

1. Create a temporary D1 database from the latest backup
2. Run the full test suite against the restored database
3. Verify all critical queries return expected results
4. Document any discrepancies
5. Clean up the temporary database

## Security Considerations

1. **Encryption:** All D1 backups and R2 objects are encrypted at rest by Cloudflare
2. **Access Control:** Backup/restore operations require `Account Account Settings Editor` or `D1 Editor` permissions
3. **Audit Trail:** All backup/restore operations should be logged in the SIKESRA audit system
4. **Data Retention:** Follow organizational data retention policies for backup deletion
5. **Compliance:** Ensure backup procedures comply with applicable data protection regulations

## Contact

- **Operations Team:** #ops-sikesra
- **Escalation:** On-call engineer via PagerDuty
- **Cloudflare Support:** https://dash.cloudflare.com/support

## Appendix: Useful Commands

```bash
# D1 Commands
wrangler d1 list
wrangler d1 info sikesra
wrangler d1 backups list sikesra
wrangler d1 execute sikesra --command "SELECT ..."
wrangler d1 export sikesra --output backup.sql
wrangler d1 import sikesra --file backup.sql

# R2 Commands
wrangler r2 bucket list
wrangler r2 object list sikesra --prefix "tenants/"
wrangler r2 object get sikesra <key> --file output.pdf
wrangler r2 object put sikesra <key> --file input.pdf
wrangler r2 object delete sikesra <key>

# Worker Management
wrangler deploy
wrangler rollback
wrangler tail sikesra
```
