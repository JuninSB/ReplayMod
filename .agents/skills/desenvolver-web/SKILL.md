---
name: develop-web
description: "Project-specific product, interface, engineering, documentation, and verification guidance for Replay Mod. Use for Roblox Luau recorder UI, Three.js web viewer, mobile/desktop behavior, server/API, asset delivery, and project documentation."
---

# Replay Mod development skill

Use this skill for every change to Replay Mod, including backend-only work when it affects product behavior, API contracts, security, data flow, or documentation. Apply the project's existing stack and preserve user-facing behavior unless the request changes it.

## Read before editing

1. Read the repository-root `AGENTS.md`, `README.md`, and the current task's relevant source and tests.
2. Consult the English project guides in `docs/`: `produto.md`, `design.md`, `arquitetura.md`, `operacao.md`, `api.md`, and `asset-delivery.md` as applicable.
3. The original `desenvolver-web` reference package, scripts, and templates are preserved in this directory. Its source materials are Portuguese; the English instructions in this file and the repository's English documentation define the project-specific workflow. Consult a source reference when a topic needs its fuller checklist.

## Product and interface

- Keep the Three.js scene central to the viewer. The library separates Replays and Snapshots; the viewer sidebar contains Explorer and Details.
- Maintain usable desktop and mobile layouts, keyboard focus, reduced motion, and touch targets. For the Roblox recorder, account for `ScreenGui.IgnoreGuiInset` and clamp draggable UI in viewport coordinates.
- Every visible control must perform its stated action and provide pending, success, empty, or error feedback. Keep the recorder UI and web UI in English.
- Use real captures or fixtures that represent supported data. Do not imply that the Explorer inspects the live game: it only reflects recorded instances and the selected replay time.
- For material or rendering work, trace the full path from recorded Roblox properties through server asset resolution and browser decoding. Preserve maps' semantic roles, color spaces, alpha behavior, UVs, and fallback behavior.

## Architecture and data

- Keep Luau capture, TypeScript server, and browser viewer responsibilities separate.
- Preserve replay fields such as `base`, `frames`, `a`, `u`, `d`, and `t`, and keep snapshot payloads compatible with existing clients.
- Keep downloaded assets and captures in user-owned runtime directories, never in the repository. Roblox client files are not bundled. `rbxasset://` paths may be served from `content/` or an explicitly configured accessible client content directory; do not download or extract the Roblox Player to populate it.
- Asset Delivery and Open Cloud are distinct. Follow Roblox's current official documentation, preserve asset permissions, keep credentials server-side, and do not implement private-access or content-protection bypasses.
- Keep server bindings loopback by default. Never log or commit cookies, API keys, tickets, access codes, captures, or `.env` files.

## Implementation and verification

- Prefer a complete, small behavior change over a visual-only placeholder. Add regression coverage for API, persistence, serialization, or playback behavior changes.
- Run relevant checks: `npm run build`, `npm test`, `node --check web/static/app.js`, and `npm run format:check`. Do not claim executor, physical-device, or visual verification unless actually performed.
- For interface changes, inspect the running result at desktop and mobile sizes when tools are available. If not available, state the specific limit and perform available static/behavior checks.
- Update the English GitHub Pages guides whenever setup, API, rendering, product behavior, or security changes. Keep links between the README, `docs/`, and published site working.
- Review the diff for generated files, private runtime data, bundled Roblox content, and unrelated edits before committing.
