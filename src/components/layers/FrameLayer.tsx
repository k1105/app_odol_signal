interface FrameLayerProps {
  current?: number;
}

export const FrameLayer = ({current}: FrameLayerProps) => {
  const imagePath = "/assets/frame/base.png";

  // 信号ID 9-11に応じてプレイヤー名画像のパスを決定
  const getPlayerNameImage = (id: number | undefined): string | null => {
    if (id === 9) return "/assets/player_name/blue.png";
    if (id === 10) return "/assets/player_name/yellow.png";
    if (id === 11) return "/assets/player_name/red.png";
    return null;
  };

  const playerNameImage = getPlayerNameImage(current);

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
