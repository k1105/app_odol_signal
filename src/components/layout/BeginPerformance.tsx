import {FrameLayer} from "../layers/FrameLayer";
import {SongTitleOverlay} from "../SongTitleOverlay";

interface BeginPerformanceProps {
  currentEffectSignal: number; // effectSignal: 0-8
  currentPlayerSignal?: string; // playerSignal: "BLUE" | "YELLOW" | "RED"
}

export const BeginPerformance = ({
  currentEffectSignal,
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
