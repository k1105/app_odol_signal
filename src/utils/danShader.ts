// utils/danShader.ts
// dan-text.png をランダムな位置に3つ、2fpsで表示するエフェクト（サイズ40%）

export const danVertexShader = `
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

export const danFragmentShader = `
  precision mediump float;

  uniform sampler2D u_danTexture;  // dan-text.png画像
  uniform float u_time;
  uniform vec2 u_resolution;        // キャンバス解像度
  uniform vec2 u_danSize;           // dan画像の実サイズ（ピクセル）
  uniform int u_danCount;           // 同時に表示するdanの数（3）

  varying vec2 v_texCoord;

  // 疑似乱数生成（ハッシュ関数）
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  void main() {
    // 背景は完全透明
    vec4 result = vec4(0.0, 0.0, 0.0, 0.0);

    // 2fpsで更新（1秒に2回）
    float frameTime = u_time * 2.0;
    float frameIndex = floor(frameTime);

    // 複数のdanを描画（3つ）
    for (int i = 0; i < 3; i++) {
      if (i >= u_danCount) break;

      // フレームベースでユニークなシードを生成
      vec2 seedVec = vec2(frameIndex, float(i) * 0.617);

      // ランダムな位置を生成（0-1の範囲）
      float xRand = hash(seedVec);
      float yRand = hash(seedVec + vec2(1.234));
      vec2 danCenter = vec2(xRand, yRand);

      // danのサイズをUV空間（0-1）で計算
      // 高さ基準でサイズを決定し、アスペクト比を維持
      // サイズを20%に縮小
      vec2 danSizeUV;
      danSizeUV.y = (u_danSize.y / u_resolution.y) * 0.2;
      danSizeUV.x = (u_danSize.x / u_resolution.x) * 0.2;

      // UV空間でのオフセット
      vec2 offset = v_texCoord - danCenter;

      // danテクスチャのUV座標を計算
      vec2 danUV = offset / danSizeUV + 0.5;

      // danテクスチャの範囲内かチェック
      if (danUV.x >= 0.0 && danUV.x <= 1.0 &&
          danUV.y >= 0.0 && danUV.y <= 1.0) {
        vec4 danColor = texture2D(u_danTexture, danUV);

        // 通常のアルファブレンド（over合成）でdanを重ねる
        if (danColor.a > 0.01) {
          result.rgb = result.rgb * (1.0 - danColor.a) + danColor.rgb * danColor.a;
          result.a = result.a + danColor.a * (1.0 - result.a);
        }
      }
    }

    gl_FragColor = result;
  }
`;

export interface DanConfig {
  danCount: number; // 同時に表示するdanの数（3）
}

export const defaultDanConfig: DanConfig = {
  danCount: 3,
};

export interface DanShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  danTexture: WebGLTexture;
  danImageWidth: number;
  danImageHeight: number;
  config: DanConfig;
}

export const applyDanShader = (ctx: DanShaderContext): void => {
  const {
    gl,
    program,
    time,
    canvasWidth,
    canvasHeight,
    danTexture,
    danImageWidth,
    danImageHeight,
    config,
  } = ctx;

  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);

  // danテクスチャをテクスチャユニット0にバインド
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, danTexture);
  gl.uniform1i(u("u_danTexture"), 0);

  // その他のユニフォーム
  gl.uniform1f(u("u_time"), time);
  gl.uniform2f(u("u_resolution"), canvasWidth, canvasHeight);
  gl.uniform2f(u("u_danSize"), danImageWidth, danImageHeight);
  gl.uniform1i(u("u_danCount"), config.danCount);
};
