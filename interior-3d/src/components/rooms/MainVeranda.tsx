/**
 * 메인베란다 — 거실/안방 외측 베란다.
 * 내부 가구 없음. 천장 다운라이트 2개 (항상 켜짐).
 */

import { DropCeilingLight } from '../primitives/DropCeilingLight'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  LR_W,
  LR_D,
  MB_W,
  verandaInnerD,
} from '../../data/apartment'

const mbLeft = -WALL_THICKNESS - MB_W

interface MainVerandaProps {
  visible: boolean
}

export function MainVeranda({ visible }: MainVerandaProps) {
  if (!visible) return null
  const z = LR_D + WALL_THICKNESS + verandaInnerD / 2
  return (
    <group>
      <DropCeilingLight x={mbLeft + 2.110} z={z} ceilingY={WALL_HEIGHT} active={true} />
      <DropCeilingLight x={LR_W - 2.000} z={z} ceilingY={WALL_HEIGHT} active={true} />
    </group>
  )
}
