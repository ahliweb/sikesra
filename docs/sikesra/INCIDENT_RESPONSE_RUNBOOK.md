# SIKESRA Incident Response Runbook

## Purpose

This runbook provides step-by-step procedures for responding to production incidents in the SIKESRA system. It covers detection, triage, containment, remediation, and post-incident review.

## Severity Levels

| Severity | Definition | Response Time | Escalation |
|---|---|---|---|
| **SEV-1 (Critical)** | Data breach, data loss, system completely down, sensitive data exposed publicly | Immediate (< 15 min) | Page on-call + lead + management |
| **SEV-2 (High)** | Core feature broken, data corruption affecting subset of users, authentication failure | < 1 hour | Page on-call + lead |
| **SEV-3 (Medium)** | Non-critical feature degraded, performance issues, isolated errors | < 4 hours | On-call handles |
| **SEV-4 (Low)** | Cosmetic issues, minor bugs, documentation errors | Next business day | On-call triages |

## Incident Command Structure

| Role | Responsibility | Contact |
|---|---|---|
| Incident Commander | Coordinates response, makes go/no-go decisions | On-call operator |
| Technical Lead | Diagnoses root cause, implements fix | Senior developer |
| Communications | Updates stakeholders, drafts public notices | Product/operator lead |
| Scribe | Documents timeline, decisions, actions | Rotating team member |

## Detection and Alerting

### Automated Monitoring

| Check | Endpoint/Metric | Alert Threshold | Frequency |
|---|---|---|---|
| Worker health | `GET /health` | Non-200 response | Every 5 min |
| Database connectivity | D1 query latency | > 5s p95 | Continuous |
| Error rate | Worker analytics | > 5% 5xx responses | Every 5 min |
| Rate limit triggers | KV counter spikes | > 1000/min per IP | Every 1 min |
| Backup failures | `awcms_sikesra_backups` status | Failed status | Daily |
| R2 availability | Object list latency | Timeout or 5xx | Every 15 min |

### Manual Detection Sources

- User reports via support channels
- Admin dashboard anomalies
- Audit log review findings
- Cloudflare dashboard analytics
- Worker logs (`wrangler tail`)

## Incident Procedures

### SEV-1: Data Breach / Sensitive Data Exposure

**Trigger**: NIK/KIA hashes, raw R2 keys, private document URLs, or individual PII exposed through public endpoints or logs.

#### Immediate Actions (0-15 min)

1. **Contain**: Disable the affected route or worker version
   ```bash
   # Rollback to last known good version
   wrangler versions list --name sikesra
   wrangler rollback <version-id> --name sikesra
   ```

2. **Assess**: Determine scope of exposure
   - Check audit logs for affected endpoints
   - Review Cloudflare analytics for request volume
   - Identify which data fields were exposed

3. **Preserve**: Save evidence before cleanup
   - Export relevant audit log entries
   - Screenshot affected endpoints
   - Save worker logs for the incident window

#### Containment (15-60 min)

4. **Block**: Apply immediate fix
   - Deploy hotfix to masking/serialization layer
   - Verify fix with targeted test requests
   - Confirm no regression on legitimate access

5. **Notify**: Inform affected parties
   - Internal: Lead, management, legal (if required)
   - External: Affected users (per data protection policy)

#### Remediation (1-24 hours)

6. **Root Cause**: Identify how exposure occurred
   - Code review of affected handler
   - Check recent deployments and changes
   - Review ABAC/masking configuration

7. **Fix**: Implement permanent solution
   - Patch the vulnerability
   - Add regression tests
   - Update masking tests if gap found

8. **Verify**: Confirm fix is effective
   - Run full test suite
   - Manual verification of affected endpoints
   - Review audit logs for correct behavior

#### Post-Incident

9. **Document**: Complete incident report
   - Timeline of events
   - Root cause analysis
   - Actions taken and their effectiveness
   - Lessons learned and preventive measures

10. **Improve**: Update runbook and tests
    - Add test case for this scenario
    - Update monitoring/alerting if gap found
    - Review and update masking policies

---

### SEV-1: Data Corruption / Loss

**Trigger**: Data inconsistencies, missing records, incorrect values, backup failures.

#### Immediate Actions (0-15 min)

1. **Stop writes**: Pause affected operations
   - Disable import/export endpoints if source of corruption
   - Set worker to read-only mode if possible

2. **Assess**: Determine scope
   ```bash
   # Check backup status
   curl -H "Authorization: Bearer $TOKEN" \
     "https://sikesrakobar.ahlikoding.com/_emdash/api/plugins/sikesra/v1/backups?status=failed"

   # Query affected tables
   wrangler d1 execute sikesra --command "SELECT COUNT(*) FROM awcms_sikesra_entities WHERE updated_at > '2024-01-01';"
   ```

3. **Identify last good backup**
   ```bash
   # List successful backups
   wrangler d1 execute sikesra --command "SELECT * FROM awcms_sikesra_backups WHERE status='success' ORDER BY completed_at DESC LIMIT 5;"
   ```

#### Containment (15-60 min)

4. **Isolate**: Create restore database
   ```bash
   wrangler d1 create sikesra-restore-$(date +%Y%m%d-%H%M%S)
   ```

5. **Restore**: Apply backup to isolated database
   ```bash
   wrangler d1 execute sikesra-restore-YYYYMMDD --file backup-YYYYMMDD.sql
   ```

6. **Validate**: Compare restored data with production
   - Row counts per table
   - Sample record verification
   - Foreign key integrity

#### Remediation (1-24 hours)

7. **Root Cause**: Identify corruption source
   - Review recent migrations
   - Check import batch logs
   - Audit recent data modifications

8. **Restore**: Apply validated backup to production
   - Schedule maintenance window
   - Notify users of downtime
   - Execute restore procedure from `OPERATIONS.md`

9. **Verify**: Post-restore validation
   - Run validation checklist from `10_validation_checklist.md`
   - Confirm public page shows correct aggregates
   - Verify admin APIs return expected data

---

### SEV-2: Authentication / Authorization Failure

**Trigger**: Users unable to login, permission checks failing, unauthorized access detected.

#### Immediate Actions (0-30 min)

1. **Assess**: Determine scope
   - Is it all users or specific roles?
   - Is it Cloudflare Access or EmDash session?
   - Check JWT validation logs

2. **Check identity pipeline**
   ```bash
   # Verify Cloudflare Access configuration
   curl -I "https://sikesrakobar.ahlikoding.com/_emdash/admin"

   # Check session cookies
   curl -v "https://sikesrakobar.ahlikoding.com/_emdash/api/plugins/sikesra/v1/entities"
   ```

#### Containment (30-60 min)

3. **Temporary bypass** (if safe)
   - Enable fallback authentication if configured
   - Grant emergency access to critical operators

4. **Fix**: Address root cause
   - Refresh Cloudflare Access tokens
   - Update permission registry
   - Fix session handling code

#### Verification

5. **Test**: Confirm auth works
   - Login as different roles
   - Verify permission checks
   - Test ABAC evaluation

---

### SEV-2: Worker Outage / Degradation

**Trigger**: Worker returning 5xx errors, high latency, timeout.

#### Immediate Actions (0-15 min)

1. **Check status**
   ```bash
   curl -v https://sikesrakobar.ahlikoding.com/health
   ```

2. **Review logs**
   ```bash
   wrangler tail sikesra
   ```

3. **Check bindings**
   - D1 database availability
   - KV namespace access
   - R2 bucket connectivity

#### Containment (15-60 min)

4. **Rollback** if recent deployment
   ```bash
   wrangler versions list --name sikesra
   wrangler rollback <previous-version> --name sikesra
   ```

5. **Scale**: If load-related
   - Check Cloudflare analytics for traffic spikes
   - Enable rate limiting if not active
   - Consider temporary maintenance page

#### Remediation

6. **Fix**: Address root cause
   - Fix code bug
   - Increase timeout limits
   - Optimize slow queries

7. **Deploy**: Roll forward with fix
   ```bash
   npm run build && npm run deploy
   ```

---

### SEV-3: Performance Degradation

**Trigger**: Slow response times, timeout errors, high resource usage.

#### Assessment

1. **Identify bottleneck**
   - D1 query performance
   - Worker execution time
   - Network latency

2. **Check recent changes**
   - New migrations or indexes
   - Increased data volume
   - Configuration changes

#### Remediation

3. **Optimize**: Address bottleneck
   - Add missing indexes
   - Optimize slow queries
   - Implement caching where appropriate

4. **Monitor**: Verify improvement
   - Track response times
   - Monitor error rates
   - Check resource usage

---

### SEV-3: Import/Export Failure

**Trigger**: Excel imports failing, exports not generating, data format issues.

#### Assessment

1. **Check import batch status**
   ```bash
   wrangler d1 execute sikesra --command "SELECT * FROM awcms_sikesra_import_batches WHERE status='failed' ORDER BY created_at DESC LIMIT 5;"
   ```

2. **Review staging data**
   - Check validation errors
   - Review duplicate detection results
   - Verify column mapping

#### Remediation

3. **Fix**: Address failure cause
   - Correct column mapping
   - Fix validation rules
   - Resolve duplicate conflicts

4. **Retry**: Re-process affected batches
   - Update batch status
   - Re-run validation
   - Promote valid rows

---

### SEV-4: Cosmetic / Minor Issues

**Trigger**: UI glitches, typos, minor functional bugs.

#### Process

1. **Triage**: Confirm severity
2. **Document**: Create issue ticket
3. **Schedule**: Add to next sprint
4. **Fix**: Implement and test
5. **Deploy**: Include in next release

## Communication Templates

### Initial Incident Notification

```
INCIDENT NOTIFICATION
Severity: SEV-X
Time: YYYY-MM-DD HH:MM UTC
Affected: [System/Feature]
Impact: [Description of user impact]
Status: Investigating
Next Update: [Time]
Incident Commander: [Name]
```

### Incident Update

```
INCIDENT UPDATE
Severity: SEV-X
Time: YYYY-MM-DD HH:MM UTC
Current Status: [Investigating/Identified/Monitoring/Resolved]
Actions Taken: [List]
Next Steps: [List]
ETA to Resolution: [Time]
Next Update: [Time]
```

### Incident Resolution

```
INCIDENT RESOLVED
Severity: SEV-X
Time: YYYY-MM-DD HH:MM UTC
Duration: [X hours Y minutes]
Root Cause: [Description]
Resolution: [Description]
Impact: [Number of users affected, data affected]
Follow-up Actions: [List]
Post-Incident Review: [Scheduled date]
```

## Post-Incident Review

### Timeline

- **SEV-1**: Within 48 hours
- **SEV-2**: Within 1 week
- **SEV-3**: Within 2 weeks
- **SEV-4**: As part of sprint retrospective

### Agenda

1. Incident summary and timeline
2. Root cause analysis
3. What went well
4. What could be improved
5. Action items and owners
6. Runbook updates needed
7. Test coverage gaps
8. Monitoring/alerting improvements

### Output

- Incident report document
- Updated runbook procedures
- New test cases
- Monitoring/alerting changes
- Code fixes and improvements

## Emergency Contacts

| Role | Contact | Escalation Order |
|---|---|---|
| On-call Operator | cloudflare@ahliweb.com | 1st |
| Technical Lead | gh@ahliweb.com | 2nd |
| Management | [Management contact] | 3rd |
| Legal (data breach) | [Legal contact] | SEV-1 only |

## Appendix: Useful Commands

### Worker Management

```bash
# List versions
wrangler versions list --name sikesra

# Rollback
wrangler rollback <version-id> --name sikesra

# Tail logs
wrangler tail sikesra

# Deploy
npm run build && npm run deploy
```

### Database Operations

```bash
# Execute query
wrangler d1 execute sikesra --command "SELECT ..."

# Export backup
wrangler d1 execute sikesra --command ".dump" > backup.sql

# Import backup
wrangler d1 execute sikesra --file backup.sql
```

### R2 Operations

```bash
# List objects
wrangler r2 object list sikesra --prefix "imports/"

# Get object
wrangler r2 object get sikesra <key>

# Delete object
wrangler r2 object delete sikesra <key>
```

### KV Operations

```bash
# List keys
wrangler kv:key list --namespace-id=<id> --prefix="rate_limit:"

# Get value
wrangler kv:key get --namespace-id=<id> <key>

# Delete key
wrangler kv:key delete --namespace-id=<id> <key>
```
