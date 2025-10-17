import {FrameLayer} from "../layers/FrameLayer";
import {SongTitleOverlay} from "../SongTitleOverlay";

interface BeginPerformanceProps {
  currentEffectSignal: number; // effectSignal: 0-8
  currentPlayerSignal?: number; // playerSignal: 9-11
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
