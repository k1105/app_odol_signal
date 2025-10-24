// 球体シェーダーのレンダリング管理
import {applySphereShader, type SphereShaderContext} from "./sphereShader";
import {getSphereConfigForPlayer, type PlayerSignal} from "./sphereConfig";
import type {WebGLPrograms} from "./webGLInitializer";

export interface SphereRendererContext {
  gl: WebGLRenderingContext;
  programs: WebGLPrograms;
  canvasWidth: number;
  canvasHeight: number;
  time: number;
  playerSignal?: PlayerSignal;
}

/**
 * 球体シェーダーをレンダリング
 * @param context レンダリングコンテキスト
 */
export const renderSphereShader = (context: SphereRendererContext): void => {
  const {gl, programs, canvasWidth, canvasHeight, time, playerSignal} = context;

  if (!programs.sphereProgram) {
    console.error("Sphere program not available");
    return;
  }

  // プレイヤーシグナルに基づく設定を取得
  const config = getSphereConfigForPlayer(playerSignal);

  // 球体シェーダーコンテキストを作成
  const sphereContext: SphereShaderContext = {
    gl,
    program: programs.sphereProgram,
    config,
    time,
    canvasWidth,
    canvasHeight,
  };

  // 球体シェーダーを適用
  applySphereShader(sphereContext);

  // フルスクリーンクアッドを描画
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  // 頂点属性を設定
  const positionLocation = gl.getAttribLocation(
    programs.sphereProgram,
    "a_position"
  );
  const texCoordLocation = gl.getAttribLocation(
    programs.sphereProgram,
    "a_texCoord"
  );

  if (positionLocation !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  if (texCoordLocation !== -1) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  // 変換行列を設定（単位行列）
  const transformLocation = gl.getUniformLocation(
    programs.sphereProgram,
    "u_transform"
  );
  if (transformLocation) {
    gl.uniformMatrix3fv(
      transformLocation,
      false,
      new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    );
  }

  // 描画
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // クリーンアップ
  gl.deleteBuffer(positionBuffer);
  gl.deleteBuffer(texCoordBuffer);
};

/**
 * プレイヤーシグナルに基づいて球体シェーダーを更新
 * @param context レンダリングコンテキスト
 * @param newPlayerSignal 新しいプレイヤーシグナル
 */
export const updateSphereShaderForSignal = (
  context: SphereRendererContext,
  newPlayerSignal?: PlayerSignal
): void => {
  const updatedContext = {
    ...context,
    playerSignal: newPlayerSignal,
  };
  renderSphereShader(updatedContext);
};
