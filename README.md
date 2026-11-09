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

Replays and snapshots are created under `web/data/`. The repository includes `client-assets/` for built-in `rbxasset://` resources and material textures. Asset Delivery fetches supported `rbxassetid://` references and caches them under `assetdelivery/meshes/` and `assetdelivery/textures/`. You can create an encrypted `auth.lzk8` file for a server-side `.ROBLOSECURITY` session for supported requests; it cannot restore deleted assets or grant access to private assets your account cannot use.

## Share and explore

Open a capture and choose **Menu → Share** to copy a server link or download a single offline HTML file with the viewer, capture, meshes, and textures. It opens its embedded replay or snapshot directly in the viewer, without first showing the library. If assets cannot be included, review the list and choose **Export anyway** or close to cancel. The missing-asset list stays in the exported file. Open the HTML in a browser with WebGL and import-map support; no Replay Mod server is required for playback.

Replay cards show the configured TPS in a colored corner badge. The initial camera appears near a visible player, falling back to a scene part. New captures include player health for this choice; older captures use visible loaded players. The recorder samples players' limbs together each tick, and playback uses Roblox's YXZ rotation order with quaternion interpolation. This is not yet a full Motor6D rig reconstruction.

New captures also include a bounded, coarse terrain window around the local player so terrain rocks and hills can appear in the viewer. Record again to add terrain to older captures; smooth terrain, water, and terrain changes are approximations or unsupported.

The terminal offers to create and unlock the encrypted `auth.lzk8` file for Roblox session access. See [setup](docs/setup.md#roblox-session-credential) and [operations](docs/operacao.md) for credentials, diagnostic logs, and offline export limitations.

The viewer starts with its menu collapsed. Use **Menu → Rendering** to adjust scene brightness and shadow range. Use **Menu → Hide UI** to hide controls and **Show UI** to restore them. Dismiss the loading status with × and reopen it from **Menu → Loading status**. Use **Menu → Explorer** to inspect objects and **Menu → Save scene thumbnail** to capture a thumbnail. Loading shows mesh/texture progress, retries failed assets twice, and offers **Retry failed assets** without reloading successful assets. Offline export makes three attempts before listing failures. R6 SpecialMesh heads and smaller text-only nameplates are supported. See the [renderer compatibility guide](docs/rendering.md) for lighting properties, post effects, and the differences from Roblox's engine.

New recordings can include observed sounds, world text and child instances. Explorer lets you temporarily edit supported part and sound properties while replaying or seeking; **Reset viewer edits** restores the recorded values. These edits do not change the recording or the game. Choose touch arrows or joystick under **Menu → Camera**. Older recordings cannot recover information that was not captured.

New recordings also sample the local player's game interface. **Menu → Game UI** displays it during playback; it starts hidden and excludes the recorder. The reconstruction is visual and has compatibility limits described in the [renderer guide](docs/rendering.md).

The viewer uses Three.js r187 and requires a browser with WebGL 2.

## Develop and verify

```sh
npm run build
npm test
node --input-type=module --check < web/static/app.js
npm run format:check
```

See [contributor guide](AGENTS.md), [development notes](docs/arquitetura.md), [operations and configuration](docs/operacao.md), and the [HTTP API](docs/api.md). Tests do not replace testing with the intended executor or checking the viewer on a physical mobile device.

The public [developer documentation site](https://juninsb.github.io/ReplayMod/) includes setup instructions and a practical guide to Roblox Asset Delivery for images, meshes, accessories, and audio.

If you use an AI coding agent, this repository includes project instructions in [`AGENTS.md`](AGENTS.md) and the adapted [`develop-web skill`](.agents/skills/desenvolver-web/SKILL.md). Ask the agent to read both before editing; the skill package preserves its original reference material, scripts, and templates.

## License

This project is distributed under GNU GPL version 3 only; see [LICENSE](LICENSE). Notices for the original MIT-licensed Webview source and bundled dependencies are in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Roblox assets remain subject to their own terms.
