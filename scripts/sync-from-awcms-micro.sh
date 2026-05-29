#!/usr/bin/env bash
# sync-from-awcms-micro.sh
#
# Synchronize this repository from the EmDash upstream while preserving
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

if $dry_run; then
  bash "$repo_root/scripts/update-emdash-latest.sh" --dry-run
  echo ""
  bash "$repo_root/scripts/update-awcmsmicro-dev.sh" --dry-run
  exit 0
fi

bash "$repo_root/scripts/update-emdash-latest.sh"

update_awcms_args=()
if $no_backup; then
	update_awcms_args+=(--no-backup)
fi

bash "$repo_root/scripts/update-awcmsmicro-dev.sh" "${update_awcms_args[@]}"

if $do_validate; then
	bash "$repo_root/scripts/validate-after-sync.sh"
fi

echo "Sync complete."
