/**
 * 4도어 냉장고 — 920×1800×915mm (D×H×W).
 * 본체 호두 마감 + 4문 베이지 + 상하 분할선. -X 방향 정면.
 *
 * position: [centerX, 0, centerZ] (바닥 기준)
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'

interface RefrigeratorProps {
  position: [number, number]  // [centerX, centerZ]
}

const W = 0.915
const D = 0.920
const H = 1.800

export function Refrigerator({ position }: RefrigeratorProps) {
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')
  const walnutBodyTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  const [cx, cz] = position
  const frontFace = cx - D / 2  // -X 정면

  return (
    <group>
      {/* 본체 — 호두 마감 (도어 갭 사이로 보임) */}
      <mesh position={[cx, H / 2, cz]}>
        <boxGeometry args={[D, H, W]} />
        <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
      </mesh>
      {/* 상단 좌문 */}
      <mesh position={[frontFace - 0.001, H * 0.75, cz - W / 4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W / 2 - 0.005, H / 2 - 0.02]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 상단 우문 */}
      <mesh position={[frontFace - 0.001, H * 0.75, cz + W / 4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W / 2 - 0.005, H / 2 - 0.02]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 하단 좌문 */}
      <mesh position={[frontFace - 0.001, H * 0.25, cz - W / 4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W / 2 - 0.005, H / 2 - 0.02]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 하단 우문 */}
      <mesh position={[frontFace - 0.001, H * 0.25, cz + W / 4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W / 2 - 0.005, H / 2 - 0.02]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 분할선 (상하 구분) */}
      <mesh position={[frontFace - 0.002, H * 0.5, cz]}>
        <boxGeometry args={[0.005, 0.01, W]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>
    </group>
  )
}

Refrigerator.W = W
Refrigerator.D = D
Refrigerator.H = H
