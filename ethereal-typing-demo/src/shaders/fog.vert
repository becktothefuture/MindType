precision mediump float;

uniform float uTime;
uniform float uScale;
uniform float uRadialScale;
uniform float uPulse;
uniform float uExpandSpeed;
uniform float uRotSpeed;

varying vec2 vUv0;
varying vec2 vUv1;

void main() {
  vec2 c = (uv - 0.5) * uRadialScale;
  float r = length(c);
  float bulge = 1.0 + uPulse * smoothstep(0.0, 0.8, r);
  float expand = uExpandSpeed * uTime;
  float ang = uRotSpeed * uTime;
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  mat2 Rb = mat2(cos(-ang * 0.6), -sin(-ang * 0.6), sin(-ang * 0.6), cos(-ang * 0.6));
  vec2 a = R * c * (uScale + expand + uPulse * 0.2);
  vec2 b = Rb * c * ((uScale * 1.7) + expand * 1.2 + uPulse * 0.35);
  vUv0 = a + 0.5;
  vUv1 = b + 0.5;
  vec3 pos = position;
  pos.z -= (bulge - 1.0) * 6.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}


