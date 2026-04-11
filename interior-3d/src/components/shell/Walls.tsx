/**
 * 모든 벽체 일괄 렌더 — walls[] 데이터 + 실크 벽지 텍스처.
 * 벽별 UV repeat 을 geometry 에 bake 한 뒤 mergeGeometries 로 단일 draw call.
 * tile: 'bathWall' 벽은 별도 텍스처로 분리 렌더.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { walls, WALL_HEIGHT, type Wall } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'

/** 스터코 타일 브레이킹 셰이더 패치 — 해시 기반 타일별 UV 오프셋 + 3스케일 블렌딩 */
function stuccoPatch(shader: { fragmentShader: string }) {
  // 해시 함수를 common include 뒤에 삽입
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
    float stuccoHash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    `
  )
  // map_fragment 교체
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
    #ifdef USE_MAP
      vec2 uv0 = vMapUv;
      vec2 tile = floor(uv0);
      float h = stuccoHash(tile);
      vec2 uvA = uv0 + vec2(h, fract(h * 17.3)) * 0.5;
      vec4 s1 = texture2D(map, uvA);
      vec4 s2 = texture2D(map, uv0 * 1.73 + 0.31);
      vec4 s3 = texture2D(map, uv0 * 0.57 + 0.67);
      vec2 f = fract(uv0);
      vec2 w = smoothstep(0.0, 0.15, f) * smoothstep(0.0, 0.15, 1.0 - f);
      float edgeMix = 1.0 - w.x * w.y;
      vec4 sampledDiffuseColor = mix(s1, mix(s2, s3, 0.5), edgeMix * 0.6);
      diffuseColor *= sampledDiffuseColor;
    #endif
    `
  )
}

function buildGeos(wallList: Wall[]) {
  return wallList.map((wall) => {
    const dx = wall.end[0] - wall.start[0]
    const dz = wall.end[1] - wall.start[1]
    const length = Math.sqrt(dx * dx + dz * dz)
    const isH = Math.abs(dz) < 0.001
    const specifiedH = wall.height ?? WALL_HEIGHT
    const bY = wall.bottomY ?? -0.03
    const h = wall.bottomY !== undefined ? specifiedH : specifiedH + 0.03
    const t = wall.thickness

    const sizeX = isH ? length : t
    const sizeZ = isH ? t : length
    const g = new THREE.BoxGeometry(sizeX, h, sizeZ)

    const repeatX = length / 2
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    for (let vi = 0; vi < uv.count; vi++) {
      const faceIdx = Math.floor(vi / 4)
      if (isH && (faceIdx === 4 || faceIdx === 5)) {
        uv.setX(vi, uv.getX(vi) * repeatX)
      } else if (!isH && (faceIdx === 0 || faceIdx === 1)) {
        uv.setX(vi, uv.getX(vi) * repeatX)
      }
    }

    g.translate(
      wall.start[0] + dx / 2,
      bY + h / 2,
      wall.start[1] + dz / 2,
    )
    return g
  })
}

export function Walls() {
  const silkTex = useKTX2('/textures/silk.ktx2')
  const bathWallTex = useKTX2('/textures/bathroom-wall-tile.ktx2')
  const stuccoTex = useKTX2('/textures/stucco-wall.ktx2')

  const { mergedNormal, normalMat, mergedBath, bathMat, mergedBalcony, balconyMat } = useMemo(() => {
    const normalWalls = walls.filter(w => !w.tile && !w.isBalcony)
    const bathTileWalls = walls.filter(w => w.tile === 'bathWall')
    const balconyWalls = walls.filter(w => w.isBalcony)

    const normalGeos = buildGeos(normalWalls)
    const mergedNormal = mergeGeometries(normalGeos, false)
    normalGeos.forEach(g => g.dispose())

    const silkTexClone = silkTex.clone()
    silkTexClone.wrapS = THREE.RepeatWrapping
    silkTexClone.wrapT = THREE.ClampToEdgeWrapping
    silkTexClone.repeat.set(1, 1)
    silkTexClone.colorSpace = THREE.SRGBColorSpace
    const normalMat = new THREE.MeshStandardMaterial({ map: silkTexClone, roughness: 0.55, metalness: 0 })

    let mergedBath: THREE.BufferGeometry | null = null
    let bathMat: THREE.MeshStandardMaterial | null = null
    if (bathTileWalls.length > 0) {
      const bathGeos = buildGeos(bathTileWalls)
      mergedBath = mergeGeometries(bathGeos, false)
      bathGeos.forEach(g => g.dispose())
      const bTex = bathWallTex.clone()
      bTex.wrapS = THREE.RepeatWrapping
      bTex.wrapT = THREE.RepeatWrapping
      bTex.repeat.set(1, 1)
      bTex.colorSpace = THREE.SRGBColorSpace
      bathMat = new THREE.MeshStandardMaterial({ map: bTex, roughness: 0.15, metalness: 0.05 })
    }

    let mergedBalcony: THREE.BufferGeometry | null = null
    let balconyMat: THREE.MeshStandardMaterial | null = null
    if (balconyWalls.length > 0) {
      const balconyGeos = buildGeos(balconyWalls)
      mergedBalcony = mergeGeometries(balconyGeos, false)
      balconyGeos.forEach(g => g.dispose())
      const sTex = stuccoTex.clone()
      sTex.wrapS = THREE.RepeatWrapping
      sTex.wrapT = THREE.RepeatWrapping
      sTex.repeat.set(5, 5)
      sTex.colorSpace = THREE.SRGBColorSpace
      balconyMat = new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.85, metalness: 0 })
      balconyMat.onBeforeCompile = stuccoPatch
    }

    return { mergedNormal, normalMat, mergedBath, bathMat, mergedBalcony, balconyMat }
  }, [silkTex, bathWallTex, stuccoTex])

  if (!mergedNormal) return null

  return (
    <>
      <mesh geometry={mergedNormal} material={normalMat} castShadow receiveShadow />
      {mergedBath && bathMat && (
        <mesh geometry={mergedBath} material={bathMat} castShadow receiveShadow />
      )}
      {mergedBalcony && balconyMat && (
        <mesh geometry={mergedBalcony} material={balconyMat} castShadow receiveShadow />
      )}
    </>
  )
}
