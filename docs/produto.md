# Product behavior

Replay Mod records the scene replicated to a Roblox client, sends captures to a local server, and plays them in a desktop or mobile browser. The local workflow needs no public domain or tunnel.

## Core workflows

| Action | Entry point | Expected result | Failure handling |
| --- | --- | --- | --- |
| Open recorder | `loadstring(game:HttpGet(.../recorder.lua))()` | Recorder panel appears in Roblox | Unreachable URL or unsupported executor reports an error |
| Record replay | Recorder panel | Initial scene plus deltas for created, changed, and removed parts and decals | Sampling failure stops capture and reports an error |
| Pause and resume | Recorder panel | Paused time is excluded; sampling resumes from current state | Preparation state prevents duplicate actions |
| Capture snapshot | Recorder panel | One scene state is stored without a replay timeline | Failed upload keeps the capture available for retry |
| Upload | Recorder panel | Server persists the capture and confirms its ID; local transfer shows a piece counter and progress bar | Failed upload preserves the capture and shows an actionable error |
| Open library | Web viewer | Replays and snapshots appear in separate collections | Empty state and network error are distinct |
| Play | Web viewer | Deltas, camera, timeline, and playback speed stay in sync | Missing assets retain geometry fallbacks where possible |

## Expected behavior

1. The server starts on `127.0.0.1:8000`; `/health` and `/recorder.lua` respond.
2. A chunked replay upload appears in `/api/replays` and remains available after restart.
3. Playback retains properties omitted from a delta, applies decal events, supports backward seeking, and changes speed.
4. Primary controls remain usable by touch on compact portrait and landscape screens.
5. Access, invalid-content, and network errors are never shown as success.

## Platform limits

Capture sees only objects replicated to the client. A configured 20 ticks per second is a target, not a guarantee; actual rate depends on the game and executor. Deterministic physics, server scripts, audio playback, and voxel terrain are outside this representation. Asset delivery respects Roblox permissions; unsupported formats and private assets can remain unavailable.
