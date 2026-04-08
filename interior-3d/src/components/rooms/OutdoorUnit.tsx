/**
 * 실외기실 — 메인베란다 우측, 50mm 가벽으로 분리.
 * 가벽 (50mm, 도어 갭 있음, 상인방) + 에어컨 실외기 (900×800×350mm).
 *
 * 도어는 shell/Doors.tsx 에서 렌더되므로 여기는 가벽 + AC만.
 */

import * as THREE from 'three'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  LR_W,
  LR_D,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface OutdoorUnitProps {
  /** 가벽(파티션) 가시성 — mainVeranda 또는 outdoor 중 하나라도 visible이면 true */
  wallVisible: boolean
  /** 실외기실 내부 컨텐츠(에어컨 본체 등) 가시성 — outdoor sector visible일 때만 */
  contentsVisible: boolean
}

export function OutdoorUnit({ wallVisible, contentsVisible }: OutdoorUnitProps) {
  if (!wallVisible && !contentsVisible) return null

  const pX = 0.870 + 2.000  // 가벽 X (거실 창문 우측)
  const vTopZ = LR_D + WALL_THICKNESS
  const vBotZ = vTopZ + 1.308
  const doorCZ = (vTopZ + vBotZ) / 2
  const topSegLen = (doorCZ - 0.45) - vTopZ
  const botSegLen = vBotZ - (doorCZ + 0.45)

  const acX = (pX + LR_W + T2) / 2
  const acZ = (vTopZ + vBotZ) / 2

  return (
    <group>
      {wallVisible && (
        <>
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
        </>
      )}

      {contentsVisible && (
        <>
          {/* 에어컨 실외기 본체 */}
          <mesh position={[acX, 0.4, acZ]}>
            <boxGeometry args={[0.9, 0.8, 0.35]} />
            <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.4} />
          </mesh>
          {/* 실외기 바깥쪽 검정 원형 구멍 */}
          <mesh position={[acX, 0.4, acZ + 0.176]}>
            <circleGeometry args={[0.25, 24]} />
            <meshStandardMaterial color="#111" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[acX, 0.4, acZ + 0.177]}>
            <ringGeometry args={[0.22, 0.25, 24]} />
            <meshStandardMaterial color="#333" metalness={0.4} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  )
}
