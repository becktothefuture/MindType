precision mediump float;

uniform sampler2D uMap;

varying float vAlpha;
varying vec3 vColor;

void main(){
  vec2 uvp = gl_PointCoord;
  float tex = texture2D(uMap, uvp).a;
  vec2 uv = uvp - 0.5;
  float d = length(uv);
  float soft = smoothstep(0.5, 0.0, d);
  float a = vAlpha * soft * tex;
  gl_FragColor = vec4(vColor, a);
}


