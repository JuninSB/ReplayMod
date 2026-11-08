---
title: Install and configure
---

# Install and configure

## Requirements

- Node.js 22 or newer and npm.
- A Roblox executor that supports the recorder's HTTP requests and `loadstring` workflow.
- Internet access when the viewer needs an asset that is not in the local cache.

## Fresh install

Install Node.js 22 or newer, extract a release ZIP or clone the repository, then open a terminal in the Replay Mod project folder. A Git clone is:

```sh
git clone https://github.com/JuninSB/ReplayMod.git
cd ReplayMod
npm ci --no-bin-links
npm run build
npm start
```

Open `http://127.0.0.1:8000`. In the executor on the same device, run:

```lua
loadstring(game:HttpGet("http://127.0.0.1:8000/recorder.lua"))()
```

Keep the server running while recording or viewing captures. `./start.sh` (Unix/Termux) and `start.bat` (Windows) install dependencies when needed, build, and start the server. For an extracted release ZIP, skip `git clone` and `cd` into the extracted project directory before running the npm commands.

### Capture login and upload token

For browser and Roblox on the same device, keep the default `127.0.0.1` address. The recorder obtains a short-lived upload token from the local server automatically; you do not create or copy a token.

For Roblox on a phone and Replay Mod on another computer on the same trusted Wi-Fi network, create `web/.env` from `web/.env.example`, then set the server computer's LAN address. For example:

```dotenv
SERVER_WEBVIEW_HOST=0.0.0.0
SERVER_WEBVIEW_PUBLIC_BASE_URL=http://192.168.1.24:8000
```

Replace `192.168.1.24` with the server computer's current LAN IP, allow port 8000 through its private-network firewall, and restart Replay Mod. The terminal prints a 20-digit login code. Enter that code in the recorder UI on the phone; it expires after 30 minutes and is used once. This code authorizes replay uploads from the phone. It is not a Roblox password, Asset Delivery key, or permanent token. Do not expose the server to the public internet.

### Asset Delivery

Asset Delivery works automatically for supported `rbxassetid://` references when the viewer requests them: Replay Mod fetches permitted assets from Roblox and caches them under `assetdelivery/meshes/` or `assetdelivery/textures/`. The first fetch needs internet access. Cache folders are created as needed and remain local; they are not included in the source ZIP. Depending on the asset and Roblox access response, you can optionally configure your own `.ROBLOSECURITY` session or an eligible Open Cloud key on the server.

With your cookie configured, Replay Mod can request supported public assets through your Roblox session. A cookie does not restore deleted assets or bypass privacy: private assets the account is not permitted to access remain unavailable.

`rbxasset://` references are different: they point to built-in files from a Roblox client installation, not Asset Delivery IDs. To show those files, optionally copy the client's `content/` files into `client-assets/` or configure `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` below. Asset Delivery cannot provide missing built-in client files.

#### Optional Roblox session cookie

If your Asset Delivery requests need your Roblox session, configure the cookie as a private file on the server machine, outside the project folder. Place your own `.ROBLOSECURITY` value on one line; it may be raw or prefixed with `.ROBLOSECURITY=`. Do not put the value in browser code, the executor script, or chat.

On Linux/macOS/Termux, for example:

```sh
mkdir -p "$HOME/.config/replay-mod"
chmod 700 "$HOME/.config/replay-mod"
# Create this file with a text editor and enter the cookie locally:
nano "$HOME/.config/replay-mod/roblox-security"
chmod 600 "$HOME/.config/replay-mod/roblox-security"
```

On Windows, create `%LOCALAPPDATA%\ReplayMod\roblox-security` and store the value in that file. Then set the private file path in `web/.env` (use forward slashes in Windows paths):

```dotenv
SERVER_WEBVIEW_ROBLOX_SECURITY_FILE=/home/your-user/.config/replay-mod/roblox-security
```

Replace the example with the server user's actual path. Restart Replay Mod after changing the `.env` setting. The server reads the cookie file when it makes an asset request. Keep the session private and revoke it in Roblox account security settings when it is no longer needed. A cookie cannot grant permission to assets the account cannot access.

#### Optional Open Cloud key

If an asset you own or have permission to access still fails, first check the server log and Roblox's asset permissions. For an asset supported by Open Cloud, create an API key with the narrow `legacy-asset:manage` permission and add it to the private `web/.env` file:

```dotenv
SERVER_WEBVIEW_ROBLOX_API_KEY=your-key
```

Restart the server after editing `.env`. Keep the key on the server; never put it in Luau, browser code, a replay, or Git. Open Cloud keys do not grant access to assets you are not allowed to use. See the [Asset Delivery guide](asset-delivery.md) for supported formats, cache behavior, and troubleshooting.

## Add local Roblox content files

The repository contains an empty `client-assets/` placeholder, not Roblox client files. Missing `rbxasset://` resources such as `textures/face.png` or `textures/studs.dds` stay unavailable until you provide local client assets or configure an accessible source folder. `rbxassetid://` assets are resolved separately through Asset Delivery when permitted.

1. Obtain a client `content/` directory that you are authorized to use. The Roblox Creator Hub documents the Windows Player location as `%LOCALAPPDATA%/Roblox/Versions/<version>/content`.
2. Copy the needed files into the project's `client-assets/` directory, or set `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` to the existing source directory in your private `web/.env`. To use a different local copy path, set `SERVER_WEBVIEW_CLIENT_ASSETS_DIR`.
3. The preferred option is to point `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` directly at the source folder. If you keep a separate local copy, copy the contents of the client `content/` folder directly into `client-assets/`. This keeps built-in textures, sky files, and local material maps together without copying the Player executable. For example, in PowerShell:

   ```powershell
   $source = "$env:LOCALAPPDATA/Roblox/Versions/version-REPLACE-ME/content"
   New-Item -ItemType Directory -Force "./client-assets" | Out-Null
   Copy-Item "$source/*" "./client-assets/" -Recurse -Force
   ```

   Replace `version-REPLACE-ME` with the folder that contains `RobloxPlayerBeta.exe`. The destination should look like `ReplayMod/client-assets/textures/face.png`, not `ReplayMod/client-assets/content/textures/face.png`. Files from a local `material_textures/` directory also remain under `client-assets/material_textures/` for built-in material maps.

4. Restart the server and verify a known file using the PowerShell request in the [Asset Delivery tutorial](asset-delivery.md#fresh-setup-tutorial-use-an-installed-windows-player-content-folder).

Keep any local copy outside Git; `client-assets/` is ignored by the repository. Do not upload or redistribute the copied files. On Android, Roblox stores app files in private app storage. Termux normally cannot read that private folder, so a fresh Android/Termux-only installation cannot populate the base files from the Roblox app. To use client content with a phone executor, run Replay Mod on a desktop with accessible content and connect over a trusted LAN; otherwise, use permitted `rbxassetid://` assets through Asset Delivery.

## Configuration

Copy `web/.env.example` to `web/.env` and change only the values you need.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_WEBVIEW_HOST` | `127.0.0.1` | Listener address. Keep loopback for same-device use. |
| `SERVER_WEBVIEW_PORT` | `8000` | HTTP port. |
| `SERVER_WEBVIEW_PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Address embedded in the executor script. |
| `SERVER_WEBVIEW_DATA_DIR` | `web/data` | Replay, snapshot, and thumbnail storage. |
| `SERVER_WEBVIEW_CLIENT_ASSETS_DIR` | `client-assets` | Local client files, including built-in textures and material maps. |
| `SERVER_WEBVIEW_ASSET_DELIVERY_DIR` | `assetdelivery` | Downloaded asset cache, separated by kind. |
| `SERVER_WEBVIEW_CONTENT_DIR` | deprecated | Compatibility setting for the previous combined folder. |
| `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` | Unset | Optional accessible Roblox client `content/` directory for local `rbxasset://` paths. The server does not download client files. |
| `SERVER_WEBVIEW_ROBLOX_API_KEY` | Unset | Optional Open Cloud key for supported operations on assets the key can access. |
| `SERVER_WEBVIEW_ROBLOX_SECURITY_FILE` | Unset | Optional private file path for a Roblox session credential. Avoid configuring this unless required. |

The app works locally without a public domain or tunnel. For access from another device on a trusted LAN, bind `SERVER_WEBVIEW_HOST=0.0.0.0` and set the base URL to the server device's reachable LAN address. The server displays a temporary login code in its terminal for non-loopback connections. Avoid public networks; the LAN library has no user accounts.

## Protect local data and credentials

Replays and snapshots are stored under `web/data/`; downloaded files are stored under `assetdelivery/meshes/` and `assetdelivery/textures/`. These are local runtime data, excluded from Git. Back up captures separately if you need to keep them. Use `node tools/migrate-assets.mjs --dry-run` to preview an older `content/` migration, then run it without the preview flag. Use `bash tools/clear-assetdelivery-cache.sh --dry-run` to inspect the Asset Delivery cache before clearing it; the cleaner also recognizes the old `content/cache/node/` location and never removes client assets.

Never commit `.env` files, Roblox cookies, API keys, access codes, generated tokens, captures, or downloaded Roblox assets. If an account session is required for an asset, prefer leaving it unset. Otherwise, keep its file outside the repository and outside shared/public/cloud-synced storage. Example private locations are `$HOME/.config/replay-mod/roblox-security` on Linux/macOS, `%LOCALAPPDATA%/ReplayMod/roblox-security` on Windows, and `~/.config/replay-mod/roblox-security` in Termux. Restrict access (for example, `chmod 600 ~/.config/replay-mod/roblox-security`) and set `SERVER_WEBVIEW_ROBLOX_SECURITY_FILE` to the private file's path. A Roblox session is a sensitive account credential; never paste or share it. Revoke it when no longer needed. Open Cloud keys are separate and do not grant universal access to private downloads. Read the [asset delivery guide](asset-delivery.md) before building an asset integration.

`rbxasset://` files refer to a local Roblox client content directory, not an Asset Delivery asset ID. If the directory is accessible on the server machine, set `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` to its `content/` path. On Windows, that is inside a versioned directory under `%LOCALAPPDATA%/Roblox/Versions/`. Android apps keep private files sandboxed; Termux may not be able to read the Roblox app's install data. Replay Mod does not download or bundle proprietary client files; see the [Asset Delivery guide](asset-delivery.md).

## Troubleshooting

- If port 8000 is occupied, change `SERVER_WEBVIEW_PORT` and use the matching port in the browser and executor URLs.
- If the executor cannot upload, verify that it can reach the configured base URL and supports the recorder's HTTP transport. For LAN use, enter the current login code printed by the server.
- If an asset is missing, check the source property, network, permissions, supported file format, and server log. An empty cache on first run is expected.
- `/health` reports whether the Node server is responding.
