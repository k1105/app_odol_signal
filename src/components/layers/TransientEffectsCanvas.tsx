import {useEffect, useMemo, useRef} from "react";
import {getSparkleConfigForEffect} from "../../utils/sparkleConfig";
import {applySparkleShader} from "../../utils/sparkleShader";
import {
  applyYellowStarShader,
  defaultYellowStarConfig,
} from "../../utils/yellowStarShader";
import {drawQuad} from "../../utils/webglUtils";
import {initWebGL} from "../../utils/webGLInitializer";
import {sizeCanvasToDisplay} from "../../utils/canvasSizing";
import {
  ensureNoiseGridResources,
  drawNoiseGridToCanvas,
  uploadNoiseGridTexture,
  type NoiseGridResources,
} from "../../utils/noiseGridConfig";
import indexInformation from "../../../public/index_information.json";

/* ============================= Types & Config ============================= */

export interface TransientEffectsCanvasProps {
  currentEffectSignal: number;
  currentPlayerSignal?: string;
  ready: boolean;
  style?: React.CSSProperties;
}

type TransientEffectKind =
  | "sparkle"
  | "yellowStar"
  | "noiseGrid"
  | "redFlicker"
  | "none";

interface TransientEffectDefinition {
  type: TransientEffectKind;
}

// JSONから取得されるエフェクトの型定義
interface JsonEffectDefinition {
  type: string;
  [key: string]: unknown;
}

const getTransientEffectDefinition = (
  effectSignal: number,
  playerSignal?: string
): TransientEffectDefinition => {
  // 信号12は全エフェクト無効化
  if (effectSignal === 12) {
    return {type: "none"};
  }

  if (playerSignal === undefined) {
    return {type: "none"};
  }

  const songInfo = indexInformation.find(
    (item) =>
      item.effectSignal === effectSignal && item.playerSignal === playerSignal
  );

  if (!songInfo || !songInfo.effect) {
    return {type: "none"};
  }

  const effect = songInfo.effect as JsonEffectDefinition;
  // sparkle, yellowStar, noiseGrid をフィルタリング
  if (effect.type === "sparkle") {
    return {type: "sparkle"};
  }
  if (effect.type === "yellowStar") {
    return {type: "yellowStar"};
  }
  if (effect.type === "noiseGrid") {
    return {type: "noiseGrid"};
  }
  if (effect.type === "redFlicker") {
    return {type: "redFlicker"};
  }

  return {type: "none"};
};

/* ============================= Math helpers ============================= */

const IDENTITY3 = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

/* ============================= Component ============================= */

export const TransientEffectsCanvas: React.FC<TransientEffectsCanvasProps> = ({
  currentEffectSignal,
  currentPlayerSignal,
  ready,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  // Programs
  const sparkleProgramRef = useRef<WebGLProgram | null>(null);
  const yellowStarProgramRef = useRef<WebGLProgram | null>(null);
  const redFlickerProgramRef = useRef<WebGLProgram | null>(null);
  const baseProgramRef = useRef<WebGLProgram | null>(null);

  // Sparkle texture
  const starTexRef = useRef<WebGLTexture | null>(null);
  const starImageRef = useRef<HTMLImageElement | null>(null);

  // Yellow Star texture
  const yellowStarTexRef = useRef<WebGLTexture | null>(null);
  const yellowStarImageRef = useRef<HTMLImageElement | null>(null);

  // Noise Grid overlay
  const noiseGridResourcesRef = useRef<NoiseGridResources | null>(null);

  // RAF
  const rafRef = useRef<number>(0);

  // Effect def
  const effectDef = useMemo<TransientEffectDefinition>(() => {
    return getTransientEffectDefinition(
      currentEffectSignal,
      currentPlayerSignal
    );
  }, [currentEffectSignal, currentPlayerSignal]);

  // WebGL init
  const initializeWebGL = () => {
    const canvas = canvasRef.current!;
    const result = initWebGL(canvas);
    if (!result.gl || !result.programs.program) {
      console.error("WebGL initialization failed");
      return false;
    }
    glRef.current = result.gl;
    sparkleProgramRef.current = result.programs.sparkleProgram;
    yellowStarProgramRef.current = result.programs.yellowStarProgram;
    redFlickerProgramRef.current = result.programs.redFlickerProgram;
    baseProgramRef.current = result.programs.program;
    return true;
  };

  /* --------------------------- Effects lifecycle --------------------------- */

  useEffect(() => {
    if (!ready) return;

    if (!glRef.current) {
      if (!initializeWebGL()) return;
    }
    const gl = glRef.current!;
    const canvas = canvasRef.current!;
    sizeCanvasToDisplay(canvas, gl);

    const onResize = () => {
      if (!glRef.current || !canvasRef.current) return;
      sizeCanvasToDisplay(canvasRef.current, glRef.current);
      if (effectDef.type === "noiseGrid" && noiseGridResourcesRef.current) {
        noiseGridResourcesRef.current = ensureNoiseGridResources(
          glRef.current,
          canvasRef.current,
          noiseGridResourcesRef.current
        );
      }
    };
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [ready]);

  // Sparkle 星画像のロード
  useEffect(() => {
    if (!ready || !glRef.current) return;
    if (effectDef.type === "sparkle" && !starImageRef.current) {
      const img = new Image();
      img.onload = () => {
        const gl = glRef.current;
        if (!gl) return;

        const texture = gl.createTexture();
        if (!texture) return;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        starTexRef.current = texture;
        starImageRef.current = img;
      };
      img.src = "/assets/large_star.png";
    }
  }, [ready, effectDef.type]);

  // Yellow Star 画像のロード
  useEffect(() => {
    if (!ready || !glRef.current) return;
    if (effectDef.type === "yellowStar" && !yellowStarImageRef.current) {
      const img = new Image();
      img.onload = () => {
        const gl = glRef.current;
        if (!gl) return;

        const texture = gl.createTexture();
        if (!texture) return;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        yellowStarTexRef.current = texture;
        yellowStarImageRef.current = img;
      };
      img.src = "/assets/yellow_star.png";
    }
  }, [ready, effectDef.type]);

  // Noise Grid リソースの初期化
  useEffect(() => {
    if (!ready || !glRef.current || !canvasRef.current) return;
    if (effectDef.type === "noiseGrid") {
      noiseGridResourcesRef.current = ensureNoiseGridResources(
        glRef.current,
        canvasRef.current,
        noiseGridResourcesRef.current || undefined
      );
    }
  }, [ready, effectDef.type]);

  /* ------------------------------- Draw loop -------------------------------- */

  useEffect(() => {
    if (!ready || !glRef.current) return;

    const gl = glRef.current!;
    const canvas = canvasRef.current!;

    const draw = (t: number) => {
      try {
        // DPR/リサイズ
        sizeCanvasToDisplay(canvas, gl);

        // 背景クリア（透明）
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Sparkle エフェクト
        if (
          effectDef.type === "sparkle" &&
          sparkleProgramRef.current &&
          starTexRef.current &&
          starImageRef.current
        ) {
          const starNaturalW =
            starImageRef.current.naturalWidth || starImageRef.current.width;
          const starNaturalH =
            starImageRef.current.naturalHeight || starImageRef.current.height;

          applySparkleShader({
            gl,
            program: sparkleProgramRef.current,
            time: (t % 10000) * 0.001,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            starTexture: starTexRef.current,
            starImageWidth: starNaturalW,
            starImageHeight: starNaturalH,
            config: getSparkleConfigForEffect(currentEffectSignal),
          });

          // ブレンド有効化（星同士の重なり）
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          drawQuad(
            gl,
            sparkleProgramRef.current,
            IDENTITY3 as unknown as number[],
            starTexRef.current
          );
          gl.disable(gl.BLEND);
        }

        // Yellow Star エフェクト
        if (
          effectDef.type === "yellowStar" &&
          yellowStarProgramRef.current &&
          yellowStarTexRef.current &&
          yellowStarImageRef.current
        ) {
          const yellowStarNaturalW =
            yellowStarImageRef.current.naturalWidth ||
            yellowStarImageRef.current.width;
          const yellowStarNaturalH =
            yellowStarImageRef.current.naturalHeight ||
            yellowStarImageRef.current.height;

          applyYellowStarShader({
            gl,
            program: yellowStarProgramRef.current,
            time: (t % 10000) * 0.001,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            yellowStarTexture: yellowStarTexRef.current,
            yellowStarImageWidth: yellowStarNaturalW,
            yellowStarImageHeight: yellowStarNaturalH,
            config: defaultYellowStarConfig,
          });

          // ブレンド有効化
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          drawQuad(
            gl,
            yellowStarProgramRef.current,
            IDENTITY3 as unknown as number[],
            yellowStarTexRef.current
          );
          gl.disable(gl.BLEND);
        }

        // Noise Grid エフェクト
        if (
          effectDef.type === "noiseGrid" &&
          noiseGridResourcesRef.current &&
          baseProgramRef.current
        ) {
          drawNoiseGridToCanvas(noiseGridResourcesRef.current, canvas);
          uploadNoiseGridTexture(gl, noiseGridResourcesRef.current);

          // ブレンド有効化（screen ブレンド）
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          drawQuad(
            gl,
            baseProgramRef.current,
            IDENTITY3 as unknown as number[],
            noiseGridResourcesRef.current.texture
          );
          gl.disable(gl.BLEND);
        }

        // Red Flicker エフェクト
        if (effectDef.type === "redFlicker" && redFlickerProgramRef.current) {
          // 20fps = 50ms間隔で切り替え
          const fps = 20.0;
          const time = (t % 10000) * 0.001;

          gl.useProgram(redFlickerProgramRef.current);

          const u_time = gl.getUniformLocation(
            redFlickerProgramRef.current,
            "u_time"
          );
          const u_fps = gl.getUniformLocation(
            redFlickerProgramRef.current,
            "u_fps"
          );

          if (u_time) gl.uniform1f(u_time, time);
          if (u_fps) gl.uniform1f(u_fps, fps);

          // ダミーテクスチャを作成（drawQuad に必要だが、シェーダーでは使わない）
          const dummyTexture = gl.createTexture();
          if (dummyTexture) {
            gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              1,
              1,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              new Uint8Array([255, 255, 255, 255])
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_S,
              gl.CLAMP_TO_EDGE
            );
            gl.texParameteri(
              gl.TEXTURE_2D,
              gl.TEXTURE_WRAP_T,
              gl.CLAMP_TO_EDGE
            );

            // ブレンド有効化
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            // クワッドを描画（シェーダーが時間に基づいて赤/透明を切り替える）
            drawQuad(
              gl,
              redFlickerProgramRef.current,
              IDENTITY3 as unknown as number[],
              dummyTexture
            );

            gl.disable(gl.BLEND);
            gl.deleteTexture(dummyTexture);
          }
        }

        rafRef.current = requestAnimationFrame(draw);
      } catch {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, effectDef, currentEffectSignal]);

  /* --------------------------- Cleanup --------------------------- */

  useEffect(() => {
    return () => {
      if (glRef.current && starTexRef.current)
        glRef.current.deleteTexture(starTexRef.current);
      if (glRef.current && yellowStarTexRef.current)
        glRef.current.deleteTexture(yellowStarTexRef.current);
      if (glRef.current && noiseGridResourcesRef.current?.texture)
        glRef.current.deleteTexture(noiseGridResourcesRef.current.texture);
      starTexRef.current = null;
      starImageRef.current = null;
      yellowStarTexRef.current = null;
      yellowStarImageRef.current = null;
      noiseGridResourcesRef.current = null;
    };
  }, []);

  /* ----------------------------- Render ----------------------------- */

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        mixBlendMode: "screen", // sparkle は常に screen ブレンド
        pointerEvents: "none", // イベントは透過
        ...style,
      }}
    />
  );
};
