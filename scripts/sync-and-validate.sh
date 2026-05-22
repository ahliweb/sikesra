#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

bash "$repo_root/scripts/update-emdash-latest.sh"
bash "$repo_root/scripts/update-awcmsmicro-dev.sh"
bash "$repo_root/scripts/validate-after-sync.sh"
