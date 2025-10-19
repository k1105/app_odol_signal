/* ============================= Typography Config ============================= */

/**
 * Typography overlay用の Mover クラス
 */
export class Mover {
  pos = {x: 0, y: 0};
  vel = {x: 0, y: 0};
  target = {x: 0, y: 0};
  size = 48;
  sizeVel = 0;
  targetSize = 48;
  k = 0.1;
  damping = 0.8;

  constructor(x: number, y: number, size: number) {
    this.pos = {x, y};
    this.target = {x, y};
    this.size = size;
    this.targetSize = size;
  }

  setTarget(x: number, y: number, size: number) {
    this.target = {x, y};
    this.targetSize = size;
  }

  update() {
    // 位置のスプリング
    const fx = (this.target.x - this.pos.x) * this.k;
    const fy = (this.target.y - this.pos.y) * this.k;
    this.vel.x = (this.vel.x + fx) * this.damping;
    this.vel.y = (this.vel.y + fy) * this.damping;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    // サイズのスプリング
    const fs = (this.targetSize - this.size) * this.k;
    this.sizeVel = (this.sizeVel + fs) * this.damping;
    this.size += this.sizeVel;
  }
}

/**
 * Typography overlay用のリソース
 */
export interface TypographyResources {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: WebGLTexture;
  movers: Mover[];
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
 * Typography リソースを初期化または更新
 * リサイズ時や初回呼び出し時に使用
 */
export function ensureTypographyResources(
  gl: WebGLRenderingContext,
  mainCanvas: HTMLCanvasElement,
  existing?: Partial<TypographyResources>
): TypographyResources {
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
    throw new Error("Failed to get 2D context for typography canvas");
  }

  // 1 CSS px = dpr 画素に
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Movers 初期化（画面中央付近）
  let movers = existing?.movers;
  if (!movers || movers.length === 0) {
    const cx = cssW * 0.5;
    const cy = cssH * 0.5;
    const spread = Math.min(cssW, cssH) * 0.18;
    movers = [
      new Mover(cx - spread, cy, 72),
      new Mover(cx, cy - spread * 0.2, 72),
      new Mover(cx + spread, cy, 72),
    ];
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

  return {canvas, ctx, texture, movers};
}

/**
 * Typography を offscreen canvas に描画
 */
export function drawTypographyToCanvas(
  resources: TypographyResources,
  mainCanvas: HTMLCanvasElement,
  letters: string[] = ["A", "S", "P"]
) {
  const {ctx, movers} = resources;
  const {w: cssW, h: cssH} = getCssSize(mainCanvas);

  // クリア（透明）
  ctx.clearRect(0, 0, cssW, cssH);

  // アップデート
  for (const m of movers) m.update();

  // 線（A→S→P）
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(movers[0].pos.x, movers[0].pos.y);
  ctx.lineTo(movers[1].pos.x, movers[1].pos.y);
  ctx.lineTo(movers[2].pos.x, movers[2].pos.y);
  ctx.stroke();

  // 文字
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < movers.length; i++) {
    const m = movers[i];
    ctx.font = `${Math.max(
      8,
      m.size
    )}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText(letters[i], m.pos.x, m.pos.y);
  }
}

/**
 * offscreen canvas の内容を WebGL テクスチャにアップロード
 */
export function uploadTypographyTexture(
  gl: WebGLRenderingContext,
  resources: TypographyResources
) {
  const {canvas, texture} = resources;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0); // 2Dはそのまま
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
}

/**
 * 文字のターゲット位置とサイズをランダムに設定
 */
export function randomizeTypographyTargets(
  resources: TypographyResources,
  mainCanvas: HTMLCanvasElement
) {
  const {w: cssW, h: cssH} = getCssSize(mainCanvas);
  const {movers} = resources;

  for (const m of movers) {
    const x = Math.random() * cssW * 0.6 + cssW * 0.2;
    const y = Math.random() * cssH * 0.6 + cssH * 0.2;
    const size = 48 + Math.random() * 48;
    m.setTarget(x, y, size);
  }
}
