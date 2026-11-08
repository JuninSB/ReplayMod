# Setup and operations

## Configuration

Copy `web/.env.example` to `web/.env` and edit only the settings you need. The Node server reads this file at startup. Do not commit `web/.env`, cookies, access keys, or generated data.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_WEBVIEW_HOST` | `127.0.0.1` | Bind address. Keep loopback for same-device use. |
| `SERVER_WEBVIEW_PORT` | `8000` | HTTP port. |
| `SERVER_WEBVIEW_PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Address embedded in `/recorder.lua`; use the same reachable address from the executor. |
| `SERVER_WEBVIEW_DATA_DIR` | `web/data` | Directory for replay, snapshot and thumbnail data. |
| `SERVER_WEBVIEW_CLIENT_ASSETS_DIR` | `client-assets` | Private local `rbxasset://` files, including default material maps. |
| `SERVER_WEBVIEW_ASSET_DELIVERY_DIR` | `assetdelivery` | Download cache split into `meshes/`, `textures/`, `audio/`, and `other/`. |
| `SERVER_WEBVIEW_CONTENT_DIR` | deprecated | Compatibility alias for the old combined `content/` directory. New installs should use the two settings above. |
| `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` | unset | Optional accessible Roblox client `content/` folder for local `rbxasset://` files. No client files are downloaded. |
| `SERVER_WEBVIEW_ROBLOX_API_KEY` | unset | Optional Roblox Open Cloud key for assets permitted to the associated account. |
| `SERVER_WEBVIEW_ROBLOX_SECURITY_FILE` | unset | Optional path to a private file containing the `.ROBLOSECURITY` value for assets that require your account session. |
| `SERVER_WEBVIEW_ROBLOX_SECURITY` | unset | Legacy direct-value fallback; prefer the private file. |

Do not expose the server to a public network. For a trusted LAN only, bind to `0.0.0.0`, set the public base URL to the device's LAN IP, and use firewall controls. Never put Roblox credentials in browser code, the repository, screenshots, or logs. Credentials do not bypass Roblox asset permissions.

If an asset requires an account session, prefer leaving the optional credential unset. If you decide to configure it, create a file readable only by your user, outside the repository and outside shared, public, or cloud-synced storage. For example, use `$HOME/.config/replay-mod/roblox-security` on Linux/macOS or `%LOCALAPPDATA%\\ReplayMod\\roblox-security` on Windows; on Android/Termux use a private path under `~/.config/`, not shared storage. Restrict file permissions (for example, `chmod 600 ~/.config/replay-mod/roblox-security`), set `SERVER_WEBVIEW_ROBLOX_SECURITY_FILE` to its path, and restart the server. This is a sensitive Roblox account session: do not send it to anyone, paste it into chat, or use a primary account if you can avoid it. Delete the file and revoke the session from Roblox account security settings when it is no longer needed. Open Cloud API keys are separate credentials and do not replace this session for arbitrary account-only downloads.

## Runtime data and cache

The server creates `web/data/` and the typed Asset Delivery cache folders as needed. Local client assets and downloaded files are ignored by Git; the repository contains empty placeholders only. `tools/migrate-assets.mjs` moves an older `content/` tree into `client-assets/` and moves its `cache/node/` entries into the matching `assetdelivery/` buckets. Preview with `node tools/migrate-assets.mjs --dry-run`, then run it without that flag; pass another project directory as the first argument to migrate a separate installation. `tools/clear-assetdelivery-cache.sh` clears downloaded entries under `assetdelivery/` and the old `content/cache/node/` path, while preserving the core client files and empty folder markers. It asks for confirmation; use `--dry-run` to preview or `--yes` for automation. `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` can still point to an accessible installed client folder. The server does not fetch or package client files. Do not share account-restricted assets or cookies with other users.

Back up `web/data/` if you want to preserve captures. Asset Delivery cache files can be downloaded again, subject to Roblox availability and permissions. Keep any private client-asset backup outside the repository; the project does not bundle Roblox client files or downloaded assets.

## Troubleshooting

- If port 8000 is occupied, choose another `SERVER_WEBVIEW_PORT` and update both browser and executor URLs.
- If the executor cannot send a replay, confirm it can reach the configured base URL and supports the recorder's HTTP transport.
- If an asset is missing, check network access, asset permissions, optional server-side credentials, and server logs. A missing cache is expected on first use.
- `/health` reports whether the Node server is responding.

For development checks, use `npm run build`, `npm test`, `node --check web/static/app.js`, and `npm run format:check`.
