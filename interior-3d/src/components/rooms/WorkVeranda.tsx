/**
 * 작업실 베란다 — 작업실 외측 베란다.
 * 내부 가구 없음. 천장 다운라이트 1개 (항상 켜짐).
 */

import { DropCeilingLight } from '../primitives/DropCeilingLight'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  babyRight,
  right1Z,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface WorkVerandaProps {
  visible: boolean
}

export function WorkVeranda({ visible }: WorkVerandaProps) {
  if (!visible) return null
  const x = (babyRight + 0.2 + 2.500 + T2 + babyRight + 0.2 + 2.500 + 2.673 - T2) / 2
  const z = (right1Z - 0.770 + 0.795 + T2 + right1Z - 0.770 + 0.795 + 1.418 - T2) / 2
  return (
    <DropCeilingLight x={x} z={z} ceilingY={WALL_HEIGHT} active={true} />
  )
}
