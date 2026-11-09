// Select a real scene object rather than the center of the whole map.
export function chooseSpawnTarget(meshes) {
  const visible = meshes.filter(mesh => {
    const p = mesh?.userData?.part;
    return p && mesh.position && ['x','y','z'].every(axis => Number.isFinite(mesh.position[axis]))
      && Number(p.transparency || 0) < 0.95 && mesh.visible !== false;
  });
  return visible.find(mesh => {
    const p = mesh.userData.part;
    return p.characterName && p.name === 'Head' && (p.characterHealth == null || Number(p.characterHealth) > 0);
  }) || visible.find(mesh => mesh.userData.part.name !== 'HumanoidRootPart') || null;
}
