#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
implementation_root="$repo_root"

if [[ -d "$repo_root/awcmsmicro-dev" ]]; then
	implementation_root="$repo_root/awcmsmicro-dev"
fi

bash "$repo_root/scripts/validate-awcmsmicro-boundaries.sh"

pnpm --dir "$implementation_root" lint:quick
pnpm --dir "$implementation_root" typecheck
pnpm --dir "$implementation_root" --filter @ahliweb/plugin-sikesra test
pnpm --dir "$implementation_root" --filter @ahliweb/awcms-micro-sikesra test
pnpm --dir "$implementation_root" --filter @ahliweb/awcms-micro-sikesra build
