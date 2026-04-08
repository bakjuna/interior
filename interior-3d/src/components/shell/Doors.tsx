/**
 * 모든 도어 인스턴스 — 9개 internal door + 1개 external (현관문) + 중문 (3-piece)
 *
 * doorId 매핑: 9개 도어 각각 고유 DoorId 보유 → 부모(WalkthroughView)가 lift된 상태로 사용.
 * 현관문은 외부 출입이라 portal/visibility 대상이 아니므로 doorId 없음.
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { FlushDoor } from '../models/FlushDoor'
import { JungmunSwingDoor, JungmunFixedPanel } from '../models/JungmunDoor'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  LR_W,
  LR_D,
  MB_W,
  mbDoorHinge,
  mbDoorEnd,
  bath2RightWallX,
  babyBottom,
  babyRightWallX,
  babyTopWallZ,
} from '../../data/apartment'
import type { DoorId } from '../../data/sectors'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

interface DoorsProps {
  activeDoorId?: DoorId | null
  onDoorOpenChange?: (id: DoorId, open: boolean) => void
}

export function Doors({ activeDoorId, onDoorOpenChange }: DoorsProps) {
  const walnutDoorTex = useLoader(TextureLoader, '/textures/walnut_door.png')

  // 안정화된 콜백 맵 — 각 도어 인스턴스마다 고정된 callback 참조 보장
  const handlers = useMemo(() => {
    const m: Record<DoorId, (open: boolean) => void> = {} as any
    const ids: DoorId[] = [
      'mb-hall',
      'mb-mbBath',
      'mainBath-hall',
      'baby-hall',
      'laundry-kitchen',
      'work-hall',
      'jungmun',
      'cage-mainVeranda',
      'outdoor-mainVeranda',
    ]
    for (const id of ids) {
      m[id] = (open: boolean) => onDoorOpenChange?.(id, open)
    }
    return m
  }, [onDoorOpenChange])

  // === 중문 (현관 ↔ 복도) — 3-piece (스윙 + 고정 + 헤더) ===
  const jungX = LR_W - 1.481
  const zSouth = -T2 - T2
  const zNorth = -T2 - 1.591 + T2
  const totalW = zSouth - zNorth
  const swingW = 0.900
  const fixedW = totalW - swingW
  const doorH = 2.000
  const doorT = 0.040
  const borderR = 0.100
  const topBottomFrame = 0.120
  const panelColor = '#fafaf8'
  const glassColor = '#e6ebef'
  const swingHingeZ = zNorth + swingW
  const swingFreeEndZ = zNorth
  const fixedCenterZ = zSouth - fixedW / 2

  return (
    <group>
      {/* 안방 출입문 — 안방↔복도, 경첩=동측, 안방 내측(+Z)으로 열림 */}
      <FlushDoor
        position={[-WALL_THICKNESS - 0.45 - 0.009, -T2]}
        axis="x"
        width={0.9}
        height={2.1}
        hinge="right"
        swing="in"
        tex={walnutDoorTex}
        activeDoorId={activeDoorId}
        doorId="mb-hall"
        onOpenChange={handlers['mb-hall']}
      />

      {/* 안방욕실 문 — 경첩=동측, 욕실 내측(-Z)으로 열림 */}
      <FlushDoor
        position={[(mbDoorHinge + mbDoorEnd) / 2, -T2]}
        axis="x"
        width={0.9}
        height={2.1}
        hinge="right"
        swing="out"
        tex={walnutDoorTex}
        activeDoorId={activeDoorId}
        doorId="mb-mbBath"
        onOpenChange={handlers['mb-mbBath']}
      />

      {/* 메인욕실 문 — 경첩=상단(안방쪽), 욕실 내측(-X)으로 열림 */}
      <FlushDoor
        position={[bath2RightWallX, -WALL_THICKNESS - 0.1 - 0.45]}
        axis="z"
        width={0.9}
        height={2.1}
        hinge="left"
        swing="out"
        tex={walnutDoorTex}
        activeDoorId={activeDoorId}
        doorId="mainBath-hall"
        onOpenChange={handlers['mainBath-hall']}
      />

      {/* 아기방 문 — 경첩=상단(안방쪽), 아기방 내측(-X)으로 열림 */}
      <FlushDoor
        position={[bath2RightWallX, babyBottom - 0.22 - 0.45]}
        axis="z"
        width={0.9}
        height={2.1}
        hinge="left"
        swing="out"
        tex={walnutDoorTex}
        activeDoorId={activeDoorId}
        doorId="baby-hall"
        onOpenChange={handlers['baby-hall']}
      />

      {/* 세탁실 문 — 경첩=하단(아기방 상단벽쪽), 세탁실 내측(-X)으로 열림 */}
      <FlushDoor
        position={[babyRightWallX, babyTopWallZ - 0.5595]}
        axis="z"
        width={0.9}
        height={2.1}
        hinge="left"
        swing="out"
        tex={walnutDoorTex}
        activeDoorId={activeDoorId}
        doorId="laundry-kitchen"
        onOpenChange={handlers['laundry-kitchen']}
      />

      {/* 작업실 문 */}
      <FlushDoor
        position={[babyRightWallX + 2.555 - 0.1 + 0.250 + 0.45, -T2 - 1.591]}
        axis="x"
        width={0.9}
        height={2.1}
        hinge="left"
        swing="out"
        tex={walnutDoorTex}
        activeDoorId={activeDoorId}
        doorId="work-hall"
        onOpenChange={handlers['work-hall']}
      />

      {/* 실외기실 문 — 메인베란다↔실외기실 */}
      <FlushDoor
        position={[0.870 + 2.000, LR_D + WALL_THICKNESS + 1.308 / 2]}
        axis="z"
        width={0.9}
        height={2.1}
        hinge="right"
        swing="out"
        wallThickness={0.05}
        color="#e8dcc4"
        activeDoorId={activeDoorId}
        doorId="outdoor-mainVeranda"
        onOpenChange={handlers['outdoor-mainVeranda']}
      />

      {/* 새장 문 — 환기 루버 */}
      <FlushDoor
        position={[mbLeft + 1.340, LR_D + WALL_THICKNESS + 1.308 / 2]}
        axis="z"
        width={0.9}
        height={2.1}
        hinge="right"
        swing="in"
        wallThickness={0.05}
        color="#e8dcc4"
        style="louvered"
        activeDoorId={activeDoorId}
        doorId="cage-mainVeranda"
        onOpenChange={handlers['cage-mainVeranda']}
      />

      {/* 현관문 — 외부, portal 대상은 아니지만 F 인터랙션을 위해 doorId 부여 */}
      <FlushDoor
        position={[LR_W + T2, -T2 - T2 - 0.410 - 0.450]}
        axis="z"
        width={0.9}
        height={2.1}
        hinge="right"
        swing="out"
        color="#e8dcc4"
        handleStyle="smartlock"
        activeDoorId={activeDoorId}
        doorId="entrance"
      />

      {/* === 중문 (현관/복도 경계) === */}
      <group>
        {/* 상단 솔리드 헤더 (도어 위 ~ 천장) */}
        <mesh position={[jungX, (doorH + WALL_HEIGHT) / 2, (zNorth + zSouth) / 2]}>
          <boxGeometry args={[doorT, WALL_HEIGHT - doorH, totalW]} />
          <meshPhysicalMaterial color={panelColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
        </mesh>

        <JungmunFixedPanel
          centerWorld={[jungX, fixedCenterZ]}
          width={fixedW}
          height={doorH}
          thickness={doorT}
          borderR={borderR}
          topBottomFrame={topBottomFrame}
          color={panelColor}
          glassColor="#eef1f3"
        />

        <JungmunSwingDoor
          hingeWorld={[jungX, swingHingeZ]}
          freeEndZ={swingFreeEndZ}
          width={swingW}
          height={doorH}
          thickness={doorT}
          borderR={borderR}
          topBottomFrame={topBottomFrame}
          color={panelColor}
          glassColor={glassColor}
          activeDoorId={activeDoorId}
          doorId="jungmun"
          onOpenChange={handlers['jungmun']}
        />
      </group>
    </group>
  )
}
