#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
protected_list="$repo_root/scripts/awcmsmicro-dev-protected-paths.txt"
implementation_root="$repo_root"

if [[ -d "$repo_root/awcmsmicro-dev" ]]; then
	implementation_root="$repo_root/awcmsmicro-dev"
fi

if [[ ! -f "$protected_list" ]]; then
	echo "Missing protected path list: $protected_list" >&2
	exit 1
fi

missing=0
while IFS= read -r rel_path; do
	[[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
	if [[ ! -e "$implementation_root/$rel_path" ]]; then
		echo "Missing protected path: $rel_path" >&2
		missing=1
	fi
done < "$protected_list"

is_allowed_hit() {
	local hit="$1"
	while IFS= read -r rel_path; do
		[[ -z "$rel_path" || "$rel_path" == \#* ]] && continue
		if [[ "$hit" == "$rel_path" || "$hit" == "$rel_path/"* ]]; then
			return 0
		fi
	done < "$protected_list"

	case "$hit" in
	packages/plugins/sikesra|packages/plugins/sikesra/*)
		return 0
		;;
	docs/sikesra|docs/sikesra/*)
		return 0
		;;
	demos/cloudflare|demos/cloudflare/*)
		return 0
		;;
	demos/plugins-demo|demos/plugins-demo/*)
		return 0
		;;
	infra/sikesra|infra/sikesra/*)
		return 0
		;;
	scripts/sikesra-*.mjs)
		return 0
		;;
	update-backup/d1|update-backup/d1/*)
		return 0
		;;
	tmp/prompt-refactor)
		return 0
		;;
	esac

	return 1
}

mapfile -t path_hits < <(cd "$implementation_root" && rg --files | rg '(^|/)(sikesra|awcms-micro-sikesra)')

unexpected=0
for hit in "${path_hits[@]}"; do
	if ! is_allowed_hit "$hit"; then
		echo "Unexpected SIKESRA-scoped path outside protected list: $hit" >&2
		unexpected=1
	fi
done

if [[ $missing -ne 0 || $unexpected -ne 0 ]]; then
	exit 1
fi

echo "Protected path validation passed"
