// Utility helpers: math easing, RNG, color conversions, and tiny simplex-like noise

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randUnitVec2(out) {
  const a = Math.random() * Math.PI * 2;
  out[0] = Math.cos(a);
  out[1] = Math.sin(a);
  return out;
}

// HSL to RGB (0..1 ranges) for soft palette variations
export function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

export function rgbToHex(r, g, b) {
  const ri = (r * 255) | 0;
  const gi = (g * 255) | 0;
  const bi = (b * 255) | 0;
  return (ri << 16) | (gi << 8) | bi;
}

// Simple 2D pseudo-noise via value noise on a grid; deterministic but fast
const NOISE_SIZE = 256;
const noisePerm = new Uint8Array(NOISE_SIZE);
for (let i = 0; i < NOISE_SIZE; i++) noisePerm[i] = i;
// Shuffle
for (let i = NOISE_SIZE - 1; i > 0; i--) {
  const j = (Math.random() * (i + 1)) | 0;
  const t = noisePerm[i];
  noisePerm[i] = noisePerm[j];
  noisePerm[j] = t;
}

function hash2(ix, iy) {
  return noisePerm[(ix + noisePerm[iy % NOISE_SIZE]) % NOISE_SIZE] / 255;
}

export function valueNoise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const v00 = hash2(ix, iy);
  const v10 = hash2(ix + 1, iy);
  const v01 = hash2(ix, iy + 1);
  const v11 = hash2(ix + 1, iy + 1);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = v00 * (1 - sx) + v10 * sx;
  const b = v01 * (1 - sx) + v11 * sx;
  return a * (1 - sy) + b * sy;
}

// Curl-like perturbation from noise by sampling gradients
export function curl2(out, x, y, t, amp = 1) {
  const e = 0.01;
  const n1 = valueNoise2((x + e) * 1.3 + 0.7 * t, y * 1.3 + 0.3 * t);
  const n2 = valueNoise2((x - e) * 1.3 + 0.7 * t, y * 1.3 + 0.3 * t);
  const n3 = valueNoise2(x * 1.3 + 0.7 * t, (y + e) * 1.3 + 0.3 * t);
  const n4 = valueNoise2(x * 1.3 + 0.7 * t, (y - e) * 1.3 + 0.3 * t);
  out[0] = (n1 - n2) * amp;
  out[1] = (n3 - n4) * amp;
  return out;
}

// Tiny helper to generate a soft radial sprite (particle) as a data URL
export function makeSoftParticleDataURL(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.40)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.12)');
  g.addColorStop(0.85, 'rgba(255,255,255,0.02)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Dither ring to reduce banding
  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // add tiny blue-noise like grain to alpha
      const n = ((x * 13 + y * 17) % 23) / 255; // deterministic small noise
      data[idx + 3] = Math.min(255, data[idx + 3] + n * 8);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

// Transparent noise grain tile (subtle). We purposely make a very light alpha noise.
export function makeGrainDataURL(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    // Dark grain: near-black values with moderate alpha so it darkens glass
    const v = (Math.random() * 40) | 0; // 0..39 (dark)
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 40; // base alpha; overall opacity is still controlled via CSS slider
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
