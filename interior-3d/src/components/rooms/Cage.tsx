/**
 * 새장 — 메인베란다 좌측, 50mm 가벽으로 분리 (1340mm 너비).
 * 가벽 (50mm, 도어 갭 있음, 상인방)만 — 도어는 shell/Doors.tsx에서 처리.
 */

import { memo } from 'react'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  LR_D,
  MB_W,
} from '../../data/apartment'

const mbLeft = -WALL_THICKNESS - MB_W

interface CageProps {
  /** 가벽(파티션) 가시성 — mainVeranda 또는 cage 중 하나라도 visible이면 true.
   *  Cage는 내부 컨텐츠가 없으므로 wallVisible 단일 prop만 사용. */
  wallVisible: boolean
}

export const Cage = memo(function Cage({ wallVisible }: CageProps) {
  if (!wallVisible) return null

  const pX = mbLeft + 1.340
  const vTopZ = LR_D + WALL_THICKNESS
  const vBotZ = vTopZ + 1.308
  const doorCZ = (vTopZ + vBotZ) / 2
  const topSegLen = (doorCZ - 0.45) - vTopZ
  const botSegLen = vBotZ - (doorCZ + 0.45)

  return (
    <group>
      {/* 가벽 상단 */}
      <mesh position={[pX, WALL_HEIGHT / 2, vTopZ + topSegLen / 2]}>
        <boxGeometry args={[0.05, WALL_HEIGHT, topSegLen]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>
      {/* 가벽 하단 */}
      <mesh position={[pX, WALL_HEIGHT / 2, vBotZ - botSegLen / 2]}>
        <boxGeometry args={[0.05, WALL_HEIGHT, botSegLen]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>
      {/* 상인방 (문 위 100mm) */}
      <mesh position={[pX, WALL_HEIGHT - 0.05, doorCZ]}>
        <boxGeometry args={[0.05, 0.1, 0.9]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>
    </group>
  )
})
