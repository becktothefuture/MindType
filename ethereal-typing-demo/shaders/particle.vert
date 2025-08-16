precision mediump float;

attribute float aAge;
attribute float aLife;
attribute float aSize0;
attribute float aSize1;
attribute float aAlphaBase;
attribute vec3 color;

varying float vAlpha;
varying vec3 vColor;

void main(){
  float t = clamp(aAge / aLife, 0.0, 1.0);
  float size = mix(aSize0, aSize1, t);
  float a = 1.0 - t*t*t;
  vAlpha = a * aAlphaBase;
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}


