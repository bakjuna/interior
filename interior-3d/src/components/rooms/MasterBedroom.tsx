/**
 * 안방 — 가벽 (50mm, 안방욕실 문쪽) + 화장대 (붙박이장 첫 자리, 4면 RectAreaLight 거울) + 침대.
 * 단내림 + 코브 LED는 shell/Ceilings.tsx.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { mirrorState, useMirrorEnabled, makeNonRecursiveReflector } from '../../systems/mirrorToggle'
import { Bed } from '../models/Bed'
import { useKTX2 } from '../../systems/useKTX2'
import { DoorTooltip, getDoorLabel } from '../ui/DoorTooltip'
import { doorRegistry } from '../../systems/doorRegistry'
import { TwoLayerCurtain } from '../shell/TwoLayerCurtain'
import type { DoorId } from '../../data/sectors'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  MB_W,
  LR_D,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

/**
 * 오크 텍스처용 BoxGeometry — UV 를 월드 치수(m) 로 스케일 하여
 * 얇은 막대/패널 에서도 일정한 실제 크기의 나뭇결이 나타나도록.
 * `tileM` = 텍스처 1 타일이 덮는 월드 미터 (ex. 0.4 → 400mm 마다 반복).
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

interface MasterBedroomProps {
  visible: boolean
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
  allLightsOn?: boolean
}

export function MasterBedroom({ visible, activeDoorId, playerPos, allLightsOn }: MasterBedroomProps) {
  const silkTex = useKTX2('/textures/silk.ktx2')
  const closetDoorTex = useKTX2('/textures/walnut-closet-door.ktx2')

  // 안방 가벽 — 북측 900mm 오픈, 본가벽, 남측은 커튼박스까지 오픈
  // 안방 interior Z: 0 (북측 내측면) ~ LR_D (남측 내측면) = 3.666m
  const partOpeningN = 0.9
  const partOpeningS = 1.1  // 본가벽 남단 ~ 남벽, 남쪽 200mm 포켓 포함
  const partLen = LR_D - partOpeningN - partOpeningS  // ≈ 1.666
  const partCenterZ = partOpeningN + partLen / 2       // ≈ 1.733
  const silk = useMemo(() => {
    const t = silkTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set(partLen / 2, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [silkTex])

  // 화장대 + 도어들이 공유하는 호두 텍스처 — clone 1번만
  const walnutBodyTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  // 화장대 — 안방욕실 인접
  const vanityW = 0.54           // 동쪽 10mm 축소 (문틀 겹침 방지)
  const vanityX = mbLeft + vanityW / 2
  const vanityZ = 0.3

  const mbInRoom = !!playerPos && playerPos[0] >= mbLeft && playerPos[0] <= -WALL_THICKNESS && playerPos[1] >= 0 && playerPos[1] <= 5
  const mbActive = visible && (!!allLightsOn || mbInRoom)

  return (
    <>
      {/* 거울 간접조명 — 하단만, 안방조명 연동 */}
      <rectAreaLight position={[mbLeft + 0.01, 1.6 - 0.36, vanityZ]} width={0.50} height={0.02} intensity={mbActive ? 25 : 0} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
      {/* 거울 도어 수납장 — visible 밖 (낮에도 거울 동작) */}
      <VanityMirrorCabinet
        mbLeft={mbLeft}
        vanityZ={vanityZ}
        vanityW={vanityW}
        walnutTex={walnutBodyTex}
        activeDoorId={activeDoorId}
        playerPos={playerPos}
      />
      <group visible={visible}>
        {/* 안방 가벽 (본가벽) */}
        <mesh position={[mbLeft + 1.476, WALL_HEIGHT / 2, partCenterZ]}>
          <boxGeometry args={[0.05, WALL_HEIGHT, partLen]} />
          <meshStandardMaterial map={silk} roughness={0.55} metalness={0} />
        </mesh>

        {/* 2단 커튼 — 쉬어(회색빛) + 암막(짙은 회색), 붙박이~동쪽벽 전폭, F 인터랙션 */}
        <TwoLayerCurtain
          doorId="mb-curtain"
          xStart={mbLeft + 0.55}
          xEnd={-WALL_THICKNESS}
          sheerColor="#c7cace"
          activeDoorId={activeDoorId}
        />

        {/* 붙박이 고정 패널 — 남측 축소분(200×550mm) 채움, 붙박이 톤 유지 */}
        <mesh position={[mbLeft + 0.275, (WALL_HEIGHT - 0.050) / 2, LR_D - 0.1]}>
          <boxGeometry args={[0.550, WALL_HEIGHT - 0.050, 0.200]} />
          <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
        </mesh>



        {/* 원목 슬랫 가벽 (화장대 맞은편, 북측 오픈부) — 12살대, 실크 가벽/벽에서 20mm 여유 */}
        {(() => {
          const gapStart = 0          // 북쪽 interior 벽면
          const gapEnd = partCenterZ - partLen / 2  // 실크 가벽 북쪽 끝
          const clearance = 0.02      // 양쪽 20mm 여유
          const slatWidth = gapEnd - gapStart - clearance * 2
          const slatZCenter = (gapStart + gapEnd) / 2
          return (
            <SlatPartition
              x={mbLeft + 1.476}
              zCenter={slatZCenter}
              width={slatWidth}
            />
          )
        })()}

        {/* 안방 화장대 */}
        <VanityDrawers
          vanityX={vanityX}
          vanityZ={vanityZ}
          vanityW={vanityW}
          mbLeft={mbLeft}
          walnutTex={walnutBodyTex}
          activeDoorId={activeDoorId}
          playerPos={playerPos}
        />

        {/* 안방 침대 */}
        <Suspense fallback={null}>
          <Bed />
        </Suspense>

        {/* 협탁 — 침대 머리맡 북쪽, 시계방향 90° 회전 (서랍 +X(동) 방향으로 열림). 침대 쪽 50mm 밀음 */}
        {(() => {
          const partEastX = mbLeft + 1.476 + 0.025                // 가벽 동면 = 침대 서쪽 끝
          const nsX = partEastX + 0.4 / 2 + 0.02                   // 가벽 동면에서 20mm 여유
          const nsZ = 0.9 - 0.425 / 2 + 0.05                       // 침대 쪽 50mm 추가 이동
          return (
            <Nightstand
              position={[nsX, 0, nsZ]}
              rotationY={-Math.PI / 2}
              activeDoorId={activeDoorId}
              playerPos={playerPos}
            />
          )
        })()}

        {/* 하버드 책장 — 협탁 서랍 바로 북쪽, 180° 회전 (도어가 남쪽 = 침대 방향으로 열림) */}
        {(() => {
          const W_bs = 0.845
          const D_bs = 0.4
          const partEastX = mbLeft + 1.476 + 0.025
          const nsWestX = partEastX + 0.02                           // 협탁 서측 = mbLeft + 1.521
          // 책장 서측 edge를 협탁 서측과 동일 라인 → center = nsWestX + W_bs/2
          const bsX = nsWestX + W_bs / 2
          // 뒷면이 북벽에 밀착. local back posts = +D/2 → 180° 회전 후 world z = bsZ - D/2. gap 10mm.
          const bsZ = D_bs / 2 + 0.01
          return (
            <Bookshelf
              position={[bsX, 0, bsZ]}
              rotationY={Math.PI}
              activeDoorId={activeDoorId}
              playerPos={playerPos}
            />
          )
        })()}
      </group>
    </>
  )
}

/**
 * 화장대 인터랙티브 3단 서랍장 — F 키로 동시 개폐.
 * 위 30%, 중간 60%, 아래 90% 슬라이드. 중공 구조.
 */
function VanityDrawers({
  vanityX, vanityZ, vanityW, mbLeft, walnutTex, activeDoorId, playerPos,
}: {
  vanityX: number; vanityZ: number; vanityW: number; mbLeft: number
  walnutTex: THREE.Texture; activeDoorId?: DoorId | null; playerPos?: [number, number]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const topRef = useRef<THREE.Group>(null)
  const midRef = useRef<THREE.Group>(null)
  const botRef = useRef<THREE.Group>(null)
  const offsets = useRef([0, 0, 0])
  const { invalidate } = useThree()

  const doorId: DoorId = 'mb-vanity'
  const frontX = vanityX + vanityW / 2
  const bodyD = 0.58          // 본체 깊이 (Z)
  const bodyW = vanityW       // 본체 폭 (X)
  const panelT = 0.012
  const faceGap = 0.002       // 서랍 face 간 간격
  const topPanelBot = 1.05 - 0.015  // 상판 하면 = 1.035
  const botPanelTop = 0.01 + panelT  // 하단판 상면 = 0.022
  const drawerH = (topPanelBot - botPanelTop - faceGap * 4) / 3  // ≈ 0.335
  const drawerYs = [
    topPanelBot - faceGap - drawerH / 2,                          // 상단
    topPanelBot - faceGap - drawerH - faceGap - drawerH / 2,      // 중단
    botPanelTop + faceGap + drawerH / 2,                           // 하단
  ]
  const slideRatios = [0.30, 0.60, 0.90]
  const maxSlide = bodyW - 0.04  // 슬라이드 최대 거리 (+X 방향)

  const toggleRef = useRef(() => setIsOpen(o => !o))
  toggleRef.current = () => setIsOpen(o => !o)
  useEffect(() => {
    doorRegistry.register({
      id: doorId,
      position: [frontX, vanityZ],
      y: 0.55,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [])

  const refs = [topRef, midRef, botRef]
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let dirty = false
    for (let i = 0; i < 3; i++) {
      const target = isOpen ? maxSlide * slideRatios[i] : 0
      const diff = target - offsets.current[i]
      if (Math.abs(diff) > 0.0005) {
        offsets.current[i] += diff * Math.min(1, delta * 6)
        if (refs[i].current) refs[i].current.position.x = offsets.current[i]
        dirty = true
      }
    }
    if (dirty) invalidate()
  })

  const isActive = activeDoorId === doorId
  const innerW = bodyW - panelT * 2 - faceGap * 2
  const innerD = bodyD - panelT * 2 - faceGap * 2
  const innerH = drawerH - panelT - faceGap * 2

  // 중공 서랍 1개 렌더
  const renderDrawer = (ref: React.RefObject<THREE.Group | null>, centerY: number) => {
    const botY = centerY - drawerH / 2 + faceGap
    return (
      <group ref={ref}>
        {/* 전면 패널 (face) */}
        <mesh position={[frontX - 0.010, centerY, vanityZ]}>
          <boxGeometry args={[panelT, drawerH, bodyD - faceGap * 2]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        {/* 손잡이 */}
        <mesh position={[frontX - 0.010 + panelT / 2 + 0.005, centerY, vanityZ]}>
          <boxGeometry args={[0.015, 0.06, 0.01]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* 바닥판 */}
        <mesh position={[vanityX, botY + panelT / 2, vanityZ]}>
          <boxGeometry args={[innerW, panelT, innerD]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        </mesh>
        {/* 좌측면 (-Z) — 9mm 안쪽 */}
        <mesh position={[vanityX, botY + panelT + innerH / 2, vanityZ - innerD / 2 - panelT / 2 + 0.009]}>
          <boxGeometry args={[innerW, innerH, panelT]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        </mesh>
        {/* 우측면 (+Z) — 9mm 안쪽 */}
        <mesh position={[vanityX, botY + panelT + innerH / 2, vanityZ + innerD / 2 + panelT / 2 - 0.009]}>
          <boxGeometry args={[innerW, innerH, panelT]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        </mesh>
        {/* 후면 (-X) */}
        <mesh position={[vanityX - innerW / 2 - panelT / 2, botY + panelT + innerH / 2, vanityZ]}>
          <boxGeometry args={[panelT, innerH, innerD]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      {/* 상판 */}
      <mesh position={[vanityX, 1.05, vanityZ]}>
        <boxGeometry args={[vanityW, 0.03, 0.6]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} />
      </mesh>
      {/* 본체 외벽 — 좌(-Z), 우(+Z), 후(-X), 상/하 칸막이 */}
      {/* 좌측면 — 상판 하면까지 밀착 */}
      <mesh position={[vanityX, (0.01 + topPanelBot) / 2, vanityZ - bodyD / 2 + panelT / 2]}>
        <boxGeometry args={[bodyW, topPanelBot - 0.01, panelT]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 우측면 */}
      <mesh position={[vanityX, (0.01 + topPanelBot) / 2, vanityZ + bodyD / 2 - panelT / 2]}>
        <boxGeometry args={[bodyW, topPanelBot - 0.01, panelT]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 후면 */}
      <mesh position={[vanityX - bodyW / 2 + panelT / 2, (0.01 + topPanelBot) / 2, vanityZ]}>
        <boxGeometry args={[panelT, topPanelBot - 0.01, bodyD]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 하단판 */}
      <mesh position={[vanityX, 0.01 + panelT / 2, vanityZ]}>
        <boxGeometry args={[bodyW, panelT, bodyD]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>

      {/* 3단 서랍 */}
      {renderDrawer(topRef, drawerYs[0])}
      {renderDrawer(midRef, drawerYs[1])}
      {renderDrawer(botRef, drawerYs[2])}


      {/* 서랍 툴팁 */}
      {isActive && (
        <DoorTooltip position={[frontX + 0.05, 0.55 + 0.20, vanityZ]} label={getDoorLabel(doorId, isOpen)} />
      )}
    </group>
  )
}

/**
 * 화장대 거울 도어 수납장 — 거울이 좌측(-Z)으로 열리며 내부 4분할 선반.
 * 150mm 깊이, 벽면(-X)에 밀착.
 */
function VanityMirrorCabinet({
  mbLeft, vanityZ, vanityW, walnutTex, activeDoorId, playerPos,
}: {
  mbLeft: number; vanityZ: number; vanityW: number
  walnutTex: THREE.Texture; activeDoorId?: DoorId | null
  playerPos?: [number, number]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const doorPivotRef = useRef<THREE.Group>(null)
  const doorAngleRef = useRef(0)
  const { invalidate } = useThree()

  const doorId: DoorId = 'mb-vanity-mirror'
  const cabD = 0.150          // 캐비닛 깊이 (X, 벽에서 돌출)
  const cabW = 0.50           // 캐비닛 폭 (Z)
  const cabH = 0.70           // 캐비닛 높이
  const cabCY = 1.6           // 캐비닛 중심 Y
  const panelT = 0.010
  const cabBackX = mbLeft + panelT / 2  // 뒷면 (벽쪽)
  const cabFrontX = mbLeft + cabD       // 전면
  const cabCX = mbLeft + cabD / 2

  const toggleRef = useRef(() => setIsOpen(o => !o))
  toggleRef.current = () => setIsOpen(o => !o)
  useEffect(() => {
    doorRegistry.register({
      id: doorId,
      position: [mbLeft + vanityW, vanityZ],  // 서랍장 frontX와 동일
      y: 1.6,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [])

  const DOOR_ANGLE = Math.PI / 2  // 좌측(-Z)으로 열림
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const target = isOpen ? DOOR_ANGLE : 0
    const diff = target - doorAngleRef.current
    if (Math.abs(diff) > 0.001) {
      doorAngleRef.current += diff * Math.min(1, delta * 6)
      if (doorPivotRef.current) doorPivotRef.current.rotation.y = doorAngleRef.current
      invalidate()
    }
  })

  // Reflector 거울 — 1m 이내에서만 활성
  const reflectorObj = useMemo(() => {
    const geo = new THREE.PlaneGeometry(cabW - 0.004, cabH - 0.004)
    return makeNonRecursiveReflector(new Reflector(geo, {
      textureWidth: 512, textureHeight: 512, color: 0xc8ccd0, clipBias: 0.003,
    }))
  }, [])
  const cabFrontXVal = mbLeft + cabD
  const nearMirror = !!playerPos && (
    Math.hypot(playerPos[0] - cabFrontXVal, playerPos[1] - vanityZ) < 1.0
  )
  const mirrorOn = useMirrorEnabled()
  const showReflector = nearMirror && mirrorOn
  useEffect(() => {
    if (reflectorObj) reflectorObj.visible = showReflector
  }, [showReflector, reflectorObj])

  const isActive = activeDoorId === doorId
  const innerW = cabW - panelT * 2
  const innerD = cabD - panelT * 2
  const innerH = cabH - panelT * 2
  const shelfT = 0.008

  return (
    <group>
      {/* 캐비닛 본체 — 뒷판, 상/하판, 좌/우측면 */}
      {/* 뒷판 (높이 5mm 축소 z-fighting 방지) */}
      <mesh position={[cabBackX, cabCY, vanityZ]}>
        <boxGeometry args={[panelT, cabH - 0.005, cabW]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
      </mesh>
      {/* 상판 */}
      <mesh position={[cabCX, cabCY + cabH / 2 - panelT / 2, vanityZ]}>
        <boxGeometry args={[cabD, panelT, cabW]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 하판 */}
      <mesh position={[cabCX, cabCY - cabH / 2 + panelT / 2, vanityZ]}>
        <boxGeometry args={[cabD, panelT, cabW]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 좌측면 (-Z) */}
      <mesh position={[cabCX, cabCY, vanityZ - cabW / 2 + panelT / 2]}>
        <boxGeometry args={[cabD, cabH, panelT]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 우측면 (+Z) */}
      <mesh position={[cabCX, cabCY, vanityZ + cabW / 2 - panelT / 2]}>
        <boxGeometry args={[cabD, cabH, panelT]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>

      {/* 4분할 선반 (3개 칸막이) */}
      {[1, 2, 3].map(i => {
        const sy = cabCY - cabH / 2 + panelT + innerH * i / 4
        return (
          <mesh key={`mirror-shelf-${i}`} position={[cabCX, sy, vanityZ]}>
            <boxGeometry args={[innerD, shelfT, innerW]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
          </mesh>
        )
      })}

      {/* 거울 도어 — 경첩: 좌측(-Z), 좌측으로 열림 */}
      <group position={[cabFrontX, cabCY, vanityZ - cabW / 2]}>
        <group ref={doorPivotRef}>
          {/* 도어 뒷판 (거울 뒤) */}
          <mesh position={[panelT / 2, 0, cabW / 2]}>
            <boxGeometry args={[panelT, cabH - 0.004, cabW - 0.004]} />
            <meshStandardMaterial color="#333" roughness={0.5} />
          </mesh>
          {/* 메탈릭 거울 면 (항상 표시) */}
          <mesh position={[panelT + 0.001, 0, cabW / 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[cabW - 0.004, cabH - 0.004]} />
            <meshStandardMaterial color="#c8dce8" metalness={0.95} roughness={0.03} />
          </mesh>
          {/* Reflector 거울 — 가까울 때만 메탈릭 위에 겹침 */}
          <group position={[panelT + 0.002, 0, cabW / 2]} rotation={[0, Math.PI / 2, 0]}>
            <primitive object={reflectorObj} />
          </group>
        </group>
      </group>

      {/* 툴팁 */}
      {isActive && (
        <DoorTooltip position={[cabFrontX + 0.05, cabCY + 0.20, vanityZ]} label={getDoorLabel(doorId, isOpen)} />
      )}
    </group>
  )
}

/**
 * 하버드 책장 — 845W × 400D × 1810H mm. 오크 톤.
 * 프레임: 각 측면에 2개 막대(뒤 수직 + 앞 기울어진 사다리꼴) + 최상단 옆면 연결부 + 최상단 뒷판 받침대.
 * 막대 단면 32×50mm (X×Z).
 * 상부 5단 선반(최상단은 오픈, 판 없음), 구획별 깊이 380/295/255/210 (bottom→top), 지그재그 수직 분할.
 * 하부 수납장: 780×360×400 외곽, 10mm 판, 40mm 띄움. 760×340×380 내부. 양개 간살 도어 (15/5mm).
 */
function Bookshelf({
  position, rotationY = 0, activeDoorId, playerPos,
}: {
  position: [number, number, number]
  rotationY?: number
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const leftDoorRef = useRef<THREE.Group>(null)
  const rightDoorRef = useRef<THREE.Group>(null)
  const leftAngleRef = useRef(0)
  const rightAngleRef = useRef(0)
  const { invalidate } = useThree()

  const oakBaseTex = useKTX2('/textures/oak-wood.ktx2')
  const oakTex = useMemo(() => {
    const t = oakBaseTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [oakBaseTex])

  const doorId: DoorId = 'mb-bookshelf-lower'
  const W = 0.845
  const D = 0.4
  const H = 1.81

  // 다리(막대) 단면 32×50 mm
  const postW = 0.032         // X 두께 32mm
  const postT = 0.05          // Z 두께 50mm
  const lean = 0.22           // 앞 막대 기울기 (world Z 방향 이동량, 기존 0.19에서 증가)
  const shelfW = W - postW * 2
  const shelfT = 0.012

  const cabW = 0.78
  const cabH = 0.36
  const cabD = 0.38              // 캐비닛 깊이 — shelf 깊이와 동일 (전체 bookshelf D=0.4 대비 20mm 축소)
  const cabZOffset = (0.4 - cabD) / 2  // 뒷면은 shelf 뒷면과 flush, 앞면(문)은 20mm 뒤로
  const cabLift = 0.04
  const panelT = 0.01

  const cabTopY = cabLift + cabH  // 0.40
  const openH = H - cabTopY
  const numComp = 4
  const compH = (openH - shelfT * (numComp + 1)) / numComp

  const shelfYs: number[] = []
  for (let i = 0; i <= numComp; i++) {
    shelfYs.push(cabTopY + i * (compH + shelfT))
  }
  // shelfYs[4] = H (최상단, 판 없음 — divider 기준점)

  // 각 판 깊이 (bottom→top)
  const shelfDepths = [0.38, 0.295, 0.255, 0.21]

  // 지그재그 수직 분할 — 3개만 (최상단 210mm 상판 위는 분할 없음)
  // bottom→top: 사용자 시점 왼쪽 300 / 오른쪽 300 / 왼쪽 300
  // (local -X 기준 leftWidth: 480/300/480 — 방향 반전)
  // 두께 10mm, 깊이는 각 구획 상단 shelf 깊이.
  const leftWidths = [0.48, 0.3, 0.48]
  const divThick = 0.01  // 10mm

  // 앞 막대 + 옆면 최상단 연결부 통합 L-shape (앞 top 바깥쪽 모서리 radius)
  // Shape 2D(Z,Y) → extrude X 방향 postW 두께, rotation -π/2 Y축으로 월드 배치
  const cornerR = 0.03
  const oakTileM = 0.4
  const sideFrameGeo = useMemo(() => {
    const s = new THREE.Shape()
    const topOuterZ = -D / 2 + lean
    const legAngle = Math.atan2(lean, H)
    const zInnerTop = -D / 2 + postT + ((H - postT) / H) * lean
    s.moveTo(-D / 2, 0)
    s.lineTo(topOuterZ - cornerR * Math.sin(legAngle), H - cornerR * Math.cos(legAngle))
    s.quadraticCurveTo(topOuterZ, H, topOuterZ + cornerR, H)
    s.lineTo(D / 2 - postT, H)
    s.lineTo(D / 2 - postT, H - postT)
    s.lineTo(zInnerTop, H - postT)
    s.lineTo(-D / 2 + postT, 0)
    s.closePath()
    const geo = new THREE.ExtrudeGeometry(s, { depth: postW, bevelEnabled: false })
    // UV 재작성 — planar X-projection: 모든 vertex 의 (shape.x, shape.y) 를
    // 월드 단위 기반 UV 로 사용. 얇은 extrude wall 에서도 나뭇결 가시적.
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      uv.setX(i, pos.getX(i) / oakTileM)
      uv.setY(i, pos.getY(i) / oakTileM)
    }
    uv.needsUpdate = true
    return geo
  }, [])

  // 모든 BoxGeometry 를 world-space UV 스케일 로 memoize
  const geos = useMemo(() => {
    const t = oakTileM
    const openH = H - (0.04 + 0.36)
    const compH = (openH - 0.012 * (4 + 1)) / 4
    const ys: number[] = []
    for (let i = 0; i <= 4; i++) ys.push(0.04 + 0.36 + i * (compH + 0.012))
    const sDepths = [0.38, 0.295, 0.255, 0.21]
    const lWidths = [0.48, 0.3, 0.48]
    return {
      backPost: makeWoodBox(0.032, H, 0.05, t),
      topRail: makeWoodBox(0.845 - 0.032 * 2, 0.055, 0.01, t),
      shelves: sDepths.map(d => makeWoodBox(0.845 - 0.032 * 2, 0.012, d, t)),
      shelfRails: sDepths.map(() => makeWoodBox(0.845 - 0.032 * 2, 0.03, 0.01, t)),
      dividers: lWidths.map((_, i) => {
        const yBot = ys[i] + 0.012
        const yTop = ys[i + 1]
        return makeWoodBox(0.01, yTop - yBot, sDepths[i + 1], t)
      }),
      cabBottom: makeWoodBox(0.78, 0.01, 0.38, t),
      cabSide: makeWoodBox(0.01, 0.36 - 0.01, 0.38, t),
      cabBack: makeWoodBox(0.78 - 0.02, 0.36 - 0.02, 0.01, t),
      doorFrameLR: makeWoodBox(0.05, 0.36 - 0.01 - 0.005, 0.01, t),
      doorFrameTB: makeWoodBox(((0.78 - 0.02 - 0.005) / 2) - 0.1, 0.02, 0.01, t),
      slat: makeWoodBox(0.015, 0.36 - 0.01 - 0.005, 0.01, t),
    }
  }, [])

  // 최상단 뒷판 받침대 (2개 뒤 막대 사이 가로)
  const topRailH = 0.055
  const topRailT = 0.01

  // 간살 도어 — 중앙 5mm 간격, 엣지-투-엣지 슬랫 배치
  const doorGap = 0.005
  const doorTopGap = 0.005                              // 상판(바로 위 shelf)과 도어 상단 사이 단차
  const doorW = (cabW - panelT * 2 - doorGap) / 2      // 377.5mm
  const doorH = cabH - panelT - doorTopGap             // 345mm (바닥판 상면 ~ shelf 하단 -5mm)
  const doorCenterYLocal = (panelT - doorTopGap) / 2   // 바닥판 위 flush, 상단만 5mm 갭
  const slatW = 0.015
  const slatCount = 19                                 // 양끝 포함, 균일 간격
  const slatPitch = (doorW - slatW) / (slatCount - 1)  // ≈ 20.14mm (첫/마지막 슬랫 엣지 flush)
  // 뒷 프레임 — 좌/우 50mm, 상/하 20mm, 10mm 깊이
  const frameLR = 0.05
  const frameTB = 0.02
  const frameDepth = 0.01

  // F 인터랙션 등록 — 캐비닛 앞면 중심
  const toggleRef = useRef(() => setIsOpen(o => !o))
  toggleRef.current = () => setIsOpen(o => !o)
  useEffect(() => {
    // local 캐비닛 앞면 중심 = (0, _, cabZOffset - cabD/2). Y축 rotation 적용
    const cos = Math.cos(rotationY)
    const sin = Math.sin(rotationY)
    const localDz = cabZOffset - cabD / 2
    const worldDx = localDz * sin
    const worldDz = localDz * cos
    doorRegistry.register({
      id: doorId,
      position: [position[0] + worldDx, position[2] + worldDz],
      y: cabLift + cabH / 2,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [])

  // 양개 도어 애니메이션 — 좌: +90°, 우: -90° (앞으로 열림)
  const DOOR_ANGLE = Math.PI / 2
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let dirty = false
    const leftTarget = isOpen ? DOOR_ANGLE : 0
    const rightTarget = isOpen ? -DOOR_ANGLE : 0
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

  const isActive = activeDoorId === doorId
  void playerPos

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 뒤 수직 막대 2개 */}
      {[-1, 1].map((sign) => (
        <mesh
          key={`back-post-${sign}`}
          position={[sign * (W / 2 - postW / 2), H / 2, D / 2 - postT / 2]}
          geometry={geos.backPost}
        >
          <meshStandardMaterial map={oakTex} roughness={0.7} />
        </mesh>
      ))}

      {/* 좌/우 옆면 프레임 (앞 기울어진 막대 + 최상단 연결부 통합, 앞top outer corner radius) */}
      {[-1, 1].map((sign) => {
        const posX = sign === -1 ? -W / 2 + postW : W / 2
        return (
          <mesh
            key={`side-frame-${sign}`}
            position={[posX, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            geometry={sideFrameGeo}
          >
            <meshStandardMaterial map={oakTex} roughness={0.7} />
          </mesh>
        )
      })}

      {/* 최상단 뒷판 받침대 — 좌/우 뒤 막대 사이, 뒷면 Z=D/2 flush */}
      <mesh position={[0, H - topRailH / 2, D / 2 - topRailT / 2]} geometry={geos.topRail}>
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>

      {/* 선반 판 + 뒤쪽 30mm 받침대 — 최상단 제외 */}
      {shelfYs.slice(0, -1).map((y, i) => {
        const d = shelfDepths[i]
        const centerZ = D / 2 - d / 2
        const railH = 0.03
        const railT = 0.01
        const railCenterZ = D / 2 - railT / 2
        return (
          <group key={`shelf-${i}`}>
            <mesh position={[0, y + shelfT / 2, centerZ]} geometry={geos.shelves[i]}>
              <meshStandardMaterial map={oakTex} roughness={0.7} />
            </mesh>
            <mesh position={[0, y + shelfT + railH / 2, railCenterZ]} geometry={geos.shelfRails[i]}>
              <meshStandardMaterial map={oakTex} roughness={0.7} />
            </mesh>
          </group>
        )
      })}

      {/* 수직 분할 3개 (지그재그) — 두께 10mm, 깊이 = 구획 상단 shelf 깊이 */}
      {leftWidths.map((leftW, i) => {
        const yBot = shelfYs[i] + shelfT
        const yTop = shelfYs[i + 1]
        const compCenterY = (yBot + yTop) / 2
        const dTop = shelfDepths[i + 1]
        const divCenterZ = D / 2 - dTop / 2
        return (
          <mesh
            key={`div-${i}`}
            position={[-shelfW / 2 + leftW + divThick / 2, compCenterY, divCenterZ]}
            geometry={geos.dividers[i]}
          >
            <meshStandardMaterial map={oakTex} roughness={0.7} />
          </mesh>
        )
      })}

      {/* 하단 수납장 — 상판 없음 (shelfYs[0] 선반이 상판 역할), 뒷면 shelf와 flush */}
      <group position={[0, cabLift + cabH / 2, cabZOffset]}>
        <mesh position={[0, -cabH / 2 + panelT / 2, 0]} geometry={geos.cabBottom}>
          <meshStandardMaterial map={oakTex} roughness={0.7} />
        </mesh>
        {/* 좌/우 측판 — 바닥판 위에서 shelfYs[0] 선반 하단까지 */}
        <mesh position={[-cabW / 2 + panelT / 2, panelT / 2, 0]} geometry={geos.cabSide}>
          <meshStandardMaterial map={oakTex} roughness={0.7} />
        </mesh>
        <mesh position={[cabW / 2 - panelT / 2, panelT / 2, 0]} geometry={geos.cabSide}>
          <meshStandardMaterial map={oakTex} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, cabD / 2 - panelT / 2]} geometry={geos.cabBack}>
          <meshStandardMaterial map={oakTex} roughness={0.7} />
        </mesh>
        {/* 양개 간살 도어 — 외측 엣지 힌지 피벗(X=hingeX, Z=도어 앞면) 고정, ±90° 회전 */}
        {[-1, 1].map((sign) => {
          const hingeX = sign * (doorW + doorGap / 2)    // 외측 힌지 = 도어 바깥 엣지
          const hingeZ = -cabD / 2 + panelT / 2          // 도어 앞면 중앙 Z (피벗 고정점)
          const innerXOffset = -sign * doorW / 2          // 힌지 → 도어 중심 오프셋
          const frameRelZ = panelT / 2 + frameDepth / 2   // 슬랫 뒤 프레임 오프셋
          return (
            <group
              key={`door-${sign}`}
              ref={sign < 0 ? leftDoorRef : rightDoorRef}
              position={[hingeX, doorCenterYLocal, hingeZ]}
            >
              <group position={[innerXOffset, 0, 0]}>
                {/* 뒷 프레임 — 좌/우 50mm 세로바 */}
                {[-1, 1].map((sx) => (
                  <mesh
                    key={`frame-lr-${sx}`}
                    position={[sx * (doorW / 2 - frameLR / 2), 0, frameRelZ]}
                    geometry={geos.doorFrameLR}
                  >
                    <meshStandardMaterial map={oakTex} roughness={0.7} />
                  </mesh>
                ))}
                {/* 뒷 프레임 — 상/하 20mm 가로바 */}
                {[-1, 1].map((sy) => (
                  <mesh
                    key={`frame-tb-${sy}`}
                    position={[0, sy * (doorH / 2 - frameTB / 2), frameRelZ]}
                    geometry={geos.doorFrameTB}
                  >
                    <meshStandardMaterial map={oakTex} roughness={0.7} />
                  </mesh>
                ))}
                {/* 간살 — 19개, 양끝 엣지 flush, 균일 pitch */}
                {Array.from({ length: slatCount }).map((_, j) => {
                  const x = -doorW / 2 + slatW / 2 + j * slatPitch
                  return (
                    <mesh key={`slat-${sign}-${j}`} position={[x, 0, 0]} geometry={geos.slat}>
                      <meshStandardMaterial map={oakTex} roughness={0.7} />
                    </mesh>
                  )
                })}
              </group>
            </group>
          )
        })}
      </group>

      {/* F 인터랙션 툴팁 — 캐비닛 앞면 상단 */}
      {isActive && (
        <DoorTooltip
          position={[0, cabLift + cabH + 0.08, cabZOffset - cabD / 2 + 0.05]}
          label={getDoorLabel(doorId, isOpen)}
        />
      )}
    </group>
  )
}

/**
 * 침대 협탁 — 400×400×595 mm, 오크 원목 + 하단 flare 측판 (상단 395, 하단 425).
 * 상단 갤러리 난간(3면, 앞 오픈) + 서랍 1단 + 오픈 큐비 + 베이스 선반 + 4 테이퍼 다리.
 * 서랍은 F 키 상호작용으로 앞으로 슬라이드.
 */
function Nightstand({
  position, rotationY = 0, activeDoorId, playerPos,
}: {
  position: [number, number, number]
  rotationY?: number
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const drawerRef = useRef<THREE.Group>(null)
  const slideRef = useRef(0)
  const { invalidate } = useThree()

  const oakBaseTex = useKTX2('/textures/oak-wood.ktx2')
  const oakTex = useMemo(() => {
    const t = oakBaseTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [oakBaseTex])

  const doorId: DoorId = 'mb-nightstand'

  // === 전체 치수 ===
  const wTop = 0.395          // 상단 외곽 폭 (측판 바깥면 간격)
  const wBot = 0.425          // 하단 외곽 폭 — flare +30 (각 측판 바닥이 15mm 바깥으로)
  const D = 0.4               // 깊이 (Z)
  const totalH = 0.595
  const legH = 0.09           // 다리 높이
  const panelT = 0.015        // 15T 집성판

  // === 수직 레이아웃 (y 기준, 바닥 y=0) ===
  const galleryH = 0.03
  const topPanelTopY = totalH - galleryH                 // 0.565
  const topPanelBotY = topPanelTopY - panelT             // 0.550
  const drawerH = 0.13
  const drawerTopY = topPanelBotY                         // 서랍 천장 = 상판 하면
  const drawerBotY = drawerTopY - drawerH                 // 0.420
  const dividerTopY = drawerBotY                          // 분할판 상면 = 서랍 하면
  const dividerBotY = dividerTopY - panelT                // 0.405
  const bottomShelfTopY = legH + panelT                   // 0.105
  const bottomShelfBotY = legH                            // 0.090

  // 측판 flare 로 인해 내부 폭이 높이에 따라 달라지므로 공식으로 계산
  const innerWidthAtY = (y: number) => {
    const ratio = (y - legH) / (totalH - legH)
    const outerHalfW = wBot / 2 + ratio * (wTop / 2 - wBot / 2)
    return 2 * (outerHalfW - panelT)
  }
  const topPanelW = innerWidthAtY((topPanelBotY + topPanelTopY) / 2)
  const dividerW = innerWidthAtY((dividerBotY + dividerTopY) / 2)
  const bottomShelfW = innerWidthAtY((bottomShelfBotY + bottomShelfTopY) / 2)
  const galleryBackW = innerWidthAtY((topPanelTopY + totalH) / 2)

  // === 측판 trapezoidal 프로파일 (X-Y), Z 로 extrude ===
  const makeSideShape = (side: 1 | -1) => {
    const s = new THREE.Shape()
    const outerTopX = side * (wTop / 2)
    const outerBotX = side * (wBot / 2)
    const innerTopX = side * (wTop / 2 - panelT)
    const innerBotX = side * (wBot / 2 - panelT)
    if (side < 0) {
      s.moveTo(outerBotX, legH)
      s.lineTo(outerTopX, totalH)
      s.lineTo(innerTopX, totalH)
      s.lineTo(innerBotX, legH)
    } else {
      s.moveTo(innerBotX, legH)
      s.lineTo(innerTopX, totalH)
      s.lineTo(outerTopX, totalH)
      s.lineTo(outerBotX, legH)
    }
    s.closePath()
    return s
  }
  const leftPanelGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(makeSideShape(-1), { depth: D, bevelEnabled: false })
    g.translate(0, 0, -D / 2)
    return g
  }, [])
  const rightPanelGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(makeSideShape(1), { depth: D, bevelEnabled: false })
    g.translate(0, 0, -D / 2)
    return g
  }, [])

  // === 뒷판 — 측판 안쪽, 상/하 폭 다름 (trapezoidal) ===
  const backPanelGeo = useMemo(() => {
    const s = new THREE.Shape()
    const tx = wTop / 2 - panelT
    const bx = wBot / 2 - panelT
    s.moveTo(-bx, legH)
    s.lineTo(-tx, totalH)
    s.lineTo(tx, totalH)
    s.lineTo(bx, legH)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: panelT, bevelEnabled: false })
    g.translate(0, 0, D / 2 - panelT)
    return g
  }, [])

  // === 서랍 치수 — flare 때문에 서랍 높이에서의 케이스 개구부 폭 기준 ===
  const drawerMidY = (drawerBotY + drawerTopY) / 2
  const drawerOpeningW = innerWidthAtY(drawerMidY)       // 케이스 개구부 폭 (서랍 중심 Y)
  const drawerFaceW = drawerOpeningW - 0.002             // 각 1mm reveal
  const drawerBoxW = drawerFaceW - 0.025                 // 서랍 박스 내폭 — 좌우 각 7.5mm 더 안쪽 (face 뒤로 숨김)
  const drawerBoxD = D - panelT - 0.010                  // 박스 전방 연장 — 총 15mm (face 뒷면을 2.5mm 관통)
  const drawerBoxCenterZ = 0                              // 중심 Z = 0 (앞으로 5mm 추가 이동)
  const slideDist = 0.22
  const handleW = 0.08
  const handleH = 0.02
  const handleDepth = 0.008

  // === 다리 ===
  const legTopR = 0.0175
  const legBotR = 0.0135
  const legInset = 0.0295

  // === F 인터랙션 — 회전된 도어 앞면 중심 위치 계산 ===
  const toggleRef = useRef(() => setIsOpen(o => !o))
  toggleRef.current = () => setIsOpen(o => !o)
  useEffect(() => {
    // local drawer 앞면 중심 = (0, _, -D/2). Y축 rotation 적용:
    const cos = Math.cos(rotationY)
    const sin = Math.sin(rotationY)
    const localDx = 0
    const localDz = -D / 2
    const worldDx = localDx * cos + localDz * sin
    const worldDz = -localDx * sin + localDz * cos
    doorRegistry.register({
      id: doorId,
      position: [position[0] + worldDx, position[2] + worldDz],
      y: drawerBotY + drawerH / 2,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const target = isOpen ? -slideDist : 0                // -Z(앞) 방향으로 슬라이드
    const diff = target - slideRef.current
    if (Math.abs(diff) > 0.0005) {
      slideRef.current += diff * Math.min(1, delta * 6)
      if (drawerRef.current) drawerRef.current.position.z = slideRef.current
      invalidate()
    }
  })

  const isActive = activeDoorId === doorId
  void playerPos

  // 뒷쪽 갤러리 가로바 (측판 자체가 좌/우 갤러리 역할 수행)
  const galleryBackGeo = useMemo(() => {
    return new THREE.BoxGeometry(galleryBackW, galleryH, panelT)
  }, [galleryBackW])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 좌/우 측판 — trapezoidal, 하단이 15mm씩 바깥으로 flare */}
      <mesh geometry={leftPanelGeo}>
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>
      <mesh geometry={rightPanelGeo}>
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>
      {/* 뒷판 — 측판 안쪽, 상/하 폭 다름 */}
      <mesh geometry={backPanelGeo}>
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>

      {/* 상판 — 측판 사이, 갤러리 아래 */}
      <mesh position={[0, topPanelBotY + panelT / 2, 0]}>
        <boxGeometry args={[topPanelW, panelT, D]} />
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>

      {/* 뒷쪽 갤러리 가로바 — 측판 상단 사이 후면 flush */}
      <mesh
        position={[0, topPanelTopY + galleryH / 2, D / 2 - panelT / 2]}
        geometry={galleryBackGeo}
      >
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>

      {/* 서랍 하단 분할판 (오픈 큐비 천장) */}
      <mesh position={[0, dividerBotY + panelT / 2, 0]}>
        <boxGeometry args={[dividerW, panelT, D - panelT]} />
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>

      {/* 베이스 바닥 선반 */}
      <mesh position={[0, bottomShelfBotY + panelT / 2, 0]}>
        <boxGeometry args={[bottomShelfW, panelT, D]} />
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>

      {/* 앞/뒤 apron — 다리 사이 보강 스트레처 (바닥판 하면) */}
      <mesh position={[0, bottomShelfBotY - 0.015 / 2, -D / 2 + panelT / 2]}>
        <boxGeometry args={[wBot - legInset * 2 - 0.04, 0.015, panelT]} />
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>
      <mesh position={[0, bottomShelfBotY - 0.015 / 2, D / 2 - panelT / 2]}>
        <boxGeometry args={[wBot - legInset * 2 - 0.04, 0.015, panelT]} />
        <meshStandardMaterial map={oakTex} roughness={0.7} />
      </mesh>

      {/* 4 테이퍼 다리 — 좌/우 × 앞/뒤, legInset 만큼 안쪽, 상부 Ø35 → 하부 Ø27 */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`leg-${sx}-${sz}`}
            position={[
              sx * (wBot / 2 - legInset),
              legH / 2,
              sz * (D / 2 - legInset),
            ]}
          >
            <cylinderGeometry args={[legTopR, legBotR, legH, 16]} />
            <meshStandardMaterial map={oakTex} roughness={0.7} />
          </mesh>
        ))
      )}

      {/* 서랍 — Z 슬라이드 그룹 */}
      <group ref={drawerRef} position={[0, (drawerBotY + drawerTopY) / 2, 0]}>
        {/* 전면 face */}
        <mesh position={[0, 0, -D / 2 + panelT / 2]}>
          <boxGeometry args={[drawerFaceW, drawerH, panelT]} />
          <meshStandardMaterial map={oakTex} roughness={0.7} />
        </mesh>
        {/* 손잡이 음각 (얕은 어두운 오벌 대신 직사각형으로 표현) */}
        <mesh position={[0, 0, -D / 2 + panelT - handleDepth / 2]}>
          <boxGeometry args={[handleW, handleH, handleDepth]} />
          <meshStandardMaterial color="#4a3020" roughness={0.9} />
        </mesh>
        {/* 서랍 박스 (간략): 바닥 — face 뒤쪽까지 10mm 더 앞으로 연장 */}
        <mesh position={[0, -drawerH / 2 + 0.005, drawerBoxCenterZ]}>
          <boxGeometry args={[drawerBoxW, 0.01, drawerBoxD]} />
          <meshStandardMaterial color="#d9c9a8" roughness={0.6} />
        </mesh>
        {/* 좌/우 측판 */}
        <mesh position={[-drawerBoxW / 2 - 0.005, 0, drawerBoxCenterZ]}>
          <boxGeometry args={[0.01, drawerH - 0.02, drawerBoxD]} />
          <meshStandardMaterial color="#d9c9a8" roughness={0.6} />
        </mesh>
        <mesh position={[drawerBoxW / 2 + 0.005, 0, drawerBoxCenterZ]}>
          <boxGeometry args={[0.01, drawerH - 0.02, drawerBoxD]} />
          <meshStandardMaterial color="#d9c9a8" roughness={0.6} />
        </mesh>
        {/* 뒷판 — 뒷쪽 위치 유지 */}
        <mesh position={[0, 0, drawerBoxCenterZ + drawerBoxD / 2 - 0.005]}>
          <boxGeometry args={[drawerBoxW, drawerH - 0.02, 0.01]} />
          <meshStandardMaterial color="#d9c9a8" roughness={0.6} />
        </mesh>
      </group>

      {/* F 인터랙션 툴팁 */}
      {isActive && (
        <DoorTooltip
          position={[0, drawerBotY + drawerH + 0.1, -D / 2 + 0.05]}
          label={getDoorLabel(doorId, isOpen)}
        />
      )}
    </group>
  )
}

/**
 * 원목 슬랫 가벽 (핀토리 원목가벽 스타일) — 900mm × 12살대 수직 배열.
 * 상/하 레일 프레임, 자연 원목 컬러(참죽/편백 느낌).
 */
function SlatPartition({ x, zCenter, width }: { x: number; zCenter: number; width: number }) {
  const slatCount = 12
  const railX = 0.05      // 레일 X 깊이 (50mm)
  const railY = 0.02      // 레일 Y 높이 (20mm)
  const slatX = 0.02      // 살대 X 두께 (20mm)
  const slatZ = 0.05      // 살대 Z 폭 (50mm) — 45도 회전 적용
  const topRailCenterY = WALL_HEIGHT - railY / 2           // 상부 레일 — 천장 밀착
  const botRailCenterY = railY / 2                         // 하부 레일 — 바닥 밀착
  const slatH = WALL_HEIGHT - railY * 2                    // 살대 높이 = 천장 - 레일 2개
  const slatCenterY = WALL_HEIGHT / 2
  // 살대 45° 회전 후 Z 바운딩 박스 half-extent: (20+50)/(2·√2) ≈ 0.025
  const slatHalfZ = (slatX + slatZ) / (2 * Math.SQRT2)
  // 외측 살대도 레일 내부에 들어가도록 slat 양끝 살대 센터를 레일 끝에서 slatHalfZ 만큼 안쪽으로
  const slatSpan = width - slatHalfZ * 2
  const pitch = slatSpan / (slatCount - 1)
  const zStart = zCenter - slatSpan / 2

  const hinokiBase = useKTX2('/textures/hinoki.ktx2')
  // 살대용 — 면이 좁아서(20/50mm) U 스케일을 0.15로 줄여 텍스처의 작은 영역만 보이게 함
  // (그래야 grain 스트라이프가 뭉개지지 않고 픽셀 단위로 보임). V는 5회 반복 (전체 높이 2.4m).
  const slatTex = useMemo(() => {
    const t = hinokiBase.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.repeat.set(0.15, 5)
    t.needsUpdate = true
    return t
  }, [hinokiBase])
  // 레일용 — 가로로 긴 면(Z, width=~0.86m). grain이 레일 길이 방향으로 흐르게 90° 회전.
  // repeat.x (회전 후 세로, rail 20mm 높이)를 0.15로 줄여서 pattern 뭉개짐 방지.
  const railTex = useMemo(() => {
    const t = hinokiBase.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.rotation = Math.PI / 2
    t.center.set(0.5, 0.5)
    t.repeat.set(0.15, width / 0.4)
    t.needsUpdate = true
    return t
  }, [hinokiBase, width])
  const woodTint = '#f5deb0'  // 편백 노란기 보강 (map color multiplier)

  return (
    <group>
      {/* 상부 레일 — 천장 밀착 */}
      <mesh position={[x, topRailCenterY, zCenter]}>
        <boxGeometry args={[railX, railY, width]} />
        <meshStandardMaterial map={railTex} color={woodTint} roughness={0.8} />
      </mesh>
      {/* 하부 레일 */}
      <mesh position={[x, botRailCenterY, zCenter]}>
        <boxGeometry args={[railX, railY, width]} />
        <meshStandardMaterial map={railTex} color={woodTint} roughness={0.8} />
      </mesh>
      {/* 12 수직 살대 — 20×50mm 단면, 45° 회전 */}
      {Array.from({ length: slatCount }).map((_, i) => (
        <mesh key={`slat-${i}`} position={[x, slatCenterY, zStart + i * pitch]} rotation={[0, Math.PI * 3 / 4, 0]}>
          <boxGeometry args={[slatX, slatH, slatZ]} />
          <meshStandardMaterial map={slatTex} color={woodTint} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

