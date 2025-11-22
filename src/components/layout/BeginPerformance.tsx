import {FrameLayer} from "../layers/FrameLayer";

interface BeginPerformanceProps {
  currentEffectSignal?: number; // effectSignal: 0-8 (ハンバーガーメニュー用 - オプショナル)
  currentPlayerSignal?: string; // playerSignal: "BLUE" | "YELLOW" | "RED"
}

export const BeginPerformance = ({
  currentPlayerSignal,
}: BeginPerformanceProps) => {
  return (
    <>
      <FrameLayer currentPlayerSignal={currentPlayerSignal} />
    </>
  );
};
