/**
 * 복도 — 거실/현관 사이 통로.
 * 복도/거실 공유벽 (800mm) 하단 LED 간접조명만 보유.
 *
 * 활성 영역: 복도 + 현관 + 거실 (3방 모두).
 */

import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  LR_W,
  LR_D,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface HallwayProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
}

export function Hallway({ visible, playerPos, allLightsOn }: HallwayProps) {
  const wallStartX = LR_W - 1.481 - 0.800
  const wallEndX = LR_W - 1.481
  const wallZ = -T2
  const wallLen = wallEndX - wallStartX
  const wallCenterX = (wallStartX + wallEndX) / 2

  // void unused refs to keep eslint happy if WALL_HEIGHT 추후 사용
  void WALL_HEIGHT

  const isActive = !!allLightsOn || (playerPos ? (
    (playerPos[0] >= -1.2 && playerPos[0] <= LR_W - 1.481 &&
      playerPos[1] >= Math.min(-WALL_THICKNESS, -T2 - 1.591 + T2) && playerPos[1] <= Math.max(-WALL_THICKNESS, -T2 - 1.591 + T2)) ||
    (playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
      playerPos[1] >= Math.min(-WALL_THICKNESS, -T2 - 1.591 + T2) && playerPos[1] <= Math.max(-WALL_THICKNESS, -T2 - 1.591 + T2)) ||
    (playerPos[0] >= 0 && playerPos[0] <= LR_W && playerPos[1] >= 0 && playerPos[1] <= LR_D)
  ) : false)

  return (
    <>
      <rectAreaLight
        position={[wallCenterX, 0.1, wallZ]}
        width={wallLen}
        height={WALL_THICKNESS}
        intensity={isActive ? 30 : 0}
        color="#ffe0b0"
        rotation={[Math.PI / 2, 0, 0]}
      />
      <group visible={visible}>
        <mesh position={[wallCenterX, 0.1, wallZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[wallLen, WALL_THICKNESS]} />
          <meshStandardMaterial
            color={isActive ? '#fff' : '#444'}
            emissive={isActive ? '#ffe0b0' : '#111'}
            emissiveIntensity={isActive ? 3.0 : 0.1}
          />
        </mesh>
      </group>
    </>
  )
}
