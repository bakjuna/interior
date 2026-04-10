/**
 * 작업실 — 우측벽 기준 트레슬 책상 2개 (1200/1800) + 좌측벽 정사각형 cubby 책장.
 * 천장 단내림 + 코브 LED는 shell/Ceilings.tsx 가 처리.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { TrestleDesk } from '../models/TrestleDesk'
import { LR_W, right1Z, WALL_THICKNESS, WALL_HEIGHT, babyRightWallX } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'

const T2 = WALL_THICKNESS / 2

interface WorkRoomProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn?: boolean
}

export function WorkRoom({ visible, playerPos, allLightsOn }: WorkRoomProps) {
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
  const w1 = 1.200
  const z1 = workTopZ + wallGap + w1 / 2
  const cx1 = cx - 0.140
  const w2 = 1.800
  const z2 = z1 + w1 / 2 + gapBetween + w2 / 2

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
      {/* bookshelf spotlight — outside visible group */}
      <pointLight
        position={[LR_W - 0.30, WALL_HEIGHT - 0.02, shelfCenterZ]}
        intensity={workActive ? 6.0 : 0}
        distance={6}
        decay={2}
        color="#ffe0b0"
      />
      <group visible={visible}>
      <TrestleDesk position={[cx1, z1]} rotationY={Math.PI / 2} width={w1} />
      <TrestleDesk position={[cx, z2]} rotationY={Math.PI / 2} width={w2} />

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

      {/* === 책장 비추는 spotLight (동측 천장, 동쪽 벽에서 30cm) — 모양은 다운라이트
           작업실 활성(player 진입 또는 allLightsOn) 시에만 ON */}
      <BookshelfSpotlight
        ceilingY={WALL_HEIGHT}
        spotX={LR_W - 0.30}
        spotZ={shelfCenterZ}
        targetX={shelfCenterX}
        targetY={shelfCenterY}
        targetZ={shelfCenterZ}
        active={workActive}
      />
    </group>
    </>
  )
}

interface BookshelfSpotlightProps {
  ceilingY: number
  spotX: number
  spotZ: number
  targetX: number
  targetY: number
  targetZ: number
  active: boolean
}

function BookshelfSpotlight({ ceilingY, spotX, spotZ, targetX, targetY, targetZ, active }: BookshelfSpotlightProps) {
  const lightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D | null>(null)
  const { scene } = useThree()

  useEffect(() => {
    const target = new THREE.Object3D()
    target.position.set(targetX, targetY, targetZ)
    scene.add(target)
    targetRef.current = target
    return () => { scene.remove(target) }
  }, [scene, targetX, targetY, targetZ])

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [active])

  return (
    <>
      {/* 다운라이트 시각: 천장 발광 원판 + 크롬 링 — 활성 시에만 emissive */}
      <mesh position={[spotX, ceilingY - 0.005, spotZ]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 16]} />
        <meshStandardMaterial
          color={active ? '#fff' : '#888'}
          emissive={active ? '#ffe0b0' : '#222'}
          emissiveIntensity={active ? 1.0 : 0.1}
        />
      </mesh>
      <mesh position={[spotX, ceilingY - 0.006, spotZ]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.035, 0.045, 16]} />
        <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* pointLight moved outside visible group in WorkRoom */}
    </>
  )
}
