// utils/rotatingGridShader.ts
// 回転するグリッドパーティクルエフェクト

import type {RotatingGridConfig} from "./rotatingGridConfig";

export const rotatingGridVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_transform;
  varying vec2 v_texCoord;

  void main() {
    vec2 pos = (u_transform * vec3(a_position, 1.0)).xy;
    gl_Position = vec4(pos, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const rotatingGridFragmentShader = `
  precision highp float;

  uniform sampler2D u_texture;      // ビデオテクスチャ
  uniform float u_time;
  uniform vec2 u_resolution;        // キャンバス解像度
  uniform float u_gridSize;         // グリッドサイズ
  uniform float u_particleSize;     // パーティクルサイズ
  uniform float u_rotationSpeed;    // 回転速度
  uniform float u_moveSpeed;        // 移動速度
  uniform float u_noiseScale;       // ノイズスケール
  uniform float u_noiseSpeed;       // ノイズ速度

  varying vec2 v_texCoord;

  // --- ノイズ関数 ---
  vec3 mod289(vec3 x) { 
    return x - floor(x * (1.0 / 289.0)) * 289.0; 
  }
  
  vec2 mod289(vec2 x) { 
    return x - floor(x * (1.0 / 289.0)) * 289.0; 
  }
  
  vec3 permute(vec3 x) { 
    return mod289(((x*34.0)+1.0)*x); 
  }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // 2Dの乱数を生成する関数
  float random(in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // 2D回転行列を作るヘルパー関数
  mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  // スクリーンブレンドモード
  vec3 screenBlend(vec3 base, vec3 overlay) {
    return vec3(1.0) - (vec3(1.0) - base) * (vec3(1.0) - overlay);
  }

  void main() {
    // ベースのビデオ色
    vec4 baseColor = texture2D(u_texture, v_texCoord);

    // アスペクト比を考慮した座標系
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;
    
    // グリッドサイズを時間で変動
    float dynamicGridSize = u_gridSize * (0.6 + 0.4 * sin(u_time));

    // 回転させないグリッドIDを計算（位置や色の決定に使用）
    vec2 grid_uv_orig = uv * dynamicGridSize;
    vec2 id = floor(grid_uv_orig);
    
    // グリッドのローカル座標を取得して回転
    vec2 st = fract(grid_uv_orig);
    
    // 回転角度を時間で変化
    float angle = u_time * u_rotationSpeed;
    
    st -= 0.5;                 // 回転の中心を原点(0,0)に移動
    st = rotate(angle) * st;   // 回転させる
    st += 0.5;                 // 中心を元の位置(0.5,0.5)に戻す

    // 形と動きの計算（回転させないidを使用）
    float rand = random(id);
    float y_offset = fract(u_time * u_moveSpeed * (0.2 + rand * 0.8));
    vec2 p_center = vec2(0.5, y_offset);

    // 回転させたstと球の中心との距離を計算
    float d = distance(st, p_center);

    // 距離を元に、球体を描画
    float dynamicParticleSize = u_particleSize * (0.55 + 0.45 * sin(u_time * 0.7)) + rand * 0.05;
    float circle = 1.0 - smoothstep(0.0, dynamicParticleSize, d);

    // 色の計算（回転させないidを使用）
    float noise_value = snoise(id * u_noiseScale + u_time * u_noiseSpeed);
    float brightness = (noise_value + 1.0) * 0.5;
    
    // ベースカラー #03ffff
    vec3 baseParticleColor = vec3(0.012, 1.0, 1.0);
    vec3 particleColor = baseParticleColor * brightness;

    // カメラ映像とスクリーンブレンド合成
    vec3 result = baseColor.rgb;
    if (circle > 0.01) {
      vec3 blended = screenBlend(baseColor.rgb, particleColor);
      result = mix(baseColor.rgb, blended, circle);
    }

    gl_FragColor = vec4(result, baseColor.a);
  }
`;

export interface RotatingGridShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  config: RotatingGridConfig;
}

export const applyRotatingGridShader = (
  ctx: RotatingGridShaderContext
): void => {
  const {gl, program, time, canvasWidth, canvasHeight, config} = ctx;

  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);

  // ビデオテクスチャはテクスチャユニット0（デフォルト）
  gl.uniform1i(u("u_texture"), 0);

  // ユニフォームの設定
  gl.uniform1f(u("u_time"), time);
  gl.uniform2f(u("u_resolution"), canvasWidth, canvasHeight);
  gl.uniform1f(u("u_gridSize"), config.gridSize);
  gl.uniform1f(u("u_particleSize"), config.particleSize);
  gl.uniform1f(u("u_rotationSpeed"), config.rotationSpeed);
  gl.uniform1f(u("u_moveSpeed"), config.moveSpeed);
  gl.uniform1f(u("u_noiseScale"), config.noiseScale);
  gl.uniform1f(u("u_noiseSpeed"), config.noiseSpeed);
};
