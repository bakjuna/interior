/**
 * 작업실 — 우측벽 기준 트레슬 책상 2개 (1200/1800) + 좌측벽 정사각형 cubby 책장.
 * 천장 단내림 + 코브 LED는 shell/Ceilings.tsx 가 처리.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { TrestleDesk } from '../models/TrestleDesk'
import { WoodBlind } from '../shell/WoodBlind'
import { LR_W, right1Z, WALL_THICKNESS, babyRightWallX, babyTopWallZ } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'
import type { DoorId } from '../../data/sectors'

const T2 = WALL_THICKNESS / 2

interface WorkRoomProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn?: boolean
  activeDoorId?: DoorId | null
}

export function WorkRoom({ visible, playerPos, allLightsOn, activeDoorId }: WorkRoomProps) {
  const closetDoorTex = useKTX2('/textures/walnut-closet-door.ktx2')
  const walnutTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  // 작업실 활성: playerPos가 작업실 bounds 내 또는 allLightsOn
  const workMinX = babyRightWallX + 2.555 + T2
  const workMaxX = LR_W
  const workMinZ = -T2 - 1.591 - T2 + 0.2     // sectors.ts 와 동일
  const workMaxZ = right1Z - 0.770 + 0.795 + 1.418 + T2 - 0.2
  const workZLo = Math.min(workMinZ, workMaxZ)
  const workZHi = Math.max(workMinZ, workMaxZ)
  const workActive = !!allLightsOn || (!!playerPos &&
    playerPos[0] >= workMinX - 0.1 && playerPos[0] <= workMaxX + 0.1 &&
    playerPos[1] >= workZLo - 0.1 && playerPos[1] <= workZHi + 0.1
  )

  const workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1
  const wallGap = 0.020
  const deskDepth = 0.720
  const gapBetween = 0.100
  const cx = LR_W - deskDepth / 2 - wallGap
  const w1 = 1.540
  const z1 = workTopZ + wallGap + w1 / 2 - 0.005
  const cx1 = cx - 0.140
  const w2 = 1.600
  const z2 = -1.591 - 0.005 - w2 / 2 - 0.205    // 남쪽 벽에서 5mm + 북쪽 205mm

  // === 정사각형 cubby 책장 — 좌측(서쪽) 벽 ===
  // 좌측 벽 X = 작업실 west wall inner = babyRightWallX + 2.555 + T2
  // Z 범위: 문 뒤 950mm (door wall = -T2 - 1.591) ~ 창문쪽 벽 (workTopZ)
  // Y 범위: 0 ~ 1.80m
  const shelfWallX = babyRightWallX + 2.555 + T2
  const shelfDepth = 0.30
  const shelfBackX = shelfWallX                       // 벽 안쪽 면
  const shelfFrontX = shelfBackX + shelfDepth         // 작업실 쪽 면
  const shelfCenterX = (shelfBackX + shelfFrontX) / 2

  const doorWallZ = -T2 - 1.591                       // 작업실 남쪽 벽 (도어 벽)
  const shelfZSouthEnd = doorWallZ - 0.95             // 문 뒤 950mm (남쪽 끝)
  const shelfZNorthEnd = workTopZ                     // 창문(workveranda) 쪽 벽
  const shelfLenZ = Math.abs(shelfZSouthEnd - shelfZNorthEnd)
  const shelfCenterZ = (shelfZSouthEnd + shelfZNorthEnd) / 2

  const shelfH = 1.80
  const shelfBottomY = 0
  const shelfTopY = shelfH
  const shelfCenterY = shelfH / 2

  // 6 행 × 8 열 — 셀 거의 정사각형 (cellH ≈ 0.30, cellW ≈ shelfLenZ/8)
  const rows = 6
  const cols = 8
  const panelT = 0.018
  const cellH = (shelfH - panelT * 2) / rows                    // ≈ 0.294
  const cellW = (shelfLenZ - panelT * 2) / cols                 // ≈ shelfLenZ/8 - small
  const interiorY0 = shelfBottomY + panelT
  const interiorZNorth = shelfZNorthEnd + panelT
  const interiorZSouth = shelfZSouthEnd - panelT

  return (
    <>
      <group visible={visible}>
      <TrestleDesk position={[cx1, z1]} rotationY={Math.PI / 2} width={w1} height={0.740} legColor="#ffffff" hideBraces />
      <TrestleDesk position={[cx1, z2]} rotationY={Math.PI / 2} width={w2} topColor="#1a1a1a" topMap={walnutTex} legColor="#4a4a4d" braceScale={0.5} />

      {/* === 책장 본체 — 전부 호두 마감 (외부/후면/내부 구분 모두) === */}
      <group>
        {/* 후면 (벽 쪽) */}
        <mesh position={[shelfBackX + panelT / 2, shelfCenterY, shelfCenterZ]}>
          <boxGeometry args={[panelT, shelfH, shelfLenZ]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        {/* 상단 */}
        <mesh position={[shelfCenterX, shelfTopY - panelT / 2, shelfCenterZ]}>
          <boxGeometry args={[shelfDepth, panelT, shelfLenZ]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        {/* 하단 */}
        <mesh position={[shelfCenterX, shelfBottomY + panelT / 2, shelfCenterZ]}>
          <boxGeometry args={[shelfDepth, panelT, shelfLenZ]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        {/* 좌측면 (북, 창문쪽) */}
        <mesh position={[shelfCenterX, shelfCenterY, shelfZNorthEnd + panelT / 2]}>
          <boxGeometry args={[shelfDepth, shelfH, panelT]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        {/* 우측면 (남, 도어쪽) */}
        <mesh position={[shelfCenterX, shelfCenterY, shelfZSouthEnd - panelT / 2]}>
          <boxGeometry args={[shelfDepth, shelfH, panelT]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>

        {/* 가로 선반 — divisions 5 (6행) */}
        {Array.from({ length: rows - 1 }).map((_, i) => {
          const dy = interiorY0 + cellH * (i + 1)
          return (
            <mesh key={`shelf-h-${i}`} position={[shelfCenterX, dy, shelfCenterZ]}>
              <boxGeometry args={[shelfDepth - panelT, panelT, shelfLenZ - panelT * 2]} />
              <meshStandardMaterial map={walnutTex} roughness={0.45} />
            </mesh>
          )
        })}

        {/* 세로 칸막이 — divisions 7 (8열) */}
        {Array.from({ length: cols - 1 }).map((_, i) => {
          const dz = interiorZNorth + cellW * (i + 1)
          return (
            <mesh key={`shelf-v-${i}`} position={[shelfCenterX, shelfCenterY, dz]}>
              <boxGeometry args={[shelfDepth - panelT, shelfH - panelT * 2, panelT]} />
              <meshStandardMaterial map={walnutTex} roughness={0.45} />
            </mesh>
          )
        })}
      </group>

      {/* 작업실베란다 창문 원목 블라인드 — 서측은 책장 회피, 동측은 창문 전폭 유지 */}
      {(() => {
        const shelfEastX = shelfBackX + shelfDepth                  // 책장 동쪽 면
        const clearance = 0.02                                      // 책장과 20mm 여유
        const winCX = babyRightWallX + 2.555 + T2 + 0.236 + 0.998   // 창문 센터 X
        const winEastEdge = winCX + 0.998 + 0.04                     // 창문 동쪽 + 40mm 여유
        const blindWestX = shelfEastX + clearance
        const blindWidth = winEastEdge - blindWestX
        const blindCX = (blindWestX + winEastEdge) / 2
        return (
          <WoodBlind
            doorId="work-blind"
            windowCenterX={blindCX}
            windowCenterZ={babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418}
            windowAxis="x"
            windowWidth={blindWidth}
            windowTop={2.000}
            botY={0.800}
            roomSide={1}
            width={blindWidth}
            activeDoorId={activeDoorId}
          />
        )
      })()}

    </group>
    </>
  )
}

