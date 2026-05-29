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
# Environment variables:
#   AWCSM_UPSTREAM_URL     Override upstream repository URL
#   AWCSM_UPSTREAM_REF     Override upstream branch/ref
#   AWCSM_PROTECTED_PATHS  Override protected paths file
#   GITHUB_TOKEN           GitHub PAT for authenticated access (optional)

set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd -- "$script_dir/.." && pwd)

# Defaults
upstream_url="${AWCSM_UPSTREAM_URL:-https://github.com/ahliweb/awcms-micro.git}"
upstream_ref="${AWCSM_UPSTREAM_REF:-main}"
protected_list="${AWCSM_PROTECTED_PATHS:-$repo_root/scripts/awcms-micro-protected-paths.txt}"
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

# Load .env if present (for GITHUB_TOKEN etc.)
if [[ -f "$repo_root/.env" ]]; then
  set -a
  source "$repo_root/.env"
  set +a
fi

# Ensure upstream remote exists
remote_name="awcms-micro"
if ! git remote | grep -q "^${remote_name}$"; then
  echo "Adding upstream remote: $remote_name -> $upstream_url"
  git remote add "$remote_name" "$upstream_url"
fi

# Fetch latest from upstream
echo "Fetching latest from $remote_name ($upstream_ref)..."
git fetch "$remote_name" "$upstream_ref" --tags

if $dry_run; then
  echo ""
  echo "=== DRY RUN ==="
  echo "Upstream changes that would be merged:"
  git log --oneline "HEAD..$remote_name/$upstream_ref" | head -30
  echo ""
  echo "Protected paths that will be preserved:"
  cat "$protected_list" 2>/dev/null | grep -v '^#' | grep -v '^$' || echo "(none)"
  exit 0
fi

# Validate protected paths file exists
if [[ ! -f "$protected_list" ]]; then
  echo "ERROR: Protected paths file not found: $protected_list" >&2
  echo "Create scripts/awcms-micro-protected-paths.txt with one path per line." >&2
  exit 1
fi

# Create backup
if ! $no_backup; then
  timestamp=$(date +%Y%m%d-%H%M%S)
  backup_dir="$repo_root/update-backup/sync/$timestamp"
  mkdir -p "$backup_dir"

  echo "Creating backup at $backup_dir..."
  while IFS= read -r rel_path; do
    [[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
    if [[ -e "$repo_root/$rel_path" ]]; then
      mkdir -p "$backup_dir/$(dirname -- "$rel_path")"
      cp -a "$repo_root/$rel_path" "$backup_dir/$rel_path"
    fi
  done < "$protected_list"
fi

# Merge upstream using subtree strategy for awcmsmicro-dev
echo ""
echo "Merging upstream $remote_name/$upstream_ref into awcmsmicro-dev/..."

# Use git merge with subtree strategy to pull awcms-micro into awcmsmicro-dev/
git merge -s subtree --allow-unrelated-histories "$remote_name/$upstream_ref" \
  -m "chore: sync from awcms-micro upstream ($upstream_ref)" \
  --no-edit 2>/dev/null || {
    echo ""
    echo "Merge had conflicts. Restoring protected paths..."

    # Restore protected paths from backup
    if [[ -n "${backup_dir:-}" && -d "$backup_dir" ]]; then
      while IFS= read -r rel_path; do
        [[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
        if [[ -e "$backup_dir/$rel_path" ]]; then
          rm -rf "$repo_root/$rel_path"
          cp -a "$backup_dir/$rel_path" "$repo_root/$rel_path"
          echo "  Restored: $rel_path"
        fi
      done < "$protected_list"
    fi

    echo ""
    echo "Resolve remaining conflicts manually, then:"
    echo "  git add <resolved files>"
    echo "  git commit"
    exit 1
  }

# Ensure protected paths are intact after merge
echo ""
echo "Verifying protected paths..."
protected_ok=true
while IFS= read -r rel_path; do
  [[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
  if [[ ! -e "$repo_root/$rel_path" ]]; then
    echo "  MISSING: $rel_path"
    protected_ok=false

    # Try to restore from backup
    if [[ -n "${backup_dir:-}" && -e "$backup_dir/$rel_path" ]]; then
      mkdir -p "$repo_root/$(dirname -- "$rel_path")"
      cp -a "$backup_dir/$rel_path" "$repo_root/$rel_path"
      echo "  Restored from backup: $rel_path"
    fi
  fi
done < "$protected_list"

if ! $protected_ok; then
  echo ""
  echo "WARNING: Some protected paths were missing and restored."
  echo "Review the changes before committing."
fi

# Run validation if requested
if $do_validate; then
  echo ""
  echo "Running validation..."

  if command -v pnpm >/dev/null 2>&1; then
    echo "  Checking workspace integrity..."
    pnpm install --frozen-lockfile 2>/dev/null || {
      echo "  WARNING: pnpm install had issues, regenerating lockfile..."
      pnpm install 2>/dev/null || true
    }
  fi

  if [[ -f "$repo_root/scripts/validate-awcmsmicro-boundaries.sh" ]]; then
    echo "  Validating boundaries..."
    bash "$repo_root/scripts/validate-awcmsmicro-boundaries.sh" || true
  fi
fi

echo ""
echo "Sync complete."
echo "Upstream SHA: $(git rev-parse --short $remote_name/$upstream_ref)"
echo "Local HEAD:   $(git rev-parse --short HEAD)"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff --stat HEAD~1"
echo "  2. Run tests: pnpm test (if applicable)"
echo "  3. Commit and push when ready"
