# Setup and operations

## Configuration

Copy `web/.env.example` to `web/.env` and edit only the settings you need. The Node server reads this file at startup. Do not commit `web/.env`, cookies, access keys, or generated data.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_WEBVIEW_HOST` | `127.0.0.1` | Bind address. Keep loopback for same-device use. |
| `SERVER_WEBVIEW_PORT` | `8000` | HTTP port. |
| `SERVER_WEBVIEW_PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Address embedded in `/recorder.lua`; use the same reachable address from the executor. |
| `SERVER_WEBVIEW_LOG_PATH` | `replaymod-server.log` in the project root | Server diagnostics file; its parent directory must exist. Set it as an environment variable before starting the server. |
| `SERVER_WEBVIEW_DATA_DIR` | `web/data` | Directory for replay, snapshot and thumbnail data. |
| `SERVER_WEBVIEW_CLIENT_ASSETS_DIR` | `client-assets` | Bundled `rbxasset://` files, including default material maps. |
| `SERVER_WEBVIEW_ASSET_DELIVERY_DIR` | `assetdelivery` | Download cache split into `meshes/`, `textures/`, `audio/`, and `other/`. |
| `SERVER_WEBVIEW_CONTENT_DIR` | deprecated | Compatibility alias for the old combined `content/` directory. New installs should use the two settings above. |
| `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` | unset | Optional accessible Roblox client `content/` folder for local `rbxasset://` files. No client files are downloaded. |
| `SERVER_WEBVIEW_ROBLOX_API_KEY` | unset | Optional Roblox Open Cloud key for assets permitted to the associated account. |

Do not expose the server to a public network. For a trusted LAN only, bind to `0.0.0.0`, set the public base URL to the device's LAN IP, and use firewall controls. Never put Roblox credentials in browser code, the repository, screenshots, or logs. Credentials do not bypass Roblox asset permissions.


## Runtime data and cache

The server creates `web/data/` and the typed Asset Delivery cache folders as needed. Client assets are included in the repository; downloaded files are ignored by Git. `tools/migrate-assets.mjs` moves an older `content/` tree into `client-assets/` and moves its `cache/node/` entries into the matching `assetdelivery/` buckets. Preview with `node tools/migrate-assets.mjs --dry-run`, then run it without that flag; pass another project directory as the first argument to migrate a separate installation. `tools/clear-assetdelivery-cache.sh` clears downloaded entries under `assetdelivery/` and the old `content/cache/node/` path, while preserving the core client files and empty folder markers. It asks for confirmation; use `--dry-run` to preview or `--yes` for automation. `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` can still point to an accessible installed client folder. The server does not fetch client files. Do not share account-restricted assets or cookies with other users.

Back up `web/data/` if you want to preserve captures. Asset Delivery cache files can be downloaded again, subject to Roblox availability and permissions. Keep any private client-asset backup outside the repository; the project does not bundle Roblox client files or downloaded assets.

## Troubleshooting

The server writes upload and authentication request stages, HTTP status codes and durations to `replaymod-server.log`. The recorder writes `replaymod-client.log` in the executor's workspace when `writefile` and `appendfile` are available; it starts a fresh client log each time the recorder is loaded. If file access is unavailable, it warns in the executor console. The diagnostic logs omit request bodies, replay data, codes and tokens. Server logs grow until manually removed or rotated.

- If port 8000 is occupied, choose another `SERVER_WEBVIEW_PORT` and update both browser and executor URLs.
- If the executor cannot send a replay, confirm it can reach the configured base URL and inspect `replaymod-client.log`. Same-device uploads use the loopback GET route, show their piece counter, and retry a failed piece up to four times; a final error includes the piece number and executor error.
- If an asset is missing, check network access, asset permissions, optional server-side credentials, and server logs. A missing cache is expected on first use.
- `/health` reports whether the Node server is responding.

For development checks, use `npm run build`, `npm test`, `node --check web/static/app.js`, and `npm run format:check`.

## Offline sharing

Open a replay or snapshot and choose Share → Download offline HTML. The exporter embeds the capture, local viewer modules, meshes and textures into one HTML file. It uses the server's asset endpoints during export; the downloaded viewer resolves embedded data with Blob URLs and an import map, without a running server. The file opens its one embedded replay or snapshot directly in the viewer instead of rebuilding the library. Missing referenced assets are listed before download; choose Export anyway to include a missing-asset manifest, or close to cancel. The same list is available through Share in the offline viewer. Optional material maps that are unavailable retain the viewer's existing fallbacks. Use a browser with WebGL and import-map support; mobile file previews may require opening the file in the full browser. Large captures can consume substantial browser memory during export and playback. No Roblox credentials or server configuration are included.
