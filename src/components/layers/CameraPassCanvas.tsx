import {useEffect, useMemo, useRef} from "react";
import {getBadTVConfigForEffect} from "../../utils/badTVConfig";
import {getPsychedelicConfigForEffect} from "../../utils/psychedelicConfig";
import {getMosaicConfigForEffect} from "../../utils/mosaicConfig";
import {applyBadTVShader} from "../../utils/badTVShader";
import {applyPsychedelicShader} from "../../utils/psychedelicShader";
import {applyMosaicShader} from "../../utils/mosaicShader";
import {applyRotatingGridShader} from "../../utils/rotatingGridShader";
import {getDefaultRotatingGridConfig} from "../../utils/rotatingGridConfig";
import {drawQuad} from "../../utils/webglUtils";
import {initWebGL} from "../../utils/webGLInitializer";
import {sizeCanvasToDisplay} from "../../utils/canvasSizing";
import indexInformation from "../../../public/index_information.json";

/* ============================= Types & Config ============================= */

export interface CameraPassCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentEffectSignal: number;
  currentPlayerSignal?: string;
  ready: boolean;
  fitMode?: "contain" | "cover";
  style?: React.CSSProperties;
}

type EffectKind =
  | "badTV"
  | "psychedelic"
  | "mosaic"
  | "rotatingGrid"
  | "normal";

interface EffectDefinition {
  type: EffectKind;
  badTVIntensity?: "subtle" | "moderate" | "heavy" | "extreme";
  psychedelicIntensity?: "subtle" | "moderate" | "intense" | "extreme";
}

// JSONから取得されるエフェクトの型定義
interface JsonEffectDefinition {
  type: string;
  [key: string]: unknown;
}

const getEffectDefinition = (
  effectSignal: number,
  playerSignal?: string
): EffectDefinition => {
  // 信号12は全エフェクト無効化
  if (effectSignal === 12) {
    return {type: "normal"};
  }

  if (playerSignal === undefined) {
    return {type: "normal"};
  }

  const songInfo = indexInformation.find(
    (item) =>
      item.effectSignal === effectSignal && item.playerSignal === playerSignal
  );

  if (!songInfo || !songInfo.effect) {
    return {type: "normal"};
  }

  const effect = songInfo.effect as JsonEffectDefinition;
  // カメラ依存エフェクトのみフィルタリング
  if (
    effect.type === "badTV" ||
    effect.type === "psychedelic" ||
    effect.type === "mosaic" ||
    effect.type === "rotatingGrid"
  ) {
    return effect as EffectDefinition;
  }

  return {type: "normal"};
};

/* ============================= Math helpers ============================= */

const IDENTITY3 = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

function makeScaleTranslate(sx: number, sy: number, tx = 0, ty = 0): number[] {
  return [sx, 0, tx, 0, sy, ty, 0, 0, 1];
}

function computeQuadTransform(
  canvasW: number,
  canvasH: number,
  videoW: number,
  videoH: number,
  fitMode: "contain" | "cover"
): number[] {
  if (!canvasW || !canvasH || !videoW || !videoH) return [...IDENTITY3];
  const canvasAR = canvasW / canvasH;
  const videoAR = videoW / videoH;
  let sx = 1.0,
    sy = 1.0;
  if (fitMode === "contain") {
    if (canvasAR > videoAR) {
      sx = videoAR / canvasAR;
      sy = 1.0;
    } else {
      sx = 1.0;
      sy = canvasAR / videoAR;
    }
  } else {
    if (canvasAR > videoAR) {
      sx = 1.0;
      sy = canvasAR / videoAR;
    } else {
      sx = videoAR / canvasAR;
      sy = 1.0;
    }
  }
  return makeScaleTranslate(sx, sy, 0, 0);
}

/* ============================= WebGL helpers ============================= */

function ensureVideoTexture(
  gl: WebGLRenderingContext,
  vid: HTMLVideoElement,
  existing: WebGLTexture | null,
  opts?: {minFilter?: number; magFilter?: number; flipY?: boolean}
): WebGLTexture {
  const minF = opts?.minFilter ?? gl.LINEAR;
  const magF = opts?.magFilter ?? gl.LINEAR;
  const flipY = opts?.flipY ?? false;
  let tex = existing;
  if (!tex) {
    tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minF);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magF);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
  } else {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
  }
  return tex;
}

function setTextureFilter(
  gl: WebGLRenderingContext,
  tex: WebGLTexture,
  nearest: boolean
) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    nearest ? gl.NEAREST : gl.LINEAR
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    nearest ? gl.NEAREST : gl.LINEAR
  );
}

/* ============================= Component ============================= */

export const CameraPassCanvas: React.FC<CameraPassCanvasProps> = ({
  videoRef,
  currentEffectSignal,
  currentPlayerSignal,
  ready,
  fitMode = "contain",
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  // Programs
  const baseProgramRef = useRef<WebGLProgram | null>(null);
  const badTVProgramRef = useRef<WebGLProgram | null>(null);
  const psychedelicProgramRef = useRef<WebGLProgram | null>(null);
  const mosaicProgramRef = useRef<WebGLProgram | null>(null);
  const rotatingGridProgramRef = useRef<WebGLProgram | null>(null);

  // Video texture
  const videoTexRef = useRef<WebGLTexture | null>(null);
  const lastNearestRef = useRef<boolean>(false);

  // RAF
  const rafRef = useRef<number>(0);

  // Mosaic state
  const mosaicEffectStartRef = useRef<number>(-1);
  const mosaicAngleRef = useRef<number>(0);

  // Effect def
  const effectDef = useMemo<EffectDefinition>(() => {
    return getEffectDefinition(currentEffectSignal, currentPlayerSignal);
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
    badTVProgramRef.current = result.programs.badTVProgram;
    psychedelicProgramRef.current = result.programs.psychedelicProgram;
    mosaicProgramRef.current = result.programs.mosaicProgram;
    rotatingGridProgramRef.current = result.programs.rotatingGridProgram;
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
    };
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [ready]);

  /* ------------------------------- Draw loop -------------------------------- */

  useEffect(() => {
    if (!ready || !glRef.current) return;

    const gl = glRef.current!;
    const canvas = canvasRef.current!;

    const draw = (t: number) => {
      try {
        const vid = videoRef.current!;
        if (!vid || !vid.videoWidth || !vid.videoHeight) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }

        // DPR/リサイズ
        sizeCanvasToDisplay(canvas, gl);

        // 背景クリア（不透明な黒）
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 動画テクスチャ更新
        videoTexRef.current = ensureVideoTexture(gl, vid, videoTexRef.current, {
          flipY: false,
        });

        // フィット行列
        const transform = computeQuadTransform(
          canvas.width,
          canvas.height,
          vid.videoWidth,
          vid.videoHeight,
          fitMode
        );
        const ndcScaleX = transform[0];
        const ndcScaleY = transform[4];

        let programToUse: WebGLProgram | null = baseProgramRef.current;

        // エフェクト適用
        if (effectDef.type === "badTV" && badTVProgramRef.current) {
          applyBadTVShader({
            gl,
            program: badTVProgramRef.current,
            time: (t % 10000) * 0.001,
            config: getBadTVConfigForEffect(
              currentEffectSignal,
              effectDef.badTVIntensity
            ),
          });
          programToUse = badTVProgramRef.current;
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        } else if (
          effectDef.type === "psychedelic" &&
          psychedelicProgramRef.current
        ) {
          applyPsychedelicShader({
            gl,
            program: psychedelicProgramRef.current,
            time: (t % 10000) * 0.001,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            config: getPsychedelicConfigForEffect(
              currentEffectSignal,
              currentPlayerSignal
            ),
          });
          programToUse = psychedelicProgramRef.current;
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        } else if (effectDef.type === "mosaic" && mosaicProgramRef.current) {
          const nowSec = t * 0.001;
          const cfg = getMosaicConfigForEffect(currentEffectSignal);
          const active =
            mosaicEffectStartRef.current >= 0 &&
            nowSec - mosaicEffectStartRef.current < cfg.effectDuration;

          if (videoTexRef.current) {
            if (active && !lastNearestRef.current) {
              setTextureFilter(gl, videoTexRef.current, true);
              lastNearestRef.current = true;
            } else if (!active && lastNearestRef.current) {
              setTextureFilter(gl, videoTexRef.current, false);
              lastNearestRef.current = false;
            }
          }

          applyMosaicShader({
            gl,
            program: mosaicProgramRef.current,
            time: nowSec,
            effectStart: mosaicEffectStartRef.current,
            shakeAngle: mosaicAngleRef.current,
            viewWidth: canvas.width,
            viewHeight: canvas.height,
            texWidth: vid.videoWidth,
            texHeight: vid.videoHeight,
            ndcScaleX,
            ndcScaleY,
            config: cfg,
          });
          programToUse = mosaicProgramRef.current;
        } else if (
          effectDef.type === "rotatingGrid" &&
          rotatingGridProgramRef.current
        ) {
          applyRotatingGridShader({
            gl,
            program: rotatingGridProgramRef.current,
            time: (t % 10000) * 0.001,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            config: getDefaultRotatingGridConfig(),
          });
          programToUse = rotatingGridProgramRef.current;
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        } else {
          // normal: カメラをそのまま描画
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        }

        // カメラを描画
        drawQuad(gl, programToUse!, transform, videoTexRef.current!);

        rafRef.current = requestAnimationFrame(draw);
      } catch {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    ready,
    videoRef,
    effectDef,
    currentEffectSignal,
    currentPlayerSignal,
    fitMode,
  ]);

  /* --------------------------- Cleanup --------------------------- */

  useEffect(() => {
    return () => {
      if (glRef.current && videoTexRef.current)
        glRef.current.deleteTexture(videoTexRef.current);
      videoTexRef.current = null;
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
        ...style,
      }}
    />
  );
};
