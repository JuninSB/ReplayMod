# Repository Guidelines

## Project Structure

`roblox/` contains the Luau recorder; `server/` contains the TypeScript API, storage, asset delivery and codecs; `web/static/` and `web/templates/` contain the responsive Three.js viewer. `tests/` contains playback checks, and `server/server.test.cjs` covers server behavior. `docs/` explains operation, API contracts, product behavior and visual conventions. `dist/`, `node_modules/`, and `web/static/vendor/three/` are generated. `client-assets/` contains bundled client assets. `web/data/` and `assetdelivery/` hold local runtime data; never commit captures or cached downloads.

## Install, Build and Verify

Use Node.js 22+ with npm. Run `npm ci --no-bin-links`, `npm run build`, then `npm start` to run locally. Dependencies stay in ignored `node_modules/`; never commit them. Check changes with `npm test`, `node --check web/static/app.js`, and `npm run format:check`. `npm run format` formats the TypeScript server. A browser test does not replace a real executor or mobile device check when those are relevant.

## Code and Documentation

Use two spaces in TypeScript, JavaScript and CSS. Keep module names descriptive and preserve the capture payload contract (`base`, `frames`, `a`, `u`, `d`, `t`). Keep browser code separate from secrets and server-only asset access. Update `docs/api.md` when routes or payloads change, and `docs/operacao.md` when configuration or storage behavior changes. UI changes should be checked at desktop and mobile widths, with touch and keyboard behavior where applicable.

## Required Agent Skill

Before changing this project, read `.agents/skills/desenvolver-web/SKILL.md` and consult its guidance relevant to the task, along with the English project guides in `docs/`. The skill is adapted for Replay Mod's Luau recorder, TypeScript server, Three.js viewer, asset permissions, and supported checks. Keep shipped UI and public documentation in English.

## Tests and Pull Requests

Name server checks `*.test.cjs`; put viewer behavior checks in `tests/`. Add regression coverage for route, codec, storage or replay behavior changes. Pull requests should state the user-visible change, verification commands and any test that needs Roblox or a physical device. Include screenshots for visible UI changes when available.

## Security and Licensing

Never commit `.env`, `auth.lzk8`, credential backups, Roblox cookies, API keys, access codes, captures, or cached downloads. Keep the server bound to loopback by default. This project is GPL-3.0-only; preserve notices in `THIRD-PARTY-NOTICES.md` and check dependency licenses before adding packages.
