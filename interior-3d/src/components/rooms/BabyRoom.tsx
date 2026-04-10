/**
 * 아기방 — ToddlerBed (1115×2065mm) 만 배치.
 * 천장 단내림 + 코브 LED는 shell/Ceilings.tsx 가 처리.
 * 천장 다운라이트는 ApartmentModel의 downlights 그룹이 처리 (Phase 6에서 이전).
 */

import { ToddlerBed } from '../models/ToddlerBed'
import { babyRight, babyTop } from '../../data/apartment'

interface BabyRoomProps {
  visible: boolean
}

export function BabyRoom({ visible }: BabyRoomProps) {
  return (
    <group visible={visible}>
      <ToddlerBed
      position={[
        babyRight - 2.065 / 2,
        babyTop + 1.115 / 2,
      ]}
        rotationY={0}
      />
    </group>
  )
}
