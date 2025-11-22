import {useEffect, useMemo, useRef} from "react";
import {drawQuad} from "../../utils/webglUtils";
import {initWebGL} from "../../utils/webGLInitializer";
import {sizeCanvasToDisplay} from "../../utils/canvasSizing";
import {
  ensureTypographyResources,
  drawTypographyToCanvas,
  uploadTypographyTexture,
  randomizeTypographyTargets,
  type TypographyResources,
} from "../../utils/typographyConfig";
import {
  ensureSnakePathResources,
  drawSnakePathToCanvas,
  uploadSnakePathTexture,
  resetSnakePath,
  type SnakePathResources,
} from "../../utils/snakePathConfig";
import {
  ensureNoiseGridResources,
  drawNoiseGridToCanvas,
  uploadNoiseGridTexture,
  type NoiseGridResources,
} from "../../utils/noiseGridConfig";
import {applyDanShader, defaultDanConfig} from "../../utils/danShader";
import indexInformation from "../../../public/index_information.json";

/* ============================= Types & Config ============================= */

export interface OverlayPassCanvasProps {
  currentEffectSignal: number;
  currentPlayerSignal?: string;
  ready: boolean;
  style?: React.CSSProperties;
  onPointerDown?: () => void;
}

type OverlayEffectKind =
  | "typography"
  | "snakePath"
  | "noiseGrid"
  | "tenichi"
  | "dan"
  | "none";

interface OverlayEffectDefinition {
  type: OverlayEffectKind;
}

// JSONから取得されるエフェクトの型定義
interface JsonEffectDefinition {
  type: string;
  [key: string]: unknown;
}

const getOverlayEffectDefinition = (
  effectSignal: number,
  playerSignal?: string
): OverlayEffectDefinition => {
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
  // オーバーレイエフェクトのみフィルタリング（sparkle を除く）
  if (
    effect.type === "typography" ||
    effect.type === "snakePath" ||
    effect.type === "noiseGrid" ||
    effect.type === "tenichi" ||
    effect.type === "dan"
  ) {
    return {type: effect.type as OverlayEffectKind};
  }

  return {type: "none"};
};

/* ============================= Math helpers ============================= */

const IDENTITY3 = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

/* ============================= Component ============================= */

const TYPOGRAPHY_LETTERS = ["A", "S", "P"];

export const OverlayPassCanvas: React.FC<OverlayPassCanvasProps> = ({
  currentEffectSignal,
  currentPlayerSignal,
  ready,
  style,
  onPointerDown,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  // Programs
  const baseProgramRef = useRef<WebGLProgram | null>(null);
  const danProgramRef = useRef<WebGLProgram | null>(null);

  // Dan texture
  const danTexRef = useRef<WebGLTexture | null>(null);
  const danImageRef = useRef<HTMLImageElement | null>(null);

  // RAF
  const rafRef = useRef<number>(0);

  // Typography overlay
  const typoResourcesRef = useRef<TypographyResources | null>(null);

  // Snake Path overlay
  const snakePathResourcesRef = useRef<SnakePathResources | null>(null);

  // Noise Grid overlay
  const noiseGridResourcesRef = useRef<NoiseGridResources | null>(null);

  // Effect def
  const effectDef = useMemo<OverlayEffectDefinition>(() => {
    return getOverlayEffectDefinition(currentEffectSignal, currentPlayerSignal);
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
    baseProgramRef.current = result.programs.program;
    danProgramRef.current = result.programs.danProgram;
    return true;
  };

  /* --------------------------- Effects lifecycle --------------------------- */

  useEffect(() => {
    // tenichiエフェクトの場合はCanvasを使わないのでスキップ
    if (effectDef.type === "tenichi") return;
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
      if (effectDef.type === "typography" && typoResourcesRef.current) {
        typoResourcesRef.current = ensureTypographyResources(
          glRef.current,
          canvasRef.current,
          typoResourcesRef.current
        );
      }
      if (effectDef.type === "snakePath" && snakePathResourcesRef.current) {
        snakePathResourcesRef.current = ensureSnakePathResources(
          glRef.current,
          canvasRef.current,
          snakePathResourcesRef.current
        );
      }
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
  }, [ready, effectDef.type]);

  // Typography へ切り替えた瞬間に初期化
  useEffect(() => {
    // tenichiエフェクトの場合はCanvasを使わないのでスキップ
    if (effectDef.type === "tenichi") return;
    if (!ready || !glRef.current || !canvasRef.current) return;
    if (effectDef.type === "typography") {
      typoResourcesRef.current = ensureTypographyResources(
        glRef.current,
        canvasRef.current,
        typoResourcesRef.current || undefined
      );
    }
    if (effectDef.type === "snakePath") {
      snakePathResourcesRef.current = ensureSnakePathResources(
        glRef.current,
        canvasRef.current,
        snakePathResourcesRef.current || undefined
      );
    }
    if (effectDef.type === "noiseGrid") {
      noiseGridResourcesRef.current = ensureNoiseGridResources(
        glRef.current,
        canvasRef.current,
        noiseGridResourcesRef.current || undefined
      );
    }
  }, [ready, effectDef.type]);

  // Dan 画像のロード
  useEffect(() => {
    if (!ready || !glRef.current) return;
    if (effectDef.type === "dan" && !danImageRef.current) {
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

        danTexRef.current = texture;
        danImageRef.current = img;
      };
      img.src = "/assets/dan-text.png";
    }
  }, [ready, effectDef.type]);

  /* ------------------------------- Draw loop -------------------------------- */

  useEffect(() => {
    // tenichiエフェクトの場合はCanvasを使わないのでスキップ
    if (effectDef.type === "tenichi") return;
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

        // Typography オーバーレイ
        if (effectDef.type === "typography" && typoResourcesRef.current) {
          drawTypographyToCanvas(
            typoResourcesRef.current,
            canvas,
            TYPOGRAPHY_LETTERS
          );
          uploadTypographyTexture(gl, typoResourcesRef.current);

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          drawQuad(
            gl,
            baseProgramRef.current!,
            IDENTITY3 as unknown as number[],
            typoResourcesRef.current.texture
          );
          gl.disable(gl.BLEND);
        }

        // Snake Path オーバーレイ
        if (effectDef.type === "snakePath" && snakePathResourcesRef.current) {
          drawSnakePathToCanvas(snakePathResourcesRef.current, canvas);
          uploadSnakePathTexture(gl, snakePathResourcesRef.current);

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          drawQuad(
            gl,
            baseProgramRef.current!,
            IDENTITY3 as unknown as number[],
            snakePathResourcesRef.current.texture
          );
          gl.disable(gl.BLEND);
        }

        // Noise Grid オーバーレイ
        if (effectDef.type === "noiseGrid" && noiseGridResourcesRef.current) {
          drawNoiseGridToCanvas(noiseGridResourcesRef.current, canvas);
          uploadNoiseGridTexture(gl, noiseGridResourcesRef.current);

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          drawQuad(
            gl,
            baseProgramRef.current!,
            IDENTITY3 as unknown as number[],
            noiseGridResourcesRef.current.texture
          );
          gl.disable(gl.BLEND);
        }

        // Dan オーバーレイ
        if (
          effectDef.type === "dan" &&
          danProgramRef.current &&
          danTexRef.current &&
          danImageRef.current
        ) {
          const danNaturalW =
            danImageRef.current.naturalWidth || danImageRef.current.width;
          const danNaturalH =
            danImageRef.current.naturalHeight || danImageRef.current.height;

          applyDanShader({
            gl,
            program: danProgramRef.current,
            time: (t % 10000) * 0.001,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            danTexture: danTexRef.current,
            danImageWidth: danNaturalW,
            danImageHeight: danNaturalH,
            config: defaultDanConfig,
          });

          // ブレンド有効化
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          drawQuad(
            gl,
            danProgramRef.current,
            IDENTITY3 as unknown as number[],
            danTexRef.current
          );
          gl.disable(gl.BLEND);
        }

        rafRef.current = requestAnimationFrame(draw);
      } catch {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, effectDef, currentEffectSignal]);

  /* ------------------------------ Input ------------------------------ */

  const handlePointerDown = () => {
    if (effectDef.type === "typography" && typoResourcesRef.current) {
      randomizeTypographyTargets(typoResourcesRef.current, canvasRef.current!);
      return;
    }

    if (effectDef.type === "snakePath" && snakePathResourcesRef.current) {
      resetSnakePath(snakePathResourcesRef.current);
      return;
    }

    // その他のケースはコールバックを呼ぶ
    onPointerDown?.();
  };

  /* --------------------------- Cleanup --------------------------- */

  useEffect(() => {
    return () => {
      if (glRef.current && typoResourcesRef.current?.texture)
        glRef.current.deleteTexture(typoResourcesRef.current.texture);
      if (glRef.current && snakePathResourcesRef.current?.texture)
        glRef.current.deleteTexture(snakePathResourcesRef.current.texture);
      if (glRef.current && noiseGridResourcesRef.current?.texture)
        glRef.current.deleteTexture(noiseGridResourcesRef.current.texture);
      if (glRef.current && danTexRef.current)
        glRef.current.deleteTexture(danTexRef.current);
      typoResourcesRef.current = null;
      snakePathResourcesRef.current = null;
      noiseGridResourcesRef.current = null;
      danTexRef.current = null;
      danImageRef.current = null;
    };
  }, []);

  /* ----------------------------- Render ----------------------------- */

  // tenichiエフェクトの場合はDOM要素で直接表示
  if (effectDef.type === "tenichi") {
    return (
      <img
        src="/assets/tenichi.gif"
        alt="Tenichi"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          pointerEvents: "none",
          mixBlendMode: "screen",
          ...style,
        }}
        onPointerDown={handlePointerDown}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        ...style,
      }}
      onPointerDown={handlePointerDown}
    />
  );
};
