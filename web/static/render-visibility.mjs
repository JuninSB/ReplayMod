export function setCameraVisibility(object, visible) {
  if (!object) return;
  object.userData.occHidden = !visible;
  object.visible = true;
  object.traverse((child) => {
    child.layers.enable(1);
    if (visible) child.layers.enable(0);
    else child.layers.disable(0);
  });
}

export function cameraSees(object, camera) {
  return Boolean(object?.visible && camera && object.layers.test(camera.layers));
}
