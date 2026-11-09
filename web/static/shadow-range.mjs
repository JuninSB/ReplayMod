// Approximate adjustable shadow coverage, not Roblox's internal quality levels.
export const SHADOW_RANGES = {near: 60, medium: 140, far: 280};
export function shadowRange(quality) { return SHADOW_RANGES[quality] || SHADOW_RANGES.medium; }
export function partCastsNearby(part, position, camera, quality) {
  if (part?.castShadow === false || Number(part?.transparency || 0) >= 0.95) return false;
  const size = part?.size || {};
  const radius = Math.min(100, Math.max(Number(size.x) || 0, Number(size.y) || 0, Number(size.z) || 0) / 2);
  const dx = position.x - camera.x, dy = position.y - camera.y, dz = position.z - camera.z;
  return dx * dx + dy * dy + dz * dz <= (shadowRange(quality) + radius) ** 2;
}
