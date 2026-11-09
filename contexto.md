# Current development context

The working repository is ReplayMod-Public; the Termux test copy is /sdcard/webview. Client assets are tracked. Captures, downloaded cache, encrypted credentials and logs must remain ignored.

Recent work: encrypted auth.lzk8 startup enrollment/unlock; diagnostic server/client logs; bounded recorder authentication wait; viewer module initialization fixes; configured TPS badges; compact landscape controls; synchronized player sampling and YXZ quaternion rotation playback; Share link/offline HTML with embedded modules/assets and explicit missing-asset confirmation; initial camera near a visible living player or scene part.

Legacy plaintext credential settings are no longer used, but old credential files are not automatically deleted. The unlocked process retains the decryption key; this cannot secure credentials against a compromised running machine. No full Motor6D reconstruction is implemented. Offline export tests verify module closure, embedded assets, missing-file manifest, safe payload serialization and cancellation using a simulated DOM. Actual Chrome file opening and Roblox capture behavior still require device testing.

Verification: npm run build, npm test, npm run format:check, git diff --check; browser syntax is checked as an ES module. Never treat the common-script node --check alone as verification of app.js.
