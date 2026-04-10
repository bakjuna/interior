/**
 * 현관 — 4칸 신발장 (3칸 도어 + 1칸 전신거울).
 * 활성 영역: 현관 (xLeft~LR_W+T2, -T2-1.591~-T2)
 */

import { ShoeCabinet } from '../models/ShoeCabinet'
import { LR_W, WALL_THICKNESS } from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface EntranceProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
}

export function Entrance({ visible, playerPos, allLightsOn }: EntranceProps) {
  const isActive = !!allLightsOn || (playerPos ? (
    playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
    playerPos[1] >= -T2 - 1.591 && playerPos[1] <= -T2
  ) : false)

  return <group visible={visible}><ShoeCabinet active={isActive} /></group>
}
