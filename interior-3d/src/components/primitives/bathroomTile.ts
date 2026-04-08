/**
 * 화장실 타일 메지(grout) 셰이더 훅 — 흰색 라인을 sample uv 끝부분에 그림.
 * 타일 600×1200mm 기준: x축 threshold = 3/600 ≈ 0.005, y축 threshold = 3/1200 ≈ 0.0025
 *
 * `meshStandardMaterial`의 `onBeforeCompile`에 직접 전달.
 */

import * as THREE from 'three'

export function tileGroutOnBeforeCompile(shader: THREE.Shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
    #include <map_fragment>
    vec2 _tuv = fract(vMapUv);
    float _gx = 0.005;
    float _gy = 0.0025;
    if (_tuv.x < _gx || _tuv.x > 1.0 - _gx || _tuv.y < _gy || _tuv.y > 1.0 - _gy) {
      diffuseColor.rgb = vec3(1.0);
    }
    `
  )
}
