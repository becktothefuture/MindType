import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import {
  clamp,
  lerp,
  randRange,
  hslToRgb,
  rgbToHex,
  randUnitVec2,
  curl2,
} from './utils.js';

// Palette in hex; we convert to HSL for variation when spawning
const PALETTE = [
  0x0bb3a6, // tealDeep
  0x1486ff, // ocean
  0x39d3c7, // aqua
  0x4aa3ff, // blueSoft
  0x2bc4a0, // seaGreen
];

function hexToHsl(hex) {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, s, l];
}

export class BurstSystem {
  constructor(scene, particleTexture, config) {
    this.config = config;
    this.max = config.particles.maxActive;
    this.time = 0;

    // Geometry attributes (pre-allocated)
    this.positions = new Float32Array(this.max * 3);
    this.velocities = new Float32Array(this.max * 3);
    this.age = new Float32Array(this.max);
    this.life = new Float32Array(this.max);
    this.size0 = new Float32Array(this.max);
    this.size1 = new Float32Array(this.max);
    this.color = new Float32Array(this.max * 3);
    this.alphaBase = new Float32Array(this.max);

    this.active = 0; // number of active particles
    this.head = 0; // ring buffer head (oldest)

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geom.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1));
    geom.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    geom.setAttribute('aSize0', new THREE.BufferAttribute(this.size0, 1));
    geom.setAttribute('aSize1', new THREE.BufferAttribute(this.size1, 1));
    geom.setAttribute('color', new THREE.BufferAttribute(this.color, 3));
    geom.setAttribute('aAlphaBase', new THREE.BufferAttribute(this.alphaBase, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: particleTexture } },
      vertexShader: `
        precision mediump float;
        attribute float aAge; attribute float aLife; attribute float aSize0; attribute float aSize1; attribute float aAlphaBase;
        varying float vAlpha; varying vec3 vColor;
        void main(){
          float t = clamp(aAge / aLife, 0.0, 1.0);
          float size = mix(aSize0, aSize1, t);
          // Ease-out curve: slower fade, longer linger time
          float fadeStart = 0.4; // fade begins at 40% of lifetime
          float easedAlpha = t < fadeStart ? 1.0 : 1.0 - pow((t - fadeStart) / (1.0 - fadeStart), 1.8);
          float a = easedAlpha;
          vAlpha = a * aAlphaBase; 
          // Boost saturation as particles fade to prevent desaturation
          vec3 col = color;
          float luminance = dot(col, vec3(0.299, 0.587, 0.114));
          vec3 saturated = mix(vec3(luminance), col, 1.0 + (t * 0.5)); // increase saturation over time
          vColor = clamp(saturated, 0.0, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision mediump float; uniform sampler2D uMap; varying float vAlpha; varying vec3 vColor;
        void main(){ vec2 uvp = gl_PointCoord; float tex = texture2D(uMap, uvp).a; vec2 uv = uvp - 0.5; float d = length(uv); float soft = smoothstep(0.5, 0.0, d); float a = vAlpha * soft * tex; gl_FragColor = vec4(vColor, a); }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.points = new THREE.Points(geom, mat);
    this.points.geometry.setDrawRange(0, 0);
    scene.add(this.points);

    // Bloom booster: fewer, larger points, low alpha
    this.boostPositions = new Float32Array(this.max * 3);
    this.boostAge = new Float32Array(this.max);
    this.boostLife = new Float32Array(this.max);
    this.boostSize0 = new Float32Array(this.max);
    this.boostSize1 = new Float32Array(this.max);
    this.boostAlphaBase = new Float32Array(this.max);
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(this.boostPositions, 3));
    g2.setAttribute('aAge', new THREE.BufferAttribute(this.boostAge, 1));
    g2.setAttribute('aLife', new THREE.BufferAttribute(this.boostLife, 1));
    g2.setAttribute('aSize0', new THREE.BufferAttribute(this.boostSize0, 1));
    g2.setAttribute('aSize1', new THREE.BufferAttribute(this.boostSize1, 1));
    g2.setAttribute('aAlphaBase', new THREE.BufferAttribute(this.boostAlphaBase, 1));
    const m2 = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: particleTexture } },
      vertexShader: `
        precision mediump float;
        attribute float aAge; attribute float aLife; attribute float aSize0; attribute float aSize1; attribute float aAlphaBase;
        varying float vAlpha; varying vec3 vBoostColor;
        void main(){
          float t = clamp(aAge / aLife, 0.0, 1.0);
          float size = mix(aSize0, aSize1, t);
          // Same ease-out curve for boost particles
          float fadeStart = 0.4;
          float easedAlpha = t < fadeStart ? 1.0 : 1.0 - pow((t - fadeStart) / (1.0 - fadeStart), 1.8);
          float a = easedAlpha;
          vAlpha = a * aAlphaBase;
          // Boost particles get saturated teal/blue color that intensifies over time
          vec3 baseColor = vec3(0.2, 0.8, 0.9); // saturated cyan-teal
          float satBoost = 1.0 + (t * 0.3);
          vBoostColor = baseColor * satBoost;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        precision mediump float; uniform sampler2D uMap; varying float vAlpha; varying vec3 vBoostColor;
        void main(){ vec2 uvp = gl_PointCoord; float tex = texture2D(uMap, uvp).a; vec2 uv = uvp - 0.5; float d = length(uv); float soft = smoothstep(0.5, 0.0, d); float a = vAlpha * soft * tex * 0.6; gl_FragColor = vec4(vBoostColor, a); }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.boostPoints = new THREE.Points(g2, m2);
    this.boostPoints.geometry.setDrawRange(0, 0);
    scene.add(this.boostPoints);

    // Scratch arrays to avoid allocations
    this._dir = [0, 0];
    this._curl = [0, 0];

    // Initialize inactive entries to be invisible and numerically safe
    for (let i = 0; i < this.max; i++) {
      this.age[i] = 1;
      this.life[i] = 1;
      this.size0[i] = 0;
      this.size1[i] = 0;
      this.alphaBase[i] = 0;
      const i3 = i * 3;
      this.positions[i3] = this.positions[i3 + 1] = this.positions[i3 + 2] = 0;
      this.color[i3] = this.color[i3 + 1] = this.color[i3 + 2] = 0;
      this.boostAge[i] = 1;
      this.boostLife[i] = 1;
      this.boostSize0[i] = 0;
      this.boostSize1[i] = 0;
      this.boostAlphaBase[i] = 0;
      this.boostPositions[i3] =
        this.boostPositions[i3 + 1] =
        this.boostPositions[i3 + 2] =
          0;
    }
  }

  _alloc(count) {
    const indices = new Uint16Array(count);
    for (let i = 0; i < count; i++) {
      if (this.active >= this.max) {
        // recycle oldest (head)
        const idx = this.head;
        this.head = (this.head + 1) % this.max;
        indices[i] = idx;
      } else {
        indices[i] = this.active++;
      }
    }
    return indices;
  }

  spawnBurst(intensity, xy, glowBoost = 1.0) {
    const cfg = this.config;
    // Gate emission: when density/energy pad at (0,0), emit nothing
    const energy = Math.max(0, Math.min(1, xy.x * xy.y));
    if (energy <= 0.001) return;
    const count = Math.round(
      lerp(6, 120, intensity) *
        Math.max(0.0001, Math.pow(xy.x, 2)) *
        this.config.particles.countScale,
    );
    const speed = lerp(0.6, 2.8, intensity) * lerp(0.5, 3.0, xy.y);
    const size0 = lerp(10, 20, intensity) * this.config.particles.sizeScale;
    const size1 = lerp(0, 8, intensity * 0.6) * this.config.particles.sizeScale;

    const mainIdx = this._alloc(count);

    const baseHex = PALETTE[(Math.random() * PALETTE.length) | 0];
    const [bh, bs, bl] = hexToHsl(baseHex);

    for (let k = 0; k < mainIdx.length; k++) {
      const i = mainIdx[k];
      const i3 = i * 3;
      this.positions[i3] = 0;
      this.positions[i3 + 1] = 0;
      this.positions[i3 + 2] = 0;
      this.age[i] = 0;
      const life = randRange(2.7, 4.8) * lerp(0.9, 1.1, xy.x); // 3x longer lifespan
      this.life[i] = life;
      this.size0[i] = size0;
      this.size1[i] = size1;

      randUnitVec2(this._dir);
      const spread = lerp(0.6, 1.0, xy.y);
      const vx = this._dir[0] * speed * spread;
      const vy = this._dir[1] * speed * spread;
      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = 0;

      // Color variation in HSL - maintain high saturation always
      const hj = this.config.particles.hueJitterDeg;
      const h = (bh + randRange(-hj, hj) / 360) % 1.0;
      const minS = this.config.particles.minSaturation;
      const s = clamp(Math.max(bs + randRange(-0.05, 0.1), minS), minS, 1.0); // force high saturation
      const l = clamp(bl + randRange(0.02, 0.08), 0.15, 0.6); // keep luminance moderate, never white
      const [r, g, b] = hslToRgb(h, s, l);
      this.color[i3] = r;
      this.color[i3 + 1] = g;
      this.color[i3 + 2] = b;
      const burstAlphaMul =
        typeof window !== 'undefined' && window.__burstAlpha != null
          ? window.__burstAlpha
          : 1.0;
      this.alphaBase[i] =
        0.85 *
        burstAlphaMul *
        this.config.particles.brightnessScale *
        glowBoost *
        (0.6 + 0.4 * energy);
    }

    // Bloom booster particles (subset)
    const boostCount = Math.round(
      randRange(6, 12) * 0.7 * Math.max(0.6, glowBoost) * (0.4 + 0.6 * energy),
    );
    const boostIdx = this._alloc(boostCount);
    for (let k = 0; k < boostIdx.length; k++) {
      const i = boostIdx[k];
      const i3 = i * 3;
      this.boostPositions[i3] = 0;
      this.boostPositions[i3 + 1] = 0;
      this.boostPositions[i3 + 2] = 0;
      this.boostAge[i] = 0;
      const life = randRange(2.7, 4.8) * lerp(0.9, 1.1, xy.x); // 3x longer lifespan for boost too
      this.boostLife[i] = life;
      this.boostSize0[i] = size0 * 1.8;
      this.boostSize1[i] = size1 * 1.8;
      const burstAlphaMul2 =
        typeof window !== 'undefined' && window.__burstAlpha != null
          ? window.__burstAlpha
          : 1.0;
      this.boostAlphaBase[i] =
        0.22 * burstAlphaMul2 * this.config.particles.brightnessScale * glowBoost;
      // Share velocity field for booster as slower drift
      randUnitVec2(this._dir);
      const vx = this._dir[0] * speed * 0.6;
      const vy = this._dir[1] * speed * 0.6;
      // Store in same velocity buffer for convenience (share motion)
      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
    }

    // Mark attributes as needing update once after spawning
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAge.needsUpdate = true;
    g.attributes.aLife.needsUpdate = true;
    g.attributes.aSize0.needsUpdate = true;
    g.attributes.aSize1.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.aAlphaBase.needsUpdate = true;

    const gb = this.boostPoints.geometry;
    gb.attributes.position.needsUpdate = true;
    gb.attributes.aAge.needsUpdate = true;
    gb.attributes.aLife.needsUpdate = true;
    gb.attributes.aSize0.needsUpdate = true;
    gb.attributes.aSize1.needsUpdate = true;
    gb.attributes.aAlphaBase.needsUpdate = true;

    // Update draw ranges to include all possibly active vertices
    this.points.geometry.setDrawRange(0, this.active);
    this.boostPoints.geometry.setDrawRange(0, this.active);
  }

  update(dt) {
    this.time += dt;
    const curlAmp = this.config.particles.curlAmp; // units/sec
    const curlHz = 1.3;

    // Update main particles
    for (let i = 0; i < this.active; i++) {
      const i3 = i * 3;
      const age = this.age[i];
      const life = this.life[i];
      if (life <= 0) continue;
      const nAge = age + dt;
      this.age[i] = nAge;
      const t = nAge / life;
      if (t >= 1.0) {
        // recycle invisibly (avoid NaNs in shader)
        this.age[i] = 1;
        this.life[i] = 1;
        this.alphaBase[i] = 0;
        this.size0[i] = 0;
        this.size1[i] = 0;
        continue;
      }
      // Curl perturbation
      curl2(
        this._curl,
        this.positions[i3],
        this.positions[i3 + 1],
        this.time * curlHz,
        curlAmp * dt,
      );
      this.velocities[i3] += this._curl[0];
      this.velocities[i3 + 1] += this._curl[1];
      // Integrate
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      // Size/alpha curves are handled in shader via attributes
    }

    // Booster ages (share motion already updated since we reuse velocities)
    for (let i = 0; i < this.active; i++) {
      const age = this.boostAge[i];
      const life = this.boostLife[i];
      if (life <= 0) continue;
      const nAge = age + dt;
      this.boostAge[i] = nAge;
      const t = nAge / life;
      if (t >= 1.0) {
        this.boostAge[i] = 1;
        this.boostLife[i] = 1;
        this.boostAlphaBase[i] = 0;
        this.boostSize0[i] = 0;
        this.boostSize1[i] = 0;
        continue;
      }
      const i3 = i * 3;
      this.boostPositions[i3] += this.velocities[i3] * dt;
      this.boostPositions[i3 + 1] += this.velocities[i3 + 1] * dt;
    }

    // Flag updated attributes; avoid recreating attributes
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAge.needsUpdate = true;

    const gb = this.boostPoints.geometry;
    gb.attributes.position.needsUpdate = true;
    gb.attributes.aAge.needsUpdate = true;
    // alpha base may have changed for recycled particles
    g.attributes.aAlphaBase.needsUpdate = true;
    gb.attributes.aAlphaBase.needsUpdate = true;
  }
}
