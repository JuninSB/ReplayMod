#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
export SERVER_WEBVIEW_HOST="${SERVER_WEBVIEW_HOST:-127.0.0.1}"
export SERVER_WEBVIEW_PORT="${SERVER_WEBVIEW_PORT:-8000}"
export SERVER_WEBVIEW_PUBLIC_BASE_URL="${SERVER_WEBVIEW_PUBLIC_BASE_URL:-http://127.0.0.1:${SERVER_WEBVIEW_PORT}}"

show_access() {
  printf '\nAbra no navegador: %s\n' "$SERVER_WEBVIEW_PUBLIC_BASE_URL"
  printf 'No executor: loadstring(game:HttpGet("%s/recorder.lua"))()\n' "$SERVER_WEBVIEW_PUBLIC_BASE_URL"
  printf 'Mantenha o Termux aberto.\n\n'
}

if [ "$(curl -fsS --max-time 2 "http://127.0.0.1:${SERVER_WEBVIEW_PORT}/health" 2>/dev/null || true)" = '{"status":"ok","runtime":"node"}' ]; then
  printf 'Replay Mod já está rodando na porta %s. Para mudar o endereço, pare o servidor e inicie novamente.\n' "$SERVER_WEBVIEW_PORT"
  exit 0
fi
show_access
exec node dist/server.js
