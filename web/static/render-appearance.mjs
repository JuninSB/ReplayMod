const MAP_MULTIPLY = "diffuseColor *= sampledDiffuseColor;";

export function meshTexturePolicy(part) {
  const surface = part?.surfaceAppearance;
  const colorMap = String(surface?.colorMap || "").trim();
  const source = colorMap || String(part?.textureId || "").trim();
  if (!source) return null;

  const rawMode = String(surface?.alphaMode || "")
    .split(".")
    .pop()
    .toLowerCase();
  const accessory =
    String(part?.name || "").toLowerCase() === "handle" ||
    /\/accessor(?:y|ies)\//i.test(String(part?.path || ""));
  let mode;
  if (colorMap) {
    mode =
      {
        transparency: "blend",
        tintmask: "tint-mask",
        opaque: "opaque",
      }[rawMode] || "overlay";
  } else {
    mode = accessory || part?.className !== "MeshPart" ? "cutout" : "overlay";
  }

  return {
    source,
    mode,
    baseColor: String(part?.color3 || "#ffffff"),
    tint: String(surface?.color || "#ffffff"),
    surfaceColor: Boolean(surface?.color),
    vertexColor: part?.meshVertexColor || null,
    doubleSided: Boolean(part?.doubleSided),
    partTransparency: Math.max(
      0,
      Math.min(1, Number(part?.transparency) || 0),
    ),
    alphaTest: mode === "cutout" ? 0.03 : 0,
  };
}

export function mapFragmentForMode(fragment, mode) {
  if (mode !== "overlay" && mode !== "tint-mask") return fragment;
  if (!fragment.includes(MAP_MULTIPLY)) return fragment;
  const replacement =
    mode === "overlay"
      ? "diffuseColor.rgb = mix(diffuseColor.rgb, sampledDiffuseColor.rgb * replayTextureTint, sampledDiffuseColor.a);"
      : "diffuseColor.rgb = sampledDiffuseColor.rgb * mix(vec3(1.0), replayTextureTint, sampledDiffuseColor.a);";
  return fragment.replace(MAP_MULTIPLY, replacement);
}
