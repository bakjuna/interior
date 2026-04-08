/**
 * 모든 벽체 일괄 렌더 — walls[] 데이터 그대로.
 * 실크 벽지 텍스처를 한 번 로드해서 벽마다 clone (가로 반복).
 * 방별로 분리하지 않음 — 공유벽 owner 모호 + merging 효과 분산 방지.
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { walls, WALL_HEIGHT } from '../../data/apartment'

export function Walls() {
  const silkTex = useLoader(TextureLoader, '/textures/silk.png')

  // 벽별 정적 데이터 + 텍스처 — 1번만 계산 (매 렌더마다 clone 방지).
  // 부모(ApartmentModel)가 playerPos 4Hz 로 리렌더되므로 clone × 50 walls 가 초당 200회 발생하던 문제 해결.
  const wallEntries = useMemo(() => {
    return walls.map((wall) => {
      const dx = wall.end[0] - wall.start[0]
      const dz = wall.end[1] - wall.start[1]
      const length = Math.sqrt(dx * dx + dz * dz)
      const isH = Math.abs(dz) < 0.001
      const specifiedH = wall.height ?? WALL_HEIGHT
      const bY = wall.bottomY ?? -0.03
      const h = wall.bottomY !== undefined ? specifiedH : specifiedH + 0.03
      const t = wall.thickness

      const silk = silkTex.clone()
      silk.wrapS = THREE.RepeatWrapping
      silk.wrapT = THREE.ClampToEdgeWrapping
      silk.repeat.set(length / 2, 1)
      silk.colorSpace = THREE.SRGBColorSpace

      return {
        position: [
          wall.start[0] + dx / 2,
          bY + h / 2,
          wall.start[1] + dz / 2,
        ] as [number, number, number],
        size: [isH ? length : t, h, isH ? t : length] as [number, number, number],
        tex: silk,
      }
    })
  }, [silkTex])

  return (
    <>
      {wallEntries.map((w, i) => (
        <mesh key={i} position={w.position}>
          <boxGeometry args={w.size} />
          <meshStandardMaterial
            map={w.tex}
            roughness={0.55}
            metalness={0}
          />
        </mesh>
      ))}
    </>
  )
}
