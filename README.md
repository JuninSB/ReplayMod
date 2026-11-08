# Replay Mod

Replay Mod records Roblox scenes into snapshots and delta-based replays, then plays them in a browser viewer for desktop and mobile. The recorder is Luau; the local server and asset proxy are TypeScript/Node.js; the viewer uses Three.js.

## Requirements

- Node.js 22 or newer and npm.
- A Roblox executor that supports the recorder's HTTP requests and `loadstring` workflow.
- Internet access only when the viewer needs to fetch Roblox assets that are not already in your local cache.

## Install and run

Clone the repository, then run from its root:

```sh
npm ci
npm run build
npm start
```

Open <http://127.0.0.1:8000> in the browser. In the executor on the same device, run:

```lua
loadstring(game:HttpGet("http://127.0.0.1:8000/recorder.lua"))()
```

Keep the server running while recording or viewing replays. `./start.sh` (Unix/Termux) and `start.bat` (Windows) install dependencies when needed, build, and start the server.

## Configuration and local data

The server binds to `127.0.0.1` by default. That keeps it local to the device. For a trusted LAN setup, set `SERVER_WEBVIEW_HOST=0.0.0.0` and `SERVER_WEBVIEW_PUBLIC_BASE_URL` to the device's reachable address. Read [configuration and security](docs/operacao.md) before exposing it to other devices.

Replays and snapshots are created under `web/data/`. Roblox asset downloads are cached under `content/cache/node/`; both directories are local runtime data and ignored by Git. The repository intentionally contains no Roblox client cache or downloaded Roblox assets. Users create their own cache as they use the application. Asset credentials are optional and must remain on the server; see the configuration guide.

## Develop and verify

```sh
npm run build
npm test
node --check web/static/app.js
npm run format:check
```

See [contributor guide](AGENTS.md), [development notes](docs/arquitetura.md), [operations and configuration](docs/operacao.md), and the [HTTP API](docs/api.md). Tests do not replace testing with the intended executor or checking the viewer on a physical mobile device.

## License

This project is distributed under GNU GPL version 3 only; see [LICENSE](LICENSE). Notices for the original MIT-licensed Webview source and bundled dependencies are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Roblox assets are not included and remain subject to their own terms.
