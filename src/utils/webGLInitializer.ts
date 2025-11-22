import {createShader, createProgram} from "./webglUtils";
import {
  vertexShaderSource,
  fragmentShaderSource,
  blendFragmentShaderSource,
  staticVertexShader,
  staticFragmentShader,
} from "./shaderSources";
import {badTVVertexShader, badTVFragmentShader} from "./badTVShader";
import {
  psychedelicVertexShader,
  psychedelicFragmentShader,
} from "./psychedelicShader";
import {mosaicVertexShader, mosaicFragmentShader} from "./mosaicShader";
import {sparkleVertexShader, sparkleFragmentShader} from "./sparkleShader";
import {
  rotatingGridVertexShader,
  rotatingGridFragmentShader,
} from "./rotatingGridShader";
import {
  noiseGridVertexShader,
  noiseGridFragmentShader,
} from "./noiseGridShader";
import {sphereVertexShader, sphereFragmentShader} from "./sphereShader";
import {
  playerNameVertexShader,
  playerNameFragmentShader,
} from "./playerNameShader";
import {danVertexShader, danFragmentShader} from "./danShader";
import {
  yellowStarVertexShader,
  yellowStarFragmentShader,
} from "./yellowStarShader";
import {
  redFlickerVertexShader,
  redFlickerFragmentShader,
} from "./shaderSources";

export interface WebGLPrograms {
  program: WebGLProgram | null;
  blendProgram: WebGLProgram | null;
  badTVProgram: WebGLProgram | null;
  psychedelicProgram: WebGLProgram | null;
  staticProgram: WebGLProgram | null;
  mosaicProgram: WebGLProgram | null;
  sparkleProgram: WebGLProgram | null;
  rotatingGridProgram: WebGLProgram | null;
  noiseGridProgram: WebGLProgram | null;
  sphereProgram: WebGLProgram | null;
  playerNameProgram: WebGLProgram | null;
  danProgram: WebGLProgram | null;
  yellowStarProgram: WebGLProgram | null;
  redFlickerProgram: WebGLProgram | null;
}

// WebGL初期化
export const initWebGL = (
  canvas: HTMLCanvasElement
): {gl: WebGLRenderingContext | null; programs: WebGLPrograms} => {
  try {
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext;

    if (!gl) {
      console.error("WebGL not supported");
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          staticProgram: null,
          mosaicProgram: null,
          sparkleProgram: null,
          rotatingGridProgram: null,
          noiseGridProgram: null,
          sphereProgram: null,
          playerNameProgram: null,
          danProgram: null,
          yellowStarProgram: null,
          redFlickerProgram: null,
        },
      };
    }

    // シェーダーの作成
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );
    const blendFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      blendFragmentShaderSource
    );
    const badTVVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      badTVVertexShader
    );
    const badTVFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      badTVFragmentShader
    );
    const psychedelicVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      psychedelicVertexShader
    );
    const psychedelicFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      psychedelicFragmentShader
    );
    const staticVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      staticVertexShader
    );
    const staticFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      staticFragmentShader
    );
    const mosaicVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      mosaicVertexShader
    );
    const mosaicFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      mosaicFragmentShader
    );
    const sparkleVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      sparkleVertexShader
    );
    const sparkleFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      sparkleFragmentShader
    );
    const rotatingGridVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      rotatingGridVertexShader
    );
    const rotatingGridFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      rotatingGridFragmentShader
    );
    const noiseGridVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      noiseGridVertexShader
    );
    const noiseGridFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      noiseGridFragmentShader
    );
    const sphereVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      sphereVertexShader
    );
    const sphereFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      sphereFragmentShader
    );
    const playerNameVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      playerNameVertexShader
    );
    const playerNameFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      playerNameFragmentShader
    );
    const danVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      danVertexShader
    );
    const danFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      danFragmentShader
    );
    const yellowStarVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      yellowStarVertexShader
    );
    const yellowStarFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      yellowStarFragmentShader
    );
    const redFlickerVertexShaderObj = createShader(
      gl,
      gl.VERTEX_SHADER,
      redFlickerVertexShader
    );
    const redFlickerFragmentShaderObj = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      redFlickerFragmentShader
    );

    if (
      !vertexShader ||
      !fragmentShader ||
      !blendFragmentShader ||
      !badTVVertexShaderObj ||
      !badTVFragmentShaderObj ||
      !psychedelicVertexShaderObj ||
      !psychedelicFragmentShaderObj ||
      !staticVertexShaderObj ||
      !staticFragmentShaderObj ||
      !mosaicVertexShaderObj ||
      !mosaicFragmentShaderObj ||
      !sparkleVertexShaderObj ||
      !sparkleFragmentShaderObj ||
      !rotatingGridVertexShaderObj ||
      !rotatingGridFragmentShaderObj ||
      !noiseGridVertexShaderObj ||
      !noiseGridFragmentShaderObj ||
      !sphereVertexShaderObj ||
      !sphereFragmentShaderObj ||
      !playerNameVertexShaderObj ||
      !playerNameFragmentShaderObj ||
      !danVertexShaderObj ||
      !danFragmentShaderObj ||
      !yellowStarVertexShaderObj ||
      !yellowStarFragmentShaderObj ||
      !redFlickerVertexShaderObj ||
      !redFlickerFragmentShaderObj
    ) {
      console.error("Shader creation failed");
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          staticProgram: null,
          mosaicProgram: null,
          sparkleProgram: null,
          rotatingGridProgram: null,
          noiseGridProgram: null,
          sphereProgram: null,
          playerNameProgram: null,
          danProgram: null,
          yellowStarProgram: null,
          redFlickerProgram: null,
        },
      };
    }

    // プログラムの作成
    const program = createProgram(gl, vertexShader, fragmentShader);
    const blendProgram = createProgram(gl, vertexShader, blendFragmentShader);
    const badTVProgram = createProgram(
      gl,
      badTVVertexShaderObj,
      badTVFragmentShaderObj
    );
    const psychedelicProgram = createProgram(
      gl,
      psychedelicVertexShaderObj,
      psychedelicFragmentShaderObj
    );
    const staticProgram = createProgram(
      gl,
      staticVertexShaderObj,
      staticFragmentShaderObj
    );
    const mosaicProgram = createProgram(
      gl,
      mosaicVertexShaderObj,
      mosaicFragmentShaderObj
    );
    const sparkleProgram = createProgram(
      gl,
      sparkleVertexShaderObj,
      sparkleFragmentShaderObj
    );
    const rotatingGridProgram = createProgram(
      gl,
      rotatingGridVertexShaderObj,
      rotatingGridFragmentShaderObj
    );
    const noiseGridProgram = createProgram(
      gl,
      noiseGridVertexShaderObj,
      noiseGridFragmentShaderObj
    );
    const sphereProgram = createProgram(
      gl,
      sphereVertexShaderObj,
      sphereFragmentShaderObj
    );
    const playerNameProgram = createProgram(
      gl,
      playerNameVertexShaderObj,
      playerNameFragmentShaderObj
    );
    const danProgram = createProgram(
      gl,
      danVertexShaderObj,
      danFragmentShaderObj
    );
    const yellowStarProgram = createProgram(
      gl,
      yellowStarVertexShaderObj,
      yellowStarFragmentShaderObj
    );
    const redFlickerProgram = createProgram(
      gl,
      redFlickerVertexShaderObj,
      redFlickerFragmentShaderObj
    );

    if (
      !program ||
      !blendProgram ||
      !badTVProgram ||
      !psychedelicProgram ||
      !staticProgram ||
      !mosaicProgram ||
      !sparkleProgram ||
      !rotatingGridProgram ||
      !noiseGridProgram ||
      !sphereProgram ||
      !playerNameProgram ||
      !danProgram ||
      !yellowStarProgram ||
      !redFlickerProgram
    ) {
      console.error("Program creation failed");
      return {
        gl: null,
        programs: {
          program: null,
          blendProgram: null,
          badTVProgram: null,
          psychedelicProgram: null,
          staticProgram: null,
          mosaicProgram: null,
          sparkleProgram: null,
          rotatingGridProgram: null,
          noiseGridProgram: null,
          sphereProgram: null,
          playerNameProgram: null,
          danProgram: null,
          yellowStarProgram: null,
          redFlickerProgram: null,
        },
      };
    }

    // ブレンドモードの設定
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return {
      gl,
      programs: {
        program,
        blendProgram,
        badTVProgram,
        psychedelicProgram,
        staticProgram,
        mosaicProgram,
        sparkleProgram,
        rotatingGridProgram,
        noiseGridProgram,
        sphereProgram,
        playerNameProgram,
        danProgram,
        yellowStarProgram,
        redFlickerProgram,
      },
    };
  } catch (error) {
    console.error("WebGL initialization error:", error);
    return {
      gl: null,
      programs: {
        program: null,
        blendProgram: null,
        badTVProgram: null,
        psychedelicProgram: null,
        staticProgram: null,
        mosaicProgram: null,
        sparkleProgram: null,
        rotatingGridProgram: null,
        noiseGridProgram: null,
        sphereProgram: null,
        playerNameProgram: null,
        danProgram: null,
        yellowStarProgram: null,
        redFlickerProgram: null,
      },
    };
  }
};
