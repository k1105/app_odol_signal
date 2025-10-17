interface FrameLayerProps {
  currentPlayerSignal?: number; // playerSignal: 9-11
}

export const FrameLayer = ({currentPlayerSignal}: FrameLayerProps) => {
  const imagePath = "/assets/frame/base.png";

  // playerSignal 9-11に応じてプレイヤー名画像のパスを決定
  // playerSignalは独立しており、effectSignalに影響されない
  const getPlayerNameImage = (
    playerSignal: number | undefined
  ): string | null => {
    if (playerSignal === 9) return "/assets/player_name/blue.png";
    if (playerSignal === 10) return "/assets/player_name/yellow.png";
    if (playerSignal === 11) return "/assets/player_name/red.png";
    return null;
  };

  const playerNameImage = getPlayerNameImage(currentPlayerSignal);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100svw",
        height: "100svh",
        zIndex: 1000,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ベースフレーム */}
      <img
        src={imagePath}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transition: "opacity 0.3s ease-in-out",
        }}
        onError={(e) => {
          console.error(`Failed to load image: ${imagePath}`);
          e.currentTarget.style.display = "none";
        }}
      />

      {/* プレイヤー名画像オーバーレイ（信号ID 9-11の場合） */}
      {playerNameImage && (
        <img
          src={playerNameImage}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transition: "opacity 0.3s ease-in-out",
          }}
          onError={(e) => {
            console.error(
              `Failed to load player name image: ${playerNameImage}`
            );
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
};
