// モノクロマティックサイケデリックシェーダー
// 単色のカラースケールで表現するサーマルビジョン風エフェクト

export const psychedelicVertexShader = `
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

export const psychedelicFragmentShader = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform vec3 u_baseColor; // ベースとなる色 (RGB)
  uniform float u_contrastIntensity; // コントラスト効果の強度 (0.0 - 1.0)
  uniform float u_glowIntensity; // グロー効果の強度 (0.0 - 1.0)
  uniform float u_grainIntensity; // フィルムグレインの強度 (0.0 - 1.0)
  uniform vec2 u_resolution; // 解像度
  uniform float u_time; // 時間（グレインのランダム性に使用）
  
  varying vec2 v_texCoord;
  
  // フィルムグレイン用のランダム関数
  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  // 補色を計算
  vec3 getComplementaryColor(vec3 color) {
    return vec3(1.0) - color;
  }
  
  // 類似色を生成（色相をシフト）
  vec3 getAnalogousColor(vec3 color, float shift) {
    // 簡易的な色相シフト
    return vec3(
      color.r * (1.0 - shift) + color.g * shift,
      color.g * (1.0 - shift) + color.b * shift,
      color.b * (1.0 - shift) + color.r * shift
    );
  }
  
  // サイケデリックカラーマッピング（反転＆多色）
  vec3 psychedelicColorMap(float intensity, vec3 baseColor, vec2 uv) {
    // 明度を反転
    float inverted = 1.0 - intensity;
    
    // 空間的なノイズで色のバリエーションを作る
    float colorNoise = random(uv * 3.0);
    
    // 補色と類似色を準備
    vec3 complementary = getComplementaryColor(baseColor);
    vec3 analogous = getAnalogousColor(baseColor, 0.3);
    
    // より強いコントラストでサイケデリックに
    if (inverted < 0.5) {
      // 黒からベースカラーへ（補色を少し混ぜる）
      vec3 darkColor = mix(vec3(0.0, 0.0, 0.1), complementary * 0.3, colorNoise * 0.5);
      vec3 mainColor = mix(darkColor, baseColor * 1.3, inverted * 2.0);
      // 補色を少し混ぜてカラフルに
      return mix(mainColor, complementary * 0.6, colorNoise * 0.2);
    } else {
      // ベースカラーから明るく飽和した色へ（類似色を混ぜる）
      vec3 brightColor = mix(baseColor * 1.3, analogous * 1.2, colorNoise * 0.4);
      vec3 veryBright = mix(brightColor, vec3(1.0, 0.9, 0.8), 0.3);
      vec3 finalColor = mix(brightColor, veryBright, (inverted - 0.5) * 2.0);
      // 補色のアクセントを追加
      return mix(finalColor, complementary * 0.8, colorNoise * 0.15);
    }
  }
  
  // 高コントラスト効果
  vec3 highContrast(vec3 color, float contrast) {
    return pow(color, vec3(1.0 / (1.0 + contrast)));
  }
  
  // グロー効果
  vec3 addGlow(vec3 color, float glow) {
    vec3 glowEffect = color * glow * 0.3;
    return clamp(color + glowEffect, 0.0, 1.0);
  }
  
  // フィルムグレインを追加（強化版）
  vec3 addFilmGrain(vec3 color, vec2 uv, float intensity, float time) {
    // 高解像度のグレイン用に複数のスケールを合成
    vec2 seed1 = uv * u_resolution * 0.5 + vec2(time * 1000.0);
    vec2 seed2 = uv * u_resolution * 1.5 + vec2(time * 1234.0);
    vec2 seed3 = uv * u_resolution * 3.0 + vec2(time * 4567.0);
    
    // 異なるスケールのグレインを合成
    float grain1 = random(seed1) * 2.0 - 1.0;
    float grain2 = random(seed2) * 2.0 - 1.0;
    float grain3 = random(seed3) * 2.0 - 1.0;
    
    // グレインを合成（大きなグレイン + 細かいグレイン）
    float grain = (grain1 * 0.5 + grain2 * 0.3 + grain3 * 0.2);
    
    // より強い効果で色に加える
    return color + vec3(grain) * intensity * 0.25;
  }
  
  void main() {
    vec2 uv = v_texCoord;
    vec4 texColor = texture2D(u_texture, uv);
    
    // 明度を計算
    float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
    
    // サイケデリックカラースケールマッピング（反転＆多色）
    vec3 psychedelicColor = psychedelicColorMap(brightness, u_baseColor, uv);
    
    // 高コントラスト効果
    vec3 contrastColor = highContrast(psychedelicColor, u_contrastIntensity);
    
    // グロー効果
    vec3 glowColor = addGlow(contrastColor, u_glowIntensity);
    
    // フィルムグレインを追加
    vec3 finalColor = addFilmGrain(glowColor, uv, u_grainIntensity, u_time);
    
    // 最終的な色を適切に制限（0.0-1.0の範囲に）
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    // 過度な明度を防ぐための追加制限
    float maxBrightness = 0.85; // 最大明度を85%に制限
    float currentBrightness = (finalColor.r + finalColor.g + finalColor.b) / 3.0;
    if (currentBrightness > maxBrightness) {
      float scale = maxBrightness / currentBrightness;
      finalColor = finalColor * scale;
    }
    
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// サイケデリック設定のインターフェース
export interface PsychedelicConfig {
  baseColor: {r: number; g: number; b: number}; // ベースカラー (0.0 - 1.0)
  contrastIntensity: number; // コントラスト効果の強度 (0.0 - 1.0)
  glowIntensity: number; // グロー効果の強度 (0.0 - 1.0)
  grainIntensity: number; // フィルムグレインの強度 (0.0 - 1.0)
}

// サイケデリックシェーダーの適用を一元管理するユーティリティ
export interface PsychedelicShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  config: PsychedelicConfig;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const applyPsychedelicShader = (
  context: PsychedelicShaderContext
): void => {
  const {gl, program, config, time, canvasWidth, canvasHeight} = context;

  // シェーダープログラムを使用
  gl.useProgram(program);

  // ユニフォーム変数を設定
  const baseColorLocation = gl.getUniformLocation(program, "u_baseColor");
  const contrastIntensityLocation = gl.getUniformLocation(
    program,
    "u_contrastIntensity"
  );
  const glowIntensityLocation = gl.getUniformLocation(
    program,
    "u_glowIntensity"
  );
  const grainIntensityLocation = gl.getUniformLocation(
    program,
    "u_grainIntensity"
  );
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");

  if (baseColorLocation)
    gl.uniform3f(
      baseColorLocation,
      config.baseColor.r,
      config.baseColor.g,
      config.baseColor.b
    );
  if (contrastIntensityLocation)
    gl.uniform1f(contrastIntensityLocation, config.contrastIntensity);
  if (glowIntensityLocation)
    gl.uniform1f(glowIntensityLocation, config.glowIntensity);
  if (grainIntensityLocation)
    gl.uniform1f(grainIntensityLocation, config.grainIntensity);
  if (resolutionLocation)
    gl.uniform2f(resolutionLocation, canvasWidth, canvasHeight);
  if (timeLocation) gl.uniform1f(timeLocation, time);

  // シェーダーの設定が完了
  // テクスチャの描画は呼び出し側で行う
};
