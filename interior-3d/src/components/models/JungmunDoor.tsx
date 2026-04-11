import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { DoorTooltip } from '../ui/DoorTooltip'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import type { DoorId } from '../../data/sectors'
import { doorRegistry } from '../../systems/doorRegistry'
import { mirrorState, useMirrorEnabled } from '../../systems/mirrorToggle'

// --- Shape helpers (중문 유리 패널 전용) ---
function makeRoundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}
function makeRoundedHole(w: number, h: number, r: number) {
  const p = new THREE.Path()
  p.moveTo(-w / 2 + r, -h / 2)
  p.lineTo(w / 2 - r, -h / 2)
  p.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  p.lineTo(w / 2, h / 2 - r)
  p.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  p.lineTo(-w / 2 + r, h / 2)
  p.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  p.lineTo(-w / 2, -h / 2 + r)
  p.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return p
}
function makeGlassDoorFrameShape(w: number, h: number, gw: number, gh: number, r: number) {
  const outer = new THREE.Shape()
  outer.moveTo(-w / 2, -h / 2)
  outer.lineTo(w / 2, -h / 2)
  outer.lineTo(w / 2, h / 2)
  outer.lineTo(-w / 2, h / 2)
  outer.closePath()
  outer.holes.push(makeRoundedHole(gw, gh, r))
  return outer
}

interface JungmunSwingDoorProps {
  hingeWorld: [number, number]
  freeEndZ: number
  width: number
  height: number
  thickness: number
  borderR: number
  topBottomFrame: number
  color: string
  glassColor: string
  doorId?: DoorId
  activeDoorId?: DoorId | null
  onOpenChange?: (open: boolean) => void
}

export function JungmunSwingDoor({
  hingeWorld,
  freeEndZ,
  width,
  height,
  thickness,
  borderR,
  topBottomFrame,
  color,
  glassColor,
  doorId,
  activeDoorId,
  onOpenChange,
}: JungmunSwingDoorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pivotRef = useRef<THREE.Group>(null)
  const angleRef = useRef(0)
  // 회전 시작 지연 — 목적지 방의 첫 컴파일 freeze 가 끝난 후 매끄럽게 시작
  const openAtMsRef = useRef<number>(0)
  const { invalidate } = useThree()

  const doorCenterWorldZ = (hingeWorld[1] + freeEndZ) / 2

  // 레지스트리 등록
  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  useEffect(() => {
    if (!doorId) return
    doorRegistry.register({
      id: doorId,
      position: [hingeWorld[0], doorCenterWorldZ],
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  const isActive = !!doorId && activeDoorId === doorId

  useEffect(() => {
    openAtMsRef.current = isOpen ? performance.now() + 220 : 0
    invalidate()
  }, [isOpen, invalidate])

  // Phase 2: 도어 상태 lift
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  const sign = freeEndZ > hingeWorld[1] ? 1 : -1
  const maxOpenAngle = -sign * (90 * Math.PI / 180)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)   // demand frameloop idle 후 delta 폭주 방지
    if (isOpen && openAtMsRef.current && performance.now() < openAtMsRef.current) {
      invalidate()
      return
    }
    const target = isOpen ? maxOpenAngle : 0
    const diff = target - angleRef.current
    if (Math.abs(diff) < 0.0005) return
    const speed = Math.min(1, delta * 5)
    angleRef.current += diff * speed
    if (pivotRef.current) pivotRef.current.rotation.y = angleRef.current
    invalidate()
  })

  const frameShape = useMemo(
    () => makeGlassDoorFrameShape(width, height, width * 0.8, height - topBottomFrame * 2, borderR),
    [width, height, topBottomFrame, borderR]
  )
  const glassShape = useMemo(
    () => makeRoundedShape(width * 0.8, height - topBottomFrame * 2, borderR),
    [width, height, topBottomFrame, borderR]
  )

  const localDoorCenterZ = sign * (width / 2)

  return (
    <group position={[hingeWorld[0], 0, hingeWorld[1]]}>
      <group ref={pivotRef}>
        <group position={[0, height / 2, localDoorCenterZ]} rotation={[0, sign * Math.PI / 2, 0]}>
          <mesh position={[0, 0, -thickness / 2]}>
            <extrudeGeometry args={[frameShape, { depth: thickness, bevelEnabled: false }]} />
            <meshPhysicalMaterial color={color} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
          </mesh>
          <mesh>
            <shapeGeometry args={[glassShape]} />
            <meshStandardMaterial color={glassColor} transparent opacity={0.5} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      {isActive && (
        <DoorTooltip position={[0, 1.6, localDoorCenterZ]} label={isOpen ? '중문 닫기' : '중문 열기'} />
      )}
    </group>
  )
}

interface JungmunFixedPanelProps {
  centerWorld: [number, number]
  width: number
  height: number
  thickness: number
  borderR: number
  topBottomFrame: number
  color: string
  glassColor: string
  mirror?: boolean  // true: 유리 대신 거울 (서측, 현관 방향)
  playerPos?: [number, number]
}

export function JungmunFixedPanel({
  centerWorld,
  width,
  height,
  thickness,
  borderR,
  topBottomFrame,
  color,
  glassColor,
  mirror = false,
  playerPos,
}: JungmunFixedPanelProps) {
  const frameShape = useMemo(
    () => makeGlassDoorFrameShape(width, height, width * 0.8, height - topBottomFrame * 2, borderR),
    [width, height, topBottomFrame, borderR]
  )
  const glassShape = useMemo(
    () => makeRoundedShape(width * 0.8, height - topBottomFrame * 2, borderR),
    [width, height, topBottomFrame, borderR]
  )

  const reflectorObj = useMemo(() => {
    if (!mirror) return null
    const glassW = width * 0.8
    const glassH = height - topBottomFrame * 2
    const geo = new THREE.PlaneGeometry(glassW, glassH)
    return new Reflector(geo, {
      textureWidth: 256,
      textureHeight: 512,
      color: 0xc8ccd0,
      clipBias: 0.003,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mirror])

  const mirrorOn = useMirrorEnabled()
  const nearMirror = mirror && !!playerPos && (
    Math.hypot(playerPos[0] - centerWorld[0], playerPos[1] - centerWorld[1]) < 3
  )
  const showReflector = nearMirror && mirrorOn
  useEffect(() => {
    if (reflectorObj) reflectorObj.visible = showReflector
  }, [showReflector, reflectorObj])

  return (
    <group position={[centerWorld[0], height / 2, centerWorld[1]]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, -thickness / 2]}>
        <extrudeGeometry args={[frameShape, { depth: thickness, bevelEnabled: false }]} />
        <meshPhysicalMaterial color={color} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
      </mesh>
      {mirror && reflectorObj ? (
        <>
          <primitive object={reflectorObj} rotation={[0, Math.PI, 0]} />
          {!(showReflector) && (
            <mesh rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[width * 0.8, height - topBottomFrame * 2]} />
              <meshStandardMaterial color="#c8dce8" metalness={0.95} roughness={0.03} />
            </mesh>
          )}
        </>
      ) : (
        <mesh>
          <shapeGeometry args={[glassShape]} />
          <meshStandardMaterial color={glassColor} transparent opacity={0.92} roughness={1.0} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
