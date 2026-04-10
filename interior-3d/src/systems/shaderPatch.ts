/**
 * Three.js 셰이더 패치 — light loop에 early-exit 추가.
 *
 * 원리: 기본 셰이더는 모든 light에 대해 비싼 PBR(RE_Direct) 연산을 무조건 실행.
 * 패치 후: directLight.visible == false (거리 밖 또는 intensity=0) 인 light는
 * RE_Direct를 건너뜀. 뷰 100% 동일, GPU 연산 대폭 감소.
 *
 * ⚠ 반드시 어떤 material 보다도 먼저 import 되어야 함.
 * ⚠ shadows=false 환경 전용 (shadow map 인덱싱 코드 제거).
 */

import * as THREE from 'three'

let chunk = THREE.ShaderChunk['lights_fragment_begin']
let patchCount = 0

// --- PointLight: unrolled → dynamic + early exit ---
{
  const before = chunk
  chunk = chunk.replace(
    /\t#pragma unroll_loop_start\n\tfor \( int i = 0; i < NUM_POINT_LIGHTS; i \+\+ \) \{[\s\S]*?\t\}\n\t#pragma unroll_loop_end/,
    `\tfor ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

\t\tpointLight = pointLights[ i ];
\t\tgetPointLightInfo( pointLight, geometryPosition, directLight );
\t\tif ( !directLight.visible ) continue;
\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

\t}`
  )
  if (chunk !== before) patchCount++
}

// --- SpotLight: unrolled → dynamic + early exit ---
{
  const before = chunk
  chunk = chunk.replace(
    /\t#pragma unroll_loop_start\n\tfor \( int i = 0; i < NUM_SPOT_LIGHTS; i \+\+ \) \{[\s\S]*?\t\}\n\t#pragma unroll_loop_end/,
    `\tfor ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

\t\tspotLight = spotLights[ i ];
\t\tgetSpotLightInfo( spotLight, geometryPosition, directLight );
\t\tif ( !directLight.visible ) continue;
\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

\t}`
  )
  if (chunk !== before) patchCount++
}

// --- RectAreaLight: unrolled → dynamic + color==0 체크 (struct에 intensity 없음, color 로 판별) ---
{
  const before = chunk
  chunk = chunk.replace(
    /\t#pragma unroll_loop_start\n\tfor \( int i = 0; i < NUM_RECT_AREA_LIGHTS; i \+\+ \) \{[\s\S]*?\t\}\n\t#pragma unroll_loop_end/,
    `\tfor ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

\t\trectAreaLight = rectAreaLights[ i ];
\t\tif ( dot( rectAreaLight.color, rectAreaLight.color ) < 0.0001 ) continue;
\t\tRE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

\t}`
  )
  if (chunk !== before) patchCount++
}

THREE.ShaderChunk['lights_fragment_begin'] = chunk

if (patchCount < 3) {
  console.warn(`[shaderPatch] ${patchCount}/3 patches applied — some light loops not optimized`)
} else {
  console.log('[shaderPatch] All 3 light loop patches applied ✓')
}

export {}
