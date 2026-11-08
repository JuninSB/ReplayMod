---
title: Development guide
---

# Development guide

## Repository layout

- `roblox/` — Luau recorder and serializers served at `/recorder.lua`.
- `server/` — TypeScript HTTP API, persistence, asset proxy, mesh conversion, and capture codecs.
- `web/templates/` and `web/static/` — Three.js viewer, timeline, asset/material loading, and responsive interface.
- `tests/` and `server/*.test.cjs` — playback checks, codec checks, and HTTP integration tests.
- `docs/` — user setup, asset delivery, API, architecture, and design documentation.
- `dist/` and `web/static/vendor/three/` — generated build artifacts.

## Commands

```sh
npm ci
npm run build
npm test
node --check web/static/app.js
npm run format:check
```

`npm run build` compiles TypeScript and stages Three.js modules. `npm test` runs Node server/codec tests and playback checks. `npm run format` formats TypeScript files. `npm start` runs the local server. These automated checks do not replace executor testing or visual review at desktop and mobile sizes.

## Code and contribution practices

Use two spaces in TypeScript, JavaScript, and CSS. Keep Luau names descriptive, particularly for capture state. Preserve the payload contract (`base`, `frames`, `a`, `u`, `d`, `t`) when changing recorder or playback behavior. Keep browser code separate from server credentials and generated scripts. Update `api.md` when routes or payloads change and update the relevant guides when setup or behavior changes.

Before opening a pull request, describe the user-visible behavior, list checks run and their results, state any untested executor/device behavior, and include desktop/mobile screenshots for interface changes. No Git history is available in the original project checkout to infer an established commit style; use short imperative commit subjects.

## Data and security boundaries

`SERVER_WEBVIEW_DATA_DIR` stores captures. `client-assets/` stores local Roblox client files, while `assetdelivery/` stores downloads by type. `SERVER_WEBVIEW_CLIENT_ASSETS_DIR` and `SERVER_WEBVIEW_ASSET_DELIVERY_DIR` can relocate these directories. Do not commit downloaded Roblox assets, replay data, credentials, `.env`, build outputs, or `node_modules`. Keep the local listener on loopback unless LAN access is needed, and never expose this unauthenticated replay library to the public internet.
