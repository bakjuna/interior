/**
 * 작업실 베란다 — 작업실 외측 베란다.
 * 4단 유리 선반 + 최상단 매트 블랙 판 (1000×1750×360mm) — 가운데 배치.
 * 천장 다운라이트 1개 (항상 켜짐).
 */

import { memo, useMemo } from 'react'
import * as THREE from 'three'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  babyRightWallX,
  right1Z,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface WorkVerandaProps {
  visible: boolean
}

export const WorkVeranda = memo(function WorkVeranda({ visible }: WorkVerandaProps) {
  // 벽 중심: 서쪽 = babyRightWallX + 2.500, 동쪽 = babyRightWallX + 2.500 + 2.673.
  // 내측면은 중심에서 T2 안쪽.
  const minX = babyRightWallX + 2.500 + T2
  const maxX = babyRightWallX + 2.500 + 2.673 - T2
  const minZ = right1Z - 0.770 + 0.795 + T2
  const maxZ = right1Z - 0.770 + 0.795 + 1.418 - T2
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2

  // 선반 90° 회전 후: 1000mm → world Z, 360mm → world X.
  // 남쪽 벽(maxZ) 밀착 → 선반 Z 중심 = maxZ - 500mm, X 중심은 좌/우 끝에서 180mm.
  const shelfW = 1.000
  const shelfD = 0.360
  const shelfZCenter = maxZ - shelfW / 2
  const leftShelfX = minX + shelfD / 2
  const rightShelfX = maxX - shelfD / 2

  return (
    <>
      <pointLight position={[cx, WALL_HEIGHT - 0.02, cz]} intensity={2.0} distance={WALL_HEIGHT * 2} decay={2} color="#ffe0b0" />
      <group visible={visible}>
        {/* 4단 유리 선반 — 좌/우 끝 남쪽 벽 밀착, 90° 회전 */}
        <IronGlassShelf position={[leftShelfX, 0, shelfZCenter]} rotation={Math.PI / 2} />
        <IronGlassShelf position={[rightShelfX, 0, shelfZCenter]} rotation={Math.PI / 2} />
      </group>
    </>
  )
})

/**
 * 1000 W × 1750 H × 360 D mm 철제 유리 선반.
 * - 판 4개 (바닥에서 120/530/940/1350mm, 판 하단 기준) 모두 유리, 각 20×20mm 매트 블랙 테두리.
 * - 최상단 매트 블랙 판 1개 (Y=1730mm, 포스트 상단 flush).
 * - 기둥 6개 (4 모서리 + 1000 사이드 중앙), 20×20mm 매트 블랙.
 * - 앞/뒤 모두 open.
 */
function IronGlassShelf({
  position,
  rotation = 0,
}: {
  position: [number, number, number]
  rotation?: number
}) {
  const W = 1.000
  const H = 1.750
  const D = 0.360
  const panelT = 0.020
  const postT = 0.020
  const frameT = 0.020  // 유리 테두리 단면 20×20mm

  // 매트 블랙 — 기둥/테두리/최상단 판 공유
  const blackMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.95, metalness: 0.08 }),
    [],
  )

  // 기둥 6개 — 4 모서리 + 1000 사이드(X축) 중앙 2개
  const postPositions: Array<[number, number]> = [
    [-W / 2 + postT / 2, -D / 2 + postT / 2],
    [-W / 2 + postT / 2,  D / 2 - postT / 2],
    [ W / 2 - postT / 2, -D / 2 + postT / 2],
    [ W / 2 - postT / 2,  D / 2 - postT / 2],
    [0, -D / 2 + postT / 2],
    [0,  D / 2 - postT / 2],
  ]

  // 유리 판 4개 — 바닥에서 120/530/940/1350mm (판 하단)
  const glassBotYs = [0.120, 0.530, 0.940, 1.350]
  // 최상단 블랙 판 — 포스트 상단 flush (Y bottom = H - panelT)
  const topBotY = H - panelT  // 1.730

  // 유리 내부 치수 (테두리 20mm 제외)
  const gW = W - frameT * 2   // 0.960
  const gD = D - frameT * 2   // 0.320

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* 기둥 */}
      {postPositions.map(([px, pz], i) => (
        <mesh key={`post-${i}`} position={[px, H / 2, pz]} material={blackMat}>
          <boxGeometry args={[postT, H, postT]} />
        </mesh>
      ))}

      {/* 유리 판 4개 — 내부 유리 + 4방향 검정 테두리 */}
      {glassBotYs.map((ybot, i) => {
        const cy = ybot + panelT / 2
        return (
          <group key={`glass-${i}`}>
            {/* 유리 내부 */}
            <mesh position={[0, cy, 0]}>
              <boxGeometry args={[gW, panelT, gD]} />
              <meshPhysicalMaterial
                color="#dceaef"
                roughness={0.05}
                metalness={0}
                transmission={0.85}
                thickness={0.02}
                ior={1.5}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 테두리 — 앞/뒤 (X축 방향 전폭) */}
            <mesh position={[0, cy, -D / 2 + frameT / 2]} material={blackMat}>
              <boxGeometry args={[W, frameT, frameT]} />
            </mesh>
            <mesh position={[0, cy, D / 2 - frameT / 2]} material={blackMat}>
              <boxGeometry args={[W, frameT, frameT]} />
            </mesh>
            {/* 테두리 — 좌/우 (Z축 방향, 앞/뒤 테두리 사이 길이) */}
            <mesh position={[-W / 2 + frameT / 2, cy, 0]} material={blackMat}>
              <boxGeometry args={[frameT, frameT, gD]} />
            </mesh>
            <mesh position={[W / 2 - frameT / 2, cy, 0]} material={blackMat}>
              <boxGeometry args={[frameT, frameT, gD]} />
            </mesh>
          </group>
        )
      })}

      {/* 최상단 새까만 판 — 포스트 상단 flush */}
      <mesh position={[0, topBotY + panelT / 2, 0]} material={blackMat}>
        <boxGeometry args={[W, panelT, D]} />
      </mesh>
    </group>
  )
}
