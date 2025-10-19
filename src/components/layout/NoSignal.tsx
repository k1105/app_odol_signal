import {FrameLayer} from "../layers/FrameLayer";

interface NoSignalProps {
  currentPlayerSignal?: string; // playerSignal: "BLUE" | "YELLOW" | "RED"
}

export const NoSignal = ({currentPlayerSignal}: NoSignalProps) => {
  return (
    <>
      <FrameLayer currentPlayerSignal={currentPlayerSignal} />
    </>
  );
};
