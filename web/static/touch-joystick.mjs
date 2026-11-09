// Clamp a pointer to the joystick's circular travel and keep a small deadzone.
export function joystickVector(x, y, radius) {
  if (!(radius > 0)) return { x: 0, y: 0 };
  const distance = Math.hypot(x, y);
  if (distance < radius * 0.08) return { x: 0, y: 0 };
  const scale = Math.min(1, radius / distance) / radius;
  return { x: x * scale, y: y * scale };
}
