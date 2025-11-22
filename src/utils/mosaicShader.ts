// utils/mosaicShader.ts
// p5js の挙動に揃えた WebGL モザイク（px基準, クリック時スプリング）

export const mosaicVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_transform;    // 画面フィット用（contain/cover）の行列
  varying vec2 v_texCoord;

  void main() {
    vec2 pos = (u_transform * vec3(a_position, 1.0)).xy;
    gl_Position = vec4(pos, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// --- 重要ポイント ---
// ・pixelSize は「画面ピクセル基準」で決める
// ・pad(=basePad+extra) で UV を中心からスケール（=拡大）
// ・dx,dy は screen px → UV に変換してから適用
// ・contain/cover の拡縮(u_transform)を考慮するため、NDCスケール(sx,sy)も渡す
export const mosaicFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;

  // 時間・イベント
  uniform float u_time;              // 秒
  uniform float u_effectStart;       // 発火秒。<0 なら非アクティブ
  uniform float u_effectDuration;    // 例: 0.20

  // p5同値パラメータ（すべて px or 物理値）
  uniform float u_minPixel;          // 4
  uniform float u_maxPixel;          // 80
  uniform float u_basePad;           // 60
  uniform float u_zoomExtraMax;      // 24
  uniform float u_springFreq;        // 13 Hz
  uniform float u_springDamp;        // 10
  uniform float u_shakeMax;          // 36 px
  uniform float u_shakeAngle;        // 0..2π

  // キャンバス/動画 実寸
  uniform vec2  u_viewSize;          // [canvasW, canvasH] (px)
  uniform vec2  u_texSize;           // [videoW,  videoH]  (px)

  // 頂点側のフィット拡縮（u_transform のスケール成分）
  // NDCフルスクリーン(2)に対して、表示領域のスケールが sx, sy
  uniform vec2  u_ndcScale;          // [sx, sy] 例: contain で横に黒帯なら sx<1, sy=1

  varying vec2 v_texCoord;

  float spring(float t) {
    return exp(-u_springDamp * t) * cos(6.28318530718 * u_springFreq * t);
  }
  float lerpf(float a, float b, float t){ return a + (b - a) * t; }

  void main(){
    vec2 uv = v_texCoord;

    // --- 単振動でモザイク強度を変化 ---
    // sin は -1 から 1 の範囲なので、0.0 から 1.0 にマッピング
    float oscillation = sin(6.28318530718 * u_springFreq * u_time);
    float env = (oscillation + 1.0) * 0.5;  // 0.0 から 1.0 の範囲

    // --- ピクセルサイズ（画面px基準） ---
    float pixelSizePx = max(1.0, floor(lerpf(u_minPixel, u_maxPixel, env)));

    // --- pad（拡大） ---
    float extraPad = u_zoomExtraMax * env;
    float totalPad = u_basePad + extraPad;
    // UVの中心拡大： scale = view / (view + 2*pad)
    vec2 scale = u_viewSize / (u_viewSize + 2.0 * totalPad);
    vec2 uvZoomed = (uv - 0.5) / scale + 0.5;

    // --- シェイク（無効化） ---
    vec2 uvPerPixel = scale / (u_ndcScale * u_viewSize);   // [UV / screenPx]
    vec2 dxyUV = vec2(0.0);  // シェイク無効化

    // --- 画面px基準の量子化（拡大とフィットを考慮） ---
    // content の 1UV あたりの screen px は (u_ndcScale * u_viewSize) / scale
    // ⇒ UV の量子化ステップ = pixelSizePx * uvPerPixel
    vec2 stepUV = pixelSizePx * uvPerPixel;
    // 0除算ガード
    stepUV = max(stepUV, vec2(1.0/65536.0));

    vec2 pixelatedUV = floor(uvZoomed / stepUV) * stepUV;

    // シェイク適用（無効化されているので変化なし）
    vec2 finalUV = pixelatedUV + dxyUV;

    // サンプリング（端はクランプ）
    finalUV = clamp(finalUV, vec2(0.0), vec2(1.0));
    gl_FragColor = texture2D(u_texture, finalUV);
  }
`;

export interface MosaicConfig {
  // p5準拠パラメータ
  minPixel: number; // 4
  maxPixel: number; // 80
  basePad: number; // 60
  effectDuration: number; // 0.20
  springFreq: number; // 13
  springDamp: number; // 10
  shakeMax: number; // 36
  zoomExtraMax: number; // 24
}

export const defaultMosaicConfig: MosaicConfig = {
  minPixel: 4,
  maxPixel: 80,
  basePad: 60,
  effectDuration: 0.2,
  springFreq: 1,
  springDamp: 10,
  shakeMax: 36,
  zoomExtraMax: 24,
};

// 呼び出し側から “いまの描画状態” をすべて流し込む
export interface MosaicShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number; // 秒
  effectStart: number; // 秒（未発火なら -1）
  shakeAngle: number; // 0..2π
  viewWidth: number; // canvas.width
  viewHeight: number; // canvas.height
  texWidth: number; // video.videoWidth
  texHeight: number; // video.videoHeight
  ndcScaleX: number; // computeQuadTransform の sx
  ndcScaleY: number; // computeQuadTransform の sy
  config: MosaicConfig;
}

export const applyMosaicShader = (ctx: MosaicShaderContext): void => {
  const {
    gl,
    program,
    time,
    effectStart,
    shakeAngle,
    viewWidth,
    viewHeight,
    texWidth,
    texHeight,
    ndcScaleX,
    ndcScaleY,
    config,
  } = ctx;

  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1f(u("u_time"), time);
  gl.uniform1f(u("u_effectStart"), effectStart);
  gl.uniform1f(u("u_effectDuration"), config.effectDuration);

  gl.uniform1f(u("u_minPixel"), config.minPixel);
  gl.uniform1f(u("u_maxPixel"), config.maxPixel);
  gl.uniform1f(u("u_basePad"), config.basePad);
  gl.uniform1f(u("u_zoomExtraMax"), config.zoomExtraMax);
  gl.uniform1f(u("u_springFreq"), config.springFreq);
  gl.uniform1f(u("u_springDamp"), config.springDamp);
  gl.uniform1f(u("u_shakeMax"), config.shakeMax);
  gl.uniform1f(u("u_shakeAngle"), shakeAngle);

  gl.uniform2f(u("u_viewSize"), viewWidth, viewHeight);
  gl.uniform2f(u("u_texSize"), texWidth, texHeight);
  gl.uniform2f(u("u_ndcScale"), ndcScaleX, ndcScaleY);
};
