// Noise Grid シェーダー
// グリッド状のノイズベース円形エフェクト

export const noiseGridVertexShader = `
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

export const noiseGridFragmentShader = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_gridSize;
  uniform float u_delta;
  
  varying vec2 v_texCoord;
  
  // 改良されたノイズ関数（パフォーマンス重視）
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    return mix(mix(mix(hash(i + vec3(0.0, 0.0, 0.0)),
                       hash(i + vec3(1.0, 0.0, 0.0)), f.x),
                   mix(hash(i + vec3(0.0, 1.0, 0.0)),
                       hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
               mix(mix(hash(i + vec3(0.0, 0.0, 1.0)),
                       hash(i + vec3(1.0, 0.0, 1.0)), f.x),
                   mix(hash(i + vec3(0.0, 1.0, 1.0)),
                       hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
  }
  
  void main() {
    vec2 uv = v_texCoord;
    vec4 texColor = texture2D(u_texture, uv);
    
    // グリッド座標を計算
    vec2 gridPos = uv * u_resolution / u_gridSize;
    vec2 gridIndex = floor(gridPos);
    
    // ノイズ値を計算
    float noiseValue = noise(vec3(gridIndex / 10.0, u_time));
    
    // 透明度を計算
    float alpha = 0.5 / (noiseValue + 1.0);
    
    // ランダムな円の描画判定
    float randomValue = noise(vec3(gridIndex, u_time * 1000.0));
    float sineValue = (sin(u_time * 2.0) + 1.0) / 2.0;
    
    vec3 finalColor = texColor.rgb;
    
    if (randomValue < 0.5 * sineValue) {
      // 円のサイズを計算
      float circleSize = 1.5 * u_gridSize * noiseValue;
      
      // グリッド内での相対位置
      vec2 localPos = fract(gridPos) * u_gridSize;
      vec2 center = vec2(u_gridSize / 2.0);
      float distance = length(localPos - center);
      
      // 円の描画
      if (distance < circleSize) {
        // シアン色
        vec3 cyanColor = vec3(0.0, 1.0, 0.8);
        finalColor = mix(texColor.rgb, cyanColor, alpha);
      }
    }
    
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// Noise Grid 設定のインターフェース
export interface NoiseGridConfig {
  gridSize: number; // グリッドサイズ
  delta: number; // デルタ値
}

// Noise Grid シェーダーの適用を一元管理するユーティリティ
export interface NoiseGridShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  config: NoiseGridConfig;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const applyNoiseGridShader = (context: NoiseGridShaderContext): void => {
  const {gl, program, config, time, canvasWidth, canvasHeight} = context;

  // シェーダープログラムを使用
  gl.useProgram(program);

  // ユニフォーム変数を設定
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const gridSizeLocation = gl.getUniformLocation(program, "u_gridSize");
  const deltaLocation = gl.getUniformLocation(program, "u_delta");

  if (resolutionLocation)
    gl.uniform2f(resolutionLocation, canvasWidth, canvasHeight);
  if (timeLocation) gl.uniform1f(timeLocation, time);
  if (gridSizeLocation) gl.uniform1f(gridSizeLocation, config.gridSize);
  if (deltaLocation) gl.uniform1f(deltaLocation, config.delta);

  // シェーダーの設定が完了
  // テクスチャの描画は呼び出し側で行う
};
