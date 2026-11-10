// A visual, non-interactive reconstruction of the recording client's ScreenGuis.
const clamp = (value, low, high, fallback = 0) => Math.max(low, Math.min(high, Number.isFinite(Number(value)) ? Number(value) : fallback));
const number = (value, fallback = 0) => clamp(value, -100000, 100000, fallback);
const color = (value, fallback = '#ffffff') => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
function rgba(value, transparency) {
  const hex = color(value);
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${1 - clamp(transparency, 0, 1)})`;
}
function fontFamily(name) {
  const value = String(name || '').toLowerCase();
  return value.includes('sourcesans') ? 'ReplaySourceSans' : value.includes('roboto') ? 'ReplayRoboto' : value.includes('gotham') || value.includes('montserrat') ? 'ReplayMontserrat' : 'ReplayBuilderSans';
}
export function isRobloxTouchGui(screen) {
  return screen?.name === 'TouchGui' && Array.isArray(screen.items) && screen.items.some(item => item.name === 'TouchControlFrame');
}
export class ScreenGuiView {
  constructor(container, textureUrl) {
    this.container = container;
    this.textureUrl = textureUrl;
    this.state = null;
    this.enabled = false;
    this.dirty = false;
    this.surface = container.ownerDocument.createElement('div');
    this.surface.className = 'recorded-screen-gui-surface';
    container.appendChild(this.surface);
    container.hidden = true;
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(container);
    }
  }
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.container.hidden = !this.enabled;
    if (this.enabled && this.dirty) this.render(this.state, true);
    else if (this.enabled) this.resize();
  }
  resize() {
    const width = clamp(this.state?.width, 1, 10000, 1);
    const height = clamp(this.state?.height, 1, 10000, 1);
    this.surface.style.width = `${width}px`;
    this.surface.style.height = `${height}px`;
    this.surface.style.transform = `scale(${(this.container.clientWidth || width) / width}, ${(this.container.clientHeight || height) / height})`;
  }
  render(state, force = false) {
    if (!force && this.state === state) return;
    this.state = state;
    if (!this.enabled) { this.dirty = true; return; }
    this.dirty = false;
    this.surface.replaceChildren();
    if (!state || !Array.isArray(state.screens)) return;
    const document = this.container.ownerDocument;
    for (const screen of state.screens.slice(0, 200)) {
      // Older captures may include Roblox's default PlayerGui touch controls.
      if (isRobloxTouchGui(screen)) continue;
      const root = document.createElement('div');
      root.className = 'recorded-screen-gui-screen';
      root.style.zIndex = String(Math.round(number(screen.displayOrder)));
      this.surface.appendChild(root);
      const items = Array.isArray(screen.items) ? screen.items.slice(0, 400) : [];
      const nodes = items.map(() => document.createElement('div'));
      items.forEach((item, index) => {
        const node = nodes[index];
        const parentIndex = Math.floor(number(item.parent)) - 1;
        const parent = parentIndex >= 0 && parentIndex < index ? items[parentIndex] : null;
        const target = parent ? nodes[parentIndex] : root;
        node.className = 'recorded-screen-gui-object';
        Object.assign(node.style, {
          left: `${number(item.x) - (parent ? number(parent.x) : 0)}px`, top: `${number(item.y) - (parent ? number(parent.y) : 0)}px`,
          width: `${clamp(item.width, 0, 10000)}px`, height: `${clamp(item.height, 0, 10000)}px`, zIndex: String(Math.round(number(item.z))),
          display: item.visible === false ? 'none' : 'block', overflow: item.clips ? 'hidden' : 'visible',
          transform: `rotate(${number(item.rotation)}deg)`, backgroundColor: rgba(item.color, item.transparency),
        });
        if (item.corner) node.style.borderRadius = `${Math.max(0, number(item.corner.offset) + number(item.corner.scale) * Math.min(number(item.width), number(item.height)))}px`;
        if (item.stroke && (item.stroke.mode !== 'Contextual' || typeof item.text !== 'string')) node.style.boxShadow = `inset 0 0 0 ${clamp(item.stroke.thickness, 0, 100)}px ${rgba(item.stroke.color, item.stroke.transparency)}`;
        else if (number(item.borderSize) > 0) node.style.boxShadow = `inset 0 0 0 ${clamp(item.borderSize, 0, 100)}px ${color(item.borderColor)}`;
        if (Array.isArray(item.gradient?.colors) && item.gradient.colors.length) {
          const stops = item.gradient.colors.slice(0, 20).map(p => `${rgba(p.color, item.transparency)} ${clamp(p.time, 0, 1) * 100}%`).join(', ');
          node.style.backgroundImage = `linear-gradient(${number(item.gradient.rotation) + 90}deg, ${stops})`;
          node.style.backgroundBlendMode = 'multiply';
        }
        if (item.texture) {
          const img = document.createElement('img');
          img.className = 'recorded-screen-gui-image'; img.alt = '';
          img.src = this.textureUrl(String(item.texture));
          img.style.opacity = String(1 - clamp(item.imageTransparency, 0, 1));
          img.style.objectFit = item.scaleType === 'Fit' ? 'contain' : item.scaleType === 'Crop' ? 'cover' : 'fill';
          node.appendChild(img);
        }
        if (typeof item.text === 'string') {
          const label = document.createElement('div');
          label.className = 'recorded-screen-gui-text';
          label.textContent = item.text;
          label.style.color = rgba(item.textColor, item.textTransparency);
          label.style.fontFamily = `${fontFamily(item.font)}, sans-serif`;
          label.style.fontSize = `${clamp(item.textScaled ? Math.min(number(item.height) * 0.8, number(item.width) / Math.max(1, item.text.length) * 1.5) : item.textSize, 1, 300, 14)}px`;
          label.style.whiteSpace = item.textWrapped ? 'pre-wrap' : 'pre';
          label.style.justifyContent = item.textXAlignment === 'Left' ? 'flex-start' : item.textXAlignment === 'Right' ? 'flex-end' : 'center';
          label.style.alignItems = item.textYAlignment === 'Top' ? 'flex-start' : item.textYAlignment === 'Bottom' ? 'flex-end' : 'center';
          label.style.textAlign = item.textXAlignment === 'Left' ? 'left' : item.textXAlignment === 'Right' ? 'right' : 'center';
          label.style.webkitTextStroke = `${item.stroke?.mode === 'Contextual' ? clamp(item.stroke.thickness, 0, 20) : 1 - clamp(item.textStrokeTransparency, 0, 1)}px ${item.stroke?.mode === 'Contextual' ? rgba(item.stroke.color, item.stroke.transparency) : rgba(item.textStrokeColor, item.textStrokeTransparency)}`;
          node.appendChild(label);
        }
        target.appendChild(node);
      });
    }
    this.resize();
  }
}
