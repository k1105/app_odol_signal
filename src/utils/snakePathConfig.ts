/* ============================= Snake Path Config ============================= */

/**
 * Snake Path overlay用の状態管理クラス
 */
export class SnakePathState {
  pos: Array<{x: number; y: number}> = [];
  x = 0;
  y = 0;
  dirAngle = 0;
  textPos = {x: 0, y: 0};
  frameCount = 0;
  weight = 20;
  scale = 20;
  maxLength = 100;

  constructor() {
    this.reset();
  }

  reset() {
    this.pos = [];
    this.x = 0;
    this.y = 0;
    this.dirAngle = 0;
    this.textPos = {x: 0, y: 0};
    this.frameCount = 0;
  }

  update(canvasWidth: number, canvasHeight: number) {
    this.frameCount++;

    // 12フレームごとにランダムで方向転換
    if (this.frameCount % 12 === 0) {
      const r = Math.floor(Math.random() * 3);
      switch (r) {
        case 0:
          this.dirAngle += Math.PI / 2;
          break;
        case 1:
          this.dirAngle -= Math.PI / 2;
          break;
        // case 2: そのまま
      }
    }

    // 移動
    this.x += Math.cos(this.dirAngle);
    this.y += Math.sin(this.dirAngle);

    // 画面端の判定
    const s = this.scale;
    const halfW = canvasWidth / 2;
    const halfH = canvasHeight / 2;

    if (
      s * this.x > halfW ||
      s * this.x < -halfW ||
      s * this.y > halfH ||
      s * this.y < -halfH
    ) {
      this.dirAngle += Math.PI / 2;
      this.x += Math.cos(this.dirAngle);
      this.y += Math.sin(this.dirAngle);
    }

    // 軌跡に追加
    this.pos.push({x: this.x, y: this.y});
    if (this.pos.length > this.maxLength) {
      this.pos.shift();
    }

    // テキスト位置の更新
    if (this.frameCount % 20 === 0) {
      this.textPos = {x: s * this.x, y: s * this.y};
    }
  }
}

/**
 * Snake Path overlay用のリソース
 */
export interface SnakePathResources {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: WebGLTexture;
  state: SnakePathState;
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
 * Snake Path リソースを初期化または更新
 */
export function ensureSnakePathResources(
  gl: WebGLRenderingContext,
  mainCanvas: HTMLCanvasElement,
  existing?: Partial<SnakePathResources>
): SnakePathResources {
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
    throw new Error("Failed to get 2D context for snake path canvas");
  }

  // 1 CSS px = dpr 画素に
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // State 初期化
  let state = existing?.state;
  if (!state) {
    state = new SnakePathState();
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
 * 矢印を描画
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  endPoint: {x: number; y: number},
  direction: {x: number; y: number}
) {
  ctx.save();
  ctx.translate(endPoint.x, endPoint.y);

  // 方向に応じて回転
  if (Math.abs(direction.x) < Math.abs(direction.y)) {
    if (direction.y > 0) ctx.rotate(Math.PI / 2);
    else ctx.rotate(-Math.PI / 2);
  } else {
    if (direction.x < 0) ctx.rotate(Math.PI);
  }

  // 左の線
  ctx.save();
  ctx.rotate((-3 * Math.PI) / 4);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(50, 0);
  ctx.stroke();
  ctx.restore();

  // 右の線
  ctx.save();
  ctx.rotate((3 * Math.PI) / 4);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(50, 0);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Snake Path を offscreen canvas に描画
 */
export function drawSnakePathToCanvas(
  resources: SnakePathResources,
  mainCanvas: HTMLCanvasElement
) {
  const {ctx, state} = resources;
  const {w: cssW, h: cssH} = getCssSize(mainCanvas);

  // 透明にクリア（カメラ映像が見えるように）
  ctx.clearRect(0, 0, cssW, cssH);

  // 状態を更新
  state.update(cssW, cssH);

  // 座標系を中央に移動
  ctx.save();
  ctx.translate(cssW / 2, cssH / 2);

  const s = state.scale;

  // 青い背景を塗る（スクリーンブレンド用）
  ctx.fillStyle = "rgb(0, 0, 255)";
  ctx.fillRect(-cssW / 2, -cssH / 2, cssW, cssH);

  // テキストを描画
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.font =
    "20px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Odol Signal", state.textPos.x + 30, state.textPos.y - 30);

  // 軌跡を描画
  ctx.strokeStyle = "rgb(255, 255, 255)";
  ctx.lineWidth = state.weight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (state.pos.length > 1) {
    ctx.beginPath();
    ctx.moveTo(s * state.pos[0].x, s * state.pos[0].y);
    for (let i = 1; i < state.pos.length; i++) {
      ctx.lineTo(s * state.pos[i].x, s * state.pos[i].y);
    }
    ctx.stroke();

    // 矢印を描画
    const lastPos = state.pos[state.pos.length - 1];
    const prevPos = state.pos[state.pos.length - 2];
    const endPoint = {x: s * lastPos.x, y: s * lastPos.y};
    const direction = {
      x: lastPos.x - prevPos.x,
      y: lastPos.y - prevPos.y,
    };
    drawArrow(ctx, endPoint, direction);
  }

  ctx.restore();
}

/**
 * offscreen canvas の内容を WebGL テクスチャにアップロード
 */
export function uploadSnakePathTexture(
  gl: WebGLRenderingContext,
  resources: SnakePathResources
) {
  const {canvas, texture} = resources;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
}

/**
 * Snake Path をリセット
 */
export function resetSnakePath(resources: SnakePathResources) {
  resources.state.reset();
}
