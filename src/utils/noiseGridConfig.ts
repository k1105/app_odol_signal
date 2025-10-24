/* ============================= Noise Grid Config ============================= */

/**
 * Noise Grid overlay用の状態管理クラス
 */
export class NoiseGridState {
  frameCount = 0;
  gridSize = 20;
  delta = 100;
  time = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.frameCount = 0;
    this.time = 0;
  }

  update() {
    this.frameCount++;
    this.time = this.frameCount * 0.016; // Approximate 60fps timing
  }
}

/**
 * Noise Grid overlay用のリソース
 */
export interface NoiseGridResources {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: WebGLTexture;
  state: NoiseGridState;
}

/**
 * Canvas の CSS サイズを取得
 */
function getCssSize(el: HTMLCanvasElement) {
  const w = el.clientWidth || el.offsetWidth || window.innerWidth;
  const h = el.clientHeight || el.offsetHeight || window.innerHeight;
  return {w, h};
}

/**
 * Noise Grid リソースを初期化または更新
 */
export function ensureNoiseGridResources(
  gl: WebGLRenderingContext,
  mainCanvas: HTMLCanvasElement,
  existing?: Partial<NoiseGridResources>
): NoiseGridResources {
  const {w: cssW, h: cssH} = getCssSize(mainCanvas);
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  // Offscreen canvas
  let canvas = existing?.canvas;
  if (!canvas) {
    canvas = document.createElement("canvas");
  }
  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));

  const ctx = canvas.getContext("2d", {
    alpha: true,
  }) as CanvasRenderingContext2D;
  if (!ctx) {
    throw new Error("Failed to get 2D context for noise grid canvas");
  }

  // 1 CSS px = dpr 画素に
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // State 初期化
  let state = existing?.state;
  if (!state) {
    state = new NoiseGridState();
  }

  // WebGL テクスチャ
  let texture = existing?.texture;
  if (!texture) {
    texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  return {canvas, ctx, texture, state};
}

/**
 * 改良されたノイズ関数（パフォーマンス重視）
 */
function noise(x: number, y: number, z: number): number {
  // より良いハッシュ関数
  function hash(n: number): number {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  // 整数部分と小数部分
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  // スムーズ補間関数
  const u = xf * xf * (3.0 - 2.0 * xf);
  const v = yf * yf * (3.0 - 2.0 * yf);
  const w = zf * zf * (3.0 - 2.0 * zf);

  // 8つの角のハッシュ値
  const a = hash(xi + yi * 57 + zi * 113);
  const b = hash(xi + 1 + yi * 57 + zi * 113);
  const c = hash(xi + (yi + 1) * 57 + zi * 113);
  const d = hash(xi + 1 + (yi + 1) * 57 + zi * 113);
  const e = hash(xi + yi * 57 + (zi + 1) * 113);
  const f = hash(xi + 1 + yi * 57 + (zi + 1) * 113);
  const g = hash(xi + (yi + 1) * 57 + (zi + 1) * 113);
  const h = hash(xi + 1 + (yi + 1) * 57 + (zi + 1) * 113);

  // 3次元補間
  const i1 = a + (b - a) * u;
  const i2 = c + (d - c) * u;
  const j1 = e + (f - e) * u;
  const j2 = g + (h - g) * u;

  const k1 = i1 + (i2 - i1) * v;
  const k2 = j1 + (j2 - j1) * v;

  return k1 + (k2 - k1) * w;
}

/**
 * Noise Grid を offscreen canvas に描画
 */
export function drawNoiseGridToCanvas(
  resources: NoiseGridResources,
  mainCanvas: HTMLCanvasElement
) {
  const {ctx, state} = resources;
  const {w: cssW, h: cssH} = getCssSize(mainCanvas);

  // 状態を更新
  state.update();

  // フェード効果で背景をクリア（カメラ映像が見えるように）
  ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
  ctx.fillRect(0, 0, cssW, cssH);

  const r = state.gridSize;
  const time = state.time;

  // グリッドを描画
  for (let i = 0; i < cssH / r + 1; i++) {
    for (let j = 0; j < cssW / r + 1; j++) {
      const x = j * r;
      const y = i * r;

      // ノイズベースの透明度計算（より正確なパーリンノイズ）
      const noiseValue = noise(i / 10, j / 10, time);
      const alpha = 0.5 / (noiseValue + 1);

      // ランダムな円の描画判定
      const randomValue = Math.random();
      const sineValue = (Math.sin(time * 2) + 1) / 2;

      if (randomValue < 0.5 * sineValue) {
        const circleSize = 1.5 * r * noiseValue;

        // シアン色の円を描画
        ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, circleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * offscreen canvas の内容を WebGL テクスチャにアップロード
 */
export function uploadNoiseGridTexture(
  gl: WebGLRenderingContext,
  resources: NoiseGridResources
) {
  const {canvas, texture} = resources;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
}

/**
 * Noise Grid をリセット
 */
export function resetNoiseGrid(resources: NoiseGridResources) {
  resources.state.reset();
}
