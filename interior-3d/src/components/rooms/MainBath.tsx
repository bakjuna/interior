/**
 * 메인욕실 — 변기 + 세면대 + 거울/백라이트 + 샤워부스 + 변기 위 상부장.
 * 4면 600×1200 포세린 타일, 우측벽은 도어 개구부 분할.
 */

import { memo, Suspense, useState, useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { DoorTooltip } from '../ui/DoorTooltip'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { Toilet } from '../models/Toilet'
import { tileGroutOnBeforeCompile } from '../primitives/bathroomTile'
import { useKTX2 } from '../../systems/useKTX2'
import type { DoorId } from '../../data/sectors'
import { doorRegistry } from '../../systems/doorRegistry'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  mbDoorEnd,
} from '../../data/apartment'
import { useMirrorActive, makeNonRecursiveReflector, isReflectorVisible } from '../../systems/mirrorToggle'
import { playerSectorEqual } from '../../systems/visibility'

const T2 = WALL_THICKNESS / 2

interface MainBathProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn?: boolean
  activeDoorId?: DoorId | null
}

function MainBathInner({ visible, playerPos, allLightsOn, activeDoorId }: MainBathProps) {
  const bathroomWallTex = useKTX2('/textures/bathroom-wall-tile.ktx2')

  // 타일 텍스처 캐시 — 동일 (uRep, vRep) 조합은 1번만 clone
  const makeTileTex = useMemo(() => {
    const cache = new Map<string, THREE.Texture>()
    return (uRep: number, vRep: number) => {
      const key = `${uRep.toFixed(4)}|${vRep.toFixed(4)}`
      let t = cache.get(key)
      if (!t) {
        t = bathroomWallTex.clone()
        t.wrapS = THREE.RepeatWrapping
        t.wrapT = THREE.RepeatWrapping
        t.repeat.set(uRep, vRep)
        t.colorSpace = THREE.SRGBColorSpace
        cache.set(key, t)
      }
      return t
    }
  }, [bathroomWallTex])


  const bL = mbDoorEnd + 0.1 + T2
  const bR = bL + 1.413
  const bT = -WALL_THICKNESS
  const bB = bT - 2.173
  const cX = (bL + bR) / 2
  const innerW = bR - bL
  const innerD = Math.abs(bB - bT)

  const bathActive = !!allLightsOn || (!!playerPos && playerPos[0] >= bL && playerPos[0] <= bR && playerPos[1] >= bB && playerPos[1] <= bT)
  const halfWallD = 0.100  // 서측 반벽 깊이
  const halfWallH = 0.890  // 서측 반벽 높이 (+50mm)

  const tileW = 0.6
  const tileH = 1.2

  const showerDepth = 0.95
  const showerZend = bB + showerDepth
  const glassZ = showerZend - 0.2

  const vanW = 0.6
  const oriVanZ = showerZend + 0.15 + vanW / 2
  const vanZ = showerZend + 0 + vanW / 2

  // 거울 수납장 치수 — 천장-100mm까지, 북쪽 70mm 확장
  const mcD = 0.150
  const mcBottomY = 1.05
  const mcTopY = WALL_HEIGHT - 0.1
  const mcH = mcTopY - mcBottomY
  const mcCY = (mcBottomY + mcTopY) / 2
  const mcZmin = showerZend - 0.070  // 북쪽 70mm 확장
  const mcZmax = bT - 0.001         // 남측 벽 밀착
  const mcW = mcZmax - mcZmin
  const mcZ = (mcZmin + mcZmax) / 2
  const mcX = bL + mcD / 2
  const mcPanelW = mcW / 2           // 2분할 패널 폭
  const mcT = 0.005                  // 패널/벽 두께

  // 슬라이딩 도어 상태 — 좌측(패널B 슬라이딩) / 우측(패널A 슬라이딩)
  const [leftOpen, setLeftOpen] = useState(false)   // 좌측: 패널B→북쪽 슬라이딩
  const [rightOpen, setRightOpen] = useState(false)  // 우측: 패널A→남쪽 슬라이딩
  const panelARef = useRef<THREE.Group>(null)
  const panelBRef = useRef<THREE.Group>(null)
  const slideARef = useRef(0)
  const slideBRef = useRef(0)
  const { invalidate } = useThree()

  const leftToggleRef = useRef(() => setLeftOpen((o) => !o))
  leftToggleRef.current = () => setLeftOpen((o) => !o)
  const rightToggleRef = useRef(() => setRightOpen((o) => !o))
  rightToggleRef.current = () => setRightOpen((o) => !o)

  useEffect(() => {
    doorRegistry.register({
      id: 'bath-mirror-n',
      position: [bL + mcD, mcZmin + mcPanelW / 2],
      toggle: () => rightToggleRef.current(),
    })
    doorRegistry.register({
      id: 'bath-mirror-s',
      position: [bL + mcD, mcZmin + mcPanelW + mcPanelW / 2],
      toggle: () => leftToggleRef.current(),
    })
    return () => {
      doorRegistry.unregister('bath-mirror-n')
      doorRegistry.unregister('bath-mirror-s')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { doorRegistry.setOpenState('bath-mirror-n', rightOpen) }, [rightOpen])
  useEffect(() => { doorRegistry.setOpenState('bath-mirror-s', leftOpen) }, [leftOpen])

  // 슬라이딩 애니메이션
  // 좌측 인터랙션: 패널B → 북쪽(-Z) 슬라이딩
  // 우측 인터랙션: 패널A → 남쪽(+Z) 슬라이딩
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let moved = false
    const tB = leftOpen ? -mcPanelW * 0.9 : 0
    const dB = tB - slideBRef.current
    if (Math.abs(dB) > 0.0005) {
      slideBRef.current += dB * Math.min(1, delta * 6)
      if (panelBRef.current) panelBRef.current.position.z = slideBRef.current
      moved = true
    }
    const tA = rightOpen ? mcPanelW * 0.9 : 0
    const dA = tA - slideARef.current
    if (Math.abs(dA) > 0.0005) {
      slideARef.current += dA * Math.min(1, delta * 6)
      if (panelARef.current) panelARef.current.position.z = slideARef.current
      moved = true
    }
    if (moved) invalidate()
  })

  // Reflector — 1.6m 이내에서만 렌더링
  const bathMirrorA = useRef<InstanceType<typeof Reflector> | null>(null)
  const bathMirrorB = useRef<InstanceType<typeof Reflector> | null>(null)
  if (!bathMirrorA.current) {
    bathMirrorA.current = makeNonRecursiveReflector(new Reflector(new THREE.PlaneGeometry(mcPanelW - 0.004, mcH - 0.004), {
      textureWidth: 512, textureHeight: 512, color: 0xc8ccd0, clipBias: 0.003,
    }))
  }
  if (!bathMirrorB.current) {
    bathMirrorB.current = makeNonRecursiveReflector(new Reflector(new THREE.PlaneGeometry(mcPanelW - 0.004, mcH - 0.004), {
      textureWidth: 512, textureHeight: 512, color: 0xc8ccd0, clipBias: 0.003,
    }))
  }
  const sectorActive = useMirrorActive('mainBath', playerPos)
  const showReflector = sectorActive
  useFrame(({ camera }) => {
    const a = bathMirrorA.current, b = bathMirrorB.current
    if (a) { const v = sectorActive && isReflectorVisible(a, camera); if (a.visible !== v) a.visible = v }
    if (b) { const v = sectorActive && isReflectorVisible(b, camera); if (b.visible !== v) b.visible = v }
  })

  const isBathCabActiveN = activeDoorId === 'bath-mirror-n'
  const isBathCabActiveS = activeDoorId === 'bath-mirror-s'

  const toiletL = 0.68
  const toiletZ = oriVanZ + vanW / 2 - 0.2 + toiletL / 2

  const doorH = 2.1
  const doorW = 0.9
  const doorZ = -WALL_THICKNESS - 0.1 - 0.45
  const doorZmin = doorZ - doorW / 2
  const doorZmax = doorZ + doorW / 2
  const aboveH = WALL_HEIGHT - doorH
  const leftLen = doorZmin - bB
  const rightLen = bT - doorZmax

  return (
    <>
      {/* lights outside visible group */}
      <pointLight position={[cX, WALL_HEIGHT - 0.3, (bT + bB) / 2]} intensity={bathActive ? 1.5 : 0} distance={3} decay={1.5} color="#ffffff" castShadow shadow-mapSize-width={128} shadow-mapSize-height={128} shadow-bias={-0.002} />
      {/* 거울 수납장 하단 LED 간접조명 (오픈선반 스타일) */}
      <rectAreaLight
        position={[bL + 0.006, mcBottomY - 0.002, mcZ]}
        width={0.010}
        height={mcW}
        intensity={bathActive ? 60 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <group visible={visible}>
      {/* === 벽 타일 === */}
      <mesh position={[bL + 0.001, (WALL_HEIGHT + 0.020) / 2 - 0.020, (bT + bB) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[innerD, WALL_HEIGHT + 0.020]} />
        <meshStandardMaterial map={makeTileTex(innerD / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      {aboveH > 0.001 && (
        <mesh position={[bR - 0.001, doorH + aboveH / 2, doorZ]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[doorW, aboveH]} />
          <meshStandardMaterial map={makeTileTex(doorW / tileW, aboveH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {leftLen > 0.001 && (
        <mesh position={[bR - 0.001, (WALL_HEIGHT + 0.020) / 2 - 0.020, (bB + doorZmin) / 2]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[leftLen, WALL_HEIGHT + 0.020]} />
          <meshStandardMaterial map={makeTileTex(leftLen / tileW, (WALL_HEIGHT + 0.020) / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {rightLen > 0.001 && (
        <mesh position={[bR - 0.001, (WALL_HEIGHT + 0.020) / 2 - 0.020, (doorZmax + bT) / 2]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[rightLen, WALL_HEIGHT + 0.020]} />
          <meshStandardMaterial map={makeTileTex(rightLen / tileW, (WALL_HEIGHT + 0.020) / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      <mesh position={[cX, (WALL_HEIGHT + 0.020) / 2 - 0.020, bT - 0.001]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[innerW, WALL_HEIGHT + 0.020]} />
        <meshStandardMaterial map={makeTileTex(innerW / tileW, (WALL_HEIGHT + 0.020) / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      <mesh position={[cX, (WALL_HEIGHT + 0.020) / 2 - 0.020, bB + 0.001]}>
        <planeGeometry args={[innerW, WALL_HEIGHT + 0.020]} />
        <meshStandardMaterial map={makeTileTex(innerW / tileW, (WALL_HEIGHT + 0.020) / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>

      {/* 서측 반벽 (깊이 100mm, 높이 890mm) */}
      <mesh position={[bL + halfWallD / 2, (halfWallH + 0.020) / 2 - 0.020, (bT + bB) / 2]}>
        <boxGeometry args={[halfWallD, halfWallH + 0.020, innerD]} />
        <meshStandardMaterial map={makeTileTex(innerD / tileW, halfWallH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      {/* 반벽 상면 타일 */}
      <mesh position={[bL + halfWallD / 2, halfWallH, (bT + bB) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfWallD, innerD]} />
        <meshStandardMaterial map={makeTileTex(halfWallD / tileW, innerD / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>

      {/* 변기 */}
      <Suspense fallback={null}>
        <Toilet position={[bL + 0.30, 0, toiletZ]} rotation={Math.PI / 2} scale={0.4} />
      </Suspense>

      {/* 사각 벽걸이 세면대 (상단 880mm, 벽 밀착) */}
      {(() => {
        const sinkTopY = 0.880
        const sinkH = 0.150
        const sinkW = 0.500
        const sinkD = 0.420
        const sinkT = 0.015
        const sinkCY = sinkTopY - sinkH / 2
        const sinkWestX = bL + halfWallD
        const sinkEastX = sinkWestX + sinkD
        const sinkCX = sinkWestX + sinkD / 2
        const sinkZ = vanZ
        const basinDepth = 0.080
        const westMargin = 0.100
        const basinWestX = sinkWestX + westMargin
        const basinEastX = sinkEastX - sinkT
        const basinNorthZ = sinkZ - sinkW / 2 + sinkT
        const basinSouthZ = sinkZ + sinkW / 2 - sinkT
        const basinD = basinEastX - basinWestX
        const basinW = basinSouthZ - basinNorthZ
        const basinCX = (basinWestX + basinEastX) / 2
        const whiteMat = { color: '#ffffff', roughness: 0.1, metalness: 0.05 } as const
        const chromeMat = { color: '#c8c8c8', metalness: 0.9, roughness: 0.15 } as const

        return (
          <group>
            {/* 외벽 4면 + 바닥 = 솔리드 박스 (상단 열림) */}
            <mesh position={[sinkWestX + sinkT / 2, sinkCY, sinkZ]}>
              <boxGeometry args={[sinkT, sinkH, sinkW]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>
            <mesh position={[sinkCX, sinkCY, sinkZ - sinkW / 2 + sinkT / 2]}>
              <boxGeometry args={[sinkD, sinkH, sinkT]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>
            <mesh position={[sinkCX, sinkCY, sinkZ + sinkW / 2 - sinkT / 2]}>
              <boxGeometry args={[sinkD, sinkH, sinkT]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>
            <mesh position={[sinkEastX - sinkT / 2, sinkCY, sinkZ]}>
              <boxGeometry args={[sinkT, sinkH, sinkW]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>
            <mesh position={[sinkCX, sinkTopY - sinkH + sinkT / 2, sinkZ]}>
              <boxGeometry args={[sinkD, sinkT, sinkW]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>

            {/* 상단 림: 서측 100mm 솔리드 블록 */}
            <mesh position={[sinkWestX + westMargin / 2, sinkTopY - 0.005, sinkZ]}>
              <boxGeometry args={[westMargin, 0.010, sinkW]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>
            {/* 상단 림: 북측 스트립 */}
            <mesh position={[basinCX, sinkTopY - 0.005, basinNorthZ - sinkT / 2]}>
              <boxGeometry args={[basinD, 0.010, sinkT]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>
            {/* 상단 림: 남측 스트립 */}
            <mesh position={[basinCX, sinkTopY - 0.005, basinSouthZ + sinkT / 2]}>
              <boxGeometry args={[basinD, 0.010, sinkT]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>
            {/* 상단 림: 동측 스트립 */}
            <mesh position={[basinEastX + sinkT / 2, sinkTopY - 0.005, sinkZ]}>
              <boxGeometry args={[sinkT, 0.010, sinkW]} />
              <meshStandardMaterial {...whiteMat} />
            </mesh>

            {/* 분지: 서측 내벽 (유일한 내벽 — 나머지 3면은 외벽이 겸함) */}
            <mesh position={[basinWestX, sinkTopY - basinDepth / 2, sinkZ]}>
              <boxGeometry args={[sinkT, basinDepth, basinW]} />
              <meshStandardMaterial color="#f5f5f5" roughness={0.05} metalness={0.1} />
            </mesh>
            {/* 분지 바닥 */}
            <mesh position={[basinCX, sinkTopY - basinDepth, sinkZ]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[basinD, basinW]} />
              <meshStandardMaterial color="#f0f0f0" roughness={0.05} metalness={0.1} />
            </mesh>
            {/* 배수구 */}
            <mesh position={[basinCX, sinkTopY - basinDepth + 0.001, sinkZ]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.018, 16]} />
              <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* 수전 — 세면대 서측 솔리드 위에서 시작 */}
            {/* 베이스 기둥 (세면대 림에서 솟아오름) */}
            <mesh position={[sinkWestX + westMargin / 2 + 0.030, sinkTopY + 0.040, sinkZ]}>
              <boxGeometry args={[0.030, 0.090, 0.030]} />
              <meshStandardMaterial {...chromeMat} />
            </mesh>
            {/* 수평 팔 */}
            <mesh position={[sinkWestX + westMargin / 2 + 0.030 + 0.055, sinkTopY + 0.080, sinkZ]}>
              <boxGeometry args={[0.080, 0.015, 0.020]} />
              <meshStandardMaterial {...chromeMat} />
            </mesh>
            {/* 토출구 */}
            <mesh position={[sinkWestX + westMargin / 2 + 0.030 + 0.090, sinkTopY + 0.070, sinkZ]}>
              <cylinderGeometry args={[0.006, 0.006, 0.020, 8]} />
              <meshStandardMaterial {...chromeMat} />
            </mesh>

            {/* 타월바 + 브라켓 (+20mm 상승, -20mm 서쪽) */}
            <mesh position={[sinkEastX - 0.025, sinkTopY - sinkH - 0.040, sinkZ]}>
              <boxGeometry args={[0.010, 0.010, sinkW - 0.060]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[sinkEastX - 0.025, sinkTopY - sinkH - 0.015, sinkZ - sinkW / 2 + 0.035]}>
              <boxGeometry args={[0.010, 0.060, 0.010]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[sinkEastX - 0.025, sinkTopY - sinkH - 0.015, sinkZ + sinkW / 2 - 0.035]}>
              <boxGeometry args={[0.010, 0.060, 0.010]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
            </mesh>
          </group>
        )
      })()}

      {/* 슬라이딩 거울 수납장 — 2분할 중공, F키 슬라이딩 */}
      <group>
        {/* 중공 본체: 뒷판 + 상판 + 하판 + 북측면 + 남측면 + 중앙 칸막이 */}
        <mesh position={[bL + mcT / 2, mcCY, mcZ]}>
          <boxGeometry args={[mcT, mcH, mcW]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[mcX, mcTopY - mcT / 2, mcZ]}>
          <boxGeometry args={[mcD, mcT, mcW]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[mcX, mcBottomY + mcT / 2, mcZ]}>
          <boxGeometry args={[mcD, mcT, mcW]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[mcX, mcCY, mcZmin + mcT / 2]}>
          <boxGeometry args={[mcD, mcH, mcT]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[mcX, mcCY, mcZmax - mcT / 2]}>
          <boxGeometry args={[mcD, mcH, mcT]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[mcX, mcCY, mcZ]}>
          <boxGeometry args={[mcD - mcT, mcH - mcT * 2, mcT]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* 내부 선반 각 칸 2개씩 */}
        {[1 / 3, 2 / 3].map((frac, i) => (
          <mesh key={`mc-shelf-${i}`} position={[mcX, mcBottomY + mcH * frac, mcZ]}>
            <boxGeometry args={[mcD - mcT * 2, mcT, mcW - mcT * 2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
        ))}

        {/* 거울 패널 A (북쪽 반, 우측 인터랙션 시 남쪽 슬라이딩) */}
        <group ref={panelARef}>
          {showReflector ? (
            <primitive object={bathMirrorA.current!} position={[mcX + mcD / 2 + 0.001, mcCY, mcZmin + mcPanelW / 2]} rotation={[0, Math.PI / 2, 0]} />
          ) : (
            <mesh position={[mcX + mcD / 2 + 0.001, mcCY, mcZmin + mcPanelW / 2]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[mcPanelW - 0.004, mcH - 0.004]} />
              <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
            </mesh>
          )}
        </group>
        {/* 슬라이딩 거울 패널 B (남쪽 반, 15mm 돌출) */}
        <group ref={panelBRef}>
          {/* 거울면 (15mm 돌출) */}
          {showReflector ? (
            <primitive object={bathMirrorB.current!} position={[mcX + mcD / 2 + 0.016, mcCY, mcZmin + mcPanelW + mcPanelW / 2]} rotation={[0, Math.PI / 2, 0]} />
          ) : (
            <mesh position={[mcX + mcD / 2 + 0.016, mcCY, mcZmin + mcPanelW + mcPanelW / 2]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[mcPanelW - 0.004, mcH - 0.004]} />
              <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
            </mesh>
          )}
          {/* 뒷면 */}
          <mesh position={[mcX + mcD / 2 + 0.001, mcCY, mcZmin + mcPanelW + mcPanelW / 2]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[mcPanelW, mcH]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* 북쪽 옆면 (패널A와 맞닿는 면) */}
          <mesh position={[mcX + mcD / 2 + 0.0085, mcCY, mcZmin + mcPanelW + 0.001]}>
            <boxGeometry args={[0.015, mcH, mcT]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* 남쪽 옆면 */}
          <mesh position={[mcX + mcD / 2 + 0.0085, mcCY, mcZmax - 0.001]}>
            <boxGeometry args={[0.015, mcH, mcT]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* 상면 */}
          <mesh position={[mcX + mcD / 2 + 0.0085, mcTopY - 0.001, mcZmin + mcPanelW + mcPanelW / 2]}>
            <boxGeometry args={[0.015, mcT, mcPanelW]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* 하면 */}
          <mesh position={[mcX + mcD / 2 + 0.0085, mcBottomY + 0.001, mcZmin + mcPanelW + mcPanelW / 2]}>
            <boxGeometry args={[0.015, mcT, mcPanelW]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
        </group>

        {/* 하단 간접조명 — LED 스트립 */}
        <mesh position={[bL + 0.006, mcBottomY - 0.001, mcZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.010, mcW]} />
          <meshStandardMaterial
            color={bathActive ? '#fff' : '#444'}
            emissive={bathActive ? '#ffe0b0' : '#111'}
            emissiveIntensity={bathActive ? 3.0 : 0.1}
          />
        </mesh>
      </group>

      {/* 거울 수납장 F키 툴팁 — 좌측 */}
      {isBathCabActiveN && (
        <DoorTooltip position={[mcX + mcD / 2 + 0.05, mcCY + 0.3, mcZmin + mcPanelW / 2]} label={leftOpen ? '욕실 거울장 좌 닫기' : '욕실 거울장 좌 열기'} />
      )}
      {/* 거울 수납장 F키 툴팁 — 우측 */}
      {isBathCabActiveS && (
        <DoorTooltip position={[mcX + mcD / 2 + 0.05, mcCY + 0.3, mcZmin + mcPanelW + mcPanelW / 2]} label={rightOpen ? '욕실 거울장 우 닫기' : '욕실 거울장 우 열기'} />
      )}

      {/* 샤워부스 */}
      {(() => {
        const glassH = 2.0
        const masonryW = innerW * 0.3  // 서측 조적벽 폭
        const masonryT = 0.100         // 조적벽 두께
        const masonryCx = bL + masonryW / 2 + 0.01
        return (
          <group>
            {/* 서측 조적벽 (유리 → 100mm 조적, 바닥~천장) */}
            <mesh position={[masonryCx, (WALL_HEIGHT + 0.020) / 2 - 0.020, glassZ]}>
              <boxGeometry args={[masonryW, WALL_HEIGHT + 0.020, masonryT]} />
              <meshStandardMaterial map={makeTileTex(masonryW / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
            </mesh>
            {/* 동측 유리 (변경 없음) */}
            <mesh position={[bR - (innerW * 0.3) / 2 - 0.01, glassH / 2 + 0.02, glassZ]}>
              <boxGeometry args={[innerW * 0.3, glassH, 0.008]} />
              <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
            </mesh>
            {/* 중앙 유리 (도어) */}
            <mesh position={[cX, glassH / 2 + 0.02, glassZ - 0.001]}>
              <boxGeometry args={[innerW * 0.4, glassH - 0.05, 0.008]} />
              <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
            </mesh>
            {/* 도어 핸들 */}
            <mesh position={[cX + 0.18, 1.05, glassZ - 0.05]}>
              <boxGeometry args={[0.02, 0.18, 0.02]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* 상단 레일 (조적벽 제외, 중앙+동측만) */}
            <mesh position={[cX + masonryW * 0.15, glassH + 0.02, glassZ]}>
              <boxGeometry args={[innerW * 0.7 - 0.02, 0.025, 0.025]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        )
      })()}
    </group>
    </>
  )
}

// useMirrorActive('mainBath') sector 정책 ['entrance','hall','mainBath'] 도 sector
// 바뀔 때만 변화. bathActive bounds 도 마찬가지 — sector 동일하면 skip.
export const MainBath = memo(MainBathInner, (prev, next) => {
  if (prev.visible !== next.visible) return false
  if (prev.allLightsOn !== next.allLightsOn) return false
  if (prev.activeDoorId !== next.activeDoorId) return false
  return playerSectorEqual(prev.playerPos, next.playerPos)
})
