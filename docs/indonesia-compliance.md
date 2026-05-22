# Indonesia Compliance

## Covered Control Areas

- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi
- PP No. 71 Tahun 2019 tentang PSTE
- SPBE and local-government data-governance context
- audit trail, correction workflow, export approval, incident response, backup, and restore

## Implementation Mapping

- audit and correction flows are implemented in the SIKESRA plugin security and draft services
- public output is aggregate-safe and must suppress sensitive individual data
- deployment and restore procedures are tracked in `docs/cloudflare-deployment.md` and `docs/sikesra/D1_RESTORE.md`

## Remaining Work

Formal compliance evidence and operating procedures still need to be expanded into deployment-specific runbooks.
