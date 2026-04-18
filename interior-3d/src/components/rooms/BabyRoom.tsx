/**
 * 아기방 — ToddlerBed (1115×2065mm) + 상단벽 창문 원목 블라인드.
 * 천장 단내림 + 코브 LED는 shell/Ceilings.tsx 가 처리.
 * 천장 다운라이트는 ApartmentModel의 downlights 그룹이 처리 (Phase 6에서 이전).
 */

import { ToddlerBed } from '../models/ToddlerBed'
import { WoodBlind } from '../shell/WoodBlind'
import { babyRight, babyTop, babyTopWallZ, babyLeft, WALL_HEIGHT } from '../../data/apartment'
import type { DoorId } from '../../data/sectors'

interface BabyRoomProps {
  visible: boolean
  activeDoorId?: DoorId | null
}

export function BabyRoom({ visible, activeDoorId }: BabyRoomProps) {
  return (
    <group visible={visible}>
      <ToddlerBed
      position={[
        babyRight - 2.065 / 2,
        babyTop + 1.115 / 2,
      ]}
        rotationY={0}
      />

      {/* 상단벽 창문 원목 블라인드 — 1996×710, sill 1040, top 1750
          최대 길이 = 창문 아래 300mm (y=0.740m) 까지.
          헤드레일 상단을 천장 단내림(Y=WALL_HEIGHT-0.15=2.05m) 바닥에 flush. */}
      <WoodBlind
        doorId="baby-blind"
        windowCenterX={babyLeft + 0.486 + 0.998}
        windowCenterZ={babyTopWallZ}
        windowAxis="x"
        windowWidth={1.996}
        windowTop={1.750}
        topY={WALL_HEIGHT - 0.18}   // headRail 두께 30mm 포함해서 소핏 바닥에 딱 붙음
        botY={0.740}
        roomSide={1}
        activeDoorId={activeDoorId}
      />
    </group>
  )
}
