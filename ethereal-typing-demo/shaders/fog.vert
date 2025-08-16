precision mediump float;

uniform float uTime;
uniform float uScale;
uniform vec2 uScroll;

varying vec2 vUv0;
varying vec2 vUv1;

void main() {
  vUv0 = uv * uScale + uScroll * uTime;
  vUv1 = uv * (uScale * 1.7) - uScroll.yx * (uTime * 0.6);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}


