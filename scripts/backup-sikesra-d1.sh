#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd -- "$script_dir/.." && pwd)
config_file="$repo_root/awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/wrangler.jsonc"
env_file="$repo_root/.env"
if [[ -f "$env_file" ]]; then
	# shellcheck disable=SC1090
	set -a
	. "$env_file"
	set +a
fi

db_name="${D1_DATABASE_NAME:-sikesra}"
output_root="${EMDASH_BACKUP_ROOT:-/tmp/opencode/sikesra-backups}"
timestamp="$(date +%Y%m%d-%H%M%S)"
output_dir="$output_root/$timestamp"
sql_file="$output_dir/$db_name.sql"
inventory_file="$output_dir/sqlite-master.json"
fts_file="$output_dir/fts-objects.json"
manifest_file="$output_dir/manifest.json"

mkdir -p "$output_dir"

if [[ ! -f "$config_file" ]]; then
	echo "Missing Wrangler config: $config_file" >&2
	exit 1
fi

if [[ ! -f "$env_file" ]]; then
	echo "Missing env file: $env_file" >&2
	exit 1
fi

query_remote() {
	local query="$1"
	npx wrangler d1 execute "$db_name" -c "$config_file" --remote --yes --json --command "$query" --env-file "$env_file"
}

query_remote "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name;" > "$inventory_file"

node - <<'NODE' "$inventory_file" "$output_dir"
const fs = require('node:fs');
const inventoryPath = process.argv[2];
const outputDir = process.argv[3];
const raw = fs.readFileSync(inventoryPath, 'utf8');
const json = raw.slice(raw.indexOf('['));
const rows = JSON.parse(json)[0].results;

const tableRows = rows.filter((row) => row.type === 'table' && !row.name.startsWith('_cf_'));
const viewRows = rows.filter((row) => row.type === 'view');
const virtualRows = tableRows.filter((row) => /CREATE VIRTUAL TABLE/i.test(row.sql || '') && !row.name.startsWith('_cf_'));
const shadowRows = new Set([
	'_emdash_fts_pages_config',
	'_emdash_fts_pages_data',
	'_emdash_fts_pages_docsize',
	'_emdash_fts_pages_idx',
	'_emdash_fts_posts_config',
	'_emdash_fts_posts_data',
	'_emdash_fts_posts_docsize',
	'_emdash_fts_posts_idx',
]);
const regularRows = tableRows.filter((row) => !virtualRows.some((virtual) => virtual.name === row.name) && !shadowRows.has(row.name));

const exportableTables = regularRows.map((row) => row.name);
const ftsRows = rows.filter((row) => row.name === '_emdash_fts_pages' || row.name === '_emdash_fts_posts' || shadowRows.has(row.name));

fs.writeFileSync(pathJoin(outputDir, 'exportable-tables.txt'), exportableTables.join('\n') + (exportableTables.length ? '\n' : ''));
fs.writeFileSync(pathJoin(outputDir, 'fts-objects.json'), JSON.stringify(ftsRows, null, 2) + '\n');
fs.writeFileSync(pathJoin(outputDir, 'manifest.json'), JSON.stringify({
	views: viewRows.map((row) => row.name),
	regularTables: exportableTables,
	virtualTables: virtualRows.map((row) => row.name),
	shadowTables: [...shadowRows],
}, null, 2) + '\n');

function pathJoin(...parts) {
	return parts.join('/');
}
NODE

mapfile -t exportable_tables < "$output_dir/exportable-tables.txt"

if [[ ${#exportable_tables[@]} -gt 0 ]]; then
	args=(npx wrangler d1 export "$db_name" -c "$config_file" --remote --skip-confirmation --output "$sql_file" --env-file "$env_file")
	for table_name in "${exportable_tables[@]}"; do
		args+=(--table "$table_name")
	done
	"${args[@]}"
else
	: > "$sql_file"
fi

node - <<'NODE' "$output_dir/fts-objects.json" "$sql_file"
const fs = require('node:fs');
const ftsPath = process.argv[2];
const sqlPath = process.argv[3];
const raw = fs.readFileSync(ftsPath, 'utf8');
const ftsRows = JSON.parse(raw);
const byName = new Map(ftsRows.map((row) => [row.name, row.sql]));
const ordered = [
	'_emdash_fts_pages',
	'_emdash_fts_posts',
	'_emdash_fts_pages_delete',
	'_emdash_fts_pages_insert',
	'_emdash_fts_pages_update',
	'_emdash_fts_posts_delete',
	'_emdash_fts_posts_insert',
	'_emdash_fts_posts_update',
];
const lines = [];
for (const name of ordered) {
	const sql = byName.get(name);
	if (sql) lines.push(`${sql.trim()};`);
}
if (byName.has('_emdash_fts_pages')) {
	lines.push('INSERT INTO "_emdash_fts_pages"("_emdash_fts_pages") VALUES(\'rebuild\');');
}
if (byName.has('_emdash_fts_posts')) {
	lines.push('INSERT INTO "_emdash_fts_posts"("_emdash_fts_posts") VALUES(\'rebuild\');');
}
if (lines.length > 0) {
	fs.appendFileSync(sqlPath, '\n-- FTS objects and rebuild commands\n' + lines.join('\n') + '\n');
}
NODE

sha256sum "$sql_file" > "$output_dir/$db_name.sql.sha256"

python3 - <<'PY' "$sql_file" "$output_dir/restore-check.db" "$manifest_file"
import hashlib
import json
import pathlib
import sqlite3
import sys

sql_path = pathlib.Path(sys.argv[1])
db_path = pathlib.Path(sys.argv[2])
manifest_path = pathlib.Path(sys.argv[3])

if db_path.exists():
	db_path.unlink()

conn = sqlite3.connect(db_path)
try:
	conn.executescript(sql_path.read_text())
	result = {
		"tables": conn.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0],
		"views": conn.execute("SELECT count(*) FROM sqlite_master WHERE type='view'").fetchone()[0],
		"triggers": conn.execute("SELECT count(*) FROM sqlite_master WHERE type='trigger'").fetchone()[0],
		"checksum": hashlib.sha256(sql_path.read_bytes()).hexdigest(),
	}
	manifest = json.loads(manifest_path.read_text())
	manifest["restoreCheck"] = result
	manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
finally:
	conn.close()
PY

echo "Backup written to $sql_file"
echo "Checksum written to $output_dir/$db_name.sql.sha256"
echo "Restore validation written to $manifest_file"
