#!/usr/bin/env bash
# sync-from-awcms-micro.sh
#
# Synchronize this repository from the awcms-micro upstream while preserving
# SIKESRA-specific plugin, template, docs, and demo boundaries.
#
# Usage:
#   bash scripts/sync-from-awcms-micro.sh [options]
#
# Options:
#   --dry-run        Show what would change without applying
#   --no-backup      Skip backup before sync
#   --validate       Run validation after sync
#   --help           Show this help message
#
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd -- "$script_dir/.." && pwd)

dry_run=false
no_backup=false
do_validate=false
awcms_cache_dir="${AWCMS_UPSTREAM_CACHE_DIR:-/tmp/opencode/awcms-micro-latest}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) dry_run=true; shift ;;
    --no-backup) no_backup=true; shift ;;
    --validate) do_validate=true; shift ;;
    --help)
      head -16 "$0" | tail -14
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Load .env if present so override variables are available.
if [[ -f "$repo_root/.env" ]]; then
  set -a
  source "$repo_root/.env"
  set +a
fi

refresh_awcms_cache() {
	mkdir -p "$(dirname -- "$awcms_cache_dir")"
	if [[ -d "$awcms_cache_dir/.git" ]]; then
		git -C "$awcms_cache_dir" fetch --depth 1 origin "$AWCMS_UPSTREAM_REF"
		git -C "$awcms_cache_dir" checkout --detach FETCH_HEAD
		git -C "$awcms_cache_dir" clean -fdx
	else
		rm -rf "$awcms_cache_dir"
		git clone --depth 1 --branch "$AWCMS_UPSTREAM_REF" --single-branch "$AWCMS_UPSTREAM_URL" "$awcms_cache_dir"
	fi
}

refresh_awcms_cache

if $dry_run; then
	AWCMS_UPSTREAM_CACHE_DIR="$awcms_cache_dir/awcmsmicro-dev" bash "$repo_root/scripts/update-awcmsmicro-dev.sh" --dry-run
  exit 0
fi

update_awcms_args=()
if $no_backup; then
	update_awcms_args+=(--no-backup)
fi

AWCMS_UPSTREAM_CACHE_DIR="$awcms_cache_dir/awcmsmicro-dev" bash "$repo_root/scripts/update-awcmsmicro-dev.sh" "${update_awcms_args[@]}"

if $do_validate; then
	bash "$repo_root/scripts/validate-after-sync.sh"
fi

echo "Sync complete."
