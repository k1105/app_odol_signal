import {FrameLayer} from "../layers/FrameLayer";

interface NoSignalProps {
  currentPlayerSignal?: number; // playerSignal: 9-11
}

export const NoSignal = ({currentPlayerSignal}: NoSignalProps) => {
  return (
    <>
      <FrameLayer currentPlayerSignal={currentPlayerSignal} />
    </>
  );
};
