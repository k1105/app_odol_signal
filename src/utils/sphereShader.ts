// 3つの球体シェーダー - ShaderToyのコードをWebGLに移植
// Blue/Yellow/Redの3種類の信号に応じてアクティブ球体が変化

export const sphereVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_transform;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 position = (u_transform * vec3(a_position, 1.0)).xy;
    gl_Position = vec4(position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const sphereFragmentShader = `
  precision mediump float;
  
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform int u_activeSphereIndex; // 0: Blue(Top), 1: Yellow(Mid), 2: Red(Bottom)
  uniform float u_sphereRadius;
  uniform float u_spikeAmplitude;
  uniform float u_betaSoft;
  uniform float u_gapBase;
  uniform float u_gapAmplitude;
  uniform float u_gapFrequency;
  uniform float u_cameraBaseZ;
  uniform float u_cameraAmplitude;
  uniform float u_cameraFrequency;
  uniform float u_rotationSpeed;
  uniform float u_tiltAmplitude;
  uniform float u_tiltFrequency;
  
  // 球体の色（WebGL ES 2.0対応: 配列の代わりに個別のuniform）
  uniform vec3 u_sphereColor0; // Blue
  uniform vec3 u_sphereColor1; // Yellow  
  uniform vec3 u_sphereColor2; // Red
  
  varying vec2 v_texCoord;
  
  // ===== math utils =====
  mat3 rotX(float a) {
    float s = sin(a), c = cos(a);
    return mat3(1.0, 0.0, 0.0,  0.0, c, -s,  0.0, s, c);
  }
  
  mat3 rotZ(float a) {
    float s = sin(a), c = cos(a);
    return mat3(c, -s, 0.0,  s, c, 0.0,  0.0, 0.0, 1.0);
  }
  
  // Ray-sphere intersection (nearest front hit)
  bool intersectSphere(vec3 ro, vec3 rd, vec3 ce, float r,
                       out float tHit, out vec3 pos, out vec3 n) {
    vec3 oc = ro - ce;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - r*r;
    float h = b*b - c;
    if(h < 0.0) return false;
    h = sqrt(h);
    float t0 = -b - h;
    float t1 = -b + h;
    float t = (t0 > 0.0) ? t0 : t1;
    if(t <= 0.0) return false;
    tHit = t;
    pos = ro + rd * t;
    n = normalize(pos - ce);
    return true;
  }
  
  // Entry/Exit (for SDF marching bounds)
  bool intersectSphereNearFar(vec3 ro, vec3 rd, vec3 ce, float r, out float t0, out float t1) {
    vec3 oc = ro - ce;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - r*r;
    float h = b*b - c;
    if(h < 0.0) return false;
    h = sqrt(h);
    t0 = -b - h;
    t1 = -b + h;
    if(t1 <= 0.0) return false;
    t0 = max(t0, 0.0);
    return true;
  }
  
  // Dotted pattern helper for hidden lines (angle-based)
  float dashPattern(vec3 pos, vec3 ce) {
    vec3 u = normalize(pos - ce);
    float ang = atan(u.y, u.x);
    float m = fract((ang / 6.2831853) * 28.0);
    return step(0.52, m);
  }
  
  // ===== Icosahedron directions (normalized) =====
  // WebGL ES 2.0対応: 配列の代わりに個別の変数を使用
  vec3 getIcoDir(int i) {
    if (i == 0) return vec3(-0.8506508, 0.0000000, 0.5257311);
    if (i == 1) return vec3( 0.8506508, 0.0000000, 0.5257311);
    if (i == 2) return vec3(-0.8506508, 0.0000000,-0.5257311);
    if (i == 3) return vec3( 0.8506508, 0.0000000,-0.5257311);
    if (i == 4) return vec3( 0.0000000, 0.5257311, 0.8506508);
    if (i == 5) return vec3( 0.0000000,-0.5257311, 0.8506508);
    if (i == 6) return vec3( 0.0000000, 0.5257311,-0.8506508);
    if (i == 7) return vec3( 0.0000000,-0.5257311,-0.8506508);
    if (i == 8) return vec3( 0.5257311, 0.8506508, 0.0000000);
    if (i == 9) return vec3(-0.5257311, 0.8506508, 0.0000000);
    if (i == 10) return vec3( 0.5257311,-0.8506508, 0.0000000);
    if (i == 11) return vec3(-0.5257311,-0.8506508, 0.0000000);
    return vec3(0.0);
  }
  
  // 滑らかな"ランダム"係数（時間でスムーズに）
  float dirWeight(int i, float t) {
    vec3 dir = getIcoDir(i);
    float ph = 17.0*dir.x + 29.0*dir.y + 47.0*dir.z;
    float w1 = 0.66 + 0.34*sin(0.6*t + ph);
    float w2 = 0.70 + 0.30*sin(1.0*t + ph*1.37);
    return 0.5*(w1 + w2);
  }
  
  // softmax(max) of directional scores（smoothing用）
  float softMaxDirs(vec3 u, float t, float beta) {
    mat3 Rn = rotZ(0.23*t) * rotX(0.37*t);
    float m = -1e9;
    
    // WebGL ES 2.0対応: 配列の代わりに個別の変数を使用
    float val0, val1, val2, val3, val4, val5, val6, val7, val8, val9, val10, val11;
    
    for(int i=0;i<12;i++){
      float v = max(0.0, dot(u, Rn*getIcoDir(i))) * dirWeight(i,t);
      if(i==0) val0 = v;
      else if(i==1) val1 = v;
      else if(i==2) val2 = v;
      else if(i==3) val3 = v;
      else if(i==4) val4 = v;
      else if(i==5) val5 = v;
      else if(i==6) val6 = v;
      else if(i==7) val7 = v;
      else if(i==8) val8 = v;
      else if(i==9) val9 = v;
      else if(i==10) val10 = v;
      else if(i==11) val11 = v;
      m = max(m, v);
    }
    
    float acc = 0.0;
    acc += exp(beta*(val0 - m));
    acc += exp(beta*(val1 - m));
    acc += exp(beta*(val2 - m));
    acc += exp(beta*(val3 - m));
    acc += exp(beta*(val4 - m));
    acc += exp(beta*(val5 - m));
    acc += exp(beta*(val6 - m));
    acc += exp(beta*(val7 - m));
    acc += exp(beta*(val8 - m));
    acc += exp(beta*(val9 - m));
    acc += exp(beta*(val10 - m));
    acc += exp(beta*(val11 - m));
    
    return (log(acc)/beta) + m;
  }
  
  // signed distance for soft poly-spiky sphere
  float sdSpikySmooth(vec3 p, vec3 c, float r, float A, float t) {
    vec3 v = p - c;
    float L = length(v);
    if(L==0.0) return -r;
    vec3 u = v / L;
    float s = softMaxDirs(u, t, u_betaSoft);
    float k = 2.4;
    float disp = A * pow(s, k);
    return L - (r + disp);
  }
  
  // numerical normal（シルエットAA用）
  vec3 spikyNormal(vec3 p, vec3 c, float r, float A, float t) {
    const float e = 0.0015;
    float dx = sdSpikySmooth(p + vec3(e,0,0), c, r, A, t) - sdSpikySmooth(p - vec3(e,0,0), c, r, A, t);
    float dy = sdSpikySmooth(p + vec3(0,e,0), c, r, A, t) - sdSpikySmooth(p - vec3(0,e,0), c, r, A, t);
    float dz = sdSpikySmooth(p + vec3(0,0,e), c, r, A, t) - sdSpikySmooth(p - vec3(0,0,e), c, r, A, t);
    return normalize(vec3(dx,dy,dz));
  }
  
  // WebGL ES 2.0対応: fwidthの代替関数
  float getFwidth(float value) {
    // 簡易的なfwidth代替（実際の実装ではより複雑になる）
    return 0.01; // 固定値を使用
  }
  
  // bounded sphere tracing inside inflated sphere (r + A)
  bool marchSpiky(vec3 ro, vec3 rd, vec3 c, float r, float A,
                  out float tHit, out vec3 pHit) {
    float t0, t1;
    if(!intersectSphereNearFar(ro, rd, c, r + A, t0, t1)) return false;
    float t = t0;
    const int MAX_STEPS = 80;
    for(int i=0;i<MAX_STEPS;i++){
      vec3 p = ro + rd * t;
      float d = sdSpikySmooth(p, c, r, A, u_time);
      if(d < 0.0015){ tHit = t; pHit = p; return true; }
      t += clamp(d, 0.006, 0.18);
      if(t > t1) break;
    }
    return false;
  }
  
  void main() {
    float t = u_time;
    
    // ===== breathing zoom =====
    float camZ = u_cameraBaseZ + u_cameraAmplitude * sin(t * u_cameraFrequency * 6.2831853);
    
    vec2 uv = (v_texCoord * u_resolution - 0.5*u_resolution) / u_resolution.y;
    
    // Camera
    vec3 ro = vec3(0.0, 0.0, camZ);
    vec3 ta = vec3(0.0);
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(vec3(0,1,0), ww));
    vec3 vv = cross(ww, uu);
    vec3 rd = normalize(uv.x*uu + uv.y*vv + 1.9*ww);
    
    // ===== model transform / motion =====
    mat3 R = rotZ(t*u_rotationSpeed) * rotX(sin(t*u_tiltFrequency)*u_tiltAmplitude);
    
    float r = u_sphereRadius;
    float gap = u_gapBase + u_gapAmplitude * sin(t * u_gapFrequency * 6.2831853);
    float h = 2.0*r + gap;
    
    vec3 cTop = R * vec3(0.0,  h, 0.0);
    vec3 cMid = R * vec3(0.0,  0.0, 0.0);
    vec3 cBot = R * vec3(0.0, -h, 0.0);
    
    vec3 C[3];
    C[0] = u_sphereColor0; // Blue (Top)
    C[1] = u_sphereColor1; // Yellow (Mid)
    C[2] = u_sphereColor2; // Red (Bottom)
    
    int activeIdx = u_activeSphereIndex;
    float spikeAmp = u_spikeAmplitude;
    
    // ===== intersections =====
    float tHit[3]; vec3 pHit[3], nHit[3]; bool hit[3];
    hit[0]=hit[1]=hit[2]=false;
    
    // WebGL ES 2.0対応: 配列の代わりに個別の変数を使用
    vec3 center0 = cTop;
    vec3 center1 = cMid;
    vec3 center2 = cBot;
    
    // WebGL ES 2.0対応: ループの代わりに個別の処理
    if(0==activeIdx){
      hit[0] = marchSpiky(ro, rd, center0, r, spikeAmp, tHit[0], pHit[0]);
    }else{
      hit[0] = intersectSphere(ro, rd, center0, r, tHit[0], pHit[0], nHit[0]);
    }
    
    if(1==activeIdx){
      hit[1] = marchSpiky(ro, rd, center1, r, spikeAmp, tHit[1], pHit[1]);
    }else{
      hit[1] = intersectSphere(ro, rd, center1, r, tHit[1], pHit[1], nHit[1]);
    }
    
    if(2==activeIdx){
      hit[2] = marchSpiky(ro, rd, center2, r, spikeAmp, tHit[2], pHit[2]);
    }else{
      hit[2] = intersectSphere(ro, rd, center2, r, tHit[2], pHit[2], nHit[2]);
    }
    
    // nearest
    int frontId=-1; float tMin=1e9;
    if(hit[0] && tHit[0]<tMin){ tMin=tHit[0]; frontId=0; }
    if(hit[1] && tHit[1]<tMin){ tMin=tHit[1]; frontId=1; }
    if(hit[2] && tHit[2]<tMin){ tMin=tHit[2]; frontId=2; }
    
    vec3 col = vec3(0.0); // BG (transparent)
    float alpha = 0.0; // 背景は透明
    
    if(frontId >= 0){
      if(frontId==activeIdx){
        // ---- ACTIVE: matte fill only（輪郭線なし）
        col = (frontId==0) ? C[0] : (frontId==1) ? C[1] : C[2];
        alpha = 1.0; // アクティブ球体は不透明
        
        vec3 center = (frontId==0) ? center0 : (frontId==1) ? center1 : center2;
        vec3 pHitPos = (frontId==0) ? pHit[0] : (frontId==1) ? pHit[1] : pHit[2];
        vec3 ns = spikyNormal(pHitPos, center, r, spikeAmp, t);
        float nDotV = abs(dot(ns, -rd));
        float aa = getFwidth(nDotV)*1.5;
        float edge = smoothstep(0.015, 0.015 + aa, nDotV);
        col = mix(vec3(0.0), col, edge);
      }else{
        // ---- NON-ACTIVE: 白い可視輪郭のみ
        vec3 nHitNormal = (frontId==0) ? nHit[0] : (frontId==1) ? nHit[1] : nHit[2];
        float nDotV = abs(dot(nHitNormal, -rd));
        float aa = getFwidth(nDotV) * 1.5;
        const float lineW = 0.035;
        float edge = 1.0 - smoothstep(lineW, lineW + aa, nDotV);
        col = vec3(edge);
        alpha = edge; // 輪郭線の強度に応じてアルファ値を設定
      }
      
      // ---- Hidden outlines for other NON-ACTIVE spheres
      // WebGL ES 2.0対応: ループの代わりに個別の処理
      if(0!=frontId && hit[0] && 0!=activeIdx && tHit[0] > tMin + 1e-3){
        float nDotVh = abs(dot(nHit[0], -rd));
        float aah = getFwidth(nDotVh) * 1.5;
        const float lineWh = 0.020;
        float edgeH = 1.0 - smoothstep(lineWh, lineWh + aah, nDotVh);
        float dash = dashPattern(pHit[0], center0);
        float hiddenAlpha = 0.45;
        float hiddenEdge = edgeH * dash * hiddenAlpha;
        col = max(col, vec3(hiddenEdge));
        alpha = max(alpha, hiddenEdge);
      }
      
      if(1!=frontId && hit[1] && 1!=activeIdx && tHit[1] > tMin + 1e-3){
        float nDotVh = abs(dot(nHit[1], -rd));
        float aah = getFwidth(nDotVh) * 1.5;
        const float lineWh = 0.020;
        float edgeH = 1.0 - smoothstep(lineWh, lineWh + aah, nDotVh);
        float dash = dashPattern(pHit[1], center1);
        float hiddenAlpha = 0.45;
        float hiddenEdge = edgeH * dash * hiddenAlpha;
        col = max(col, vec3(hiddenEdge));
        alpha = max(alpha, hiddenEdge);
      }
      
      if(2!=frontId && hit[2] && 2!=activeIdx && tHit[2] > tMin + 1e-3){
        float nDotVh = abs(dot(nHit[2], -rd));
        float aah = getFwidth(nDotVh) * 1.5;
        const float lineWh = 0.020;
        float edgeH = 1.0 - smoothstep(lineWh, lineWh + aah, nDotVh);
        float dash = dashPattern(pHit[2], center2);
        float hiddenAlpha = 0.45;
        float hiddenEdge = edgeH * dash * hiddenAlpha;
        col = max(col, vec3(hiddenEdge));
        alpha = max(alpha, hiddenEdge);
      }
    }
    
    // gamma
    col = pow(col, vec3(0.4545));
    gl_FragColor = vec4(col, alpha);
  }
`;

// 球体シェーダー設定のインターフェース
export interface SphereConfig {
  activeSphereIndex: number; // 0: Blue(Top), 1: Yellow(Mid), 2: Red(Bottom)
  sphereColors: {
    [key: string]: {r: number; g: number; b: number};
  };
  sphereRadius: number;
  spikeAmplitude: number;
  betaSoft: number;
  gapBase: number;
  gapAmplitude: number;
  gapFrequency: number;
  cameraBaseZ: number;
  cameraAmplitude: number;
  cameraFrequency: number;
  rotationSpeed: number;
  tiltAmplitude: number;
  tiltFrequency: number;
}

// 球体シェーダーの適用を一元管理するユーティリティ
export interface SphereShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  config: SphereConfig;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const applySphereShader = (context: SphereShaderContext): void => {
  const {gl, program, config, time, canvasWidth, canvasHeight} = context;

  // シェーダープログラムを使用
  gl.useProgram(program);

  // ユニフォーム変数を設定
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const activeSphereIndexLocation = gl.getUniformLocation(
    program,
    "u_activeSphereIndex"
  );
  const sphereRadiusLocation = gl.getUniformLocation(program, "u_sphereRadius");
  const spikeAmplitudeLocation = gl.getUniformLocation(
    program,
    "u_spikeAmplitude"
  );
  const betaSoftLocation = gl.getUniformLocation(program, "u_betaSoft");
  const gapBaseLocation = gl.getUniformLocation(program, "u_gapBase");
  const gapAmplitudeLocation = gl.getUniformLocation(program, "u_gapAmplitude");
  const gapFrequencyLocation = gl.getUniformLocation(program, "u_gapFrequency");
  const cameraBaseZLocation = gl.getUniformLocation(program, "u_cameraBaseZ");
  const cameraAmplitudeLocation = gl.getUniformLocation(
    program,
    "u_cameraAmplitude"
  );
  const cameraFrequencyLocation = gl.getUniformLocation(
    program,
    "u_cameraFrequency"
  );
  const rotationSpeedLocation = gl.getUniformLocation(
    program,
    "u_rotationSpeed"
  );
  const tiltAmplitudeLocation = gl.getUniformLocation(
    program,
    "u_tiltAmplitude"
  );
  const tiltFrequencyLocation = gl.getUniformLocation(
    program,
    "u_tiltFrequency"
  );
  const sphereColor0Location = gl.getUniformLocation(program, "u_sphereColor0");
  const sphereColor1Location = gl.getUniformLocation(program, "u_sphereColor1");
  const sphereColor2Location = gl.getUniformLocation(program, "u_sphereColor2");

  if (resolutionLocation)
    gl.uniform2f(resolutionLocation, canvasWidth, canvasHeight);
  if (timeLocation) gl.uniform1f(timeLocation, time);
  if (activeSphereIndexLocation)
    gl.uniform1i(activeSphereIndexLocation, config.activeSphereIndex);
  if (sphereRadiusLocation)
    gl.uniform1f(sphereRadiusLocation, config.sphereRadius);
  if (spikeAmplitudeLocation)
    gl.uniform1f(spikeAmplitudeLocation, config.spikeAmplitude);
  if (betaSoftLocation) gl.uniform1f(betaSoftLocation, config.betaSoft);
  if (gapBaseLocation) gl.uniform1f(gapBaseLocation, config.gapBase);
  if (gapAmplitudeLocation)
    gl.uniform1f(gapAmplitudeLocation, config.gapAmplitude);
  if (gapFrequencyLocation)
    gl.uniform1f(gapFrequencyLocation, config.gapFrequency);
  if (cameraBaseZLocation)
    gl.uniform1f(cameraBaseZLocation, config.cameraBaseZ);
  if (cameraAmplitudeLocation)
    gl.uniform1f(cameraAmplitudeLocation, config.cameraAmplitude);
  if (cameraFrequencyLocation)
    gl.uniform1f(cameraFrequencyLocation, config.cameraFrequency);
  if (rotationSpeedLocation)
    gl.uniform1f(rotationSpeedLocation, config.rotationSpeed);
  if (tiltAmplitudeLocation)
    gl.uniform1f(tiltAmplitudeLocation, config.tiltAmplitude);
  if (tiltFrequencyLocation)
    gl.uniform1f(tiltFrequencyLocation, config.tiltFrequency);

  // 球体の色を個別に設定
  if (sphereColor0Location) {
    gl.uniform3f(
      sphereColor0Location,
      config.sphereColors.BLUE.r,
      config.sphereColors.BLUE.g,
      config.sphereColors.BLUE.b
    );
  }
  if (sphereColor1Location) {
    gl.uniform3f(
      sphereColor1Location,
      config.sphereColors.YELLOW.r,
      config.sphereColors.YELLOW.g,
      config.sphereColors.YELLOW.b
    );
  }
  if (sphereColor2Location) {
    gl.uniform3f(
      sphereColor2Location,
      config.sphereColors.RED.r,
      config.sphereColors.RED.g,
      config.sphereColors.RED.b
    );
  }

  // シェーダーの設定が完了
};
