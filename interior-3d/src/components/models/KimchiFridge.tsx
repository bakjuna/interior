/**
 * 김치냉장고 — 790×1800×810mm (D×H×W). 프렌치도어 (상2문) + 서랍 2단.
 * -X 방향 정면. position: [centerX, 0, centerZ].
 *
 * 단, 일반 냉장고와 같은 frontFace에 정렬되어야 함 → frontFaceX prop으로 받음.
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'

interface KimchiFridgeProps {
  /** 정면 X 좌표 — Refrigerator의 frontFace와 일치시켜야 함 */
  frontFaceX: number
  /** 본체 중심 Z */
  centerZ: number
}

const W = 0.810
const D = 0.790
const H = 1.800

export function KimchiFridge({ frontFaceX, centerZ }: KimchiFridgeProps) {
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')
  const walnutBodyTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  const cx = frontFaceX + D / 2  // 본체 중심 (정면 정렬)
  const topH = H * 0.55
  const midH = H * 0.22
  const botH = H * 0.22

  return (
    <group>
      {/* 본체 — 호두 마감 */}
      <mesh position={[cx, H / 2, centerZ]}>
        <boxGeometry args={[D, H, W]} />
        <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
      </mesh>
      {/* 상단 좌문 */}
      <mesh position={[frontFaceX - 0.001, H - topH / 2 - 0.01, centerZ - W / 4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W / 2 - 0.005, topH - 0.02]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 상단 우문 */}
      <mesh position={[frontFaceX - 0.001, H - topH / 2 - 0.01, centerZ + W / 4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W / 2 - 0.005, topH - 0.02]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 중단 서랍 */}
      <mesh position={[frontFaceX - 0.001, H - topH - midH / 2 - 0.005, centerZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W - 0.01, midH - 0.015]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 하단 서랍 */}
      <mesh position={[frontFaceX - 0.001, botH / 2 + 0.01, centerZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[W - 0.01, botH - 0.015]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 분할선 — 상단/중단 */}
      <mesh position={[frontFaceX - 0.002, H - topH, centerZ]}>
        <boxGeometry args={[0.005, 0.01, W]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>
      {/* 분할선 — 중단/하단 */}
      <mesh position={[frontFaceX - 0.002, H - topH - midH, centerZ]}>
        <boxGeometry args={[0.005, 0.01, W]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>
      {/* 상단 좌우 분할선 */}
      <mesh position={[frontFaceX - 0.002, H - topH / 2, centerZ]}>
        <boxGeometry args={[0.005, topH - 0.02, 0.008]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>
    </group>
  )
}

KimchiFridge.W = W
KimchiFridge.D = D
KimchiFridge.H = H
