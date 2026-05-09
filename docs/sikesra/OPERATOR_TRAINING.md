# SIKESRA Operator Training Notes

## Quick Reference

### Access URLs

| Surface | URL |
|---|---|
| Public dashboard | `https://sikesra.ahliweb.workers.dev/sikesra` |
| Worker health | `https://sikesra.ahliweb.workers.dev/health` |
| Public API metadata | `/_emdash/api/plugins/sikesra/public/metadata` |
| Entity list API | `/_emdash/api/plugins/sikesra/v1/entities` |
| Object types API | `/_emdash/api/plugins/sikesra/v1/object-types` |

### Common Operations

#### View public dashboard
Open `https://sikesra.ahliweb.workers.dev/sikesra` in any browser. No login required.

#### Check system health
```bash
curl https://sikesra.ahliweb.workers.dev/health
```

#### List object types
```bash
curl https://sikesra.ahliweb.workers.dev/_emdash/api/plugins/sikesra/v1/object-types
```

#### Query entities
```bash
curl "https://sikesra.ahliweb.workers.dev/_emdash/api/plugins/sikesra/v1/entities?keyword=masjid&page=1&per_page=10"
```

### Data Security Rules

1. Never share API tokens or credentials
2. Public page is aggregate-safe only — no individual records
3. Entity list API requires authentication for production use
4. Backup D1 before any manual schema changes

### Troubleshooting

| Symptom | Check |
|---|---|
| Page not loading | Worker health endpoint |
| Empty data | D1 database connectivity |
| API errors | Worker logs via `wrangler tail` |
| Permission denied | User roles and scope configuration |
