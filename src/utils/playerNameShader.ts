// プレイヤー名エフェクト用シェーダー（円を描画）

export const playerNameVertexShader = `
  attribute vec2 a_position;
  uniform mat3 u_transform;
  
  varying vec2 v_position;
  
  void main() {
    vec2 position = (u_transform * vec3(a_position, 1.0)).xy;
    gl_Position = vec4(position, 0.0, 1.0);
    v_position = a_position;
  }
`;

export const playerNameFragmentShader = `
  precision mediump float;
  
  uniform vec2 u_resolution;
  uniform vec3 u_color;
  uniform float u_circleRadius;
  uniform vec2 u_circlePositions[80]; // 最大80個の円（左右に2つずつ）
  
  varying vec2 v_position;
  
  void main() {
    vec2 uv = (v_position + 1.0) * 0.5; // -1~1 を 0~1 に変換
    vec2 pixelPos = uv * u_resolution;
    
    vec3 color = vec3(1.0); // 白（MULTIPLY blend mode用）
    float alpha = 0.0; // 透過
    bool inCircle = false;
    
    // 全ての円を描画
    for (int i = 0; i < 20; i++) {
      
      vec2 circlePos = u_circlePositions[i];
      float dist = distance(pixelPos, circlePos);
      
      if (dist < u_circleRadius) {
        // 円の内側：色を設定
        // MULTIPLY blend mode用：色の部分はu_color、透明の部分は影響なし
        inCircle = true;
        break;
      }
    }
    
    if (inCircle) {
      color = u_color;
      alpha = 1.0;
    }
    
    gl_FragColor = vec4(color, alpha);
  }
`;
