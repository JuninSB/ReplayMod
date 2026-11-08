---
title: Replay Mod developer documentation
---

# Replay Mod

Replay Mod records Roblox scenes replicated to a client, stores snapshots and delta-based replays on a local Node.js server, and reconstructs them in a Three.js browser viewer. The project is an independent community tool; it is not affiliated with Roblox Corporation.

## Start here

- [Install and configure the local server](setup.md)
- [Understand Roblox asset delivery](asset-delivery.md)
- [Develop and verify the project](development.md)
- [Local HTTP API and payload format](api.md)
- [Architecture](arquitetura.md)
- [Interaction and visual design](design.md)

## What it captures

The Luau recorder stores an initial scene and subsequent changes to supported parts, decals, camera, and selected lighting properties. Replay playback reconstructs those recorded values; it does not simulate the Roblox engine, server scripts, physics, audio, or unsaved instance properties. Capture scope and asset permissions affect what the viewer can show.

## Project and license

Source code is hosted at [GitHub](https://github.com/JuninSB/ReplayMod) under GNU GPL version 3 only. Roblox assets are not bundled and remain subject to their owners' permissions and Roblox's terms. See [the license](https://github.com/JuninSB/ReplayMod/blob/main/LICENSE) and [third-party notices](https://github.com/JuninSB/ReplayMod/blob/main/THIRD-PARTY-NOTICES.md).
