// Regions in Roblox's 585 x 559 classic clothing template, measured from its top left.
const ATLAS_WIDTH = 585;
const ATLAS_HEIGHT = 559;
const region = (x, y, width, height) => ({ x, y, width, height });

const TORSO = [
  region(165, 73, 65, 128), // right
  region(360, 73, 65, 128), // left
  region(231, 8, 128, 64), // top
  region(231, 202, 128, 64), // bottom
  region(426, 73, 128, 128), // back
  region(231, 73, 128, 128), // front
];
const RIGHT_LIMB = [
  region(150, 355, 65, 128),
  region(19, 355, 65, 128),
  region(216, 289, 65, 65),
  region(216, 484, 65, 65),
  region(84, 355, 65, 128),
  region(216, 355, 65, 128),
];
const LEFT_LIMB = [
  region(505, 355, 65, 128),
  region(373, 355, 65, 128),
  region(308, 289, 65, 65),
  region(308, 484, 65, 65),
  region(439, 355, 65, 128),
  region(308, 355, 65, 128),
];

export function classicClothingLayers(part) {
  const clothing = part?.clothing;
  if (!clothing || typeof clothing !== "object") return [];
  const name = String(part.name || "");
  const torso =
    name === "Torso" || name === "UpperTorso" || name === "LowerTorso";
  const arm = /(?:Arm|Hand)$/.test(name);
  const leg = /(?:Leg|Foot)$/.test(name);
  if (!torso && !arm && !leg) return [];

  const layers = [];
  const template = torso
    ? clothing.shirt || clothing.pants
    : arm
      ? clothing.shirt
      : clothing.pants;
  if (template) {
    const shirt = torso ? Boolean(clothing.shirt) : arm;
    layers.push({
      source: String(template),
      tint: String(
        (shirt ? clothing.shirtColor : clothing.pantsColor) || "#ffffff",
      ),
      kind: "template",
    });
  }
  if (torso && clothing.graphic) {
    layers.push({
      source: String(clothing.graphic),
      tint: String(clothing.graphicColor || "#ffffff"),
      kind: "graphic",
    });
  }
  return layers;
}

export function classicClothingRegions(partName, kind = "template") {
  if (kind === "graphic")
    return partName === "Torso"
      ? [null, null, null, null, null, region(0, 0, 1, 1)]
      : null;
  if (partName === "Torso") return TORSO;
  if (partName === "Right Arm" || partName === "Right Leg") return RIGHT_LIMB;
  if (partName === "Left Arm" || partName === "Left Leg") return LEFT_LIMB;
  if (partName === "UpperTorso" || partName === "LowerTorso") return TORSO;
  if (/^Right(?:UpperArm|LowerArm|Hand|UpperLeg|LowerLeg|Foot)$/.test(partName))
    return RIGHT_LIMB;
  if (/^Left(?:UpperArm|LowerArm|Hand|UpperLeg|LowerLeg|Foot)$/.test(partName))
    return LEFT_LIMB;
  return null;
}

export function classicClothingUv(regionValue, kind = "template") {
  if (!regionValue) return null;
  if (kind === "graphic")
    return { offsetX: 0, offsetY: 0, repeatX: 1, repeatY: 1 };
  return {
    offsetX: regionValue.x / ATLAS_WIDTH,
    offsetY: 1 - (regionValue.y + regionValue.height) / ATLAS_HEIGHT,
    repeatX: regionValue.width / ATLAS_WIDTH,
    repeatY: regionValue.height / ATLAS_HEIGHT,
  };
}

export function mapClassicClothingBoxUvs(source, partName, kind = "template") {
  const regions = classicClothingRegions(partName, kind);
  if (!regions || source?.type !== "BoxGeometry") return null;
  const geometry = source.clone();
  const uv = geometry.getAttribute("uv");
  if (!uv) {
    geometry.dispose();
    return null;
  }
  const indices = geometry.getIndex();
  const groups = geometry.groups.slice();
  for (const group of groups) {
    const face = regions[group.materialIndex];
    if (!face) continue;
    const transform = classicClothingUv(face, kind);
    const visited = new Set();
    for (let i = group.start; i < group.start + group.count; i += 1) {
      const vertex = indices ? indices.getX(i) : i;
      if (visited.has(vertex)) continue;
      visited.add(vertex);
      const u = uv.getX(vertex);
      const v = uv.getY(vertex);
      uv.setXY(
        vertex,
        transform.offsetX + u * transform.repeatX,
        transform.offsetY + v * transform.repeatY,
      );
    }
  }
  if (kind === "graphic" && indices) {
    const front = groups.find((group) => group.materialIndex === 5);
    if (front) {
      const frontIndices = [];
      for (let i = front.start; i < front.start + front.count; i += 1)
        frontIndices.push(indices.getX(i));
      geometry.setIndex(frontIndices);
    }
  }
  geometry.clearGroups();
  uv.needsUpdate = true;
  return geometry;
}

function r15VerticalSegment(name) {
  if (name === "UpperTorso") return [0, 0.58];
  if (name === "LowerTorso") return [0.58, 1];
  if (/Upper(?:Arm|Leg)$/.test(name)) return [0, 0.43];
  if (/Lower(?:Arm|Leg)$/.test(name)) return [0.43, 0.83];
  if (/(?:Hand|Foot)$/.test(name)) return [0.83, 1];
  return [0, 1];
}

export function projectClassicClothingMeshUvs(source, partName) {
  const regions = classicClothingRegions(partName);
  if (!regions || !source?.getAttribute("position")) return null;
  const geometry = source.getIndex() ? source.toNonIndexed() : source.clone();
  const positions = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  if (!uv || positions.count % 3 !== 0) {
    geometry.dispose();
    return null;
  }
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const sizeX = Math.max(1e-6, max.x - min.x);
  const sizeY = Math.max(1e-6, max.y - min.y);
  const sizeZ = Math.max(1e-6, max.z - min.z);
  const [segmentStart, segmentEnd] = r15VerticalSegment(partName);

  for (let i = 0; i < positions.count; i += 3) {
    const ax = positions.getX(i),
      ay = positions.getY(i),
      az = positions.getZ(i);
    const bx = positions.getX(i + 1),
      by = positions.getY(i + 1),
      bz = positions.getZ(i + 1);
    const cx = positions.getX(i + 2),
      cy = positions.getY(i + 2),
      cz = positions.getZ(i + 2);
    const ux = bx - ax,
      uy = by - ay,
      uz = bz - az;
    const vx = cx - ax,
      vy = cy - ay,
      vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    let face;
    if (Math.abs(nx) >= Math.abs(ny) && Math.abs(nx) >= Math.abs(nz))
      face = nx >= 0 ? 0 : 1;
    else if (Math.abs(ny) >= Math.abs(nz)) face = ny >= 0 ? 2 : 3;
    else face = nz >= 0 ? 4 : 5;
    const transform = classicClothingUv(regions[face]);
    for (let j = i; j < i + 3; j += 1) {
      const x = (positions.getX(j) - min.x) / sizeX;
      const y = (positions.getY(j) - min.y) / sizeY;
      const z = (positions.getZ(j) - min.z) / sizeZ;
      let u = face === 0 ? 1 - z : face === 1 ? z : face === 5 ? 1 - x : x;
      let v = face === 2 ? 1 - z : face === 3 ? z : y;
      if (face !== 2 && face !== 3)
        v = 1 - (segmentStart + (1 - v) * (segmentEnd - segmentStart));
      u = Math.max(0, Math.min(1, u));
      v = Math.max(0, Math.min(1, v));
      uv.setXY(
        j,
        transform.offsetX + u * transform.repeatX,
        transform.offsetY + v * transform.repeatY,
      );
    }
  }
  geometry.clearGroups();
  uv.needsUpdate = true;
  return geometry;
}
