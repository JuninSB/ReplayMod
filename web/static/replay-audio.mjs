// A sound event records state at an exact replay time. Seeking reconstructs
// the latest state per sound, without re-playing earlier one-shot events.
export function soundStatesAt(events, ms) {
  const states = new Map();
  for (const event of events || []) {
    if (Number(event.t) > ms) break;
    if (!event.id) continue;
    if (event.event === 'removed' || event.event === 'stop' || event.event === 'end') states.delete(event.id);
    else states.set(event.id, event);
  }
  return states;
}
export function soundOffsetAt(event, ms) {
  const start = Math.max(0, Number(event.timePosition) || 0);
  const elapsed = event.playing ? Math.max(0, ms - Number(event.t || 0)) / 1000 : 0;
  const position = start + elapsed * Math.max(0, Number(event.playbackSpeed) || 1);
  const duration = Number(event.timeLength) || 0;
  return event.looped && duration > 0 ? position % duration : position;
}

export class ReplayAudio {
  constructor(events, resolvePart, report = () => {}) {
    this.events = [...(Array.isArray(events) ? events : [])].sort((a, b) => Number(a.t || 0) - Number(b.t || 0));
    this.resolvePart = resolvePart;
    this.report = report;
    this.nodes = new Map();
    this.context = null;
    this.enabled = true;
    this.lastSync = 0;
    this.cursor = 0;
    this.lastTime = -1;
    this.states = new Map();
    this.overrides = new Map();
  }
  unlock() {
    try {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) { this.report('Audio is unavailable in this browser.'); return; }
      this.context ||= new Context();
      this.context.resume().catch(() => this.report('Tap Play to enable audio.'));
    } catch { this.report('Could not start audio.'); }
  }
  stop() {
    for (const node of this.nodes.values()) { node.audio.pause(); node.source.disconnect(); node.gain.disconnect(); node.panner?.disconnect(); node.audio.removeAttribute('src'); node.audio.load(); }
    this.nodes.clear();
  }
  dispose() {
    this.stop();
    const context = this.context;
    this.context = null;
    if (context?.close) context.close().catch(() => {});
  }
  setEnabled(enabled) { this.enabled = enabled; if (!enabled) this.stop(); }
  statesAt(ms) {
    if (ms < this.lastTime) { this.cursor = 0; this.states.clear(); }
    while (this.cursor < this.events.length && Number(this.events[this.cursor].t || 0) <= ms) {
      const event = this.events[this.cursor++];
      if (!event.id) continue;
      if (event.event === 'removed' || event.event === 'stop' || event.event === 'end') this.states.delete(event.id);
      else this.states.set(event.id, event);
    }
    this.lastTime = ms;
    return this.states;
  }
  sync(ms, playing, speed, camera, now, force = false) {
    if (!this.context || !this.enabled || !playing) { for (const node of this.nodes.values()) node.audio.pause(); return; }
    if (!force && now - this.lastSync < 200) return;
    this.lastSync = now;
    const states = this.statesAt(ms);
    for (const [id, node] of this.nodes) if (!states.has(id) || !states.get(id).playing) {
      node.audio.pause(); node.source.disconnect(); node.gain.disconnect(); node.panner?.disconnect(); node.audio.removeAttribute('src'); node.audio.load(); this.nodes.delete(id);
    }
    if (camera) {
      const listener = this.context.listener;
      if (listener.positionX) { listener.positionX.value = camera.position.x; listener.positionY.value = camera.position.y; listener.positionZ.value = camera.position.z; }
      else listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
      const direction = camera.getWorldDirection(camera.position.clone());
      if (listener.forwardX) { listener.forwardX.value = direction.x; listener.forwardY.value = direction.y; listener.forwardZ.value = direction.z; listener.upX.value = 0; listener.upY.value = 1; listener.upZ.value = 0; }
      else listener.setOrientation(direction.x, direction.y, direction.z, 0, 1, 0);
    }
    for (const [id, recorded] of states) {
      const event = { ...recorded, ...(this.overrides.get(id) || {}) };
      if (!event.playing || !event.soundId || this.nodes.size >= 32 && !this.nodes.has(id)) continue;
      const part = event.spatial ? this.resolvePart(event.partPath) : null;
      if (event.spatial && !part) { this.nodes.get(id)?.audio.pause(); continue; }
      let node = this.nodes.get(id);
      if (node && (node.soundId !== event.soundId || Boolean(node.panner) !== Boolean(event.spatial))) { node.audio.pause(); node.source.disconnect(); node.gain.disconnect(); node.panner?.disconnect(); node.audio.removeAttribute('src'); node.audio.load(); this.nodes.delete(id); node = null; }
      if (!node) {
        try {
          const key = `/api/asset/audio?src=${encodeURIComponent(event.soundId)}`;
          const url = globalThis.__REPLAY_OFFLINE__ ? globalThis.__REPLAY_OFFLINE__.assets[key] : key;
          if (!url) { this.report(`Audio asset unavailable: ${event.soundId}`); continue; }
          const audio = new Audio(url); audio.preload = 'auto';
          const source = this.context.createMediaElementSource(audio);
          const gain = this.context.createGain();
          const panner = event.spatial ? this.context.createPanner() : null;
          source.connect(gain); if (panner) { gain.connect(panner); panner.connect(this.context.destination); } else gain.connect(this.context.destination);
          audio.addEventListener('error', () => this.report(`Audio asset unavailable: ${event.soundId}`));
          node = { audio, source, gain, panner, soundId: event.soundId };
          this.nodes.set(id, node);
        } catch { this.report('Could not create an audio source.'); continue; }
      }
      node.gain.gain.value = Math.max(0, Math.min(10, Number(event.volume) || 0));
      node.audio.loop = Boolean(event.looped);
      node.audio.playbackRate = Math.max(0.1, Math.min(4, (Number(event.playbackSpeed) || 1) * speed));
      if (node.panner && part) {
        node.panner.distanceModel = String(event.rollOffMode || '').includes('Linear') ? 'linear' : 'inverse';
        node.panner.refDistance = Math.max(0.1, Number(event.rollOffMinDistance) || 1);
        node.panner.maxDistance = Math.max(node.panner.refDistance, Number(event.rollOffMaxDistance) || 10000);
        const position = part.localToWorld(part.position.clone().set(Number(event.offset?.x) || 0, Number(event.offset?.y) || 0, Number(event.offset?.z) || 0));
        if (camera && position.distanceTo(camera.position) > node.panner.maxDistance) node.gain.gain.value = 0;
        if (node.panner.positionX) { node.panner.positionX.value = position.x; node.panner.positionY.value = position.y; node.panner.positionZ.value = position.z; }
        else node.panner.setPosition(position.x, position.y, position.z);
      }
      const target = soundOffsetAt(event, ms);
      if (Number.isFinite(target) && (force || Math.abs(node.audio.currentTime - target) > 0.75)) {
        try { node.audio.currentTime = target; } catch {}
      }
      if (node.audio.paused) node.audio.play().catch(() => this.report('Tap Play to enable audio or check asset access.'));
    }
  }
}
