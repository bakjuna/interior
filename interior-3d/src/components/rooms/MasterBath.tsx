/**
 * 안방욕실 — 변기 + 사각 세면대 + 슬라이딩 거울 수납장 + 간접조명.
 * 반벽: 북쪽(bB2 쪽)에 100mm 깊이, 890mm 높이.
 * 샤워부스/조적벽 없음.
 */

import { Suspense, useState, useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { Toilet } from '../models/Toilet'
import { tileGroutOnBeforeCompile } from '../primitives/bathroomTile'
import { useKTX2 } from '../../systems/useKTX2'
import type { DoorId } from '../../data/sectors'
import { doorRegistry } from '../../systems/doorRegistry'
import {
  WALL_HEIGHT,
  WALL_THICKNESS,
  mbBathLeft,
  mbBathRight,
  mbBathTop,
  mbBathBottom,
  mbDoorHinge,
  mbDoorEnd,
} from '../../data/apartment'

interface MasterBathProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn?: boolean
  activeDoorId?: DoorId | null
}

export function MasterBath({ visible, playerPos, allLightsOn, activeDoorId }: MasterBathProps) {
  const bathroomWallTex = useKTX2('/textures/bathroom-wall-tile.ktx2')

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

  const bL = mbBathLeft
  const bR = mbBathRight
  const bT = mbBathTop     // 남쪽 (문 쪽, Z = -WALL_THICKNESS)
  const bB = mbBathBottom   // 북쪽 (안쪽, 더 -Z)
  const innerW = bR - bL
  const innerD = Math.abs(bT - bB)
  const cX = (bL + bR) / 2
  const cZ = (bT + bB) / 2
  const tileW = 0.6
  const tileH = 1.2
  const tH = WALL_HEIGHT + 0.020  // 타일 높이 (20mm 연장)
  const tCY = tH / 2 - 0.020     // 타일 중심 Y

  const mbBathActive = !!allLightsOn || (!!playerPos && playerPos[0] >= bL && playerPos[0] <= bR && playerPos[1] >= bB && playerPos[1] <= bT)

  // 반벽: 북쪽(bB)에 밀착, 100mm 깊이, 890mm 높이
  const halfWallD = 0.100
  const halfWallH = 0.890

  // 세면대 위치
  const sinkTopY = 0.880
  const sinkH = 0.150
  const sinkW = 0.500      // X방향
  const sinkD = 0.420      // Z방향 (벽에서 돌출)
  const sinkT = 0.015
  const sinkX = bL + 1.00  // 세면대 중심 X
  const sinkWestZ = bB + halfWallD  // 반벽 남측면에 밀착
  const sinkEastZ = sinkWestZ + sinkD
  const sinkCZ = sinkWestZ + sinkD / 2
  const sinkCY = sinkTopY - sinkH / 2
  const westMargin = 0.100
  const basinDepth = 0.080
  const basinWestZ = sinkWestZ + westMargin
  const basinEastZ = sinkEastZ - sinkT
  const basinD = basinEastZ - basinWestZ
  const basinCZ = (basinWestZ + basinEastZ) / 2

  // 거울 수납장 치수 — 벽(bB+halfWallD)에 밀착, 천장-100mm
  const mcD = 0.150
  const mcBottomY = 1.05
  const mcTopY = WALL_HEIGHT - 0.1
  const mcH = mcTopY - mcBottomY
  const mcCY = (mcBottomY + mcTopY) / 2
  const mcXmin = bL + sinkT
  const mcXmax = bR - sinkT
  const mcW = mcXmax - mcXmin
  const mcCX = (mcXmin + mcXmax) / 2
  const mcZ = bB + halfWallD + mcD / 2
  const mcPanelW = mcW / 2
  const mcT = 0.005

  // 슬라이딩 도어
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
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
      id: 'mb-bath-mirror-l',
      position: [mcXmin + mcPanelW / 2, mcZ + mcD / 2],
      toggle: () => leftToggleRef.current(),
    })
    doorRegistry.register({
      id: 'mb-bath-mirror-r',
      position: [mcXmin + mcPanelW + mcPanelW / 2, mcZ + mcD / 2],
      toggle: () => rightToggleRef.current(),
    })
    return () => {
      doorRegistry.unregister('mb-bath-mirror-l')
      doorRegistry.unregister('mb-bath-mirror-r')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let moved = false
    // 좌측: 패널A → 좌측(-X) 슬라이딩
    const tA = leftOpen ? mcPanelW * 0.9 : 0
    const dA = tA - slideARef.current
    if (Math.abs(dA) > 0.0005) {
      slideARef.current += dA * Math.min(1, delta * 6)
      if (panelARef.current) panelARef.current.position.x = slideARef.current
      moved = true
    }
    // 우측: 패널B → 우측(+X) 슬라이딩
    const tB = rightOpen ? -mcPanelW * 0.9 : 0
    const dB = tB - slideBRef.current
    if (Math.abs(dB) > 0.0005) {
      slideBRef.current += dB * Math.min(1, delta * 6)
      if (panelBRef.current) panelBRef.current.position.x = slideBRef.current
      moved = true
    }
    if (moved) invalidate()
  })

  // Reflector
  const mirrorA = useRef<InstanceType<typeof Reflector> | null>(null)
  const mirrorB = useRef<InstanceType<typeof Reflector> | null>(null)
  if (!mirrorA.current) {
    mirrorA.current = new Reflector(new THREE.PlaneGeometry(mcPanelW - 0.004, mcH - 0.004), {
      textureWidth: 256, textureHeight: 256, color: 0xc8ccd0, clipBias: 0.003,
    })
  }
  if (!mirrorB.current) {
    mirrorB.current = new Reflector(new THREE.PlaneGeometry(mcPanelW - 0.004, mcH - 0.004), {
      textureWidth: 256, textureHeight: 256, color: 0xc8ccd0, clipBias: 0.003,
    })
  }
  const nearMirror = !!playerPos && (
    Math.hypot(playerPos[0] - mcCX, playerPos[1] - mcZ) < 1.6
  )
  useEffect(() => {
    if (mirrorA.current) mirrorA.current.visible = nearMirror
    if (mirrorB.current) mirrorB.current.visible = nearMirror
  }, [nearMirror])

  const isCabActiveL = activeDoorId === 'mb-bath-mirror-l'
  const isCabActiveR = activeDoorId === 'mb-bath-mirror-r'

  // 도어 관련
  const doorH = 2.1
  const doorXmin = mbDoorHinge
  const doorXmax = mbDoorEnd
  const doorXc = (doorXmin + doorXmax) / 2
  const doorW = doorXmax - doorXmin
  const aboveH = WALL_HEIGHT - doorH
  const leftLen = doorXmin - bL
  const rightLen = bR - doorXmax

  const toiletX = bL + 0.40
  const toiletZ = bB + 0.30

  const whiteMat = { color: '#ffffff', roughness: 0.1, metalness: 0.05 } as const
  const chromeMat = { color: '#c8c8c8', metalness: 0.9, roughness: 0.15 } as const

  return (
    <>
      {/* lights */}
      <pointLight position={[cX, WALL_HEIGHT - 0.3, cZ]} intensity={mbBathActive ? 1.5 : 0} distance={3} decay={1.5} color="#ffffff" castShadow shadow-mapSize-width={128} shadow-mapSize-height={128} shadow-bias={-0.002} />
      {/* 거울 수납장 하단 간접조명 */}
      <rectAreaLight
        position={[mcCX, mcBottomY - 0.002, bB + halfWallD + 0.006]}
        width={mcW}
        height={0.010}
        intensity={mbBathActive ? 60 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <group visible={visible}>
      {/* === 벽 타일 (20mm 연장) === */}
      {/* 서측벽 */}
      <mesh position={[bL + 0.001, tCY, cZ]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[innerD, tH]} />
        <meshStandardMaterial map={makeTileTex(innerD / tileW, tH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      {/* 동측벽 */}
      <mesh position={[bR - 0.001, tCY, cZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[innerD, tH]} />
        <meshStandardMaterial map={makeTileTex(innerD / tileW, tH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      {/* 남측벽 (문 위) */}
      {aboveH > 0.001 && (
        <mesh position={[doorXc, doorH + aboveH / 2, bT - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[doorW, aboveH]} />
          <meshStandardMaterial map={makeTileTex(doorW / tileW, aboveH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {leftLen > 0.001 && (
        <mesh position={[(bL + doorXmin) / 2, tCY, bT - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[leftLen, tH]} />
          <meshStandardMaterial map={makeTileTex(leftLen / tileW, tH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {rightLen > 0.001 && (
        <mesh position={[(doorXmax + bR) / 2, tCY, bT - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[rightLen, tH]} />
          <meshStandardMaterial map={makeTileTex(rightLen / tileW, tH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {/* 북측벽 */}
      <mesh position={[cX, tCY, bB + 0.001]}>
        <planeGeometry args={[innerW, tH]} />
        <meshStandardMaterial map={makeTileTex(innerW / tileW, tH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>

      {/* 북측 반벽 (100mm 깊이, 890mm 높이, 20mm 연장) */}
      <mesh position={[cX, (halfWallH + 0.020) / 2 - 0.020, bB + halfWallD / 2]}>
        <boxGeometry args={[innerW, halfWallH + 0.020, halfWallD]} />
        <meshStandardMaterial map={makeTileTex(innerW / tileW, halfWallH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      {/* 반벽 상면 타일 */}
      <mesh position={[cX, halfWallH, bB + halfWallD / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[innerW, halfWallD]} />
        <meshStandardMaterial map={makeTileTex(innerW / tileW, halfWallD / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>

      {/* 변기 */}
      <Suspense fallback={null}>
        <Toilet position={[toiletX, 0, toiletZ]} rotation={0} scale={0.4} />
      </Suspense>

      {/* 사각 벽걸이 세면대 (반벽 남측면 밀착, 상단 880mm) */}
      <group>
        {/* 외벽 — 뒷면 (반벽 밀착) */}
        <mesh position={[sinkX, sinkCY, sinkWestZ + sinkT / 2]}>
          <boxGeometry args={[sinkW, sinkH, sinkT]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        {/* 외벽 — 좌측 */}
        <mesh position={[sinkX - sinkW / 2 + sinkT / 2, sinkCY, sinkCZ]}>
          <boxGeometry args={[sinkT, sinkH, sinkD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        {/* 외벽 — 우측 */}
        <mesh position={[sinkX + sinkW / 2 - sinkT / 2, sinkCY, sinkCZ]}>
          <boxGeometry args={[sinkT, sinkH, sinkD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        {/* 외벽 — 전면 */}
        <mesh position={[sinkX, sinkCY, sinkEastZ - sinkT / 2]}>
          <boxGeometry args={[sinkW, sinkH, sinkT]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        {/* 바닥판 */}
        <mesh position={[sinkX, sinkTopY - sinkH + sinkT / 2, sinkCZ]}>
          <boxGeometry args={[sinkW, sinkT, sinkD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        {/* 상단 림 */}
        <mesh position={[sinkX, sinkTopY - 0.005, sinkWestZ + westMargin / 2]}>
          <boxGeometry args={[sinkW, 0.010, westMargin]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[sinkX, sinkTopY - 0.005, basinEastZ + sinkT / 2]}>
          <boxGeometry args={[sinkW, 0.010, sinkT]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[sinkX - sinkW / 2 + sinkT / 2, sinkTopY - 0.005, basinCZ]}>
          <boxGeometry args={[sinkT, 0.010, basinD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[sinkX + sinkW / 2 - sinkT / 2, sinkTopY - 0.005, basinCZ]}>
          <boxGeometry args={[sinkT, 0.010, basinD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        {/* 분지 서측 내벽 */}
        <mesh position={[sinkX, sinkTopY - basinDepth / 2, basinWestZ]}>
          <boxGeometry args={[sinkW - sinkT * 2, basinDepth, sinkT]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.05} metalness={0.1} />
        </mesh>
        {/* 분지 바닥 */}
        <mesh position={[sinkX, sinkTopY - basinDepth, basinCZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[sinkW - sinkT * 2, basinD]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.05} metalness={0.1} />
        </mesh>
        {/* 배수구 */}
        <mesh position={[sinkX, sinkTopY - basinDepth + 0.001, basinCZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.018, 16]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* 수전 */}
        <mesh position={[sinkX, sinkTopY + 0.040, sinkWestZ + westMargin / 2 + 0.030]}>
          <boxGeometry args={[0.030, 0.090, 0.030]} />
          <meshStandardMaterial {...chromeMat} />
        </mesh>
        <mesh position={[sinkX, sinkTopY + 0.080, sinkWestZ + westMargin / 2 + 0.030 + 0.055]}>
          <boxGeometry args={[0.020, 0.015, 0.080]} />
          <meshStandardMaterial {...chromeMat} />
        </mesh>
        <mesh position={[sinkX, sinkTopY + 0.070, sinkWestZ + westMargin / 2 + 0.030 + 0.090]}>
          <cylinderGeometry args={[0.006, 0.006, 0.020, 8]} />
          <meshStandardMaterial {...chromeMat} />
        </mesh>
        {/* 타월바 */}
        <mesh position={[sinkX, sinkTopY - sinkH - 0.040, sinkEastZ - 0.025]}>
          <boxGeometry args={[sinkW - 0.060, 0.010, 0.010]} />
          <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[sinkX - sinkW / 2 + 0.035, sinkTopY - sinkH - 0.015, sinkEastZ - 0.025]}>
          <boxGeometry args={[0.010, 0.060, 0.010]} />
          <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[sinkX + sinkW / 2 - 0.035, sinkTopY - sinkH - 0.015, sinkEastZ - 0.025]}>
          <boxGeometry args={[0.010, 0.060, 0.010]} />
          <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* 슬라이딩 거울 수납장 — 2분할 중공 */}
      <group>
        {/* 중공 본체 */}
        <mesh position={[mcCX, mcCY, bB + halfWallD + mcT / 2]}>
          <boxGeometry args={[mcW, mcH, mcT]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[mcCX, mcTopY - mcT / 2, mcZ]}>
          <boxGeometry args={[mcW, mcT, mcD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[mcCX, mcBottomY + mcT / 2, mcZ]}>
          <boxGeometry args={[mcW, mcT, mcD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[mcXmin + mcT / 2, mcCY, mcZ]}>
          <boxGeometry args={[mcT, mcH, mcD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[mcXmax - mcT / 2, mcCY, mcZ]}>
          <boxGeometry args={[mcT, mcH, mcD]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        <mesh position={[mcCX, mcCY, mcZ]}>
          <boxGeometry args={[mcT, mcH - mcT * 2, mcD - mcT]} />
          <meshStandardMaterial {...whiteMat} />
        </mesh>
        {[1 / 3, 2 / 3].map((frac, i) => (
          <mesh key={`mc-shelf-${i}`} position={[mcCX, mcBottomY + mcH * frac, mcZ]}>
            <boxGeometry args={[mcW - mcT * 2, mcT, mcD - mcT * 2]} />
            <meshStandardMaterial {...whiteMat} />
          </mesh>
        ))}

        {/* 패널 A (좌측, 우측 인터랙션 시 좌측 슬라이딩) */}
        <group ref={panelARef}>
          {nearMirror ? (
            <primitive object={mirrorA.current!} position={[mcXmin + mcPanelW / 2, mcCY, mcZ + mcD / 2 + 0.001]} />
          ) : (
            <mesh position={[mcXmin + mcPanelW / 2, mcCY, mcZ + mcD / 2 + 0.001]}>
              <planeGeometry args={[mcPanelW - 0.004, mcH - 0.004]} />
              <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
            </mesh>
          )}
        </group>
        {/* 패널 B (우측, 15mm 돌출, 좌측 인터랙션 시 우측 슬라이딩) */}
        <group ref={panelBRef}>
          {nearMirror ? (
            <primitive object={mirrorB.current!} position={[mcXmin + mcPanelW + mcPanelW / 2, mcCY, mcZ + mcD / 2 + 0.016]} />
          ) : (
            <mesh position={[mcXmin + mcPanelW + mcPanelW / 2, mcCY, mcZ + mcD / 2 + 0.016]}>
              <planeGeometry args={[mcPanelW - 0.004, mcH - 0.004]} />
              <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
            </mesh>
          )}
          <mesh position={[mcXmin + mcPanelW + mcPanelW / 2, mcCY, mcZ + mcD / 2 + 0.001]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[mcPanelW, mcH]} />
            <meshStandardMaterial {...whiteMat} />
          </mesh>
          <mesh position={[mcXmin + mcPanelW + 0.001, mcCY, mcZ + mcD / 2 + 0.0085]}>
            <boxGeometry args={[mcT, mcH, 0.015]} />
            <meshStandardMaterial {...whiteMat} />
          </mesh>
          <mesh position={[mcXmax - 0.001, mcCY, mcZ + mcD / 2 + 0.0085]}>
            <boxGeometry args={[mcT, mcH, 0.015]} />
            <meshStandardMaterial {...whiteMat} />
          </mesh>
          <mesh position={[mcXmin + mcPanelW + mcPanelW / 2, mcTopY - 0.001, mcZ + mcD / 2 + 0.0085]}>
            <boxGeometry args={[mcPanelW, mcT, 0.015]} />
            <meshStandardMaterial {...whiteMat} />
          </mesh>
          <mesh position={[mcXmin + mcPanelW + mcPanelW / 2, mcBottomY + 0.001, mcZ + mcD / 2 + 0.0085]}>
            <boxGeometry args={[mcPanelW, mcT, 0.015]} />
            <meshStandardMaterial {...whiteMat} />
          </mesh>
        </group>

        {/* 하단 간접조명 LED 스트립 */}
        <mesh position={[mcCX, mcBottomY - 0.001, bB + halfWallD + 0.006]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[mcW, 0.010]} />
          <meshStandardMaterial
            color={mbBathActive ? '#fff' : '#444'}
            emissive={mbBathActive ? '#ffe0b0' : '#111'}
            emissiveIntensity={mbBathActive ? 3.0 : 0.1}
          />
        </mesh>
      </group>

      {/* 수납장 F키 툴팁 */}
      {isCabActiveL && (
        <Html position={[mcXmin + mcPanelW / 2, mcCY + 0.3, mcZ + mcD / 2 + 0.05]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(20,20,25,0.85)', color: '#fff5e6', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontFamily: 'system-ui, sans-serif', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none' }}>
            <kbd style={{ background: '#fff5e6', color: '#1a1a1a', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 12, border: '1px solid #888', boxShadow: '0 1px 0 #555' }}>F</kbd>
            <span>{leftOpen ? '수납장 닫기' : '수납장 열기'}</span>
          </div>
        </Html>
      )}
      {isCabActiveR && (
        <Html position={[mcXmin + mcPanelW + mcPanelW / 2, mcCY + 0.3, mcZ + mcD / 2 + 0.05]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(20,20,25,0.85)', color: '#fff5e6', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontFamily: 'system-ui, sans-serif', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none' }}>
            <kbd style={{ background: '#fff5e6', color: '#1a1a1a', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 12, border: '1px solid #888', boxShadow: '0 1px 0 #555' }}>F</kbd>
            <span>{rightOpen ? '수납장 닫기' : '수납장 열기'}</span>
          </div>
        </Html>
      )}
    </group>
    </>
  )
}
