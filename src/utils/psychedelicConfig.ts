// モノクロマティックサイケデリックシェーダー設定
import type {PsychedelicConfig} from "./psychedelicShader";

// プレイヤーごとのベースカラー定義
export const playerColors = {
  BLUE: {r: 0.0, g: 0.0, b: 1.0}, // 青
  YELLOW: {r: 0.55, g: 0.55, b: 0.0}, // 黄（輝度を大幅に抑えて映像が見やすく）
  RED: {r: 0.75, g: 0.0, b: 0.0}, // 赤（輝度をさらに少し抑えて映像が見やすく）
};

// 基本設定
const baseConfig = {
  contrastIntensity: 0.7,
  glowIntensity: 0.5,
  grainIntensity: 0.85, // フィルムグレインの強度（強化）
};

/**
 * プレイヤーシグナルに基づいたPsychedelicConfigを取得
 * @param playerSignal プレイヤーシグナル ("BLUE" | "YELLOW" | "RED")
 * @returns PsychedelicConfig
 */
export const getPsychedelicConfigForPlayer = (
  playerSignal?: string
): PsychedelicConfig => {
  // プレイヤーシグナルに基づいて色を選択
  let baseColor = playerColors.BLUE; // デフォルトは青

  if (playerSignal === "YELLOW") {
    baseColor = playerColors.YELLOW;
  } else if (playerSignal === "RED") {
    baseColor = playerColors.RED;
  }

  return {
    baseColor,
    ...baseConfig,
  };
};

/**
 * 後方互換性のために残す（非推奨）
 * 新しいコードでは getPsychedelicConfigForPlayer を使用してください
 */
export const getPsychedelicConfigForEffect = (
  _effectId: number,
  playerSignal?: string
): PsychedelicConfig => {
  return getPsychedelicConfigForPlayer(playerSignal);
};
