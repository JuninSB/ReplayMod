# Setup and operations

## Configuration

Copy `web/.env.example` to `web/.env` and edit only the settings you need. The Node server reads this file at startup. Do not commit `web/.env`, cookies, access keys, or generated data.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_WEBVIEW_HOST` | `127.0.0.1` | Bind address. Keep loopback for same-device use. |
| `SERVER_WEBVIEW_PORT` | `8000` | HTTP port. |
| `SERVER_WEBVIEW_PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Address embedded in `/recorder.lua`; use the same reachable address from the executor. |
| `SERVER_WEBVIEW_DATA_DIR` | `web/data` | Directory for replay, snapshot and thumbnail data. |
| `SERVER_WEBVIEW_CONTENT_DIR` | `content` | User-owned Roblox assets and generated asset cache. |
| `SERVER_WEBVIEW_ROBLOX_API_KEY` | unset | Optional Roblox Open Cloud key for assets permitted to the associated account. |
| `SERVER_WEBVIEW_ROBLOX_SECURITY_FILE` | unset | Optional path to a private file containing the `.ROBLOSECURITY` value for assets requiring an account session. |
| `SERVER_WEBVIEW_ROBLOX_SECURITY` | unset | Legacy direct-value fallback; prefer the private file. |

Do not expose the server to a public network. For a trusted LAN only, bind to `0.0.0.0`, set the public base URL to the device's LAN IP, and use firewall controls. Never put Roblox credentials in browser code, the repository, screenshots, or logs. Credentials do not bypass Roblox asset permissions.

## Runtime data and cache

The server creates `web/data/` and `content/cache/node/` as needed. Both are local data, ignored by Git, and intentionally absent from this source repository. `SERVER_WEBVIEW_CONTENT_DIR` lets you keep the asset cache outside the checkout. Do not share account-restricted assets or cookies with other users.

Back up `web/data/` if you want to preserve captures. Asset cache files can be downloaded again, subject to Roblox availability and permissions. The project does not bundle Roblox client files or downloaded assets.

## Troubleshooting

- If port 8000 is occupied, choose another `SERVER_WEBVIEW_PORT` and update both browser and executor URLs.
- If the executor cannot send a replay, confirm it can reach the configured base URL and supports the recorder's HTTP transport.
- If an asset is missing, check network access, asset permissions, optional server-side credentials, and server logs. A missing cache is expected on first use.
- `/health` reports whether the Node server is responding.

For development checks, use `npm run build`, `npm test`, `node --check web/static/app.js`, and `npm run format:check`.
