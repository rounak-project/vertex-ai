#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

timeout "${SITES_BUILD_TIMEOUT:-120s}" npx vinext build
bash scripts/validate-artifact.sh
