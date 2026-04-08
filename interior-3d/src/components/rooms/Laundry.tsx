/**
 * 세탁실 — L자형 (3-box). LG WashTower + 천장 다운라이트.
 */

import { DropCeilingLight } from '../primitives/DropCeilingLight'
import { WashTower } from '../models/WashTower'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  stair2X,
  stair3Z,
  laundryBotZ,
  rightWallX,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface LaundryProps {
  visible: boolean
}

export function Laundry({ visible }: LaundryProps) {
  if (!visible) return null

  // 다운라이트 — 세탁실 가운데 (항상 켜짐)
  const lightX = (stair2X + T2 + rightWallX - T2) / 2
  const lightZ = (Math.min(stair3Z + T2, laundryBotZ - T2) + Math.max(stair3Z + T2, laundryBotZ - T2)) / 2

  // WashTower — 서쪽 끝 벽 부착, 동쪽 정면
  const D = 0.80
  const wtX = stair2X + T2 + D / 2
  const wtZ = (Math.min(stair3Z + T2, laundryBotZ - T2) + Math.max(stair3Z + T2, laundryBotZ - T2)) / 2

  return (
    <group>
      <DropCeilingLight x={lightX} z={lightZ} ceilingY={WALL_HEIGHT} active={true} />
      <WashTower position={[wtX, 0, wtZ]} rotation={Math.PI / 2} />
    </group>
  )
}
