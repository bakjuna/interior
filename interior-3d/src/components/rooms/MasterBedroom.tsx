/**
 * 안방 — 가벽 (50mm, 안방욕실 문쪽) + 화장대 (붙박이장 첫 자리, 4면 RectAreaLight 거울) + 침대.
 * 단내림 + 코브 LED는 shell/Ceilings.tsx.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { mirrorState, useMirrorEnabled } from '../../systems/mirrorToggle'
import { Bed } from '../models/Bed'
import { useKTX2 } from '../../systems/useKTX2'
import { DoorTooltip, getDoorLabel } from '../ui/DoorTooltip'
import { doorRegistry } from '../../systems/doorRegistry'
import type { DoorId } from '../../data/sectors'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  MB_W,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

interface MasterBedroomProps {
  visible: boolean
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
  allLightsOn?: boolean
}

export function MasterBedroom({ visible, activeDoorId, playerPos, allLightsOn }: MasterBedroomProps) {
  const silkTex = useKTX2('/textures/silk.ktx2')
  const closetDoorTex = useKTX2('/textures/walnut-closet-door.ktx2')

  // 안방 가벽 (안방욕실 문쪽~2600mm, 두께 50mm) — 실크벽지
  const partLen = 2.6
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
        {/* 안방 가벽 */}
        <mesh position={[mbLeft + 1.476, WALL_HEIGHT / 2, -T2 + 1.3]}>
          <boxGeometry args={[0.05, WALL_HEIGHT, partLen]} />
          <meshStandardMaterial map={silk} roughness={0.55} metalness={0} />
        </mesh>

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
    return new Reflector(geo, {
      textureWidth: 256, textureHeight: 256, color: 0xc8ccd0, clipBias: 0.003,
    })
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
      {/* 뒷판 */}
      <mesh position={[cabBackX, cabCY, vanityZ]}>
        <boxGeometry args={[panelT, cabH, cabW]} />
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
