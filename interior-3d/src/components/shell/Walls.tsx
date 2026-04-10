/**
 * 모든 벽체 일괄 렌더 — walls[] 데이터 + 실크 벽지 텍스처.
 * 벽별 UV repeat 을 geometry 에 bake 한 뒤 mergeGeometries 로 단일 draw call.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { walls, WALL_HEIGHT } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'

export function Walls() {
  const silkTex = useKTX2('/textures/silk.ktx2')

  const { mergedGeo, material } = useMemo(() => {
    const geos = walls.map((wall) => {
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

      // UV bake: 벽지 repeat = (length / 2, 1) 을 UV 좌표에 직접 적용
      // BoxGeometry face 순서 (각 4 vertices):
      //   0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
      const repeatX = length / 2
      const uv = g.getAttribute('uv') as THREE.BufferAttribute
      for (let vi = 0; vi < uv.count; vi++) {
        const faceIdx = Math.floor(vi / 4)
        // 가로벽(isH): +Z/-Z 면(4,5)이 큰 면 → U 축 스케일
        // 세로벽(!isH): +X/-X 면(0,1)이 큰 면 → U 축 스케일
        if (isH && (faceIdx === 4 || faceIdx === 5)) {
          uv.setX(vi, uv.getX(vi) * repeatX)
        } else if (!isH && (faceIdx === 0 || faceIdx === 1)) {
          uv.setX(vi, uv.getX(vi) * repeatX)
        }
        // 나머지 면(얇은 면, 상하면)은 1:1 유지 — 어차피 거의 안 보임
      }

      g.translate(
        wall.start[0] + dx / 2,
        bY + h / 2,
        wall.start[1] + dz / 2,
      )
      return g
    })

    const merged = mergeGeometries(geos, false)
    geos.forEach(g => g.dispose())

    const tex = silkTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.repeat.set(1, 1) // UV에 이미 bake
    tex.colorSpace = THREE.SRGBColorSpace

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.55,
      metalness: 0,
    })

    return { mergedGeo: merged, material: mat }
  }, [silkTex])

  if (!mergedGeo) return null

  return <mesh geometry={mergedGeo} material={material} />
}
