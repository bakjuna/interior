/**
 * 원목 블라인드 (베네치안 스타일) — 가로 슬랫 N개, F 인터랙션 3단 사이클.
 * 상태:
 *   0: 완전 걷힘 (슬랫 전부 상단 집결) — 디폴트
 *   1: 펼침 + 45° 기울임
 *   2: 펼침 + 완전 차단 (85° 근접)
 * 애니메이션: ext 0↔1 (위치), tilt 0↔target (회전) 을 부드럽게 보간.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DoorTooltip } from '../ui/DoorTooltip'
import { doorRegistry } from '../../systems/doorRegistry'
import type { DoorId } from '../../data/sectors'
import { useKTX2 } from '../../systems/useKTX2'

interface WoodBlindProps {
  doorId: DoorId
  /** 창문 센터 X (axis='x') 또는 Z (axis='z') 에 해당하지 않는 축) */
  windowCenterX: number
  /** 창문 센터 Z */
  windowCenterZ: number
  /** 창문 방향 — Opening.axis 와 동일 */
  windowAxis: 'x' | 'z'
  /** 창문 폭 (axis 방향) */
  windowWidth: number
  /** 창문 상단 Y (바닥 기준) */
  windowTop: number
  /** 실내 쪽 방향 (+1 / -1) — 벽 센터에서 실내 쪽으로 +axisPerp 방향이면 +1 */
  roomSide?: -1 | 1
  /** 블라인드 폭 (기본: windowWidth + 80mm) */
  width?: number
  /** 블라인드 최상단 Y (기본: windowTop + 100mm) */
  topY?: number
  /** 펼침 시 블라인드 최하단 Y (기본: 50mm) */
  botY?: number
  activeDoorId?: DoorId | null
}

export function WoodBlind({
  doorId,
  windowCenterX,
  windowCenterZ,
  windowAxis,
  windowWidth,
  windowTop,
  roomSide = 1,
  width,
  topY,
  botY = 0.05,
  activeDoorId,
}: WoodBlindProps) {
  const blindW = width ?? windowWidth + 0.08
  const bTopY = topY ?? windowTop + 0.10
  const bBotY = botY
  const extendedRange = bTopY - bBotY

  const slatWidth = 0.050    // 슬랫 폭 (회전축 수직, 50mm)
  const slatT = 0.003        // 슬랫 두께 (3mm)
  const pitch = 0.048        // 슬랫 간 pitch (48mm)
  const slatCount = Math.max(1, Math.floor((extendedRange - slatT) / pitch))

  const oakBaseTex = useKTX2('/textures/oak-wood.ktx2')
  const oakTex = useMemo(() => {
    const t = oakBaseTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(Math.max(1, blindW / 0.4), 1)  // 400mm 당 1 타일
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [oakBaseTex, blindW])

  const [cursor, setCursor] = useState(0)
  const labels = ['블라인드 45°로 내리기', '완전 차단', '블라인드 걷기']

  const toggleRef = useRef(() => {})
  toggleRef.current = () => setCursor(c => (c + 1) % 3)
  useEffect(() => {
    const regX = windowAxis === 'x' ? windowCenterX : windowCenterX + roomSide * 0.5
    const regZ = windowAxis === 'x' ? windowCenterZ + roomSide * 0.5 : windowCenterZ
    doorRegistry.register({
      id: doorId,
      position: [regX, regZ],
      y: Math.min(windowTop - 0.1, 1.6),
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [doorId, windowAxis, windowCenterX, windowCenterZ, roomSide, windowTop])

  // 애니메이션 상태 — ext(0=걷힘, 1=펼침), tilt(0=flat, target=closed)
  const extRef = useRef(0)
  const tiltRef = useRef(0)
  const slatRefs = useRef<Array<THREE.Group | null>>([])
  const { invalidate } = useThree()

  const headRailY = bTopY + 0.015
  const slatTopExtended = bTopY - 0.005       // 펼침 시 최상단 슬랫 Y
  const slatTopRetracted = headRailY - 0.010  // 걷힘 시 최상단 슬랫 Y
  const retractedPitch = 0.004                 // 걷혔을 때 슬랫 간격 (거의 밀착)

  const applyToSlats = () => {
    for (let i = 0; i < slatCount; i++) {
      const g = slatRefs.current[i]
      if (!g) continue
      const extendedY = slatTopExtended - i * pitch - slatT / 2
      const retractedY = slatTopRetracted - i * retractedPitch
      g.position.y = retractedY + (extendedY - retractedY) * extRef.current
      g.rotation.x = tiltRef.current
    }
  }

  // 마운트 직후 초기 위치 적용
  useEffect(() => {
    applyToSlats()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const targetExt = cursor === 0 ? 0 : 1
    const targetTilt = cursor === 1 ? Math.PI / 4 : cursor === 2 ? (85 * Math.PI) / 180 : 0
    let dirty = false
    const advance = (ref: { current: number }, target: number) => {
      const diff = target - ref.current
      if (Math.abs(diff) > 0.001) {
        ref.current += diff * Math.min(1, delta * 4)
        dirty = true
      } else if (ref.current !== target) {
        ref.current = target
        dirty = true
      }
    }
    advance(extRef, targetExt)
    advance(tiltRef, targetTilt)
    if (dirty) {
      applyToSlats()
      invalidate()
    }
  })

  const isActive = activeDoorId === doorId

  // 그룹 배치 — 창문 축 회전 + 벽에서 실내쪽 offset
  const groupRotY = windowAxis === 'x' ? 0 : Math.PI / 2
  const wallOffset = 0.14  // 벽 센터에서 실내 방향 140mm (벽 반두께 100mm + 40mm clearance)
  const groupX = windowAxis === 'x' ? windowCenterX : windowCenterX + roomSide * wallOffset
  const groupZ = windowAxis === 'x' ? windowCenterZ + roomSide * wallOffset : windowCenterZ

  return (
    <group position={[groupX, 0, groupZ]} rotation={[0, groupRotY, 0]}>
      {/* 헤드레일 — 창문 상단 위 */}
      <mesh position={[0, headRailY, 0]}>
        <boxGeometry args={[blindW, 0.030, 0.058]} />
        <meshStandardMaterial map={oakTex} roughness={0.6} />
      </mesh>

      {/* 슬랫 (각각 group 으로 감싸서 position + rotation.x 개별 제어) */}
      {Array.from({ length: slatCount }).map((_, i) => {
        const initialY = slatTopRetracted - i * retractedPitch  // 초기(걷힘) 위치
        return (
          <group
            key={`slat-${i}`}
            ref={(el: THREE.Group | null) => { slatRefs.current[i] = el }}
            position={[0, initialY, 0]}
          >
            <mesh>
              <boxGeometry args={[blindW, slatT, slatWidth]} />
              <meshStandardMaterial map={oakTex} roughness={0.7} />
            </mesh>
          </group>
        )
      })}

      {/* F 툴팁 — 블라인드 앞, 실내 쪽 */}
      {isActive && (
        <DoorTooltip
          position={[0, Math.min(windowTop - 0.05, 1.6), 0.2]}
          label={labels[cursor]}
        />
      )}
    </group>
  )
}
