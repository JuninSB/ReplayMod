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

## Loading and retries

The viewer deduplicates asset requests and keeps successful results while rebuilding scene objects. Each failed asset is tried twice automatically. The progress panel shows mesh and texture counts and a failed-asset list; Retry requests only failures. Close dismisses the panel for the current capture, and Menu → Loading status reopens it. Optional missing material maps use existing material fallbacks. Offline export tries each asset three times before presenting the missing list and Export anyway.

## UI

Menu is collapsed on entry. Explorer, thumbnail capture, Rendering, Camera, Library and Share are inside it. FPS has its own position below the header. The scene movement hint is removed. All visible controls are in English.

Solid-color parts keep their captured color when no material map is available; Neon uses emissive color. Menu → Hide UI hides the controls; Show UI restores them. Rendering → Scene brightness adjusts the viewer exposure relative to the capture. Interactive controls prevent touch text selection while diagnostic text stays selectable.
