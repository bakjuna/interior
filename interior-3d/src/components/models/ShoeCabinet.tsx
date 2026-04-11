/**
 * 4칸 신발장 — 1470mm 폭, 400mm 깊이, 2000mm 높이.
 *
 * 구성:
 * - col 0: 풀 높이 전신거울 도어 (좌측 경첩, 인터랙티브)
 * - col 1~3: 하부 도어 (850mm) + 오픈 선반 (250mm, 월넛 라이너 + 상부 LED) + 상부 도어 (900mm)
 * - 하단 100mm 띄움 + 4개 다운라이트
 *
 * active prop: LED + 다운라이트 활성 (현관 진입 또는 allLightsOn)
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { DoorTooltip } from '../ui/DoorTooltip'
import { LR_W, WALL_THICKNESS } from '../../data/apartment'
import type { DoorId } from '../../data/sectors'
import { doorRegistry } from '../../systems/doorRegistry'
import { useKTX2 } from '../../systems/useKTX2'
import { mirrorState, useMirrorEnabled } from '../../systems/mirrorToggle'

const T2 = WALL_THICKNESS / 2

interface ShoeCabinetProps {
  active: boolean
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
}

export function ShoeCabinet({ active, activeDoorId, playerPos }: ShoeCabinetProps) {
  const walnutDoorTex = useKTX2('/textures/walnut_door.ktx2')

  const walnutLinerTex2x1 = useMemo(() => {
    const tex = walnutDoorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [walnutDoorTex])

  const walnutLinerTex1x1 = useMemo(() => {
    const tex = walnutDoorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [walnutDoorTex])

  const totalW = 1.470
  const depth = 0.400
  const floorClear = 0.100
  const cabH = 2.000
  const topY = floorClear + cabH
  const lowerH = 0.850
  const openH = 0.250
  const upperH = 0.900
  const colW = totalW / 4
  const zBack = -T2 - T2
  const zFront = zBack - depth
  const zCenter = (zBack + zFront) / 2
  const xLeft = LR_W - 1.481 + 0.005
  const xCenter = xLeft + totalW / 2
  const lowerCenterY = floorClear + lowerH / 2
  const upperCenterY = floorClear + lowerH + openH + upperH / 2
  const bodyColor = '#f5f3f0'
  const doorColor = '#fafaf8'
  const t = 0.018

  // Reflector 거울 — 실제 씬 반사
  const reflectorObj = useMemo(() => {
    const geo = new THREE.PlaneGeometry(colW - 0.03, cabH - 0.03)
    return new Reflector(geo, {
      textureWidth: 256,
      textureHeight: 512,
      color: 0xc8ccd0,
      clipBias: 0.003,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mirrorOn = useMirrorEnabled()
  const nearMirror = !!playerPos && (
    Math.hypot(playerPos[0] - (xLeft + colW / 2), playerPos[1] - zFront) < 2
  )
  const showReflector = nearMirror && mirrorOn
  useEffect(() => {
    reflectorObj.visible = showReflector
  }, [showReflector, reflectorObj])

  // ——— 인터랙티브 도어 상태 ———
  const [mirrorOpen, setMirrorOpen] = useState(false)
  const mirrorPivotRef = useRef<THREE.Group>(null)
  const mirrorAngleRef = useRef(0)

  const [doorsOpen, setDoorsOpen] = useState(false)
  const doorPivotRefs = useRef<(THREE.Group | null)[]>([])
  const doorAnglesRef = useRef([0, 0, 0, 0, 0, 0])

  const { invalidate } = useThree()

  // 도어 레지스트리 등록
  const mirrorToggleRef = useRef(() => setMirrorOpen((o) => !o))
  mirrorToggleRef.current = () => setMirrorOpen((o) => !o)
  const doorsToggleRef = useRef(() => setDoorsOpen((o) => !o))
  doorsToggleRef.current = () => setDoorsOpen((o) => !o)

  useEffect(() => {
    doorRegistry.register({
      id: 'shoe-mirror',
      position: [xLeft + colW * 0.5, zFront],
      toggle: () => mirrorToggleRef.current(),
    })
    doorRegistry.register({
      id: 'shoe-doors',
      position: [xLeft + colW * 2.5, zFront],
      toggle: () => doorsToggleRef.current(),
    })
    return () => {
      doorRegistry.unregister('shoe-mirror')
      doorRegistry.unregister('shoe-doors')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 애니메이션
  // 거울: 좌측 경첩 → +π/2
  // 일반 도어: col 1,2 좌측경첩 → +π/2, col 3 우측경첩 → -π/2
  const MIRROR_TARGET = Math.PI / 2
  const DOOR_TARGETS = [
    Math.PI / 2,   // col 1 lower
    Math.PI / 2,   // col 1 upper
    Math.PI / 2,   // col 2 lower
    Math.PI / 2,   // col 2 upper
    -Math.PI / 2,  // col 3 lower
    -Math.PI / 2,  // col 3 upper
  ]

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let moved = false

    const mt = mirrorOpen ? MIRROR_TARGET : 0
    const md = mt - mirrorAngleRef.current
    if (Math.abs(md) > 0.0005) {
      mirrorAngleRef.current += md * Math.min(1, delta * 6)
      if (mirrorPivotRef.current) mirrorPivotRef.current.rotation.y = mirrorAngleRef.current
      moved = true
    }

    for (let i = 0; i < 6; i++) {
      const dt = doorsOpen ? DOOR_TARGETS[i] : 0
      const dd = dt - doorAnglesRef.current[i]
      if (Math.abs(dd) < 0.0005) continue
      doorAnglesRef.current[i] += dd * Math.min(1, delta * 6)
      const ref = doorPivotRefs.current[i]
      if (ref) ref.rotation.y = doorAnglesRef.current[i]
      moved = true
    }

    if (moved) invalidate()
  })

  // LED / 다운라이트 (cols 1-3 영역)
  const ledInteriorLeft = xLeft + colW + t / 2
  const ledInteriorRight = xLeft + totalW - t / 2
  const ledInteriorTop = floorClear + lowerH + openH - t
  const ledInteriorCx = (ledInteriorLeft + ledInteriorRight) / 2
  const ledInteriorWidth = ledInteriorRight - ledInteriorLeft
  const ledStripDepth = 0.010
  const ledStripZ = zBack - t - ledStripDepth / 2 - 0.002
  const ledStripY = ledInteriorTop - 0.001

  const dlY = floorClear - t - 0.002

  const isMirrorActive = activeDoorId === 'shoe-mirror'
  const isDoorsActive = activeDoorId === 'shoe-doors'

  return (
    <>
      {/* lights outside group for stable Three.js light count */}
      <rectAreaLight
        position={[ledInteriorCx, ledStripY - 0.002, ledStripZ]}
        width={ledInteriorWidth}
        height={ledStripDepth}
        intensity={active ? 60 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {[0, 1, 2, 3].map((ci) => (
        <pointLight
          key={`shoe-dl-light-${ci}`}
          position={[xLeft + colW * (ci + 0.5), dlY - 0.005, zCenter]}
          intensity={active ? 1.5 : 0}
          distance={1.5}
          decay={2}
          color="#ffe0b0"
          castShadow
          shadow-mapSize-width={128}
          shadow-mapSize-height={128}
          shadow-bias={-0.002}
        />
      ))}
      <group>
        {/* 백패널 */}
        <mesh position={[xCenter, floorClear + cabH / 2, zBack - t / 2]}>
          <boxGeometry args={[totalW, cabH, t]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>
        {/* 서쪽 옆면 */}
        <mesh position={[xLeft - t / 2, topY / 2, zCenter]}>
          <boxGeometry args={[t, topY, depth]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>
        {/* 동쪽 옆면 */}
        <mesh position={[xLeft + totalW + t / 2, topY / 2, zCenter]}>
          <boxGeometry args={[t, topY, depth]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>
        {/* 상판 */}
        <mesh position={[xCenter, topY + t / 2, zCenter]}>
          <boxGeometry args={[totalW + t * 2, t, depth]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>
        {/* 하판 */}
        <mesh position={[xCenter, floorClear - t / 2, zCenter]}>
          <boxGeometry args={[totalW + t * 2, t, depth]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>

        {/* col 0/1 칸막이 — 풀 높이 (거울 | 도어 분리) */}
        <mesh position={[xLeft + colW, floorClear + cabH / 2, zCenter]}>
          <boxGeometry args={[t, cabH, depth - 0.01]} />
          <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
        </mesh>

        {/* col 1/2 칸막이 — 상하부만 (오픈선반 영역 제외) */}
        <mesh position={[xLeft + colW * 2, floorClear + lowerH / 2, zCenter]}>
          <boxGeometry args={[t, lowerH, depth - 0.01]} />
          <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[xLeft + colW * 2, floorClear + lowerH + openH + upperH / 2, zCenter]}>
          <boxGeometry args={[t, upperH, depth - 0.01]} />
          <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
        </mesh>

        {/* 오픈선반 상/하판 (cols 1-3) */}
        <mesh position={[xLeft + colW * 2.5, floorClear + lowerH + t / 2, zCenter]}>
          <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>
        <mesh position={[xLeft + colW * 2.5, floorClear + lowerH + openH - t / 2, zCenter]}>
          <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>

        {/* 오픈 선반 내측 월넛 라이너 (cols 1-3) */}
        {(() => {
          const interiorLeft = xLeft + colW + t / 2
          const interiorRight = xLeft + totalW - t / 2
          const interiorBottom = floorClear + lowerH + t
          const interiorTop = floorClear + lowerH + openH - t
          const interiorWidth = interiorRight - interiorLeft
          const interiorHeight = interiorTop - interiorBottom
          const interiorDepth = depth - 0.01
          const interiorCx = (interiorLeft + interiorRight) / 2
          const interiorCy = (interiorBottom + interiorTop) / 2
          const linerT = 0.004

          return (
            <>
              <mesh position={[interiorCx, interiorCy, zBack - t - 0.002]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[interiorWidth, interiorHeight]} />
                <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[interiorCx, interiorTop - linerT / 2, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[interiorWidth, interiorDepth]} />
                <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[interiorCx, interiorBottom + linerT / 2, zCenter]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[interiorWidth, interiorDepth]} />
                <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[interiorLeft + linerT / 2, interiorCy, zCenter]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[interiorDepth, interiorHeight]} />
                <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[interiorRight - linerT / 2, interiorCy, zCenter]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[interiorDepth, interiorHeight]} />
                <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} side={THREE.DoubleSide} />
              </mesh>
            </>
          )
        })()}

        {/* 오픈 선반 상부 LED */}
        {(() => {
          const interiorLeft = xLeft + colW + t / 2
          const interiorRight = xLeft + totalW - t / 2
          const interiorTop = floorClear + lowerH + openH - t
          const interiorCx = (interiorLeft + interiorRight) / 2
          const interiorWidth = interiorRight - interiorLeft
          const stripDepth = 0.010
          const stripZ = zBack - t - stripDepth / 2 - 0.002
          const stripY = interiorTop - 0.001
          return (
            <mesh position={[interiorCx, stripY, stripZ]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[interiorWidth, stripDepth]} />
              <meshStandardMaterial
                color={active ? '#fff' : '#444'}
                emissive={active ? '#ffe0b0' : '#111'}
                emissiveIntensity={active ? 3.0 : 0.1}
              />
            </mesh>
          )
        })()}

        {/* 신발장 밑면 다운라이트 4개 */}
        {[0, 1, 2, 3].map((ci) => {
          const cx = xLeft + colW * (ci + 0.5)
          return (
            <group key={`shoe-dl-${ci}`}>
              <mesh position={[cx, dlY, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.03, 16]} />
                <meshStandardMaterial
                  color={active ? '#fff' : '#888'}
                  emissive={active ? '#ffe0b0' : '#222'}
                  emissiveIntensity={active ? 1.0 : 0.1}
                />
              </mesh>
              <mesh position={[cx, dlY + 0.001, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.03, 0.038, 16]} />
                <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
              </mesh>
            </group>
          )
        })}

        {/* 거울 칸 내부 선반 (5칸: 하부 1 + 상부 4) */}
        {(() => {
          const shelfT = 0.012
          const mirrorShelfW = colW - t / 2
          const mirrorShelfCx = xLeft + mirrorShelfW / 2
          const topSectionH = cabH - lowerH
          const upperStart = floorClear + lowerH + openH
          const ys: number[] = []
          ys.push(floorClear + lowerH)
          ys.push(upperStart)  // 오픈선반 천장 높이와 맞춤
          for (let i = 1; i <= 3; i++) ys.push(upperStart + (upperH / 4) * i)
          return ys.map((y, idx) => (
            <mesh key={`mirror-shelf-${idx}`} position={[mirrorShelfCx, y, zCenter]}>
              <boxGeometry args={[mirrorShelfW, shelfT, depth - 0.01]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
          ))
        })()}

        {/* 일반 도어 칸 하부 내부 선반 (4칸 → 선반 3개) */}
        {/* col 1: 단독 */}
        {(() => {
          const shelfT = 0.012
          const shelfLeft = xLeft + colW + t / 2
          const shelfRight = xLeft + 2 * colW - t / 2
          const shelfW = shelfRight - shelfLeft
          const shelfCx = (shelfLeft + shelfRight) / 2
          const ys: number[] = []
          for (let i = 1; i <= 3; i++) ys.push(floorClear + (lowerH / 4) * i)
          return ys.map((y, idx) => (
            <mesh key={`shelf-lower-1-${idx}`} position={[shelfCx, y, zCenter]}>
              <boxGeometry args={[shelfW, shelfT, depth - 0.01]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
          ))
        })()}
        {/* col 2+3: 통칸 */}
        {(() => {
          const shelfT = 0.012
          const shelfLeft = xLeft + 2 * colW + t / 2
          const shelfRight = xLeft + totalW
          const shelfW = shelfRight - shelfLeft
          const shelfCx = (shelfLeft + shelfRight) / 2
          const ys: number[] = []
          for (let i = 1; i <= 3; i++) ys.push(floorClear + (lowerH / 4) * i)
          return ys.map((y, idx) => (
            <mesh key={`shelf-lower-23-${idx}`} position={[shelfCx, y, zCenter]}>
              <boxGeometry args={[shelfW, shelfT, depth - 0.01]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
          ))
        })()}
        {/* 일반 도어 칸 상부 내부 선반 (4칸 → 선반 3개, cols 1-3 통칸) */}
        {(() => {
          const shelfT = 0.012
          const shelfLeft = xLeft + colW + t / 2
          const shelfRight = xLeft + totalW
          const shelfW = shelfRight - shelfLeft
          const shelfCx = (shelfLeft + shelfRight) / 2
          const upperStart = floorClear + lowerH + openH
          const ys: number[] = []
          for (let i = 1; i <= 3; i++) ys.push(upperStart + (upperH / 4) * i)
          return ys.map((y, idx) => (
            <mesh key={`shelf-upper-${idx}`} position={[shelfCx, y, zCenter]}>
              <boxGeometry args={[shelfW, shelfT, depth - 0.01]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
          ))
        })()}
      </group>

      {/* ——— 인터랙티브 도어 ——— */}

      {/* 거울 도어 (col 0, 좌측 경첩) */}
      <group ref={mirrorPivotRef} position={[xLeft, floorClear + cabH / 2, zFront]}>
        <mesh position={[colW / 2, 0, -0.004]}>
          <boxGeometry args={[colW - 0.006, cabH - 0.006, 0.008]} />
          <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
        </mesh>
        <primitive object={reflectorObj} position={[colW / 2, 0, -0.009]} rotation={[0, Math.PI, 0]} />
        {!showReflector && (
          <mesh position={[colW / 2, 0, -0.009]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[colW - 0.03, cabH - 0.03]} />
            <meshStandardMaterial color="#c8dce8" metalness={0.95} roughness={0.03} />
          </mesh>
        )}
      </group>

      {/* 일반 도어 (cols 1-3, 상/하부) */}
      {[1, 2, 3].map((ci, colIdx) => {
        const halfG = 0.0005
        const leftBound = xLeft + ci * colW + (ci > 1 ? halfG : 0)
        const rightBound = xLeft + (ci + 1) * colW - (ci < 3 ? halfG : 0)
        const panelW = rightBound - leftBound
        const isRightHinge = ci === 3
        const hingeX = isRightHinge ? rightBound : leftBound
        const meshOffsetX = isRightHinge ? -panelW / 2 : panelW / 2
        const lowerIdx = colIdx * 2
        const upperIdx = colIdx * 2 + 1

        return (
          <group key={`shoe-door-col-${ci}`}>
            {/* 하부 도어 */}
            <group
              ref={(el) => { doorPivotRefs.current[lowerIdx] = el }}
              position={[hingeX, lowerCenterY, zFront]}
            >
              <mesh position={[meshOffsetX, 0, -t / 2]}>
                <boxGeometry args={[panelW, lowerH, t]} />
                <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
              </mesh>
            </group>
            {/* 상부 도어 */}
            <group
              ref={(el) => { doorPivotRefs.current[upperIdx] = el }}
              position={[hingeX, upperCenterY, zFront]}
            >
              <mesh position={[meshOffsetX, 0, -t / 2]}>
                <boxGeometry args={[panelW, upperH, t]} />
                <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
              </mesh>
            </group>
          </group>
        )
      })}

      {/* 툴팁 */}
      {isMirrorActive && (
        <DoorTooltip position={[xLeft + colW / 2, floorClear + cabH / 2 + 0.3, zFront - 0.05]} label={mirrorOpen ? '신발장 거울 닫기' : '신발장 거울 열기'} />
      )}
      {isDoorsActive && (
        <DoorTooltip position={[xLeft + colW * 2.5, floorClear + cabH / 2 + 0.3, zFront - 0.05]} label={doorsOpen ? '신발장 닫기' : '신발장 열기'} />
      )}
    </>
  )
}
