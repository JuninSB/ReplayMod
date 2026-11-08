#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm install; fi
npm run build
exec node dist/server.js
