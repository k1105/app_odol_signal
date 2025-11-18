import React from "react";
import {CameraPassCanvas} from "./CameraPassCanvas";
import {TransientEffectsCanvas} from "./TransientEffectsCanvas";
import {OverlayPassCanvas} from "./OverlayPassCanvas";

/**
 * CameraStage: 3レイヤー構成の統合コンポーネント
 *
 * - 下レイヤ: CameraPassCanvas (カメラ + 干渉系ポストエフェクト)
 * - 中レイヤ: TransientEffectsCanvas (sparkle エフェクト、screen ブレンド)
 * - 上レイヤ: OverlayPassCanvas (カメラ非依存オーバーレイ: typography, snakePath, noiseGrid)
 */

export interface CameraStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentEffectSignal: number;
  currentPlayerSignal?: string;
  ready: boolean;
  fitMode?: "contain" | "cover";
  isNoSignalDetected?: boolean;
  onEffectChange?: (effect: number) => void;
}

export const CameraStage: React.FC<CameraStageProps> = ({
  videoRef,
  currentEffectSignal,
  currentPlayerSignal,
  ready,
  fitMode = "contain",
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* 下レイヤ: カメラ + 干渉系エフェクト */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <CameraPassCanvas
          videoRef={videoRef}
          currentEffectSignal={currentEffectSignal}
          currentPlayerSignal={currentPlayerSignal}
          ready={ready}
          fitMode={fitMode}
        />
      </div>

      {/* 中レイヤ: sparkle エフェクト（screen ブレンド） */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <TransientEffectsCanvas
          currentEffectSignal={currentEffectSignal}
          currentPlayerSignal={currentPlayerSignal}
          ready={ready}
        />
      </div>

      {/* 上レイヤ: カメラ非依存オーバーレイ（typography, snakePath, noiseGrid） */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "auto",
        }}
      >
        <OverlayPassCanvas
          currentEffectSignal={currentEffectSignal}
          currentPlayerSignal={currentPlayerSignal}
          ready={ready}
        />
      </div>
    </div>
  );
};
