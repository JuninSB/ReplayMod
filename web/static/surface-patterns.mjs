// Decode the local DXT1 surface tile in software so browsers do not need
// WEBGL_compressed_texture_s3tc. Roblox's tile contains two studs per axis.
export function decodeDxt1DDS(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 128 || view.getUint32(0, true) !== 0x20534444 || view.getUint32(84, true) !== 0x31545844) throw new Error('Unsupported DDS format');
  const height = view.getUint32(12, true), width = view.getUint32(16, true);
  if (!width || !height || width > 2048 || height > 2048) throw new Error('Invalid DDS dimensions');
  const bw = Math.ceil(width / 4), bh = Math.ceil(height / 4);
  if (view.byteLength < 128 + bw * bh * 8) throw new Error('Truncated DDS');
  const pixels = new Uint8Array(width * height * 4);
  const rgb = n => [Math.round(((n >> 11) & 31) * 255 / 31), Math.round(((n >> 5) & 63) * 255 / 63), Math.round((n & 31) * 255 / 31)];
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const offset = 128 + (by * bw + bx) * 8;
    const c0 = view.getUint16(offset, true), c1 = view.getUint16(offset + 2, true), bits = view.getUint32(offset + 4, true);
    const a = rgb(c0), b = rgb(c1);
    const mix = (x, y, divisor) => a.map((value, i) => Math.floor((value * x + b[i] * y) / divisor));
    const palette = c0 > c1 ? [[...a, 255], [...b, 255], [...mix(2, 1, 3), 255], [...mix(1, 2, 3), 255]] : [[...a, 255], [...b, 255], [...mix(1, 1, 2), 255], [0, 0, 0, 0]];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const px = bx * 4 + x, py = by * 4 + y;
      if (px >= width || py >= height) continue;
      pixels.set(palette[(bits >>> (2 * (y * 4 + x))) & 3], (py * width + px) * 4);
    }
  }
  return { width, height, pixels };
}

export function surfaceKind(value) {
  const name = String(value || '').split('.').pop().toLowerCase();
  return ['studs', 'inlet', 'universal', 'glue', 'weld', 'hinge', 'motor', 'steppingmotor'].includes(name) ? name : '';
}

export function surfaceRepeats(kind, width, height) {
  const repeat = ['studs', 'inlet', 'universal'].includes(kind);
  return repeat ? [Math.max(0, width) / 2, Math.max(0, height) / 2] : [1, 1];
}

// Normalize the neutral source to preserve the part's color. Inlet reverses
// its relief and Universal alternates the two; only Studs is the original.
export function surfacePixels(image, kind) {
  const { width, height, pixels } = image;
  const output = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const value = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    const inset = kind === 'inlet' || kind === 'universal' && (Math.floor(x * 2 / width) + Math.floor(y * 2 / height)) % 2 === 1;
    const gray = Math.max(0, Math.min(255, Math.round(222 + (value - 128) * (inset ? -0.75 : 0.75))));
    output[i] = output[i + 1] = output[i + 2] = gray; output[i + 3] = pixels[i + 3];
  }
  return output;
}
