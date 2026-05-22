#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
parent_root="${AWCMS_PARENT_ROOT:-$repo_root}"
source_dir="${EMDASH_LATEST_DIR:-$parent_root/emdash-latest}"
target_dir="${AWCMSMICRO_DEV_DIR:-$parent_root/awcmsmicro-dev}"
protected_list="${AWCMSMICRO_PROTECTED_PATHS:-$parent_root/scripts/awcmsmicro-dev-protected-paths.txt}"

if [[ ! -d "$source_dir" ]]; then
	echo "Missing upstream source directory: $source_dir" >&2
	echo "This script is meant for the eventual parent repository layout." >&2
	exit 1
fi

if [[ ! -f "$protected_list" ]]; then
	echo "Missing protected path list: $protected_list" >&2
	exit 1
fi

if [[ "$source_dir" == "$target_dir" ]]; then
	echo "Source and target directories must differ" >&2
	exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
	echo "rsync is required for safe rebuilds" >&2
	exit 1
fi

timestamp=$(date +%Y%m%d-%H%M%S)
backup_root="$parent_root/update-backup/awcmsmicro-dev/$timestamp"
mkdir -p "$backup_root" "$target_dir"

while IFS= read -r rel_path; do
	[[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
	if [[ "$rel_path" = /* || "$rel_path" == *".."* ]]; then
		echo "Invalid protected path entry: $rel_path" >&2
		exit 1
	fi
	if [[ -e "$target_dir/$rel_path" ]]; then
		mkdir -p "$backup_root/$(dirname -- "$rel_path")"
		cp -a "$target_dir/$rel_path" "$backup_root/$rel_path"
	fi
done < "$protected_list"

rsync -a --delete \
	--exclude '.git/' \
	--exclude 'node_modules/' \
	--exclude 'dist/' \
	"$source_dir/" "$target_dir/"

while IFS= read -r rel_path; do
	[[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
	if [[ -e "$backup_root/$rel_path" ]]; then
		mkdir -p "$target_dir/$(dirname -- "$rel_path")"
		rm -rf "$target_dir/$rel_path"
		cp -a "$backup_root/$rel_path" "$target_dir/$rel_path"
		if [[ ! -e "$target_dir/$rel_path" ]]; then
			echo "Failed to restore protected path: $rel_path" >&2
			exit 1
		fi
	fi
done < "$protected_list"

echo "Rebuilt awcmsmicro-dev from $source_dir into $target_dir"
