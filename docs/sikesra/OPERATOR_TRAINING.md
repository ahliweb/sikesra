# SIKESRA Operator Training Notes

## Quick Reference

### Access URLs

| Surface | URL |
|---|---|
| Public dashboard | `https://sikesrakobar.ahlikoding.com/sikesra` |
| Worker health | `https://sikesrakobar.ahlikoding.com/health` |
| EmDash admin | `https://sikesrakobar.ahlikoding.com/_emdash/admin` |
| Public API metadata | `/_emdash/api/plugins/sikesra/public/metadata` |
| Entity list API | `/_emdash/api/plugins/sikesra/v1/entities` |
| Object types API | `/_emdash/api/plugins/sikesra/v1/object-types` |

### Common Operations

#### View public dashboard
Open `https://sikesrakobar.ahlikoding.com/sikesra` in any browser. No login required.

#### Check system health
```bash
curl https://sikesrakobar.ahlikoding.com/health
```

#### List object types
```bash
curl https://sikesrakobar.ahlikoding.com/_emdash/api/plugins/sikesra/v1/object-types
```

#### Query entities
```bash
curl "https://sikesrakobar.ahlikoding.com/_emdash/api/plugins/sikesra/v1/entities?keyword=masjid&page=1&per_page=10"
```

#### Open admin plugin pages
Use the EmDash admin shell at `https://sikesrakobar.ahlikoding.com/_emdash/admin`, then open the SIKESRA plugin group. Admin plugin pages use `/_emdash/api/plugins/sikesra/admin` and require an authenticated admin session.

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
| API errors | Worker logs via `set -a && source .env && set +a && npx wrangler tail sikesra` |
| Permission denied | User roles and scope configuration |
