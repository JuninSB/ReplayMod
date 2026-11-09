const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");

test("Termux launcher keeps localhost default and accepts an explicit remote address", () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-launcher-'));
  try {
    fs.writeFileSync(path.join(dir, 'curl'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
    fs.writeFileSync(path.join(dir, 'node'), '#!/bin/sh\nprintf "HOST=%s\\nBASE=%s\\n" "$SERVER_WEBVIEW_HOST" "$SERVER_WEBVIEW_PUBLIC_BASE_URL"\n', { mode: 0o755 });
    const env = { ...process.env, PATH: `${dir}:${process.env.PATH}` };
    delete env.SERVER_WEBVIEW_HOST; delete env.SERVER_WEBVIEW_PORT; delete env.SERVER_WEBVIEW_PUBLIC_BASE_URL;
    const script = path.join(__dirname, '../iniciar-teste.sh');
    const local = spawnSync('sh', [script], { env, encoding: 'utf8' });
    assert.equal(local.status, 0);
    assert.match(local.stdout, /HOST=127\.0\.0\.1/);
    assert.match(local.stdout, /BASE=http:\/\/127\.0\.0\.1:8000/);
    const remote = spawnSync('sh', [script], { env: { ...env, SERVER_WEBVIEW_HOST: '0.0.0.0', SERVER_WEBVIEW_PUBLIC_BASE_URL: 'http://100.101.102.103:8000' }, encoding: 'utf8' });
    assert.equal(remote.status, 0);
    assert.match(remote.stdout, /HOST=0\.0\.0\.0/);
    assert.match(remote.stdout, /BASE=http:\/\/100\.101\.102\.103:8000/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("joystick clamps movement and has a dead zone", async () => {
  const { joystickVector } = await import('../web/static/touch-joystick.mjs');
  assert.deepEqual(joystickVector(1, 1, 50), { x: 0, y: 0 });
  const moved = joystickVector(60, 80, 50);
  assert.ok(Math.abs(moved.x - 0.6) < 1e-9);
  assert.ok(Math.abs(moved.y - 0.8) < 1e-9);
});

test("world text survives replay updates and can be cleared", async () => {
  const { normalizePart } = await import('../web/static/scene-data.mjs');
  const { ReplayTimeline } = await import('../web/static/replay-timeline.mjs');
  const element = { text: 'Hello', font: 'Enum.Font.SourceSans', color3: '#ffffff', kind: 'SurfaceGui', face: 'Front' };
  const part = { path: 'sign', name: 'Sign', size: { x: 4, y: 2, z: 1 }, position: { x: 0, y: 0, z: 0 }, textElements: [element] };
  const timeline = new ReplayTimeline({ base: { parts: [part] }, durationMs: 100, frames: [{ t: 50, u: [{ path: 'sign', textElements: false }] }] }, normalizePart);
  assert.equal(timeline.map.get('sign').textElements[0].text, 'Hello');
  timeline.seek(50);
  assert.deepEqual(timeline.map.get('sign').textElements, []);
});

test("ScreenGui state follows replay frames and backward seeking", async () => {
  const { ReplayTimeline } = await import('../web/static/replay-timeline.mjs');
  const first = { width: 800, height: 600, screens: [{ items: [{ text: 'Before', texture: 'rbxassetid://123' }] }] };
  const second = { width: 800, height: 600, screens: [{ items: [{ text: 'After' }] }] };
  const timeline = new ReplayTimeline({ base: { parts: [], screenGui: first }, durationMs: 200, frames: [{ t: 100, screenGui: second }] }, x => x);
  assert.equal(timeline.screenGui, first);
  timeline.seek(100);
  assert.equal(timeline.screenGui, second);
  timeline.seek(0);
  assert.equal(timeline.screenGui, first);
  const { captureAssets } = await import('../web/static/offline-export.mjs');
  assert.ok(captureAssets({ base: { screenGui: first } }).required.has('/api/asset/texture?src=rbxassetid%3A%2F%2F123'));
});

test("sound events reconstruct seek position, looping and stopping", async () => {
  const { ReplayAudio, soundStatesAt, soundOffsetAt } = await import('../web/static/replay-audio.mjs');
  const events = [
    { id: 'a', t: 0, event: 'play', playing: true, timePosition: 1, playbackSpeed: 2, looped: true, timeLength: 4 },
    { id: 'a', t: 3000, event: 'stop', playing: false },
  ];
  assert.equal(soundOffsetAt(events[0], 2000), 1);
  assert.equal(soundStatesAt(events, 1000).size, 1);
  assert.equal(soundStatesAt(events, 3000).size, 0);
  const player = new ReplayAudio(events, () => null);
  assert.equal(player.statesAt(3000).size, 0);
  assert.equal(player.statesAt(1000).size, 1);
});

test("older sound recordings infer short endings and expire missing loop stops", async () => {
  const { repairLegacySoundEvents, soundStatesAt } = await import('../web/static/replay-audio.mjs');
  const repaired = repairLegacySoundEvents([
    { id: 'jump', t: 1000, event: 'end', playing: false, soundId: 'jump', timeLength: 0.3, playbackSpeed: 1 },
    { id: 'walk', t: 1200, event: 'loop', playing: true, looped: true, soundId: 'walk', timeLength: 2, playbackSpeed: 2 },
  ]);
  assert.equal(soundStatesAt(repaired, 800).get('jump').playing, true);
  assert.equal(soundStatesAt(repaired, 1100).has('jump'), false);
  assert.equal(soundStatesAt(repaired, 2000).get('walk').playing, true);
  assert.equal(soundStatesAt(repaired, 2500).get('walk').playing, false);
});

test("MeshPart source dimensions preserve geometry origin when sizing", async () => {
  const { applyMeshSizing } = await import('../web/static/mesh-sizing.mjs');
  const THREE = require('three');
  const geometry = new THREE.BoxGeometry(2, 2, 2).translate(2, 0, 0);
  applyMeshSizing(geometry, { meshSize: { x: 4, y: 2, z: 2 } }, { x: 2, y: 2, z: 2 }, { x: 2, y: 0, z: 0 }, { x: 8, y: 2, z: 2 });
  geometry.computeBoundingBox();
  assert.equal(geometry.boundingBox.min.x, 2);
  assert.equal(geometry.boundingBox.max.x, 6);
});

test("Roblox DXT1 stud tile decodes without a compressed texture extension", async () => {
  const { decodeDxt1DDS, surfaceKind, surfacePixels, surfaceRepeats } = await import('../web/static/surface-patterns.mjs');
  const bytes = readFileSync(path.join(__dirname, '../client-assets/textures/studs.dds'));
  const tile = decodeDxt1DDS(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(tile.width, 128);
  assert.equal(tile.height, 128);
  assert.equal(tile.pixels.length, 128 * 128 * 4);
  assert.deepEqual(surfaceRepeats('studs', 1, 4), [0.5, 2]);
  assert.deepEqual(surfaceRepeats('studs', 1.5, 1), [0.75, 0.5]);
  assert.deepEqual(surfaceRepeats('weld', 4, 1), [1, 1]);
  assert.equal(surfaceKind('Enum.SurfaceType.Universal'), 'universal');
  assert.equal(surfaceKind('Enum.SurfaceType.Smooth'), '');
  assert.notDeepEqual(surfacePixels(tile, 'studs'), surfacePixels(tile, 'inlet'));
  assert.notDeepEqual(surfacePixels(tile, 'universal'), surfacePixels(tile, 'studs'));
  assert.throws(() => decodeDxt1DDS(new ArrayBuffer(16)), /Unsupported/);
});

test("surface tiles use part color and exact physical repeats on each face", async () => {
  const THREE = require('three');
  const { surfaceKind, surfaceRepeats } = await import('../web/static/surface-patterns.mjs');
  const source = readFileSync(path.join(__dirname, '../web/static/app.js'), 'utf8');
  const context = vm.createContext({ THREE, surfaceKind, surfaceRepeats, isPlasticMat: material => material === 'Plastic', three: { renderer: { capabilities: { getMaxAnisotropy: () => 1 } } }, toNum: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback, hexColor: value => value });
  vm.runInContext(source.slice(source.indexOf('function hasSurfacePattern('), source.indexOf('function isPlasticMat(')), context);
  vm.runInContext(source.slice(source.indexOf('function makeSurfaceFaceMats('), source.indexOf('function boxFaceRepeats(')), context);
  context.part = { color3: '#e05030', material: 'Plastic', transparency: 0, size: { x: 1, y: 1, z: 4 }, topSurface: 'Enum.SurfaceType.Studs', frontSurface: 'Enum.SurfaceType.Inlet' };
  context.patterns = { studs: new THREE.Texture(), inlet: new THREE.Texture() };
  const materials = vm.runInContext('makeSurfaceFaceMats({}, part, patterns)', context);
  assert.equal(materials[2].color.getHexString(), 'e05030');
  assert.equal(materials[2].map.repeat.x, 0.5);
  assert.equal(materials[2].map.repeat.y, 2);
  assert.equal(materials[4].map.repeat.x, 0.5);
  assert.equal(materials[4].map.repeat.y, 0.5);
  assert.ok(materials[2].opacity > 0);
  assert.equal(materials[0].opacity, 0);
  assert.equal(materials[0].visible, false);
  assert.equal(context.hasSurfacePattern({ material: 'Wood', topSurface: 'Studs' }), false);
  assert.equal(context.hasSurfacePattern({ material: 'Wood', topSurface: 'Hinge' }), true);
});

test("only opaque box geometry is used as a conservative occluder", () => {
  const THREE = require('three');
  const source = readFileSync(path.join(__dirname, '../web/static/app.js'), 'utf8');
  const context = vm.createContext({ toNum: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback });
  vm.runInContext(source.slice(source.indexOf('function isTransparentMat('), source.indexOf('function shouldSkipOcclusionForTarget(')), context);
  const box = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshBasicMaterial());
  box.userData.part = { size: { x: 5, y: 5, z: 5 } };
  assert.equal(context.isLikelyOccluder(box), true);
  box.material.transparent = true;
  assert.equal(context.isLikelyOccluder(box), false);
  box.material.transparent = false;
  box.userData.part.meshId = 'mesh';
  assert.equal(context.isLikelyOccluder(box), false);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial());
  assert.equal(context.isLikelyOccluder(sphere), false);
});

test("movement-only replay updates bypass expensive appearance comparisons", async () => {
  const { isPoseOnlyPatch, ReplayTimeline } = await import('../web/static/replay-timeline.mjs');
  const { applyViewerOverrides } = await import('../web/static/viewer-overrides.mjs');
  assert.equal(isPoseOnlyPatch({ path: 'p', position: { x: 2 } }), true);
  assert.equal(isPoseOnlyPatch({ path: 'p', position: { x: 2 }, color3: '#ffffff' }), false);
  const source = readFileSync(path.join(__dirname, '../web/static/app.js'), 'utf8');
  const mesh = { userData: { part: { path: 'p', position: { x: 1 } } } };
  const context = vm.createContext({ partByPath: new Map([['p', mesh]]), viewerOverrides: new Map(), applyViewerOverrides, isPoseOnlyPatch, repSet: (obj, part) => { obj.applied = part; }, repNeedGeo: () => { throw Error('geometry compared'); }, repNeedMat: () => { throw Error('material compared'); } });
  vm.runInContext(source.slice(source.indexOf('function repUpd('), source.indexOf('function repBuild(')), context);
  context.updated = { path: 'p', position: { x: 2 } }; context.patch = { path: 'p', position: { x: 2 } };
  vm.runInContext('repUpd(updated, 0, null, patch)', context);
  assert.equal(mesh.userData.part.position.x, 2);
  assert.equal(mesh.applied.position.x, 2);
  const timeline = new ReplayTimeline({ base: { parts: [{ path: 'p', position: { x: 1 } }] }, durationMs: 10, frames: [{ t: 5, u: [context.patch] }] }, p => p);
  let observed;
  timeline.seek(5, { onChange: event => { observed = event.patch; } });
  assert.equal(observed.position.x, 2);
});

test("viewer edits keep invisible objects visible across playback updates without modifying recorded state", async () => {
  const { applyViewerOverrides } = await import('../web/static/viewer-overrides.mjs');
  const THREE = require('three');
  const source = readFileSync(path.join(__dirname, '../web/static/app.js'), 'utf8');
  const viewerOverrides = new Map([['part_1', { transparency: 0, position: { x: 7 } }]]);
  const context = vm.createContext({ THREE, applyViewerOverrides, viewerOverrides });
  vm.runInContext(source.slice(source.indexOf('function repLerp('), source.indexOf('function repNeedGeo(')), context);
  context.mesh = new THREE.Mesh();
  const before = { path: 'part_1', position: { x: 1, y: 2, z: 3 }, orientation: {}, transparency: 1 };
  const after = { path: 'part_1', position: { x: 2, y: 4, z: 3 }, orientation: {}, transparency: 1 };
  context.before = before; context.after = after;
  vm.runInContext('repSet(mesh, after, 0.5, before)', context);
  assert.equal(context.mesh.material.opacity, 1);
  assert.equal(context.mesh.position.x, 7);
  assert.equal(context.mesh.position.y, 3);
  assert.equal(after.transparency, 1);
  assert.equal(after.position.x, 2);
});

test("replay audio follows timeline pause, speed and a moving spatial source", async () => {
  const { ReplayAudio } = await import('../web/static/replay-audio.mjs');
  const THREE = require('three');
  class FakeAudio {
    constructor(url) { this.url = url; this.paused = true; this.currentTime = 0; }
    addEventListener() {} removeAttribute() {} load() {}
    pause() { this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
  }
  const wire = () => ({ connect() {}, disconnect() {} });
  class FakeContext {
    constructor() { this.destination = {}; this.listener = { setPosition() {}, setOrientation() {} }; }
    resume() { return Promise.resolve(); }
    createMediaElementSource() { return wire(); }
    createGain() { return { ...wire(), gain: { value: 0 } }; }
    createPanner() { return { ...wire(), setPosition(x, y, z) { this.point = [x, y, z]; } }; }
  }
  const previousAudio = globalThis.Audio, previousContext = globalThis.AudioContext;
  globalThis.Audio = FakeAudio; globalThis.AudioContext = FakeContext;
  try {
    const part = new THREE.Object3D(); part.position.set(10, 0, 0); part.updateMatrixWorld();
    const camera = new THREE.PerspectiveCamera();
    const player = new ReplayAudio([
      { id: 's', t: 0, event: 'play', soundId: 'rbxasset://sounds/action_jump.mp3', playing: true, timePosition: 1, playbackSpeed: 1.5, volume: 0.5, spatial: true, partPath: 'p', offset: { x: 2, y: 0, z: 0 } },
      { id: 'music', t: 0, event: 'play', soundId: 'rbxasset://sounds/music.mp3', playing: true, volume: 0.5, spatial: false },
    ], () => part);
    player.unlock(); player.sync(2000, true, 2, camera, 1000, true);
    const node = player.nodes.get('s');
    assert.equal(node.audio.currentTime, 4);
    assert.equal(node.audio.playbackRate, 3);
    assert.equal(node.gain.gain.value, 0.5);
    assert.deepEqual(node.panner.point, [12, 0, 0]);
    assert.equal(player.nodes.has('music'), true);
    player.setKindEnabled(false, false);
    assert.equal(player.nodes.has('music'), false);
    assert.equal(player.nodes.has('s'), true);
    player.sync(2000, true, 2, camera, 1020, true);
    assert.equal(player.nodes.has('music'), false);
    player.setKindEnabled(true, false);
    assert.equal(player.nodes.size, 0);
    player.setKindEnabled(false, true);
    player.sync(2000, true, 2, camera, 1030, true);
    assert.equal(player.nodes.has('music'), true);
    assert.equal(player.nodes.has('s'), false);
    player.setKindEnabled(true, true);
    player.sync(2000, true, 2, camera, 1040, true);
    const restoredNode = player.nodes.get('s');
    player.overrides.set('s', { volume: 0.25, playbackSpeed: 0.5 });
    player.sync(2000, true, 2, camera, 1050, true);
    assert.equal(restoredNode.audio.playbackRate, 1);
    assert.equal(restoredNode.gain.gain.value, 0.25);
    player.sync(2000, false, 2, camera, 1100, true);
    assert.equal(restoredNode.audio.paused, true);
    player.stop();
  } finally { globalThis.Audio = previousAudio; globalThis.AudioContext = previousContext; }
});

test("shadow range limits distant shadows without overriding disabled casters", async () => {
  const {partCastsNearby} = await import("../web/static/shadow-range.mjs");
  const camera = {x:0,y:0,z:0};
  const part = {size:{x:2,y:2,z:2},castShadow:true};
  assert.equal(partCastsNearby(part,{x:40,y:0,z:0},camera,'near'),true);
  assert.equal(partCastsNearby(part,{x:200,y:0,z:0},camera,'medium'),false);
  assert.equal(partCastsNearby(part,{x:200,y:0,z:0},camera,'far'),true);
  assert.equal(partCastsNearby({...part,castShadow:false},{x:1,y:0,z:0},camera,'far'),false);
  assert.equal(partCastsNearby({...part,transparency:1},{x:1,y:0,z:0},camera,'far'),false);
});

test("shadow coverage follows camera position without jumping when it rotates", async () => {
  const THREE = require("three");
  const { shadowRange, partCastsNearby } = await import("../web/static/shadow-range.mjs");
  const source = readFileSync(path.join(__dirname, "../web/static/app.js"), "utf8");
  const context = vm.createContext({ THREE, shadowRange, partCastsNearby });
  vm.runInContext(`let shadowCoverageAt = 0, shadowCoverageState = null, shadowSceneDirty = true;
    const partMeshes = []; const dbg = { shadowUpdateRate: 'live', shadowRange: 'medium' };
    const skyState = { sunVector: new THREE.Vector3(0, 1, 0) };
    const three = { camera: new THREE.PerspectiveCamera(), dir: new THREE.DirectionalLight(), renderer: { shadowMap: {} } };` +
    source.slice(source.indexOf('function updateShadowCoverage('), source.indexOf('function syncLight(', source.indexOf('function updateShadowCoverage('))) +
    `; globalThis.test = () => { updateShadowCoverage(1000, true); const initial = three.dir.target.position.clone();
      three.camera.rotation.y = Math.PI; updateShadowCoverage(1100);
      const turned = three.dir.target.position.clone(); three.camera.position.x = 10; updateShadowCoverage(1200);
      return { initial, turned, moved: three.dir.target.position.clone() }; };`, context);
  const result = context.test();
  assert.equal(result.initial.distanceTo(result.turned), 0);
  assert.ok(result.moved.x > 9);
});

test("terrain reconstruction emits only exposed voxel faces", async () => {
  const THREE = require("three");
  const { buildTerrainGeometries, terrainSurfaceFaceCount } = await import("../web/static/terrain-mesh.mjs");
  const cells = [
    { x: 0, y: 0, z: 0, m: "Pebble", o: 255 },
    { x: 1, y: 0, z: 0, m: "Pebble", o: 255 },
  ];
  assert.equal(terrainSurfaceFaceCount(cells), 10);
  const geometries = buildTerrainGeometries({ cellSize: 4, origin: { x: 0, y: 0, z: 0 }, cells }, THREE);
  assert.equal(geometries.length, 1);
  assert.equal(geometries[0].material, "Pebble");
  assert.equal(geometries[0].geometry.attributes.position.count, 60);
});

test("asset loading retries twice, shares successes and retries only failed jobs", async () => {
  const { AssetLoads } = await import("../web/static/asset-loads.mjs");
  const loads = new AssetLoads();
  let good = 0, bad = 0, recovered = null;
  loads.load('good','mesh', async () => { good++; return 'cached'; });
  loads.load('bad','mesh', async () => { bad++; if (bad <= 2) throw Error('temporary'); return 'recovered'; }, {onValue:value => {recovered=value;}});
  const settle = async () => { for(let i=0;i<50 && (loads.running || loads.queue.length);i++) await new Promise(resolve=>setTimeout(resolve,5)); };
  await settle(); assert.equal(good,1); assert.equal(bad,2); assert.equal(loads.summary().failures.length,1);
  loads.load('good','mesh',async()=>{throw Error('must not refetch');});
  loads.retryFailed(); await settle();
  assert.equal(good,1); assert.equal(bad,3); assert.equal(recovered,'recovered'); assert.equal(loads.summary().failures.length,0);
});

test("offline assets get three attempts before failure is reported", async () => {
  const {readAssetWithRetry}=await import('../web/static/offline-export.mjs');
  let calls=0;
  const asset=await readAssetWithRetry('/asset',async()=>{calls++;return calls<3 ? new Response('',{status:503}) : new Response('ok');});
  assert.equal(calls,3); assert.equal(new TextDecoder().decode(asset.bytes),'ok');
  calls=0; await assert.rejects(readAssetWithRetry('/asset',async()=>{calls++;throw Error('offline');})); assert.equal(calls,3);
});

test("R6 heads preserve SpecialMesh shape and ordinary heads stay blocks", async () => {
  const {normalizePart}=await import('../web/static/scene-data.mjs');
  const raw={name:'Head',className:'Part',position:{x:0,y:2,z:0},size:{x:2,y:1,z:1}};
  assert.equal(normalizePart(raw).meshId,'');
  assert.equal(normalizePart({...raw,meshType:'Enum.MeshType.Head',meshScale:{x:1.25,y:1.25,z:1.25}}).meshId,'rbxasset://avatar/heads/head.mesh');
  assert.equal(normalizePart({...raw,meshId:'rbxassetid://custom'}).meshId,'rbxassetid://custom');
});

test("initial camera prefers a living visible player, then a loaded part", async () => {
  const { chooseSpawnTarget } = await import("../web/static/camera-spawn.mjs");
  const part = {position:{x:5000,y:0,z:0},userData:{part:{name:"Floor"}}};
  const dead = {position:{x:0,y:0,z:0},userData:{part:{name:"Head",characterName:"Dead",characterHealth:0}}};
  const player = {position:{x:3000,y:10,z:0},userData:{part:{name:"Head",characterName:"Player",characterHealth:100}}};
  assert.equal(chooseSpawnTarget([part, dead, player]), player);
  player.userData.part.transparency = 1;
  assert.equal(chooseSpawnTarget([part, dead, player]), part);
  assert.equal(chooseSpawnTarget([]), null);
});

test("offline export includes the complete viewer module graph and capture asset references", async () => {
  const { collectModules, captureAssets, offlineCaptureRow } = await import("../web/static/offline-export.mjs");
  const modules = await collectModules("/static/app.js", file => Promise.resolve(readFileSync(path.join(__dirname, "../web", file), "utf8")));
  assert.ok(modules["/static/vendor/three/build/three.module.js"]);
  assert.ok(modules["/static/vendor/three/build/three.core.js"]);
  assert.ok(modules["/static/screen-gui.mjs"]);
  assert.ok(modules["/static/vendor/three/examples/jsm/loaders/OBJLoader.js"]);
  for (const source of Object.values(modules)) {
    for (const match of source.matchAll(/["']offline:(\/static\/[^"']+)["']/g)) assert.ok(modules[match[1]], match[1]);
  }
  const { required } = captureAssets({base:{parts:[{meshId:"rbxassetid://123 ", textureId:"rbxassetid://456", clothing:{shirt:"rbxassetid://789"}}]},frames:[{u:[{textureId:"rbxassetid://999"}]}]});
  assert.equal(required.size, 4);
  assert.ok(required.has("/api/asset/mesh?src=rbxassetid%3A%2F%2F123"));
  assert.ok(captureAssets({lighting:{sky:{sunTextureId:'rbxassetid://1234'}}}).required.has('/api/asset/texture?src=rbxassetid%3A%2F%2F1234'));
  assert.ok(captureAssets({soundEvents:[{soundId:'rbxasset://sounds/action_jump.mp3'}]}).required.has('/api/asset/audio?src=rbxasset%3A%2F%2Fsounds%2Faction_jump.mp3'));
  assert.deepEqual(
    offlineCaptureRow({ mode: "rep", id: "replay-1", capture: { replayName: "One" } }),
    { replayName: "One", thumbnailUrl: null, replayId: "replay-1" },
  );
  assert.deepEqual(
    offlineCaptureRow({ mode: "snap", id: "snapshot-1", capture: { snapshotName: "One" } }),
    { snapshotName: "One", thumbnailUrl: null, serverId: "snapshot-1" },
  );
});

test("recorded YXZ orientation keeps the limb rotation axes correct", () => {
  const THREE = require("three");
  const source = readFileSync(path.join(__dirname, "../web/static/app.js"), "utf8");
  const context = vm.createContext({ THREE, applyViewerOverrides: (part) => part, viewerOverrides: new Map() });
  vm.runInContext(source.slice(source.indexOf("function repLerp("), source.indexOf("function repNeedGeo(")), context);
  context.mesh = new THREE.Mesh();
  vm.runInContext('repSet(mesh, {position:{}, orientation:{x:90,y:90,z:0}})', context);
  const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(context.mesh.quaternion);
  assert.ok(direction.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-8);
  const version = context.mesh.material.version;
  vm.runInContext('repSet(mesh, {position:{x:1}, orientation:{x:90,y:90,z:0}})', context);
  assert.equal(context.mesh.material.version, version, "moving a part must not recompile its material");
});

test("viewer parses as the browser ES module", () => {
  const checked = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    input: readFileSync(path.join(__dirname, "../web/static/app.js")),
    encoding: "utf8",
  });
  assert.equal(checked.status, 0, checked.stderr);
});

const moduleUrl = pathToFileURL(
  path.join(__dirname, "../web/static/replay-timeline.mjs"),
).href;
const sceneDataUrl = pathToFileURL(
  path.join(__dirname, "../web/static/scene-data.mjs"),
).href;
const visibilityUrl = pathToFileURL(
  path.join(__dirname, "../web/static/render-visibility.mjs"),
).href;
const appearanceUrl = pathToFileURL(
  path.join(__dirname, "../web/static/render-appearance.mjs"),
).href;
const clothingUrl = pathToFileURL(
  path.join(__dirname, "../web/static/classic-clothing.mjs"),
).href;

test("classic clothing preserves Roblox template priority and regions", async () => {
  const THREE = require("three");
  const {
    classicClothingLayers,
    classicClothingRegions,
    classicClothingUv,
    mapClassicClothingBoxUvs,
    projectClassicClothingMeshUvs,
  } = await import(clothingUrl);
  const clothing = {
    shirt: "rbxassetid://shirt",
    shirtColor: "#ff8000",
    pants: "rbxassetid://pants",
    graphic: "rbxassetid://graphic",
  };
  const torso = classicClothingLayers({ name: "Torso", clothing });
  assert.deepEqual(
    torso.map((layer) => layer.source),
    ["rbxassetid://shirt", "rbxassetid://graphic"],
  );
  assert.equal(torso[0].tint, "#ff8000");
  assert.equal(
    classicClothingLayers({ name: "Right Arm", clothing })[0].source,
    "rbxassetid://shirt",
  );
  assert.equal(
    classicClothingLayers({ name: "Left Leg", clothing })[0].source,
    "rbxassetid://pants",
  );
  assert.deepEqual(classicClothingLayers({ name: "Handle", clothing }), []);
  const front = classicClothingRegions("Torso")[5];
  assert.deepEqual(front, { x: 231, y: 73, width: 128, height: 128 });
  assert.equal(classicClothingRegions("Right Arm")[0].x, 150);
  assert.equal(classicClothingRegions("Right Arm")[1].x, 19);
  assert.equal(
    classicClothingRegions("Torso", "graphic").filter(Boolean).length,
    1,
  );
  const uv = classicClothingUv(front);
  assert.equal(uv.offsetX, 231 / 585);
  assert.equal(uv.offsetY, 1 - 201 / 559);
  const box = new THREE.BoxGeometry(2, 2, 2);
  const mapped = mapClassicClothingBoxUvs(box, "Torso");
  const frontIndex = box.getIndex().getX(box.groups[5].start);
  const frontUv = mapped.getAttribute("uv");
  const epsilon = 1e-6;
  assert.ok(frontUv.getX(frontIndex) >= uv.offsetX - epsilon);
  assert.ok(frontUv.getX(frontIndex) <= uv.offsetX + uv.repeatX + epsilon);
  assert.ok(frontUv.getY(frontIndex) >= uv.offsetY - epsilon);
  assert.ok(frontUv.getY(frontIndex) <= uv.offsetY + uv.repeatY + epsilon);
  const graphic = mapClassicClothingBoxUvs(box, "Torso", "graphic");
  assert.equal(graphic.getIndex().count, 6);
  assert.equal(
    graphic.getIndex().getX(0),
    box.getIndex().getX(box.groups[5].start),
  );
  const upper = projectClassicClothingMeshUvs(box, "UpperTorso");
  const lower = projectClassicClothingMeshUvs(box, "LowerTorso");
  assert.equal(upper.getAttribute("uv").count, 36);
  assert.ok(
    upper.getAttribute("uv").getY(0) > lower.getAttribute("uv").getY(0),
  );
  for (const geometry of [box, mapped, graphic, upper, lower])
    geometry.dispose();
});

test("body textures, accessories, and SurfaceAppearance use the correct composition", async () => {
  const THREE = require("three");
  const { meshTexturePolicy, mapFragmentForMode } = await import(appearanceUrl);
  const body = meshTexturePolicy({
    className: "MeshPart",
    name: "UpperTorso",
    color3: "#a3a2a5",
    textureId: "rbxassetid://123",
  });
  assert.equal(body.mode, "overlay");
  assert.equal(body.baseColor, "#a3a2a5");
  const hair = meshTexturePolicy({
    className: "MeshPart",
    name: "Handle",
    color3: "#a3a2a5",
    textureId: "rbxassetid://456",
  });
  assert.equal(hair.mode, "cutout");
  assert.equal(hair.tint, "#ffffff");
  assert.ok(hair.alphaTest > 0);
  const surface = meshTexturePolicy({
    className: "MeshPart",
    textureId: "rbxassetid://old",
    doubleSided: true,
    surfaceAppearance: {
      colorMap: "rbxassetid://new",
      color: "#c08040",
      alphaMode: "Enum.AlphaMode.Transparency",
    },
  });
  assert.equal(surface.source, "rbxassetid://new");
  assert.equal(surface.mode, "blend");
  assert.equal(surface.tint, "#c08040");
  assert.equal(surface.doubleSided, true);
  const overlayChunk = mapFragmentForMode(
    THREE.ShaderChunk.map_fragment,
    "overlay",
  );
  assert.match(
    overlayChunk,
    /mix\(diffuseColor\.rgb, sampledDiffuseColor\.rgb \* replayTextureTint, sampledDiffuseColor\.a\)/,
  );
  assert.doesNotMatch(overlayChunk, /diffuseColor \*= sampledDiffuseColor/);
  assert.equal(
    mapFragmentForMode(THREE.ShaderChunk.map_fragment, "cutout"),
    THREE.ShaderChunk.map_fragment,
  );
});

test("scene normalization preserves old and current captures", async () => {
  const {
    normalizePart,
    isCharHead,
    visibleDecalTexture,
    textureProxy,
    textureFetchUrl,
    meshProxy,
    usesBoxFaceMaterials,
  } = await import(sceneDataUrl);
  const oldPart = normalizePart({
    Path: "Workspace/Old",
    ClassName: "MeshPart",
    Size: { x: 2, y: 3, z: 4 },
    CFrame: { position: { x: 5, y: 6, z: 7 } },
    TextureID: "rbxassetid://123",
    CastShadow: false,
  });
  assert.equal(oldPart.path, "Workspace/Old");
  assert.deepEqual(oldPart.position, { x: 5, y: 6, z: 7 });
  assert.equal(oldPart.textureId, "rbxassetid://123");
  assert.equal(oldPart.castShadow, false);

  const currentPart = normalizePart({
    path: "Workspace/New",
    size: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: 0, z: 0 },
    surfaceAppearance: { colorMap: "rbxassetid://456" },
  });
  assert.equal(currentPart.textureId, "");
  const { meshTexturePolicy } = await import(appearanceUrl);
  assert.equal(meshTexturePolicy(currentPart).source, "rbxassetid://456");
  const newMeshPart = normalizePart({
    className: "MeshPart",
    path: "part_2",
    size: { x: 1, y: 1, z: 1 },
    position: { x: 0, y: 0, z: 0 },
    doubleSided: true,
    meshVertexColor: { x: 0.5, y: 1, z: 1 },
  });
  assert.equal(newMeshPart.doubleSided, true);
  assert.deepEqual(newMeshPart.meshVertexColor, { x: 0.5, y: 1, z: 1 });
  assert.deepEqual(currentPart.orientation, { x: 0, y: 0, z: 0 });
  const recordedHead = normalizePart({
    path: "part_9",
    name: "Head",
    characterName: "Jogador",
    size: { x: 2, y: 1, z: 1 },
    position: { x: 0, y: 2, z: 0 },
  });
  assert.equal(isCharHead(recordedHead), true);
  assert.equal(recordedHead.characterName, "Jogador");
  assert.equal(
    isCharHead(
      normalizePart({
        path: "Workspace/Jogador/Head",
        name: "Head",
        size: { x: 2, y: 1, z: 1 },
        position: { x: 0, y: 2, z: 0 },
      }),
    ),
    true,
  );
  assert.equal(normalizePart({ ClassName: "Terrain" }), null);
  assert.equal(normalizePart({ Name: "Incomplete" }), null);
  assert.equal(normalizePart(null), null);
  assert.equal(
    textureProxy("rbxassetid://123"),
    "/api/asset/texture?src=rbxassetid%3A%2F%2F123",
  );
  assert.equal(
    textureFetchUrl("http://www.roblox.com/asset/?id=123"),
    "/api/asset/texture?src=http%3A%2F%2Fwww.roblox.com%2Fasset%2F%3Fid%3D123",
  );
  assert.equal(
    textureFetchUrl("/api/material/map?material=Plastic"),
    "/api/material/map?material=Plastic",
  );
  assert.equal(
    meshProxy("rbxassetid://456"),
    "/api/asset/mesh?src=rbxassetid%3A%2F%2F456",
  );
  assert.equal(
    usesBoxFaceMaterials(
      { className: "MeshPart", meshId: "rbxassetid://456" },
      "BoxGeometry",
    ),
    false,
  );
  assert.equal(
    usesBoxFaceMaterials(
      { className: "Part", meshId: "rbxassetid://456" },
      "BoxGeometry",
    ),
    false,
  );
  assert.equal(
    usesBoxFaceMaterials({ className: "Part", shape: "Block" }, "BoxGeometry"),
    true,
  );
  assert.equal(visibleDecalTexture({ texture: "", transparency: 0 }), "");
  assert.equal(
    visibleDecalTexture({ texture: "rbxassetid://123", transparency: 1 }),
    "",
  );
  assert.equal(
    visibleDecalTexture({ texture: "rbxassetid://123", transparency: 0 }),
    "rbxassetid://123",
  );
});

test("occlusion hides from the camera and keeps mesh in the shadow map", async () => {
  const THREE = require("three");
  const { setCameraVisibility, cameraSees } = await import(visibilityUrl);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial(),
  );
  const child = new THREE.Object3D();
  mesh.add(child);
  mesh.castShadow = true;
  const camera = new THREE.PerspectiveCamera();
  const shadowCamera = new THREE.OrthographicCamera();
  shadowCamera.layers.enable(1);
  setCameraVisibility(mesh, false);
  assert.equal(cameraSees(mesh, camera), false);
  assert.equal(cameraSees(mesh, shadowCamera), true);
  assert.equal(child.layers.test(camera.layers), false);
  assert.equal(mesh.castShadow, true);
  setCameraVisibility(mesh, true);
  assert.equal(cameraSees(mesh, camera), true);
  assert.equal(child.layers.test(camera.layers), true);
  mesh.geometry.dispose();
  mesh.material.dispose();
});

test("appearance patches remove maps and mesh when a part loses those components", async () => {
  const [{ ReplayTimeline }, { normalizePart }, { meshTexturePolicy }] =
    await Promise.all([
      import(moduleUrl),
      import(sceneDataUrl),
      import(appearanceUrl),
    ]);
  const timeline = new ReplayTimeline(
    {
      base: {
        parts: [
          {
            path: "part_1",
            size: { x: 2, y: 2, z: 2 },
            position: { x: 0, y: 0, z: 0 },
            meshId: "rbxassetid://123",
            meshScale: { x: 1, y: 1, z: 1 },
            surfaceAppearance: { colorMap: "rbxassetid://456" },
            clothing: { shirt: "rbxassetid://clothing" },
          },
        ],
      },
      frames: [
        {
          t: 100,
          u: [
            {
              path: "part_1",
              meshId: "",
              meshScale: false,
              surfaceAppearance: false,
              clothing: false,
            },
          ],
        },
        {
          t: 200,
          u: [
            {
              path: "part_1",
              surfaceAppearance: { colorMap: "rbxassetid://789" },
            },
          ],
        },
      ],
    },
    normalizePart,
  );
  timeline.seek(100);
  assert.equal(timeline.map.get("part_1").meshId, "");
  assert.equal(timeline.map.get("part_1").meshScale, null);
  assert.equal(timeline.map.get("part_1").surfaceAppearance, null);
  assert.equal(timeline.map.get("part_1").clothing, null);
  assert.equal(meshTexturePolicy(timeline.map.get("part_1")), null);
  timeline.seek(200);
  assert.deepEqual(timeline.map.get("part_1").surfaceAppearance, {
    colorMap: "rbxassetid://789",
  });
});

test("timeline applies incremental decal creation, updates, and removal", async () => {
  const { ReplayTimeline } = await import(moduleUrl);
  const timeline = new ReplayTimeline(
    {
      base: {
        parts: [
          {
            path: "part_1",
            size: { x: 2, y: 2, z: 2 },
            position: { x: 0, y: 0, z: 0 },
          },
        ],
        decals: [
          { id: "decal_1", partPath: "part_1", face: "Front", texture: "one" },
        ],
      },
      frames: [
        { t: 100, du: [{ id: "decal_1", texture: "two" }] },
        {
          t: 200,
          da: [
            {
              id: "decal_2",
              partPath: "part_1",
              face: "Top",
              texture: "three",
            },
          ],
        },
        { t: 300, dd: ["decal_1"] },
      ],
    },
    (part) => part,
  );
  const changes = [];
  timeline.seek(250, { onChange: (change) => changes.push(change.type) });
  assert.deepEqual(changes, ["decal-update", "decal-add"]);
  assert.equal(timeline.decalMap.get("decal_1").texture, "two");
  assert.equal(timeline.decalMap.get("decal_1").partPath, "part_1");
  assert.equal(timeline.decalMap.get("decal_2").face, "Top");
  timeline.seek(350, { onChange: (change) => changes.push(change.type) });
  assert.equal(timeline.decalMap.has("decal_1"), false);
  assert.equal(changes.at(-1), "decal-remove");
  timeline.seek(0);
  assert.equal(timeline.decalMap.get("decal_1").texture, "one");
  assert.equal(timeline.decalMap.has("decal_2"), false);
});

test("timeline syncs Lighting while advancing and restores it when seeking backward", async () => {
  const { ReplayTimeline } = await import(moduleUrl);
  const timeline = new ReplayTimeline(
    {
      durationMs: 500,
      base: { parts: [], lighting: { clockTime: 10, brightness: 1 } },
      frames: [{ t: 250, lighting: { clockTime: 18, brightness: 2 } }],
    },
    (part) => part,
  );
  const events = [];
  assert.equal(timeline.lighting.clockTime, 10);
  timeline.seek(300, { onChange: (event) => events.push(event) });
  assert.equal(timeline.lighting.clockTime, 18);
  assert.equal(timeline.lighting.brightness, 2);
  assert.equal(events[0].type, "lighting");
  timeline.seek(0);
  assert.equal(timeline.lighting.clockTime, 10);
});

test("timeline preserves deltas, camera, duration, and reverse seeking", async () => {
  const { ReplayTimeline, interpolateAngle } = await import(moduleUrl);
  const timeline = new ReplayTimeline(
    {
      durationMs: 2000,
      base: {
        parts: [
          { path: "a", position: { x: 0, y: 3, z: 4 }, color3: "#ffffff" },
        ],
        camera: { position: { x: 0 } },
      },
      frames: [
        { t: 750, u: [{ Path: "a", Color3: "#ff0000" }] },
        {
          t: 500,
          u: [{ path: "a", position: { x: 5 } }],
          camera: { position: { x: 5 } },
        },
        {
          t: 1000,
          a: [{ path: "b", position: { x: 10 } }],
          d: ["a"],
          camera: { position: { x: 10 } },
        },
      ],
      chatEvents: [
        { t: 900, msg: "depois" },
        { t: 100, msg: "antes" },
      ],
    },
    (part) => part,
  );
  const events = [];
  timeline.seek(800, { onChange: (event) => events.push(event) });
  assert.equal(timeline.dur, 2000);
  assert.equal(timeline.map.get("a").position.x, 5);
  assert.equal(
    timeline.map.get("a").position.y,
    3,
    "patch parcial preserva outros eixos",
  );
  assert.equal(timeline.map.get("a").color3, "#ff0000");
  assert.equal(timeline.cameraPair().a.position.x, 5);
  assert.equal(timeline.cameraPair().b.position.x, 10);
  assert.equal(timeline.cameraPair().alpha, 0.6);
  assert.equal(timeline.chatCountAt(800), 1);
  assert.equal(timeline.chatCountAt(1000), 2);
  assert.equal(
    events[0].previous.position.x,
    0,
    "renderer recebe estado anterior",
  );
  timeline.seek(1500);
  assert.equal(timeline.map.has("a"), false);
  assert.equal(timeline.map.get("b").position.x, 10);
  let reset = 0;
  timeline.seek(100, {
    onReset: () => {
      reset += 1;
    },
  });
  assert.equal(reset, 1);
  assert.equal(timeline.map.get("a").position.x, 0);
  assert.equal(timeline.map.has("b"), false);
  assert.equal(timeline.seek(99999), 2000);
  assert.equal(interpolateAngle(350, 10, 0.5), 360);
  const other = new ReplayTimeline(
    { durationMs: 100, base: { parts: [{ path: "a", position: { x: 1 } }] } },
    (part) => part,
  );
  assert.equal(
    other.map.get("a").color3,
    undefined,
    "a new replay does not inherit previous state",
  );
});

test("interpolation selects only parts changed in the next frame", async () => {
  const { ReplayTimeline } = await import(moduleUrl);
  const timeline = new ReplayTimeline(
    {
      durationMs: 1000,
      base: {
        parts: [
          { path: "movel", position: { x: 0, y: 2, z: 3 } },
          { path: "estatico", position: { x: 5, y: 6, z: 7 } },
        ],
      },
      frames: [{ t: 1000, u: [{ path: "movel", position: { x: 10 } }] }],
    },
    (part) => part,
  );
  timeline.seek(500);
  const rows = timeline.nextInterpolations();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, "movel");
  assert.equal(rows[0].alpha, 0.5);
  assert.deepEqual(rows[0].target.position, { x: 10, y: 2, z: 3 });
  timeline.seek(1000);
  assert.deepEqual(timeline.nextInterpolations(), []);
});
