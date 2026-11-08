# Replay Mod

Replay Mod records Roblox scenes into snapshots and delta-based replays, then plays them in a browser viewer for desktop and mobile. The recorder is Luau; the local server and asset proxy are TypeScript/Node.js; the viewer uses Three.js.

## Requirements

- Node.js 22 or newer and npm.
- A Roblox executor that supports the recorder's HTTP requests and `loadstring` workflow.
- Internet access only when the viewer needs to fetch Roblox assets that are not already in your local cache.

## Install and run

Clone the repository, then run from its root:

```sh
npm ci --no-bin-links
npm run build
npm start
```

Open <http://127.0.0.1:8000> in the browser. In the executor on the same device, run:

```lua
loadstring(game:HttpGet("http://127.0.0.1:8000/recorder.lua"))()
```

Keep the server running while recording or viewing replays. `./start.sh` (Unix/Termux) and `start.bat` (Windows) install dependencies when needed, build, and start the server. `node_modules/` is generated locally and stays out of Git. The build script handles Android shared storage, where npm cannot create executable symlinks in `.bin/`.

## Configuration and local data

The server binds to `127.0.0.1` by default. That keeps it local to the device. For a trusted LAN setup, set `SERVER_WEBVIEW_HOST=0.0.0.0` and `SERVER_WEBVIEW_PUBLIC_BASE_URL` to the device's reachable address. Read [configuration and security](docs/operacao.md) before exposing it to other devices.

Same-device uploads authenticate automatically; no token setup is needed. For a phone executor connecting to a computer over Wi-Fi, the server prints a temporary login code; see [setup and configuration](docs/setup.md#capture-login-and-upload-token).

Replays and snapshots are created under `web/data/`. Locally supplied Roblox client files go in `client-assets/`; Asset Delivery fetches supported `rbxassetid://` references and caches them under `assetdelivery/meshes/` and `assetdelivery/textures/`. Configure your `.ROBLOSECURITY` cookie in a private server-side file to request supported public assets with your Roblox session. The cookie cannot restore deleted assets or access private assets the account is not permitted to use. Built-in `rbxasset://` files need optional client content under `client-assets/`. These asset folders are ignored except for empty placeholders, so Roblox files and downloads are not shipped in the repository. These files are important for built-in textures; follow the [client assets tutorial](docs/setup.md#add-local-roblox-content-files) to provide them.

## Develop and verify

```sh
npm run build
npm test
node --check web/static/app.js
npm run format:check
```

See [contributor guide](AGENTS.md), [development notes](docs/arquitetura.md), [operations and configuration](docs/operacao.md), and the [HTTP API](docs/api.md). Tests do not replace testing with the intended executor or checking the viewer on a physical mobile device.

The public [developer documentation site](https://juninsb.github.io/ReplayMod/) includes setup instructions and a practical guide to Roblox Asset Delivery for images, meshes, accessories, and audio.

If you use an AI coding agent, this repository includes project instructions in [`AGENTS.md`](AGENTS.md) and the adapted [`develop-web skill`](.agents/skills/desenvolver-web/SKILL.md). Ask the agent to read both before editing; the skill package preserves its original reference material, scripts, and templates.

## License

This project is distributed under GNU GPL version 3 only; see [LICENSE](LICENSE). Notices for the original MIT-licensed Webview source and bundled dependencies are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Roblox assets are not included and remain subject to their own terms.
