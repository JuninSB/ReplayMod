// MeshPart.Size scales the source MeshSize about the asset origin. Legacy
// recordings without MeshSize retain the previous bounding-box fallback.
export function applyMeshSizing(geometry, part, sourceSize, center, size) {
  if (part.meshScale) {
    const builtinHead = String(part.meshType || '').endsWith('.Head') || (!part.meshType && String(part.meshId).endsWith('avatar/heads/head.mesh'));
    if (builtinHead) {
      geometry.translate(-center.x, -center.y, -center.z);
      geometry.scale(1 / Math.max(1e-5, sourceSize.x), 1 / Math.max(1e-5, sourceSize.y), 1 / Math.max(1e-5, sourceSize.z));
    }
    geometry.scale(part.meshScale.x, part.meshScale.y, part.meshScale.z);
    if (part.meshOffset) geometry.translate(part.meshOffset.x, part.meshOffset.y, part.meshOffset.z);
  } else if (part.meshSize && part.meshSize.x > 0 && part.meshSize.y > 0 && part.meshSize.z > 0) {
    geometry.scale(size.x / part.meshSize.x, size.y / part.meshSize.y, size.z / part.meshSize.z);
  } else {
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(sourceSize.x > 1e-5 ? size.x / sourceSize.x : 1, sourceSize.y > 1e-5 ? size.y / sourceSize.y : 1, sourceSize.z > 1e-5 ? size.z / sourceSize.z : 1);
  }
}
