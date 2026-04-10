/**
 * 작업실 베란다 — 작업실 외측 베란다.
 * 내부 가구 없음. 천장 다운라이트 1개 (항상 켜짐).
 */

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
  const x = (babyRight + 0.2 + 2.500 + T2 + babyRight + 0.2 + 2.500 + 2.673 - T2) / 2
  const z = (right1Z - 0.770 + 0.795 + T2 + right1Z - 0.770 + 0.795 + 1.418 - T2) / 2
  return (
    <>
      <pointLight position={[x, WALL_HEIGHT - 0.02, z]} intensity={2.0} distance={WALL_HEIGHT * 2} decay={2} color="#ffe0b0" />
      <group visible={visible} />
    </>
  )
}
