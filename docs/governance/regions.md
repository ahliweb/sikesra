# Region Governance

## EmDash Core Vs Mini Overlay

### EmDash Core

EmDash does not define Mini's governance region model.

### Mini Overlay

Mini adds two distinct region systems:

- logical/detail regions for operational governance
- Indonesian administrative regions for formal geography

These must remain separate.

## Logical Regions

Logical regions are used for organizational and operational scoping.

Mini owns:

- the logical region catalog
- hierarchy changes and reparenting
- user logical region assignments
- logical region scope resolution for authorization

## Administrative Regions

Administrative regions are the formal geography hierarchy.

Mini owns:

- administrative region reference data
- user administrative region assignments
- administrative region scope resolution for authorization

## SIKESRA Region Context

SIKESRA is deployed for the Kobar (Kotawaringin Barat) regency context in Central Kalimantan.

- Logical regions should reflect SIKESRA's operational/business structure.
- Administrative regions should use authoritative BPS/Kemendagri codes for the relevant Kalimantan Tengah hierarchy.

## Authorization Implications

Region scope can refine access even when RBAC permission exists.

Mini also includes a plugin region-awareness helper so plugin routes and services can resolve scoped resource ids consistently.

## Cross-References

- `docs/governance/auth-and-authorization.md`
- `docs/administrative-region-source-data.md`
- `docs/plugins/contract-overview.md`
