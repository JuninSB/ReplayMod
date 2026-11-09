# Visual system and interaction

## Direction

Replay Mod is a technical playback tool. The scene is the primary content, the library helps users find a capture, and playback controls stay close to the viewer. Use direct labels such as **Record**, **Upload**, **Play**, and **Library**. Do not invent metrics, testimonials, or previews.

| Role | Current decision |
| --- | --- |
| Background and surfaces | Graphite `#101318`, `#171c23`, `#202731` |
| Divider | `#35404d` separates tools and content |
| Action and focus | Mint `#7ce6bd`; errors use text as well as color |
| Typography | System font; large library titles and compact viewer metadata |
| Geometry | 7 px control radius, 10 px panels, visible borders |
| Motion | Short feedback only; `prefers-reduced-motion` removes animation |

## Screen organization

The library's **Replays** and **Snapshots** tabs show separate collections. When a capture opens, the canvas fills the viewport; the title and playback controls overlay the scene, while a collapsible sidebar contains **Explorer** and **Details**. The timeline adapts to narrow screens. Escape closes the sidebar, focus remains predictable, and the canvas stays full size.

Touch controls use 48 px targets in the normal layout and compact 38 px targets in short landscape windows. Dragging the scene rotates the camera. Explorer displays BaseParts and decals represented in the capture and updates while replaying or seeking; snapshots show the tree at capture time. It cannot display instances the recorder did not save. The recorder panel stays within screen bounds and can select 5, 10, 20, 30, or 60 ticks per second; 60 carries a performance warning. Playback supports pause/resume, seek, 5-second steps, recorded/free camera, and 0.25× to 4× speed.

The recorder saves supported global Lighting, Sky, Atmosphere, effects, and a bounded initial terrain voxel window; lighting changes over time become replay events. The Three.js viewer approximates lighting, fog, shadows, sky, Bloom, ColorCorrection, Blur, and terrain surface cubes. It is not the Roblox renderer, and captures do not yet preserve Dynamic Head facial skinning, smooth terrain blending, water, terrain changes, or every Sky asset.

The executor panel is compact, ignores Roblox's top inset, and can be dragged by its title to the top edge. The viewer toolbar provides the Replay/Snapshot choice; library tabs select the collection.

## Visual verification

Check the viewer at desktop and mobile widths, portrait and landscape, touch controls, playback states, and empty/error states. Browser screenshots do not replace tests with a Roblox executor or on a physical mobile device.

## Sharing and initial view

Share opens a dialog with Copy link and Download offline HTML. Export progress and missing assets stay inside the dialog; users may explicitly export with missing assets or close to cancel. TPS badges use red at 5, green at 30, and blue at 60, with intermediate hues. Short landscape screens use a compact transport bar and movement controls. Initial camera placement prioritizes visible player heads with positive recorded health; captures without health use visible player heads, then a visible scene part. Browser/device verification remains required for the final scale and file-opening behavior.


## Collapsed scene menu and loading

The viewer opens a single responsive sidebar with Scene, Rendering, Camera, Explorer and Details tabs. The scene remains visible behind it; each tab owns its controls and the panel closes with the close button or Escape. Rendering separates shadow map quality, distance, update rate and filtering, and offers an explicit render-resolution setting. Reduced resolution and low shadow quality are opt-in.

The viewer header has one Menu button. Explorer, thumbnail capture, rendering settings, camera settings, sharing and library controls stay collapsed until opened. FPS appears separately below the header. Movement help is removed. Player nameplates use outlined text without a box, a maximum on-screen size and recorded distance limits. The loading panel reports meshes and textures, retains an expandable list of failures and retries only failed jobs. Successful resources are reused across scene rebuilds. Compact mobile viewports use a lower internal render resolution and only run post-processing when a recorded effect needs it. See [rendering compatibility](rendering.md) for capture fields and approximations.
