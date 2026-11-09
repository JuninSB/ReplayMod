const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");

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
  const { collectModules, captureAssets } = await import("../web/static/offline-export.mjs");
  const modules = await collectModules("/static/app.js", file => Promise.resolve(readFileSync(path.join(__dirname, "../web", file), "utf8")));
  assert.ok(modules["/static/vendor/three/build/three.module.js"]);
  assert.ok(modules["/static/vendor/three/examples/jsm/loaders/OBJLoader.js"]);
  for (const source of Object.values(modules)) {
    for (const match of source.matchAll(/["']offline:(\/static\/[^"']+)["']/g)) assert.ok(modules[match[1]], match[1]);
  }
  const { required } = captureAssets({base:{parts:[{meshId:"rbxassetid://123 ", textureId:"rbxassetid://456", clothing:{shirt:"rbxassetid://789"}}]},frames:[{u:[{textureId:"rbxassetid://999"}]}]});
  assert.equal(required.size, 4);
  assert.ok(required.has("/api/asset/mesh?src=rbxassetid%3A%2F%2F123"));
});

test("recorded YXZ orientation keeps the limb rotation axes correct", () => {
  const THREE = require("three");
  const source = readFileSync(path.join(__dirname, "../web/static/app.js"), "utf8");
  const context = vm.createContext({ THREE });
  vm.runInContext(source.slice(source.indexOf("function repLerp("), source.indexOf("function repNeedGeo(")), context);
  context.mesh = new THREE.Mesh();
  vm.runInContext('repSet(mesh, {position:{}, orientation:{x:90,y:90,z:0}})', context);
  const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(context.mesh.quaternion);
  assert.ok(direction.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-8);
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
