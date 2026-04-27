import {
  SIKESRA_RELIGION_REFERENCE_SEAM,
  findSikesraReligionReference,
  listSikesraReligionReferences,
  normalizeReferenceText,
} from "../reference-data/religion-reference.mjs";
import { SIKESRA_DB_MIGRATIONS } from "../../db/migrations/index.mjs";
import { getPool } from "../../db/client.ts";

export function createSikesraReligionReferenceRepository() {
  const persistenceMigration = SIKESRA_DB_MIGRATIONS.find((migration) => migration.name === "001_create_religion_reference_tables");

  return Object.freeze({
    seam: Object.freeze({
      ...SIKESRA_RELIGION_REFERENCE_SEAM,
      sourceIssue: "ahliweb/sikesra#69",
      storage: "runtime_postgresql_preferred_with_seed_fallback",
      note: "Repository backend referensi agama sekarang mencoba membaca tabel PostgreSQL runtime lebih dulu dan kembali ke seed terkontrol bila runtime belum siap.",
    }),
    persistenceMigration,
    list({ includeInactive = false } = {}) {
      return listSikesraReligionReferences({ includeInactive });
    },
    async listRuntime({ includeInactive = false } = {}) {
      return loadRuntimeReligionReferences({ includeInactive });
    },
    findByAny(value) {
      return findSikesraReligionReference(value);
    },
    async findByAnyRuntime(value) {
      return findRuntimeReligionReference(value);
    },
  });
}

export const sikesraReligionReferenceRepository = createSikesraReligionReferenceRepository();

async function loadRuntimeReligionReferences({ includeInactive = false } = {}) {
  try {
    const pool = getPool();
    const references = await pool`
      select id, code, normalized_name, display_name, is_active, sort_order
      from public.religion_references
      ${includeInactive ? pool`` : pool`where is_active = true`}
      order by sort_order, display_name
    `;

    if (!Array.isArray(references) || references.length === 0) {
      return listSikesraReligionReferences({ includeInactive });
    }

    const aliases = await pool`
      select religion_reference_id, alias_text
      from public.religion_reference_aliases
    `;

    const aliasMap = new Map();
    for (const alias of aliases) {
      const current = aliasMap.get(alias.religion_reference_id) ?? [];
      current.push(alias.alias_text);
      aliasMap.set(alias.religion_reference_id, current);
    }

    return references.map((item) =>
      Object.freeze({
        id: item.id,
        code: item.code,
        normalizedName: item.normalized_name,
        displayName: item.display_name,
        aliases: Object.freeze(aliasMap.get(item.id) ?? []),
        active: item.is_active,
        sortOrder: item.sort_order,
      }),
    );
  } catch {
    return listSikesraReligionReferences({ includeInactive });
  }
}

async function findRuntimeReligionReference(value) {
  const normalized = normalizeReferenceText(value);
  if (!normalized) return null;

  try {
    const pool = getPool();
    const rows = await pool`
      select rr.id, rr.code, rr.normalized_name, rr.display_name, rr.is_active, rr.sort_order,
             array_remove(array_agg(distinct rra.alias_text), null) as aliases
      from public.religion_references rr
      left join public.religion_reference_aliases rra
        on rra.religion_reference_id = rr.id
      where rr.code = ${normalized}
         or rr.normalized_name = ${normalized}
         or exists (
           select 1
           from public.religion_reference_aliases alias_match
           where alias_match.religion_reference_id = rr.id
             and alias_match.normalized_alias = ${normalized}
         )
      group by rr.id, rr.code, rr.normalized_name, rr.display_name, rr.is_active, rr.sort_order
      order by rr.sort_order, rr.display_name
      limit 1
    `;

    const match = rows[0];
    if (!match) return findSikesraReligionReference(value);

    return Object.freeze({
      id: match.id,
      code: match.code,
      normalizedName: match.normalized_name,
      displayName: match.display_name,
      aliases: Object.freeze(Array.isArray(match.aliases) ? match.aliases.filter(Boolean) : []),
      active: match.is_active,
      sortOrder: match.sort_order,
    });
  } catch {
    return findSikesraReligionReference(value);
  }
}
