/**
 * 현관 — 4칸 신발장 (1칸 거울 도어 + 3칸 일반 도어).
 * 활성 영역: 현관 (xLeft~LR_W+T2, -T2-1.591~-T2)
 */

import { ShoeCabinet } from '../models/ShoeCabinet'
import { LR_W, WALL_THICKNESS } from '../../data/apartment'
import type { DoorId } from '../../data/sectors'

const T2 = WALL_THICKNESS / 2

interface EntranceProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
  activeDoorId?: DoorId | null
}

export function Entrance({ visible, playerPos, allLightsOn, activeDoorId }: EntranceProps) {
  const isActive = !!allLightsOn || (playerPos ? (
    playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
    playerPos[1] >= -T2 - 1.591 && playerPos[1] <= -T2
  ) : false)

  return <group visible={visible}><ShoeCabinet active={isActive} activeDoorId={activeDoorId} playerPos={playerPos} /></group>
}
