import { shadowRange, partCastsNearby } from "./shadow-range.mjs";
import { postEffectShader } from "./post-effects.mjs";
import { AssetLoads } from "./asset-loads.mjs";
import { chooseSpawnTarget } from "./camera-spawn.mjs";
import { ReplayTimeline } from "./replay-timeline.mjs";
import { downloadOffline } from "./offline-export.mjs?v=offline-2";
import { toNum, toVec3, readAny, normalizePart, faceName, visibleDecalTexture, isCharHead, textureProxy, textureFetchUrl, meshProxy, usesBoxFaceMaterials } from "./scene-data.mjs?v=render-20261109-2";
import { setCameraVisibility, cameraSees } from "./render-visibility.mjs";
import { meshTexturePolicy, mapFragmentForMode } from "./render-appearance.mjs?v=render-20261108";
import { classicClothingLayers, mapClassicClothingBoxUvs, projectClassicClothingMeshUvs } from "./classic-clothing.mjs?v=clothing-20261108";

let THREE = null;
let DDSLoaderClass = null;
let RoundedBoxGeometryClass = null;
let DecalGeometryClass = null;
let OBJLoaderClass = null;
let EffectComposerClass = null;
let RenderPassClass = null;
let UnrealBloomPassClass = null;
let OutputPassClass = null;
let ShaderPassClass = null;
let BokehPassClass = null;
let ddsLoader = null;
const serverSelect = document.getElementById("serverSelect");
const modeSelect = document.getElementById("modeSelect");
const serverWrap = document.querySelector('label[for="serverSelect"]');
const modeWrap = document.querySelector('label[for="modeSelect"]');
const refreshBtn = document.getElementById("refreshBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const homeBtn = document.getElementById("homeBtn");
const shareBtn = document.getElementById("shareBtn");
const debugBtn = document.getElementById("debugBtn");
const debugMenu = document.getElementById("debugMenu");
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.getElementById("settingsMenu");
const dbgShaders = document.getElementById("dbgShaders");
const dbgSmoothShadows = document.getElementById("dbgSmoothShadows");
const dbgFps = document.getElementById("dbgFps");
const dbgTextures = document.getElementById("dbgTextures");
const dbgFog = document.getElementById("dbgFog");
const dbgCulling = document.getElementById("dbgCulling");
const dbgPlayerLabels = document.getElementById("dbgPlayerLabels");
const dbgMeshBoxes = document.getElementById("dbgMeshBoxes") || document.getElementById("dbgMeshSpheres");
const dbgTexPathLabels = document.getElementById("dbgTexPathLabels");
const dbgFxPlaceholders = document.getElementById("dbgFxPlaceholders");
const dbgControls = document.getElementById("dbgControls");
const dbgWireframe = document.getElementById("dbgWireframe");
const setFov = document.getElementById("setFov");
const setFovValue = document.getElementById("setFovValue");
const setCamSens = document.getElementById("setCamSens");
const setCamSensValue = document.getElementById("setCamSensValue");
const setLookBtn = document.getElementById("setLookBtn");
const snapshotMeta = document.getElementById("snapshotMeta");
const lightingData = document.getElementById("lightingData");
const decalsData = document.getElementById("decalsData");
const viewport = document.getElementById("serverViewport");
const landingView = document.getElementById("landingView");
const viewerSection = document.getElementById("viewerSection");
const serverCards = document.getElementById("serverCards");
const landingTitle = document.getElementById("landingTitle");
const landingSub = document.getElementById("landingSub");
const panelTitle = document.getElementById("panelTitle");
const viewerContext = document.getElementById("viewerContext");
const viewerSidebar = document.getElementById("viewerSidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const sidebarExplorerPane = document.getElementById("sidebarExplorerPane");
const sidebarDetailsPane = document.getElementById("sidebarDetailsPane");
const libraryTabs = document.getElementById("libraryTabs");
const replayBar = document.getElementById("replayBar");
const replayPlayBtn = document.getElementById("replayPlayBtn");
const replaySeek = document.getElementById("replaySeek");
const replayTime = document.getElementById("replayTime");
const replayForward = document.getElementById("replayForward");
const replayChatTitle = document.getElementById("replayChatTitle");
const replayChat = document.getElementById("replayChat");
const cameraHelp = document.querySelector(".camera-help");
const explorerSearch = document.getElementById("explorerSearch");
const explorerMeta = document.getElementById("explorerMeta");
const explorerTree = document.getElementById("explorerTree");
const inspectorData = document.getElementById("inspectorData");
const downloadLogsBtn = document.getElementById("downloadLogsBtn");
const downloadSnapshotBtn = document.getElementById("downloadSnapshotBtn");
const saveThumbnailBtn = document.getElementById("saveThumbnailBtn");
const thumbHint = document.getElementById("thumbHint");
const thumbHintText = document.getElementById("thumbHintText");
const thumbHintClose = document.getElementById("thumbHintClose");

let servers = [];
let replays = [];
let curMode = "rep";
if (modeSelect) modeSelect.value = "rep";
let repDat = null;
let replayExplorerDirty = false;
let replayExplorerLastAt = 0;
let replayExplorerSignature = "";
let repMap = null;
let repDecalsByPart = new Map();
let repDecalPathById = new Map();
let repDecalsPanelDirty = false;
let replayLightsDirty = false;
const repInterpolatedPaths = new Set();
let repChatRenderedData = null;
let repChatRenderedCount = -1;
let repMs = 0;
let repRun = false;
let followRecordedCamera = false;
let repSpeed = 1;
let sceneLoad = 0;
let repAnimation = 0;
let repLast = 0;
let repRdrAt = 0;
let repCam = true;
let three = null;
let partMeshes = [];
let decalPlanes = [];
const decalPlaneById = new Map();
let characterLabels = [];
let meshSpheres = [];
let texturePathLabels = [];
let fxPlaceholders = [];
let sceneLights = [];
let partByPath = new Map();
let renderVersion = 0;
let selectedPath = "";
let selectedRow = null;
let selectedExplorerNode = null;
let selectedMesh = null;
let hoveredMesh = null;
let latestSnapshot = null;
let displayedSceneKey = "";
const thClsSet = new Set();
let thMuteSv = "";
let thTimer = null;
const clientLogs = [];
const MAX_CLIENT_LOGS = 1200;
const pressedKeys = new Set();
let studioFlyActive = false;
let studioMoveSpeed = 24;
let cameraLookSensitivity = 0.0022;
let cameraLookButton = "RMB";
let lastFrameAt = performance.now();
let lastPointerNdc = { x: 0, y: 0 };
let hasPointerNdc = false;
const materialTextureCache = new Map();
const clothingTextureCache = new Map();
const materialPbrMapCache = new Map();
const USE_LEGACY_MAT_TEX = false;
const OCC_RT_MS = 14;
const OCC_MAX_OCCLUSION_TESTS = 140;
const OCC_EDGE_GUARD = 0.9;
const OCC_HIDE_CONFIRM = 1;
const OCC_HOLD_VISIBLE_MS = 0;
const OCC_FULLY_HIDDEN_POINTS = 9;
const MESH_CHUNK_ON = false;
const MESH_CHUNK_TRI_THRESHOLD = 2200;
const MESH_CHUNK_MAX = 24;
let occLastAt = 0;
let shadowCoverageAt = 0;
let occProj = null;
let occFrustum = null;
let occRay = null;
let occTmp = null;
let occDir = null;
let occSphere = null;
let occBox = null;
let occNdcTmp = null;
let renderStatusEl = null;
let renderStage = "";
let assetProgressDismissed = false;
const assetLoads = new AssetLoads(() => renderAssetProgress(), 6, job => {
  if (job.kind !== 'texture') return;
  const source = job.key.slice('texture:'.length);
  for (const mesh of partMeshes) {
    if (JSON.stringify(mesh.userData?.part || {}).includes(source)) applyMatTex(mesh, mesh.userData.part, renderVersion);
  }
});
let fpsOverlayEl = null;
let studsPatternTexture = null;
let skyVisuals = null;
let skyState = null;
let starSignature = -1;
let recordedSkyKey = "", recordedSkyCube = null, recordedEnvironment = null;
let fpsLastAt = 0;
let fpsFrameCount = 0;
let fpsValue = 0;
let shdReady = false;
const dbg = {
  shadersOn: true,
  smoothShadows: true,
  smoothLighting: true,
  sceneBrightness: 1,
  shadowRange: "medium",
  showFps: false,
  texturesOn: true,
  fogOn: true,
  cullingOn: false,
  playerLabelsOn: true,
  meshBoxesOn: true,
  texturePathLabelsOn: false,
  fxPlaceholdersOn: true,
  controlsOn: false,
  wireframeOn: false,
};

const camCfg = {
  fov: 55,
  sensitivityMult: 1.0,
  lookButton: "RMB",
};

const materialProfileByName = {
  Grass: { roughness: 0.95, metalness: 0.02, texture: null, tile: 1.8 },
  Sand: { roughness: 0.92, metalness: 0.01, texture: null, tile: 1.6 },
  Brick: { roughness: 0.88, metalness: 0.03, texture: null, tile: 1.25 },
  Wood: { roughness: 0.78, metalness: 0.04, texture: null, tile: 1.0 },
  WoodPlanks: { roughness: 0.75, metalness: 0.03, texture: null, tile: 1.2 },
  Metal: { roughness: 0.34, metalness: 0.72, texture: null, tile: 1.0 },
  DiamondPlate: { roughness: 0.44, metalness: 0.68, texture: null, tile: 1.1 },
  Concrete: { roughness: 0.95, metalness: 0.02, texture: null, tile: 1.0 },
  Slate: { roughness: 0.9, metalness: 0.02, texture: null, tile: 1.0 },
  Plastic: { roughness: 0.58, metalness: 0, texture: null, tile: 1.0 },
  SmoothPlastic: { roughness: 0.38, metalness: 0, texture: null, tile: 1.0 },
  Fabric: { roughness: 0.98, metalness: 0.0, texture: null, tile: 1.5 },
  Ice: { roughness: 0.15, metalness: 0.0, texture: null, tile: 1.0 },
};

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function hexColor(v, fallback = "#c8c8c8") {
  if (typeof v !== "string") return fallback;
  return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}
function safeJson(value) {
  return JSON.stringify(value ?? {}, null, 2);
}

function safeSerialize(value) {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (key, current) => {
      if (current instanceof Error) {
        return {
          name: current.name,
          message: current.message,
          stack: current.stack,
        };
      }
      if (typeof current === "object" && current !== null) {
        if (seen.has(current)) return "[Circular]";
        seen.add(current);
      }
      if (typeof current === "function") return `[Function ${current.name || "anonymous"}]`;
      if (typeof current === "bigint") return current.toString();
      return current;
    },
    2
  );
}

function ensureHUD() {
  if (renderStatusEl || !viewport) return;
  const panel = document.createElement("section");
  panel.id = "renderStatusOverlay";
  panel.className = "asset-progress";
  panel.hidden = true;
  const title = document.createElement("div"); title.id = "assetStage"; title.setAttribute("role", "status");
  const close = document.createElement("button"); close.id = "assetDismiss"; close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "Close loading status");
  close.addEventListener("click", () => { assetProgressDismissed = true; renderAssetProgress(); });
  const counts = document.createElement("div"); counts.id = "assetCounts";
  const bar = document.createElement("progress"); bar.id = "assetProgress"; bar.max = 1; bar.value = 0; bar.setAttribute("aria-label", "Scene asset loading");
  const retry = document.createElement("button"); retry.id = "assetRetry"; retry.type = "button"; retry.textContent = "Retry failed assets";
  retry.addEventListener("click", () => assetLoads.retryFailed());
  const details = document.createElement("details"); details.id = "assetFailureDetails";
  const summary = document.createElement("summary"); summary.textContent = "Failed assets";
  const list = document.createElement("ul"); list.id = "assetFailures"; details.append(summary, list);
  panel.append(close, title, counts, bar, retry, details); viewport.appendChild(panel); renderStatusEl = panel;
}
function setRenderStatus(text) {
  renderStage = String(text || "").trim();
  renderAssetProgress();
}
function renderAssetProgress() {
  ensureHUD();
  if (!renderStatusEl) return;
  const {mesh, texture, pending, failures} = assetLoads.summary();
  const total = mesh.total + texture.total, ready = mesh.ready + texture.ready;
  const hasStatus = Boolean(renderStage || pending || failures.length);
  renderStatusEl.hidden = assetProgressDismissed || !hasStatus;
  const openStatus = document.getElementById("assetStatusBtn");
  if (openStatus) openStatus.hidden = !hasStatus;
  document.getElementById("assetStage").textContent = renderStage || (pending ? "Loading scene assets…" : `${failures.length} assets failed to load`);
  document.getElementById("assetCounts").textContent = `Meshes ${mesh.ready}/${mesh.total} · Textures ${texture.ready}/${texture.total}`;
  document.getElementById("assetProgress").value = total ? ready / total : 0;
  document.getElementById("assetRetry").hidden = !failures.length || pending > 0;
  document.getElementById("assetFailureDetails").hidden = !failures.length;
  const list = document.getElementById("assetFailures"); list.replaceChildren();
  for (const failure of failures) {
    const item = document.createElement("li"); item.textContent = `${failure.kind}: ${failure.key} — ${failure.error}`; list.appendChild(item);
  }
}

function ensureFpsHUD() {
  if (fpsOverlayEl || !viewport) return;
  if (getComputedStyle(viewport).position === "static") {
    viewport.style.position = "relative";
  }
  const el = document.createElement("div");
  el.id = "fpsOverlay";
  el.style.position = "absolute";
  el.style.top = "12px";
  el.style.right = "12px";
  el.style.padding = "7px 10px";
  el.style.borderRadius = "8px";
  el.style.border = "1px solid rgba(255,255,255,0.18)";
  el.style.background = "rgba(9, 14, 26, 0.72)";
  el.style.color = "#dcf6ff";
  el.style.font = "700 12px Segoe UI, Tahoma, sans-serif";
  el.style.letterSpacing = "0.2px";
  el.style.zIndex = "15";
  el.style.pointerEvents = "none";
  el.style.display = "none";
  viewport.appendChild(el);
  fpsOverlayEl = el;
}
function updateFpsOverlay(nowMs) {
  if (!dbg.showFps) {
    if (fpsOverlayEl) fpsOverlayEl.style.display = "none";
    return;
  }
  ensureFpsHUD();
  if (!fpsOverlayEl) return;
  fpsOverlayEl.style.display = "block";
  fpsFrameCount += 1;
  if (fpsLastAt <= 0) fpsLastAt = nowMs;
  const elapsed = nowMs - fpsLastAt;
  if (elapsed >= 450) {
    fpsValue = (fpsFrameCount * 1000) / elapsed;
    fpsFrameCount = 0;
    fpsLastAt = nowMs;
    fpsOverlayEl.textContent = `FPS ${fpsValue.toFixed(1)}`;
  }
}

function matListOf(mesh) {
  if (!mesh || !mesh.material) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function setMatMap(mat, tex) {
  if (!mat) return;
  if (!mat.userData) mat.userData = {};
  if (tex) mat.userData.debugMap = tex;
  const realMap = mat.userData.debugMap || null;
  mat.map = dbg.texturesOn ? realMap : null;
  syncMeshTextureMaterial(mat);
  mat.needsUpdate = true;
}

function syncMeshTextureMaterial(mat) {
  const policy = mat?.userData?.replayTexturePolicy;
  if (!policy || !THREE) return;
  const mapped = Boolean(mat.map);
  const mode = mapped ? policy.mode : "none";
  mat.color.set(mapped && mode !== "overlay" && mode !== "tint-mask" ? policy.tint : policy.baseColor);
  if (mapped && policy.vertexColor && !policy.surfaceColor) {
    const v = policy.vertexColor;
    mat.color.setRGB(toNum(v.x, 1), toNum(v.y, 1), toNum(v.z, 1));
  }
  mat.alphaTest = mapped ? policy.alphaTest : 0;
  mat.transparent = Boolean(policy.partTransparency > 0 || (mapped && mode === "blend"));
  mat.opacity = 1 - policy.partTransparency;
  mat.depthWrite = !mat.transparent;
  mat.side = policy.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
  mat.onBeforeCompile = (shader) => {
    if (mode !== "overlay" && mode !== "tint-mask") return;
    shader.uniforms.replayTextureTint = { value: new THREE.Color(policy.tint) };
    shader.fragmentShader =
      "uniform vec3 replayTextureTint;\n" +
      shader.fragmentShader.replace(
        "#include <map_fragment>",
        mapFragmentForMode(THREE.ShaderChunk.map_fragment, mode)
      );
  };
  mat.customProgramCacheKey = () => `replay-texture-${mode}`;
  mat.needsUpdate = true;
}

function applyTextureModeToMesh(mesh) {
  for (const mat of matListOf(mesh)) {
    if (!mat) continue;
    if (!mat.userData) mat.userData = {};
    if (mat.map && !mat.userData.debugMap) mat.userData.debugMap = mat.map;
    mat.map = dbg.texturesOn ? mat.userData.debugMap || null : null;
    syncMeshTextureMaterial(mat);
    mat.needsUpdate = true;
  }
  for (const overlay of mesh?.userData?.clothingOverlays || []) overlay.visible = Boolean(dbg.texturesOn && overlay.userData.validGeometry);
}

function applyWireframeModeToMesh(mesh) {
  for (const mat of matListOf(mesh)) {
    if (!mat) continue;
    mat.wireframe = Boolean(dbg.wireframeOn);
    mat.needsUpdate = true;
  }
}

function clearMeshSpheres() {
  if (!three || meshSpheres.length === 0) return;
  clearMeshes(meshSpheres);
}

function clearTexturePathLabels() {
  if (!three || texturePathLabels.length === 0) return;
  clearMeshes(texturePathLabels);
}

function clearFxPlaceholders() {
  if (!three || fxPlaceholders.length === 0) return;
  clearMeshes(fxPlaceholders);
}

function clearSceneLights() {
  if (!three || sceneLights.length === 0) return;
  for (const light of sceneLights) {
    if (!light) continue;
    if (light.target && light.target.parent) {
      light.target.parent.remove(light.target);
    }
    if (light.parent) {
      light.parent.remove(light);
    }
  }
  sceneLights = [];
}

function makeMeshMarker(mesh) {
  if (!THREE || !mesh) return null;
  const part = mesh.userData?.part || {};
  const sx = Math.max(0.2, toNum(part?.size?.x, 1));
  const sy = Math.max(0.2, toNum(part?.size?.y, 1));
  const sz = Math.max(0.2, toNum(part?.size?.z, 1));
  const bx = Math.max(0.35, sx);
  const by = Math.max(0.35, sy);
  const bz = Math.max(0.35, sz);
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(bx, by, bz),
    new THREE.MeshBasicMaterial({
      color: "#8b5cf6",
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false,
      side: THREE.FrontSide,
    })
  );
  marker.position.copy(mesh.position);
  marker.renderOrder = 40;
  marker.userData.sourceMesh = mesh;
  marker.userData.isBillboard = true;
  marker.frustumCulled = false;
  const label = makeTextSprite("Mesh");
  if (label) {
    label.scale.set(4.8, 1.4, 1);
    label.position.set(marker.position.x, marker.position.y, marker.position.z);
    label.userData.sourceMesh = mesh;
    label.userData.isBillboard = true;
    label.frustumCulled = false;
  }
  return { marker, label, sourceMesh: mesh };
}

function applyMeshSphereMode() {
  if (!three) return;
  clearMeshSpheres();
  for (const mesh of partMeshes) {
    const isMeshPart = String(mesh?.userData?.part?.className || "") === "MeshPart";
    mesh.userData.forceHide = Boolean(!dbg.meshBoxesOn && isMeshPart);
    if (mesh.userData.forceHide) {
      mesh.visible = false;
      if (mesh.userData?.studOverlay) mesh.userData.studOverlay.visible = false;
    } else {
      setCameraVisibility(mesh, true);
      if (mesh.userData?.studOverlay) mesh.userData.studOverlay.visible = true;
    }
  }
}

function applyPlayerLabelMode() {
  for (const label of characterLabels) {
    label.visible = Boolean(dbg.playerLabelsOn);
  }
}

function fxDotTexture(color = "rgba(255,170,80,1)") {
  if (!THREE) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, 128, 128);
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.25, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function findAnchorMeshByPath(path) {
  let current = String(path || "").trim();
  while (current) {
    const mesh = partByPath.get(current);
    if (mesh) return mesh;
    const idx = current.lastIndexOf("/");
    if (idx <= 0) break;
    current = current.slice(0, idx);
  }
  return null;
}

function vecFromProps(props, keys) {
  const raw = readAny(props || {}, keys);
  const v = toVec3(raw, null);
  if (!v) return null;
  return new THREE.Vector3(v.x, v.y, v.z);
}

function addFxLayerSprite(pos, scale, opacity, tintHex, texSrc, versionAtBuild) {
  if (!three || !THREE || !pos) return null;
  const fallback = fxDotTexture(String(tintHex || "#ffffff"));
  const mat = new THREE.SpriteMaterial({
    map: fallback,
    color: new THREE.Color("#ffffff"),
    transparent: true,
    opacity: Math.max(0.02, Math.min(1, toNum(opacity, 0.7))),
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.scale.set(Math.max(0.4, toNum(scale, 2)), Math.max(0.4, toNum(scale, 2)), 1);
  sprite.renderOrder = 24;
  sprite.frustumCulled = false;
  three.scene.add(sprite);
  fxPlaceholders.push(sprite);

  if (texSrc) {
    loadTexSrc(texSrc, (tex) => {
      if (!tex || !three || versionAtBuild !== renderVersion) return;
      if (!fxPlaceholders.includes(sprite)) return;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
      mat.map = tex;
      mat.needsUpdate = true;
    });
  }
  return sprite;
}

function addFxPlaceholders(snapshot) {
  if (!three) return;
  clearFxPlaceholders();
  const versionAtBuild = renderVersion;
  const roots = Array.isArray(snapshot?.explorer?.services) ? snapshot.explorer.services : [];
  if (roots.length === 0) return;

  const queue = [...roots];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) queue.push(child);

    const cls = String(node.className || "");
    if (!["Fire", "Smoke", "Sparkles", "ParticleEmitter", "Explosion"].includes(cls)) continue;
    const props = node.properties && typeof node.properties === "object" ? node.properties : {};
    const enabled = Boolean(readAny(props, ["Enabled"]) ?? true);
    if (!enabled && cls !== "Explosion") continue;

    const path = String(node.path || "");
    const anchor = findAnchorMeshByPath(path);
    let pos = anchor ? anchor.position.clone() : vecFromProps(props, ["Position"]);
    if (!pos) continue;

    const base = pos.clone();
    base.y += cls === "Explosion" ? 1.6 : 1.1;
    if (cls === "Fire") {
      const core = addFxLayerSprite(base, 3.35, 0.9, "#ff9b45", "rbxasset://textures/particles/fire_main.dds", versionAtBuild);
      if (core) core.userData.fxClass = cls;
      const sparks = addFxLayerSprite(
        base.clone().add(new THREE.Vector3(0, 0.55, 0)),
        2.6,
        0.72,
        "#ffd89a",
        "rbxasset://textures/particles/fire_sparks_main.dds",
        versionAtBuild
      );
      if (sparks) sparks.userData.fxClass = cls;
    } else if (cls === "Smoke") {
      const smoke = addFxLayerSprite(base, 4.2, 0.58, "#c4c8d1", "rbxasset://textures/particles/smoke_main.dds", versionAtBuild);
      if (smoke) smoke.userData.fxClass = cls;
    } else if (cls === "Sparkles") {
      const sparkle = addFxLayerSprite(base, 2.3, 0.9, "#fff4ae", "rbxasset://textures/particles/sparkles_main.dds", versionAtBuild);
      if (sparkle) sparkle.userData.fxClass = cls;
    } else if (cls === "ParticleEmitter") {
      const textureProp = String(readAny(props, ["Texture"]) || "").trim();
      const texSrc = textureProp || "rbxasset://textures/particles/sparkles_main.dds";
      const pe = addFxLayerSprite(base, 2.9, 0.75, "#a8e8ff", texSrc, versionAtBuild);
      if (pe) pe.userData.fxClass = cls;
    } else if (cls === "Explosion") {
      const a = addFxLayerSprite(base, 6.3, 0.68, "#ffd3a3", "rbxasset://textures/particles/explosion01_shockwave_main.dds", versionAtBuild);
      const b = addFxLayerSprite(base, 5.2, 0.72, "#ffb67f", "rbxasset://textures/particles/explosion01_implosion_main.dds", versionAtBuild);
      const c = addFxLayerSprite(base, 4.0, 0.85, "#ffcc8e", "rbxasset://textures/particles/explosion01_core_main.dds", versionAtBuild);
      const d = addFxLayerSprite(base, 6.8, 0.5, "#b7c0c8", "rbxasset://textures/particles/explosion01_smoke_main.dds", versionAtBuild);
      if (a) a.userData.fxClass = cls;
      if (b) b.userData.fxClass = cls;
      if (c) c.userData.fxClass = cls;
      if (d) d.userData.fxClass = cls;
    }

  }// long ass name for a function
  applyFxPlaceholderMode();
}

function applyFxPlaceholderMode() {
  for (const fx of fxPlaceholders) {
    fx.visible = Boolean(dbg.fxPlaceholdersOn);
  }
}

function applyControlsHelpMode() {
  if (cameraHelp) cameraHelp.style.display = "none";
}

function rstShMap(light) {
  const shadow = light?.shadow;
  if (!shadow) return;
  if (shadow.map) {
    shadow.map.dispose();
    shadow.map = null;
  }
  if (shadow.mapPass) {
    shadow.mapPass.dispose();
    shadow.mapPass = null;
  }
}

function apShdwMd() {
  if (!three?.renderer || !three?.dir) return;
  const renderer = three.renderer;
  renderer.shadowMap.enabled = Boolean(dbg.shadersOn && shdReady);
  if (!renderer.shadowMap.enabled) {
    renderer.shadowMap.type = THREE.BasicShadowMap;
    three.dir.castShadow = false;
    return;
  }
  three.dir.castShadow = three.dir.userData.globalShadows !== false;
  three.dir.shadow.camera.layers.enable(1);
  renderer.shadowMap.type = dbg.smoothShadows ? THREE.PCFShadowMap : THREE.BasicShadowMap;
  const mobile = viewport?.clientWidth < 700;
  const preferredSize = mobile
    ? (dbg.smoothShadows ? 1536 : 1024)
    : (dbg.smoothShadows ? 2048 : 1024);
  const targetShadowSize = Math.min(preferredSize, renderer.capabilities?.maxTextureSize || preferredSize);
  const currentSize = Number(three.dir.shadow?.mapSize?.width || 0);
  if (currentSize !== targetShadowSize) {
    three.dir.shadow.mapSize.width = targetShadowSize;
    three.dir.shadow.mapSize.height = targetShadowSize;
    rstShMap(three.dir);
  }
  if (dbg.smoothShadows) {
    three.dir.shadow.radius = 0.5 + Math.max(0,Math.min(1,toNum(latestSnapshot?.lighting?.shadowSoftness,0.5))) * 4;
  } else {
    three.dir.shadow.radius = 0;
  }
  three.dir.shadow.bias = -0.0002;
  three.dir.shadow.normalBias = 0.002;
  three.dir.shadow.needsUpdate = true;
  renderer.shadowMap.needsUpdate = true;
  for (const light of sceneLights) {
    if (!light || !("castShadow" in light)) continue;
    light.castShadow = Boolean(renderer.shadowMap.enabled && light.userData?.wantsShadow);
    if (light.shadow?.camera) light.shadow.camera.layers.enable(1);
    if (light.shadow) light.shadow.needsUpdate = true;
  }
}

function textureLabelText(mesh) {
  const part = mesh?.userData?.part || {};
  const explicit = String(part.textureId || "").trim();
  if (explicit) return explicit;
  const matPath = String(mesh?.userData?.matPath || "").trim();
  if (matPath) return matPath;
  const fromMat = localMaterialPath(part.material);
  if (fromMat) return fromMat;
  return "";
}

function applyTexturePathLabelMode() {
  if (!three) return;
  clearTexturePathLabels();
  if (!dbg.texturePathLabelsOn) return;
  for (const mesh of partMeshes) {
    const text = textureLabelText(mesh);
    if (!text) continue;
    const label = makeTextSprite(text);
    if (!label) continue;
    const part = mesh?.userData?.part || {};
    const sy = Math.max(0.2, toNum(part?.size?.y, 1));
    label.scale.set(7.8, 1.1, 1);
    label.position.set(mesh.position.x, mesh.position.y + sy * 0.6 + 0.9, mesh.position.z);
    label.userData.sourceMesh = mesh;
    label.userData.isBillboard = true;
    label.frustumCulled = false;
    three.scene.add(label);
    texturePathLabels.push(label);
  }
}

function refShdPl() {
  if (!three?.scene || !three?.renderer) return;
  three.scene.traverse((obj) => {
    const mat = obj?.material;
    if (!mat) return;
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const m of mats) {
      if (m && "needsUpdate" in m) m.needsUpdate = true;
    }
  });
  if (three.renderer.shadowMap) three.renderer.shadowMap.needsUpdate = true;
  if (three.dir?.shadow) three.dir.shadow.needsUpdate = true;
}

function apShMode() {
  if (!three?.renderer) return;
  if (!shdReady) {
    three.renderer.toneMapping = THREE.NoToneMapping;
    three.renderer.toneMappingExposure = 1;
    three.renderer.shadowMap.enabled = false;
    if (three.dir) three.dir.castShadow = false;
    return;
  }
  if (dbg.shadersOn) {
    three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if (latestSnapshot) syncLight(latestSnapshot);
  } else {
    three.renderer.toneMapping = THREE.NoToneMapping;
    three.renderer.toneMappingExposure = 1;
  }
  apShdwMd();
  refShdPl();
}

function applyDebugModes() {
  applyControlsHelpMode();
  apShMode();
  applyPlayerLabelMode();
  applyMeshSphereMode();
  applyTexturePathLabelMode();
  applyFxPlaceholderMode();
  for (const mesh of partMeshes) {
    applyTextureModeToMesh(mesh);
    applyWireframeModeToMesh(mesh);
  }
  if (three?.camera) {
    three.camera.fov = Math.max(35, Math.min(110, toNum(camCfg.fov, 55)));
    three.camera.updateProjectionMatrix();
  }
}

function copyText(text) {
  const value = String(text || "");
  if (!value) return Promise.resolve(false);
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value).then(
      () => true,
      () => false
    );
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return Promise.resolve(Boolean(ok));
  } catch {
    return Promise.resolve(false);
  }
}

function addClientLog(level, message, details = null) {
  clientLogs.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  });
  if (clientLogs.length > MAX_CLIENT_LOGS) {
    clientLogs.splice(0, clientLogs.length - MAX_CLIENT_LOGS);
  }
}

function wireClientLoggers() {
  ["log", "info", "warn", "error"].forEach((level) => {
    console[level] = (...args) => {
      const rendered = args
        .map((arg) => {
          if (typeof arg === "string") return arg;
          try {
            return safeSerialize(arg);
          } catch {
            return String(arg);
          }
        })
        .join(" ");
      addClientLog(level, rendered, args);
      originalConsole[level](...args);
    };
  });

  window.addEventListener("error", (event) => {
    addClientLog("error", "window.error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
        ? {
            name: event.error.name,
            message: event.error.message,
            stack: event.error.stack,
          }
        : null,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    addClientLog("error", "window.unhandledrejection", { reason: event.reason });
  });
}

function normMat(rawMaterial) {
  const raw = String(rawMaterial || "");
  return raw
    .replace("Enum.Material.", "")
    .replace("Enum.MaterialVariant.", "")
    .replace(/\s+/g, "")
    .trim();
}

function normKey(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function materialProfile(rawMaterial) {
  const name = normMat(rawMaterial);
  const key = normKey(name);
  for (const [k, v] of Object.entries(materialProfileByName)) {
    if (normKey(k) === key) return v;
  }
  return { roughness: 0.6, metalness: 0.08, texture: null, tile: 1.0 };
}

function localMaterialPath(rawMaterial) {
  const name = normMat(rawMaterial);
  if (!name || ["plastic", "smoothplastic", "neon"].includes(name.toLowerCase())) return null;
  return materialMapUrl(name, "color");
}

function materialMapUrl(rawMaterial, mapType) {
  const material = normMat(rawMaterial);
  if (!material) return null;
  return `/api/material/map?material=${encodeURIComponent(material)}&type=${encodeURIComponent(mapType)}`;
}

function loadTextureAsync(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    loadTexSrc(src, (tex) => resolve(tex));
  });
}

function loadMatMaps(rawMaterial) {
  const key = normMat(rawMaterial);
  if (!key) return null;
  if (materialPbrMapCache.has(key)) return materialPbrMapCache.get(key);

  const promise = Promise.all([
    loadTextureAsync(materialMapUrl(rawMaterial, "color")),
    loadTextureAsync(materialMapUrl(rawMaterial, "normal")),
    loadTextureAsync(materialMapUrl(rawMaterial, "roughness")),
    loadTextureAsync(materialMapUrl(rawMaterial, "metalness")),
  ]).then(([colorMap, normalMap, roughnessMap, metalnessMap]) => ({
    colorMap,
    normalMap,
    roughnessMap,
    metalnessMap,
  }));
  materialPbrMapCache.set(key, promise);
  return promise;
}

function loadLegacyMatTex(rawMaterial) {
  if (!USE_LEGACY_MAT_TEX) return null;
  const name = normMat(rawMaterial);
  const profile = materialProfile(rawMaterial);
  if (!profile.texture || !name) return null;
  if (materialTextureCache.has(name)) {
    return materialTextureCache.get(name);
  }

  const promise = new Promise((resolve) => {
    if (!three) {
      resolve(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(
      textureProxy(profile.texture),
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
  materialTextureCache.set(name, promise);
  return promise;
}

function hasStudsSurface(part) {
  if (!part) return false;
  const values = [
    part.topSurface,
    part.bottomSurface,
    part.leftSurface,
    part.rightSurface,
    part.frontSurface,
    part.backSurface,
  ];
  return values.some((v) => String(v || "").toLowerCase().includes("studs"));
}

function isStudFace(v) {
  const s = String(v || "").toLowerCase();
  return s.includes("studs") || s.includes("inlet");
}

function isPlasticMat(rawMaterial) {
  const n = normKey(normMat(rawMaterial));
  return n === "plastic" || n === "smoothplastic";
}

function clearStudOverlay(mesh) {
  const overlay = mesh?.userData?.studOverlay;
  if (!overlay || !three?.scene) return;
  three.scene.remove(overlay);
  if (overlay.geometry) overlay.geometry.dispose();
  const mats = Array.isArray(overlay.material) ? overlay.material : [overlay.material];
  for (const mat of mats) {
    if (!mat) continue;
    if (mat.map) mat.map.dispose();
    mat.dispose();
  }
  mesh.userData.studOverlay = null;
}

function clearChunkMeshes(mesh) {
  const chunks = Array.isArray(mesh?.userData?.chunkMeshes) ? mesh.userData.chunkMeshes : [];
  if (!three || chunks.length === 0) return;
  for (const c of chunks) {
    three.scene.remove(c);
    if (c.geometry) c.geometry.dispose();
  }
  mesh.userData.chunkMeshes = null;
  mesh.userData.useChunks = false;
}

function loadTexSrc(src, onDone) {
  const isValidTex = (tex) => {
    if (!tex) return false;
    if (tex.isCompressedTexture) {
      if (Array.isArray(tex.mipmaps) && tex.mipmaps.length > 0) {
        const m0 = tex.mipmaps[0];
        if (m0 && Number(m0.width) > 0 && Number(m0.height) > 0) return true;
      }
      const image = tex.image;
      if (Array.isArray(image) && image.length > 0) {
        const first = image[0];
        if (first && Number(first.width) > 0 && Number(first.height) > 0) return true;
      }
      return false;
    }
    const image = tex.image;
    if (!image) return false;
    return Number(image.width) > 0 && Number(image.height) > 0;
  };

  const raw = String(src || "").trim();
  const low = raw.toLowerCase();
  if (!raw || !THREE) { onDone(null); return; }
  const url = textureFetchUrl(raw);
  assetLoads.load('texture:' + raw, 'texture', (attempt) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Texture request timed out')), 25000);
    const done = tex => { clearTimeout(timer); if (isValidTex(tex)) resolve(tex); else reject(new Error('Invalid texture')); };
    const fail = () => { clearTimeout(timer); reject(new Error('Texture unavailable')); };
    const loader = (low.endsWith('.dds') || raw.includes('.dds')) && ddsLoader ? ddsLoader : new THREE.TextureLoader();
    const retryUrl = attempt > 1 && url.startsWith('/api/') ? url + '&retry=' + attempt : url;
    loader.load(retryUrl, done, undefined, fail);
  }), {onValue: onDone, optional:raw.startsWith('/api/material/')});

}

function loadImgNoBlack(src, threshold = 26) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 512;
        canvas.height = img.naturalHeight || img.height || 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = id.data;
        const low = Math.max(0, threshold);
        const high = Math.max(low + 34, threshold + 56);
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const maxCh = Math.max(r, g, b);
          const sum = r + g + b;
          if (maxCh <= low || sum <= low * 3) {
            data[i + 3] = 0;
          } else if (sum < high * 3) {
            const t = (sum - low * 3) / ((high - low) * 3);
            data[i + 3] = Math.max(0, Math.min(255, Math.floor(data[i + 3] * t)));
          }
        }
        ctx.putImageData(id, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        resolve(tex);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = textureProxy(src);
  });
}

async function initSky() {
  if (!three || skyVisuals) return;

  const group = new THREE.Group();
  three.scene.add(group);

  const makeSprite = (texture, size = 1, opacity = 1) => {
    const mat = new THREE.SpriteMaterial({
      map: texture || null,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      alphaTest: 0.001,
    });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(size, size, 1);
    sp.renderOrder = 5;
    sp.visible = Boolean(texture);
    group.add(sp);
    return sp;
  };

  const [sunTex, moonTex] = await Promise.all([
    loadImgNoBlack("rbxasset://sky/sun.jpg", 78),
    loadImgNoBlack("rbxasset://sky/moon.jpg", 40),
  ]);
  const cloudTex =
    (await loadTextureAsync("rbxasset://sky/cloudsfb.dds")) ||
    (await loadTextureAsync("rbxasset://sky/clouds.dds"));

  const sun = makeSprite(sunTex, 85, 0.95);
  sun.material.blending = THREE.AdditiveBlending;
  sun.frustumCulled = false;
  const moon = makeSprite(moonTex, 72, 0.92);
  moon.material.blending = THREE.AdditiveBlending;
  moon.frustumCulled = false;
  sun.visible = false;
  moon.visible = false;

  const clouds = [];
  if (cloudTex) {
    cloudTex.wrapS = THREE.RepeatWrapping;
    cloudTex.wrapT = THREE.RepeatWrapping;
    if ("colorSpace" in cloudTex) cloudTex.colorSpace = THREE.SRGBColorSpace;
    cloudTex.needsUpdate = true;
    for (let i = 0; i < 2; i += 1) {
      const sp = makeSprite(cloudTex, 1150, 0.24);
      sp.material.blending = THREE.AdditiveBlending;
      sp.material.alphaTest = 0.02;
      sp.frustumCulled = false;
      sp.visible = true;
      sp.userData.cloudOffset = i * Math.PI;
      clouds.push(sp);
    }
  }

  skyVisuals = { group, sun, moon, clouds };
}

function texReady(tex) {
  if (!tex) return false;
  const img = tex.image;
  if (!img) return false;
  const w = Number(img.width || 0);
  const h = Number(img.height || 0);
  return w > 0 && h > 0;
}

function syncSky(sunVector, dayMix, nightMix, clockTime) {
  if (!three || !skyVisuals) return;
  const showCelestial = skyState?.skySettings?.celestialBodiesShown !== false;
  const radius = 520;
  const starCount = Math.max(0,Math.min(5000,Math.floor(toNum(skyState?.skySettings?.starCount,0))));
  if (starSignature !== starCount) {
    starSignature = starCount;
    if (skyVisuals.stars) { skyVisuals.group.remove(skyVisuals.stars); skyVisuals.stars.geometry.dispose(); skyVisuals.stars.material.dispose(); }
    const positions = new Float32Array(starCount * 3);
    let seed = 13;
    const random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for(let i=0;i<starCount;i++) { const y=random()*2-1, a=random()*Math.PI*2, r=Math.sqrt(1-y*y); positions.set([r*Math.cos(a)*radius,y*radius,r*Math.sin(a)*radius],i*3); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    skyVisuals.stars = new THREE.Points(geometry,new THREE.PointsMaterial({color:'#ffffff',size:1,sizeAttenuation:false,transparent:true,depthWrite:false}));
    skyVisuals.group.add(skyVisuals.stars);
  }
  if (skyVisuals.stars) { skyVisuals.stars.visible = showCelestial && nightMix > 0.15; skyVisuals.stars.material.opacity = nightMix; }
  const base = three.controls?.target ? three.controls.target.clone() : new THREE.Vector3();
  skyVisuals.group.position.copy(base);
  const sunPos = sunVector.clone().multiplyScalar(radius);
  const moonPos = sunVector.clone().multiplyScalar(-radius);

  if (skyVisuals.sun) {
    skyVisuals.sun.position.copy(sunPos);
    skyVisuals.sun.scale.setScalar(2 * radius * Math.tan(THREE.MathUtils.degToRad(toNum(skyState?.skySettings?.sunAngularSize,21)) / 2));
    const hasSunMap = texReady(skyVisuals.sun?.material?.map);
    skyVisuals.sun.visible = hasSunMap && showCelestial;
    if (hasSunMap) skyVisuals.sun.material.opacity = 0.2 + dayMix * 0.8;
  }
  if (skyVisuals.moon) {
    skyVisuals.moon.position.copy(moonPos);
    skyVisuals.moon.scale.setScalar(2 * radius * Math.tan(THREE.MathUtils.degToRad(toNum(skyState?.skySettings?.moonAngularSize,11)) / 2));
    const hasMoonMap = texReady(skyVisuals.moon?.material?.map);
    skyVisuals.moon.visible = hasMoonMap && showCelestial && nightMix > 0.08 && moonPos.y > 6;
    if (hasMoonMap) skyVisuals.moon.material.opacity = 0.35 + nightMix * 0.65;
  }

  if (Array.isArray(skyVisuals.clouds)) {
    const t = (toNum(clockTime, 12) / 24) * Math.PI * 2;
    for (const cloud of skyVisuals.clouds) {
      if (!cloud) continue;
      const off = toNum(cloud.userData?.cloudOffset, 0);
      const a = t * 0.2 + off;
      cloud.position.set(Math.cos(a) * 220, 110 + Math.sin(a * 0.7) * 22, Math.sin(a) * 220);
      const recorded = skyState?.clouds;
      cloud.material.opacity = recorded ? Math.max(0,Math.min(1,toNum(recorded.density,0.5) * toNum(recorded.cover,0.5))) : 0.08 + dayMix * 0.2;
      cloud.material.color.set(recorded?.color || '#ffffff');
      cloud.visible = dayMix > 0.05 && recorded?.enabled !== false && (recorded ? toNum(recorded.cover,0) > 0 : !recordedSkyCube);
    }
  }
}

function readFaceNormal(faceRaw) {
  const face = String(faceRaw || "")
    .replace("Enum.NormalId.", "")
    .trim()
    .toLowerCase();
  if (face === "right") return new THREE.Vector3(1, 0, 0);
  if (face === "left") return new THREE.Vector3(-1, 0, 0);
  if (face === "top") return new THREE.Vector3(0, 1, 0);
  if (face === "bottom") return new THREE.Vector3(0, -1, 0);
  if (face === "back") return new THREE.Vector3(0, 0, 1);
  return new THREE.Vector3(0, 0, -1);
}

function partHalfAlongFace(part, faceRaw) {
  const face = String(faceRaw || "")
    .replace("Enum.NormalId.", "")
    .trim()
    .toLowerCase();
  const sx = Math.max(0.2, toNum(part?.size?.x, 1));
  const sy = Math.max(0.2, toNum(part?.size?.y, 1));
  const sz = Math.max(0.2, toNum(part?.size?.z, 1));
  if (face === "right" || face === "left") return sx * 0.5;
  if (face === "top" || face === "bottom") return sy * 0.5;
  return sz * 0.5;
}

function collectLightNodes(snapshot) {
  const roots = Array.isArray(snapshot?.explorer?.services) ? snapshot.explorer.services : [];
  const queue = [...roots];
  const out = [];
  for (const mesh of partMeshes) {
    const part = mesh.userData?.part;
    for (const [index,light] of (part?.lights || []).entries()) {
      out.push({className:light.className, anchorPath:part.path, path:part.path + '/light-' + index,
        properties:{Enabled:light.enabled, Color:light.color, Brightness:light.brightness, Range:light.range, Shadows:light.shadows, Angle:light.angle, Face:light.face}, attachment:light.position, attachmentOrientation:light.orientation});
    }
  }
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    const cls = String(node.className || "");
    if (cls === "PointLight" || cls === "SpotLight" || cls === "SurfaceLight") out.push(node);
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) queue.push(child);
  }
  return out;
}

function addLights(snapshot) {
  if (!three || !THREE) return;
  clearSceneLights();
  const nodes = collectLightNodes(snapshot);
  if (nodes.length === 0) return;

  const maxLights = 160;
  let shadowBudget = 4;
  for (const node of nodes) {
    if (sceneLights.length >= maxLights) break;
    const props = node.properties && typeof node.properties === "object" ? node.properties : {};
    const enabled = Boolean(readAny(props, ["Enabled"]) ?? true);
    if (!enabled) continue;
    const path = String(node.path || "");
    const anchorPath = node.anchorPath || (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");
    const anchor = findAnchorMeshByPath(anchorPath);
    if (!anchor) continue;
    const part = anchor.userData?.part || {};

    const colorHex = hexColor(readAny(props, ["Color"]) || "#ffffff", "#ffffff");
    const brightness = Math.max(0, toNum(readAny(props, ["Brightness"]), 1));
    const range = Math.max(1, toNum(readAny(props, ["Range"]), 18));
    const faceRaw = readAny(props, ["Face"]) || "Enum.NormalId.Front";
    const wantsShadow = Boolean(readAny(props, ["Shadows"]) ?? false);
    const faceVec = readFaceNormal(faceRaw);
    if (node.attachmentOrientation) { const r = node.attachmentOrientation; faceVec.applyEuler(new THREE.Euler(THREE.MathUtils.degToRad(toNum(r.x,0)),THREE.MathUtils.degToRad(toNum(r.y,0)),THREE.MathUtils.degToRad(toNum(r.z,0)),"YXZ")); }
    const pos = node.attachment || {};
    const anchorPos = new THREE.Vector3(toNum(pos.x,0),toNum(pos.y,0),toNum(pos.z,0));
    const facePos = anchorPos.clone().addScaledVector(faceVec,node.attachment ? 0 : partHalfAlongFace(part,faceRaw) + 0.06);

    let light = null;
    const cls = String(node.className || "");
    if (cls === "PointLight") {
      light = new THREE.PointLight(colorHex, brightness * 2.1, range, 2);
      light.position.copy(anchorPos);
    } else {
      const angleDeg = Math.max(6, Math.min(150, toNum(readAny(props, ["Angle"]), 90)));
      light = new THREE.SpotLight(colorHex, brightness * (cls === "SurfaceLight" ? 2.2 : 2.0), range, THREE.MathUtils.degToRad(angleDeg * 0.5), 0.35, 1.65);
      light.position.copy(facePos);
      light.target.position.copy(facePos.clone().add(faceVec.clone().multiplyScalar(Math.max(4, range))));
      anchor.add(light.target);
    }
    if (!light) continue;
    light.userData.wantsShadow = wantsShadow && shadowBudget > 0;
    light.castShadow = Boolean(dbg.shadersOn && light.userData.wantsShadow);
    if (light.castShadow) shadowBudget -= 1;
    if (light.shadow) {
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.bias = -0.00015;
      light.shadow.normalBias = 0.002;
    }
    anchor.add(light);
    sceneLights.push(light);
  }
}

function getStudTex() {
  if (!THREE) return null;
  if (studsPatternTexture) return studsPatternTexture;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#9c8c6f";
  ctx.fillRect(0, 0, size, size);

  const cols = 3;
  const rows = 3;
  const stepX = size / cols;
  const stepY = size / rows;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const cx = x * stepX + stepX * 0.5;
      const cy = y * stepY + stepY * 0.5;
      const r = Math.min(stepX, stepY) * 0.22;

      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.3, cx, cy, r * 1.15);
      g.addColorStop(0, "#d2c2a3");
      g.addColorStop(1, "#5f543f");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(40,32,22,0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  studsPatternTexture = tex;
  return studsPatternTexture;
}

function makeStudsFaceMats(mesh, part, srcTex) {
  if (!THREE || !mesh || !part || !srcTex) return null;
  const sx = Math.max(0.2, toNum(part?.size?.x, 1));
  const sy = Math.max(0.2, toNum(part?.size?.y, 1));
  const sz = Math.max(0.2, toNum(part?.size?.z, 1));
  const tileUnit = 4;

  const faceFlags = [
    isStudFace(part.rightSurface),
    isStudFace(part.leftSurface),
    isStudFace(part.topSurface),
    isStudFace(part.bottomSurface),
    isStudFace(part.frontSurface),
    isStudFace(part.backSurface),
  ];
  const hasAnyStud = faceFlags.some(Boolean);
  if (!hasAnyStud) return null;

  const mk = (u, v, enabled) => {
    if (!enabled) {
      return new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
    }
    const t = srcTex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(Math.max(1, u / tileUnit), Math.max(1, v / tileUnit));
    t.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.34,
      roughness: 0.72,
      metalness: 0.02,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: "#ffffff",
      map: t,
    });
  };

  return [
    mk(sz, sy, faceFlags[0]),
    mk(sz, sy, faceFlags[1]),
    mk(sx, sz, faceFlags[2]),
    mk(sx, sz, faceFlags[3]),
    mk(sx, sy, faceFlags[4]),
    mk(sx, sy, faceFlags[5]),
  ];
}

function boxFaceRepeats(part, tileUnit = 4) {
  const sx = Math.max(0.2, toNum(part?.size?.x, 1));
  const sy = Math.max(0.2, toNum(part?.size?.y, 1));
  const sz = Math.max(0.2, toNum(part?.size?.z, 1));
  return [
    [Math.max(1, sz / tileUnit), Math.max(1, sy / tileUnit)],
    [Math.max(1, sz / tileUnit), Math.max(1, sy / tileUnit)],
    [Math.max(1, sx / tileUnit), Math.max(1, sz / tileUnit)],
    [Math.max(1, sx / tileUnit), Math.max(1, sz / tileUnit)],
    [Math.max(1, sx / tileUnit), Math.max(1, sy / tileUnit)],
    [Math.max(1, sx / tileUnit), Math.max(1, sy / tileUnit)],
  ];
}

function ensureBoxMaterials(mesh, part, profile) {
  if (!mesh || !THREE) return null;
  if (!usesBoxFaceMaterials(part, mesh.geometry?.type)) return null;

  if (Array.isArray(mesh.material) && mesh.material.length === 6) {
    return mesh.material;
  }

  const prev = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const baseColor = prev?.color ? prev.color.clone() : new THREE.Color(hexColor(part?.color3 || "#d1d5db"));
  const baseOpacity = typeof prev?.opacity === "number" ? prev.opacity : 1;
  const baseTransparent = Boolean(prev?.transparent) || baseOpacity < 1;
  const mats = [];
  for (let i = 0; i < 6; i += 1) {
    mats.push(
      new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        transparent: baseTransparent,
        opacity: baseOpacity,
        roughness: profile?.roughness ?? 0.6,
        metalness: profile?.metalness ?? 0.08,
        side: THREE.FrontSide,
      })
    );
  }
  mesh.material = mats;
  return mats;
}

function applyTexPerFace(mesh, part, tex, slot = "map", tileUnit = 4) {
  if (!mesh || !part || !tex) return false;
  const profile = materialProfile(part?.material);
  const mats = ensureBoxMaterials(mesh, part, profile);
  if (!mats || mats.length !== 6) return false;
  const repeats = boxFaceRepeats(part, tileUnit);
  for (let i = 0; i < 6; i += 1) {
    const t = tex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if ("colorSpace" in t && slot === "map") t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(repeats[i][0], repeats[i][1]);
    t.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
    t.needsUpdate = true;
    mats[i][slot] = t;
    if (slot === "map") {
      mats[i].userData.replayTexturePolicy = meshTexturePolicy(part);
      setMatMap(mats[i], t);
    }
    mats[i].needsUpdate = true;
  }
  return true;
}

function clearClothingOverlays(mesh) {
  const overlays = mesh?.userData?.clothingOverlays || [];
  for (const overlay of overlays) {
    mesh.remove(overlay);
    if (overlay.userData.ownsGeometry) overlay.geometry.dispose();
    overlay.material.dispose();
  }
  if (mesh?.userData) mesh.userData.clothingOverlays = [];
}

function clothingTexture(source) {
  if (!clothingTextureCache.has(source)) {
    clothingTextureCache.set(source, loadTextureAsync(source).then((texture) => {
      if (!texture) {
        clothingTextureCache.delete(source);
        return null;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
      return texture;
    }));
  }
  return clothingTextureCache.get(source);
}

function applyClothingOverlays(mesh, part, currentAppearance) {
  const layers = classicClothingLayers(part);
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    if (layer.kind === "graphic" && (part.meshId || part.className === "MeshPart")) continue;
    clothingTexture(layer.source).then((texture) => {
      if (!texture || !currentAppearance()) return;
      const clothingGeometry = part.meshId
        ? projectClassicClothingMeshUvs(mesh.geometry, part.name)
        : mapClassicClothingBoxUvs(mesh.geometry, part.name, layer.kind);
      if (!clothingGeometry) return;
      const material = new THREE.MeshStandardMaterial({
        color: hexColor(layer.tint, "#ffffff"),
        map: texture,
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        opacity: 1 - Math.max(0, Math.min(0.95, toNum(part.transparency, 0))),
        alphaTest: 0.02,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: part.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      });
      const overlay = new THREE.Mesh(clothingGeometry, material);
      overlay.visible = Boolean(dbg.texturesOn);
      overlay.frustumCulled = false;
      overlay.castShadow = false;
      overlay.receiveShadow = mesh.receiveShadow;
      overlay.renderOrder = (mesh.renderOrder || 0) + index + 1;
      overlay.userData.sourceMesh = mesh;
      overlay.userData.ownsGeometry = true;
      overlay.userData.validGeometry = true;
      mesh.add(overlay);
      mesh.userData.clothingOverlays.push(overlay);
    });
  }
}

function applyMatTex(mesh, part, version) {
  if (!mesh || !mesh.material || !three) return;
  const appearanceStamp = (mesh.userData.appearanceStamp || 0) + 1;
  mesh.userData.appearanceStamp = appearanceStamp;
  const currentAppearance = () =>
    version === renderVersion && mesh.userData.appearanceStamp === appearanceStamp && Boolean(mesh.material);
  clearClothingOverlays(mesh);
  applyClothingOverlays(mesh, part, currentAppearance);
  const localMatPath = localMaterialPath(part?.material);
  mesh.userData.matPath = localMatPath || "Solid material color";
  const baseMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const profile = materialProfile(part?.material);
  const texturePolicy = meshTexturePolicy(part);
  if (baseMat) {
    baseMat.roughness = part?.surfaceAppearance?.roughnessMap ? 1 : profile.roughness;
    baseMat.metalness = profile.metalness;
    const previous = baseMat.userData?.replayTexturePolicy;
    if (previous && previous.source !== texturePolicy?.source) {
      baseMat.userData.debugMap = null;
      baseMat.map = null;
    }
    baseMat.userData.replayTexturePolicy = texturePolicy;
    baseMat.color.set(hexColor(part?.color3 || "#d1d5db"));
    if (baseMat.emissive) {
      const neon = normMat(part?.material).toLowerCase() === "neon";
      baseMat.emissive.set(neon ? hexColor(part?.color3 || "#ffffff") : "#000000");
      baseMat.emissiveIntensity = neon ? 1 : 0;
      baseMat.userData.baseEmissive = baseMat.emissive.clone();
      baseMat.userData.baseEmissiveIntensity = baseMat.emissiveIntensity;
    }
    baseMat.side = part?.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
    if (texturePolicy) syncMeshTextureMaterial(baseMat);
    else {
      baseMat.alphaTest = 0;
      baseMat.transparent = toNum(part?.transparency, 0) > 0;
      baseMat.opacity = 1 - Math.max(0, Math.min(0.95, toNum(part?.transparency, 0)));
      baseMat.depthWrite = !baseMat.transparent;
      baseMat.onBeforeCompile = () => {};
      baseMat.customProgramCacheKey = () => "";
      baseMat.needsUpdate = true;
    }
  }
  for (const [sourceKey, materialKey] of [["normalMap", "normalMap"], ["roughnessMap", "roughnessMap"], ["metalnessMap", "metalnessMap"]]) {
    const src = part.surfaceAppearance?.[sourceKey];
    if (!src) continue;
    loadTexSrc(src, (shared) => {
      if (!shared || !currentAppearance()) return;
      const tex = shared.clone();
      tex.colorSpace = THREE.NoColorSpace;
      tex.needsUpdate = true;
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        mat[materialKey] = tex;
        if (materialKey === "metalnessMap") mat.metalness = 1;
        mat.needsUpdate = true;
      }
    });
  }
  const explicitTextureId = texturePolicy?.source || "";
  if (explicitTextureId) {
    loadTexSrc(explicitTextureId, (tex) => {
      if (!currentAppearance()) return;
      if (!tex) {
        const cls = String(part?.className || "");
        if (cls === "MeshPart") {
          loadTexSrc("rbxasset://textures/meshPartFallback.png", (fallbackTex) => {
            if (!fallbackTex || !currentAppearance()) return;
            fallbackTex.wrapS = THREE.RepeatWrapping;
            fallbackTex.wrapT = THREE.RepeatWrapping;
            if ("colorSpace" in fallbackTex) fallbackTex.colorSpace = THREE.SRGBColorSpace;
            fallbackTex.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
            fallbackTex.needsUpdate = true;
            if (applyTexPerFace(mesh, part, fallbackTex, "map", 4)) {
              applyWireframeModeToMesh(mesh);
              return;
            }
            if (Array.isArray(mesh.material)) {
              for (const mat of mesh.material) setMatMap(mat, fallbackTex.clone());
            } else {
              setMatMap(mesh.material, fallbackTex);
            }
            mesh.userData.matPath = "Roblox asset fallback";
            applyWireframeModeToMesh(mesh);
          });
        }
        return;
      }
      tex.wrapS = part?.meshId ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      tex.wrapT = part?.meshId ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      if ("colorSpace" in tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
      }
      tex.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
      if (applyTexPerFace(mesh, part, tex, "map", 4)) {
        applyWireframeModeToMesh(mesh);
        return;
      }
      if (Array.isArray(mesh.material)) {
        for (const mat of mesh.material) setMatMap(mat, tex.clone());
      } else {
        setMatMap(mesh.material, tex);
      }
      applyWireframeModeToMesh(mesh);
    });
    return;
  }
  if (hasStudsSurface(part) && isPlasticMat(part?.material)) {
    loadTexSrc("rbxasset://textures/studs.dds", (sourceTex) => {
      if (!currentAppearance() || !sourceTex) return;
      const isBox = String(part?.shape || "").replace("Enum.PartType.", "").toLowerCase() === "block";
      if (isBox) {
        const mats = makeStudsFaceMats(mesh, part, sourceTex);
        if (mats && mats.length === 6) {
          clearStudOverlay(mesh);
          const overlayGeo = mesh.geometry.clone();
          const overlay = new THREE.Mesh(overlayGeo, mats);
          overlay.position.copy(mesh.position);
          overlay.rotation.copy(mesh.rotation);
          overlay.quaternion.copy(mesh.quaternion);
          overlay.scale.copy(mesh.scale).multiplyScalar(1.002);
          overlay.renderOrder = (mesh.renderOrder || 0) + 1;
          overlay.castShadow = false;
          overlay.receiveShadow = false;
          overlay.userData.isStudOverlay = true;
          three.scene.add(overlay);
          mesh.userData.studOverlay = overlay;
          return;
        }
      }
      const tex = sourceTex.clone();
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const sx = Math.max(0.2, toNum(part?.size?.x, 1));
      const sz = Math.max(0.2, toNum(part?.size?.z, 1));
      const tileUnit = 4;
      tex.repeat.set(Math.max(1, sx / tileUnit), Math.max(1, sz / tileUnit));
      tex.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
      tex.needsUpdate = true;
      if (!Array.isArray(mesh.material)) {
        setMatMap(mesh.material, tex);
      }
      applyWireframeModeToMesh(mesh);
    });
    return;
  }
  const texPromise = localMatPath ? loadLegacyMatTex(part?.material) : null;
  const pbrPromise = localMatPath ? loadMatMaps(part?.material) : null;
  let gotColorMap = false;
  let doneFallback = false;
  const applyFallback = () => {
    if (doneFallback || !currentAppearance()) return;
    doneFallback = true;
    mesh.userData.matPath = "Solid material color";
  };
  if (pbrPromise) {
    pbrPromise.then((maps) => {
      if (!maps || !currentAppearance()) return;
      const mat = mesh.material;
      const setup = (tex, tileX = 1, tileY = 1) => {
        if (!tex) return null;
        const t = tex.clone();
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(tileX, tileY);
        t.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
        t.needsUpdate = true;
        return t;
      };
      const sx = Math.max(0.2, toNum(part?.size?.x, 1));
      const sy = Math.max(0.2, toNum(part?.size?.y, 1));
      const sz = Math.max(0.2, toNum(part?.size?.z, 1));
      const tileUnit = 4;
      const tileX = Math.max(1, ((sx + sz) * 0.5) / tileUnit);
      const tileY = Math.max(1, sy / tileUnit);
      const colorTex = setup(maps.colorMap, tileX, tileY);
      const normalTex = setup(maps.normalMap, tileX, tileY);
      const roughTex = setup(maps.roughnessMap, tileX, tileY);
      const metalTex = setup(maps.metalnessMap, tileX, tileY);
      if (colorTex) {
        if ("colorSpace" in colorTex) colorTex.colorSpace = THREE.SRGBColorSpace;
        if (!applyTexPerFace(mesh, part, colorTex, "map", tileUnit)) {
          setMatMap(mat, colorTex);
        }
        gotColorMap = true;
      }
      if (normalTex) {
        if (!applyTexPerFace(mesh, part, normalTex, "normalMap", tileUnit)) mat.normalMap = normalTex;
      }
      if (roughTex) {
        if (!applyTexPerFace(mesh, part, roughTex, "roughnessMap", tileUnit)) mat.roughnessMap = roughTex;
      }
      if (metalTex) {
        if (!applyTexPerFace(mesh, part, metalTex, "metalnessMap", tileUnit)) mat.metalnessMap = metalTex;
      }
      mat.needsUpdate = true;
      if (!gotColorMap && !texPromise) applyFallback();
    });
  }

  if (!texPromise) {
    if (!pbrPromise) applyFallback();
    return;
  }

  texPromise.then((sharedTex) => {
    if (!sharedTex || !currentAppearance()) {
      if (!gotColorMap) applyFallback();
      return;
    }
    const tex = sharedTex.clone();
    const sx = Math.max(0.2, toNum(part?.size?.x, 1));
    const sy = Math.max(0.2, toNum(part?.size?.y, 1));
    const sz = Math.max(0.2, toNum(part?.size?.z, 1));
    const tile = Math.max(0.2, profile.tile || 1);
    const tileUnit = 4 / tile;
    tex.repeat.set(
      Math.max(1, Math.round(((sx + sz) * 0.5) / tileUnit)),
      Math.max(1, Math.round(sy / tileUnit))
    );
    tex.needsUpdate = true;
    if (!Array.isArray(mesh.material)) setMatMap(mesh.material, tex);
    applyWireframeModeToMesh(mesh);
  });
}

function applyMeshGeo(mesh, part, version) {
  if (!mesh || !part || !three || !THREE || !OBJLoaderClass) return;
  const className = String(part.className || "");
  const meshId = String(part.meshId || "").trim();
  if (!meshId) return;

  assetLoads.load(meshId, "mesh", async (attempt) => {
    const response = await fetch(meshProxy(meshId), {cache: attempt > 1 ? "reload" : "default", signal:AbortSignal.timeout(25000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!/(^|\n)\s*v\s+/.test(text)) throw new Error("Invalid mesh response");
    const obj = new OBJLoaderClass().parse(text);
    let found = null;
    obj.traverse(child => { if (!found && child?.isMesh && child.geometry) found = child.geometry; });
    if (!found) throw new Error("Mesh has no geometry");
    return found;
  }, {onValue: geometry => {
      if (!geometry || version !== renderVersion || !mesh?.material) return;
      const geom = geometry.clone();
      geom.computeBoundingBox();
      const box = geom.boundingBox;
      if (!box) return;

      const sourceSize = new THREE.Vector3();
      box.getSize(sourceSize);
      if (Math.max(sourceSize.x, sourceSize.y, sourceSize.z) <= 1e-5) return;

      const center = new THREE.Vector3();
      box.getCenter(center);

      const sx = Math.max(0.2, toNum(part?.size?.x, 4));
      const sy = Math.max(0.2, toNum(part?.size?.y, 4));
      const sz = Math.max(0.2, toNum(part?.size?.z, 4));
      if (part.meshScale) {
        const builtinHead = String(part.meshType || '').endsWith('.Head') || (!part.meshType && String(part.meshId).endsWith('avatar/heads/head.mesh'));
        if (builtinHead) {
          geom.translate(-center.x,-center.y,-center.z);
          geom.scale(1 / Math.max(1e-5,sourceSize.x),1 / Math.max(1e-5,sourceSize.y),1 / Math.max(1e-5,sourceSize.z));
        }
        geom.scale(part.meshScale.x, part.meshScale.y, part.meshScale.z);
        if (part.meshOffset) geom.translate(part.meshOffset.x, part.meshOffset.y, part.meshOffset.z);
      } else {
        geom.translate(-center.x, -center.y, -center.z);
        geom.scale(sourceSize.x > 1e-5 ? sx / sourceSize.x : 1, sourceSize.y > 1e-5 ? sy / sourceSize.y : 1, sourceSize.z > 1e-5 ? sz / sourceSize.z : 1);
      }
      if (!geom.hasAttribute("normal")) geom.computeVertexNormals();

      if (Array.isArray(mesh.material)) {
        const [first, ...rest] = mesh.material;
        mesh.material = first;
        for (const mat of rest) {
          const textures = new Set([mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.userData?.debugMap]);
          for (const tex of textures) tex?.dispose();
          mat.dispose();
        }
      }
      const material = mesh.material;
      const map = material?.userData?.debugMap || material?.map;
      if (map) {
        map.wrapS = THREE.ClampToEdgeWrapping;
        map.wrapT = THREE.ClampToEdgeWrapping;
        map.repeat.set(1, 1);
        map.offset.set(0, 0);
        map.needsUpdate = true;
      }

      if (mesh.geometry) mesh.geometry.dispose();
      mesh.geometry = geom;
      mesh.userData.assetGeometryLoaded = true;
      refreshHeadDecals(mesh);
      for (const overlay of mesh.userData.clothingOverlays || []) {
        if (overlay.userData.ownsGeometry) overlay.geometry.dispose();
        const projected = projectClassicClothingMeshUvs(geom, part.name);
        overlay.geometry = projected || geom;
        overlay.userData.ownsGeometry = Boolean(projected);
        overlay.userData.validGeometry = Boolean(projected);
        overlay.visible = Boolean(dbg.texturesOn && projected);
      }
      mesh.castShadow = part?.castShadow !== false && toNum(part?.transparency, 0) < 0.95;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat && "side" in mat) mat.side = part?.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
      }
      buildMeshChunks(mesh, part);
      if (three.renderer.shadowMap) three.renderer.shadowMap.needsUpdate = true;
  }});
}

function updateFly(delta) {
  if (!three || (!studioFlyActive && !document.querySelector(".touch-controls :active")) || delta <= 0) return;

  const speedFactor = pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight") ? 0.35 : 1;
  const distanceScale = Math.max(1, three.camera.position.distanceTo(three.controls.target) / 40);
  const step = studioMoveSpeed * speedFactor * distanceScale * delta;
  if (step <= 0) return;

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  three.camera.getWorldDirection(forward);
  right.crossVectors(forward, up).normalize();
  forward.normalize();

  const move = new THREE.Vector3();
  if (pressedKeys.has("KeyW")) move.add(forward);
  if (pressedKeys.has("KeyS")) move.sub(forward);
  if (pressedKeys.has("KeyD")) move.add(right);
  if (pressedKeys.has("KeyA")) move.sub(right);
  if (pressedKeys.has("KeyE")) move.add(up);
  if (pressedKeys.has("KeyQ")) move.sub(up);
  if (move.lengthSq() <= 0) return;

  move.normalize().multiplyScalar(step);
  three.camera.position.add(move);
  three.controls.target.add(move);
}

function tpToMouse() {
  if (!three) return;

  const raycaster = new THREE.Raycaster();
  const ndc = hasPointerNdc ? lastPointerNdc : { x: 0, y: 0 };
  raycaster.setFromCamera(ndc, three.camera);

  const targets = allRenderTargets();
  if (three.floorMesh) targets.push(three.floorMesh);
  const hits = raycaster.intersectObjects(targets, false);

  let targetPoint = null;
  if (hits.length > 0) {
    targetPoint = hits[0].point.clone();
  } else {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const fallbackPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, fallbackPoint)) {
      targetPoint = fallbackPoint;
    }
  }
  if (!targetPoint) return;

  const offset = new THREE.Vector3(0, 5, 0);
  const lookForward = new THREE.Vector3();
  three.camera.getWorldDirection(lookForward);
  three.camera.position.copy(targetPoint.clone().add(offset));
  three.controls.target.copy(three.camera.position.clone().add(lookForward.multiplyScalar(12)));
  three.camera.up.set(0, 1, 0);
  three.camera.lookAt(three.controls.target);
  three.camera.rotation.z = 0;
}

function pickMesh() {
  if (!three || !THREE || partMeshes.length === 0) return null;
  const raycaster = new THREE.Raycaster();
  const ndc = hasPointerNdc ? lastPointerNdc : { x: 0, y: 0 };
  raycaster.setFromCamera(ndc, three.camera);
  const hits = raycaster.intersectObjects(allRenderTargets(), false);
  return hits.length > 0 ? sourceOf(hits[0].object) : null;
}

function meshPartData(mesh) {
  const src = sourceOf(mesh);
  if (!src) return null;
  return src?.userData?.part || null;
}

async function copyHoverInfo() {
  const mesh = hoveredMesh || pickMesh();
  const part = meshPartData(mesh);
  if (!part) {
    snapshotMeta.textContent = "Select a part to copy.";
    return;
  }
  const payload = {
    path: part.path || "",
    name: part.name || "",
    className: part.className || "",
    material: part.material || "",
    materialVariant: part.materialVariant || "",
    color3: part.color3 || "",
    transparency: part.transparency ?? 0,
    position: part.position || null,
    size: part.size || null,
    orientation: part.orientation || null,
    meshId: part.meshId || "",
    textureId: part.textureId || "",
  };
  const ok = await copyText(JSON.stringify(payload, null, 2));
  snapshotMeta.textContent = ok ? `Copied: ${payload.path || payload.name || "part"}` : "Could not copy the part.";
}

function deleteHoveredPart() {
  const mesh = sourceOf(hoveredMesh || pickMesh());
  if (!mesh || !three) {
    snapshotMeta.textContent = "Select a part to remove.";
    return;
  }
  const idx = partMeshes.indexOf(mesh);
  if (idx >= 0) {
    partMeshes.splice(idx, 1);
  }
  const part = meshPartData(mesh);
  const path = String(part?.path || "");
  if (path) {
    partByPath.delete(path);
    if (latestSnapshot && Array.isArray(latestSnapshot.parts)) {
      latestSnapshot.parts = latestSnapshot.parts.filter((p) => String(p?.path || "") !== path);
    }
  }
  if (selectedMesh === mesh) {
    clearHighlight();
  }
  three.scene.remove(mesh);
  clearChunkMeshes(mesh);
  clearClothingOverlays(mesh);
  if (mesh.geometry) mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => {
      if (m?.map) m.map.dispose();
      m?.dispose?.();
    });
  } else if (mesh.material) {
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.dispose();
  }
  hoveredMesh = null;
  snapshotMeta.textContent = path ? `Removed from the viewer: ${path}` : "Removed from the viewer.";
}

async function ensureThreeModules() {
  if (THREE) return true;
  try {
    THREE = await import("three");
    ({RoundedBoxGeometry: RoundedBoxGeometryClass} = await import("three/addons/geometries/RoundedBoxGeometry.js"));
    ({DecalGeometry: DecalGeometryClass} = await import("three/addons/geometries/DecalGeometry.js"));
    return true;
  } catch (error) {
    addClientLog("error", "three module load failed", { message: error?.message || String(error) });
    return false;
  }
}

async function ensureDDS() {
  if (DDSLoaderClass || !THREE) return true;
  try {
    ({ DDSLoader: DDSLoaderClass } = await import("three/addons/loaders/DDSLoader.js"));
    ddsLoader = new DDSLoaderClass();
    return true;
  } catch (error) {
    addClientLog("warn", "dds loader load failed", { message: error?.message || String(error) });
    return false;
  }
}

async function ensureOBJ() {
  if (OBJLoaderClass || !THREE) return true;
  try {
    ({ OBJLoader: OBJLoaderClass } = await import("three/addons/loaders/OBJLoader.js"));
    return true;
  } catch (error) {
    addClientLog("warn", "obj loader load failed", { message: error?.message || String(error) });
    return false;
  }
}

async function ensurePostFX() {
  if ((EffectComposerClass && RenderPassClass && UnrealBloomPassClass && OutputPassClass) || !THREE) return true;
  try {
    const [composer, render, bloom, output, shader, bokeh] = await Promise.all([
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/OutputPass.js"),
      import("three/addons/postprocessing/ShaderPass.js"),
      import("three/addons/postprocessing/BokehPass.js"),
    ]);
    EffectComposerClass = composer.EffectComposer;
    RenderPassClass = render.RenderPass;
    UnrealBloomPassClass = bloom.UnrealBloomPass;
    OutputPassClass = output.OutputPass;
    ShaderPassClass = shader.ShaderPass;
    BokehPassClass = bokeh.BokehPass;
    return true;
  } catch (error) {
    addClientLog("warn", "postfx module load failed", { message: error?.message || String(error) });
    return false;
  }
}

async function setupThree() {
  const depsReady = await ensureThreeModules();
  if (!depsReady) {
    snapshotMeta.textContent = "The 3D viewer is unavailable. Your library is still accessible.";
    return false;
  }
  await ensureDDS();
  await ensureOBJ();
  await ensurePostFX();
  if (!occProj) occProj = new THREE.Matrix4();
  if (!occFrustum) occFrustum = new THREE.Frustum();
  if (!occRay) occRay = new THREE.Raycaster();
  if (!occTmp) occTmp = new THREE.Vector3();
  if (!occDir) occDir = new THREE.Vector3();
  if (!occSphere) occSphere = new THREE.Sphere();
  if (!occBox) occBox = new THREE.Box3();
  if (!occNdcTmp) occNdcTmp = new THREE.Vector3();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 6000);
  camera.position.set(18, 18, 28);
  camera.lookAt(0, 4, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const bootW = Math.max(320, viewport?.clientWidth || viewport?.offsetWidth || window.innerWidth || 1280);
  const bootH = Math.max(220, viewport?.clientHeight || viewport?.offsetHeight || Math.floor((window.innerHeight || 720) * 0.7));
  renderer.setSize(bootW, bootH);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.useLegacyLights = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.appendChild(renderer.domElement);

  const controls = {
    target: new THREE.Vector3(0, 4, 0),
    update: () => {},
  };
  camera.lookAt(controls.target);

  let touchLook = null;
  renderer.domElement.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || touchLook) return;
    event.preventDefault();
    touchLook = { id: event.pointerId, x: event.clientX, y: event.clientY };
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (touchLook?.id !== event.pointerId) return;
    const dx = event.clientX - touchLook.x;
    const dy = event.clientY - touchLook.y;
    touchLook.x = event.clientX; touchLook.y = event.clientY;
    camera.rotation.y -= dx * cameraLookSensitivity;
    camera.rotation.x = Math.max(-Math.PI * .49, Math.min(Math.PI * .49, camera.rotation.x - dy * cameraLookSensitivity));
    camera.rotation.z = 0;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    controls.target.copy(camera.position).addScaledVector(forward, 12);
  });
  const endTouch = (event) => { if (touchLook?.id === event.pointerId) touchLook = null; };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) renderer.domElement.addEventListener(type, endTouch);
  let lastMouseX = 0;
  let lastMouseY = 0;
  const isLookButton = (button) => (cameraLookButton === "LMB" ? button === 0 : button === 2);
  camera.rotation.order = "YXZ";
  const blockContextMenu = (ev) => {
    if (!viewport) return;
    if (viewport.contains(ev.target)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  };
  renderer.domElement.addEventListener("contextmenu", blockContextMenu);
  viewport.addEventListener("contextmenu", blockContextMenu, true);
  window.addEventListener("contextmenu", blockContextMenu, true);
  renderer.domElement.addEventListener("mousedown", (ev) => {
    lastMouseX = ev.clientX;
    lastMouseY = ev.clientY;
    if (isLookButton(ev.button)) {
      ev.preventDefault();
      studioFlyActive = true;
    }
  });
  window.addEventListener("mousemove", (ev) => {
    if (!studioFlyActive) return;
    const dx = ev.clientX - lastMouseX;
    const dy = ev.clientY - lastMouseY;
    lastMouseX = ev.clientX;
    lastMouseY = ev.clientY;
    camera.rotation.y -= dx * cameraLookSensitivity;
    camera.rotation.x -= dy * cameraLookSensitivity;
    const maxPitch = Math.PI * 0.49;
    camera.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, camera.rotation.x));
    camera.rotation.z = 0;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    controls.target.copy(camera.position).add(forward.multiplyScalar(12));
  });
  window.addEventListener("mouseup", () => {
    studioFlyActive = false;
  });
  window.addEventListener("blur", () => {
    studioFlyActive = false;
    pressedKeys.clear();
  });
  renderer.domElement.addEventListener(
    "wheel",
    (ev) => {
      if (!studioFlyActive) return;
      ev.preventDefault();
      const direction = Math.sign(ev.deltaY);
      studioMoveSpeed = Math.min(220, Math.max(2, studioMoveSpeed * (direction > 0 ? 0.9 : 1.1)));
      addClientLog("info", "studio camera speed changed", { speed: studioMoveSpeed });
    },
    { passive: false }
  );

  const hemi = new THREE.HemisphereLight(0xffffff, 0x111827, 0.8);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(18, 26, 8);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  dir.shadow.bias = -0.0002;
  dir.shadow.normalBias = 0.002;
  dir.shadow.radius = 1.0;
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 1200;
  dir.shadow.camera.left = -240;
  dir.shadow.camera.right = 240;
  dir.shadow.camera.top = 240;
  dir.shadow.camera.bottom = -240;
  scene.add(dir);
  // Keep the moving directional-light target in the scene graph so its
  // world transform is current when the shadow camera follows the viewer.
  scene.add(dir.target);

  const fill = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(fill);
  scene.fog = new THREE.Fog("#c8c8c8", 30, 220);
  let composer = null;
  let bloom = null, post = null, bokeh = null;
  if (EffectComposerClass && RenderPassClass && UnrealBloomPassClass && OutputPassClass) {
    composer = new EffectComposerClass(renderer);
    composer.addPass(new RenderPassClass(scene, camera));
    bokeh = new BokehPassClass(scene, camera, {focus:20, aperture:0.0001, maxblur:0.01});
    bokeh.enabled = false; composer.addPass(bokeh);
    bloom = new UnrealBloomPassClass(new THREE.Vector2(viewport.clientWidth, viewport.clientHeight), 0.35, 0.55, 0.9);
    composer.addPass(bloom);
    post = new ShaderPassClass(postEffectShader(THREE)); composer.addPass(post);
    composer.addPass(new OutputPassClass());
  }
  three = { scene, camera, renderer, hemi, dir, fill, controls, floorMesh: null, composer, bloom, post, bokeh };
  shdReady = false;
  await initSky();
  ensureHUD();
  ensureFpsHUD();
  applyDebugModes();
  const updatePointerFromEvent = (ev) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    lastPointerNdc = { x, y };
    hasPointerNdc = true;
    hoveredMesh = pickMesh();
  };
  renderer.domElement.addEventListener("mousemove", updatePointerFromEvent);
  renderer.domElement.addEventListener("mouseenter", updatePointerFromEvent);

  const animate = () => {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min(0.05, Math.max(0, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    updateFly(delta);
    updateOcc(now);
    updateFpsOverlay(now);
    updateShadowCoverage(now);
    updateNameplates();
    controls.update();
    if (skyState) {
      syncSky(skyState.sunVector, skyState.dayMix, skyState.nightMix, skyState.clockTime);
    }
    if (three?.post && skyState) {
      const sunPoint = camera.position.clone().addScaledVector(skyState.sunVector, 500).project(camera);
      three.post.uniforms.sunPosition.value.set(sunPoint.x * 0.5 + 0.5, sunPoint.y * 0.5 + 0.5);
      three.post.uniforms.sunIntensity.value = sunPoint.z < 1 && skyState.sunVector.y > 0 ? (skyState.sunRaysIntensity || 0) : 0;
      three.post.uniforms.atmosphereGlare.value = sunPoint.z < 1 && skyState.sunVector.y > 0 ? skyState.glare : 0;
    }
    if (three?.composer && dbg.shadersOn && shdReady) {
      three.composer.render();
    } else {
      renderer.render(scene, camera);
    }
  };
  animate();
  return true;
}

function clearMeshes(list) {
  if (!three) return;
  for (const mesh of list) {
    clearClothingOverlays(mesh);
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    } else if (mesh.material) {
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.dispose();
    }
  }
  list.length = 0;
}

function clearHighlight() {
  if (!selectedMesh || !selectedMesh.material) return;
  const mat = selectedMesh.material;
  if ("emissive" in mat) {
    if (mat.userData.baseEmissive) mat.emissive.copy(mat.userData.baseEmissive);
    else mat.emissive.set("#000000");
    mat.emissiveIntensity = mat.userData.baseEmissiveIntensity || 0;
  }
  selectedMesh = null;
}
function clearWorld() {
  clearHighlight();
  clearMeshes(decalPlanes);
  decalPlaneById.clear();
  for (const mesh of partMeshes) {
    clearStudOverlay(mesh);
    clearChunkMeshes(mesh);
  }
  clearMeshes(partMeshes);
  clearMeshes(characterLabels);
  clearMeshes(meshSpheres);
  clearMeshes(texturePathLabels);
  clearMeshes(fxPlaceholders);
  clearSceneLights();
  partByPath = new Map();
  occLastAt = 0;
}

function drawEmpty() {
  if (!three) return;
  renderVersion += 1;
  clearWorld();
  three.scene.background = new THREE.Color("#0b1220");
  three.scene.fog = dbg.fogOn ? new THREE.Fog("#374151", 30, 230) : null;
}

function sourceOf(obj) {
  if (!obj) return null;
  return obj.userData?.sourceMesh || obj;
}

function renderTargetsFromMesh(mesh) {
  if (!mesh) return [];
  const chunks = Array.isArray(mesh.userData?.chunkMeshes) ? mesh.userData.chunkMeshes : null;
  if (chunks && chunks.length > 0) return chunks;
  return [mesh];
}

function allRenderTargets() {
  const out = [];
  for (const mesh of partMeshes) {
    const arr = renderTargetsFromMesh(mesh);
    for (const t of arr) out.push(t);
  }
  return out;
}

function buildMeshChunks(mesh, part) {
  if (!THREE || !three || !mesh?.geometry) return;
  if (!MESH_CHUNK_ON) return;
  const className = String(part?.className || "");
  if (className !== "MeshPart") return;
  if (part?.clothing) return;

  const geom = mesh.geometry;
  const pos = geom.getAttribute("position");
  if (!pos || pos.count < 9) return;
  const idxAttr = geom.getIndex();
  const triCount = idxAttr ? Math.floor(idxAttr.count / 3) : Math.floor(pos.count / 3);
  if (triCount < MESH_CHUNK_TRI_THRESHOLD) return;

  clearChunkMeshes(mesh);

  if (!geom.boundingBox) geom.computeBoundingBox();
  const bb = geom.boundingBox;
  if (!bb) return;
  const sz = new THREE.Vector3();
  bb.getSize(sz);

  const desired = Math.max(4, Math.min(MESH_CHUNK_MAX, Math.floor(triCount / 2500)));
  const base = Math.cbrt(desired);
  let nx = Math.max(1, Math.round(base * (sz.x / Math.max(0.001, Math.cbrt(sz.x * sz.y * sz.z)))));
  let ny = Math.max(1, Math.round(base * (sz.y / Math.max(0.001, Math.cbrt(sz.x * sz.y * sz.z)))));
  let nz = Math.max(1, Math.round(base * (sz.z / Math.max(0.001, Math.cbrt(sz.x * sz.y * sz.z)))));
  while (nx * ny * nz > MESH_CHUNK_MAX) {
    if (nx >= ny && nx >= nz && nx > 1) nx -= 1;
    else if (ny >= nx && ny >= nz && ny > 1) ny -= 1;
    else if (nz > 1) nz -= 1;
    else break;
  }

  const groups = new Map();
  const triIndices = idxAttr ? idxAttr.array : null;
  const p = pos.array;
  const invX = nx / Math.max(1e-6, sz.x);
  const invY = ny / Math.max(1e-6, sz.y);
  const invZ = nz / Math.max(1e-6, sz.z);

  for (let t = 0; t < triCount; t += 1) {
    const i0 = triIndices ? triIndices[t * 3] : t * 3;
    const i1 = triIndices ? triIndices[t * 3 + 1] : t * 3 + 1;
    const i2 = triIndices ? triIndices[t * 3 + 2] : t * 3 + 2;
    const ax = p[i0 * 3], ay = p[i0 * 3 + 1], az = p[i0 * 3 + 2];
    const bx = p[i1 * 3], by = p[i1 * 3 + 1], bz = p[i1 * 3 + 2];
    const cx = p[i2 * 3], cy = p[i2 * 3 + 1], cz = p[i2 * 3 + 2];
    const mx = (ax + bx + cx) / 3;
    const my = (ay + by + cy) / 3;
    const mz = (az + bz + cz) / 3;
    const gx = Math.max(0, Math.min(nx - 1, Math.floor((mx - bb.min.x) * invX)));
    const gy = Math.max(0, Math.min(ny - 1, Math.floor((my - bb.min.y) * invY)));
    const gz = Math.max(0, Math.min(nz - 1, Math.floor((mz - bb.min.z) * invZ)));
    const key = `${gx}|${gy}|${gz}`;
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
    }
    arr.push(i0, i1, i2);
  }

  const chunks = [];
  for (const arr of groups.values()) {
    if (!arr || arr.length < 12) continue;
    const cg = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geom.attributes)) {
      cg.setAttribute(name, attr);
    }
    const maxIndex = pos.count - 1;
    const useU32 = maxIndex > 65535;
    cg.setIndex(useU32 ? new Uint32Array(arr) : new Uint16Array(arr));
    cg.computeBoundingBox();
    cg.computeBoundingSphere();
    const cm = new THREE.Mesh(cg, mesh.material);
    cm.position.copy(mesh.position);
    cm.quaternion.copy(mesh.quaternion);
    cm.scale.copy(mesh.scale);
    cm.castShadow = mesh.castShadow;
    cm.receiveShadow = mesh.receiveShadow;
    cm.frustumCulled = true;
    cm.renderOrder = mesh.renderOrder;
    cm.userData.part = part;
    cm.userData.sourceMesh = mesh;
    three.scene.add(cm);
    chunks.push(cm);
  }

  if (chunks.length >= 2) {
    mesh.visible = false;
    mesh.userData.useChunks = true;
    mesh.userData.chunkMeshes = chunks;
  } else {
    for (const c of chunks) {
      three.scene.remove(c);
      if (c.geometry) c.geometry.dispose();
    }
    mesh.userData.useChunks = false;
    mesh.userData.chunkMeshes = null;
  }
}

function isTransparentMat(mat) {
  if (!mat) return true;
  const op = typeof mat.opacity === "number" ? mat.opacity : 1;
  return Boolean(mat.transparent) || op < 0.98;
}
function isLikelyOccluder(mesh) {
  if (!mesh || !mesh.geometry || mesh.userData?.forceHide) return false;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (mats.length === 0) return false;
  if (mats.every((m) => isTransparentMat(m))) return false;
  const part = mesh.userData?.part || {};
  const sx = Math.max(0.2, toNum(part?.size?.x, 1));
  const sy = Math.max(0.2, toNum(part?.size?.y, 1));
  const sz = Math.max(0.2, toNum(part?.size?.z, 1));
  const isHugeFlat = sy <= 1.6 && sx * sz > 3800;
  return !isHugeFlat;
}

function shouldSkipOcclusionForTarget(mesh) {
  const part = mesh?.userData?.part || {};
  const sx = Math.max(0.2, toNum(part?.size?.x, 1));
  const sy = Math.max(0.2, toNum(part?.size?.y, 1));
  const sz = Math.max(0.2, toNum(part?.size?.z, 1));
  if (sy <= 1.6 && sx * sz > 3800) return true;
  if (Math.max(sx, sy, sz) > 220) return true;
  return false;
}

function meshCenterNdc(mesh, camera) {
  if (!mesh || !camera || !occTmp || !occNdcTmp) return null;
  mesh.getWorldPosition(occTmp);
  occNdcTmp.copy(occTmp).project(camera);
  if (!Number.isFinite(occNdcTmp.x) || !Number.isFinite(occNdcTmp.y) || !Number.isFinite(occNdcTmp.z)) return null;
  return occNdcTmp;
}

function worldSamplePoints(mesh) {
  const pts = [];
  const g = mesh?.geometry;
  if (!g) return pts;
  if (!g.boundingBox) g.computeBoundingBox();
  const bb = g.boundingBox;
  if (!bb) return pts;
  const cx = (bb.min.x + bb.max.x) * 0.5;
  const cy = (bb.min.y + bb.max.y) * 0.5;
  const cz = (bb.min.z + bb.max.z) * 0.5;
  const raw = [
    [cx, cy, cz],
    [bb.min.x, bb.min.y, bb.min.z],
    [bb.max.x, bb.min.y, bb.min.z],
    [bb.min.x, bb.max.y, bb.min.z],
    [bb.max.x, bb.max.y, bb.min.z],
    [bb.min.x, bb.min.y, bb.max.z],
    [bb.max.x, bb.min.y, bb.max.z],
    [bb.min.x, bb.max.y, bb.max.z],
    [bb.max.x, bb.max.y, bb.max.z],
  ];
  const cap = Math.max(1, Math.min(OCC_FULLY_HIDDEN_POINTS, raw.length));
  for (let i = 0; i < cap; i += 1) {
    const p = raw[i];
    pts.push(new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(mesh.matrixWorld));
  }
  return pts;
}

function isPointBlocked(worldPoint, targetMesh, camPos, occluders) {
  occDir.copy(worldPoint).sub(camPos);
  const dist = occDir.length();
  if (!Number.isFinite(dist) || dist <= 0.1) return false;
  occDir.normalize();
  occRay.set(camPos, occDir);
  occRay.near = 0.05;
  occRay.far = Math.max(0.1, dist - 0.05);
  const hits = occRay.intersectObjects(occluders, false);
  for (const hit of hits) {
    const obj = hit?.object;
    if (!obj) continue;
    if (obj === targetMesh) return false;
    if (!obj.visible) continue;
    return true;
  }
  return false;
}

function updateOcc(nowMs) {
  if (!dbg.cullingOn || !three || !THREE) return;
  if (!Array.isArray(partMeshes) || partMeshes.length === 0) return;
  if (!occProj || !occFrustum || !occRay || !occTmp || !occDir) return;
  if (nowMs - occLastAt < OCC_RT_MS) return;
  occLastAt = nowMs;

  const cam = three.camera;
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  occProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  occFrustum.setFromProjectionMatrix(occProj);
  const renderTargets = allRenderTargets();
  if (renderTargets.length === 0) return;
  const occluders = [];
  const targets = [];
  const camPos = cam.position;

  for (const obj of renderTargets) {
    if (!obj || !obj.geometry) continue;
    const src = sourceOf(obj);
    if (!src || src.userData?.forceHide) {
      obj.visible = false;
      continue;
    }
    if (selectedMesh === src) {
      setCameraVisibility(obj, true);
      obj.userData.occBlockCount = 0;
      continue;
    }

    const inFrustum = meshInFrustum(obj);
    if (!inFrustum) {
      setCameraVisibility(obj, false);
      obj.userData.occBlockCount = 0;
      continue;
    }
    setCameraVisibility(obj, true);
    if (isLikelyOccluder(obj)) occluders.push(obj);

    if (shouldSkipOcclusionForTarget(src)) {
      obj.userData.occBlockCount = 0;
      obj.userData.occLastVisibleAt = nowMs;
      continue;
    }
    const ndc = meshCenterNdc(obj, cam);
    if (!ndc) {
      obj.userData.occBlockCount = 0;
      obj.userData.occLastVisibleAt = nowMs;
      continue;
    }
    if (Math.abs(ndc.x) > OCC_EDGE_GUARD || Math.abs(ndc.y) > OCC_EDGE_GUARD) {
      obj.userData.occBlockCount = 0;
      obj.userData.occLastVisibleAt = nowMs;
      continue;
    }
    obj.getWorldPosition(occTmp);
    const dist = camPos.distanceTo(occTmp);
    if (!Number.isFinite(dist) || dist < 4.0) {
      obj.userData.occBlockCount = 0;
      obj.userData.occLastVisibleAt = nowMs;
      continue;
    }
    targets.push({ mesh: obj, dist });
  }

  targets.sort((a, b) => b.dist - a.dist);
  const maxTests = Math.min(OCC_MAX_OCCLUSION_TESTS, targets.length);
  for (let i = 0; i < maxTests; i += 1) {
    const t = targets[i];
    const mesh = t.mesh;
    const samplePts = worldSamplePoints(mesh);
    if (samplePts.length === 0) {
      mesh.userData.occBlockCount = 0;
      mesh.userData.occLastVisibleAt = nowMs;
      setCameraVisibility(mesh, true);
      continue;
    }
    let fullyBlocked = true;
    for (const p of samplePts) {
      if (!isPointBlocked(p, mesh, camPos, occluders)) {
        fullyBlocked = false;
        break;
      }
    }

    if (!fullyBlocked) {
      mesh.userData.occBlockCount = 0;
      mesh.userData.occLastVisibleAt = nowMs;
      setCameraVisibility(mesh, true);
      continue;
    }

    mesh.userData.occBlockCount = (mesh.userData.occBlockCount || 0) + 1;
    const heldVisibleFor = nowMs - Number(mesh.userData.occLastVisibleAt || 0);
    if (mesh.userData.occBlockCount < OCC_HIDE_CONFIRM || heldVisibleFor < OCC_HOLD_VISIBLE_MS) {
      setCameraVisibility(mesh, true);
      continue;
    }
    setCameraVisibility(mesh, false);
  }

  for (const mesh of partMeshes) {
    const overlay = mesh?.userData?.studOverlay;
    if (!overlay) continue;
    const chunks = Array.isArray(mesh.userData?.chunkMeshes) ? mesh.userData.chunkMeshes : [];
    if (chunks.length > 0) {
      overlay.visible = chunks.some((c) => cameraSees(c, cam));
    } else {
      overlay.visible = cameraSees(mesh, cam);
    }
  }
  for (const proxy of meshSpheres) {
    const src = proxy?.userData?.sourceMesh;
    if (!src) continue;
    if (proxy?.userData?.isBillboard) {
      proxy.visible = true;
      proxy.frustumCulled = false;
      continue;
    }
    const chunks = Array.isArray(src.userData?.chunkMeshes) ? src.userData.chunkMeshes : [];
    proxy.visible = chunks.length > 0 ? chunks.some((c) => cameraSees(c, cam)) : cameraSees(src, cam);
  }
}

function meshInFrustum(mesh) {
  if (!mesh || !mesh.geometry || !occFrustum || !THREE) return false;
  const g = mesh.geometry;
  if (!g.boundingBox) g.computeBoundingBox();
  if (g.boundingBox && occBox) {
    occBox.copy(g.boundingBox).applyMatrix4(mesh.matrixWorld);
    return occFrustum.intersectsBox(occBox);
  }
  if (!g.boundingSphere) g.computeBoundingSphere();
  if (!g.boundingSphere) return true;
  occSphere.copy(g.boundingSphere);
  occSphere.applyMatrix4(mesh.matrixWorld);
  return occFrustum.intersectsSphere(occSphere);
}

function buildPartMesh(part, idx) {
  const sx = Math.max(0.2, toNum(part?.size?.x, 4));
  const sy = Math.max(0.2, toNum(part?.size?.y, 4));
  const sz = Math.max(0.2, toNum(part?.size?.z, 4));

  const px = toNum(part?.position?.x, (idx % 8) * 6 - 20);
  const py = toNum(part?.position?.y, sy / 2);
  const pz = toNum(part?.position?.z, Math.floor(idx / 8) * 6 - 20);

  const rx = THREE.MathUtils.degToRad(toNum(part?.orientation?.x, 0));
  const ry = THREE.MathUtils.degToRad(toNum(part?.orientation?.y, 0));
  const rz = THREE.MathUtils.degToRad(toNum(part?.orientation?.z, 0));

  const color = hexColor(part?.color3 || "#d1d5db");
  const transp = Math.min(1, Math.max(0, toNum(part?.transparency, 0)));
  const profile = materialProfile(part?.material);

  const shape = String(part?.shape || "").replace("Enum.PartType.", "").toLowerCase();
  const classicBody = !part.meshId && RoundedBoxGeometryClass && (String(part.rigType).endsWith('.R6') || part.clothing) && /^(Torso|Left Arm|Right Arm|Left Leg|Right Leg)$/.test(part.name);
  let geometry = classicBody ? new RoundedBoxGeometryClass(sx, sy, sz, 1, Math.min(sx, sy, sz) * 0.035) : new THREE.BoxGeometry(sx, sy, sz);
  if (shape === "ball") {
    geometry = new THREE.SphereGeometry(Math.max(sx, sy, sz) / 2, 24, 18);
  } else if (shape === "cylinder") {
    geometry = new THREE.CylinderGeometry(Math.max(sx, sz) / 2, Math.max(sx, sz) / 2, sy, 24);
  }

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      transparent: transp > 0,
      opacity: 1 - transp,
      roughness: profile.roughness,
      metalness: profile.metalness,
      envMapIntensity: toNum(latestSnapshot?.lighting?.environmentSpecularScale,0),
      side: THREE.FrontSide,
      flatShading: !dbg.smoothLighting,
    })
  );

  mesh.position.set(px, py, pz);
  mesh.rotation.set(rx, ry, rz, "YXZ");
  mesh.castShadow = part?.castShadow !== false && transp < 0.95;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  return mesh;
}

function decalFaceTf(mesh, face) {
  const s = mesh.geometry?.parameters || {};
  let sx = toNum(s.width, 0);
  let sy = toNum(s.height, 0);
  let sz = toNum(s.depth, 0);
  if (sx <= 0 || sy <= 0 || sz <= 0) {
    const part = mesh?.userData?.part || {};
    sx = Math.max(0.2, toNum(part?.size?.x, 1));
    sy = Math.max(0.2, toNum(part?.size?.y, 1));
    sz = Math.max(0.2, toNum(part?.size?.z, 1));
  }
  const eps = 0.02;

  let w = sx * 0.92;
  let h = sy * 0.92;
  let offset = new THREE.Vector3(0, 0, -sz / 2 - eps);
  // Decals are double-sided, so the front face does not need a 180° turn.
  // Rotating around Y mirrors text and face details horizontally.
  let rot = new THREE.Euler(0, 0, 0);
  switch (faceName(face)) {
    case "Back":
      offset = new THREE.Vector3(0, 0, sz / 2 + eps);
      rot = new THREE.Euler(0, 0, 0);
      break;
    case "Left":
      w = sz * 0.92;
      h = sy * 0.92;
      offset = new THREE.Vector3(-sx / 2 - eps, 0, 0);
      rot = new THREE.Euler(0, -Math.PI / 2, 0);
      break;
    case "Right":
      w = sz * 0.92;
      h = sy * 0.92;
      offset = new THREE.Vector3(sx / 2 + eps, 0, 0);
      rot = new THREE.Euler(0, Math.PI / 2, 0);
      break;
    case "Top":
      w = sx * 0.92;
      h = sz * 0.92;
      offset = new THREE.Vector3(0, sy / 2 + eps, 0);
      rot = new THREE.Euler(Math.PI / 2, 0, 0);
      break;
    case "Bottom":
      w = sx * 0.92;
      h = sz * 0.92;
      offset = new THREE.Vector3(0, -sy / 2 - eps, 0);
      rot = new THREE.Euler(-Math.PI / 2, 0, 0);
      break;
    default:
      break;
  }

  return { w: Math.max(0.15, w), h: Math.max(0.15, h), offset, rot };
}

function syncRecordedSky(settings) {
  const faces = ['skyboxRt','skyboxLf','skyboxUp','skyboxDn','skyboxBk','skyboxFt'].map(key => String(settings[key] || ''));
  const signature = faces.join('|');
  if (signature === recordedSkyKey) {
    if (recordedSkyCube) three.scene.background = recordedSkyCube;
    return;
  }
  recordedSkyKey = signature;
  if (recordedSkyCube) recordedSkyCube.dispose();
  recordedEnvironment?.dispose(); recordedEnvironment = null; recordedSkyCube = null;
  three.scene.environment = null;
  if (faces.some(face => !face)) return;
  const images = [];
  faces.forEach((face,index) => loadTexSrc(face, texture => {
    if (!texture || recordedSkyKey !== signature) return;
    images[index] = texture.image;
    if (images.filter(Boolean).length !== 6) return;
    recordedSkyCube?.dispose();
    recordedSkyCube = new THREE.CubeTexture(images); recordedSkyCube.colorSpace = THREE.SRGBColorSpace; recordedSkyCube.needsUpdate = true;
    three.scene.background = recordedSkyCube;
    const generator = new THREE.PMREMGenerator(three.renderer);
    recordedEnvironment?.dispose(); recordedEnvironment = generator.fromCubemap(recordedSkyCube); generator.dispose();
    three.scene.environment = recordedEnvironment.texture;
  }));
}

function updateShadowCoverage(now = 0, force = false) {
  if (!three?.dir || !three?.camera || !skyState || (!force && now - shadowCoverageAt < 400)) return;
  shadowCoverageAt = now;
  const camera = three.camera;
  const range = shadowRange(dbg.shadowRange);
  const forward = new THREE.Vector3(); camera.getWorldDirection(forward);
  const target = camera.position.clone().addScaledVector(forward, Math.min(range * 0.2, 30));
  const shadowCamera = three.dir.shadow.camera;
  if (shadowCamera.right !== range) {
    shadowCamera.left = -range; shadowCamera.right = range; shadowCamera.top = range; shadowCamera.bottom = -range;
    shadowCamera.near = 1; shadowCamera.far = Math.max(900, range * 7); shadowCamera.updateProjectionMatrix();
  }
  three.dir.target.position.copy(target);
  three.dir.position.copy(target).addScaledVector(skyState.sunVector, Math.max(180, range * 1.5));
  three.dir.target.updateMatrixWorld(true); three.dir.updateMatrixWorld(true);
  for (const mesh of partMeshes) {
    if (!mesh?.userData?.part || !mesh.position) continue;
    const cast = partCastsNearby(mesh.userData.part, mesh.position, camera.position, dbg.shadowRange);
    mesh.castShadow = cast;
    for (const chunk of mesh.userData.chunkMeshes || []) chunk.castShadow = cast;
  }
}

function syncLight(snapshot) {
  if (!three) return;
  const lighting = snapshot.lighting || {};

  const clockTime = toNum(lighting.clockTime, 12);
  const brightness = toNum(lighting.brightness, 2);
  const exposureComp = toNum(lighting.exposureCompensation, 0);
  const fogColor = hexColor(lighting.fogColor || "#c8c8c8");
  const ambient = hexColor(lighting.ambient || "#808080");
  const outdoor = hexColor(lighting.outdoorAmbient || "#b4b4b4");
  const sunDir = toVec3(lighting.sunDirection, null);
  const atmosphere = lighting.atmosphere && typeof lighting.atmosphere === "object" ? lighting.atmosphere : {};
  const skySettings = lighting.sky && typeof lighting.sky === "object" ? lighting.sky : {};
  const postEffects = Array.isArray(lighting.postEffects) ? lighting.postEffects : [];
  const globalShadows = Boolean(lighting.globalShadows ?? true);
  const atmDensity = Math.max(0, toNum(atmosphere.density, 0));
  const atmHaze = Math.max(0, toNum(atmosphere.haze, 0));
  const atmGlare = Math.max(0, toNum(atmosphere.glare, 0));
  const atmColor = hexColor(atmosphere.color || fogColor, fogColor);
  const atmDecay = hexColor(atmosphere.decay || ambient, ambient);

  const timeAngle = ((clockTime - 6) / 24) * Math.PI * 2;
  const timeSunVector = new THREE.Vector3(
    Math.cos(timeAngle),
    Math.sin(timeAngle),
    Math.sin(timeAngle * 0.45) * 0.35
  ).normalize();
  let sunVector = timeSunVector.clone();
  if (sunDir) sunVector = new THREE.Vector3(sunDir.x, sunDir.y, sunDir.z).normalize();
  const sunHeight = Math.max(-1, Math.min(1, sunVector.y));
  const dayMix = Math.max(0, Math.min(1, (sunHeight + 0.15) / 1.15));
  const nightMix = 1 - dayMix;
  skyState = {
    sunVector: sunVector.clone(),
    dayMix,
    nightMix,
    clockTime,
    skySettings,
    clouds:lighting.clouds,
    glare:atmGlare * atmDensity,
  };

  const bgDay = new THREE.Color("#b7c9d8");
  const bgNight = new THREE.Color("#121a2d");
  const sky = bgNight.clone().lerp(bgDay, dayMix);
  sky.lerp(new THREE.Color(atmColor), Math.min(0.42, atmDensity * 1.8 + atmHaze * 0.12));
  three.scene.background = sky;
  syncRecordedSky(skySettings);
  if (three.scene.backgroundRotation && skySettings.skyboxOrientation) {
    const r = skySettings.skyboxOrientation;
    three.scene.backgroundRotation.set(THREE.MathUtils.degToRad(toNum(r.x,0)), THREE.MathUtils.degToRad(toNum(r.y,0)), THREE.MathUtils.degToRad(toNum(r.z,0)), "YXZ");
    if (three.scene.environmentRotation) three.scene.environmentRotation.copy(three.scene.backgroundRotation);
  }

  if (three.renderer && dbg.shadersOn) {
    const grading = postEffects.find(effect => effect.className === 'ColorGradingEffect' && effect.enabled);
    three.renderer.toneMapping = String(grading?.tonemapperPreset || '').endsWith('.Retro') ? THREE.ReinhardToneMapping : THREE.ACESFilmicToneMapping;
    three.renderer.toneMappingExposure = Math.pow(2, Math.max(-5, Math.min(5, exposureComp))) * dbg.sceneBrightness;
  }

  const ambientColor = new THREE.Color(ambient);
  const outsideColor = new THREE.Color(globalShadows ? outdoor : ambient);
  const skyContribution = outsideColor.clone().sub(ambientColor);
  skyContribution.r = Math.max(0,skyContribution.r); skyContribution.g = Math.max(0,skyContribution.g); skyContribution.b = Math.max(0,skyContribution.b);
  const diffuseScale = Math.max(0, Math.min(1, toNum(lighting.environmentDiffuseScale,0)));
  const specularScale = Math.max(0, Math.min(1, toNum(lighting.environmentSpecularScale,0)));
  three.hemi.color.copy(skyContribution);
  three.hemi.groundColor.set('#000000');
  three.hemi.intensity = globalShadows ? 1 + diffuseScale : 0;
  const sunColor = new THREE.Color('#ffffff');
  if (lighting.colorShiftTop) sunColor.add(new THREE.Color(hexColor(lighting.colorShiftTop)));
  three.dir.color.copy(sunColor);
  const realistic = String(lighting.lightingStyle || lighting.technology || '').match(/Realistic|Future|ShadowMap/);
  three.dir.intensity = Math.max(0,brightness) * (sunHeight > 0 ? 1 : 0.12) * (realistic ? 1.4 : 1.1);
  three.dir.userData.globalShadows = globalShadows;
  if (three.fill) {
    three.fill.color.copy(ambientColor);
    if (lighting.colorShiftBottom) three.fill.color.add(new THREE.Color(hexColor(lighting.colorShiftBottom)));
    three.fill.intensity = 1.8;
  }
  if (three.scene.userData.specularScale !== specularScale) {
    three.scene.userData.specularScale = specularScale;
    for (const mesh of partMeshes) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if ('envMapIntensity' in mat) mat.envMapIntensity = specularScale;
    }
  }

  if (three.bloom) {
    const blooms = postEffects.filter(effect => effect?.className === "BloomEffect" && effect.enabled);
    three.bloom.enabled = blooms.length > 0;
    three.bloom.strength = blooms.reduce((sum,e)=>sum+Math.max(0,toNum(e.intensity,0)),0);
    three.bloom.threshold = blooms.length ? Math.min(...blooms.map(e=>toNum(e.threshold,1))) : 1;
    three.bloom.radius = blooms.length ? Math.min(1, Math.max(...blooms.map(e=>toNum(e.size,24)))/56) : 0;
  }

  if (three.post) {
    const enabled = postEffects.filter(effect => effect.enabled);
    const corrections = enabled.filter(effect => effect.className === "ColorCorrectionEffect");
    const uniforms = three.post.uniforms;
    uniforms.brightness.value = corrections.reduce((sum,e) => sum + toNum(e.brightness,0),0);
    uniforms.contrast.value = corrections.reduce((sum,e) => sum + toNum(e.contrast,0),0);
    uniforms.saturation.value = corrections.reduce((sum,e) => sum + toNum(e.saturation,0),0);
    uniforms.tint.value.set('#ffffff');
    for (const correction of corrections) uniforms.tint.value.multiply(new THREE.Color(hexColor(correction.tintColor || '#ffffff')));
    uniforms.blurSize.value = enabled.filter(e => e.className === 'BlurEffect').reduce((max,e) => Math.max(max,toNum(e.size,0)),0) * 0.5;
    uniforms.sunSpread.value = toNum(enabled.find(e=>e.className==='SunRaysEffect')?.spread,0.5);
    skyState.sunRaysIntensity = enabled.filter(e=>e.className==='SunRaysEffect').reduce((sum,e)=>sum+toNum(e.intensity,0),0);
    uniforms.resolution.value.set(three.renderer.domElement.width,three.renderer.domElement.height);
    three.renderer.domElement.style.filter = '';
    const dof = enabled.find(e => e.className === 'DepthOfFieldEffect');
    if (three.bokeh) {
      three.bokeh.enabled = Boolean(dof && (toNum(dof.nearIntensity,0)>0 || toNum(dof.farIntensity,0)>0));
      if (dof) {
        three.bokeh.uniforms.focus.value = Math.max(0.1,toNum(dof.focusDistance,20));
        three.bokeh.uniforms.aperture.value = 0.001 / Math.max(1,toNum(dof.inFocusRadius,10));
        three.bokeh.uniforms.maxblur.value = Math.max(toNum(dof.nearIntensity,0),toNum(dof.farIntensity,0)) * 0.015;
      }
    }
  }

  if (three.dir.shadow) updateShadowCoverage(performance.now(), true);

  const fogStart = toNum(lighting.fogStart, 120);
  const fogEnd = toNum(lighting.fogEnd, 650);
  const fogMix = new THREE.Color(fogColor).lerp(new THREE.Color(atmColor), Math.min(1, atmDensity + atmHaze * 0.05));
  fogMix.lerp(new THREE.Color(atmDecay),Math.min(0.7, nightMix * atmHaze * 0.15));
  if (!dbg.fogOn) three.scene.fog = null;
  else if (atmDensity > 0) three.scene.fog = new THREE.FogExp2(fogMix, atmDensity * 0.001 * (1 + atmHaze * 0.2) * Math.max(0.1,1 - toNum(atmosphere.offset,0) * 0.3));
  else three.scene.fog = new THREE.Fog(fogMix, Math.max(0,fogStart), Math.max(fogStart + 1,fogEnd));
  syncSky(sunVector, dayMix, nightMix, clockTime);
  apShdwMd();
}

function makeTextSprite(text) {
  if (!THREE) return null;
  const label = String(text || "").trim();
  if (!label) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "500 40px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeText(label, canvas.width / 2, canvas.height / 2, canvas.width - 16);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - 16);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(Math.min(4.5, Math.max(2.2, label.length * 0.17)), 0.65, 1);
  sprite.renderOrder = 25;
  sprite.userData.isBillboard = true;
  sprite.frustumCulled = false;
  return sprite;
}

function addHeadLabel(mesh) {
  const part = mesh?.userData?.part;
  if (!isCharHead(part) || !part.characterName || mesh.userData.characterLabel) return;
  const sprite = makeTextSprite(part.characterName);
  if (!sprite) return;
  sprite.position.set(0, Math.max(0.5, toNum(part.size?.y, 2) / 2) + 0.7, 0);
  sprite.visible = Boolean(dbg.playerLabelsOn && part.showName !== false);
  sprite.userData.sourceHead = mesh;
  sprite.userData.baseScale = sprite.scale.clone();
  mesh.add(sprite);
  mesh.userData.characterLabel = sprite;
  characterLabels.push(sprite);
}

function updateNameplates() {
  if (!three) return;
  const world = new THREE.Vector3();
  const worldPerPixel = 2 * Math.tan(THREE.MathUtils.degToRad(three.camera.fov) / 2) / Math.max(1,viewport.clientHeight);
  for (const label of characterLabels) {
    const head = label.userData.sourceHead;
    if (!head) continue;
    const part = head.userData.part;
    head.getWorldPosition(world);
    const distance = three.camera.position.distanceTo(world);
    label.visible = dbg.playerLabelsOn && part.showName !== false && distance <= toNum(part.nameDisplayDistance,100);
    if (!label.visible) continue;
    world.y += Math.max(0.5,toNum(part.size?.y,2) / 2) + 0.7;
    label.position.copy(head.worldToLocal(world));
    const base = label.userData.baseScale;
    const scale = Math.min(1, 16 * (128 / 40) * distance * worldPerPixel / base.y);
    label.scale.copy(base).multiplyScalar(scale);
  }
}

function removeHeadLabel(mesh) {
  const label = mesh?.userData?.characterLabel;
  if (!label) return;
  const index = characterLabels.indexOf(label);
  if (index >= 0) characterLabels.splice(index, 1);
  clearMeshes([label]);
  mesh.userData.characterLabel = null;
}

function addCharLabels(snapshot) {
  if (!three) return;
  const recordedHeads = partMeshes.filter((mesh) => isCharHead(mesh?.userData?.part) && mesh.userData.part.characterName);
  if (recordedHeads.length > 0) {
    for (const mesh of recordedHeads) addHeadLabel(mesh);
    return;
  }
  const roots = Array.isArray(snapshot?.explorer?.services) ? snapshot.explorer.services : [];
  if (roots.length === 0 && !Array.isArray(partMeshes)) return;

  const characterModels = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    const children = Array.isArray(node.children) ? node.children : [];
    const hasHumanoid = children.some((c) => String(c?.className || "") === "Humanoid");
    const nodePath = String(node.path || "");
    if (String(node.className || "") === "Model" && hasHumanoid && nodePath.startsWith("Workspace/")) {
      characterModels.push({ name: String(node.name || ""), path: nodePath });
    }
    for (const child of children) queue.push(child);
  }
  if (characterModels.length === 0) {
    const map = new Map();
    for (const m of partMeshes) {
      const p = String(m?.userData?.part?.path || "");
      if (!p.startsWith("Workspace/")) continue;
      const bits = p.split("/");
      if (bits.length < 3) continue;
      const modelName = bits[1];
      if (!modelName) continue;
      if (bits.includes("Accessory") || bits.includes("Accessories")) continue;
      if (bits[2] !== "Head" && !p.includes("/Head/")) continue;
      map.set(modelName, "Workspace/" + modelName);
    }
    for (const [name, path] of map.entries()) {
      characterModels.push({ name, path });
    }
  }
  if (characterModels.length === 0) return;

  for (const model of characterModels) {
    const members = partMeshes.filter((m) => {
      const path = String(m?.userData?.part?.path || "");
      return path === model.path || path.startsWith(`${model.path}/`);
    });
    if (members.length === 0) continue;
    const box = new THREE.Box3();
    for (const mesh of members) box.expandByObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const sprite = makeTextSprite(model.name);
    if (!sprite) continue;
    sprite.position.set(center.x, center.y + Math.max(2.8, size.y * 0.65), center.z);
    three.scene.add(sprite);
    characterLabels.push(sprite);
  }
}

function placeCam(parts) {
  if (!three) return;
  const target = chooseSpawnTarget(parts);
  if (!target) return;
  const center = target.position.clone();
  const isPlayer = Boolean(target.userData.part.characterName);
  if (!isPlayer) center.y += Math.max(0, Number(target.userData.part.size?.y || 0)) / 2;
  const distance = isPlayer ? 10 : 14;
  three.camera.position.copy(center).add(new THREE.Vector3(distance * 0.7, isPlayer ? 4 : 7, distance));
  three.camera.up.set(0, 1, 0);
  three.camera.lookAt(center);
  three.controls.target.copy(center);
  three.controls.update();
}

function refreshHeadDecals(mesh) {
  const part = mesh?.userData?.part;
  if (!DecalGeometryClass || !mesh.userData.assetGeometryLoaded || !String(part?.meshId).endsWith('avatar/heads/head.mesh')) return;
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox, size = box.getSize(new THREE.Vector3());
  mesh.updateWorldMatrix(true,false);
  for (const plane of mesh.children) {
    if (plane.userData?.decalFace !== 'Front') continue;
    const center = box.getCenter(new THREE.Vector3()); center.z = box.min.z + size.z * 0.12;
    center.applyMatrix4(mesh.matrixWorld);
    const projected = new DecalGeometryClass(mesh,center,mesh.rotation,new THREE.Vector3(size.x * 0.94,size.y * 0.94,size.z * 0.65));
    projected.applyMatrix4(new THREE.Matrix4().copy(mesh.matrixWorld).invert());
    plane.geometry.dispose(); plane.geometry = projected;
    plane.position.set(0,0,0); plane.rotation.set(0,0,0);
    plane.material.polygonOffset = true; plane.material.polygonOffsetFactor = -2; plane.material.polygonOffsetUnits = -2;
  }
}

function addDecal(decal, fallbackPart, version) {
  if (!three) return;
  const part = partByPath.get(decal.partPath) || (curMode === "snap" ? fallbackPart : null);
  if (!part) return;
  const decalId = String(decal.id || decal.instancePath || "").trim();
  if (decalId) removeDecalPlane(decalId);
  const src = visibleDecalTexture(decal);
  if (!src) return null;
  const t = decalFaceTf(part, decal.face);
  const opacity = Math.min(1, Math.max(0, 1 - toNum(decal.transparency, 0)));
  const mat = new THREE.MeshBasicMaterial({
    color: hexColor(decal.color3 || "#ffffff"),
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(t.w, t.h), mat);
  plane.visible = false;
  plane.position.copy(t.offset);
  plane.rotation.copy(t.rot);
  plane.userData.decalId = decalId;
  plane.userData.decalFace = faceName(decal.face);
  part.add(plane);
  decalPlanes.push(plane);
  if (decalId) decalPlaneById.set(decalId, plane);
  refreshHeadDecals(part);

  loadTexSrc(src, tex => {
    if (!tex || version !== renderVersion || !plane.parent) return;
    const decalTexture = tex.clone();
    decalTexture.colorSpace = THREE.SRGBColorSpace;
    decalTexture.anisotropy = three.renderer.capabilities.getMaxAnisotropy();
    mat.map = decalTexture; mat.color.set("#ffffff"); mat.needsUpdate = true; plane.visible = true;
  });
  return plane;
}
function disposeDecalPlane(plane) {
  if (!plane) return;
  const id = String(plane.userData?.decalId || "");
  if (id && decalPlaneById.get(id) === plane) decalPlaneById.delete(id);
  const index = decalPlanes.indexOf(plane);
  if (index >= 0) decalPlanes.splice(index, 1);
  clearMeshes([plane]);
}
function removeDecalPlane(id) {
  disposeDecalPlane(decalPlaneById.get(String(id || "")));
}
function highlightPath(path) {
  clearHighlight();
  if (!path) return;
  const mesh = partByPath.get(path);
  if (!mesh || !mesh.material) return;

  const mat = mesh.material;
  if ("emissive" in mat) {
    mat.emissive.set("#34d399");
    mat.emissiveIntensity = 0.5;
    selectedMesh = mesh;
  }
  three.controls.target.copy(mesh.position);
  three.controls.update();
}

function collectXParts(snapshot) {
  const out = [];
  const explorer = snapshot?.explorer;
  const roots = Array.isArray(explorer?.services) ? explorer.services : [];
  const queue = [...roots];

  while (queue.length > 0) {
    const node = queue.shift();
    const children = Array.isArray(node?.children) ? node.children : [];
    for (const child of children) queue.push(child);

    if (!node || typeof node !== "object") continue;
    const className = String(node.className || "");
    const isBasePartLike =
      className === "Part" ||
      className === "MeshPart" ||
      className === "WedgePart" ||
      className === "CornerWedgePart" ||
      className === "TrussPart" ||
      className === "SpawnLocation" ||
      className === "UnionOperation" ||
      className === "Seat" ||
      className === "VehicleSeat";
    if (!isBasePartLike) continue;

    const normalized = normalizePart({
      path: node.path,
      name: node.name,
      className: node.className,
      shape: readAny(node?.properties, ["Shape"]),
      size: readAny(node?.properties, ["Size"]),
      position: readAny(node?.properties, ["Position"]),
      orientation: readAny(node?.properties, ["Orientation"]),
      color3: readAny(node?.properties, ["Color"]),
      transparency: readAny(node?.properties, ["Transparency"]),
      material: readAny(node?.properties, ["Material"]),
      meshId: readAny(node?.properties, ["MeshId"]),
      textureId: readAny(node?.properties, ["TextureID", "TextureId"]),
    });
    if (normalized) out.push(normalized);
  }

  return out;
}

function buildParts(snapshot) {
  const fromSnapshot = Array.isArray(snapshot?.parts)
    ? snapshot.parts.map((p) => normalizePart(p)).filter(Boolean)
    : [];

  if (fromSnapshot.length > 0) return fromSnapshot;

  const fromExplorer = collectXParts(snapshot);
  if (fromExplorer.length > 0) return fromExplorer;

  return [];
}
function drawSnap(snapshot, opt = {}) {
  if (!three) return;
  const camOn = opt?.cam !== false;
  renderVersion += 1;
  const version = renderVersion;

  materialTextureCache.clear();
  materialPbrMapCache.clear();
  clothingTextureCache.clear();
  assetLoads.beginScene();
  clearWorld();

  const parts = buildParts(snapshot);
  const decals = Array.isArray(snapshot.decals) ? snapshot.decals : [];

  if (parts.length === 0) {
    const fallback = buildPartMesh(
      {
        size: { x: 8, y: 8, z: 8 },
        position: { x: 0, y: 4, z: 0 },
        color3: "#e5e7eb",
      },
      0
    );
    three.scene.add(fallback);
    partMeshes.push(fallback);
    partByPath.set("__fallback__", fallback);
  } else {
    parts.forEach((part, idx) => {
      const mesh = buildPartMesh(part, idx);
      mesh.userData.part = part;
      three.scene.add(mesh);
      partMeshes.push(mesh);
      if (part?.path) partByPath.set(String(part.path), mesh);
      if (dbg.meshBoxesOn || String(part?.className || "") !== "MeshPart") {
        applyMeshGeo(mesh, part, version);
      }
      applyMatTex(mesh, part, version);
    });
  }

  addCharLabels(snapshot);
  addFxPlaceholders(snapshot);
  addLights(snapshot);
  if (camOn) placeCam(partMeshes);
  syncLight(snapshot);
  const fallbackPart = partMeshes[0] || null;
  decals.forEach((decal) => addDecal(decal, fallbackPart, version));
  addFaceFb(decals, version);
  applyDebugModes();
  requestAnimationFrame(() => {
    if (version !== renderVersion) return;
    apShMode();
  });

  if (selectedPath) highlightPath(selectedPath);
}

function renderDecalList(decals) {
  decalsData.innerHTML = "";
  if (decals.length === 0) {
    decalsData.textContent = "No decals were captured.";
    return;
  }
  for (const decal of decals.slice(0, 120)) {
    const card = document.createElement("div");
    card.className = "decal-card";
    card.textContent = `${decal.partPath || "?"} | face=${faceName(decal.face)} | texture=${decal.texture || "?"}`;
    decalsData.appendChild(card);
  }
}

function renderSnapshot(snapshot) {
  latestSnapshot = snapshot;
  const renderableParts = buildParts(snapshot);
  const serverId = snapshot.serverId || "desconhecido";
  const placeId = snapshot.placeId || "-";
  const time = snapshot.timestamp || "-";
  const partCount = renderableParts.length;
  const decalCount = Array.isArray(snapshot.decals) ? snapshot.decals.length : 0;

  snapshotMeta.textContent = `server: ${serverId} | placeId: ${placeId} | date: ${time} | parts: ${partCount} | decals: ${decalCount}`;
  lightingData.textContent = safeJson(snapshot.lighting);

  const decals = Array.isArray(snapshot.decals) ? snapshot.decals : [];
  renderDecalList(decals);

  drawSnap(snapshot);
  renderExplorer();
}

function rInfo() {
  if (!three) return {};
  const gl = three.renderer.getContext();
  return {
    pixelRatio: three.renderer.getPixelRatio(),
    viewportSize: {
      width: three.renderer.domElement.width,
      height: three.renderer.domElement.height,
    },
    rendererInfo: three.renderer.info,
    capabilities: {
      maxTextureSize: three.renderer.capabilities.maxTextureSize,
      maxCubemapSize: three.renderer.capabilities.maxCubemapSize,
      maxAnisotropy: three.renderer.capabilities.getMaxAnisotropy(),
      precision: three.renderer.capabilities.precision,
      isWebGL2: three.renderer.capabilities.isWebGL2,
    },
    glInfo: {
      version: gl ? gl.getParameter(gl.VERSION) : null,
      vendor: gl ? gl.getParameter(gl.VENDOR) : null,
      renderer: gl ? gl.getParameter(gl.RENDERER) : null,
      shadingLanguageVersion: gl ? gl.getParameter(gl.SHADING_LANGUAGE_VERSION) : null,
    },
    camera: {
      position: three.camera.position,
      rotation: three.camera.rotation,
      target: three.controls.target,
      fov: three.camera.fov,
      near: three.camera.near,
      far: three.camera.far,
    },
  };
}

async function downloadClientLogs() {
  if (!downloadLogsBtn) return;
  downloadLogsBtn.disabled = true;
  const oldLabel = downloadLogsBtn.textContent;
  downloadLogsBtn.textContent = "Gerando logs...";
  await new Promise((resolve) => setTimeout(resolve, 0));
  try {
    const payload = {
      generatedAt: new Date().toISOString(),
      app: "server-webview",
      userAgent: navigator.userAgent,
      language: navigator.language,
      location: window.location.href,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      selectedServerId: serverSelect.value || null,
      latestSnapshot,
      renderer: rInfo(),
      html: {
        title: document.title,
        url: document.URL,
        viewportElement: viewport ? viewport.outerHTML : null,
        documentHtmlPreview: String(document.documentElement.outerHTML || "").slice(0, 350000),
        documentHtmlPreviewTruncated: String(document.documentElement.outerHTML || "").length > 350000,
      },
      state: {
        servers,
        selectedPath,
        snapshotMetaText: snapshotMeta.textContent,
        explorerMetaText: explorerMeta.textContent,
      },
      logs: clientLogs,
    };

    const json = safeSerialize(payload) || "{}";
    const blob = new Blob([json], { type: "application/json" });
    const filename = `server-webview-client-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    addClientLog("info", "client logs downloaded", { filename, bytes: blob.size });
  } finally {
    downloadLogsBtn.disabled = false;
    downloadLogsBtn.textContent = oldLabel;
  }
}

async function downloadSnapshot() {
  const rowId = serverSelect.value;
  if (!rowId) {
    snapshotMeta.textContent = curMode === "rep" ? "Select a replay." : "Select a snapshot.";
    return;
  }

  const url =
    curMode === "rep"
      ? `/api/replay/latest?replayId=${encodeURIComponent(rowId)}`
      : `/api/snapshot/latest?serverId=${encodeURIComponent(rowId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not download the ${curMode === "rep" ? "replay" : "snapshot"} (${res.status}).`);
  }

  const row = await res.json();
  const json = JSON.stringify(row, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const fid = String(row.serverId || row.replayId || rowId).replace(/[^\w.-]+/g, "_");
  const stamp = String(row.timestamp || new Date().toISOString()).replace(/[:.]/g, "-");
  const filename = `server-webview-${curMode === "rep" ? "replay" : "snapshot"}-${fid}-${stamp}.json`;
  const dlUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = dlUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(dlUrl);
  addClientLog("info", "json downloaded", { mode: curMode, id: rowId, filename, bytes: blob.size });
}

function nodeMatches(node, filter) {
  if (!filter) return true;
  const text = `${node?.name || ""} ${node?.className || ""} ${node?.path || ""}`.toLowerCase();
  if (text.includes(filter)) return true;
  const children = Array.isArray(node?.children) ? node.children : [];
  return children.some((child) => nodeMatches(child, filter));
}

function setSelectedRow(row) {
  if (selectedRow) selectedRow.classList.remove("selected");
  selectedRow = row || null;
  if (selectedRow) selectedRow.classList.add("selected");
}

function selectNode(node, row) {
  selectedExplorerNode = node || null;
  selectedPath = String(node?.path || "");
  setSelectedRow(row);
  inspectorData.textContent = safeJson({
    path: node?.path || "",
    className: node?.className || "",
    properties: node?.properties || {},
  });
  highlightPath(selectedPath);
}

function buildNodeElement(node, depth, filter) {
  if (!nodeMatches(node, filter)) return null;

  const children = Array.isArray(node.children) ? node.children : [];
  const hasChildren = children.length > 0;
  const details = document.createElement("details");
  details.className = "explorer-node";
  details.open = depth < 1 || Boolean(filter);

  const summary = document.createElement("summary");
  const row = document.createElement("div");
  row.className = "explorer-row";
  const nameSpan = document.createElement("span");
  nameSpan.className = "node-name";
  nameSpan.textContent = node?.name || "?";
  const classSpan = document.createElement("span");
  classSpan.className = "node-class";
  classSpan.textContent = ` (${node?.className || "?"})`;
  row.appendChild(nameSpan);
  row.appendChild(classSpan);
  if (selectedPath && node.path === selectedPath) {
    row.classList.add("selected");
    selectedRow = row;
  }
  row.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    selectNode(node, row);
  });
  summary.appendChild(row);
  details.appendChild(summary);

  if (hasChildren) {
    const childWrap = document.createElement("div");
    childWrap.className = "explorer-children";
    for (const child of children) {
      const childEl = buildNodeElement(child, depth + 1, filter);
      if (childEl) childWrap.appendChild(childEl);
    }
    details.appendChild(childWrap);
  }

  return details;
}

function renderExplorer() {
  explorerTree.innerHTML = "";
  selectedRow = null;
  const filter = String(explorerSearch.value || "").trim().toLowerCase();
  const capturedRoots = Array.isArray(latestSnapshot?.explorer?.services)
    ? latestSnapshot.explorer.services
    : [];
  const roots = capturedRoots.length ? capturedRoots : buildSceneExplorer(latestSnapshot);

  if (!roots.length) {
    explorerMeta.textContent = "This snapshot has no objects to explore.";
    inspectorData.textContent = "{}";
    return;
  }

  const nodeCount = capturedRoots.length
    ? toNum(latestSnapshot.explorer.nodeCount, 0)
    : countExplorerNodes(roots);
  explorerMeta.textContent = capturedRoots.length
    ? `services: ${capturedRoots.length} · nodes: ${nodeCount}`
    : `${nodeCount} recorded objects · ${curMode === "rep" ? "state at the current time" : "snapshot tree"}`;

  for (const root of roots) {
    const nodeEl = buildNodeElement(root, 0, filter);
    if (nodeEl) explorerTree.appendChild(nodeEl);
  }

  if (!explorerTree.firstChild) {
    explorerTree.textContent = "No items match your search.";
  }
}

function countExplorerNodes(roots) {
  let count = 0;
  const queue = [...roots];
  while (queue.length) {
    const node = queue.pop();
    if (!node || typeof node !== "object") continue;
    count += 1;
    for (const child of node.children || []) queue.push(child);
  }
  return count;
}

function buildSceneExplorer(snapshot) {
  const parts = Array.isArray(snapshot?.parts) ? snapshot.parts : [];
  if (!parts.length) return [];
  const characters = new Map();
  const worldObjects = [];
  const decalsByPart = new Map();
  for (const decal of Array.isArray(snapshot.decals) ? snapshot.decals : []) {
    const path = String(decal?.partPath || "");
    if (!path) continue;
    const list = decalsByPart.get(path) || [];
    list.push(decal);
    decalsByPart.set(path, list);
  }

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const path = String(part.path || "");
    const node = {
      name: String(part.name || "Part"),
      className: String(part.className || "BasePart"),
      path,
      properties: part,
      children: (decalsByPart.get(path) || []).map((decal, index) => ({
        name: String(decal.name || `Decal ${index + 1}`),
        className: String(decal.className || "Decal"),
        path,
        properties: decal,
        children: [],
      })),
    };
    const characterName = String(part.characterName || "").trim();
    if (!characterName) {
      worldObjects.push(node);
      continue;
    }
    let character = characters.get(characterName);
    if (!character) {
      character = {
        name: characterName,
        className: "Model",
        path: "",
        properties: { recordedCharacter: true },
        children: [],
      };
      characters.set(characterName, character);
    }
    character.children.push(node);
  }

  const workspaceNode = {
    name: "Workspace",
    className: "Service",
    path: "",
    properties: { recordedObjects: parts.length },
    children: [],
  };
  const playerModels = [...characters.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (playerModels.length) workspaceNode.children.push({
    name: "Characters", className: "Folder", path: "", properties: {}, children: playerModels,
  });
  if (worldObjects.length) workspaceNode.children.push({
    name: "Objects", className: "Folder", path: "", properties: {}, children: worldObjects,
  });
  const roots = [workspaceNode];
  if (snapshot?.lighting && Object.keys(snapshot.lighting).length) {
    roots.push({
      name: "Lighting",
      className: "Service",
      path: "",
      properties: snapshot.lighting,
      children: [],
    });
  }
  return roots;
}

function replayExplorerKey(snapshot) {
  const parts = Array.isArray(snapshot?.parts) ? snapshot.parts : [];
  const decals = Array.isArray(snapshot?.decals) ? snapshot.decals : [];
  return [
    parts.map((part) => `${part.path || ""}\0${part.name || ""}\0${part.className || ""}\0${part.characterName || ""}`).join("\x01"),
    decals.map((decal) => `${decal.id || decal.instancePath || ""}\0${decal.partPath || ""}`).join("\x01"),
  ].join("\x02");
}

async function loadServers() {
  addClientLog("info", "loading servers");
  const previous = serverSelect.value;
  const res = await fetch(`/api/servers?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load snapshots.");

  const data = await res.json();
  servers = data.servers || [];

  serverSelect.innerHTML = "";
  if (servers.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No snapshots";
    serverSelect.appendChild(option);
    return;
  }

  for (const server of servers) {
    const option = document.createElement("option");
    option.value = server.serverId;
    option.textContent = `${server.serverId} (${server.placeId ?? "No place ID"})`;
    serverSelect.appendChild(option);
  }

  if (previous && servers.some((server) => server.serverId === previous)) {
    serverSelect.value = previous;
  } else {
    serverSelect.selectedIndex = 0;
  }
  renderServerCards();
}

async function loadReplays() {
  addClientLog("info", "loading replays");
  const previous = serverSelect.value;
  const res = await fetch(`/api/replays?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load replays.");

  const data = await res.json();
  replays = Array.isArray(data.replays) ? data.replays : [];

  serverSelect.innerHTML = "";
  if (replays.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No replays";
    serverSelect.appendChild(option);
    return;
  }

  for (const rep of replays) {
    const option = document.createElement("option");
    const rid = String(rep.replayId || "");
    option.value = rid;
    option.textContent = `${rep.replayName || rid} (${rid.slice(0, 8)}...)`;
    serverSelect.appendChild(option);
  }

  if (previous && replays.some((rep) => String(rep.replayId || "") === previous)) {
    serverSelect.value = previous;
  } else {
    serverSelect.selectedIndex = 0;
  }
  renderServerCards();
}

function applyModeUi() {
  if (panelTitle) panelTitle.textContent = curMode === "rep" ? "Replay Explorer" : "Snapshot Explorer";
  if (landingTitle) landingTitle.textContent = curMode === "rep" ? "Your replays" : "Your snapshots";
  if (landingSub) {
    landingSub.textContent =
      curMode === "rep"
        ? "Play a session, change playback speed, and explore every moment in 3D."
        : "Explore the objects, textures, and lighting in each snapshot.";
  }
  syncLibraryTabs();
}

async function loadList() {
  applyModeUi();
  if (curMode === "rep") {
    await loadReplays();
  } else {
    await loadServers();
  }
  syncLibraryTabs();
}

function showLanding() {
  sceneLoad += 1;
  displayedSceneKey = "";
  cancelAnimationFrame(repAnimation);
  repRun = false;
  if (landingView) landingView.style.display = "block";
  if (viewerSection) viewerSection.style.display = "none";
  hideThnt();
  setDebugMenuOpen(false);
  setSettingsMenuOpen(false);
  updateTopbarMode();
}

function showViewer() {
  if (landingView) landingView.style.display = "none";
  if (viewerSection) viewerSection.style.display = "";
  updateTopbarMode();
  requestAnimationFrame(() => onResize());
  syncThnt();
}

function renderServerCards() {
  if (!serverCards) return;
  serverCards.innerHTML = "";
  if (curMode === "rep") {
    if (!Array.isArray(replays) || replays.length === 0) {
      const empty = document.createElement("div");
      empty.className = "meta";
      empty.textContent = "No replays yet. Start a capture in the Roblox recorder and send your first replay.";
      serverCards.appendChild(empty);
      return;
    }
    for (const r of replays) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "server-card";
      const img = document.createElement("img");
      img.alt = "";
      if (r.thumbnailUrl) img.src = r.thumbnailUrl; else img.hidden = true;
      img.onerror = () => {
        img.style.display = "none";
      };
      const meta = document.createElement("div");
      meta.className = "server-card-meta";
      const nm = document.createElement("div");
      nm.className = "server-card-name";
      nm.textContent = String(r.replayName || r.replayId || "Replay");
      const rates = [Number(r.captureFps) || (Number(r.stepMs) > 0 ? 1000 / Number(r.stepMs) : 0),
        ...(Array.isArray(r.tickChanges) ? r.tickChanges.map((change) => Number(change.fps)) : [])]
        .filter((rate) => Number.isFinite(rate) && rate > 0);
      const badge = document.createElement("span");
      badge.className = "server-card-tps";
      const low = Math.round(Math.min(...rates));
      const high = Math.round(Math.max(...rates));
      badge.textContent = rates.length ? `${low === high ? high : `${low}–${high}`} TPS` : "TPS —";
      badge.title = "Configured capture ticks per second";
      if (rates.length) {
        const quality = Math.max(5, Math.min(60, low));
        const hue = quality <= 30 ? (quality - 5) / 25 * 120 : 120 + (quality - 30) / 30 * 90;
        badge.style.setProperty("--tps-color", `hsl(${hue} 85% 72%)`);
        badge.style.setProperty("--tps-bg", `hsl(${hue} 40% 12%)`);
      }
      const sub = document.createElement("div");
      sub.className = "server-card-sub";
      sub.textContent = `${fmtMs(r.durationMs)} · ${r.chatCount ?? 0} chat messages · ${r.placeId ?? "Local"}`;
      meta.appendChild(nm);
      meta.appendChild(sub);
      card.appendChild(img);
      card.appendChild(meta);
      card.appendChild(badge);
      card.addEventListener("click", async () => {
        serverSelect.value = String(r.replayId || "");
        showViewer();
        await loadCur();
      });
      serverCards.appendChild(card);
    }
    return;
  }
  if (!Array.isArray(servers) || servers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "meta";
    empty.textContent = "No snapshots available.";
    serverCards.appendChild(empty);
    return;
  }
  for (const s of servers) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "server-card";
    const img = document.createElement("img");
    img.alt = "";
    if (s.thumbnailUrl) img.src = s.thumbnailUrl; else img.hidden = true;
    img.onerror = () => {
      img.style.display = "none";
    };
    const meta = document.createElement("div");
    meta.className = "server-card-meta";
    const nm = document.createElement("div");
    nm.className = "server-card-name";
    nm.textContent = String(s.snapshotName || s.serverName || s.serverId || "Snapshot");
    const sub = document.createElement("div");
    sub.className = "server-card-sub";
    sub.textContent = `${s.serverId || "?"} • placeId ${s.placeId ?? "-"}`;
    meta.appendChild(nm);
    meta.appendChild(sub);
    card.appendChild(img);
    card.appendChild(meta);
    card.addEventListener("click", async () => {
      serverSelect.value = s.serverId;
      showViewer();
      await loadCur();
    });
    serverCards.appendChild(card);
  }
}
function findServer(serverId) {
  return servers.find((s) => String(s?.serverId || "") === String(serverId || ""));
}

function findReplay(replayId) {
  return replays.find((r) => String(r?.replayId || "") === String(replayId || ""));
}

function showThnt(text, mode = "info", autoHideMs = 4500) {
  const viewerOpen = viewerSection && viewerSection.style.display !== "none";
  if (!viewerOpen) {
    hideThnt();
    return;
  }
  if (!thumbHint || !thumbHintText) return;
  if (thTimer) {
    clearTimeout(thTimer);
    thTimer = null;
  }
  thumbHint.hidden = false;
  thumbHint.classList.remove("ok", "warn", "err");
  if (mode === "ok") thumbHint.classList.add("ok");
  if (mode === "warn") thumbHint.classList.add("warn");
  if (mode === "err") thumbHint.classList.add("err");
  thumbHintText.textContent = String(text || "").trim();
  if (autoHideMs > 0) {
    thTimer = setTimeout(() => {
      hideThnt();
    }, autoHideMs);
  }
}

function hideThnt() {
  if (!thumbHint) return;
  if (thTimer) {
    clearTimeout(thTimer);
    thTimer = null;
  }
  thumbHint.hidden = true;
}

function hintNth(itemId) {
  const sid = String(itemId || "");
  if (thMuteSv && thMuteSv === sid) return;
  if (sid && thClsSet.has(sid)) return;
  showThnt(
    curMode === "rep"
      ? "This replay has no thumbnail yet. Select Save scene thumbnail or press Z."
      : "This snapshot has no thumbnail yet. Select Save scene thumbnail or press Z.",
    "warn",
    7000
  );
}

function addFaceMesh(mesh, version) {
  if (!mesh) return;
  const part = mesh?.userData?.part || null;
  if (!isCharHead(part)) return;
  // A textured head already carries its custom face in the mesh UV map.
  // Adding Roblox's generic face decal on top creates a second, misaligned face.
  if (String(part.textureId || "").trim() || String(part.surfaceAppearance?.colorMap || "").trim()) return;
  const path = String(part?.path || "").trim();
  if (!path) return;
  const plane = addDecal(
    {
      partPath: path,
      face: "Front",
      texture: "rbxasset://textures/face.png",
      transparency: 0,
      color3: "#ffffff",
    },
    mesh,
    version
  );
  if (plane) plane.userData.faceFallback = true;
}

function addFaceFb(decals, version) {
  if (!three) return;
  const facePaths = new Set();
  for (const decal of Array.isArray(decals) ? decals : []) {
    const pp = String(decal?.partPath || "").trim();
    if (pp && visibleDecalTexture(decal) && faceName(decal?.face) === "Front") facePaths.add(pp);
  }
  for (const mesh of partMeshes) {
    const path = String(mesh?.userData?.part?.path || "").trim();
    if (!path || facePaths.has(path)) continue;
    addFaceMesh(mesh, version);
  }
}

async function syncThnt() {
  const viewerOpen = viewerSection && viewerSection.style.display !== "none";
  if (!viewerOpen) {
    if (saveThumbnailBtn) saveThumbnailBtn.disabled = true;
    hideThnt();
    return;
  }
  const sid = String(serverSelect?.value || "");
  if (!sid) {
    if (saveThumbnailBtn) saveThumbnailBtn.disabled = true;
    hideThnt();
    return;
  }
  const row = curMode === "rep" ? findReplay(sid) : findServer(sid);
  if (saveThumbnailBtn) saveThumbnailBtn.disabled = !row || Boolean(row.thumbnailUrl) || !three?.renderer || displayedSceneKey !== `${curMode}:${sid}`;
  if (row?.thumbnailUrl) {
    hideThnt();
    return;
  }
  if (thMuteSv && thMuteSv === sid) {
    hideThnt();
    return;
  }
  hideThnt();
}

async function upThumb() {
  const itemId = String(serverSelect?.value || "");
  if (!itemId || !three?.renderer || displayedSceneKey !== `${curMode}:${itemId}`) return;
  const row = curMode === "rep" ? findReplay(itemId) : findServer(itemId);
  if (row?.thumbnailUrl) {
    showThnt(curMode === "rep" ? "This replay already has a thumbnail." : "This snapshot already has a thumbnail.", "warn");
    return;
  }
  let imageData = "";
  try {
    if (three.composer?.render) {
      three.composer.render();
    } else if (three.scene && three.camera) {
      three.renderer.render(three.scene, three.camera);
    }
    imageData = three.renderer.domElement.toDataURL("image/jpeg", 0.82);
  } catch {
    showThnt("Could not create the thumbnail.", "err");
    return;
  }
  if (!imageData || imageData === "data:," || imageData.length < 128) {
    showThnt("Could not create the thumbnail.", "err");
    return;
  }
  try {
    const res = await fetch("/api/server/thumbnail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(curMode === "rep" ? { replayId: itemId, imageData } : { serverId: itemId, imageData }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(body?.error || "").toLowerCase();
      if (res.status === 409 || msg.includes("already has")) {
        showThnt(curMode === "rep" ? "This replay already has a thumbnail." : "This snapshot already has a thumbnail.", "warn");
      } else {
        showThnt("Could not upload the thumbnail.", "err");
      }
      return;
    }
    if (row) {
      row.thumbnailUrl =
        curMode === "rep"
          ? `/api/server/thumbnail?replayId=${encodeURIComponent(itemId)}&t=${Date.now()}`
          : `/api/server/thumbnail?serverId=${encodeURIComponent(itemId)}&t=${Date.now()}`;
    }
    thMuteSv = "";
    thClsSet.delete(itemId);
    renderServerCards();
    syncThnt();
    showThnt(curMode === "rep" ? "Replay thumbnail saved." : "Snapshot thumbnail saved.", "ok");
  } catch {
    showThnt("Could not upload the thumbnail.", "err");
  }
}

function fmtMs(ms) {
  const v = Math.max(0, Math.floor(Number(ms) || 0));
  const s = Math.floor(v / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function repUi(on) {
  if (replayBar) replayBar.style.display = on ? "" : "none";
  if (replayChatTitle) replayChatTitle.style.display = on ? "" : "none";
  if (replayChat) replayChat.style.display = on ? "grid" : "none";
}

function repRst() {
  if (!repDat) { repMap = new Map(); return; }
  repDat.reset();
  repMap = repDat.map;
}

function repSnapRaw() {
  const raw = repDat?.raw || {};
  return {
    serverId: raw.serverId || raw.replayId || "replay",
    placeId: raw.placeId || "-",
    timestamp: raw.timestamp || new Date().toISOString(),
    snapshotName: raw.replayName || "Replay",
    serverName: raw.replayName || "Replay",
    lighting: repDat?.lighting || raw?.base?.lighting || raw?.lighting || {},
    parts: repMap ? Array.from(repMap.values()) : [],
    decals: repDat ? Array.from(repDat.decalMap.values()) : [],
    explorer: { services: [], nodeCount: 0, maxDepth: 0 },
  };
}

function unindexReplayDecal(id) {
  const key = String(id || "");
  const path = repDecalPathById.get(key);
  if (!path) return "";
  const byPart = repDecalsByPart.get(path);
  byPart?.delete(key);
  if (byPart?.size === 0) repDecalsByPart.delete(path);
  repDecalPathById.delete(key);
  return path;
}

function indexReplayDecal(decal) {
  const id = String(decal?.id || "");
  const oldPath = unindexReplayDecal(id);
  const path = String(decal?.partPath || "");
  if (!id || !path) return oldPath;
  if (!repDecalsByPart.has(path)) repDecalsByPart.set(path, new Map());
  repDecalsByPart.get(path).set(id, decal);
  repDecalPathById.set(id, path);
  return oldPath;
}

function resetReplayDecalIndex() {
  repDecalsByPart = new Map();
  repDecalPathById = new Map();
  for (const decal of repDat?.decalMap?.values() || []) indexReplayDecal(decal);
}

function repLerp(a, b, t) {
  const av = Number(a || 0);
  const bv = Number(b || 0);
  return av + (bv - av) * t;
}

let replayPoseEuler, replayPoseFrom, replayPoseTo;
function repSet(mesh, p, alpha = 1, src = null) {
  if (!mesh || !p) return;
  const q = src || p;
  const px = alpha >= 1 ? p?.position?.x : repLerp(q?.position?.x, p?.position?.x, alpha);
  const py = alpha >= 1 ? p?.position?.y : repLerp(q?.position?.y, p?.position?.y, alpha);
  const pz = alpha >= 1 ? p?.position?.z : repLerp(q?.position?.z, p?.position?.z, alpha);
  const tr = alpha >= 1 ? p?.transparency : repLerp(q?.transparency, p?.transparency, alpha);
  mesh.position.set(Number(px || 0), Number(py || 0), Number(pz || 0));
  replayPoseEuler ||= new THREE.Euler(0, 0, 0, "YXZ");
  replayPoseFrom ||= new THREE.Quaternion();
  replayPoseTo ||= new THREE.Quaternion();
  const setRotation = (target, part) => target.setFromEuler(replayPoseEuler.set(
    THREE.MathUtils.degToRad(Number(part?.orientation?.x || 0)),
    THREE.MathUtils.degToRad(Number(part?.orientation?.y || 0)),
    THREE.MathUtils.degToRad(Number(part?.orientation?.z || 0)), "YXZ"));
  setRotation(replayPoseFrom, q);
  setRotation(replayPoseTo, p);
  mesh.quaternion.copy(replayPoseFrom.slerp(replayPoseTo, alpha));
  if (mesh.material) {
    const matArr = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of matArr) {
      if (!mat) continue;
      const tv = Math.max(0, Math.min(1, Number(tr || 0)));
      const transparent = tv > 0 || Boolean(mat.map && mat.userData?.replayTexturePolicy?.mode === "blend");
      if (mat.transparent !== transparent || mat.depthWrite !== !transparent) {
        mat.transparent = transparent; mat.depthWrite = !transparent; mat.needsUpdate = true;
      }
      mat.opacity = 1 - tv;
    }
  }
  const clothingOpacity = 1 - Math.max(0, Math.min(1, Number(tr || 0)));
  for (const overlay of mesh.userData.clothingOverlays || []) overlay.material.opacity = clothingOpacity;
}

function repNeedGeo(a, b) {
  if (!a || !b) return true;
  if (String(a.className || "") !== String(b.className || "")) return true;
  if (String(a.shape || "") !== String(b.shape || "")) return true;
  if (String(a.meshId || "") !== String(b.meshId || "")) return true;
  if (String(a.meshType || "") !== String(b.meshType || "")) return true;
  if (String(a.rigType || "") !== String(b.rigType || "")) return true;
  if (JSON.stringify(a.meshScale || null) !== JSON.stringify(b.meshScale || null)) return true;
  if (JSON.stringify(a.meshOffset || null) !== JSON.stringify(b.meshOffset || null)) return true;
  if (Number(a?.size?.x || 0) !== Number(b?.size?.x || 0)) return true;
  if (Number(a?.size?.y || 0) !== Number(b?.size?.y || 0)) return true;
  if (Number(a?.size?.z || 0) !== Number(b?.size?.z || 0)) return true;
  return false;
}

function repNeedMat(a, b) {
  if (!a || !b) return true;
  if (String(a.color3 || "") !== String(b.color3 || "")) return true;
  if (String(a.material || "") !== String(b.material || "")) return true;
  if (String(a.textureId || "") !== String(b.textureId || "")) return true;
  if (Boolean(a.doubleSided) !== Boolean(b.doubleSided)) return true;
  if (JSON.stringify(a.meshVertexColor || null) !== JSON.stringify(b.meshVertexColor || null)) return true;
  if (JSON.stringify(a.surfaceAppearance || null) !== JSON.stringify(b.surfaceAppearance || null)) return true;
  if (JSON.stringify(a.clothing || null) !== JSON.stringify(b.clothing || null)) return true;
  return false;
}

function repDel(path) {
  const k = String(path || "");
  const mesh = partByPath.get(k);
  if (!mesh || !three) return;
  if (mesh.userData.part?.lights?.length) replayLightsDirty = true;
  for (let i = decalPlanes.length - 1; i >= 0; i -= 1) {
    if (decalPlanes[i].parent === mesh) disposeDecalPlane(decalPlanes[i]);
  }
  const idx = partMeshes.indexOf(mesh);
  if (idx >= 0) partMeshes.splice(idx, 1);
  partByPath.delete(k);
  if (selectedMesh === mesh) clearHighlight();
  removeHeadLabel(mesh);
  three.scene.remove(mesh);
  clearStudOverlay(mesh);
  clearChunkMeshes(mesh);
  clearClothingOverlays(mesh);
  if (mesh.geometry) mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => {
      if (m?.map) m.map.dispose();
      m?.dispose?.();
    });
  } else if (mesh.material) {
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.dispose();
  }
}

function repAdd(p, idx) {
  if (!p || !three) return;
  if (p.lights?.length) replayLightsDirty = true;
  const k = String(p.path || "");
  if (!k) return;
  if (partByPath.has(k)) {
    repDel(k);
  }
  const mesh = buildPartMesh(p, idx);
  mesh.userData.part = p;
  three.scene.add(mesh);
  partMeshes.push(mesh);
  partByPath.set(k, mesh);
  addHeadLabel(mesh);
  const v = renderVersion;
  if (dbg.meshBoxesOn || String(p?.className || "") !== "MeshPart") {
    applyMeshGeo(mesh, p, v);
  }
  applyMatTex(mesh, p, v);
  const decals = Array.from(repDecalsByPart.get(k)?.values() || []);
  for (const decal of decals) addDecal(decal, mesh, v);
  if (!decals.some((decal) => visibleDecalTexture(decal) && faceName(decal.face) === "Front")) addFaceMesh(mesh, v);
}

function removeFallbackFace(part) {
  if (!part) return;
  for (let i = decalPlanes.length - 1; i >= 0; i -= 1) {
    const plane = decalPlanes[i];
    if (plane.parent === part && plane.userData.faceFallback) disposeDecalPlane(plane);
  }
}

function ensureFallbackFace(path) {
  const part = partByPath.get(String(path || ""));
  if (!part || !isCharHead(part.userData?.part)) return;
  const explicit = repDecalsByPart.get(String(path || ""));
  if (Array.from(explicit?.values() || []).some((decal) => visibleDecalTexture(decal) && faceName(decal.face) === "Front")) return;
  if (decalPlanes.some((plane) => plane.parent === part && plane.userData.faceFallback)) return;
  addFaceMesh(part, renderVersion);
}

function repDecalUpsert(decal) {
  const id = String(decal?.id || "");
  if (!id) return;
  removeDecalPlane(id);
  const oldPath = indexReplayDecal(decal);
  const path = String(decal.partPath || "");
  const part = partByPath.get(path);
  if (part && visibleDecalTexture(decal) && faceName(decal.face) === "Front") removeFallbackFace(part);
  if (part) addDecal(decal, part, renderVersion);
  if (oldPath) ensureFallbackFace(oldPath);
  if (path) ensureFallbackFace(path);
  repDecalsPanelDirty = true;
}

function repDecalRemove(id) {
  const path = unindexReplayDecal(id);
  removeDecalPlane(id);
  if (path) ensureFallbackFace(path);
  repDecalsPanelDirty = true;
}

function repUpd(p, idx, old) {
  if (!p) return;
  const k = String(p.path || "");
  if (!k) return;
  let mesh = partByPath.get(k);
  if (!mesh) {
    repAdd(p, idx);
    return;
  }
  if (repNeedGeo(old, p)) {
    repDel(k);
    repAdd(p, idx);
    return;
  }
  if (repNeedMat(old, p)) {
    const v = renderVersion;
    applyMatTex(mesh, p, v);
  }
  const previousPart = mesh.userData.part;
  if (JSON.stringify(previousPart?.lights) !== JSON.stringify(p.lights)) replayLightsDirty = true;
  mesh.userData.part = p;
  if (previousPart?.characterName !== p.characterName || previousPart?.name !== p.name) {
    removeHeadLabel(mesh);
    addHeadLabel(mesh);
  }
  repSet(mesh, p, 1, null);
}

function repBuild(cam = false) {
  const snap = repSnapRaw();
  latestSnapshot = snap;
  drawSnap(snap, { cam });
  renderDecalList(snap.decals);
  repDecalsPanelDirty = false;
  replayLightsDirty = false;
  repCam = false;
}

function repLrpToNext() {
  if (!repDat || !repMap) return;
  for (const { path, source, target, alpha } of repDat.nextInterpolations(repMs)) {
    const mesh = partByPath.get(path);
    if (!mesh) continue;
    repSet(mesh, target, alpha, source);
    repInterpolatedPaths.add(path);
  }
}

function repChatDraw() {
  if (!replayChat || !repDat) return;
  const count = repDat.chatCountAt(repMs);
  if (repChatRenderedData === repDat && repChatRenderedCount === count) return;
  repChatRenderedData = repDat;
  repChatRenderedCount = count;
  const pick = repDat.chat.slice(Math.max(0, count - 45), count);
  replayChat.innerHTML = "";
  if (pick.length === 0) {
    replayChat.textContent = "No chat messages at this time.";
    return;
  }
  for (const c of pick) {
    const row = document.createElement("div");
    row.className = "replay-chat-row";
    const t = fmtMs(Number(c?.t || 0));
    const n = String(c?.name || "Player");
    const m = String(c?.msg || "");
    row.textContent = `[${t}] ${n}: ${m}`;
    replayChat.appendChild(row);
  }
}

function repMeta() {
  if (!repDat) return;
  const raw = repDat.raw || {};
  const frm = Array.isArray(repDat.frames) ? repDat.frames.length : 0;
  const chat = Array.isArray(repDat.chat) ? repDat.chat.length : 0;
  const bps = repMap ? repMap.size : 0;
  const decals = repDat.decalMap.size;
  snapshotMeta.textContent =
    `replayId: ${raw.replayId || "-"} | placeId: ${raw.placeId || "-"} | ` +
    `time: ${fmtMs(repMs)} / ${fmtMs(repDat.dur)} | capture: ${raw.captureFps || "?"} ticks/s | speed: ${repSpeed}× | parts: ${bps} | decals: ${decals} | frames: ${frm} | chat: ${chat}`;
}

function repUiSync() {
  if (!repDat) return;
  if (replaySeek) {
    replaySeek.max = String(Math.max(1, Math.floor(repDat.dur)));
    replaySeek.value = String(Math.floor(repMs));
  }
  if (replayTime) replayTime.textContent = `${fmtMs(repMs)} / ${fmtMs(repDat.dur)}`;
  if (replayPlayBtn) replayPlayBtn.textContent = repRun ? "Pause" : "Play";
}

function repDraw(force = false) {
  if (!repDat) return;
  const now = performance.now();
  const tickChanges = repDat?.raw?.tickChanges || [];
  let captureFps = Number(repDat?.raw?.captureFps || (1000 / Number(repDat?.raw?.stepMs || 100))) || 10;
  for (const change of tickChanges) {
    if (Number(change.t || 0) > repMs) break;
    captureFps = Number(change.fps || captureFps);
  }
  const drawInterval = Math.max(16, 1000 / Math.max(1, captureFps * repSpeed));
  if (!force && now - repRdrAt < drawInterval) return;
  repRdrAt = now;
  for (const path of repInterpolatedPaths) {
    const part = repMap?.get(path);
    if (part) repSet(partByPath.get(path), part);
  }
  repInterpolatedPaths.clear();
  repLrpToNext();
  applyRecordedCamera();
  if (replayLightsDirty) { addLights(repSnapRaw()); replayLightsDirty = false; }
  repMeta();
  repChatDraw();
  repUiSync();
  if (repDecalsPanelDirty) {
    renderDecalList(Array.from(repDat.decalMap.values()));
    repDecalsPanelDirty = false;
  }
  if (replayExplorerDirty && (force || now - replayExplorerLastAt >= 350)) {
    latestSnapshot = repSnapRaw();
    const nextSignature = replayExplorerKey(latestSnapshot);
    if (nextSignature !== replayExplorerSignature) {
      renderExplorer();
      replayExplorerSignature = nextSignature;
    } else if (selectedPath) {
      const selected = repMap?.get(selectedPath);
      if (selected) inspectorData.textContent = safeJson(selected);
    }
    replayExplorerDirty = false;
    replayExplorerLastAt = now;
  }
}

function repSeek(ms, force = false) {
  if (!repDat) return;
  repMs = repDat.seek(ms, {
    onReset() {
      repMap = repDat.map;
      resetReplayDecalIndex();
      replayExplorerDirty = true;
      repBuild(false);
    },
    onChange(change) {
      replayExplorerDirty = true;
      if (change.type === "add") repAdd(change.part, change.index);
      else if (change.type === "update") repUpd(change.part, change.index, change.previous);
      else if (change.type === "remove") repDel(change.path);
      else if (change.type === "decal-add" || change.type === "decal-update") repDecalUpsert(change.decal);
      else if (change.type === "decal-remove") repDecalRemove(change.id);
      else if (change.type === "lighting") {
        latestSnapshot = repSnapRaw();
        syncLight(latestSnapshot);
        lightingData.textContent = safeJson(change.lighting);
        if (selectedExplorerNode?.name === "Lighting") inspectorData.textContent = safeJson(change.lighting);
      }
    },
  });
  repDraw(force);
}

function repTick(now) {
  if (!repRun || !repDat) return;
  if (!repLast) repLast = now;
  const dt = Math.max(0, now - repLast);
  repLast = now;
  repSeek(repMs + dt * repSpeed, false);
  if (repMs >= repDat.dur) {
    repRun = false;
    repUiSync();
    return;
  }
  repAnimation = requestAnimationFrame(repTick);
}

function repLoad(raw) {
  cancelAnimationFrame(repAnimation);
  repInterpolatedPaths.clear();
  repChatRenderedData = null;
  repChatRenderedCount = -1;
  repDat = new ReplayTimeline(raw, normalizePart);
  resetReplayDecalIndex();
  const cameraButton = document.getElementById("replayCamera");
  if (cameraButton) cameraButton.disabled = repDat.cameraFrames.length === 0;
  repMs = 0;
  repRun = false;
  repLast = 0;
  repRdrAt = 0;
  repCam = true;
  replayExplorerDirty = true;
  replayExplorerSignature = "";
  repRst();
  repBuild(true);
  repDraw(true);
}

async function loadReplay() {
  assetProgressDismissed = false;
  const loadId = ++sceneLoad;
  displayedSceneKey = "";
  if (saveThumbnailBtn) saveThumbnailBtn.disabled = true;
  const replayId = String(serverSelect?.value || "");
  addClientLog("info", "loading replay", { replayId });
  setRenderStatus("Loading…");
  if (!replayId) {
    repUi(false);
    snapshotMeta.textContent = "Select a replay.";
    drawEmpty();
    explorerTree.innerHTML = "";
    explorerMeta.textContent = "No object tree loaded.";
    inspectorData.textContent = "{}";
    setRenderStatus("");
    return;
  }

  const res = await fetch(
    `/api/replay/latest?replayId=${encodeURIComponent(replayId)}&t=${Date.now()}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    repUi(false);
    snapshotMeta.textContent = "Could not load the replay.";
    drawEmpty();
    setRenderStatus("");
    return;
  }

  const rep = await res.json();
  if (loadId !== sceneLoad || curMode !== "rep") return;
  if (viewerContext) viewerContext.textContent = String(rep?.replayName || "Replay");
  lightingData.textContent = safeJson(rep?.base?.lighting || rep?.lighting || {});
  decalsData.innerHTML = "";
  explorerTree.innerHTML = "";
  explorerMeta.textContent = "The object tree is not available in this replay.";
  inspectorData.textContent = safeJson({
    replayName: rep?.replayName || "",
    durationMs: rep?.durationMs ?? rep?.durMs ?? 0,
    stepMs: rep?.stepMs || 0,
    chatCount: Array.isArray(rep?.chatEvents) ? rep.chatEvents.length : 0,
  });

  repUi(true);
  onResize();
  shdReady = false;
  apShMode();
  setRenderStatus("Preparing the 3D scene…");
  repLoad(rep);
  displayedSceneKey = `rep:${replayId}`;
  if (three?.renderer && three?.scene && three?.camera) {
    try {
      if (typeof three.renderer.compileAsync === "function") {
        await three.renderer.compileAsync(three.scene, three.camera);
      } else if (typeof three.renderer.compile === "function") {
        three.renderer.compile(three.scene, three.camera);
      }
    } catch {
    } finally {
      if (loadId === sceneLoad && curMode === "rep") {
        shdReady = true;
        apShMode();
      }
    }
  }
  setRenderStatus("");
  syncThnt();
}

async function loadCur() {
  if (curMode === "rep") {
    await loadReplay();
  } else {
    await loadSnapshot();
  }
}

async function loadSnapshot() {
  assetProgressDismissed = false;
  const loadId = ++sceneLoad;
  displayedSceneKey = "";
  if (saveThumbnailBtn) saveThumbnailBtn.disabled = true;
  repRun = false;
  cancelAnimationFrame(repAnimation);
  if (curMode !== "snap") {
    return;
  }
  repRun = false;
  repDat = null;
  repUi(false);
  const serverId = serverSelect.value;
  addClientLog("info", "loading snapshot", { serverId });
  setRenderStatus("Loading…");
  if (!serverId) {
    snapshotMeta.textContent = "Select a snapshot.";
    drawEmpty();
    explorerTree.innerHTML = "";
    explorerMeta.textContent = "No object tree loaded.";
    inspectorData.textContent = "{}";
    setRenderStatus("");
    return;
  }

  const res = await fetch(
    `/api/snapshot/latest?serverId=${encodeURIComponent(serverId)}&t=${Date.now()}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    snapshotMeta.textContent = "Could not load the snapshot.";
    drawEmpty();
    addClientLog("warn", "snapshot request failed", { serverId, status: res.status });
    setRenderStatus("");
    return;
  }

  const snapshot = await res.json();
  if (loadId !== sceneLoad || curMode !== "snap") return;
  if (viewerContext) viewerContext.textContent = String(snapshot?.snapshotName || snapshot?.serverName || "Snapshot");
  onResize();
  shdReady = false;
  apShMode();
  setRenderStatus("Preparing the 3D scene…");
  renderSnapshot(snapshot);
  displayedSceneKey = `snap:${serverId}`;
  if (three?.renderer && three?.scene && three?.camera) {
    try {
      if (typeof three.renderer.compileAsync === "function") {
        await three.renderer.compileAsync(three.scene, three.camera);
      } else if (typeof three.renderer.compile === "function") {
        three.renderer.compile(three.scene, three.camera);
      }
    } catch {
    } finally {
      if (loadId === sceneLoad && curMode === "snap") {
        shdReady = true;
        apShMode();
      }
    }
  }
  setRenderStatus("");
  syncThnt();
}

function onResize() {
  if (!three) return;
  const w = Math.max(320, viewport.clientWidth);
  const h = Math.max(220, viewport.clientHeight);
  three.renderer.setSize(w, h);
  if (three.composer?.setSize) three.composer.setSize(w, h);
  if (three.bloom?.setSize) three.bloom.setSize(w, h);
  if (three.post) three.post.uniforms.resolution.value.set(w, h);
  three.camera.aspect = w / h;
  three.camera.updateProjectionMatrix();
}

async function bootstrap() {
  wireClientLoggers();
  wireDebugMenu();
  addClientLog("info", "bootstrap started");
  const threeReady = await setupThree();
  if (!threeReady) document.getElementById("appStatus").textContent = "The 3D renderer is unavailable. Check your connection and WebGL support.";
  if (threeReady) {
    onResize();
    drawEmpty();
  }

  try {
    curMode = modeSelect?.value === "rep" ? "rep" : "snap";
    await loadList();
    const opened = await openShared();
    if (!opened) showLanding();
  } catch (error) {
    document.getElementById("appStatus").textContent = `Could not load the viewer: ${error.message}`;
    snapshotMeta.textContent = `Error: ${error.message}`;
    addClientLog("error", "bootstrap failed", { message: error.message, stack: error.stack });
  }
}

function syncFullscreenBtn() {
  if (!fullscreenBtn) return;
  const active = document.fullscreenElement === document.documentElement;
  fullscreenBtn.textContent = active ? "Exit fullscreen" : "Fullscreen";
}

function curShareUrl() {
  const url = new URL(window.location.href);
  const id = String(serverSelect?.value || "").trim();
  url.searchParams.delete("mode");
  url.searchParams.delete("id");
  if (!id) return url.toString();
  url.searchParams.set("mode", curMode === "rep" ? "rep" : "snap");
  url.searchParams.set("id", id);
  return url.toString();
}

async function copyShareUrl() {
  const id = String(serverSelect?.value || "").trim();
  if (!id) {
    snapshotMeta.textContent = curMode === "rep" ? "Select a replay." : "Select a snapshot.";
    return false;
  }
  const link = curShareUrl();
  const ok = await copyText(link);
  snapshotMeta.textContent = ok ? "Share link copied." : "Could not copy the share link.";
  addClientLog(ok ? "info" : "warn", "share link", { mode: curMode, id, link, ok });
  return ok;
}

async function openShared() {
  const url = new URL(window.location.href);
  const id = String(globalThis.__REPLAY_OFFLINE__?.id || url.searchParams.get("id") || "").trim();
  const mode = String(globalThis.__REPLAY_OFFLINE__?.mode || url.searchParams.get("mode") || "").trim().toLowerCase();
  if (!id) return false;
  curMode = mode === "rep" ? "rep" : "snap";
  if (modeSelect) modeSelect.value = curMode;
  await loadList();
  serverSelect.value = id;
  showViewer();
  await loadCur();
  return true;
}

function setMobileToolsOpen(open) {
  const button = document.getElementById("mobileToolsBtn");
  const tools = document.getElementById("toolbarExtras");
  if (!button || !tools) return;
  tools.classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
  if (!open) {
    setDebugMenuOpen(false);
    setSettingsMenuOpen(false);
  }
}

function setSidebarOpen(open) {
  if (!viewerSidebar || !sidebarToggleBtn) return;
  const next = Boolean(open);
  const wasOpen = document.body.classList.contains("sidebar-open");
  document.body.classList.toggle("sidebar-open", next);
  viewerSidebar.inert = !next;
  sidebarToggleBtn.setAttribute("aria-expanded", String(next));
  if (next) sidebarCloseBtn?.focus({ preventScroll: true });
  else if (wasOpen) document.getElementById("viewerMenuBtn")?.focus({ preventScroll: true });
}

function setSidebarView(view) {
  const showExplorer = view !== "details";
  if (sidebarExplorerPane) sidebarExplorerPane.hidden = !showExplorer;
  if (sidebarDetailsPane) sidebarDetailsPane.hidden = showExplorer;
  for (const button of document.querySelectorAll("[data-sidebar-view]")) {
    button.setAttribute("aria-pressed", String(button.dataset.sidebarView === (showExplorer ? "explorer" : "details")));
  }
  if (panelTitle) panelTitle.textContent = showExplorer ? "Replay Explorer" : "Scene details";
}

function syncLibraryTabs() {
  for (const button of libraryTabs?.querySelectorAll("[data-library-mode]") || []) {
    button.setAttribute("aria-pressed", String(button.dataset.libraryMode === curMode));
  }
}

function setViewerMenuOpen(open) {
  const menu = document.getElementById("viewerMenu");
  const button = document.getElementById("viewerMenuBtn");
  if (!menu || !button) return;
  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  if (!open) { setDebugMenuOpen(false); setSettingsMenuOpen(false); }
}

function updateTopbarMode() {
  const viewerOpen = viewerSection && viewerSection.style.display !== "none";
  document.body.classList.toggle("is-viewer", Boolean(viewerOpen));
  const mobileToolsBtn = document.getElementById("mobileToolsBtn");
  if (sidebarToggleBtn) sidebarToggleBtn.style.display = viewerOpen ? "" : "none";
  if (mobileToolsBtn) mobileToolsBtn.style.display = viewerOpen ? "" : "none";
  if (!viewerOpen) { setMobileToolsOpen(false); setViewerMenuOpen(false); }
  if (refreshBtn) refreshBtn.style.display = viewerOpen ? "none" : "";
  if (homeBtn) homeBtn.style.display = viewerOpen ? "" : "none";
  if (shareBtn) shareBtn.style.display = viewerOpen ? "" : "none";
  if (fullscreenBtn) fullscreenBtn.style.display = viewerOpen ? "" : "none";
  if (debugBtn) debugBtn.style.display = viewerOpen ? "" : "none";
  if (settingsBtn) settingsBtn.style.display = viewerOpen ? "" : "none";
  if (serverWrap) serverWrap.style.display = "none";
  if (modeWrap) modeWrap.style.display = viewerOpen ? "flex" : "none";
  if (debugMenu && !viewerOpen) setDebugMenuOpen(false);
  if (settingsMenu && !viewerOpen) setSettingsMenuOpen(false);
  if (!viewerOpen) setSidebarOpen(false);
  syncLibraryTabs();
}

function syncDebugUi() {
  if (dbgShaders) dbgShaders.checked = dbg.shadersOn;
  if (dbgSmoothShadows) dbgSmoothShadows.checked = dbg.smoothShadows;
  if (dbgFps) dbgFps.checked = dbg.showFps;
  if (dbgTextures) dbgTextures.checked = dbg.texturesOn;
  if (dbgFog) dbgFog.checked = dbg.fogOn;
  if (dbgCulling) dbgCulling.checked = dbg.cullingOn;
  if (dbgPlayerLabels) dbgPlayerLabels.checked = dbg.playerLabelsOn;
  if (dbgMeshBoxes) dbgMeshBoxes.checked = dbg.meshBoxesOn;
  if (dbgTexPathLabels) dbgTexPathLabels.checked = dbg.texturePathLabelsOn;
  if (dbgFxPlaceholders) dbgFxPlaceholders.checked = dbg.fxPlaceholdersOn;
  if (dbgControls) dbgControls.checked = dbg.controlsOn;
  if (dbgWireframe) dbgWireframe.checked = dbg.wireframeOn;
}

function syncSettingsUi() {
  if (setFov) setFov.value = String(Math.round(toNum(camCfg.fov, 55)));
  if (setFovValue) setFovValue.textContent = String(Math.round(toNum(camCfg.fov, 55)));
  if (setCamSens) setCamSens.value = String(Math.round(Math.max(20, Math.min(300, camCfg.sensitivityMult * 100))));
  if (setCamSensValue) setCamSensValue.textContent = `${camCfg.sensitivityMult.toFixed(2)}x`;
  if (setLookBtn) setLookBtn.textContent = `Look button: ${camCfg.lookButton === "RMB" ? "right" : "left"}`;
}

function setDebugMenuOpen(open) {
  if (!debugMenu || !debugBtn) return;
  debugMenu.hidden = !open;
  debugBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function setSettingsMenuOpen(open) {
  if (!settingsMenu || !settingsBtn) return;
  settingsMenu.hidden = !open;
  settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
}
function wireDebugMenu() {
  syncDebugUi();
  syncSettingsUi();
  applyControlsHelpMode();
  if (!debugBtn || !debugMenu || !settingsBtn || !settingsMenu) return;

  debugBtn.addEventListener("click", (event) => {
    event.preventDefault();
    setSettingsMenuOpen(false);
    setDebugMenuOpen(debugMenu.hidden);
  });
  settingsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    setDebugMenuOpen(false);
    setSettingsMenuOpen(settingsMenu.hidden);
  });

  const onDocClick = (event) => {
    const t = event.target;
    if (!debugMenu.contains(t) && !debugBtn.contains(t)) {
      setDebugMenuOpen(false);
    }
    if (!settingsMenu.contains(t) && !settingsBtn.contains(t)) {
      setSettingsMenuOpen(false);
    }
  };
  document.addEventListener("click", onDocClick);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      setDebugMenuOpen(false);
      setSettingsMenuOpen(false);
    }
  });

  if (dbgShaders) {
    dbgShaders.addEventListener("change", () => {
      dbg.shadersOn = Boolean(dbgShaders.checked);
      apShMode();
    });
  }
  document.getElementById("shadowRange")?.addEventListener("change", event => {
    dbg.shadowRange = event.target.value;
    updateShadowCoverage(performance.now(), true);
  });
  document.getElementById("sceneBrightness")?.addEventListener("input", event => {
    dbg.sceneBrightness = Math.max(0.5, Math.min(3, Number(event.target.value) || 1));
    document.getElementById("sceneBrightnessValue").textContent = `${dbg.sceneBrightness.toFixed(2)}×`;
    if (latestSnapshot) syncLight(latestSnapshot);
  });
  document.getElementById("dbgSmoothLighting")?.addEventListener("change", event => {
    dbg.smoothLighting = event.target.checked;
    for (const mesh of partMeshes) {
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        mat.flatShading = !dbg.smoothLighting; mat.needsUpdate = true;
      }
    }
  });
  if (dbgSmoothShadows) {
    dbgSmoothShadows.addEventListener("change", () => {
      dbg.smoothShadows = Boolean(dbgSmoothShadows.checked);
      apShdwMd();
    });
  }
  if (dbgFps) {
    dbgFps.addEventListener("change", () => {
      dbg.showFps = Boolean(dbgFps.checked);
      if (!dbg.showFps && fpsOverlayEl) fpsOverlayEl.style.display = "none";
      fpsLastAt = 0;
      fpsFrameCount = 0;
    });
  }
  if (dbgTextures) {
    dbgTextures.addEventListener("change", () => {
      dbg.texturesOn = Boolean(dbgTextures.checked);
      for (const mesh of partMeshes) applyTextureModeToMesh(mesh);
    });
  }
  if (dbgFog) {
    dbgFog.addEventListener("change", () => {
      dbg.fogOn = Boolean(dbgFog.checked);
      if (latestSnapshot) syncLight(latestSnapshot);
      else if (three?.scene) three.scene.fog = dbg.fogOn ? new THREE.Fog("#374151", 30, 230) : null;
    });
  }
  if (dbgCulling) {
    dbgCulling.addEventListener("change", () => {
      dbg.cullingOn = Boolean(dbgCulling.checked);
      if (!dbg.cullingOn) {
        for (const mesh of allRenderTargets()) {
          if (sourceOf(mesh)?.userData?.forceHide) mesh.visible = false;
          else setCameraVisibility(mesh, true);
        }
        for (const mesh of partMeshes) {
          if (mesh.userData?.studOverlay) {
            mesh.userData.studOverlay.visible = cameraSees(mesh, three?.camera);
          }
        }
      }
    });
  }
  if (dbgPlayerLabels) {
    dbgPlayerLabels.addEventListener("change", () => {
      dbg.playerLabelsOn = Boolean(dbgPlayerLabels.checked);
      applyPlayerLabelMode();
    });
  }
  if (dbgMeshBoxes) {
    dbgMeshBoxes.addEventListener("change", async () => {
      dbg.meshBoxesOn = Boolean(dbgMeshBoxes.checked);
      applyMeshSphereMode();
      if (dbg.meshBoxesOn) assetLoads.retryFailed();
    });
  }
  if (dbgTexPathLabels) {
    dbgTexPathLabels.addEventListener("change", () => {
      dbg.texturePathLabelsOn = Boolean(dbgTexPathLabels.checked);
      applyTexturePathLabelMode();
    });
  }
  if (dbgFxPlaceholders) {
    dbgFxPlaceholders.addEventListener("change", () => {
      dbg.fxPlaceholdersOn = Boolean(dbgFxPlaceholders.checked);
      applyFxPlaceholderMode();
    });
  }
  if (dbgControls) {
    dbgControls.addEventListener("change", () => {
      dbg.controlsOn = Boolean(dbgControls.checked);
      applyControlsHelpMode();
    });
  }
  if (dbgWireframe) {
    dbgWireframe.addEventListener("change", () => {
      dbg.wireframeOn = Boolean(dbgWireframe.checked);
      for (const mesh of partMeshes) applyWireframeModeToMesh(mesh);
      for (const marker of meshSpheres) applyWireframeModeToMesh(marker);
    });
  }
  if (setFov) {
    const onFov = () => {
      const next = Math.max(35, Math.min(110, Number(setFov.value || 55)));
      camCfg.fov = next;
      if (setFovValue) setFovValue.textContent = String(Math.round(next));
      if (three?.camera) {
        three.camera.fov = next;
        three.camera.updateProjectionMatrix();
      }
    };
    setFov.addEventListener("input", onFov);
    setFov.addEventListener("change", onFov);
  }
  if (setCamSens) {
    const onSens = () => {
      const raw = Math.max(20, Math.min(300, Number(setCamSens.value || 100)));
      camCfg.sensitivityMult = raw / 100;
      cameraLookSensitivity = 0.0022 * camCfg.sensitivityMult;
      if (setCamSensValue) setCamSensValue.textContent = `${camCfg.sensitivityMult.toFixed(2)}x`;
    };
    setCamSens.addEventListener("input", onSens);
    setCamSens.addEventListener("change", onSens);
  }
  if (setLookBtn) {
    setLookBtn.addEventListener("click", () => {
      camCfg.lookButton = camCfg.lookButton === "RMB" ? "LMB" : "RMB";
      cameraLookButton = camCfg.lookButton;
      setLookBtn.textContent = `Look button: ${camCfg.lookButton === "RMB" ? "right" : "left"}`;
    });
  }
}

refreshBtn.addEventListener("click", async () => {
  try {
    await loadList();
    const viewerOpen = viewerSection && viewerSection.style.display !== "none";
    if (viewerOpen && serverSelect.value) {
      await loadCur();
    } else {
      showLanding();
    }
    addClientLog("info", "list refreshed", { mode: curMode });
  } catch (error) {
    snapshotMeta.textContent = `Refresh failed: ${error.message}`;
    addClientLog("error", "manual refresh failed", { message: error.message, stack: error.stack });
  }
});

explorerSearch.addEventListener("input", () => renderExplorer());
serverSelect.addEventListener("change", loadCur);
if (modeSelect) {
  modeSelect.addEventListener("change", async () => {
    curMode = modeSelect.value === "rep" ? "rep" : "snap";
    syncLibraryTabs();
    try {
      if (viewerSection && viewerSection.style.display !== "none") {
        showLanding();
      }
      await loadList();
      showLanding();
    } catch (error) {
      snapshotMeta.textContent = `Could not change viewer mode: ${error.message}`;
      addClientLog("error", "mode switch failed", { message: error.message, stack: error.stack });
    }
  });
}
window.addEventListener("resize", onResize);
window.addEventListener("keydown", (event) => {
  const tag = String(document.activeElement?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  if (event.code === "KeyJ" && !event.repeat) {
    event.preventDefault();
    tpToMouse();
    return;
  }
  if (event.code === "KeyP" && !event.repeat) {
    event.preventDefault();
    copyHoverInfo();
    return;
  }
  if (event.code === "KeyL" && !event.repeat) {
    event.preventDefault();
    deleteHoveredPart();
    return;
  }
  if (event.code === "KeyZ" && !event.repeat) {
    event.preventDefault();
    upThumb();
    return;
  }
  pressedKeys.add(event.code);
});
window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
});
if (downloadLogsBtn) {
  downloadLogsBtn.style.pointerEvents = "auto";
  downloadLogsBtn.addEventListener("click", () => {
    addClientLog("info", "download logs button clicked");
    downloadClientLogs();
  });
}

if (downloadSnapshotBtn) {
  downloadSnapshotBtn.style.pointerEvents = "auto";
  downloadSnapshotBtn.addEventListener("click", async () => {
    try {
      await downloadSnapshot();
    } catch (error) {
      snapshotMeta.textContent = `Could not download the snapshot: ${error.message}`;
      addClientLog("error", "snapshot download failed", { message: error.message, stack: error.stack });
    }
  });
}

if (saveThumbnailBtn) {
  saveThumbnailBtn.addEventListener("click", async () => {
    setViewerMenuOpen(false);
    saveThumbnailBtn.disabled = true;
    try {
      await upThumb();
    } finally {
      syncThnt();
    }
  });
}

if (shareBtn) {
  shareBtn.style.pointerEvents = "auto";
  shareBtn.addEventListener("click", () => {
    setViewerMenuOpen(false);
    const dialog = document.getElementById("shareDialog");
    const offline = globalThis.__REPLAY_OFFLINE__;
    document.getElementById("shareLinkBtn").disabled = Boolean(offline);
    document.getElementById("shareOfflineBtn").disabled = Boolean(offline);
    if (offline?.failures?.length) {
      document.getElementById("shareStatus").textContent = "Assets missing from this offline file:";
      showMissingAssets(offline.failures);
    }
    dialog.showModal();
  });
}

function showMissingAssets(urls) {
  const list = document.getElementById("shareMissing");
  list.replaceChildren();
  for (const url of urls) {
    const li = document.createElement("li");
    li.textContent = new URL(url, "http://local").searchParams.get("src") || url;
    list.appendChild(li);
  }
}
document.getElementById("shareCloseBtn")?.addEventListener("click", () => document.getElementById("shareDialog").close());
document.getElementById("shareLinkBtn")?.addEventListener("click", async () => {
  const copied = await copyShareUrl();
  document.getElementById("shareStatus").textContent = copied ? "Link copied. The server must be reachable to open it." : "Could not copy link.";
});
document.getElementById("shareOfflineBtn")?.addEventListener("click", async () => {
  const button = document.getElementById("shareOfflineBtn");
  const dialog = document.getElementById("shareDialog");
  const status = document.getElementById("shareStatus");
  const proceed = document.getElementById("continueOfflineBtn");
  button.disabled = true;
  showMissingAssets([]);
  try {
    await downloadOffline({mode:curMode, id:serverSelect.value,
      progress:message => { status.textContent = message; },
      confirmMissing:urls => new Promise(resolve => {
        if (!dialog.open) { resolve(false); return; }
        status.textContent = `${urls.length} assets could not be included. Exporting anyway may leave objects or textures missing. Close to cancel.`;
        showMissingAssets(urls); proceed.hidden = false;
        const finish = accepted => {
          proceed.hidden = true;
          proceed.removeEventListener("click", accept);
          dialog.removeEventListener("close", cancel);
          resolve(accepted);
        };
        const accept = () => finish(true), cancel = () => finish(false);
        proceed.addEventListener("click", accept);
        dialog.addEventListener("close", cancel);
      })});
  } catch (error) { status.textContent = "Export failed: " + error.message; }
  finally { button.disabled = false; }
});

if (replayPlayBtn) {
  replayPlayBtn.addEventListener("click", () => {
    if (!repDat) return;
    cancelAnimationFrame(repAnimation);
    if (!repRun && repMs >= repDat.dur) repSeek(0, true);
    repRun = !repRun;
    repLast = 0;
    repUiSync();
    if (repRun) repAnimation = requestAnimationFrame(repTick);
  });
}

if (replaySeek) {
  replaySeek.addEventListener("input", () => {
    if (!repDat) return;
    repRun = false;
    cancelAnimationFrame(repAnimation);
    repLast = 0;
    repSeek(Number(replaySeek.value || 0), true);
  });
}

if (thumbHintClose) {
  const closeHint = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const sid = String(serverSelect?.value || "");
    if (sid) {
      thClsSet.add(sid);
      thMuteSv = sid;
    }
    hideThnt();
  };
  thumbHintClose.addEventListener("click", closeHint);
  thumbHintClose.addEventListener("pointerdown", closeHint);
}

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", async () => {
    try {
      const isActive = document.fullscreenElement === document.documentElement;
      if (isActive) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
      syncFullscreenBtn();
    } catch (error) {
      addClientLog("warn", "fullscreen toggle failed", { message: error?.message || String(error) });
    }
  });
  document.addEventListener("fullscreenchange", syncFullscreenBtn);
  syncFullscreenBtn();
}

if (homeBtn) {
  homeBtn.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === document.documentElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      addClientLog("warn", "exit fullscreen on home failed", { message: error?.message || String(error) });
    }
    showLanding();
    await loadList();
  });
}

document.getElementById("viewerMenuBtn")?.addEventListener("click", () => {
  setViewerMenuOpen(document.getElementById("viewerMenu").hidden);
});
function setUiHidden(hidden) {
  if (hidden) { setViewerMenuOpen(false); setSidebarOpen(false); }
  document.body.classList.toggle("is-ui-hidden", hidden);
  document.getElementById("showUiBtn").hidden = !hidden;
}
document.getElementById("hideUiBtn")?.addEventListener("click", () => setUiHidden(true));
document.getElementById("showUiBtn")?.addEventListener("click", () => setUiHidden(false));
document.getElementById("assetStatusBtn")?.addEventListener("click", () => {
  assetProgressDismissed = false;
  setViewerMenuOpen(false);
  renderAssetProgress();
});
document.addEventListener("click", event => {
  const menu = document.getElementById("viewerMenu");
  if (menu && !menu.hidden && !menu.contains(event.target) && !document.getElementById("viewerMenuBtn")?.contains(event.target)) setViewerMenuOpen(false);
});
document.getElementById("mobileToolsBtn")?.addEventListener("click", () => {
  const tools = document.getElementById("toolbarExtras");
  setMobileToolsOpen(!tools?.classList.contains("is-open"));
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (document.body.classList.contains("is-ui-hidden")) setUiHidden(false);
    setMobileToolsOpen(false);
    setViewerMenuOpen(false);
    setSidebarOpen(false);
  }
});

sidebarToggleBtn?.addEventListener("click", () => {
  setViewerMenuOpen(false);
  setSidebarOpen(!document.body.classList.contains("sidebar-open"));
});
sidebarCloseBtn?.addEventListener("click", () => setSidebarOpen(false));
for (const button of document.querySelectorAll("[data-sidebar-view]")) {
  button.addEventListener("click", () => setSidebarView(button.dataset.sidebarView));
}
for (const button of libraryTabs?.querySelectorAll("[data-library-mode]") || []) {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.libraryMode === "snap" ? "snap" : "rep";
    if (modeSelect) {
      modeSelect.value = nextMode;
      modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      curMode = nextMode;
      loadList().then(showLanding).catch((error) => {
        snapshotMeta.textContent = `Could not change the library: ${error.message}`;
      });
    }
    syncLibraryTabs();
  });
}
setSidebarView("explorer");

updateTopbarMode();
bootstrap();

// Studio playback and touch controls.
document.getElementById("replaySpeed")?.addEventListener("change", (event) => {
  repSpeed = Number(event.target.value) || 1;
  repLast = 0;
});
document.getElementById("replayBack")?.addEventListener("click", () => repSeek(repMs - 5000, true));
replayForward?.addEventListener("click", () => repSeek(repMs + 5000, true));
for (const button of document.querySelectorAll("[data-move]")) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pressedKeys.add(button.dataset.move);
    studioFlyActive = true;
  });
  const release = () => { pressedKeys.delete(button.dataset.move); studioFlyActive = pressedKeys.size > 0; };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(type, release);
}

document.addEventListener("visibilitychange", () => { repLast = 0; pressedKeys.clear(); studioFlyActive = false; });

function repCameraPair() {
  return repDat?.cameraPair(repMs) || null;
}

function applyRecordedCamera() {
  if (!followRecordedCamera || !repDat || !three || !THREE) return;
  const pair = repCameraPair();
  if (!pair) return;
  const { a, b, alpha } = pair;
  if (!a?.position || !a?.rotation || !b?.position || !b?.rotation) return;
  const vec = (p) => new THREE.Vector3(p.x, p.y, p.z);
  three.camera.position.copy(vec(a.position).lerp(vec(b.position), alpha));
  const quat = (r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x, r.y, r.z, "YXZ"));
  three.camera.quaternion.copy(quat(a.rotation).slerp(quat(b.rotation), alpha));
  three.camera.fov = repLerp(a.fov || 55, b.fov || 55, alpha);
  three.camera.updateProjectionMatrix();
}
document.getElementById("replayCamera")?.addEventListener("click", (event) => {
  followRecordedCamera = !followRecordedCamera;
  event.currentTarget.setAttribute("aria-pressed", String(followRecordedCamera));
  event.currentTarget.textContent = followRecordedCamera ? "Recorded camera" : "Free camera";
  if (repDat) repDraw(true);
});
