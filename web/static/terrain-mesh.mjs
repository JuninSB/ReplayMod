// Coarse terrain reconstruction from Roblox's 4-stud voxel capture.
// Only exposed cube faces are emitted, so solid interior voxels never become
// browser triangles or draw calls. Smooth Roblox terrain remains an
// approximation in this viewer.
export function terrainCellKey(x, y, z) {
  return `${x}|${y}|${z}`;
}

export function terrainSurfaceFaceCount(cells, minOccupancy = 0.5) {
  const solid = new Set();
  for (const cell of Array.isArray(cells) ? cells : []) {
    if (Number(cell?.o ?? 255) / 255 >= minOccupancy) {
      solid.add(terrainCellKey(Number(cell.x), Number(cell.y), Number(cell.z)));
    }
  }
  let count = 0;
  for (const key of solid) {
    const [x, y, z] = key.split("|").map(Number);
    for (const [dx, dy, dz] of FACE_DIRECTIONS) {
      if (!solid.has(terrainCellKey(x + dx, y + dy, z + dz))) count += 1;
    }
  }
  return count;
}

const FACE_DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const FACE_CORNERS = [
  [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]],
  [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]],
  [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]],
  [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
  [[1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1]],
  [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]],
];

export function buildTerrainGeometries(raw, THREE, minOccupancy = 0.5) {
  if (!raw || !THREE || !Array.isArray(raw.cells)) return [];
  const step = Math.max(1, Number(raw.cellSize) || 4);
  const origin = raw.origin || {};
  const ox = Number(origin.x) || 0;
  const oy = Number(origin.y) || 0;
  const oz = Number(origin.z) || 0;
  const solid = new Map();
  for (const cell of raw.cells) {
    const x = Number(cell?.x), y = Number(cell?.y), z = Number(cell?.z);
    if (![x, y, z].every(Number.isFinite)) continue;
    if (Number(cell?.o ?? 255) / 255 < minOccupancy) continue;
    solid.set(terrainCellKey(x, y, z), cell);
  }
  const groups = new Map();
  for (const [key, cell] of solid) {
    const [x, y, z] = key.split("|").map(Number);
    const material = String(cell.m || cell.material || "Plastic");
    let out = groups.get(material);
    if (!out) {
      out = { positions: [], normals: [], uvs: [] };
      groups.set(material, out);
    }
    const cx = ox + (x + 0.5) * step;
    const cy = oy + (y + 0.5) * step;
    const cz = oz + (z + 0.5) * step;
    const half = step * 0.5;
    for (let face = 0; face < FACE_DIRECTIONS.length; face += 1) {
      const [dx, dy, dz] = FACE_DIRECTIONS[face];
      if (solid.has(terrainCellKey(x + dx, y + dy, z + dz))) continue;
      const corners = FACE_CORNERS[face];
      const normal = [dx, dy, dz];
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const [px, py, pz] = corners[index];
        out.positions.push(cx + px * half, cy + py * half, cz + pz * half);
        out.normals.push(...normal);
      }
      out.uvs.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
    }
  }
  const result = [];
  for (const [material, data] of groups) {
    if (data.positions.length === 0) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(data.uvs, 2));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    result.push({ material, geometry });
  }
  return result;
}
