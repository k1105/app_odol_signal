// utils/sparkleShader.ts
// p5js の sparkle エフェクトを WebGL で実装

export const sparkleVertexShader = `
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

export const sparkleFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;      // ビデオテクスチャ
  uniform sampler2D u_starTexture;  // 星画像
  uniform float u_time;
  uniform vec2 u_resolution;        // キャンバス解像度
  uniform vec2 u_starSize;          // 星画像の実サイズ（ピクセル）
  uniform int u_starCount;          // 1フレームあたりの星の数
  uniform float u_minSize;
  uniform float u_maxSize;
  uniform float u_spawnProbability; // 星が出現する確率

  varying vec2 v_texCoord;

  // 疑似乱数生成（ハッシュ関数）
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  // スクリーンブレンドモード
  vec3 screenBlend(vec3 base, vec3 overlay) {
    return vec3(1.0) - (vec3(1.0) - base) * (vec3(1.0) - overlay);
  }

  void main() {
    // ベースのビデオ色
    vec4 baseColor = texture2D(u_texture, v_texCoord);
    vec3 result = baseColor.rgb;

    // 複数の星を描画
    for (int i = 0; i < 32; i++) {
      if (i >= u_starCount) break;

      // 時間ベースでユニークなシードを生成
      float seed = u_time * 60.0 + float(i);
      float frameIndex = floor(seed);
      vec2 seedVec = vec2(frameIndex, float(i) * 0.617);

      // 出現確率チェック
      float spawnRand = hash(seedVec + vec2(0.123));
      if (spawnRand > u_spawnProbability) continue;

      // ランダムな位置を生成（0-1の範囲）
      float xRand = hash(seedVec);
      float yRand = hash(seedVec + vec2(1.234));
      vec2 starCenter = vec2(xRand, yRand);

      // ランダムなサイズ係数
      float sizeRand = hash(seedVec + vec2(2.345));
      float sizeScale = mix(u_minSize, u_maxSize, sizeRand);

      // 星のサイズをUV空間（0-1）で計算
      // 高さ基準でサイズを決定し、アスペクト比を維持
      vec2 starSizeUV;
      starSizeUV.y = (u_starSize.y * sizeScale) / u_resolution.y;
      starSizeUV.x = (u_starSize.x * sizeScale) / u_resolution.x;
      
      // UV空間でのオフセット
      vec2 offset = v_texCoord - starCenter;

      // 星テクスチャのUV座標を計算
      vec2 starUV = offset / starSizeUV + 0.5;

      // 星テクスチャの範囲内かチェック
      if (starUV.x >= 0.0 && starUV.x <= 1.0 && 
          starUV.y >= 0.0 && starUV.y <= 1.0) {
        vec4 starColor = texture2D(u_starTexture, starUV);
        
        // スクリーンブレンドモードで合成（アルファも考慮）
        if (starColor.a > 0.01) {
          vec3 blended = screenBlend(result, starColor.rgb);
          result = mix(result, blended, starColor.a);
        }
      }
    }

    gl_FragColor = vec4(result, baseColor.a);
  }
`;

export interface SparkleConfig {
  starCount: number; // 1フレームあたりの星の数
  minSize: number; // 最小サイズスケール（例: 0.5 = 50%）
  maxSize: number; // 最大サイズスケール（例: 1.5 = 150%）
  spawnProbability: number; // 星が出現する確率（0-1）
}

export const defaultSparkleConfig: SparkleConfig = {
  starCount: 16,
  minSize: 0.5,
  maxSize: 1.5,
  spawnProbability: 0.5,
};

export interface SparkleShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  starTexture: WebGLTexture;
  starImageWidth: number;
  starImageHeight: number;
  config: SparkleConfig;
}

export const applySparkleShader = (ctx: SparkleShaderContext): void => {
  const {
    gl,
    program,
    time,
    canvasWidth,
    canvasHeight,
    starTexture,
    starImageWidth,
    starImageHeight,
    config,
  } = ctx;

  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);

  // 星テクスチャをテクスチャユニット1にバインド
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, starTexture);
  gl.uniform1i(u("u_starTexture"), 1);

  // ビデオテクスチャはテクスチャユニット0（デフォルト）
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(u("u_texture"), 0);

  // その他のユニフォーム
  gl.uniform1f(u("u_time"), time);
  gl.uniform2f(u("u_resolution"), canvasWidth, canvasHeight);
  gl.uniform2f(u("u_starSize"), starImageWidth, starImageHeight);
  gl.uniform1i(u("u_starCount"), config.starCount);
  gl.uniform1f(u("u_minSize"), config.minSize);
  gl.uniform1f(u("u_maxSize"), config.maxSize);
  gl.uniform1f(u("u_spawnProbability"), config.spawnProbability);
};
