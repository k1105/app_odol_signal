import {FrameLayer} from "../layers/FrameLayer";
import {StaticLayer} from "../layers/StaticLayer";

interface OnPerformanceProps {
  currentEffectSignal: number; // effectSignal: 0-8
  currentPlayerSignal?: number; // playerSignal: 9-11
}

export const OnPerformance = ({
  currentEffectSignal,
  currentPlayerSignal,
}: OnPerformanceProps) => {
  return (
    <>
      <StaticLayer
        effectSignal={currentEffectSignal}
        playerSignal={currentPlayerSignal}
      />

      <FrameLayer currentPlayerSignal={currentPlayerSignal} />
    </>
  );
};
