#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

timeout "${SITES_INSTALL_TIMEOUT:-300s}" npm ci --prefer-offline --fetch-retries=0 --maxsockets=1
