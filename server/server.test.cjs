const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { decodeLz4, meshToObj, meshToObjAsync } = require("../dist/codec.js");
const { readLimitedAssetBody } = require("../dist/asset-body.js");
const { createVault, unlockVault, decryptVault } = require("../dist/asset-auth.js");
const { expandCompactSnapshot } = require("../dist/compact.js");

test("raw LZ4 and legacy text mesh", () => {
  assert.equal(
    decodeLz4(Buffer.from([0x40, 116, 101, 115, 116]).toString("base64"), 4),
    "test",
  );
  const mesh = Buffer.from(
    "version 1.01\n1\n[1,2,3][0,1,0][0,0,0][4,5,6][0,1,0][1,0,0][7,8,9][0,1,0][0,1,0]",
  );
  const obj = meshToObj(mesh).toString();
  assert.match(obj, /v 1 2 3/);
  assert.match(obj, /f 1\/1\/1 2\/2\/2 3\/3\/3/);
  assert.match(meshToObj(Buffer.from(mesh.toString().replace(/\n/g, "\r\n"))).toString(), /f 1\/1\/1/);
});

test("mesh 4.01 converts only the main LOD and rejects invalid indices", () => {
  const header = Buffer.alloc(24);
  header.writeUInt16LE(24, 0);
  header.writeUInt32LE(4, 4);
  header.writeUInt32LE(2, 8);
  header.writeUInt16LE(3, 12);
  const vertices = Buffer.alloc(4 * 40);
  const positions = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  positions.forEach((point, index) => {
    point.forEach((n, axis) => vertices.writeFloatLE(n, index * 40 + axis * 4));
    vertices.writeFloatLE(1, index * 40 + 20);
  });
  const faces = Buffer.alloc(2 * 12);
  [0, 1, 2, 0, 2, 3].forEach((n, index) => faces.writeUInt32LE(n, index * 4));
  const lods = Buffer.alloc(3 * 4);
  [0, 1, 2].forEach((n, index) => lods.writeUInt32LE(n, index * 4));
  const mesh = Buffer.concat([
    Buffer.from("version 4.01\n"), header, vertices, faces, lods,
  ]);
  const obj = meshToObj(mesh).toString();
  assert.match(obj, /v 1 0 0/);
  assert.match(obj, /f 1\/1\/1 2\/2\/2 3\/3\/3/);
  assert.doesNotMatch(obj, /f 1\/1\/1 3\/3\/3 4\/4\/4/);
  const invalid = Buffer.from(mesh);
  invalid.writeUInt32LE(99, Buffer.byteLength("version 4.01\n") + 24 + vertices.length);
  assert.throws(() => meshToObj(invalid), /invalid face/);
  assert.throws(() => meshToObj(mesh.subarray(0, -1)), /short mesh/);
});

test("mesh 3.00 converts the main accessory LOD", () => {
  const header = Buffer.alloc(16);
  header.writeUInt16LE(16, 0);
  header[2] = 40;
  header[3] = 12;
  header.writeUInt16LE(4, 4);
  header.writeUInt16LE(2, 6);
  header.writeUInt32LE(3, 8);
  header.writeUInt32LE(2, 12);
  const verts = Buffer.alloc(3 * 40);
  [0, 1, 2].forEach((n, i) => verts.writeFloatLE(n, i * 40));
  const faces = Buffer.alloc(24);
  [0, 1, 2, 2, 1, 0].forEach((n, i) => faces.writeUInt32LE(n, i * 4));
  const lods = Buffer.alloc(8);
  lods.writeUInt32LE(1, 4);
  const obj = meshToObj(Buffer.concat([
    Buffer.from("version 3.00\n"), header, verts, faces, lods,
  ])).toString();
  assert.equal((obj.match(/^f /gm) || []).length, 1);
  assert.match(obj, /v 2 0 0/);
});

test("mesh 5.00 ignores facial data after geometry", () => {
  const header = Buffer.alloc(32);
  header.writeUInt16LE(32, 0);
  header.writeUInt32LE(3, 4);
  header.writeUInt32LE(1, 8);
  const verts = Buffer.alloc(3 * 40);
  [0, 1, 2].forEach((n, i) => verts.writeFloatLE(n, i * 40));
  const face = Buffer.alloc(12);
  [0, 1, 2].forEach((n, i) => face.writeUInt32LE(n, i * 4));
  const obj = meshToObj(Buffer.concat([
    Buffer.from("version 5.00\n"), header, verts, face, Buffer.from("facial-data"),
  ])).toString();
  assert.match(obj, /f 1\/1\/1 2\/2\/2 3\/3\/3/);
});

test("mesh 7.00 Draco converts a triangle to OBJ", async () => {
  const draco = await require("draco3d").createEncoderModule({});
  const builder = new draco.MeshBuilder();
  const mesh = new draco.Mesh();
  const encoder = new draco.Encoder();
  const encoded = new draco.DracoInt8Array();
  try {
    builder.AddFacesToMesh(mesh, 1, new Uint32Array([0, 1, 2]));
    builder.AddFloatAttributeToMesh(
      mesh, draco.POSITION, 3, 3,
      new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    );
    builder.AddFloatAttributeToMesh(
      mesh, draco.NORMAL, 3, 3,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    );
    builder.AddFloatAttributeToMesh(
      mesh, draco.TEX_COORD, 3, 2,
      new Float32Array([0, 0, 1, 0, 0, 1]),
    );
    const length = encoder.EncodeMeshToDracoBuffer(mesh, encoded);
    assert.ok(length > 0);
    const blob = Buffer.from(Array.from({ length }, (_, i) => encoded.GetValue(i)));
    const core = Buffer.alloc(20);
    core.write("COREMESH");
    core.writeUInt32LE(2, 8);
    core.writeUInt32LE(length + 4, 12);
    core.writeUInt32LE(length, 16);
    const obj = (await meshToObjAsync(Buffer.concat([
      Buffer.from("version 7.00\n"), core, blob,
    ]))).toString();
    assert.equal((obj.match(/^v /gm) || []).length, 3);
    assert.match(obj, /^f \d+\/\d+\/\d+ \d+\/\d+\/\d+ \d+\/\d+\/\d+$/m);
  } finally {
    draco.destroy(encoded);
    draco.destroy(encoder);
    draco.destroy(mesh);
    draco.destroy(builder);
  }
});

test("Asset Delivery stops reading after the size limit", async () => {
  const valid = await readLimitedAssetBody(new Response("quatro"), 6);
  assert.equal(valid.toString(), "quatro");
  let canceled = false;
  const oversized = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(Buffer.from("12345"));
        controller.enqueue(Buffer.from("6"));
      },
      cancel() {
        canceled = true;
      },
    }),
  );
  assert.equal(await readLimitedAssetBody(oversized, 5), null);
  assert.equal(canceled, true);
});

test("encrypted credential unlocks only with the correct password and rejects tampering", () => {
  const credential = "secret-credential-test";
  const { vault } = createVault(credential, "password123");
  const encoded = JSON.stringify(vault);
  assert.ok(!encoded.includes(credential));
  assert.equal(decryptVault(unlockVault(encoded, "password123")), credential);
  assert.throws(() => unlockVault(encoded, "incorrect"));
  const tampered = { ...vault, tag: Buffer.alloc(16).toString("base64") };
  assert.throws(() => unlockVault(JSON.stringify(tampered), "password123"));
  assert.throws(() => createVault("invalid;cookie", "password123"));
  assert.throws(() => createVault(credential, "123"));
});

test("legacy compact-v1 snapshot preserves parts and paths", () => {
  const expanded = expandCompactSnapshot({
    serverId: "legacy",
    __transport: "compact-v1",
    compact: {
      strings: ["Workspace", "Block", "Part", "#ffffff", "Plastic"],
      pathNodes: [
        { p: 0, n: 1 },
        { p: 1, n: 2 },
      ],
      partTemplates: [
        { className: 3, color3: 4, material: 5, size: { x: 2, y: 3, z: 4 } },
      ],
      parts: [{ t: 1, path: 2, name: 2, px: 7, py: 8, pz: 9 }],
      decals: [],
    },
  });
  assert.equal(expanded.parts[0].path, "Workspace/Block");
  assert.equal(expanded.parts[0].position.x, 7);
  assert.equal(expanded.parts[0].size.z, 4);
  assert.equal(expanded.compact, undefined);
});

test("Node server accepts chunked replays and enforces local authentication", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "replaymod-ts-"));
  const contentDir = path.join(dataDir, "content");
  const clientAssetsDir = path.join(dataDir, "client-assets");
  const assetDeliveryDir = path.join(dataDir, "assetdelivery");
  const clientContentDir = path.join(dataDir, "roblox-client-content");
  const materialDir = path.join(clientAssetsDir, "material_textures");
  await fs.mkdir(materialDir, { recursive: true });
  await fs.mkdir(path.join(contentDir, "textures"), { recursive: true });
  await fs.mkdir(path.join(clientContentDir, "textures"), { recursive: true });
  await fs.mkdir(path.join(clientAssetsDir, "sounds"), { recursive: true });
  await fs.writeFile(path.join(clientAssetsDir, "sounds", "test.ogg"), Buffer.from("OggS-test"));
  await fs.writeFile(
    path.join(clientContentDir, "textures", "face.png"),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  await fs.writeFile(path.join(dataDir, "outside.png"), "private");
  await fs.writeFile(
    path.join(contentDir, "textures", "legacy.png"),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  await fs.writeFile(
    path.join(materialDir, "Plastic.png"),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  const port = 20000 + Math.floor(Math.random() * 20000);
  const base = `http://127.0.0.1:${port}`;
  const serverOptions = {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      SERVER_WEBVIEW_DATA_DIR: dataDir,
      SERVER_WEBVIEW_LOG_PATH: path.join(dataDir, "server.log"),
      SERVER_WEBVIEW_VIEWER_LOG_PATH: path.join(dataDir, "viewer.log"),
      SERVER_WEBVIEW_CONTENT_DIR: contentDir,
      SERVER_WEBVIEW_CLIENT_ASSETS_DIR: clientAssetsDir,
      SERVER_WEBVIEW_ASSET_DELIVERY_DIR: assetDeliveryDir,
      SERVER_WEBVIEW_ROBLOX_CLIENT_CONTENT_DIR: clientContentDir,
      SERVER_WEBVIEW_PORT: String(port),
      SERVER_WEBVIEW_PUBLIC_BASE_URL: base,
    },
    stdio: ["ignore", "pipe", "pipe"],
  };
  const child = spawn(process.execPath, ["dist/server.js"], serverOptions);
  let restarted = null;
  let log = "";
  child.stderr.on("data", (data) => {
    log += data.toString();
  });
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (child.exitCode !== null) throw Error(`server exited: ${log}`);
      try {
        const r = await fetch(base + "/health");
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(ready, `server did not start: ${log}`);
    const localSound = await fetch(base + "/api/asset/audio?src=" + encodeURIComponent("rbxasset://sounds/test.ogg"));
    assert.equal(localSound.status, 200);
    assert.equal(localSound.headers.get("content-type"), "audio/ogg");
    assert.equal(Buffer.from(await localSound.arrayBuffer()).toString(), "OggS-test");
    const clientContent = await fetch(
      base + "/api/asset/texture?src=" + encodeURIComponent("rbxasset://textures/face.png"),
    );
    assert.equal(clientContent.status, 200);
    assert.equal(clientContent.headers.get("content-type"), "image/png");
    const legacyContent = await fetch(
      base + "/api/asset/texture?src=" + encodeURIComponent("rbxasset://textures/legacy.png"),
    );
    assert.equal(legacyContent.status, 200);
    const cachedTexture = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 42]);
    const cachedTextureKey = createHash("sha256")
      .update("asset-v1:rbxassetid://123")
      .digest("hex");
    const textureCacheDir = path.join(assetDeliveryDir, "textures");
    await fs.mkdir(textureCacheDir, { recursive: true });
    await fs.writeFile(path.join(textureCacheDir, cachedTextureKey), cachedTexture);
    await fs.writeFile(path.join(textureCacheDir, cachedTextureKey + ".type"), "image/png");
    const cachedResponse = await fetch(
      base + "/api/asset/texture?src=" + encodeURIComponent("rbxassetid://123"),
    );
    assert.equal(cachedResponse.status, 200);
    assert.deepEqual(Buffer.from(await cachedResponse.arrayBuffer()), cachedTexture);
    const traversal = await fetch(
      base + "/api/asset/texture?src=" + encodeURIComponent("rbxasset://../outside.png"),
    );
    assert.equal(traversal.status, 400);
    const duplicate = spawn(process.execPath, ["dist/server.js"], serverOptions);
    let duplicateError = "";
    duplicate.stderr.on("data", (data) => {
      duplicateError += data.toString();
    });
    const duplicateExit = await new Promise((resolve) => duplicate.on("exit", resolve));
    assert.equal(duplicateExit, 1);
    assert.match(duplicateError, /Port .*is already in use/);
    assert.doesNotMatch(duplicateError, /Unhandled 'error' event/);
    const html = await (await fetch(base + "/")).text();
    assert.match(html, /\/static\/vendor\/three\/build\/three\.module\.js/);
    const threeModule = await fetch(
      base + "/static/vendor/three/build/three.module.js",
    );
    assert.equal(threeModule.status, 200);
    assert.match(threeModule.headers.get("content-type"), /javascript/);
    const timelineModule = await fetch(base + "/static/replay-timeline.mjs");
    assert.equal(timelineModule.status, 200);
    assert.match(timelineModule.headers.get("content-type"), /javascript/);
    const script = await (await fetch(base + "/recorder.lua")).text();
    assert.match(script, new RegExp(`REPLAY_BASE_URL = "${base}"`));
    const material = await fetch(
      base + "/api/material/map?material=Enum.Material.Plastic&type=color",
    );
    assert.equal(material.status, 200);
    assert.equal(material.headers.get("content-type"), "image/png");
    await fs.rm(materialDir, { recursive: true, force: true });
    const missingMaterial = await fetch(
      base + "/api/material/map?material=Plastic&type=normal",
    );
    assert.equal(missingMaterial.status, 404);
    const auth = await fetch(base + "/api/auth/local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverId: "test-server" }),
    });
    assert.equal(auth.status, 200);
    const { uploadToken } = await auth.json();
    let diagnostics = "";
    for (let i = 0; i < 30; i++) {
      diagnostics = await fs.readFile(path.join(dataDir, "server.log"), "utf8").catch(() => "");
      if (diagnostics.includes("/api/auth/local status=200")) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.match(diagnostics, /\/api\/auth\/local status=200/);
    assert.ok(!diagnostics.includes(uploadToken));
    const viewerResponse = await fetch(base + "/api/diagnostics/viewer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ events: [{ time: "now", kind: "action", detail: "button=replayPlayBtn", secret: "do-not-save" }] }),
    });
    assert.equal(viewerResponse.status, 200);
    const viewerLog = await fs.readFile(path.join(dataDir, "viewer.log"), "utf8");
    assert.match(viewerLog, /button=replayPlayBtn/);
    assert.doesNotMatch(viewerLog, /do-not-save/);
    const crossSiteLog = await fetch(base + "/api/diagnostics/viewer", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.com", "Sec-Fetch-Site": "cross-site" },
      body: JSON.stringify({ events: [] }),
    });
    assert.equal(crossSiteLog.status, 403);
    const replay = {
      serverId: "test-server",
      replayId: "test-replay",
      captureFps: 60,
      stepMs: 1000 / 60,
      base: {
        parts: [],
        screenGui: { width: 800, height: 600, screens: [{ items: [{ text: 'Hello' }] }] },
        terrain: {
          cellSize: 4,
          origin: { x: 0, y: 0, z: 0 },
          cells: [{ x: 0, y: 0, z: 0, m: "Pebble", o: 255 }],
        },
      },
      durationMs: 200,
      frames: [{ t: 200, a: [], u: [], d: [], screenGui: { width: 800, height: 600, screens: [] } }],
      soundEvents: [{ t: 50, id: 'sound_1', event: 'play', soundId: 'rbxasset://sounds/test.ogg', playing: true, timePosition: 0, volume: 0.5, playbackSpeed: 1.2, spatial: true, partPath: 'part_1' }],
    };
    const serialized = JSON.stringify(replay);
    const pieces = [serialized.slice(0, 30), serialized.slice(30, 60), serialized.slice(60)];
    for (const i of [2, 0, 1]) {
      const response = await fetch(base + "/api/replay/chunk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Upload-Token": uploadToken,
        },
        body: JSON.stringify({
          uploadId: "upload",
          serverId: "test-server",
          chunkIndex: i,
          totalChunks: pieces.length,
          chunkData: pieces[i],
        }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).ok, true);
    }
    const loaded = await (
      await fetch(base + "/api/replay/latest?replayId=test-replay")
    ).json();
    assert.equal(loaded.frames.length, 1);
    assert.equal(loaded.base.screenGui.screens[0].items[0].text, 'Hello');
    assert.deepEqual(loaded.frames[0].screenGui.screens, []);
    assert.equal(loaded.soundEvents[0].playbackSpeed, 1.2);
    assert.equal(loaded.base.terrain.cells[0].m, "Pebble");
    const library = await (await fetch(base + "/api/replays")).json();
    assert.equal(library.replays.find((row) => row.replayId === "test-replay").captureFps, 60);
    const frameJson = JSON.stringify([{ t: 100, a: [], u: [], d: [], da: [
      { id: "decal_1", partPath: "part_1" },
    ], du: [], dd: [] }]);
    const compressed = Buffer.concat([
      Buffer.from([0xf0, frameJson.length - 15]),
      Buffer.from(frameJson),
    ]).toString("base64");
    const captured = {
      serverId: "test-server",
      replayId: "compressed-at-capture",
      base: { parts: [] },
      durationMs: 100,
      frameBlocks: [
        { codec: "lz4", data: compressed, originalBytes: frameJson.length },
      ],
    };
    const saved = await fetch(base + "/api/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": uploadToken,
      },
      body: JSON.stringify(captured),
    });
    assert.equal(saved.status, 200);
    const expanded = await (
      await fetch(base + "/api/replay/latest?replayId=compressed-at-capture")
    ).json();
    assert.equal(expanded.frames[0].t, 100);
    assert.equal(expanded.frames[0].da[0].id, "decal_1");
    assert.equal(expanded.frameBlocks, undefined);
    const badDecalFrame = await fetch(base + "/api/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": uploadToken,
      },
      body: JSON.stringify({
        ...replay,
        replayId: "bad-decal-frame",
        frames: [{ t: 100, da: {} }],
      }),
    });
    assert.equal(badDecalFrame.status, 400);
    const denied = await fetch(base + "/api/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": uploadToken,
      },
      body: JSON.stringify({ ...replay, serverId: "wrong" }),
    });
    assert.equal(denied.status, 401);
    const malformed = await fetch(base + "/api/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": uploadToken,
      },
      body: "{bad",
    });
    assert.equal(malformed.status, 400);
    const wrongShape = await fetch(base + "/api/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": uploadToken,
      },
      body: "[]",
    });
    assert.equal(wrongShape.status, 400);
    const badId = await fetch(base + "/api/replay/%E0%A4%A");
    assert.equal(badId.status, 400);
    const getUpload = encodeURIComponent(
      JSON.stringify({ ...replay, replayId: "get-replay" }),
    );
    const local = await fetch(
      base +
        `/api/replay/local-chunk?uploadId=get&serverId=test-server&chunkIndex=0&totalChunks=1&chunkData=${getUpload}`,
    );
    assert.equal(local.status, 200);
    assert.equal((await local.json()).replayId, "get-replay");
    const utf8Replay = JSON.stringify({
      ...replay,
      replayId: "get-utf8-replay",
      replayName: "Mobile replay",
    });
    const utf8Pieces = [
      utf8Replay.slice(0, 45),
      utf8Replay.slice(45, 90),
      utf8Replay.slice(90),
    ];
    for (const [index, piece] of utf8Pieces.entries()) {
      const response = await fetch(
        base +
          `/api/replay/local-chunk?uploadId=get-utf8&serverId=test-server&chunkIndex=${index}&totalChunks=${utf8Pieces.length}&chunkData=${encodeURIComponent(piece)}`,
      );
      assert.equal(response.status, 200);
      assert.equal((await response.json()).ok, true);
    }
    const localUtf8 = await (
      await fetch(base + "/api/replay/latest?replayId=get-utf8-replay")
    ).json();
    assert.equal(localUtf8.replayName, "Mobile replay");
    const crossSite = await fetch(
      base +
        `/api/replay/local-chunk?uploadId=x&serverId=test-server&chunkIndex=0&totalChunks=1&chunkData=${getUpload}`,
      { headers: { "Sec-Fetch-Site": "cross-site" } },
    );
    assert.equal(crossSite.status, 403);
    const localSnapshotPayload = encodeURIComponent(
      JSON.stringify({ serverId: "test-server", snapshotName: "Local snapshot", parts: [] }),
    );
    const localSnapshotResponse = await fetch(
      base +
        `/api/snapshot/local-chunk?uploadId=get-snapshot&serverId=test-server&chunkIndex=0&totalChunks=1&chunkData=${localSnapshotPayload}`,
    );
    assert.equal(localSnapshotResponse.status, 200);
    assert.equal((await localSnapshotResponse.json()).snapshotName, "Local snapshot");
    const localSnapshot = await (
      await fetch(base + "/api/snapshot/latest?serverId=test-server")
    ).json();
    assert.equal(localSnapshot.snapshotName, "Local snapshot");
    const crossSiteSnapshot = await fetch(
      base +
        `/api/snapshot/local-chunk?uploadId=x-snap&serverId=test-server&chunkIndex=0&totalChunks=1&chunkData=${localSnapshotPayload}`,
      { headers: { "Sec-Fetch-Site": "cross-site" } },
    );
    assert.equal(crossSiteSnapshot.status, 403);
    const snapshot = {
      serverId: "test-server",
      parts: [],
      snapshotName: "Teste",
    };
    const snap = await fetch(base + "/api/snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": uploadToken,
      },
      body: JSON.stringify(snapshot),
    });
    assert.equal(snap.status, 200);
    const cleanup = await fetch(base + "/api/snapshot/cleanup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Token": uploadToken,
      },
      body: JSON.stringify({ serverId: "test-server" }),
    });
    assert.equal((await cleanup.json()).removed, true);
    assert.deepEqual(await fs.readdir(path.join(dataDir, "snapshots")), []);
    const stopped = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await stopped;
    restarted = spawn(process.execPath, ["dist/server.js"], serverOptions);
    let reloaded = false;
    for (let i = 0; i < 50; i++) {
      if (restarted.exitCode !== null) throw Error("restarted server exited");
      try {
        const response = await fetch(
          base + "/api/replay/latest?replayId=test-replay",
        );
        if (response.ok) {
          assert.equal((await response.json()).frames.length, 1);
          reloaded = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(reloaded, "replay was not restored after server restart");
  } finally {
    child.kill("SIGTERM");
    if (restarted && restarted.exitCode === null) {
      const stopped = new Promise((resolve) => restarted.once("exit", resolve));
      restarted.kill("SIGTERM");
      await stopped;
    }
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});

test("LAN code authentication binds tickets and tokens to the server", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "replaymod-remote-"));
  const port = 20000 + Math.floor(Math.random() * 20000);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["dist/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      SERVER_WEBVIEW_DATA_DIR: dataDir,
      SERVER_WEBVIEW_PORT: String(port),
      SERVER_WEBVIEW_PUBLIC_BASE_URL: `http://192.0.2.1:${port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (data) => {
    log += data.toString();
  });
  child.stderr.on("data", (data) => {
    log += data.toString();
  });
  const post = (route, payload, token) =>
    fetch(base + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-Upload-Token": token } : {}),
      },
      body: JSON.stringify(payload),
    });
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if (child.exitCode !== null) throw Error(`server exited: ${log}`);
      if (/LOGIN CODE: (\d{20})/.test(log)) {
        try {
          if ((await fetch(base + "/health")).ok) {
            ready = true;
            break;
          }
        } catch {}
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(ready, `remote server did not start: ${log}`);
    const code = log.match(/LOGIN CODE: (\d{20})/)[1];
    const redeemed = await post("/api/auth/redeem", {
      code,
      serverId: "remote-server",
    });
    assert.equal(redeemed.status, 200);
    const { ticket } = await redeemed.json();
    assert.equal(
      (await post("/api/auth/redeem", { code, serverId: "remote-server" }))
        .status,
      409,
    );
    assert.equal(
      (await post("/api/auth/exchange", { ticket, serverId: "wrong-server" }))
        .status,
      409,
    );
    const exchange = await post("/api/auth/exchange", {
      ticket,
      serverId: "remote-server",
    });
    assert.equal(exchange.status, 200);
    const { uploadToken } = await exchange.json();
    assert.equal(
      (await post("/api/auth/exchange", { ticket, serverId: "remote-server" }))
        .status,
      404,
    );
    const replay = {
      serverId: "remote-server",
      replayId: "remote",
      base: { parts: [] },
      frames: [],
      durationMs: 0,
    };
    const forbidden = await post("/api/replay", replay);
    assert.equal(forbidden.status, 401);
    assert.equal(
      (
        await post(
          "/api/replay",
          { ...replay, serverId: "wrong-server" },
          uploadToken,
        )
      ).status,
      401,
    );
    assert.equal((await post("/api/replay", replay, uploadToken)).status, 200);
  } finally {
    child.kill("SIGTERM");
    await fs.rm(dataDir, { recursive: true, force: true });
  }
});
