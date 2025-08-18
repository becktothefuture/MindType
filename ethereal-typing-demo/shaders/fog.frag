precision mediump float;

uniform sampler2D uNoise;
uniform float uAlpha;
uniform vec3 uTint;

varying vec2 vUv0;
varying vec2 vUv1;

void main(){
  float n1 = texture2D(uNoise, vUv0).r;
  float n2 = texture2D(uNoise, vUv1).g;
  float n = 0.6 * n1 + 0.4 * n2;
  n = clamp(n, 0.0, 1.0);
  float a = uAlpha * n;
  gl_FragColor = vec4(uTint, a);
}


