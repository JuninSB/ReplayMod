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

Replay Mod can use an encrypted `auth.lzk8` credential file to request supported assets through a Roblox session. See [setup](setup.md#roblox-session-credential) for creation and its security limits. Do not use cookie-based access to evade asset privacy, moderation, or licensing.

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

The repository includes `client-assets/` for built-in `rbxasset://` resources. Material maps are read from `client-assets/material_textures/`. Separately, supported `rbxassetid://` assets use Asset Delivery and are cached under `assetdelivery/meshes/` or `assetdelivery/textures/`.

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
