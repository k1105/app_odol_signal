// 球体シェーダーの使用例
// このファイルは実装例として作成されました。実際の使用時は適切な場所に統合してください。

import {initWebGL} from "./webGLInitializer";
import {
  renderSphereShader,
  updateSphereShaderForSignal,
  type SphereRendererContext,
} from "./sphereRenderer";
import type {PlayerSignal} from "./sphereConfig";

/**
 * 球体シェーダーの使用例
 * @param canvas HTMLCanvasElement
 * @param playerSignal プレイヤーシグナル ("BLUE" | "YELLOW" | "RED")
 */
export const initializeSphereShader = (
  canvas: HTMLCanvasElement,
  playerSignal?: PlayerSignal
): SphereRendererContext | null => {
  // WebGLを初期化
  const {gl, programs} = initWebGL(canvas);

  if (!gl || !programs.sphereProgram) {
    console.error("Failed to initialize WebGL or sphere program");
    return null;
  }

  // レンダリングコンテキストを作成
  const context: SphereRendererContext = {
    gl,
    programs,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    time: 0,
    playerSignal,
  };

  return context;
};

/**
 * アニメーションループの例
 * @param context レンダリングコンテキスト
 */
export const startSphereAnimation = (context: SphereRendererContext): void => {
  const animate = (currentTime: number) => {
    // 時間を更新
    context.time = currentTime * 0.001; // ミリ秒を秒に変換

    // 球体シェーダーをレンダリング
    renderSphereShader(context);

    // 次のフレームを要求
    requestAnimationFrame(animate);
  };

  // アニメーション開始
  requestAnimationFrame(animate);
};

/**
 * プレイヤーシグナルを変更する例
 * @param context レンダリングコンテキスト
 * @param newSignal 新しいプレイヤーシグナル
 */
export const changePlayerSignal = (
  context: SphereRendererContext,
  newSignal: PlayerSignal
): void => {
  updateSphereShaderForSignal(context, newSignal);
};

// 使用例:
/*
// HTMLCanvasElementを取得
const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// 球体シェーダーを初期化（デフォルトはBlue）
const context = initializeSphereShader(canvas, "BLUE");

if (context) {
  // アニメーション開始
  startSphereAnimation(context);
  
  // 5秒後にYellowに変更
  setTimeout(() => {
    changePlayerSignal(context, "YELLOW");
  }, 5000);
  
  // 10秒後にRedに変更
  setTimeout(() => {
    changePlayerSignal(context, "RED");
  }, 10000);
}
*/
