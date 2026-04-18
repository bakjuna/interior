/**
 * 메인베란다 — 거실/안방 외측 베란다.
 * 3단 원목 선반 (800W × 300D × 840H) 남측 벽 중앙 배치.
 * 천장 다운라이트 2개 (항상 켜짐).
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  LR_W,
  LR_D,
  MB_W,
  verandaInnerD,
} from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'
import { DoorTooltip, getDoorLabel } from '../ui/DoorTooltip'
import { doorRegistry } from '../../systems/doorRegistry'
import type { DoorId } from '../../data/sectors'

const mbLeft = -WALL_THICKNESS - MB_W

interface MainVerandaProps {
  visible: boolean
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
}

export const MainVeranda = memo(
  function MainVeranda({ visible, activeDoorId, playerPos }: MainVerandaProps) {
  void playerPos
  const z = LR_D + WALL_THICKNESS + verandaInnerD / 2
  // 안방 창문: X=[mbLeft+1.340, mbLeft+3.340], 공유벽 Z=LR_D
  // 베란다 북쪽 내벽 면 Z = LR_D + WALL_THICKNESS (공유벽 남면)
  const northInnerZ = LR_D + WALL_THICKNESS
  const shelfW = 0.800
  const shelfDepth = 0.300
  // 동쪽 끝 = 창문 동단 mbLeft + 3.340 에 상판 동쪽 엣지 맞춤
  const mbWindowEastX = mbLeft + 3.340
  const shelfX = mbWindowEastX - shelfW / 2
  // 북측 벽(공유벽) 밀착
  const shelfZ = northInnerZ + shelfDepth / 2

  // 안방 Bookshelf 와 동일한 오크 텍스처 (400mm/tile 월드 UV)
  const oakBaseTex = useKTX2('/textures/oak-wood.ktx2')
  const oakTex = useMemo(() => {
    const t = oakBaseTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [oakBaseTex])

  return (
    <>
      <pointLight position={[mbLeft + 2.110, WALL_HEIGHT - 0.02, z]} intensity={2.0} distance={WALL_HEIGHT * 2} decay={2} color="#ffe0b0" />
      <pointLight position={[LR_W - 2.000, WALL_HEIGHT - 0.02, z]} intensity={2.0} distance={WALL_HEIGHT * 2} decay={2} color="#ffe0b0" />
      <group visible={visible}>
        {/* 3단 원목 선반 — 안방 창문 아래, 동쪽 끝 맞춤 */}
        <ThreeTierShelf position={[shelfX, 0, shelfZ]} oakTex={oakTex} />
        {/* 철제 4단 선반 + 하단 양개 도어 캐비닛 — 원목 선반 동쪽 옆 밀착 */}
        {(() => {
          const metalW = 0.840
          const metalD = 0.400
          const metalWestEdge = shelfX + 0.400  // 원목 선반 동쪽 엣지 (800mm/2)
          const metalX = metalWestEdge + metalW / 2
          const metalZ = northInnerZ + metalD / 2
          const cabinetEastEdge = metalX + metalW / 2
          // 반띵 유리 선반 (500W × 1750H × 360D, 4발) — cabinet 바로 동쪽
          const glassW = 0.500
          const glassD = 0.360
          const glassX = cabinetEastEdge + 0.005 + glassW / 2   // 5mm 갭
          const glassZ = northInnerZ + glassD / 2                // 북벽 flush
          return (
            <>
              <MetalShelfUnit position={[metalX, 0, metalZ]} activeDoorId={activeDoorId} />
              <IronGlassShelfHalf position={[glassX, 0, glassZ]} />
            </>
          )
        })()}
      </group>
    </>
  )
  },
  (prev, next) => prev.visible === next.visible && prev.activeDoorId === next.activeDoorId,
)

/**
 * BoxGeometry 월드-스케일 UV — 얇은 판에서도 일정한 나뭇결 크기.
 * `tileM` = 텍스처 1 타일이 덮는 월드 미터.
 */
function makeWoodBox(w: number, h: number, d: number, tileM: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.getAttribute('uv') as THREE.BufferAttribute
  const dims: Array<[number, number]> = [
    [d, h], [d, h],
    [w, d], [w, d],
    [w, h], [w, h],
  ]
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f]
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v
      uv.setX(i, uv.getX(i) * (su / tileM))
      uv.setY(i, uv.getY(i) * (sv / tileM))
    }
  }
  uv.needsUpdate = true
  return g
}

/**
 * 철제 4단 선반 + 하단 양개 도어 캐비닛 (840W × 400D × 1900H mm).
 * - 상판 3개 (840×400×5mm 매트 블랙 철판), 캐비닛 위에서 400mm 간격.
 * - 하단 흰색 캐비닛 (840×400×650, 바닥에서 30mm). 양개 도어 + 내부 2단.
 * - 4 모서리에 ㄱ자 철제 다리 (5mm 철판, 각 변 50mm), 바닥 ~ 1900.
 */
function MetalShelfUnit({
  position,
  rotation = 0,
  activeDoorId,
}: {
  position: [number, number, number]
  rotation?: number
  activeDoorId?: DoorId | null
}) {
  const W = 0.840
  const D = 0.400
  const H = 1.900
  const panelT = 0.050      // 상판 두께 50mm
  const cabBotY = 0.030     // 바닥 띄움 30mm
  const cabH = 0.650        // 캐비닛 높이
  const cabTopY = cabBotY + cabH  // 0.680
  const spacing = 0.400     // 상판 간격 (bot-to-bot)
  const cabShrink = 0.004   // 흰색 캐비닛 좌/우 2mm 씩 축소 (z-fighting 방지)

  // 오픈 상판 3개 — 최상단 상판 top 을 포스트 top(H) 에 맞춤.
  // top shelf bot = H - panelT, 그 아래로 spacing 씩.
  const topShelfBotY = H - panelT
  const shelfBotYs = [topShelfBotY - spacing * 2, topShelfBotY - spacing, topShelfBotY]

  // ㄱ자 다리: 5mm 두께 × 50mm 길이
  const postT = 0.005
  const postW = 0.050
  const postSigns: Array<[-1 | 1, -1 | 1]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]]

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* 하단 흰색 양개 캐비닛 — 좌/우 2mm 씩 축소 + 전면 2mm 축소 (L-post z-fighting 방지) */}
      {/* 도어 outer X = 다리 wing 끝(W/2 - postW) */}
      <WhiteCabinet
        W={W - cabShrink}
        D={D - 0.002}
        zOffset={-0.001}
        Y={cabBotY}
        H={cabH}
        doorOuterX={W / 2 - postW}
        doorId="mv-cabinet"
        activeDoorId={activeDoorId}
        worldPosition={position}
      />

      {/* 철제 오픈 상판 */}
      {shelfBotYs.map((ybot, i) => (
        <mesh key={`shelf-${i}`} position={[0, ybot + panelT / 2, 0]}>
          <boxGeometry args={[W, panelT, D]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.95} metalness={0.08} />
        </mesh>
      ))}

      {/* 4 모서리 ㄱ자 철제 다리 — 각 모서리에 2개 평판이 L자 형성 */}
      {postSigns.map(([sx, sz], i) => {
        const p1X = sx * (W / 2 - postT / 2)            // X-face 플레이트 (5mm 두께)
        const p1Z = sz * (D / 2 - postW / 2)            //   길이 50mm (Z 방향)
        const p2X = sx * (W / 2 - postW / 2)            // Z-face 플레이트 (5mm 두께)
        const p2Z = sz * (D / 2 - postT / 2)            //   길이 50mm (X 방향)
        return (
          <group key={`post-${i}`}>
            <mesh position={[p1X, H / 2, p1Z]}>
              <boxGeometry args={[postT, H, postW]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.95} metalness={0.08} />
            </mesh>
            <mesh position={[p2X, H / 2, p2Z]}>
              <boxGeometry args={[postW, H, postT]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.95} metalness={0.08} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/**
 * 흰색 양개 도어 캐비닛 — 내부 2단 (중간 칸막이 1개).
 * 도어는 local +Z (앞)을 향함. 원점은 캐비닛 footprint 중심, 바닥 Y.
 * - `zOffset`: 캐비닛 그룹 Z 보정 (뒷면은 원위치, 전면만 축소 시 사용).
 * - `doorOuterX`: 도어 외측 X 엣지 (기본 W/2, L-post wing 끝 지점 사용 시 W/2 - wing 길이).
 * - `doorId` + `worldPosition` + `activeDoorId`: F 키 인터랙션 (양개 ±90° 스윙).
 */
function WhiteCabinet({
  W, D, Y, H, zOffset = 0, doorOuterX, doorId, worldPosition, activeDoorId,
}: {
  W: number; D: number; Y: number; H: number
  zOffset?: number; doorOuterX?: number
  doorId?: DoorId
  worldPosition?: [number, number, number]
  activeDoorId?: DoorId | null
}) {
  const t = 0.012
  const cy = Y + H / 2
  const whiteColor = '#f5f5f2'
  const centerGap = 0.002
  const doorXEdge = doorOuterX ?? W / 2
  const doorWidth = doorXEdge - centerGap / 2

  const [isOpen, setIsOpen] = useState(false)
  const leftDoorRef = useRef<THREE.Group>(null)
  const rightDoorRef = useRef<THREE.Group>(null)
  const leftAngleRef = useRef(0)
  const rightAngleRef = useRef(0)
  const { invalidate } = useThree()

  const toggleRef = useRef(() => setIsOpen(o => !o))
  toggleRef.current = () => setIsOpen(o => !o)
  useEffect(() => {
    if (!doorId || !worldPosition) return
    doorRegistry.register({
      id: doorId,
      position: [worldPosition[0], worldPosition[2] + (D / 2 - 0.001) + zOffset],
      y: worldPosition[1] + cy,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [doorId])

  const DOOR_ANGLE = Math.PI / 2
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let dirty = false
    // 좌 (sign=-1): 바깥쪽(-X)으로 스윙 = rotation.y = -π/2
    // 우 (sign=+1): 바깥쪽(+X)으로 스윙 = rotation.y = +π/2
    const leftTarget = isOpen ? -DOOR_ANGLE : 0
    const rightTarget = isOpen ? +DOOR_ANGLE : 0
    const lDiff = leftTarget - leftAngleRef.current
    if (Math.abs(lDiff) > 0.001) {
      leftAngleRef.current += lDiff * Math.min(1, delta * 6)
      if (leftDoorRef.current) leftDoorRef.current.rotation.y = leftAngleRef.current
      dirty = true
    }
    const rDiff = rightTarget - rightAngleRef.current
    if (Math.abs(rDiff) > 0.001) {
      rightAngleRef.current += rDiff * Math.min(1, delta * 6)
      if (rightDoorRef.current) rightDoorRef.current.rotation.y = rightAngleRef.current
      dirty = true
    }
    if (dirty) invalidate()
  })

  const isActive = !!doorId && activeDoorId === doorId

  return (
    <group position={[0, cy, zOffset]}>
      {/* 바닥판 */}
      <mesh position={[0, -H / 2 + t / 2, 0]}>
        <boxGeometry args={[W, t, D]} />
        <meshStandardMaterial color={whiteColor} roughness={0.5} />
      </mesh>
      {/* 상판 */}
      <mesh position={[0, H / 2 - t / 2, 0]}>
        <boxGeometry args={[W, t, D]} />
        <meshStandardMaterial color={whiteColor} roughness={0.5} />
      </mesh>
      {/* 좌측판 */}
      <mesh position={[-W / 2 + t / 2, 0, 0]}>
        <boxGeometry args={[t, H - t * 2, D]} />
        <meshStandardMaterial color={whiteColor} roughness={0.5} />
      </mesh>
      {/* 우측판 */}
      <mesh position={[W / 2 - t / 2, 0, 0]}>
        <boxGeometry args={[t, H - t * 2, D]} />
        <meshStandardMaterial color={whiteColor} roughness={0.5} />
      </mesh>
      {/* 뒷판 — local -Z (벽 쪽) */}
      <mesh position={[0, 0, -D / 2 + t / 2]}>
        <boxGeometry args={[W - t * 2, H - t * 2, t]} />
        <meshStandardMaterial color={whiteColor} roughness={0.5} />
      </mesh>
      {/* 내부 중간 칸막이 — 2단 분할 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[W - t * 2, t, D - t * 2]} />
        <meshStandardMaterial color={whiteColor} roughness={0.5} />
      </mesh>
      {/* 양개 도어 — 외측 엣지 힌지, ±90° 스윙 */}
      {([-1, 1] as const).map((sign) => {
        const hingeX = sign * doorXEdge
        const hingeZ = D / 2 - t / 2
        const doorOffsetX = -sign * doorWidth / 2
        const handleX = -sign * (doorWidth - 0.02)  // 안쪽 엣지 근처
        return (
          <group
            key={`door-${sign}`}
            ref={sign < 0 ? leftDoorRef : rightDoorRef}
            position={[hingeX, 0, hingeZ]}
          >
            <mesh position={[doorOffsetX, 0, 0]}>
              <boxGeometry args={[doorWidth, H - t * 2 - 0.004, t]} />
              <meshStandardMaterial color={whiteColor} roughness={0.5} />
            </mesh>
            {/* 손잡이 — 안쪽 엣지 근처, 살짝 앞으로 돌출 */}
            <mesh position={[handleX, 0, t / 2 + 0.004]}>
              <boxGeometry args={[0.006, 0.05, 0.008]} />
              <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        )
      })}
      {/* 툴팁 */}
      {isActive && doorId && (
        <DoorTooltip
          position={[0, H / 2 + 0.08, D / 2 + 0.05]}
          label={getDoorLabel(doorId, isOpen)}
        />
      )}
    </group>
  )
}

/**
 * 3단 원목 선반 (800W × 300D × 840H mm).
 * - 상판 3개 (800×300×10mm), 바닥에서 50mm 부터 390mm 간격.
 * - 측면 다리 2개 (10×300×840mm), 각 상판 양끝에서 150mm 안쪽.
 * - 오크 텍스처 + emissive 0.35 (밝기 +35%).
 */
function ThreeTierShelf({
  position,
  rotation = 0,
  oakTex,
}: {
  position: [number, number, number]
  rotation?: number
  oakTex: THREE.Texture
}) {
  const W = 0.800
  const D = 0.300
  const panelT = 0.010
  const legT = 0.010
  const legInset = 0.150
  const tileM = 0.4

  const shelfBotYs = [0.050, 0.440, 0.830]
  const totalH = shelfBotYs[shelfBotYs.length - 1] + panelT

  const legXs = [-W / 2 + legInset, W / 2 - legInset]

  const shelfGeo = useMemo(() => makeWoodBox(W, panelT, D, tileM), [])
  const legGeo = useMemo(() => makeWoodBox(legT, totalH, D, tileM), [totalH])

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {legXs.map((lx, i) => (
        <mesh key={`leg-${i}`} position={[lx, totalH / 2, 0]} geometry={legGeo}>
          <meshStandardMaterial
            map={oakTex}
            emissiveMap={oakTex}
            emissive="#ffffff"
            emissiveIntensity={0.35}
            roughness={0.7}
          />
        </mesh>
      ))}
      {shelfBotYs.map((ybot, i) => (
        <mesh key={`shelf-${i}`} position={[0, ybot + panelT / 2, 0]} geometry={shelfGeo}>
          <meshStandardMaterial
            map={oakTex}
            emissiveMap={oakTex}
            emissive="#ffffff"
            emissiveIntensity={0.35}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 반띵 철제 유리 선반 — 500W × 1750H × 360D mm, 4발 (4 모서리 기둥만).
 * WorkVeranda 의 6발짜리 IronGlassShelf 를 너비 절반으로 줄이고 중앙 기둥 제거.
 */
function IronGlassShelfHalf({
  position,
  rotation = 0,
}: {
  position: [number, number, number]
  rotation?: number
}) {
  const W = 0.500
  const H = 1.750
  const D = 0.360
  const panelT = 0.020
  const postT = 0.020
  const frameT = 0.020

  const blackMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.95, metalness: 0.08 }),
    [],
  )

  // 4 모서리 기둥만 (중앙 기둥 제거)
  const postPositions: Array<[number, number]> = [
    [-W / 2 + postT / 2, -D / 2 + postT / 2],
    [-W / 2 + postT / 2,  D / 2 - postT / 2],
    [ W / 2 - postT / 2, -D / 2 + postT / 2],
    [ W / 2 - postT / 2,  D / 2 - postT / 2],
  ]

  const glassBotYs = [0.120, 0.530, 0.940, 1.350]
  const topBotY = H - panelT
  const gW = W - frameT * 2
  const gD = D - frameT * 2

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {postPositions.map(([px, pz], i) => (
        <mesh key={`post-${i}`} position={[px, H / 2, pz]} material={blackMat}>
          <boxGeometry args={[postT, H, postT]} />
        </mesh>
      ))}

      {glassBotYs.map((ybot, i) => {
        const cy = ybot + panelT / 2
        return (
          <group key={`glass-${i}`}>
            <mesh position={[0, cy, 0]}>
              <boxGeometry args={[gW, panelT, gD]} />
              <meshPhysicalMaterial
                color="#dceaef"
                roughness={0.05}
                metalness={0}
                transmission={0.85}
                thickness={0.02}
                ior={1.5}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, cy, -D / 2 + frameT / 2]} material={blackMat}>
              <boxGeometry args={[W, frameT, frameT]} />
            </mesh>
            <mesh position={[0, cy, D / 2 - frameT / 2]} material={blackMat}>
              <boxGeometry args={[W, frameT, frameT]} />
            </mesh>
            <mesh position={[-W / 2 + frameT / 2, cy, 0]} material={blackMat}>
              <boxGeometry args={[frameT, frameT, gD]} />
            </mesh>
            <mesh position={[W / 2 - frameT / 2, cy, 0]} material={blackMat}>
              <boxGeometry args={[frameT, frameT, gD]} />
            </mesh>
          </group>
        )
      })}

      <mesh position={[0, topBotY + panelT / 2, 0]} material={blackMat}>
        <boxGeometry args={[W, panelT, D]} />
      </mesh>
    </group>
  )
}
