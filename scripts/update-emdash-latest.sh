#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
target_dir="${EMDASH_LATEST_DIR:-$repo_root/emdash-latest}"
upstream_url="${EMDASH_UPSTREAM_URL:-https://github.com/emdash-cms/emdash.git}"
upstream_ref="${EMDASH_UPSTREAM_REF:-main}"

if [[ -d "$target_dir/.git" ]]; then
	git -C "$target_dir" fetch origin "$upstream_ref"
	git -C "$target_dir" checkout "$upstream_ref"
	git -C "$target_dir" pull --ff-only origin "$upstream_ref"
	exit 0
fi

mkdir -p "$(dirname -- "$target_dir")"
git clone --branch "$upstream_ref" --single-branch "$upstream_url" "$target_dir"
