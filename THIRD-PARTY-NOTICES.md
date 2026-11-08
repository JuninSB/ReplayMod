# Third-party notices

## Original Webview source

This repository derives from [JuninSB/Webview](https://github.com/JuninSB/Webview). The original repository remains unchanged. Its MIT license notice is preserved in [ORIGINAL-MIT-LICENSE.txt](ORIGINAL-MIT-LICENSE.txt). This project's own files are offered under GPL-3.0-only; the original MIT grant remains applicable to the code it covers.

## Runtime and development dependencies

- Three.js (`three`): MIT. Its license is copied to `web/static/vendor/three/LICENSE` during build.
- Draco decoder (`draco3d`): Apache-2.0.
- TypeScript: Apache-2.0.
- Prettier: MIT.
- `@types/node` and `undici-types`: MIT; development type packages.

The exact versions are recorded in `package-lock.json`. Each dependency retains its upstream license. No Roblox client cache, downloaded Roblox asset, or replay capture is included in this repository; Roblox assets fetched by users remain subject to Roblox's terms and access permissions.
