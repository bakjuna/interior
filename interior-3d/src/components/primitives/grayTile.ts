/**
 * 회색 포세린 타일(정사각 300×300mm) 메지(grout) 셰이더 훅.
 * 타일 자체 텍스처에는 메지가 없으므로 타일 경계에 얇은 회색 라인을 그린다.
 *
 * UV는 Floors.tsx 에서 타일 1장 = 1.0 단위가 되도록 bake 되어 들어옴.
 * 메지 폭 ≈ 2mm / 300mm ≈ 0.007 (가로·세로 동일).
 *
 * `meshStandardMaterial`의 `onBeforeCompile`에 직접 전달.
 */

import * as THREE from 'three'

export function grayTileGroutOnBeforeCompile(shader: THREE.Shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
    #include <map_fragment>
    vec2 _tuv = fract(vMapUv);
    float _g = 0.007;
    if (_tuv.x < _g || _tuv.x > 1.0 - _g || _tuv.y < _g || _tuv.y > 1.0 - _g) {
      diffuseColor.rgb = vec3(0.58, 0.58, 0.59);
    }
    `
  )
}
