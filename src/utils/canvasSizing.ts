/**
 * キャンバスのサイズをCSS表示サイズに合わせて調整する共通ユーティリティ
 * CameraPassCanvas と OverlayPassCanvas で共用
 */

/**
 * キャンバスの解像度をCSS表示サイズ×DPRに調整
 */
export function sizeCanvasToDisplay(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext
): void {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  const cssH = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  const w = Math.floor(cssW * dpr);
  const h = Math.floor(cssH * dpr);

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

/**
 * キャンバスのCSSサイズを取得
 */
export function getCanvasCssSize(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
} {
  const width = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  const height =
    canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  return {width, height};
}

/**
 * DPR を取得
 */
export function getDevicePixelRatio(): number {
  return Math.max(1, window.devicePixelRatio || 1);
}
