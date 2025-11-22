/* ============================= Tenichi Config ============================= */

/**
 * Tenichi overlay用のリソース
 */
export interface TenichiResources {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: WebGLTexture;
  image: HTMLImageElement;
  loaded: boolean;
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
 * Tenichi リソースを初期化または更新
 */
export function ensureTenichiResources(
  gl: WebGLRenderingContext,
  mainCanvas: HTMLCanvasElement,
  existing?: Partial<TenichiResources>
): TenichiResources {
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
    throw new Error("Failed to get 2D context for tenichi canvas");
  }

  // 1 CSS px = dpr 画素に
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Image 初期化
  let image = existing?.image;
  if (!image) {
    image = new Image();
    image.src = "/assets/tenichi.gif";
    image.onerror = () => {
      console.error("Failed to load tenichi.gif");
    };
  }
  // 読み込み状態をチェック（既に読み込まれている場合も含む）
  const loaded = image.complete && image.naturalWidth > 0;

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

  return {canvas, ctx, texture, image, loaded};
}

/**
 * Tenichi を offscreen canvas に描画
 */
export function drawTenichiToCanvas(
  resources: TenichiResources,
  mainCanvas: HTMLCanvasElement
) {
  const {ctx, image} = resources;
  const {w: cssW, h: cssH} = getCssSize(mainCanvas);

  // 透明にクリア
  ctx.clearRect(0, 0, cssW, cssH);

  // 画像が読み込まれていない場合は何も描画しない
  if (!image.complete || image.naturalWidth === 0) {
    return;
  }

  // 画像のアスペクト比を維持しながら、画面に合わせてスケール
  const imgAspect = image.width / image.height;
  const canvasAspect = cssW / cssH;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (imgAspect > canvasAspect) {
    // 画像の方が横長 → 幅に合わせる
    drawWidth = cssW;
    drawHeight = cssW / imgAspect;
    drawX = 0;
    drawY = (cssH - drawHeight) / 2;
  } else {
    // 画像の方が縦長 → 高さに合わせる
    drawWidth = cssH * imgAspect;
    drawHeight = cssH;
    drawX = (cssW - drawWidth) / 2;
    drawY = 0;
  }

  // GIFを描画（GIFは自動的にアニメーションする）
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

/**
 * offscreen canvas の内容を WebGL テクスチャにアップロード
 */
export function uploadTenichiTexture(
  gl: WebGLRenderingContext,
  resources: TenichiResources
) {
  const {canvas, texture} = resources;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
}

