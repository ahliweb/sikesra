# SIKESRA Backup and Restore Operations

## D1 Database Backup

### Manual Export (Recommended)

Use the Cloudflare Dashboard or API to export the D1 database:

```bash
# Via Wrangler CLI
wrangler d1 execute sikesra --command ".dump" > sikesra-backup-$(date +%Y%m%d).sql

# Via API
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database/$D1_DATABASE_ID/query" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM awcms_sikesra_entities LIMIT 1"}' > /dev/null
```

### Backup Frequency

| Environment | Frequency | Retention |
|---|---|---|
| Production | Daily | 30 days |
| Staging | Weekly | 14 days |
| Development | Before schema changes | 7 days |

### Backup Content

The following SIKESRA tables must be included in backups:
- All `awcms_sikesra_*` tables (34 tables)
- Full data export for audit compliance
- Settings and configuration rows

## R2 Storage Backup

### Bucket Inventory

```bash
# List all objects via API
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/sikesra/objects" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

### R2 Lifecycle Rules

| Rule | Action | Pattern | After |
|---|---|---|---|
| Export expiry | Delete | `exports/*` | 30 days |
| Import clean-up | Delete | `imports/*` | 90 days |
| Document retention | Keep forever | `tenants/*` | N/A |

## Restore Procedure

### Prerequisites

1. D1 backup SQL file from target date
2. R2 bucket inventory and snapshot
3. Access to Cloudflare API with write permissions
4. Staging environment for dry-run validation

### Restore Steps

1. **Validate backup integrity**
   ```bash
   sqlite3 :memory: < sikesra-backup-YYYYMMDD.sql "SELECT count(*) FROM awcms_sikesra_entities;"
   ```

2. **Create restore database** (do not overwrite production)
   ```bash
   wrangler d1 create sikesra-restore-YYYYMMDD
   ```

3. **Apply backup to restore database**
   ```bash
   wrangler d1 execute sikesra-restore-YYYYMMDD --file sikesra-backup-YYYYMMDD.sql
   ```

4. **Validate restoration**
   - Verify row counts match backup metadata
   - Spot-check entity/settings/audit records
   - Verify foreign key relationships intact
   - Confirm R2 object keys resolve to existing blobs

5. **Promote to production** (if validated)
   - Notify operators of planned restore window
   - Pause worker operations (route to maintenance page)
   - Apply backup to production database
   - Verify worker health endpoint
   - Resume normal operations

### Restore Validation Checklist

- [ ] D1 backup file exists and is readable
- [ ] Row counts match expected values
- [ ] Settings table has valid configuration
- [ ] Seed data (object types, subtypes) is present
- [ ] R2 bucket objects are accessible
- [ ] Worker health check passes after restore
- [ ] Public `/sikesra` page loads correctly
- [ ] API endpoints return expected data

## Incident Response

### Contacts

| Role | Contact |
|---|---|
| Primary operator | cloudflare@ahliweb.com |
| Escalation | gh@ahliweb.com |

### Incident Categories

| Category | Response Time | Action |
|---|---|---|
| Data corruption | Immediate | Restore from latest backup |
| Sensitive data exposure | Immediate | Remove worker, investigate, restore with masking fix |
| Unauthorized access | Immediate | Revoke tokens, audit logs, notify affected parties |
| Worker outage | 1 hour | Rollback worker version, check bindings |

## Worker Rollback

To rollback to a previous worker version:

```bash
# List versions
wrangler versions list --name sikesra

# Rollback to specific version
wrangler rollback <version-id> --name sikesra
```

## Monthly Maintenance Checklist

- [ ] Verify D1 backup completes successfully
- [ ] Verify R2 bucket inventory is accessible
- [ ] Test restore procedure on staging
- [ ] Review audit logs for anomalies
- [ ] Update wrangler and dependency versions
- [ ] Validate worker health and response times
- [ ] Review and rotate API tokens if needed
