import {useEffect, useMemo, useRef} from "react";
import {getBadTVConfigForEffect} from "../../utils/badTVConfig";
import {getPsychedelicConfigForEffect} from "../../utils/psychedelicConfig";
import {getMosaicConfigForEffect} from "../../utils/mosaicConfig";
import {getSparkleConfigForEffect} from "../../utils/sparkleConfig";
import {applyBadTVShader} from "../../utils/badTVShader";
import {applyPsychedelicShader} from "../../utils/psychedelicShader";
import {applyMosaicShader} from "../../utils/mosaicShader";
import {applySparkleShader} from "../../utils/sparkleShader";
import {applyRotatingGridShader} from "../../utils/rotatingGridShader";
import {getDefaultRotatingGridConfig} from "../../utils/rotatingGridConfig";
import {drawQuad} from "../../utils/webglUtils";
import {initWebGL} from "../../utils/webGLInitializer";
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
import indexInformation from "../../../public/index_information.json";

/* ============================= Types & Config ============================= */

export interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentEffectSignal: number; // effectSignal: 0-8
  currentPlayerSignal?: string; // playerSignal: "BLUE" | "YELLOW" | "RED"
  ready: boolean;
  isNoSignalDetected?: boolean;
  onEffectChange?: (effect: number) => void;
  fitMode?: "contain" | "cover"; // 既定: contain（黒帯OK）
}

/** 効果タイプ */
type EffectKind =
  | "badTV"
  | "psychedelic"
  | "mosaic"
  | "typography"
  | "sparkle"
  | "rotatingGrid"
  | "snakePath"
  | "noiseGrid"
  | "normal";
interface EffectDefinition {
  type: EffectKind;
  badTVIntensity?: "subtle" | "moderate" | "heavy" | "extreme";
  psychedelicIntensity?: "subtle" | "moderate" | "intense" | "extreme";
}

// index_information.jsonからエフェクト定義を動的に取得する関数
// playerSignalとeffectSignalの組み合わせで検索
const getEffectDefinition = (
  effectSignal: number,
  playerSignal?: string
): EffectDefinition => {
  // playerSignalが未設定の場合は何も表示しない
  if (playerSignal === undefined) {
    return {type: "normal"};
  }

  const songInfo = indexInformation.find(
    (item) =>
      item.effectSignal === effectSignal && item.playerSignal === playerSignal
  );
  console.log("getEffectDefinition:", {
    effectSignal,
    playerSignal,
    songInfo,
  });

  if (!songInfo || !songInfo.effect) {
    return {type: "normal"};
  }

  return songInfo.effect as EffectDefinition;
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

function sizeCanvasToDisplay(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext
) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  const cssH = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  const w = Math.floor(cssW * dpr);
  const h = Math.floor(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

/* ============================= Component ============================= */

const TYPOGRAPHY_LETTERS = ["A", "S", "P"];

export const CameraCanvas: React.FC<CameraCanvasProps> = ({
  videoRef,
  currentEffectSignal,
  currentPlayerSignal,
  ready,
  fitMode = "contain",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  // Programs
  const baseProgramRef = useRef<WebGLProgram | null>(null);
  const badTVProgramRef = useRef<WebGLProgram | null>(null);
  const psychedelicProgramRef = useRef<WebGLProgram | null>(null);
  const mosaicProgramRef = useRef<WebGLProgram | null>(null);
  const sparkleProgramRef = useRef<WebGLProgram | null>(null);
  const rotatingGridProgramRef = useRef<WebGLProgram | null>(null);
  const noiseGridProgramRef = useRef<WebGLProgram | null>(null);

  // Video texture
  const videoTexRef = useRef<WebGLTexture | null>(null);
  const lastNearestRef = useRef<boolean>(false);

  // Sparkle texture
  const starTexRef = useRef<WebGLTexture | null>(null);
  const starImageRef = useRef<HTMLImageElement | null>(null);

  // RAF & timers
  const rafRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);

  // Mosaic state
  const mosaicEffectStartRef = useRef<number>(-1);
  const mosaicAngleRef = useRef<number>(0);

  // Typography overlay
  const typoResourcesRef = useRef<TypographyResources | null>(null);

  // Snake Path overlay
  const snakePathResourcesRef = useRef<SnakePathResources | null>(null);

  // Noise Grid overlay
  const noiseGridResourcesRef = useRef<NoiseGridResources | null>(null);

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
    sparkleProgramRef.current = result.programs.sparkleProgram;
    rotatingGridProgramRef.current = result.programs.rotatingGridProgram;
    noiseGridProgramRef.current = result.programs.noiseGridProgram;
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
      if (effectDef.type === "typography" && typoResourcesRef.current) {
        // サイズ変更に追随
        typoResourcesRef.current = ensureTypographyResources(
          glRef.current,
          canvasRef.current,
          typoResourcesRef.current
        );
      }
      if (effectDef.type === "snakePath" && snakePathResourcesRef.current) {
        // サイズ変更に追随
        snakePathResourcesRef.current = ensureSnakePathResources(
          glRef.current,
          canvasRef.current,
          snakePathResourcesRef.current
        );
      }
      if (effectDef.type === "noiseGrid" && noiseGridResourcesRef.current) {
        // サイズ変更に追随
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

  // Sparkle 星画像のロード
  useEffect(() => {
    if (!ready || !glRef.current) return;
    if (effectDef.type === "sparkle" && !starImageRef.current) {
      const img = new Image();
      img.onload = () => {
        const gl = glRef.current;
        if (!gl) return;

        // テクスチャを作成
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

        // 背景クリア（containの黒帯）
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 動画テクスチャ更新
        videoTexRef.current = ensureVideoTexture(gl, vid, videoTexRef.current, {
          flipY: false,
        });

        // フィット行列

        // ※ 上のイレギュラーは保険。実際は下の fitMode を使う:
        const transform2 = computeQuadTransform(
          canvas.width,
          canvas.height,
          vid.videoWidth,
          vid.videoHeight,
          typeof fitMode === "string" ? fitMode : "contain"
        );
        const ndcScaleX = transform2[0];
        const ndcScaleY = transform2[4];

        let programToUse: WebGLProgram | null = baseProgramRef.current;

        // --- エフェクト適用（1フレーム1パス）
        if (effectDef.type === "badTV" && badTVProgramRef.current) {
          applyBadTVShader({
            gl,
            program: badTVProgramRef.current,
            time: (t % 10000) * 0.001,
            config: getBadTVConfigForEffect(currentEffectSignal),
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
          effectDef.type === "sparkle" &&
          sparkleProgramRef.current &&
          starTexRef.current &&
          starImageRef.current
        ) {
          // 星画像の実際のサイズを取得
          const starNaturalW =
            starImageRef.current.naturalWidth || starImageRef.current.width;
          const starNaturalH =
            starImageRef.current.naturalHeight || starImageRef.current.height;

          console.log(
            "Canvas:",
            canvas.width,
            "x",
            canvas.height,
            "Aspect:",
            (canvas.width / canvas.height).toFixed(2)
          );
          console.log(
            "Star natural:",
            starNaturalW,
            "x",
            starNaturalH,
            "Star aspect:",
            (starNaturalW / starNaturalH).toFixed(2)
          );

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
          programToUse = sparkleProgramRef.current;
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
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
          // base / typography / snakePath ではカメラは素描画
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        }

        // 1) カメラを描画
        drawQuad(gl, programToUse!, transform2, videoTexRef.current!);

        // 2) Typography オーバーレイ（常時：エフェクト=typography の間）
        if (effectDef.type === "typography" && typoResourcesRef.current) {
          drawTypographyToCanvas(
            typoResourcesRef.current,
            canvas,
            TYPOGRAPHY_LETTERS
          );
          uploadTypographyTexture(gl, typoResourcesRef.current);

          // アルファ合成でオーバーレイ
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          // 画面全体にそのまま貼るので transform=IDENTITY3
          drawQuad(
            gl,
            baseProgramRef.current!,
            IDENTITY3 as unknown as number[],
            typoResourcesRef.current.texture
          );
          gl.disable(gl.BLEND);
        }

        // 3) Snake Path オーバーレイ（スクリーンブレンド）
        if (effectDef.type === "snakePath" && snakePathResourcesRef.current) {
          drawSnakePathToCanvas(snakePathResourcesRef.current, canvas);
          uploadSnakePathTexture(gl, snakePathResourcesRef.current);

          // スクリーンブレンドで合成
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
          // 画面全体に表示
          drawQuad(
            gl,
            baseProgramRef.current!,
            IDENTITY3 as unknown as number[],
            snakePathResourcesRef.current.texture
          );
          gl.disable(gl.BLEND);
        }

        // 4) Noise Grid オーバーレイ（スクリーンブレンド）
        if (effectDef.type === "noiseGrid" && noiseGridResourcesRef.current) {
          drawNoiseGridToCanvas(noiseGridResourcesRef.current, canvas);
          uploadNoiseGridTexture(gl, noiseGridResourcesRef.current);

          // スクリーンブレンドで合成
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
          // 画面全体に表示
          drawQuad(
            gl,
            baseProgramRef.current!,
            IDENTITY3 as unknown as number[],
            noiseGridResourcesRef.current.texture
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
  }, [
    ready,
    videoRef,
    effectDef,
    currentEffectSignal,
    currentPlayerSignal,
    fitMode,
  ]);

  /* ------------------------------ Input ------------------------------ */

  const handlePointerDown = () => {
    if (effectDef.type === "typography" && typoResourcesRef.current) {
      // 文字のターゲットだけ更新（常時表示）
      randomizeTypographyTargets(typoResourcesRef.current, canvasRef.current!);
      return;
    }

    if (effectDef.type === "snakePath" && snakePathResourcesRef.current) {
      // Snake Pathをリセット
      resetSnakePath(snakePathResourcesRef.current);
      return;
    }

    // それ以外は従来のワンショット系
    const cfg = getMosaicConfigForEffect(currentEffectSignal);
    mosaicEffectStartRef.current = performance.now() / 1000;
    mosaicAngleRef.current = Math.random() * Math.PI * 2;

    // ちょい長めにON（mosaicのエンベロープに同期）
    const ms = Math.max(50, Math.floor(cfg.effectDuration * 1000 + 30));
    const id = window.setTimeout(() => {
      // no-op：mosaicは effectStart で制御、isEffectOn は実質使ってないが将来用に残す
    }, ms);
    timersRef.current.push(id);
  };

  /* --------------------------- Cleanup --------------------------- */

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      if (glRef.current && videoTexRef.current)
        glRef.current.deleteTexture(videoTexRef.current);
      if (glRef.current && typoResourcesRef.current?.texture)
        glRef.current.deleteTexture(typoResourcesRef.current.texture);
      if (glRef.current && snakePathResourcesRef.current?.texture)
        glRef.current.deleteTexture(snakePathResourcesRef.current.texture);
      if (glRef.current && starTexRef.current)
        glRef.current.deleteTexture(starTexRef.current);
      videoTexRef.current = null;
      typoResourcesRef.current = null;
      snakePathResourcesRef.current = null;
      starTexRef.current = null;
      starImageRef.current = null;
    };
  }, []);

  /* ----------------------------- Render ----------------------------- */

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{width: "100%", height: "100%", display: "block"}}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
};
