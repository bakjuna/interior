/**
 * 작업실 — 우측벽 기준 트레슬 책상 2개 (1200/1800).
 * 천장 단내림 + 코브 LED는 shell/Ceilings.tsx 가 처리.
 */

import { TrestleDesk } from '../models/TrestleDesk'
import { LR_W, right1Z } from '../../data/apartment'

interface WorkRoomProps {
  visible: boolean
}

export function WorkRoom({ visible }: WorkRoomProps) {
  if (!visible) return null

  const workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1
  const wallGap = 0.020
  const deskDepth = 0.720
  const gapBetween = 0.100
  const cx = LR_W - deskDepth / 2 - wallGap
  const w1 = 1.200
  const z1 = workTopZ + wallGap + w1 / 2
  const cx1 = cx - 0.140
  const w2 = 1.800
  const z2 = z1 + w1 / 2 + gapBetween + w2 / 2

  return (
    <>
      <TrestleDesk position={[cx1, z1]} rotationY={Math.PI / 2} width={w1} />
      <TrestleDesk position={[cx, z2]} rotationY={Math.PI / 2} width={w2} />
    </>
  )
}
