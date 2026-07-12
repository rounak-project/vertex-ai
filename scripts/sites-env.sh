#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export HOME="${SITES_HOME:-$ROOT/.sites-runtime/home}"
export npm_config_cache="${SITES_NPM_CACHE:-$ROOT/.sites-runtime/npm-cache}"
export XDG_CACHE_HOME="${SITES_XDG_CACHE_HOME:-$ROOT/.sites-runtime/xdg-cache}"
export TMPDIR="${SITES_TMPDIR:-$ROOT/.sites-runtime/tmp}"

mkdir -p "$HOME" "$npm_config_cache" "$XDG_CACHE_HOME" "$TMPDIR"
exec "$@"
