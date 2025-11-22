import {useEffect, useRef, useMemo, useState} from "react";
import {initWebGL} from "../../utils/webGLInitializer";
import {sizeCanvasToDisplay} from "../../utils/canvasSizing";

interface FrameLayerProps {
  currentPlayerSignal?: string; // playerSignal: "BLUE" | "YELLOW" | "RED"
}

interface Circle {
  x: number;
  y: number;
}

export const FrameLayer = ({currentPlayerSignal}: FrameLayerProps) => {
  const imagePath = "/assets/frame/base_frame.png";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const playerNameProgramRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const circlesRef = useRef<Circle[]>([]);
  const lastClearFrameRef = useRef<number>(0);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);

  // アニメーション用のopacity状態
  const [opacity, setOpacity] = useState(0);
  // アニメーション完了後に描画を停止するためのフラグ
  const shouldRenderRef = useRef(false);

  // プレイヤーシグナルに応じた色を決定
  const playerColor = useMemo<[number, number, number]>(() => {
    if (currentPlayerSignal === "BLUE")
      return [100 / 255, 150 / 255, 255 / 255]; // 青
    if (currentPlayerSignal === "YELLOW")
      return [255 / 255, 255 / 255, 0 / 255]; // 黄
    if (currentPlayerSignal === "RED") return [255 / 255, 0 / 255, 0 / 255]; // 赤
    return [1.0, 1.0, 1.0]; // 白（表示しない）
  }, [currentPlayerSignal]);

  // currentPlayerSignalの変化に応じてopacityをアニメーション
  useEffect(() => {
    if (currentPlayerSignal) {
      // イースイン: 表示される時
      // shouldRenderを先にtrueにしてから、opacityを1に設定
      shouldRenderRef.current = true;
      // 次のフレームでopacityを1に設定（アニメーション開始）
      const rafId = requestAnimationFrame(() => {
        setOpacity(1);
      });
      return () => cancelAnimationFrame(rafId);
    } else {
      // イースアウト: 非表示になる時
      // opacityを0に設定してから、アニメーション完了後にshouldRenderをfalseにする
      setOpacity(0);
      // アニメーション完了（0.3秒）後に描画を停止
      const timer = setTimeout(() => {
        shouldRenderRef.current = false;
      }, 300); // 0.3秒 = 300ms
      return () => clearTimeout(timer);
    }
  }, [currentPlayerSignal]);

  // WebGL初期化
  const initializeWebGL = () => {
    const canvas = canvasRef.current!;
    const result = initWebGL(canvas);
    if (!result.gl || !result.programs.playerNameProgram) {
      console.error("WebGL initialization failed");
      return false;
    }
    glRef.current = result.gl;
    playerNameProgramRef.current = result.programs.playerNameProgram;

    // ブレンドモードの設定（通常のアルファブレンド）
    glRef.current.enable(glRef.current.BLEND);
    glRef.current.blendFunc(
      glRef.current.SRC_ALPHA,
      glRef.current.ONE_MINUS_SRC_ALPHA
    );

    return true;
  };

  // 円を生成
  const generateCircles = (canvasWidth: number, canvasHeight: number) => {
    const maxCircles = Math.max(
      1,
      Math.min(Math.floor(frameCountRef.current / 25), 40)
    );
    circlesRef.current = [];

    for (let i = 0; i < maxCircles; i++) {
      // 左側の円
      const leftX = Math.random() * (canvasWidth / 10);
      const leftY = Math.random() * canvasHeight;
      circlesRef.current.push({x: leftX, y: leftY});

      // 右側の円
      const rightX =
        Math.random() * (canvasWidth / 10) + (9 * canvasWidth) / 10;
      const rightY = Math.random() * canvasHeight;
      circlesRef.current.push({x: rightX, y: rightY});
    }
  };

  // WebGL初期化と描画ループ
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    // WebGL初期化
    if (!glRef.current) {
      if (!initializeWebGL()) {
        return;
      }
    }

    if (!glRef.current || !playerNameProgramRef.current) {
      return;
    }
    const gl = glRef.current!;
    const canvas = canvasRef.current!;
    sizeCanvasToDisplay(canvas, gl);

    const onResize = () => {
      if (!glRef.current || !canvasRef.current) return;
      sizeCanvasToDisplay(canvasRef.current, glRef.current);
      // リサイズ時に円を再生成
      if (shouldRenderRef.current && currentPlayerSignal) {
        generateCircles(canvasRef.current.width, canvasRef.current.height);
      }
    };
    window.addEventListener("resize", onResize);

    // shouldRenderがfalseの時は描画を停止
    // アニメーション中（shouldRenderがtrue）は描画を続ける
    if (!shouldRenderRef.current) {
      // プレイヤーシグナルがない場合は透明でクリア
      gl.clearColor(0.0, 0.0, 0.0, 0.0); // 透明でクリア
      gl.clear(gl.COLOR_BUFFER_BIT);
      // 円をクリア
      circlesRef.current = [];
      frameCountRef.current = 0;
      lastClearFrameRef.current = 0;
      return () => {
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener("resize", onResize);
      };
    }

    // バッファを一度だけ作成（再利用）
    if (!positionBufferRef.current) {
      positionBufferRef.current = gl.createBuffer();
      if (!positionBufferRef.current) {
        console.error("Failed to create position buffer");
        return;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
    }

    // currentPlayerSignalが値を持つようになった時、円を初期化
    if (circlesRef.current.length === 0) {
      generateCircles(canvas.width, canvas.height);
    }

    const draw = () => {
      try {
        frameCountRef.current++;

        // 30フレームごとにクリアして円を再生成
        if (frameCountRef.current - lastClearFrameRef.current >= 30) {
          lastClearFrameRef.current = frameCountRef.current;
          generateCircles(canvas.width, canvas.height);
        }

        // 最初のフレームで円を生成
        if (circlesRef.current.length === 0) {
          generateCircles(canvas.width, canvas.height);
        }

        // 背景を透明でクリア
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // シェーダープログラムを使用
        gl.useProgram(playerNameProgramRef.current!);

        // ユニフォーム変数を設定
        const resolutionLocation = gl.getUniformLocation(
          playerNameProgramRef.current!,
          "u_resolution"
        );
        const colorLocation = gl.getUniformLocation(
          playerNameProgramRef.current!,
          "u_color"
        );
        const circleRadiusLocation = gl.getUniformLocation(
          playerNameProgramRef.current!,
          "u_circleRadius"
        );
        const circleCountLocation = gl.getUniformLocation(
          playerNameProgramRef.current!,
          "u_circleCount"
        );
        const circlePositionsLocation = gl.getUniformLocation(
          playerNameProgramRef.current!,
          "u_circlePositions"
        );

        if (resolutionLocation)
          gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        if (colorLocation)
          gl.uniform3f(
            colorLocation,
            playerColor[0],
            playerColor[1],
            playerColor[2]
          );
        if (circleRadiusLocation) gl.uniform1f(circleRadiusLocation, 30.0);
        if (circleCountLocation) {
          gl.uniform1i(circleCountLocation, circlesRef.current.length);
        }

        // 円の位置を配列として設定
        if (circlePositionsLocation) {
          const positions = new Float32Array(
            circlesRef.current.flatMap((c) => [c.x, c.y])
          );
          gl.uniform2fv(circlePositionsLocation, positions);
        }

        // 変換行列（単位行列）
        const transformLocation = gl.getUniformLocation(
          playerNameProgramRef.current!,
          "u_transform"
        );
        if (transformLocation) {
          const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
          gl.uniformMatrix3fv(
            transformLocation,
            false,
            new Float32Array(identity)
          );
        }

        // 再利用可能なバッファを使用
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);

        const positionLocation = gl.getAttribLocation(
          playerNameProgramRef.current!,
          "a_position"
        );
        if (positionLocation !== -1) {
          gl.enableVertexAttribArray(positionLocation);
          gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        }

        // 描画
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        rafRef.current = requestAnimationFrame(draw);
      } catch {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      // バッファのクリーンアップ
      if (glRef.current && positionBufferRef.current) {
        glRef.current.deleteBuffer(positionBufferRef.current);
        positionBufferRef.current = null;
      }
    };
    // playerColorはuseMemoでメモ化されているため、依存配列から除外
    // currentPlayerSignalが変わった時だけ再実行される
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerSignal]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100svw",
        height: "100svh",
        zIndex: 1, // CameraPassCanvasより下のレイヤー
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
          opacity: opacity,
          transition: "opacity 0.3s ease-in-out",
        }}
        onError={(e) => {
          console.error(`Failed to load image: ${imagePath}`);
          e.currentTarget.style.display = "none";
        }}
      />

      {/* プレイヤー名エフェクト（WebGL） */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: opacity,
          transition: "opacity 0.3s ease-in-out",
          // WebGLのblend modeでmultiplyを実装しているため、CSSのmixBlendModeは不要
        }}
      />
    </div>
  );
};
