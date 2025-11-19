import {FrameLayer} from "../layers/FrameLayer";
import {SongTitleOverlay} from "../SongTitleOverlay";

interface BeginPerformanceProps {
  currentEffectSignal?: number; // effectSignal: 0-8 (ハンバーガーメニュー用 - オプショナル)
  currentPlayerSignal?: string; // playerSignal: "BLUE" | "YELLOW" | "RED"
}

export const BeginPerformance = ({
  currentEffectSignal = -1, // デフォルト値を設定
  currentPlayerSignal,
}: BeginPerformanceProps) => {
  return (
    <>
      <FrameLayer currentPlayerSignal={currentPlayerSignal} />
      <SongTitleOverlay
        effectSignal={currentEffectSignal}
        playerSignal={currentPlayerSignal}
      />
    </>
  );
};
