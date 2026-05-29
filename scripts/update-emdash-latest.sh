#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
target_dir="${EMDASH_LATEST_DIR:-$repo_root/emdash-latest}"
upstream_url="${EMDASH_UPSTREAM_URL:-https://github.com/emdash-cms/emdash.git}"
upstream_ref="${EMDASH_UPSTREAM_REF:-main}"
cache_dir="${EMDASH_UPSTREAM_CACHE_DIR:-/tmp/opencode/emdash-upstream-latest}"
dry_run=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dry-run) dry_run=true; shift ;;
		--help)
			echo "Usage: bash scripts/update-emdash-latest.sh [--dry-run]"
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
	esac
done

mkdir -p "$(dirname -- "$target_dir")"
mkdir -p "$(dirname -- "$cache_dir")"

if [[ -d "$cache_dir/.git" ]]; then
	git -C "$cache_dir" fetch --depth 1 origin "$upstream_ref"
	git -C "$cache_dir" checkout --detach FETCH_HEAD
	git -C "$cache_dir" clean -fdx
else
	rm -rf "$cache_dir"
	git clone --depth 1 --branch "$upstream_ref" --single-branch "$upstream_url" "$cache_dir"
fi

rsync_args=(
	-a
	--delete
	--exclude=.git/
	--exclude=node_modules/
	--exclude=dist/
)

if $dry_run; then
	rsync_args+=(--dry-run --itemize-changes)
fi

rsync "${rsync_args[@]}" "$cache_dir/" "$target_dir/"

echo "Updated emdash-latest from $(git -C "$cache_dir" rev-parse --short HEAD)"
