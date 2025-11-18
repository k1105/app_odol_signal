import {FrameLayer} from "../layers/FrameLayer";

interface OnPerformanceProps {
  currentPlayerSignal?: string; // playerSignal: "BLUE" | "YELLOW" | "RED"
}

export const OnPerformance = ({currentPlayerSignal}: OnPerformanceProps) => {
  return (
    <>
      <FrameLayer currentPlayerSignal={currentPlayerSignal} />
    </>
  );
};
