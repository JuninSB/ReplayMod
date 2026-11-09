// Viewer-only overrides never mutate replay data; vector axes may be pinned independently.
export function applyViewerOverrides(part, override) {
  if (!part || !override) return part;
  const result = { ...part, ...override };
  for (const key of ['position', 'orientation', 'size']) {
    if (override[key]) result[key] = { ...part[key], ...override[key] };
  }
  return result;
}
