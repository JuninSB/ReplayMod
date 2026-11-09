# Capture and renderer compatibility

The viewer uses Three.js, so the renderer is a reconstruction rather than the Roblox rendering engine. These mappings follow the [Lighting reference](https://create.roblox.com/docs/reference/engine/classes/Lighting), [global lighting guide](https://create.roblox.com/docs/environment/lighting), [post effects](https://create.roblox.com/docs/environment/post-processing-effects), and [SpecialMesh documentation](https://create.roblox.com/docs/reference/engine/classes/SpecialMesh).

| Recorded property | Viewer mapping |
| --- | --- |
| Ambient, OutdoorAmbient, ColorShift_Top, ColorShift_Bottom | Calibrated ambient fill, hemispheric sky contribution, directional tint; sheltered-area voxel lighting is not reproduced exactly |
| Brightness, ExposureCompensation | Directional intensity and exposure of 2 to the recorded compensation, before tonemapping |
| ClockTime, TimeOfDay, GeographicLatitude, GetSunDirection | Captured sun direction; clock-based fallback when direction is absent |
| GlobalShadows, ShadowSoftness | Directional shadow enablement and PCF filter radius, with a device-sized shadow map and adjustable Near/Medium/Far shadow range. These distances are approximate and are not Roblox quality presets |
| LightingStyle, legacy Technology | Soft/Realistic intensity interpretation; proprietary voxel/Future lighting is not replicated |
| EnvironmentDiffuseScale, EnvironmentSpecularScale | Environment diffuse contribution and material environment intensity; skybox-derived PMREM reflections |
| PrioritizeLightingQuality, ExtendLightRangeTo120 | Preserved metadata; the browser keeps its own resource budgets and uses recorded light ranges |
| FogColor, FogStart, FogEnd | Recorded distance-based fog; distances are no longer divided by four |
| Atmosphere Color, Decay, Density, Offset, Haze, Glare | Approximate sky color and exponential distance haze; not Roblox's full atmospheric scattering solution |
| Sky skybox faces, SkyboxOrientation | Embedded/local cube textures and sky rotation |
| Sky celestial visibility and angular sizes, Clouds | Captured metadata and approximate sun/moon/cloud visuals; cloud volumetrics and star fields are not exact |
| BloomEffect Intensity, Size, Threshold | Recorded bloom only; no invented bloom when absent |
| ColorCorrectionEffect Brightness, Contrast, Saturation, TintColor | Shader color adjustments in the render pipeline |
| ColorGradingEffect TonemapperPreset | Default/Retro mapped to filmic/Reinhard tonemapping approximations |
| BlurEffect Size | Multi-tap screen blur |
| SunRaysEffect Intensity, Spread | Screen-space light scattering approximation |
| DepthOfFieldEffect FocusDistance, InFocusRadius, NearIntensity, FarIntensity | Depth-buffer bokeh approximation; near/far strengths are combined |
| PointLight, SpotLight, SurfaceLight | Local lights attached to recorded parts; SurfaceLight uses an approximate spot source |

Post effects are captured from both Lighting and CurrentCamera. New captures preserve previously missing metadata. Existing captures cannot recover properties that were never recorded.

## Characters

SpecialMesh MeshType is recorded independently from MeshId. A built-in R6 Head is resolved to the bundled `avatar/heads/head.mesh`; a Part with no SpecialMesh remains a block. Older captures with a Head SpecialMesh scale but missing its type use this head as a compatibility fallback. Head scaling is nonstandard in Roblox (see [DataModelMesh.Scale](https://create.roblox.com/docs/reference/engine/classes/DataModelMesh/Scale)), so exact unusual custom scaling still needs in-game comparison. Front-face decals are projected onto the rounded surface. CharacterMesh body meshes are captured for R6; otherwise classic body blocks have a subtle bevel. Player labels are text with a small outline, distance-limited and capped in screen size.

## Terrain

New captures read a bounded 160 × 96 × 160 stud region around the local player (or camera fallback) at Roblox's required 4-stud voxel resolution. Only exposed voxels are saved; the viewer emits only their outward faces and groups them by material. This makes terrain rocks and hills visible without creating a draw call for every voxel. It is a coarse block reconstruction: smooth terrain blending, water behavior, decorations, custom terrain textures, terrain changes during the replay, and terrain beyond the captured window are not reproduced. Existing captures without `base.terrain` must be recorded again.

## Sky and scene text

The viewer uses bundled sun, moon and cloud images as fallbacks and approximates SunRays as a screen-space effect. New recordings include custom Sky sun and moon texture IDs; old recordings fall back to the bundled images. Clouds and SunRays are approximations, not Roblox volumetric clouds or physically exact occlusion.

Nameplates use the bundled Builder Sans font when available. New recordings also capture visible TextLabel and TextButton text in SurfaceGui or BillboardGui attached directly to a part, including text color, transparency and font. Builder Sans, Source Sans, Roboto and Gotham/Montserrat use bundled fonts; other font families fall back to Builder Sans. Text placement and layout are approximated, with a maximum of 32 text elements per part. ScreenGui, rich text, GUI backgrounds, nested layout and an Adornee pointing elsewhere are not reproduced. Older recordings do not have these captured text elements.

## Replay audio and Explorer

New recordings also sample the local player's enabled ScreenGuis, excluding the Replay Mod recorder, up to four times per second. The viewer's **Game UI** button starts off and displays the captured interface without accepting game input when enabled. Capture uses Roblox's resolved positions and sizes, so layout constraints are reflected in the sampled rectangles. Frames, text, images, common borders, UICorner, UIStroke and basic color gradients are approximated; image tint and slices, rich text, gradient transparency, video and ViewportFrame 3D content are not reproduced completely. Capture is limited to 100 screens and 400 GUI objects per sample. It does not capture CoreGui or screens that were not visible to the recording client. Old captures contain no screen UI. ScreenGui images are included in offline export when accessible.

New replay recordings observe Sound events and settings from Workspace, SoundService and the local player's descendants, including local `rbxasset://sounds/` files. Playback follows the replay clock, playback speed, pause and seeking. Sounds attached to captured parts or attachments use browser spatial audio; global sounds are non-positional. Scene has separate 2D and 3D audio switches. Browser autoplay rules require a user action. Audio access, codec support, client replication, SoundGroups, advanced audio graphs, playback regions and effects can differ from Roblox. Transient engine-generated sounds, including PlayLocalSound copies, may not be observed. Missing or inaccessible assets are reported and may be omitted after confirmation during offline export. Older replays contain no sound events.

Explorer expands the recorded part hierarchy and captured child instances; new recordings include a bounded child tree and instance paths. Older recordings can only show the information they already contain. Part name, color, transparency, position, orientation and size can be edited in the viewer. Captured sounds also expose editable volume, playback speed, looping and rolloff distances. Edits persist while playing and seeking and can be reset, but do not modify the saved recording or the Roblox game. Other properties are read-only; this is not a complete instance inspector.

## Loading and retries

The viewer deduplicates asset requests and keeps successful results while rebuilding scene objects. Each failed asset is tried twice automatically. The progress panel shows mesh and texture counts and a failed-asset list; Retry requests only failures. Close dismisses the panel for the current capture, and Menu → Loading status reopens it. Optional missing material maps use existing material fallbacks. Offline export tries each asset three times before presenting the missing list and Export anyway.

## UI

Menu is collapsed on entry. Explorer, thumbnail capture, Rendering, Camera, Library and Share are inside it. FPS has its own position below the header. The scene movement hint is removed. All visible controls are in English.

Solid-color parts keep their captured color when no material map is available; Neon uses emissive color. Studs use the bundled Roblox 2×2 tile, decoded to ordinary pixels for mobile GPUs that cannot display compressed DDS. The neutral tile is tinted by part color, with approximate relief and shadow reception. Tiles repeat at one mark per stud along each axis, including clipped partial tiles on non-integer dimensions. Inlet reverses the relief, Universal alternates raised and inset marks, Glue/Weld use an X, and Hinge/Motor use approximate icons; these are approximations, not original meshes. Recorded face types apply independently, and the tiled/X surfaces appear on Plastic as in Roblox. Menu → Hide UI hides the controls; Show UI restores them. Rendering → Scene brightness adjusts the viewer exposure relative to the capture. Interactive controls prevent touch text selection while diagnostic text stays selectable.

Rendering → Render distance changes the camera far plane between 256 and 6000 studs, independently of shadow range. The preference is saved locally when storage is available. The scene state continues to advance beyond this distance. It cannot recover regions the Roblox client did not stream in or the recorder did not capture.

New captures include MeshPart.MeshSize where accessible so the viewer can scale its source geometry around the asset origin. This improves placement but does not reproduce WrapLayer cage deformation or skinning: layered clothing can still intersect or be displaced on avatars.

On compact viewports, the viewer caps its render resolution to 1×, disables antialiasing, uses a 1024-pixel soft shadow map, skips the post-processing composer when no recorded effect needs it, and refreshes the shadow map only when the scene or camera-shadow coverage changes. Mesh materials use front-side rendering and frustum culling; source mesh triangles are preserved rather than destructively simplified.

Optional object occlusion is conservative and budgeted: it runs at most four times per second, checks up to 24 targets per pass, and waits for repeated occlusion before hiding an object. It remains optional because ray tests can cost more than they save in some scenes. Replay state still advances offscreen, so seeking and returning the camera do not lose changes. Dynamic head deformation is not reproduced; captured head meshes, textures and static face fallbacks remain best-effort.

Occlusion considers opaque box parts as occluders, avoiding triangle tests through complex meshes and avoiding treating their empty spaces as solid. Tests share a short per-pass time budget and rotate through candidates. Invisible surface faces are not submitted for drawing. Movement-only replay patches skip appearance comparisons, and Explorer tree refreshes are deferred until its tab is visible. Diagnostic CPU timings describe JavaScript/render submission work, not GPU execution time.

Shadow range adjusts coverage; Shadow quality selects the map resolution, Shadow updates chooses Responsive (50 ms) or Economy (250 ms), and Soft shadows switches the filter. Low quality keeps soft filtering by default and increases its blur to reduce blockiness. Balanced quality, responsive updates and soft shadows are the defaults. The shadow camera follows the viewer's position on a shadow-texel grid instead of jumping forward when the camera turns. These settings approximate Roblox and do not implement its quality-level mapping. A smooth distance fade for shadow receivers is not yet implemented; the present shadow coverage can still end abruptly.
