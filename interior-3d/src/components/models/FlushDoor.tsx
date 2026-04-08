import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { WALL_THICKNESS } from '../../data/apartment'
import type { DoorId } from '../../data/sectors'
import { doorRegistry } from '../../systems/doorRegistry'

interface FlushDoorProps {
  position: [number, number]
  axis: 'x' | 'z'
  width?: number
  height?: number
  hinge?: 'left' | 'right'
  swing?: 'in' | 'out'
  maxOpenAngle?: number
  wallThickness?: number
  tex?: THREE.Texture
  color?: string
  style?: 'flush' | 'louvered'
  handleStyle?: 'lever' | 'smartlock'
  doorId?: DoorId
  activeDoorId?: DoorId | null
  onOpenChange?: (open: boolean) => void
}

export function FlushDoor({
  position,
  axis,
  width = 0.9,
  height = 2.1,
  hinge = 'left',
  swing = 'in',
  maxOpenAngle = 90,
  wallThickness = WALL_THICKNESS,
  tex,
  color = '#ffffff',
  style = 'flush',
  handleStyle = 'lever',
  doorId,
  activeDoorId,
  onOpenChange,
}: FlushDoorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelGroupRef = useRef<THREE.Group>(null)
  const angleRef = useRef(0)
  const { invalidate } = useThree()

  // 레지스트리 등록 — toggle 은 ref 통해 stale closure 방지
  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  useEffect(() => {
    if (!doorId) return
    doorRegistry.register({
      id: doorId,
      position: [position[0], position[1]],
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  const isActive = !!doorId && activeDoorId === doorId

  useEffect(() => {
    invalidate()
  }, [isOpen, invalidate])

  // Phase 2: 도어 상태 lift — 부모(WalkthroughView)에 변경 통지
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  const panelTex = useMemo(() => {
    if (!tex) return undefined
    const t = tex.clone()
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [tex])

  const casingTex = useMemo(() => {
    if (!tex) return undefined
    const t = tex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 0.05)
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [tex])

  const panelT = 0.040
  const casing = 0.009
  const wallHalf = wallThickness / 2

  const groupRotY = axis === 'x' ? 0 : Math.PI / 2

  const hingeSign = hinge === 'left' ? -1 : 1
  const hingeX = hingeSign * (width / 2)

  const swingSign = swing === 'in' ? 1 : -1
  const targetAngle = (maxOpenAngle * Math.PI / 180) * swingSign * (hinge === 'left' ? -1 : 1)

  useFrame((_, delta) => {
    const target = isOpen ? targetAngle : 0
    const diff = target - angleRef.current
    if (Math.abs(diff) < 0.0005) return
    const speed = Math.min(1, delta * 6)
    angleRef.current += diff * speed
    if (panelGroupRef.current) panelGroupRef.current.rotation.y = angleRef.current
    invalidate()
  })

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, groupRotY, 0]}>
      {/* 도어 개구부 내부 마감 (벽 두께 면) */}
      <mesh position={[-width / 2 + 0.003, height / 2, 0]}>
        <boxGeometry args={[0.006, height, wallThickness]} />
        <meshStandardMaterial map={casingTex} color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[width / 2 - 0.003, height / 2, 0]}>
        <boxGeometry args={[0.006, height, wallThickness]} />
        <meshStandardMaterial map={casingTex} color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, height - 0.003, 0]}>
        <boxGeometry args={[width, 0.006, wallThickness]} />
        <meshStandardMaterial map={casingTex} color={color} roughness={0.55} metalness={0.05} />
      </mesh>

      {/* 9mm 문선 */}
      {[-1, 1].map((side) => (
        <group key={`casing-${side}`} position={[0, 0, side * (wallHalf + casing / 2)]}>
          <mesh position={[-width / 2 - casing / 2, height / 2, 0]}>
            <boxGeometry args={[casing, height + casing, casing]} />
            <meshStandardMaterial map={casingTex} color={color} roughness={0.55} metalness={0.05} />
          </mesh>
          <mesh position={[width / 2 + casing / 2, height / 2, 0]}>
            <boxGeometry args={[casing, height + casing, casing]} />
            <meshStandardMaterial map={casingTex} color={color} roughness={0.55} metalness={0.05} />
          </mesh>
          <mesh position={[0, height + casing / 2, 0]}>
            <boxGeometry args={[width + casing * 2, casing, casing]} />
            <meshStandardMaterial map={casingTex} color={color} roughness={0.55} metalness={0.05} />
          </mesh>
        </group>
      ))}

      {/* 도어 패널 — 힌지 피벗 회전 */}
      <group ref={panelGroupRef} position={[hingeX, 0, 0]}>
        {style === 'flush' ? (
          <mesh position={[-hingeSign * (width / 2) - 0.001 * hingeSign, height / 2 + 0.005, 0]}>
            <boxGeometry args={[width - 0.005, height - 0.010, panelT]} />
            <meshStandardMaterial map={panelTex} color={color} roughness={0.55} metalness={0.05} />
          </mesh>
        ) : (
          <group position={[-hingeSign * (width / 2) - 0.001 * hingeSign, height / 2 + 0.005, 0]}>
            {(() => {
              const panelW = width - 0.005
              const panelH = height - 0.010
              const railTop = 0.080
              const railBot = 0.130
              const stile = 0.060
              const louverTop = panelH / 2 - railTop
              const louverBot = -panelH / 2 + railBot
              const louverH = louverTop - louverBot
              const louverCenterY = (louverTop + louverBot) / 2
              const louverW = panelW - stile * 2
              const slatPitch = 0.028
              const slatThick = 0.006
              const slatTilt = -25 * Math.PI / 180
              const slatHeight = 0.024
              const slatCount = Math.floor(louverH / slatPitch) - 1
              const slatStartY = louverCenterY + (slatCount - 1) * slatPitch / 2
              return (
                <>
                  <mesh position={[0, panelH / 2 - railTop / 2, 0]}>
                    <boxGeometry args={[panelW, railTop, panelT]} />
                    <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
                  </mesh>
                  <mesh position={[0, -panelH / 2 + railBot / 2, 0]}>
                    <boxGeometry args={[panelW, railBot, panelT]} />
                    <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
                  </mesh>
                  <mesh position={[-panelW / 2 + stile / 2, louverCenterY, 0]}>
                    <boxGeometry args={[stile, louverH, panelT]} />
                    <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
                  </mesh>
                  <mesh position={[panelW / 2 - stile / 2, louverCenterY, 0]}>
                    <boxGeometry args={[stile, louverH, panelT]} />
                    <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
                  </mesh>
                  <mesh position={[0, louverCenterY, 0]}>
                    <boxGeometry args={[louverW, louverH, panelT * 0.2]} />
                    <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
                  </mesh>
                  {Array.from({ length: slatCount }).map((_, i) => (
                    <mesh
                      key={`slat-${i}`}
                      position={[0, slatStartY - i * slatPitch, 0]}
                      rotation={[slatTilt, 0, 0]}
                    >
                      <boxGeometry args={[louverW, slatHeight, slatThick]} />
                      <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
                    </mesh>
                  ))}
                </>
              )
            })()}
          </group>
        )}

        {handleStyle === 'lever' ? (
          (() => {
            const latchEdgeX = -hingeSign * width
            const rosetteX = latchEdgeX + hingeSign * 0.07
            const leverCenterX = rosetteX + hingeSign * 0.06
            return (
              <>
                {[-1, 1].map((side) => (
                  <group key={`handle-${side}`}>
                    <mesh
                      position={[rosetteX, 1.02, side * (panelT / 2 + 0.006)]}
                      rotation={[Math.PI / 2, 0, 0]}
                    >
                      <cylinderGeometry args={[0.028, 0.028, 0.008, 24]} />
                      <meshStandardMaterial color="#b8b8b8" metalness={0.85} roughness={0.45} />
                    </mesh>
                    <mesh position={[leverCenterX, 1.02, side * (panelT / 2 + 0.022)]}>
                      <boxGeometry args={[0.13, 0.022, 0.022]} />
                      <meshStandardMaterial color="#b8b8b8" metalness={0.85} roughness={0.45} />
                    </mesh>
                    <mesh
                      position={[rosetteX, 1.02, side * (panelT / 2 + 0.014)]}
                      rotation={[Math.PI / 2, 0, 0]}
                    >
                      <cylinderGeometry args={[0.012, 0.012, 0.018, 16]} />
                      <meshStandardMaterial color="#b8b8b8" metalness={0.85} roughness={0.45} />
                    </mesh>
                  </group>
                ))}
              </>
            )
          })()
        ) : (
          (() => {
            const latchEdgeX = -hingeSign * width
            const lockX = latchEdgeX + hingeSign * 0.05
            const lockW = 0.085
            const lockH = 0.320
            const lockT = 0.025
            const lockCY = 1.05
            return (
              <>
                {[-1, 1].map((side) => {
                  const sideOffset = side * (panelT / 2 + lockT / 2)
                  const frontFaceZ = side * (panelT / 2 + lockT + 0.001)
                  return (
                    <group key={`smartlock-${side}`}>
                      <mesh position={[lockX, lockCY, sideOffset]}>
                        <boxGeometry args={[lockW, lockH, lockT]} />
                        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
                      </mesh>
                      <mesh position={[lockX, lockCY + lockH / 2 - 0.045, frontFaceZ]}>
                        <planeGeometry args={[lockW - 0.012, 0.062]} />
                        <meshStandardMaterial color="#08080f" emissive="#1a3050" emissiveIntensity={0.4} />
                      </mesh>
                      {Array.from({ length: 4 }).flatMap((_, r) =>
                        Array.from({ length: 3 }).map((_, c) => {
                          const kpX = lockX + (c - 1) * 0.022
                          const kpY = lockCY + 0.030 - r * 0.030
                          return (
                            <mesh
                              key={`kp-${side}-${r}-${c}`}
                              position={[kpX, kpY, frontFaceZ]}
                            >
                              <circleGeometry args={[0.008, 16]} />
                              <meshStandardMaterial color="#999" metalness={0.5} roughness={0.4} emissive="#1a1a22" emissiveIntensity={0.2} />
                            </mesh>
                          )
                        })
                      )}
                      <mesh position={[lockX, lockCY - lockH / 2 + 0.030, side * (panelT / 2 + 0.030)]}>
                        <boxGeometry args={[lockW + 0.030, 0.025, 0.040]} />
                        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
                      </mesh>
                    </group>
                  )
                })}
              </>
            )
          })()
        )}

        {/* 힌지 (3개) */}
        {[0.25, 1.05, 1.85].map((hy, i) => (
          <mesh key={`hinge-${i}`} position={[0, hy, 0]}>
            <boxGeometry args={[0.012, 0.07, panelT + 0.004]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* 인터랙션 툴팁 — 카메라가 이 도어를 향할 때만 */}
      {isActive && (
        <Html position={[0, 1.6, 0]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
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
            <span>{isOpen ? '문 닫기' : '문 열기'}</span>
          </div>
        </Html>
      )}
    </group>
  )
}
