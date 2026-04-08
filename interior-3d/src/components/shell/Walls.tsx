/**
 * 모든 벽체 일괄 렌더 — walls[] 데이터 그대로.
 * 실크 벽지 텍스처를 한 번 로드해서 벽마다 clone (가로 반복).
 * 방별로 분리하지 않음 — 공유벽 owner 모호 + merging 효과 분산 방지.
 */

import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { walls, WALL_HEIGHT } from '../../data/apartment'

export function Walls() {
  const silkTex = useLoader(TextureLoader, '/textures/silk.png')

  return (
    <>
      {walls.map((wall, i) => {
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

        return (
          <mesh
            key={i}
            position={[
              wall.start[0] + dx / 2,
              bY + h / 2,
              wall.start[1] + dz / 2,
            ]}
          >
            <boxGeometry args={[isH ? length : t, h, isH ? t : length]} />
            <meshStandardMaterial
              map={silk}
              roughness={0.55}
              metalness={0}
            />
          </mesh>
        )
      })}
    </>
  )
}
