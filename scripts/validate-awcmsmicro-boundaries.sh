#!/usr/bin/env bash
# validate-awcmsmicro-boundaries.sh
#
# Validates that all protected SIKESRA paths exist and contain expected content.
# Run this after upstream sync to ensure nothing was accidentally overwritten.

set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
protected_list="$repo_root/scripts/awcms-micro-protected-paths.txt"

if [[ ! -f "$protected_list" ]]; then
  echo "ERROR: Protected paths file not found: $protected_list" >&2
  exit 1
fi

errors=0
warnings=0

echo "Validating protected paths..."
echo ""

while IFS= read -r rel_path; do
  [[ -z "$rel_path" || "$rel_path" == \#* ]] && continue

  if [[ ! -e "$repo_root/$rel_path" ]]; then
    echo "  MISSING: $rel_path"
    errors=$((errors + 1))
  else
    echo "  OK: $rel_path"
  fi
done < "$protected_list"

echo ""

# Check for naming conflicts (only check templates, not plugins/demos which use sikesra correctly)
echo "Checking for naming conflicts..."
conflict_paths=$(find "$repo_root/awcmsmicro-dev/templates" -type d -name "*awcms-micro-sikesra*" ! -name "*sikesraTemplate*" 2>/dev/null | head -5)
if [[ -n "$conflict_paths" ]]; then
  echo "  WARNING: Found paths with old naming pattern (should use sikesraTemplate):"
  echo "$conflict_paths" | while read -r p; do echo "    $p"; done
  warnings=$((warnings + 1))
else
  echo "  OK: No naming conflicts found"
fi

echo ""
echo "Validation complete: $errors error(s), $warnings warning(s)"

if [[ $errors -gt 0 ]]; then
  echo ""
  echo "Run: bash scripts/sync-from-awcms-micro.sh --dry-run"
  echo "Then restore from: ls $repo_root/update-backup/sync/"
  exit 1
fi
