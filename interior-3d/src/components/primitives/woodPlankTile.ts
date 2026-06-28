/**
 * 우드 플랭크 타일(150×900mm) 셰이더 훅 — 흰색 메지(grout) + 러닝본드(엇갈림) 패턴.
 *
 * UV는 Floors.tsx 에서 판 1장 = 1.0 단위가 되도록 bake 되어 들어옴.
 *   - vMapUv.x : 판 길이(900mm, world X) 방향
 *   - vMapUv.y : 판 폭(150mm, world Z) 방향
 * 폭 방향 인접 판마다 길이 방향으로 0.5장씩 엇갈리게 offset 하여 마루 결을 흉내낸다.
 * 메지: 길이 900mm 기준 2/900≈0.0022, 폭 150mm 기준 2/150≈0.0133, 흰색(0.92).
 *
 * `meshStandardMaterial`의 `onBeforeCompile`에 직접 전달. wrap = RepeatWrapping 필요.
 */

import * as THREE from 'three'

export function woodPlankOnBeforeCompile(shader: THREE.Shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
    vec2 _wuv = vMapUv;
    float _col = floor(_wuv.y);
    _wuv.x += mod(_col, 2.0) * 0.5;          // 인접 판 러닝본드 엇갈림
    vec4 sampledDiffuseColor = texture2D( map, _wuv );
    diffuseColor *= sampledDiffuseColor;
    vec2 _tuv = fract(_wuv);
    float _gx = 0.0022;  // 길이(900mm) 방향 메지
    float _gy = 0.0133;  // 폭(150mm) 방향 메지
    if (_tuv.x < _gx || _tuv.x > 1.0 - _gx || _tuv.y < _gy || _tuv.y > 1.0 - _gy) {
      diffuseColor.rgb = vec3(0.92);
    }
    `
  )
}
