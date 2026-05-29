#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
implementation_root="$repo_root"

if [[ -d "$repo_root/awcmsmicro-dev" ]]; then
	implementation_root="$repo_root/awcmsmicro-dev"
fi

bash "$repo_root/scripts/validate-awcmsmicro-boundaries.sh"

pnpm --dir "$implementation_root" install --frozen-lockfile || pnpm --dir "$implementation_root" install
pnpm --dir "$implementation_root" lint:quick
pnpm --dir "$implementation_root" --filter @ahliweb/awcms-sikesra typecheck
pnpm --dir "$implementation_root" --filter @ahliweb/awcms-sikesra test
pnpm --dir "$implementation_root" --filter @ahliweb/awcms-sikesraTemplate typecheck
pnpm --dir "$implementation_root" --filter @ahliweb/awcms-sikesraTemplate build
pnpm --dir "$implementation_root" --filter @ahliweb/awcms-sikesraTemplate-cloudflare test
