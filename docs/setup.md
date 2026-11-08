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
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:8000`. In the executor on the same device, run:

```lua
loadstring(game:HttpGet("http://127.0.0.1:8000/recorder.lua"))()
```

Keep the server running while recording or viewing captures. `./start.sh` (Unix/Termux) and `start.bat` (Windows) install dependencies when needed, build, and start the server. For an extracted release ZIP, skip `git clone` and `cd` into the extracted project directory before running the npm commands.

## Add local Roblox content files

The repository does not include Roblox's client `content/` files. Missing `rbxasset://` resources such as `textures/face.png` or `textures/studs.dds` will stay unavailable until the server can read those files. `rbxassetid://` assets are resolved separately through Asset Delivery when permitted.

1. Obtain a `content/` directory you are authorized to use. The Roblox Creator Hub documents the Windows Player location as `%LOCALAPPDATA%/Roblox/Versions/<version>/content`.
2. In the Replay Mod project, use the default `content/` directory, or set `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` to the full path of the existing source directory in your private `web/.env`.
3. The preferred option is to point `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` directly at the source folder. If your local use permits a separate private copy, copy only the `textures/` and `sky/` subfolders Replay Mod currently references, rather than copying the whole client folder. For example, in PowerShell:

   ```powershell
   $source = "$env:LOCALAPPDATA/Roblox/Versions/version-REPLACE-ME/content"
   New-Item -ItemType Directory -Force "./content" | Out-Null
   foreach ($folder in @("textures", "sky")) {
     $sourceFolder = Join-Path $source $folder
     if (Test-Path $sourceFolder) {
       Copy-Item $sourceFolder "./content/" -Recurse -Force
     }
   }
   ```

   Replace `version-REPLACE-ME` with the folder that contains `RobloxPlayerBeta.exe`. The destination should look like `ReplayMod/content/textures/face.png`, not `ReplayMod/content/content/textures/face.png`. These folders correspond to assets in the client texture package (often named `Textures.zip`); see [the exact paths the viewer uses](asset-delivery.md#which-local-client-files-replay-mod-needs).

4. Restart the server and verify a known file using the PowerShell request in the [Asset Delivery tutorial](asset-delivery.md#fresh-setup-tutorial-use-an-installed-windows-player-content-folder).

Keep any local copy outside Git; `content/` is ignored by the repository. Do not upload or redistribute the copied files. On Android, Roblox stores app files in private app storage. Termux normally cannot read that private folder, so a fresh Android/Termux-only installation cannot populate the base files from the Roblox app. To use client content with a phone executor, run Replay Mod on a desktop with accessible content and connect over a trusted LAN; otherwise, use permitted `rbxassetid://` assets through Asset Delivery.

## Configuration

Copy `web/.env.example` to `web/.env` and change only the values you need.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_WEBVIEW_HOST` | `127.0.0.1` | Listener address. Keep loopback for same-device use. |
| `SERVER_WEBVIEW_PORT` | `8000` | HTTP port. |
| `SERVER_WEBVIEW_PUBLIC_BASE_URL` | `http://127.0.0.1:8000` | Address embedded in the executor script. |
| `SERVER_WEBVIEW_DATA_DIR` | `web/data` | Replay, snapshot, and thumbnail storage. |
| `SERVER_WEBVIEW_CONTENT_DIR` | `content` | User content and generated asset cache. |
| `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` | Unset | Optional accessible Roblox client `content/` directory for local `rbxasset://` paths. The server does not download client files. |
| `SERVER_WEBVIEW_ROBLOX_API_KEY` | Unset | Optional Open Cloud key for supported operations on assets the key can access. |
| `SERVER_WEBVIEW_ROBLOX_SECURITY_FILE` | Unset | Optional private file path for a Roblox session credential. Avoid configuring this unless required. |

The app works locally without a public domain or tunnel. For access from another device on a trusted LAN, bind `SERVER_WEBVIEW_HOST=0.0.0.0` and set the base URL to the server device's reachable LAN address. The server displays a temporary login code in its terminal for non-loopback connections. Avoid public networks; the LAN library has no user accounts.

## Protect local data and credentials

Replays and snapshots are stored under `web/data/`; downloaded asset cache files are under `content/cache/node/`. These are local runtime data, excluded from Git, and not included in the repository. Back up captures separately if you need to keep them.

Never commit `.env` files, Roblox cookies, API keys, access codes, generated tokens, captures, or downloaded Roblox assets. If an account session is required for an asset, prefer leaving it unset. Otherwise, keep its file outside the repository and outside shared/public/cloud-synced storage. Example private locations are `$HOME/.config/replay-mod/roblox-security` on Linux/macOS, `%LOCALAPPDATA%/ReplayMod/roblox-security` on Windows, and `~/.config/replay-mod/roblox-security` in Termux. Restrict access (for example, `chmod 600 ~/.config/replay-mod/roblox-security`) and set `SERVER_WEBVIEW_ROBLOX_SECURITY_FILE` to the private file's path. A Roblox session is a sensitive account credential; never paste or share it. Revoke it when no longer needed. Open Cloud keys are separate and do not grant universal access to private downloads. Read the [asset delivery guide](asset-delivery.md) before building an asset integration.

`rbxasset://` files refer to a local Roblox client content directory, not an Asset Delivery asset ID. If the directory is accessible on the server machine, set `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` to its `content/` path. On Windows, that is inside a versioned directory under `%LOCALAPPDATA%/Roblox/Versions/`. Android apps keep private files sandboxed; Termux may not be able to read the Roblox app's install data. Replay Mod does not download or bundle proprietary client files; see the [Asset Delivery guide](asset-delivery.md).

## Troubleshooting

- If port 8000 is occupied, change `SERVER_WEBVIEW_PORT` and use the matching port in the browser and executor URLs.
- If the executor cannot upload, verify that it can reach the configured base URL and supports the recorder's HTTP transport. For LAN use, enter the current login code printed by the server.
- If an asset is missing, check the source property, network, permissions, supported file format, and server log. An empty cache on first run is expected.
- `/health` reports whether the Node server is responding.
