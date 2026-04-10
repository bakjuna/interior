/**
 * 메인베란다 — 거실/안방 외측 베란다.
 * 내부 가구 없음. 천장 다운라이트 2개 (항상 켜짐).
 */

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
  const z = LR_D + WALL_THICKNESS + verandaInnerD / 2
  return (
    <>
      <pointLight position={[mbLeft + 2.110, WALL_HEIGHT - 0.02, z]} intensity={2.0} distance={WALL_HEIGHT * 2} decay={2} color="#ffe0b0" />
      <pointLight position={[LR_W - 2.000, WALL_HEIGHT - 0.02, z]} intensity={2.0} distance={WALL_HEIGHT * 2} decay={2} color="#ffe0b0" />
      <group visible={visible} />
    </>
  )
}
