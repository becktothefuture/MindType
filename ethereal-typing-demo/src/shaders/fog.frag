precision mediump float;

uniform sampler2D uNoise;
uniform float uAlpha;
uniform vec3 uTint;

varying vec2 vUv0;
varying vec2 vUv1;

void main(){
  float n1 = texture2D(uNoise, vUv0 * 1.0).r;
  float n2 = texture2D(uNoise, vUv1 * 2.3).g;
  float n3 = texture2D(uNoise, (vUv0 + vUv1) * 0.7).b;
  float n = 0.5 * n1 + 0.35 * n2 + 0.15 * n3; // triple-octave richness
  n = clamp(n, 0.0, 1.0);
  float a = uAlpha * n;
  gl_FragColor = vec4(uTint, a);
}


