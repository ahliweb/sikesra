# Administrative Region Seed Assumptions

The checked-in importer uses `src/db/data/administrative-regions.seed.json` as a starter dataset, not a full national export.

Source assumptions:
- Records are JSON objects with `code`, `name`, `type`, and optional `parent_code`.
- Optional normalization columns are `province_code`, `regency_code`, `district_code`, and `village_code`.
- The importer computes stable internal ids from `code` when `id` is not supplied.
- Parent records can appear in any order in the JSON; the importer resolves hierarchy before writing.
- Re-running the importer is safe: rows are matched by `code` and updated in place instead of duplicated.

Current seed contents:
- A small West Java hierarchy for smoke testing and local bootstrap.
- One province, two regency/city rows, one district, and one village.

Replacing the dataset:
- Keep the same JSON shape.
- Preserve unique `code` values.
- Prefer authoritative Indonesian administrative codes in the normalized code columns.

## SIKESRA Region Context

SIKESRA is deployed for Kobar (Kotawaringin Barat) in Central Kalimantan. When replacing the seed dataset with production data, use authoritative BPS/Kemendagri codes for the relevant Kalimantan Tengah administrative hierarchy.
