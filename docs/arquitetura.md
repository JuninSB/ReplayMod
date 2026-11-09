# Architecture and development

## Components

- `roblox/`: Luau recorder and serialization, served together at `/recorder.lua`.
- `server/`: TypeScript HTTP server, replay/snapshot persistence, Roblox asset delivery, mesh conversion and capture codecs.
- `web/templates/` and `web/static/`: Three.js viewer, timeline, asset/material loading and responsive UI.
- `tests/`: playback behavior checks; `server/server.test.cjs`: codec, asset route and HTTP integration checks.
- `tools/copy-three.mjs`: copies the installed Three.js runtime into generated `web/static/vendor/three/` during build.
- `docs/`: configuration, API and contributor documentation.

`npm run build` compiles TypeScript into `dist/` and stages the installed Three.js modules. `npm start` serves the UI, recorder script, APIs, and static assets from one process. The default listener is loopback. The recorder captures an initial scene and then added, changed, and removed instances in frames; the viewer reconstructs those changes for playback.

## Storage boundaries

`SERVER_WEBVIEW_DATA_DIR` holds replay and snapshot data. Bundled `rbxasset://` files are read from `client-assets/`; `SERVER_WEBVIEW_CLIENT_ASSETS_DIR` can point to a private copy elsewhere. Asset Delivery responses are cached separately in `assetdelivery/meshes/` and `assetdelivery/textures/`, with `audio/` and `other/` reserved for later asset kinds. `SERVER_WEBVIEW_ASSET_DELIVERY_DIR` changes that root. The repository includes client assets; cached downloads stay local and ignored by Git. `SERVER_WEBVIEW_CONTENT_DIR` remains a deprecated compatibility alias for older installations.

`SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` optionally points to another accessible Roblox client `content/` folder for `rbxasset://` references. Replay Mod does not download or package the Roblox Player executable. Material maps resolve only from local client assets; unique `rbxassetid://` references use the Asset Delivery proxy and the separate typed cache. Read [asset delivery](asset-delivery.md) for formats and access boundaries.

Do not commit downloaded Roblox assets, replay captures, credentials, build outputs, or `node_modules`. No Roblox physics simulation is attempted; playback reconstructs recorded state. Executor behavior and Roblox-side capture performance require an in-game test.

## Change guidance

Preserve the HTTP payload contract (`base`, `frames`, `a`, `u`, `d`, `t`) when changing capture or playback. Keep asset credentials on the server. Update `docs/api.md` when a public route or payload changes, and update this page when module responsibilities or storage locations change.
