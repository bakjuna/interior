/**
 * 2단 커튼 (쉬어 + 암막) — 남벽(z=LR_D) 공용 컴포넌트. 안방/거실에서 재사용.
 * 4단계 F 인터랙션 사이클 (cursor 0~3 → 0):
 *   0: 완전암막 (둘 다 내림)
 *   1: 반투명만 (쉬어 내림, 암막 옆으로)
 *   2: 완전오픈 (둘 다 옆으로)
 *   3: 반투명만 (= 1, 내려오는 중)
 * 애니메이션: openness 0→1 을 각 패널에 적용 (scale.x 축소 + 위치 이동).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DoorTooltip } from '../ui/DoorTooltip'
import { doorRegistry } from '../../systems/doorRegistry'
import type { DoorId } from '../../data/sectors'
import { LR_D, WALL_HEIGHT } from '../../data/apartment'

interface TwoLayerCurtainProps {
  doorId: DoorId
  xStart: number
  xEnd: number
  activeDoorId?: DoorId | null
  sheerColor?: string
  blackoutColor?: string
  soffitColor?: string
  sheerPleats?: number
  sheerAmplitude?: number
  blackoutPleats?: number
  blackoutAmplitude?: number
}

export function TwoLayerCurtain({
  doorId,
  xStart,
  xEnd,
  activeDoorId,
  sheerColor = '#f8f5ec',
  blackoutColor = '#55555a',
  soffitColor = '#f5f3f0',
  sheerPleats = 6,
  sheerAmplitude = 0.020,
  blackoutPleats = 7,
  blackoutAmplitude = 0.030,
}: TwoLayerCurtainProps) {
  const winCenter = (xStart + xEnd) / 2
  const halfW = (xEnd - xStart) / 2

  // 커튼박스 soffit — 단내림(WALL_HEIGHT-0.15=2.05) 아래로 100mm, 벽에서 200mm 깊이
  const dropBottomY = WALL_HEIGHT - 0.15   // 2.05
  const boxDrop = 0.10
  const boxBotY = dropBottomY - boxDrop    // 1.95
  const boxHorizD = 0.20
  const boxCenterZ = LR_D - boxHorizD / 2

  const rodY = boxBotY - 0.015
  const topY = boxBotY - 0.005
  const botY = 0.03
  const cHeight = topY - botY
  const cCenterY = (topY + botY) / 2

  const sheerZ = LR_D - 0.080
  const blackoutZ = LR_D - 0.160
  const blackoutStep = 0.002  // 암막 좌/우 패널 Z 단차 (완전 닫힘 시 중앙 오버랩)
  const blackoutZL = blackoutZ
  const blackoutZR = blackoutZ - blackoutStep
  const rodLen = (xEnd - xStart) + 0.04

  const sheerGeo = useMemo(
    () => buildCurtainGeo(halfW, cHeight, sheerPleats, sheerAmplitude),
    [halfW, cHeight, sheerPleats, sheerAmplitude],
  )
  const blackoutGeo = useMemo(
    () => buildCurtainGeo(halfW, cHeight, blackoutPleats, blackoutAmplitude),
    [halfW, cHeight, blackoutPleats, blackoutAmplitude],
  )

  // 최초 로딩 상태: '쉬어 마저 걷기' (cursor=1, state=1 → 쉬어 내림/암막 옆으로)
  const [cursor, setCursor] = useState(1)
  const state = ([0, 1, 2, 1] as const)[cursor]
  const labels = ['암막 걷기', '쉬어 마저 걷기', '쉬어 치기', '암막 치기']

  const toggleRef = useRef(() => {})
  toggleRef.current = () => setCursor(c => (c + 1) % 4)
  useEffect(() => {
    doorRegistry.register({
      id: doorId,
      position: [winCenter, LR_D - 0.4],
      y: 1.2,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [doorId, winCenter])

  const bunchRatio = 0.22
  // 최초 상태(cursor=1) 와 일치하도록 암막 openness 를 1 로 시작 (애니메이션 플리커 방지)
  const sheerOpenRef = useRef(0)
  const blackoutOpenRef = useRef(1)
  const sheerLRef = useRef<THREE.Group>(null)
  const sheerRRef = useRef<THREE.Group>(null)
  const blackoutLRef = useRef<THREE.Group>(null)
  const blackoutRRef = useRef<THREE.Group>(null)
  const { invalidate } = useThree()

  const applyPanel = (g: THREE.Group | null, sign: -1 | 1, openness: number) => {
    if (!g) return
    const scale = 1 - (1 - bunchRatio) * openness
    g.scale.x = scale
    if (sign < 0) g.position.x = xStart + (scale * halfW) / 2
    else          g.position.x = xEnd - (scale * halfW) / 2
  }

  // 마운트 직후 초기 openness 를 패널에 즉시 적용 (useFrame 첫 트리거 전까지 깜빡임 방지)
  useEffect(() => {
    applyPanel(sheerLRef.current, -1, sheerOpenRef.current)
    applyPanel(sheerRRef.current, +1, sheerOpenRef.current)
    applyPanel(blackoutLRef.current, -1, blackoutOpenRef.current)
    applyPanel(blackoutRRef.current, +1, blackoutOpenRef.current)
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const tSheer = state === 2 ? 1 : 0
    const tBlackout = state >= 1 ? 1 : 0
    let dirty = false
    const advance = (ref: { current: number }, target: number) => {
      const diff = target - ref.current
      if (Math.abs(diff) > 0.001) {
        ref.current += diff * Math.min(1, delta * 5)
        dirty = true
      } else if (ref.current !== target) {
        ref.current = target
        dirty = true
      }
    }
    advance(sheerOpenRef, tSheer)
    advance(blackoutOpenRef, tBlackout)
    if (dirty) {
      applyPanel(sheerLRef.current, -1, sheerOpenRef.current)
      applyPanel(sheerRRef.current, +1, sheerOpenRef.current)
      applyPanel(blackoutLRef.current, -1, blackoutOpenRef.current)
      applyPanel(blackoutRRef.current, +1, blackoutOpenRef.current)
      invalidate()
    }
  })

  const isActive = activeDoorId === doorId

  return (
    <group>
      {/* 커튼박스 soffit — 단내림 아래로 100mm, 벽에서 200mm */}
      <mesh position={[winCenter, (dropBottomY + boxBotY) / 2, boxCenterZ]}>
        <boxGeometry args={[xEnd - xStart, boxDrop, boxHorizD]} />
        <meshStandardMaterial color={soffitColor} roughness={0.4} metalness={0.02} />
      </mesh>

      {/* 쉬어 레일 — 창문 쪽 */}
      <mesh position={[winCenter, rodY, sheerZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, rodLen, 12]} />
        <meshStandardMaterial color="#c8c8c8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* 암막 레일 — 방 쪽 */}
      <mesh position={[winCenter, rodY, blackoutZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.009, 0.009, rodLen, 12]} />
        <meshStandardMaterial color="#2b2b2e" metalness={0.4} roughness={0.55} />
      </mesh>

      {/* 쉬어 좌측 */}
      <group ref={sheerLRef} position={[xStart + halfW / 2, cCenterY, sheerZ]}>
        <mesh geometry={sheerGeo}>
          <meshStandardMaterial
            color={sheerColor} roughness={0.95} metalness={0}
            alphaHash opacity={0.88} side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* 쉬어 우측 */}
      <group ref={sheerRRef} position={[xEnd - halfW / 2, cCenterY, sheerZ]}>
        <mesh geometry={sheerGeo}>
          <meshStandardMaterial
            color={sheerColor} roughness={0.95} metalness={0}
            alphaHash opacity={0.88} side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* 암막 좌측 — 벽 쪽 레벨 */}
      <group ref={blackoutLRef} position={[xStart + halfW / 2, cCenterY, blackoutZL]}>
        <mesh geometry={blackoutGeo}>
          <meshStandardMaterial color={blackoutColor} roughness={0.92} metalness={0} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* 암막 우측 — 방 쪽 레벨 (L 패널보다 2mm 앞, 완전 닫힘 시 중앙 단차) */}
      <group ref={blackoutRRef} position={[xEnd - halfW / 2, cCenterY, blackoutZR]}>
        <mesh geometry={blackoutGeo}>
          <meshStandardMaterial color={blackoutColor} roughness={0.92} metalness={0} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {isActive && (
        <DoorTooltip position={[winCenter, 1.8, LR_D - 0.25]} label={labels[cursor]} />
      )}
    </group>
  )
}

function buildCurtainGeo(width: number, height: number, pleats: number, amplitude: number) {
  const segs = pleats * 8
  const geo = new THREE.PlaneGeometry(width, height, segs, 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const freq = (pleats * 2 * Math.PI) / width
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    pos.setZ(i, -Math.sin(x * freq) * amplitude)  // -Z (방 쪽) 주름
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}
