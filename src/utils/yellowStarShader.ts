// utils/yellowStarShader.ts
// yellow_star.png をランダムな位置に3つ、8fpsで表示するエフェクト

export const yellowStarVertexShader = `
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

export const yellowStarFragmentShader = `
  precision mediump float;

  uniform sampler2D u_yellowStarTexture;  // yellow_star.png画像
  uniform float u_time;
  uniform vec2 u_resolution;        // キャンバス解像度
  uniform vec2 u_yellowStarSize;   // yellow_star画像の実サイズ（ピクセル）
  uniform int u_yellowStarCount;   // 同時に表示するyellow_starの数（3）

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

    // 8fpsで更新（1秒に8回）
    float frameTime = u_time * 8.0;
    float frameIndex = floor(frameTime);

    // 複数のyellow_starを描画（3つ）
    for (int i = 0; i < 3; i++) {
      if (i >= u_yellowStarCount) break;

      // フレームベースでユニークなシードを生成
      vec2 seedVec = vec2(frameIndex, float(i) * 0.617);

      // ランダムな位置を生成（0-1の範囲）
      float xRand = hash(seedVec);
      float yRand = hash(seedVec + vec2(1.234));
      vec2 yellowStarCenter = vec2(xRand, yRand);

      // yellow_starのサイズをUV空間（0-1）で計算
      // 高さ基準でサイズを決定し、アスペクト比を維持
      vec2 yellowStarSizeUV;
      yellowStarSizeUV.y = u_yellowStarSize.y / u_resolution.y;
      yellowStarSizeUV.x = u_yellowStarSize.x / u_resolution.x;

      // UV空間でのオフセット
      vec2 offset = v_texCoord - yellowStarCenter;

      // yellow_starテクスチャのUV座標を計算
      vec2 yellowStarUV = offset / yellowStarSizeUV + 0.5;

      // yellow_starテクスチャの範囲内かチェック
      if (yellowStarUV.x >= 0.0 && yellowStarUV.x <= 1.0 &&
          yellowStarUV.y >= 0.0 && yellowStarUV.y <= 1.0) {
        vec4 yellowStarColor = texture2D(u_yellowStarTexture, yellowStarUV);

        // 通常のアルファブレンド（over合成）でyellow_starを重ねる
        if (yellowStarColor.a > 0.01) {
          result.rgb = result.rgb * (1.0 - yellowStarColor.a) + yellowStarColor.rgb * yellowStarColor.a;
          result.a = result.a + yellowStarColor.a * (1.0 - result.a);
        }
      }
    }

    gl_FragColor = result;
  }
`;

export interface YellowStarConfig {
  yellowStarCount: number; // 同時に表示するyellow_starの数（3）
}

export const defaultYellowStarConfig: YellowStarConfig = {
  yellowStarCount: 3,
};

export interface YellowStarShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  yellowStarTexture: WebGLTexture;
  yellowStarImageWidth: number;
  yellowStarImageHeight: number;
  config: YellowStarConfig;
}

export const applyYellowStarShader = (ctx: YellowStarShaderContext): void => {
  const {
    gl,
    program,
    time,
    canvasWidth,
    canvasHeight,
    yellowStarTexture,
    yellowStarImageWidth,
    yellowStarImageHeight,
    config,
  } = ctx;

  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);

  // yellow_starテクスチャをテクスチャユニット0にバインド
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, yellowStarTexture);
  gl.uniform1i(u("u_yellowStarTexture"), 0);

  // その他のユニフォーム
  gl.uniform1f(u("u_time"), time);
  gl.uniform2f(u("u_resolution"), canvasWidth, canvasHeight);
  gl.uniform2f(u("u_yellowStarSize"), yellowStarImageWidth, yellowStarImageHeight);
  gl.uniform1i(u("u_yellowStarCount"), config.yellowStarCount);
};

