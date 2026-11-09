# Local HTTP API

Default base URL: `http://127.0.0.1:8000`. Error responses use `{ "error": "message" }` with an HTTP status such as 400, 401, 403, 404, 409, 413, or 500. The hosted recorder script contains no upload token.

| Method and route | Purpose | Main input | Output |
| --- | --- | --- | --- |
| `GET /health` | Health check | None | `{status:"ok",runtime:"node"}` |
| `GET /recorder.lua` | Executor recorder | None | Luau source text |
| `POST /api/auth/local` | Loopback token | `{serverId}` | `{uploadToken}` |
| `POST /api/auth/redeem` | Redeem LAN code | `{code,serverId}` | `{ticket,expiresInSeconds:90}` |
| `POST /api/auth/exchange` | Exchange ticket | `{ticket,serverId}` | `{uploadToken,expiresInSeconds:3600}` |
| `POST /api/replay/chunk` | Authenticated replay chunk | `X-Upload-Token`, `uploadId`, `serverId`, `chunkIndex`, `totalChunks`, `chunkData` | Partial status or `{ok,replayId,replayName}` |
| `GET /api/replay/local-chunk` | Loopback replay chunk upload | Same fields in query, without token; accepted only from loopback | Partial status or confirmation |
| `POST /api/replay` | Complete replay upload | Token and replay JSON | `{ok,replayId,replayName}` |
| `GET /api/replays` | Replay library | None | `{replays:[...]}`; rows include `captureFps`, `stepMs`, and `tickChanges` when recorded, for the configured TPS badge |
| `GET /api/replay/latest?replayId=...` | Load replay | Optional ID | Persisted replay payload |
| `GET /api/servers`, `GET /api/snapshot/latest` | Legacy snapshot reads | Optional `serverId` | List or snapshot payload |
| `GET /api/snapshot/chunk` | Read stored snapshot chunk | Snapshot identifiers | Chunk data |
| `GET /api/asset/texture`, `GET /api/asset/mesh` | Roblox content proxy | `src` | Asset bytes or an error |
| `GET /api/material/map` | Local built-in material map | `material`, `type` (`color`, `normal`, `metalness`, `roughness`) | Image bytes from `client-assets/material_textures/`, or 404 when absent; this route does not call Asset Delivery |

The mesh proxy converts FileMesh versions 1.00, 1.01, 2.00, 3.00, 3.01, 4.00, 4.01, 5.00, and 7.00 (Draco) to OBJ. For versions 3–5 and 7, it returns the first LOD when one is indicated. Assets without permission and unsupported formats return an error; texture delivery is a separate request.

New captures store Lighting properties including `brightness`, `clockTime`, `ambient`, `outdoorAmbient`, `fogColor`, `fogStart`, `fogEnd`, `exposureCompensation`, `globalShadows`, `sunDirection`, and, when present, Atmosphere color, decay, density, haze, and glare. Older captures use viewer defaults for missing fields.

`chunkIndex` starts at 0. Upload chunks carry JSON text; frame compression is expanded on the server before persistence. A capture may include `frameBlocks:[{codec:"json"|"lz4",data,originalBytes?}]`; the transport also accepts legacy `codec:"lz4"` blocks. Same-device recorder uploads use the loopback GET route because some Android executors block local POST responses; it uses 6 KB pieces and retries a transient failed piece up to four times. Chunks for one `uploadId` must agree on `serverId` and `totalChunks`; conflicting duplicate content returns 409. A complete replay requires `serverId`, `base.parts`, `frames` ordered by `t`, and a valid `durationMs`.

Each frame has `t` in milliseconds and optional `a` (added parts), `u` (updates), `d` (removed part IDs), `da` (added decals), `du` (updated decals), and `dd` (removed decal IDs). Decals use stable `id` and `partPath` values; an update can omit properties to retain the previous value. To clear `meshId` or `textureId`, send an empty string. Send `false` to clear `meshScale`, `meshOffset`, or `surfaceAppearance`.

Malformed JSON, a non-object payload, and invalid URL-encoded `replayId` values return 400. Snapshots using the legacy `__transport:"compact-v1"` representation are expanded before persistence. Snapshot, thumbnail, and cleanup routes remain for older captures.

For non-loopback clients, the server prints a 20-digit login code in its terminal. The code expires after 30 minutes; its one-time ticket lasts 90 seconds and is bound to the server ID and client IP. The upload token lasts one hour with the same binding. The LAN API has no user accounts, and anyone who can reach the server can read the replay library. Keep it on a trusted network.
