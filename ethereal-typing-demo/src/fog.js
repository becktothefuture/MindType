import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const FOG_VERT = `
precision mediump float;
uniform float uTime; uniform float uScale; uniform float uRadialScale; uniform float uPulse; uniform float uExpandSpeed; uniform float uRotSpeed; uniform float uAspect; uniform float uPush; uniform float uShock; uniform float uShockRadius;
varying vec2 vUv0; varying vec2 vUv1; varying float vR;
void main(){
  vec2 uvC = uv - 0.5;
  vec2 cMetric = vec2(uvC.x * uAspect, uvC.y) * uRadialScale;
  float r = length(cMetric);
  vR = r;
  float bulge = 1.0 + uPulse * smoothstep(0.0, 0.8, r);
  float expand = uExpandSpeed * uTime + uPush * 0.25; // extra outward expansion when typing
  float ang = uRotSpeed * uTime;
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  mat2 Rb = mat2(cos(-ang * 0.6), -sin(-ang * 0.6), sin(-ang * 0.6), cos(-ang * 0.6));
  vec2 dir = normalize(cMetric + 1e-5);
  // convert metric dir back to UV space (undo aspect on x)
  vec2 dirUv = vec2(dir.x / uAspect, dir.y);
  // central shock: strongest at center, fades by uShockRadius
  float shockW = 1.0 - smoothstep(0.0, max(0.001, uShockRadius), r);
  vec2 shockDisp = dirUv * (uShock * shockW);
  // push clears center by moving UVs radially outward + shock
  vec2 a = R * (uvC + dirUv * (expand + uPush * 0.35) + shockDisp) * (uScale + uPulse * 0.2);
  vec2 b = Rb * (uvC + dirUv * (expand * 1.2 + uPush * 0.5) + shockDisp) * ((uScale * 1.7) + uPulse * 0.35);
  vUv0 = a + 0.5;
  vUv1 = b + 0.5;
  vec3 pos = position;
  pos.z -= (bulge - 1.0) * 6.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;
const FOG_FRAG = `
precision mediump float;
uniform sampler2D uNoise; uniform float uAlpha; uniform vec3 uTint; uniform float uPush; uniform float uVignette; uniform float uShock; varying vec2 vUv0; varying vec2 vUv1; varying float vR;
void main(){
  float n1 = texture2D(uNoise, vUv0 * 1.0).r;
  float n2 = texture2D(uNoise, vUv1 * 2.3).g;
  float n3 = texture2D(uNoise, (vUv0 + vUv1) * 0.7).b;
  float n = 0.5*n1 + 0.35*n2 + 0.15*n3; n = clamp(n,0.0,1.0);
  // Subtle center easing: avoid a vacuum; push lightly reduces center density
  float cf = smoothstep(0.08 + uPush * 0.08, 0.60 + uPush * 0.25, vR);
  float mixAmt = clamp(uPush * 0.35 + uShock * 0.25, 0.0, 0.45);
  float a = uAlpha * n * mix(1.0, cf, mixAmt);
  if (uVignette > 0.001) {
    float vig = smoothstep(1.2, 0.6, vR) * uVignette;
    a *= (1.0 - vig * 0.5);
  }
  gl_FragColor = vec4(uTint, a);
}
`;

export class FogSystem {
  constructor(scene, noiseTexture) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.layers = [];
    const zPositions = [-150, -120, -90, -60, -30];
    this.baseSpeeds = [0.75, 0.65, 0.55, 0.45, 0.35];
    const scales = [1.3, 1.1, 0.9, 0.7, 0.55];
    const rotSpeeds = [0.05, -0.04, 0.035, -0.03, 0.025];
    const expandSpeeds = [0.032, 0.03, 0.028, 0.026, 0.024];

    for (let i = 0; i < zPositions.length; i++) {
      const geom = new THREE.PlaneGeometry(700, 420, 1, 1);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uNoise: { value: noiseTexture },
          uScale: { value: scales[i] },
          uAlpha: { value: 0.14 },
          uTint: { value: new THREE.Color(20 / 255, 40 / 255, 50 / 255) },
          uRadialScale: { value: 1.0 },
          uPulse: { value: 0.25 },
          uExpandSpeed: { value: expandSpeeds[i] },
          uRotSpeed: { value: rotSpeeds[i] },
          uAspect: { value: 1.0 },
          uPush: { value: 0.0 },
          uShock: { value: 0.0 },
          uShockRadius: { value: 0.45 },
          uVignette: { value: 0.0 },
        },
        vertexShader: FOG_VERT,
        fragmentShader: FOG_FRAG,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = zPositions[i];
      this.group.add(mesh);
      this.layers.push({ mesh });
    }
    this.fogSpeedScale = 1.0;
    this._push = 0.0;
    this._shock = 0.0;
    this._shockDecay = 1.8; // per second
    this.wrap = 150; // depth distance to wrap by
  }

  setAlpha(a){ for (const l of this.layers) l.mesh.material.uniforms.uAlpha.value = a; }
  setScale(s){ for (const l of this.layers) l.mesh.material.uniforms.uRadialScale.value = s; }
  setPulse(p){ for (const l of this.layers) l.mesh.material.uniforms.uPulse.value = p; }
  setSpeedScale(s){ this.fogSpeedScale = s; }
  setAspect(a){ for (const l of this.layers) l.mesh.material.uniforms.uAspect.value = a; }
  setPush(p){ this._push = p; for (const l of this.layers) l.mesh.material.uniforms.uPush.value = p; }
  impulse(amount){
    // add a short shock that decays in update()
    this._shock = Math.min(1.5, this._shock + amount);
    for (const l of this.layers) l.mesh.material.uniforms.uShock.value = this._shock;
  }
  setVignette(v){ for (const l of this.layers) l.mesh.material.uniforms.uVignette.value = v; }

  update(dt, time) {
    // decay shock
    if (this._shock > 0) {
      this._shock = Math.max(0, this._shock - this._shockDecay * dt);
      for (const l of this.layers) l.mesh.material.uniforms.uShock.value = this._shock;
    }
    for (let i = 0; i < this.layers.length; i++) {
      const mesh = this.layers[i].mesh;
      const speed = this.baseSpeeds[i] * (this.fogSpeedScale * (1.0 + this._push * 0.6));
      mesh.position.z += speed * dt;
      if (mesh.position.z > 0) mesh.position.z -= this.wrap; // wrap larger span
      mesh.material.uniforms.uTime.value = time;
    }
  }
}


