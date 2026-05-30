#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
parent_root="${AWCMS_PARENT_ROOT:-$repo_root}"
source_dir="${AWCMS_UPSTREAM_CACHE_DIR:-${EMDASH_LATEST_DIR:-$parent_root/emdash-latest}}"
target_dir="${AWCMSMICRO_DEV_DIR:-$parent_root/awcmsmicro-dev}"
protected_list="${AWCMSMICRO_PROTECTED_PATHS:-$parent_root/scripts/awcms-micro-protected-paths.txt}"
dry_run=false
no_backup=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dry-run) dry_run=true; shift ;;
		--no-backup) no_backup=true; shift ;;
		--help)
			echo "Usage: bash scripts/update-awcmsmicro-dev.sh [--dry-run] [--no-backup]"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
	esac
done

if [[ ! -d "$source_dir" ]]; then
	echo "Missing upstream source directory: $source_dir" >&2
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

mkdir -p "$target_dir"

protected_paths=()
protected_excludes=()

add_exclude() {
	local candidate="$1"
	for existing in "${protected_excludes[@]}"; do
		if [[ "$existing" == "$candidate" ]]; then
			return
		fi
	done
	protected_excludes+=("$candidate")
}

while IFS= read -r rel_path; do
	[[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
	if [[ "$rel_path" = /* || "$rel_path" == *".."* ]]; then
		echo "Invalid protected path entry: $rel_path" >&2
		exit 1
	fi
	if [[ "$rel_path" == awcmsmicro-dev/* ]]; then
		normalized_path="${rel_path#awcmsmicro-dev/}"
		protected_paths+=("$normalized_path")
		add_exclude "$normalized_path"

		parent_path=$(dirname -- "$normalized_path")
		while [[ "$parent_path" != "." ]]; do
			if [[ ! -e "$source_dir/$parent_path" ]]; then
				add_exclude "$parent_path/"
			fi
			parent_path=$(dirname -- "$parent_path")
		done
	fi
done < "$protected_list"

if [[ ${#protected_paths[@]} -eq 0 ]]; then
	echo "No awcmsmicro-dev protected paths were found in $protected_list" >&2
	exit 1
fi

if ! $no_backup && ! $dry_run; then
	timestamp=$(date +%Y%m%d-%H%M%S)
	backup_root="$parent_root/update-backup/awcmsmicro-dev/$timestamp"
	mkdir -p "$backup_root"
	for rel_path in "${protected_paths[@]}"; do
		if [[ -e "$target_dir/$rel_path" ]]; then
			mkdir -p "$backup_root/$(dirname -- "$rel_path")"
			cp -a "$target_dir/$rel_path" "$backup_root/$rel_path"
		fi
	done
fi

rsync_args=(
	-a
	--delete
	--exclude=.git/
	--exclude=node_modules/
	--exclude=dist/
	--exclude=.astro/
	--exclude=.wrangler/
)

for rel_path in "${protected_excludes[@]}"; do
	rsync_args+=("--exclude=$rel_path")
done

if $dry_run; then
	rsync_args+=(--dry-run --itemize-changes)
fi

rsync "${rsync_args[@]}" "$source_dir/" "$target_dir/"

echo "Rebuilt awcmsmicro-dev from $source_dir into $target_dir"
