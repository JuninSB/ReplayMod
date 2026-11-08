import { Json } from "./store";

function object(value: unknown): value is Json {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function number(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Expand the compact-v1 snapshot format used by the original client. */
export function expandCompactSnapshot(payload: Json): Json {
  if (payload.__transport !== "compact-v1") return payload;
  if (!object(payload.compact)) throw new Error("invalid compact snapshot");
  const compact = payload.compact;
  const strings = list(compact.strings);
  const paths = list(compact.pathNodes);
  const partTemplates = list(compact.partTemplates);
  const decalTemplates = list(compact.decalTemplates);
  const stringAt = (value: unknown, fallback = ""): string => {
    const index = number(value, 0);
    return Number.isInteger(index) && index > 0 && index <= strings.length
      ? String(strings[index - 1] ?? fallback)
      : fallback;
  };
  const pathCache = new Map<number, string>([[0, ""]]);
  const resolvePath = (value: unknown, seen = new Set<number>()): string => {
    const index = number(value, 0);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index > paths.length ||
      seen.has(index) ||
      seen.size > 64
    )
      return "";
    if (pathCache.has(index)) return pathCache.get(index)!;
    const node = paths[index - 1];
    if (!object(node)) return "";
    seen.add(index);
    const parent = resolvePath(node.p, seen);
    const name = stringAt(node.n);
    const result = parent && name ? `${parent}/${name}` : name || parent;
    pathCache.set(index, result);
    return result;
  };
  const parts: Json[] = [];
  for (const raw of list(compact.parts)) {
    if (!object(raw)) continue;
    const template = partTemplates[number(raw.t, 0) - 1];
    if (!object(template)) continue;
    const size = object(template.size) ? template.size : {};
    const part: Json = {
      path: resolvePath(raw.path) || stringAt(raw.name, "Part"),
      name: stringAt(raw.name, "Part"),
      className: stringAt(template.className, "Part"),
      position: { x: number(raw.px), y: number(raw.py), z: number(raw.pz) },
      size: {
        x: number(size.x, 1),
        y: number(size.y, 1),
        z: number(size.z, 1),
      },
      orientation: { x: number(raw.ox), y: number(raw.oy), z: number(raw.oz) },
      color3: stringAt(template.color3, "#ffffff"),
      transparency: number(template.transparency),
      material: stringAt(template.material, "Plastic"),
      anchored: Boolean(template.anchored),
      canCollide: template.canCollide !== false,
      castShadow: template.castShadow !== false,
    };
    for (const key of [
      "topSurface",
      "bottomSurface",
      "leftSurface",
      "rightSurface",
      "frontSurface",
      "backSurface",
      "shape",
      "meshId",
      "textureId",
    ]) {
      const value = stringAt(template[key]);
      if (value) part[key] = value;
    }
    parts.push(part);
  }
  const decals: Json[] = [];
  for (const raw of list(compact.decals)) {
    if (!object(raw)) continue;
    const template = decalTemplates[number(raw.t, 0) - 1];
    if (!object(template)) continue;
    decals.push({
      instancePath: resolvePath(raw.inst),
      partPath: resolvePath(raw.part) || null,
      className: stringAt(template.className, "Decal"),
      face: stringAt(template.face, "Front"),
      texture: stringAt(template.texture),
      transparency: number(template.transparency),
      color3: stringAt(template.color3, "#ffffff"),
    });
  }
  const { compact: _compact, __transport: _transport, ...rest } = payload;
  const expanded: Json = { ...rest, parts, decals };
  for (const key of ["lighting", "stats", "placeId", "timestamp", "explorer"]) {
    if (compact[key] !== undefined) expanded[key] = compact[key];
  }
  if (object(expanded.explorer) && Array.isArray(expanded.explorer.services)) {
    const counts = new Map<string, Map<string, number>>();
    const walk = (value: unknown, parent: string, depth: number): void => {
      if (!object(value) || depth > 64) return;
      const name = String(value.name ?? "");
      const className = String(value.className ?? "");
      const siblings = counts.get(parent) || new Map<string, number>();
      counts.set(parent, siblings);
      const key = `${className}|${name}`;
      const count = (siblings.get(key) || 0) + 1;
      siblings.set(key, count);
      const segment = count > 1 ? `${name}#${count}` : name;
      const current =
        parent && segment ? `${parent}/${segment}` : segment || parent;
      if (current) value.path = current;
      if (!object(value.properties)) value.properties = {};
      const children = Array.isArray(value.children) ? value.children : [];
      value.children = children;
      for (const child of children) walk(child, current, depth + 1);
    };
    for (const service of expanded.explorer.services) walk(service, "", 0);
  }
  return expanded;
}
