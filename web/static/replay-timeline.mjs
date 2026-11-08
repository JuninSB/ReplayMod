// Estado puro do replay. O renderer recebe eventos; este módulo não conhece DOM nem Three.js.
export class ReplayTimeline {
  constructor(raw, normalizePart) {
    this.raw = raw && typeof raw === "object" ? raw : {};
    this.normalizePart = normalizePart;
    this.map = new Map();
    this.decalMap = new Map();
    this.baseLighting = this.raw.base?.lighting || this.raw.lighting || {};
    this.lighting = this.baseLighting;
    this.base = [];
    this.baseDecals = [];
    const baseParts = Array.isArray(this.raw.base?.parts)
      ? this.raw.base.parts
      : [];
    for (let i = 0; i < baseParts.length; i += 1) {
      const part = this.part(baseParts[i], i);
      if (part) this.base.push(part);
    }
    const baseDecals = Array.isArray(this.raw.base?.decals)
      ? this.raw.base.decals
      : [];
    for (let i = 0; i < baseDecals.length; i += 1) {
      const decal = this.decal(baseDecals[i], i, true);
      if (decal) this.baseDecals.push(decal);
    }
    this.frames = sortedEvents(this.raw.frames);
    this.chat = sortedEvents(this.raw.chatEvents);
    this.cameraFrames = [];
    if (this.raw.base?.camera)
      this.cameraFrames.push({ t: 0, camera: this.raw.base.camera });
    for (const frame of this.frames) {
      if (frame?.camera)
        this.cameraFrames.push({ t: eventTime(frame), camera: frame.camera });
    }
    this.dur = Math.max(
      1,
      finiteNumber(this.raw.durationMs ?? this.raw.durMs),
      eventTime(this.frames[this.frames.length - 1]),
      eventTime(this.chat[this.chat.length - 1]),
    );
    this.reset();
  }

  part(raw, index) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const path =
      String(raw.path ?? raw.Path ?? raw.key ?? raw.Key ?? "").trim() ||
      `part_${index}`;
    const previous = this.map.get(path) || {};
    const merged = { ...previous, ...raw, path };
    for (const [legacy, canonical] of [
      ["ClassName", "className"],
      ["Name", "name"],
      ["Position", "position"],
      ["Orientation", "orientation"],
      ["Size", "size"],
      ["Color3", "color3"],
      ["Transparency", "transparency"],
      ["Material", "material"],
      ["MeshId", "meshId"],
      ["TextureID", "textureId"],
    ]) {
      if (raw[canonical] === undefined && raw[legacy] !== undefined)
        merged[canonical] = raw[legacy];
    }
    for (const key of [
      "position",
      "orientation",
      "size",
      "meshScale",
      "meshOffset",
      "surfaceAppearance",
    ]) {
      if (isRecord(previous[key]) && isRecord(merged[key]))
        merged[key] = { ...previous[key], ...merged[key] };
    }
    return this.normalizePart(merged);
  }

  decal(raw, index, allowFallback = false) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const id = String(raw.id ?? raw.instancePath ?? "").trim() ||
      (allowFallback ? `legacy_decal_${index}` : "");
    if (!id) return null;
    return { ...(this.decalMap.get(id) || {}), ...raw, id };
  }

  reset() {
    this.map = new Map(
      this.base.map((part, index) => [
        String(part.path || `part_${index}`),
        part,
      ]),
    );
    this.decalMap = new Map(this.baseDecals.map((decal) => [decal.id, decal]));
    this.index = 0;
    this.lastFrameTime = 0;
    this.ms = 0;
    this.lighting = this.baseLighting;
  }

  applyFrame(frame, onChange = () => {}) {
    if (!frame || typeof frame !== "object") return;
    if (frame.lighting && typeof frame.lighting === "object") {
      this.lighting = frame.lighting;
      onChange({ type: "lighting", lighting: this.lighting });
    }
    const additions = Array.isArray(frame.a) ? frame.a : [];
    const updates = Array.isArray(frame.u) ? frame.u : [];
    const removals = Array.isArray(frame.d) ? frame.d : [];
    const decalAdditions = Array.isArray(frame.da) ? frame.da : [];
    const decalUpdates = Array.isArray(frame.du) ? frame.du : [];
    const decalRemovals = Array.isArray(frame.dd) ? frame.dd : [];
    for (let i = 0; i < additions.length; i += 1) {
      const part = this.part(additions[i], i);
      if (!part) continue;
      this.map.set(String(part.path), part);
      onChange({ type: "add", part, index: i });
    }
    for (let i = 0; i < updates.length; i += 1) {
      const part = this.part(updates[i], i);
      if (!part) continue;
      const previous = this.map.get(String(part.path)) || null;
      onChange({ type: "update", part, previous, index: i });
      this.map.set(String(part.path), part);
    }
    for (const value of removals) {
      const path = String(value ?? "").trim();
      if (!path) continue;
      this.map.delete(path);
      onChange({ type: "remove", path });
    }
    for (let i = 0; i < decalAdditions.length; i += 1) {
      const decal = this.decal(decalAdditions[i], i);
      if (!decal) continue;
      this.decalMap.set(decal.id, decal);
      onChange({ type: "decal-add", decal });
    }
    for (let i = 0; i < decalUpdates.length; i += 1) {
      const decal = this.decal(decalUpdates[i], i);
      if (!decal || !this.decalMap.has(decal.id)) continue;
      this.decalMap.set(decal.id, decal);
      onChange({ type: "decal-update", decal });
    }
    for (const value of decalRemovals) {
      const id = String(value ?? "").trim();
      if (!id || !this.decalMap.has(id)) continue;
      this.decalMap.delete(id);
      onChange({ type: "decal-remove", id });
    }
  }

  seek(ms, { onReset = () => {}, onChange = () => {} } = {}) {
    const goal = Math.max(
      0,
      Math.min(Math.floor(finiteNumber(ms)), Math.floor(this.dur)),
    );
    if (goal < this.ms) {
      this.reset();
      onReset();
    }
    while (
      this.index < this.frames.length &&
      eventTime(this.frames[this.index]) <= goal
    ) {
      const frame = this.frames[this.index];
      this.applyFrame(frame, onChange);
      this.lastFrameTime = eventTime(frame);
      this.index += 1;
    }
    this.ms = goal;
    return goal;
  }

  nextInterpolations(ms = this.ms) {
    const next = this.frames[this.index];
    if (!next) return [];
    const nextTime = eventTime(next);
    if (nextTime <= this.lastFrameTime) return [];
    const alpha = Math.max(
      0,
      Math.min(1, (ms - this.lastFrameTime) / (nextTime - this.lastFrameTime)),
    );
    if (alpha <= 0 || alpha >= 1) return [];
    const updates = Array.isArray(next.u) ? next.u : [];
    const result = [];
    for (let i = 0; i < updates.length; i += 1) {
      const target = this.part(updates[i], i);
      if (!target) continue;
      const path = String(target.path || "");
      const source = this.map.get(path);
      if (source) result.push({ path, source, target, alpha });
    }
    return result;
  }

  chatCountAt(ms = this.ms) {
    let lo = 0;
    let hi = this.chat.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (eventTime(this.chat[mid]) <= ms) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  cameraPair(ms = this.ms) {
    const keys = this.cameraFrames;
    if (!keys.length) return null;
    let lo = 0;
    let hi = keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (keys[mid].t <= ms) lo = mid + 1;
      else hi = mid;
    }
    const first = keys[Math.max(0, lo - 1)];
    const second = keys[Math.min(keys.length - 1, lo)];
    const alpha =
      second.t > first.t
        ? Math.max(0, Math.min(1, (ms - first.t) / (second.t - first.t)))
        : 0;
    return { a: first.camera, b: second.camera, alpha };
  }
}

export function interpolateAngle(a, b, alpha) {
  return (
    finiteNumber(a) +
    (((((finiteNumber(b) - finiteNumber(a)) % 360) + 540) % 360) - 180) * alpha
  );
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function eventTime(event) {
  return Math.max(0, finiteNumber(event?.t));
}

function sortedEvents(value) {
  return (Array.isArray(value) ? value.slice() : []).sort(
    (a, b) => eventTime(a) - eventTime(b),
  );
}
