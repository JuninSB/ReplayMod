#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm ci --no-bin-links; fi
npm run build
exec node dist/server.js
