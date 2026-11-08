---
title: Asset delivery guide
---

# Roblox asset delivery for browser tools

This guide explains how a web viewer or capture tool can resolve Roblox asset references. It covers images, mesh content, accessories, and audio.

## Keep the three jobs separate

1. **Discover references.** Read the Roblox instance/property data you already have permission to inspect. Common references include `MeshPart.MeshId`, `MeshPart.TextureID`, `Decal.Texture`, `Texture.Texture`, `SurfaceAppearance.ColorMap`/`NormalMap`/`RoughnessMap`/`MetalnessMap`, and `Sound.SoundId` or `AudioPlayer.Asset`.
2. **Resolve delivery content.** Roblox Asset Delivery serves content for asset IDs and versions. Its current documentation lists `GET /v2/assetId/{assetId}` and a version-specific route. The documented v2 routes are marked experimental; check the live reference before depending on them. The API reference currently describes these routes as requiring no Cookie header. An asset ID is a reference, not a guarantee that a caller can retrieve or use the content.
3. **Render or use it.** A browser viewer must understand the delivered format and the property semantics. A mesh alone does not include its textures, surface maps, accessory attachments, or the Roblox instance hierarchy that uses it.

Roblox documents asset IDs as `rbxassetid://[ID]` references. Models and accessories can contain multiple instances and references, while avatar assets can be permission-restricted. An accessory that appears as a white box or plain shape often points to a missing dependency or unsupported format, rather than one failed... “mesh download.”

## Access and credentials

Asset privacy controls who may use an asset. Imported assets are private by default unless their owner grants access or distributes them appropriately. Audio and video have additional privacy rules. A public-looking ID or a URL copied from a game does not grant reuse rights.

The **Asset Delivery API** delivers content; **Open Cloud Assets APIs** manage supported asset uploads, updates, and metadata. An Open Cloud API key is not a universal download credential and does not grant access to someone else's private assets. Use keys scoped to the operation and resources you own or administer. Never put an API key or Roblox session cookie in browser JavaScript, a replay, a Git repository, a screenshot, or a client-side executor script, if you do you might get your information stolen.

Replay Mod can read a server-side `.ROBLOSECURITY` session file to request supported public assets through that Roblox session. This does not restore deleted assets or grant access to private assets the account is not permitted to use. The cookie is a highly sensitive account credential: store it in a private file outside the repository and shared storage, limit file permissions, use a least-privileged secondary account when possible, and revoke the session when finished. See [configuration and security](operacao.md). Do not use cookie-based access to evade asset privacy, moderation, or licensing.

## A practical resolution pipeline

1. Parse each property reference into a validated asset ID or supported Roblox URI. Reject arbitrary URLs and malformed IDs before making a request.
2. Resolve each dependency independently. For a `MeshPart`, that may mean mesh geometry plus a `TextureID` or one or more `SurfaceAppearance` maps. For an `Accessory`, also preserve the containing instances and attachment transforms. For a sound, retain the `SoundId`/asset reference and playback properties; do not assume a mesh/image endpoint returns audio bytes.
3. Request the documented Asset Delivery route from a server-side component. Treat the response as a delivery response: inspect its status, headers, content type, and documented redirect/metadata behavior. If following a redirect, allow only expected Roblox content hosts, cap redirects, and set timeouts and response-size limits. Do not assume every successful response is directly a PNG, OBJ, or MP3.
4. Validate what arrived before caching it. Record content type and length, reject HTML/error bodies masquerading as files, and use a format-aware parser. Keep Roblox's original data intact when your renderer needs a conversion.
5. Cache by the canonical asset ID plus version or content hash when available. Write to a temporary file and rename after validation. Keep negative/error cache entries short, and avoid caching authentication failures as permanent missing assets.
6. Send only viewer-safe content references to the browser. Keep credentials and upstream request logic on the server; do not expose upstream response headers or private cookies in replay JSON.

The exact response envelope and content formats can change. Follow the current [Asset Delivery reference](https://create.roblox.com/docs/cloud/reference/domains/assetdelivery), including the route's up-to-date parameters and response schema; do not build a downloader around undocumented endpoints or hard-coded CDN hostnames, you can try tought...

## Asset-specific notes

### Images and surface maps

Decals, textures, mesh color maps, and PBR maps are separate references. Preserve UV coordinates and map roles. `ColorMap` is not interchangeable with `NormalMap`, `RoughnessMap`, or `MetalnessMap`; applying every image as a base color produces incorrect shading. Alpha may encode cutouts or transparency, so inspect the image format and material settings before changing blending or depth writes.

### Meshes and accessories

Roblox mesh delivery data is not necessarily OBJ or glTF. Convert only formats you recognize, preserve winding/normals/UVs where possible, and treat LODs as alternate geometry rather than separate accessories. An accessory also needs its instance hierarchy, `Attachment` names/transforms, and the avatar/body part it attaches to. A viewer that only downloads one mesh may show a detached, mis-scaled, untextured, or box-shaped result.

Replay Mod's mesh proxy currently converts a set of Roblox FileMesh versions to OBJ; see the [HTTP API details](api.md). That converter is an implementation detail, not an official stable Roblox format contract. Test real assets from multiple versions and keep a clear fallback when a format is unsupported.

## What Replay Mod currently includes and resolves

# legal part, ignore
The source repository includes only empty `client-assets/` and `assetdelivery/` directory markers. It does **not** include Roblox client files, base textures, or downloaded assets. The viewer reads `rbxasset://` files from `client-assets/` (or a configured accessible client content folder); material maps are local-only files under `client-assets/material_textures/`. The server no longer fetches default material maps by ID. Separately referenced `rbxassetid://` assets use Asset Delivery and are cached under `assetdelivery/meshes/` or `assetdelivery/textures/`.

`rbxassetid://...` references can go through Roblox Asset Delivery, subject to access and supported response formats. `rbxasset://` references point to files in a Roblox client content folder, such as `textures/face.png`. By default, Replay Mod looks for those paths under `client-assets/`; the old `content/` path remains a temporary compatibility fallback. Set `SERVER_WEBVIEW_CLIENT_ASSETS_DIR` to keep that local folder elsewhere, or set `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` to read another accessible client `content/` directory in place. On Windows, the Creator Hub documents a per-version path under `%LOCALAPPDATA%/Roblox/Versions/<version>/content`; choose the active version's `content` directory.

# Android/Mobile
The Roblox Android app's private files are normally sandboxed from Termux, so a Termux server cannot assume it can read them. you will need to get the folder from somewhere else or follow the client assets tutorial in README.md

The generic face fallback in the viewer references `rbxasset://textures/face.png`; it therefore needs that file to be available in one of the configured client-asset directories. A captured custom face decal or a custom head's UV texture is handled separately through recorded references. Roblox built-in base content is not automatically downloadable through the documented Asset Delivery API: use only officially documented asset delivery for `rbxassetid` references, or a client content directory you are authorized to access.

### Which local client files Replay Mod needs

For the viewer's current built-in `rbxasset://` references, the only relevant client package is the one containing textures (often named `Textures.zip`). The code currently requests these paths when their rendering fallback or effect is used:

| Client-relative path | Use in the viewer |
| --- | --- |
| `textures/face.png` | Generic face fallback when a recorded head has no custom face texture |
| `textures/studs.dds` | Studded part surfaces |
| `textures/meshPartFallback.png` | Fallback texture when a mesh has no usable texture |
| `sky/sun.jpg`, `sky/moon.jpg`, `sky/clouds.dds`, `sky/cloudsfb.dds` | Built-in sky sprites and cloud fallback |
| `textures/particles/fire_main.dds`, `fire_sparks_main.dds`, `smoke_main.dds`, `sparkles_main.dds`, `explosion01_*.dds` | Reconstructed particle/effect fallbacks |

For the viewer, do not copy Roblox's `Shaders.zip`: Replay Mod uses Three.js, so equivalent lighting/material effects must be rewritten for its renderer. The launcher/player executables, CoreScripts/Lua packages, translations, sounds, fonts, API dictionaries, and built-in models are not needed to resolve these current texture paths. Local material PBR maps, when supplied, belong under `client-assets/material_textures/`; maps are not silently substituted with Asset Delivery downloads.

Terrain is also technically implementable without `content-terrain.zip`: Roblox exposes `Terrain:ReadVoxelChannels()` for `SolidMaterial`, `SolidOccupancy`, and `LiquidOccupancy`, at resolution 4. A browser renderer can turn captured voxel values into surface geometry and apply Three.js materials. Roblox requires a grid-aligned read region and limits a single read to 4,194,304 voxels, so the recorder needs a bounded region/chunk strategy. For performance, an initial region snapshot plus changed voxel chunks is more practical than rescanning a large terrain area at every replay tick; this is an engineering inference from the API's region limit and the capture rate. See the [Terrain API](https://create.roblox.com/docs/reference/engine/classes/Terrain) and [terrain guide](https://create.roblox.com/docs/building-and-visuals/studio-modeling/terrain). The current recorder does not yet implement terrain capture or rendering.

If you have an authorized local Roblox client `content/` folder, configure the server to read it directly.

# More legal stuff
 If you keep a separate local copy, place the content folder's files directly in `ReplayMod/client-assets/` so `textures/`, `sky/`, and `material_textures/` retain their paths; do not copy the Player executable. Do not fetch package ZIPs through third-party tools or undocumented CDN URLs. Roblox's documented Asset Delivery API serves documented asset-ID routes, not these client packages.

## Fresh setup tutorial: use a Windows Player content folder

This starts with a fresh official Roblox Player installation on the same Windows PC as the Replay Mod server. Roblox's installer places the client content files on that PC; Replay Mod reads them in place. The steps do not download an extra Player package or unpack/copy the client.

1. Install Roblox Player from the official Roblox website and launch a game once. This lets the official installer finish and creates the versioned client directory.
2. Press **Win+R**, enter `%LOCALAPPDATA%/Roblox/Versions`, and open the newest version folder containing `RobloxPlayerBeta.exe`.
3. Open that folder's `content` subfolder. The Creator Hub documents this Windows path under `%LOCALAPPDATA%/Roblox/Versions/<version>/content` (some older installs may use `C:/Program Files (x86)/Roblox/Versions/<version>/content`).
4. Check the expected files inside it. For example, `rbxasset://textures/face.png` maps to `content/textures/face.png`; `rbxasset://textures/studs.dds` maps to `content/textures/studs.dds`; `rbxasset://sky/sun.jpg` maps to `content/sky/sun.jpg`; and `rbxasset://textures/particles/fire_main.dds` maps to `content/textures/particles/fire_main.dds`. Exact files can vary by client version.
5. In `web/.env`, set `SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR` to the full path of the `content` folder itself. Replace the example username and version with the ones on your PC:

   ```dotenv
   SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR=C:/Users/YourName/AppData/Local/Roblox/Versions/version-1234567890abcdef/content
   ```

6. Restart Replay Mod and request a known image through the local proxy. In PowerShell:

   ```powershell
   Invoke-WebRequest 'http://127.0.0.1:8000/api/asset/texture?src=rbxasset%3A%2F%2Ftextures%2Fface.png' -OutFile "$env:TEMP/replaymod-face.png"
   ```

   A successful response writes the file to your temporary directory. If it returns 404, confirm that the configured path ends in `content` and that the selected Player version contains `textures/face.png`.

After a Roblox Player update, the active version directory can change. Repeat steps 2–5 and update the private `.env` path if necessary.

Keep the path in your local, ignored `.env`; do not commit or copy Roblox client files into the repository. A phone can run the executor while the server runs on this Windows PC over a trusted home Wi-Fi network; configure the server's LAN URL and use the current terminal login code as described in [setup](setup.md). If both Roblox and Replay Mod run only on Android/Termux, this tutorial does not apply: Android app-private storage is sandboxed and normally inaccessible to Termux. The supported alternative is Asset Delivery for permitted `rbxassetid://` references, not downloading the Roblox Player package or extracting its built-in files.

### Audio

Audio references are subject to asset privacy and usage permissions. A `SoundId` is a reference, not proof that an arbitrary downloader may obtain the original audio file. Keep audio playback out of scope unless the capture format, browser playback, permission model, and rights to use the audio are all handled. See Roblox's [audio asset documentation](https://create.roblox.com/docs/audio/assets).

### Models and asset management

Models and accessories are hierarchies; resolve their child instances and each referenced dependency. For Studio-side insertion workflows, use the documented `AssetService:LoadAssetAsync` API and permission checks rather than treating a browser download URL as an object loader. The [Studio importer](https://create.roblox.com/docs/studio/importer) is the supported route for bringing new content into a project.

## Troubleshooting checklist

| Symptom | Check |
| --- | --- |
| 401/403 | Asset privacy, owner/granted permissions, and whether the chosen API supports this access path. Do not retry with unrelated credentials. |
| 404 | The ID may be wrong, deleted, moderated, or unavailable through that route. Confirm the source property and current API documentation. |
| 429 or intermittent failures | Apply bounded concurrency, retry with backoff for transient responses, and respect rate limits. Avoid retry storms. |
| HTTP 200 but unreadable file | Inspect content type, response body, and delivery metadata; do not save an HTML/JSON error as a mesh or image. |
| White mesh or accessory | Check mesh bytes, texture and PBR dependencies, UVs, accessory hierarchy/attachments, and renderer format support separately. |
| Image appears on the wrong face | Verify UVs, decal `Face`, `Texture`/`Decal` behavior, transparency, and material map assignment. |
| Asset loads in Roblox but not the browser | The Roblox engine may decode or assemble a format the browser renderer does not support. Add a tested conversion or show a fallback. |

## Related official references

- [Roblox assets and asset URIs](https://create.roblox.com/docs/projects/assets)
- [Asset Delivery API routes](https://create.roblox.com/docs/cloud/reference/domains/assetdelivery)
- [Open Cloud asset usage](https://create.roblox.com/docs/cloud/guides/usage-assets)
- [Asset permissions](https://create.roblox.com/docs/projects/assets#asset-permissions)
- [Audio assets](https://create.roblox.com/docs/audio/assets)
- [AssetService](https://create.roblox.com/docs/reference/engine/classes/AssetService)
- [Studio importer](https://create.roblox.com/docs/studio/importer)

Roblox API routes and policies can change. This page was checked against the linked Creator Hub references on November 8, 2026; revisit them before shipping an integration.
