import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { DoorTooltip, getDoorLabel } from '../ui/DoorTooltip'
import { WALL_THICKNESS } from '../../data/apartment'
import type { DoorId } from '../../data/sectors'
import { doorRegistry } from '../../systems/doorRegistry'

interface PetDoorConfig {
  width: number         // 외곽 프레임 폭 (m)
  height: number        // 외곽 프레임 높이 (m)
  innerWidth: number    // 내측 개구부 폭 (m) — 문 구멍 사이즈
  innerHeight: number   // 내측 개구부 높이 (m)
  bottomY: number       // 바닥에서 외곽 프레임 하단까지 높이 (m)
}

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
  petDoor?: PetDoorConfig  // 펫도어 (중간 하단 개구부)
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
  petDoor,
}: FlushDoorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelGroupRef = useRef<THREE.Group>(null)
  const angleRef = useRef(0)
  // 열리기 전 대기: 도어가 닫혀있다 열릴 때, 목적지 방의 mesh/material 이 처음
  // 한번에 컴파일되며 freeze 가 발생할 수 있다. 방 visibility 는 즉시 lift (onOpenChange)
  // 하되 회전 모션은 짧게 지연 → freeze 가 끝난 후 매끄럽게 시작.
  const openAtMsRef = useRef<number>(0)
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
    // 열기 시작 시점 = 지금 + DELAY. 닫힐 때는 즉시 (delay = 0).
    openAtMsRef.current = isOpen ? performance.now() + 220 : 0
    invalidate()
  }, [isOpen, invalidate])

  // Phase 2: 도어 상태 lift — 부모(WalkthroughView)에 변경 통지
  // 즉시 lift 해서 목적지 방이 먼저 렌더되도록 함 (그 뒤 지연 후 회전 시작)
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

  // 펫도어 — 패널에 구멍 뚫고 플라스틱 프레임 + 플랩 배치
  const panelW = width - 0.005
  const panelH = height - 0.010
  const panelCenterY = height / 2 + 0.005
  const petDoorGeo = useMemo(() => {
    if (!petDoor) return null
    const pdCYLocal = petDoor.bottomY + petDoor.height / 2 - panelCenterY  // 패널 mesh 로컬 Y
    const shape = new THREE.Shape()
    shape.moveTo(-panelW / 2, -panelH / 2)
    shape.lineTo(panelW / 2, -panelH / 2)
    shape.lineTo(panelW / 2, panelH / 2)
    shape.lineTo(-panelW / 2, panelH / 2)
    shape.lineTo(-panelW / 2, -panelH / 2)
    const hole = new THREE.Path()
    hole.moveTo(-petDoor.innerWidth / 2, pdCYLocal - petDoor.innerHeight / 2)
    hole.lineTo(petDoor.innerWidth / 2, pdCYLocal - petDoor.innerHeight / 2)
    hole.lineTo(petDoor.innerWidth / 2, pdCYLocal + petDoor.innerHeight / 2)
    hole.lineTo(-petDoor.innerWidth / 2, pdCYLocal + petDoor.innerHeight / 2)
    hole.lineTo(-petDoor.innerWidth / 2, pdCYLocal - petDoor.innerHeight / 2)
    shape.holes.push(hole)
    // 커스텀 UVGenerator — 앞/뒤 면 UV 를 패널 전체 [0,1] 로 정규화 (기본 UV는 shape 좌표 그대로라 텍스처 망가짐)
    const uvGen = {
      generateTopUV: (_g: THREE.ExtrudeGeometry, verts: number[], iA: number, iB: number, iC: number) => {
        const toUV = (i: number) => new THREE.Vector2(
          (verts[i * 3] + panelW / 2) / panelW,
          (verts[i * 3 + 1] + panelH / 2) / panelH,
        )
        return [toUV(iA), toUV(iB), toUV(iC)]
      },
      generateSideWallUV: (_g: THREE.ExtrudeGeometry, _verts: number[], _iA: number, _iB: number, _iC: number, _iD: number) => [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1),
      ],
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: panelT, bevelEnabled: false, UVGenerator: uvGen })
    g.translate(0, 0, -panelT / 2)  // depth 중앙 정렬 (ExtrudeGeometry 는 z=0 부터 시작)
    return g
  }, [petDoor, panelW, panelH, panelCenterY, panelT])

  const groupRotY = axis === 'x' ? 0 : Math.PI / 2

  const hingeSign = hinge === 'left' ? -1 : 1
  const hingeX = hingeSign * (width / 2)

  const swingSign = swing === 'in' ? 1 : -1
  const targetAngle = (maxOpenAngle * Math.PI / 180) * swingSign * (hinge === 'left' ? -1 : 1)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)   // demand frameloop idle 후 delta 폭주 방지
    // 열기 지연 — 목적지 방이 먼저 렌더/컴파일 될 시간을 벌어 freeze 후에 회전 시작
    if (isOpen && openAtMsRef.current && performance.now() < openAtMsRef.current) {
      invalidate()
      return
    }
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
          petDoor && petDoorGeo ? (
            <mesh
              castShadow
              position={[-hingeSign * (width / 2) - 0.001 * hingeSign, height / 2 + 0.005, 0]}
              geometry={petDoorGeo}
            >
              <meshStandardMaterial map={panelTex} color={color} roughness={0.55} metalness={0.05} />
            </mesh>
          ) : (
            <mesh castShadow position={[-hingeSign * (width / 2) - 0.001 * hingeSign, height / 2 + 0.005, 0]}>
              <boxGeometry args={[width - 0.005, height - 0.010, panelT]} />
              <meshStandardMaterial map={panelTex} color={color} roughness={0.55} metalness={0.05} />
            </mesh>
          )
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

        {/* 펫도어 — 화이트 플라스틱 프레임 + 플랩 */}
        {petDoor && (() => {
          const pdCX = -hingeSign * (width / 2) - 0.001 * hingeSign   // 패널 x 중심
          const pdCY = petDoor.bottomY + petDoor.height / 2
          const pdW = petDoor.width
          const pdH = petDoor.height
          const pdIW = petDoor.innerWidth
          const pdIH = petDoor.innerHeight
          const flangeT = 0.006                            // 양면 플랜지 두께
          const frameTB = (pdH - pdIH) / 2                 // 상/하 플랜지 폭
          const frameLR = (pdW - pdIW) / 2                 // 좌/우 플랜지 폭
          return (
            <group position={[pdCX, pdCY, 0]}>
              {/* 양면 플랜지 (±Z) — 4변 */}
              {[-1, 1].map((side) => {
                const faceZ = side * (panelT / 2 + flangeT / 2)
                return (
                  <group key={`pd-flange-${side}`}>
                    <mesh position={[0, pdH / 2 - frameTB / 2, faceZ]}>
                      <boxGeometry args={[pdW, frameTB, flangeT]} />
                      <meshStandardMaterial color="#f5f5f5" roughness={0.35} metalness={0.05} />
                    </mesh>
                    <mesh position={[0, -pdH / 2 + frameTB / 2, faceZ]}>
                      <boxGeometry args={[pdW, frameTB, flangeT]} />
                      <meshStandardMaterial color="#f5f5f5" roughness={0.35} metalness={0.05} />
                    </mesh>
                    <mesh position={[-pdW / 2 + frameLR / 2, 0, faceZ]}>
                      <boxGeometry args={[frameLR, pdIH, flangeT]} />
                      <meshStandardMaterial color="#f5f5f5" roughness={0.35} metalness={0.05} />
                    </mesh>
                    <mesh position={[pdW / 2 - frameLR / 2, 0, faceZ]}>
                      <boxGeometry args={[frameLR, pdIH, flangeT]} />
                      <meshStandardMaterial color="#f5f5f5" roughness={0.35} metalness={0.05} />
                    </mesh>
                  </group>
                )
              })}
              {/* 내측 튜브 — 개구부 4변 안쪽, 앞/뒤 플랜지 연결 */}
              {(() => {
                const tubeT = 0.008
                return (
                  <>
                    <mesh position={[0, pdIH / 2 - tubeT / 2, 0]}>
                      <boxGeometry args={[pdIW, tubeT, panelT]} />
                      <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.05} />
                    </mesh>
                    <mesh position={[0, -pdIH / 2 + tubeT / 2, 0]}>
                      <boxGeometry args={[pdIW, tubeT, panelT]} />
                      <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.05} />
                    </mesh>
                    <mesh position={[-pdIW / 2 + tubeT / 2, 0, 0]}>
                      <boxGeometry args={[tubeT, pdIH - tubeT * 2, panelT]} />
                      <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.05} />
                    </mesh>
                    <mesh position={[pdIW / 2 - tubeT / 2, 0, 0]}>
                      <boxGeometry args={[tubeT, pdIH - tubeT * 2, panelT]} />
                      <meshStandardMaterial color="#f0f0f0" roughness={0.4} metalness={0.05} />
                    </mesh>
                  </>
                )
              })()}
              {/* 플랩 — 중앙에 세미투명 메쉬 (문 두께 중앙) */}
              <mesh position={[0, 0, 0]}>
                <planeGeometry args={[pdIW - 0.012, pdIH - 0.012]} />
                <meshStandardMaterial
                  color="#2e2e30"
                  roughness={0.85}
                  metalness={0}
                  transparent
                  opacity={0.45}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
              {/* 하단 자석/래치 바 */}
              <mesh position={[0, -pdIH / 2 + 0.012, 0]}>
                <boxGeometry args={[pdIW * 0.45, 0.012, panelT + flangeT * 1.5]} />
                <meshStandardMaterial color="#d8d8d8" roughness={0.4} metalness={0.3} />
              </mesh>
            </group>
          )
        })()}
      </group>

      {/* 인터랙션 툴팁 — 카메라가 이 도어를 향할 때만 */}
      {isActive && (
        <DoorTooltip position={[0, 1.6, 0]} label={getDoorLabel(doorId, isOpen)} />
      )}
    </group>
  )
}
