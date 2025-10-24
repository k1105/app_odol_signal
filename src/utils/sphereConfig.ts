// 3つの球体シェーダー設定
import type {SphereConfig} from "./sphereShader";

// プレイヤーシグナル定義
export type PlayerSignal = "BLUE" | "YELLOW" | "RED";

// 球体の色定義
export const sphereColors = {
  BLUE: {r: 0.0, g: 0.35, b: 0.95}, // Blue (Top)
  YELLOW: {r: 1.0, g: 0.92, b: 0.05}, // Yellow (Mid)
  RED: {r: 1.0, g: 0.1, b: 0.08}, // Red (Bottom)
};

// 基本設定
const baseConfig = {
  sphereRadius: 0.55,
  spikeAmplitude: 0.22, // スパイクの最大振幅
  betaSoft: 12.0, // ソフトマックスの鋭さ
  gapBase: 0.1, // 球体間の基本ギャップ
  gapAmplitude: 0.3, // ギャップの振幅
  gapFrequency: 0.28, // ギャップの周波数
  cameraBaseZ: 7.2, // カメラの基本Z位置
  cameraAmplitude: 1.25, // カメラの振幅
  cameraFrequency: 0.35, // カメラの周波数
  rotationSpeed: 0.6, // 回転速度
  tiltAmplitude: 0.3, // チルトの振幅
  tiltFrequency: 0.5, // チルトの周波数
};

/**
 * プレイヤーシグナルに基づいたSphereConfigを取得
 * @param playerSignal プレイヤーシグナル ("BLUE" | "YELLOW" | "RED")
 * @returns SphereConfig
 */
export const getSphereConfigForPlayer = (
  playerSignal?: PlayerSignal
): SphereConfig => {
  // プレイヤーシグナルに基づいてアクティブ球体のインデックスを決定
  let activeSphereIndex = 0; // デフォルトはBlue (Top)

  if (playerSignal === "YELLOW") {
    activeSphereIndex = 1; // Mid
  } else if (playerSignal === "RED") {
    activeSphereIndex = 2; // Bottom
  }

  return {
    activeSphereIndex,
    sphereColors,
    ...baseConfig,
  };
};

/**
 * プレイヤーシグナルから球体の色を取得
 * @param playerSignal プレイヤーシグナル
 * @returns 球体の色
 */
export const getSphereColorForSignal = (
  playerSignal?: PlayerSignal
): {r: number; g: number; b: number} => {
  if (playerSignal === "YELLOW") {
    return sphereColors.YELLOW;
  } else if (playerSignal === "RED") {
    return sphereColors.RED;
  }
  return sphereColors.BLUE; // デフォルト
};

/**
 * プレイヤーシグナルからアクティブ球体のインデックスを取得
 * @param playerSignal プレイヤーシグナル
 * @returns アクティブ球体のインデックス (0: Top/Blue, 1: Mid/Yellow, 2: Bottom/Red)
 */
export const getActiveSphereIndex = (playerSignal?: PlayerSignal): number => {
  if (playerSignal === "YELLOW") {
    return 1;
  } else if (playerSignal === "RED") {
    return 2;
  }
  return 0; // デフォルトはBlue (Top)
};
