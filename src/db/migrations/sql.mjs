export function renderSikesraMigrationSql(migration) {
  if (!migration || migration.name !== "001_create_religion_reference_tables") {
    throw new Error("Unsupported repository-owned migration contract.");
  }

  const referenceValues = migration.seeds.religionReferences
    .map(
      (item) =>
        `(${quote(item.id)}, ${quote(item.code)}, ${quote(item.normalizedName)}, ${quote(item.displayName)}, ${item.isActive ? "true" : "false"}, ${item.sortOrder}, now(), now())`,
    )
    .join(",\n  ");

  const aliasValues = migration.seeds.religionAliases
    .map(
      (item) =>
        `(${quote(item.id)}, ${quote(item.religionReferenceId)}, ${quote(item.aliasText)}, ${quote(item.normalizedAlias)}, now())`,
    )
    .join(",\n  ");

  return `begin;

create table if not exists public.sikesra_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists public.religion_references (
  id text primary key,
  code text not null unique,
  normalized_name text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.religion_reference_aliases (
  id text primary key,
  religion_reference_id text not null references public.religion_references(id) on delete cascade,
  alias_text text not null,
  normalized_alias text not null unique,
  created_at timestamptz not null default now()
);

insert into public.religion_references (
  id,
  code,
  normalized_name,
  display_name,
  is_active,
  sort_order,
  created_at,
  updated_at
)
values
  ${referenceValues}
on conflict (id) do update
set
  code = excluded.code,
  normalized_name = excluded.normalized_name,
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.religion_reference_aliases (
  id,
  religion_reference_id,
  alias_text,
  normalized_alias,
  created_at
)
values
  ${aliasValues}
on conflict (id) do update
set
  religion_reference_id = excluded.religion_reference_id,
  alias_text = excluded.alias_text,
  normalized_alias = excluded.normalized_alias;

insert into public.sikesra_migrations (name, applied_at)
values (${quote(migration.name)}, now())
on conflict (name) do nothing;

commit;
`;
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
