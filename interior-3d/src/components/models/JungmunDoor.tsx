import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { DoorId } from '../../data/sectors'

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
  playerPos?: [number, number]
  doorId?: DoorId
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
  playerPos,
  onOpenChange,
}: JungmunSwingDoorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pivotRef = useRef<THREE.Group>(null)
  const angleRef = useRef(0)
  const { invalidate } = useThree()

  const doorCenterWorldZ = (hingeWorld[1] + freeEndZ) / 2
  const dist = playerPos
    ? Math.hypot(playerPos[0] - hingeWorld[0], playerPos[1] - doorCenterWorldZ)
    : Infinity
  const inRange = dist < 1.8

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ best: { dist: number; toggle: () => void } | null; maxDist: number }>
      const max = ev.detail.maxDist ?? 1.8
      if (dist > max) return
      const detail = ev.detail
      if (!detail.best || dist < detail.best.dist) {
        detail.best = { dist, toggle: () => setIsOpen((o) => !o) }
      }
    }
    window.addEventListener('door-toggle-request', handler as EventListener)
    return () => window.removeEventListener('door-toggle-request', handler as EventListener)
  }, [dist])

  useEffect(() => {
    invalidate()
  }, [isOpen, invalidate])

  // Phase 2: 도어 상태 lift
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  const sign = freeEndZ > hingeWorld[1] ? 1 : -1
  const maxOpenAngle = -sign * (95 * Math.PI / 180)

  useFrame((_, delta) => {
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
      {playerPos && inRange && (
        <Html position={[0, 1.6, localDoorCenterZ]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(20, 20, 25, 0.85)',
              color: '#fff5e6',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              border: '1px solid rgba(255,255,255,0.2)',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            <kbd
              style={{
                background: '#fff5e6',
                color: '#1a1a1a',
                padding: '2px 7px',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 12,
                border: '1px solid #888',
                boxShadow: '0 1px 0 #555',
              }}
            >
              F
            </kbd>
            <span>{isOpen ? '중문 닫기' : '중문 열기'}</span>
          </div>
        </Html>
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
}: JungmunFixedPanelProps) {
  const frameShape = useMemo(
    () => makeGlassDoorFrameShape(width, height, width * 0.8, height - topBottomFrame * 2, borderR),
    [width, height, topBottomFrame, borderR]
  )
  const glassShape = useMemo(
    () => makeRoundedShape(width * 0.8, height - topBottomFrame * 2, borderR),
    [width, height, topBottomFrame, borderR]
  )

  return (
    <group position={[centerWorld[0], height / 2, centerWorld[1]]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, -thickness / 2]}>
        <extrudeGeometry args={[frameShape, { depth: thickness, bevelEnabled: false }]} />
        <meshPhysicalMaterial color={color} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
      </mesh>
      <mesh>
        <shapeGeometry args={[glassShape]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.92} roughness={1.0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
