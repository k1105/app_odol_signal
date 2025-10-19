// utils/rotatingGridConfig.ts
// 回転グリッドエフェクトの設定

export interface RotatingGridConfig {
  gridSize: number; // グリッドサイズ
  particleSize: number; // パーティクルサイズ
  rotationSpeed: number; // 回転速度
  moveSpeed: number; // 移動速度
  noiseScale: number; // ノイズスケール
  noiseSpeed: number; // ノイズ速度
}

/**
 * 回転グリッドエフェクトのプリセット設定
 */
export const rotatingGridPresets = {
  default: {
    gridSize: 10.0,
    particleSize: 3.0,
    rotationSpeed: 0.3,
    moveSpeed: 1.0,
    noiseScale: 0.2,
    noiseSpeed: 0.2,
  } as RotatingGridConfig,

  fast: {
    gridSize: 12.0,
    particleSize: 2.5,
    rotationSpeed: 0.5,
    moveSpeed: 1.5,
    noiseScale: 0.3,
    noiseSpeed: 0.3,
  } as RotatingGridConfig,

  slow: {
    gridSize: 8.0,
    particleSize: 3.5,
    rotationSpeed: 0.15,
    moveSpeed: 0.5,
    noiseScale: 0.15,
    noiseSpeed: 0.1,
  } as RotatingGridConfig,

  dense: {
    gridSize: 15.0,
    particleSize: 2.0,
    rotationSpeed: 0.4,
    moveSpeed: 1.2,
    noiseScale: 0.25,
    noiseSpeed: 0.25,
  } as RotatingGridConfig,
};

/**
 * デフォルト設定を取得
 */
export function getDefaultRotatingGridConfig(): RotatingGridConfig {
  return rotatingGridPresets.default;
}

/**
 * プリセット名から設定を取得
 */
export function getRotatingGridPreset(
  presetName: keyof typeof rotatingGridPresets
): RotatingGridConfig {
  return rotatingGridPresets[presetName] || rotatingGridPresets.default;
}
