export function toNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toVec3(value, fallback = null) {
  if (!value || typeof value !== "object") return fallback;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return fallback;
  return { x, y, z };
}

export function readAny(object, keys) {
  if (!object || typeof object !== "object") return undefined;
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) return object[key];
  }
  return undefined;
}

export function normalizePart(raw) {
  if (!raw || typeof raw !== "object") return null;
  const className = String(readAny(raw, ["className", "ClassName"]) || "Part");
  if (className.toLowerCase() === "terrain") return null;

  const size = toVec3(readAny(raw, ["size", "Size"]), null);
  const position =
    toVec3(readAny(raw, ["position", "Position"]), null) ||
    toVec3(readAny(raw, ["cframe", "CFrame"])?.position, null);
  const orientation = toVec3(readAny(raw, ["orientation", "Orientation"]), { x: 0, y: 0, z: 0 });
  if (!size || !position) return null;

  return {
    path: String(readAny(raw, ["path", "Path"]) || ""),
    name: String(readAny(raw, ["name", "Name"]) || ""),
    characterName: String(readAny(raw, ["characterName", "CharacterName"]) || ""),
    lights: Array.isArray(raw.lights) ? raw.lights : [],
    nameDisplayDistance: toNum(raw.nameDisplayDistance,100),
    showName: raw.showName !== false,
    characterHealth: raw.characterHealth == null ? null : toNum(raw.characterHealth, 0),
    className,
    shape: String(readAny(raw, ["shape", "Shape"]) || "Block"),
    size,
    position,
    orientation,
    color3: String(readAny(raw, ["color3", "Color3", "Color"]) || "#d1d5db"),
    transparency: toNum(readAny(raw, ["transparency", "Transparency"]), 0),
    material: String(readAny(raw, ["material", "Material"]) || ""),
    materialVariant: String(readAny(raw, ["materialVariant", "MaterialVariant"]) || ""),
    castShadow: Boolean(readAny(raw, ["castShadow", "CastShadow"]) ?? true),
    topSurface: String(readAny(raw, ["topSurface", "TopSurface"]) || ""),
    bottomSurface: String(readAny(raw, ["bottomSurface", "BottomSurface"]) || ""),
    leftSurface: String(readAny(raw, ["leftSurface", "LeftSurface"]) || ""),
    rightSurface: String(readAny(raw, ["rightSurface", "RightSurface"]) || ""),
    frontSurface: String(readAny(raw, ["frontSurface", "FrontSurface"]) || ""),
    backSurface: String(readAny(raw, ["backSurface", "BackSurface"]) || ""),
    meshId: String(readAny(raw, ["meshId", "MeshId"]) || ((String(raw.meshType || '').endsWith('.Head') || (raw.name === 'Head' && raw.className === 'Part' && raw.meshScale && !raw.meshType)) ? 'rbxasset://avatar/heads/head.mesh' : '')),
    meshType: String(raw.meshType || ''),
    rigType: String(raw.rigType || ''),
    textureId: String(readAny(raw, ["textureId", "TextureId", "TextureID"]) || ""),
    surfaceAppearance: raw.surfaceAppearance || null,
    clothing: raw.clothing && typeof raw.clothing === "object" ? raw.clothing : null,
    doubleSided: Boolean(readAny(raw, ["doubleSided", "DoubleSided"]) ?? false),
    meshVertexColor: toVec3(readAny(raw, ["meshVertexColor", "MeshVertexColor"]), null),
    meshScale: raw.meshScale || null,
    meshOffset: raw.meshOffset || null,
  };
}

export function faceName(face) {
  if (typeof face !== "string") return "Front";
  return face.replace("Enum.NormalId.", "");
}

export function visibleDecalTexture(decal) {
  const source = String(decal?.texture || "").trim();
  return source && toNum(decal?.transparency, 0) < 1 ? source : "";
}

export function isCharHead(part) {
  if (!part || typeof part !== "object") return false;
  const name = String(part.name || "").toLowerCase();
  if (name !== "head") return false;
  if (String(part.characterName || "").trim()) return true;
  const path = String(part.path || "");
  if (!path.startsWith("Workspace/")) return false;
  if (path.includes("/Accessories/") || path.includes("/Accessory/")) return false;
  return true;
}

export function textureProxy(src) {
  const url = `/api/asset/texture?src=${encodeURIComponent(String(src || "").trim())}`;
  return globalThis.__REPLAY_OFFLINE__ ? globalThis.__REPLAY_OFFLINE__.assets[url] || 'data:application/octet-stream;base64,' : url;
}

export function textureFetchUrl(src) {
  const raw = String(src || "").trim();
  if (raw.startsWith("/api/")) return globalThis.__REPLAY_OFFLINE__ ? globalThis.__REPLAY_OFFLINE__.assets[raw] || 'data:application/octet-stream;base64,' : raw;
  if (raw.startsWith("data:")) return raw;
  return textureProxy(raw);
}

export function meshProxy(src) {
  const url = `/api/asset/mesh?src=${encodeURIComponent(String(src || "").trim())}`;
  return globalThis.__REPLAY_OFFLINE__ ? globalThis.__REPLAY_OFFLINE__.assets[url] || 'data:text/plain,' : url;
}

export function usesBoxFaceMaterials(part, geometryType) {
  const shape = String(part?.shape || "Block").replace("Enum.PartType.", "").toLowerCase();
  return !String(part?.meshId || "").trim() && shape === "block" && geometryType === "BoxGeometry";
}
