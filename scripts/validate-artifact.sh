#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

test -f dist/server/index.js
node --input-type=module -e "
  const mod = await import('./dist/server/index.js');
  const entry = mod.default;
  if (typeof entry !== 'function' && typeof entry?.fetch !== 'function') {
    throw new Error('dist/server/index.js must export a worker handler');
  }
"
