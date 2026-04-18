/**
 * 4도어 냉장고 — 920×1800×915mm (D×H×W). 중공 구조.
 * 상 2문(냉장) / 하 2문(냉동) French door. F 키 개폐.
 * 본체 -X가 정면 (호출부에서 180° 회전해 +X로 전환).
 *
 * 요구사항:
 * - 도어 두께 100mm, 힌지는 본체 앞면(frontFace)에 위치 (도어 두께 중앙 아님)
 * - 도어 전면만 베이지, 나머지 5면 + 본체 외벽/천장은 전부 블랙
 * - 도어 90%+ 닫히면 해당 컴파트먼트 내부 전체 다크
 * - 도어 안쪽은 파여있고 3단 선반
 * - 도어와 본체 단차 없음 (프레임 제거)
 *
 * position: [centerX, centerZ] (바닥 기준)
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { doorRegistry } from '../../systems/doorRegistry'
import { DoorTooltip, getDoorLabel } from '../ui/DoorTooltip'
import type { DoorId } from '../../data/sectors'

interface RefrigeratorProps {
  position: [number, number]
  activeDoorId?: DoorId | null
}

const W = 0.915
const D = 0.920    // 외부 expose — 총 footprint(본체+도어) 깊이 (캐비닛 사이즈용)
const BODY_D = D - 0.10   // 본체 실제 깊이 820mm (도어 100mm 앞 돌출)
const H = 1.800
const DOOR_THICK = 0.10
const SHELL_T = 0.020
const DIVIDER_T = 0.030
const SHELF_T = 0.010
// 도어 내부 pocket
const DOOR_PANEL_T = 0.015   // 도어 전면 패널 두께
const DOOR_RIM_T = 0.020     // pocket 4면 rim 두께
const HINGE_FROM_BACK = 0.03 // 힌지는 도어 뒷면(본체 대면)에서 앞쪽(-X)으로 30mm 위치

export function Refrigerator({ position, activeDoorId }: RefrigeratorProps) {
  const [cx, cz] = position
  // 서측(본체 뒷면)은 원래 캐비닛 서측과 flush, 동측(본체 앞면)은 도어 100mm 만큼 안쪽
  // 총 footprint (도어 앞면 ~ 본체 뒷면) = D(920) = 원래 캐비닛 깊이
  const backFace = cx + D / 2                 // 본체 뒷면 = 캐비닛 서측 (0.460)
  const frontFace = backFace - BODY_D          // 본체 앞면 = 뒷면 - 820 = -0.360
  const bodyCenterX = (frontFace + backFace) / 2   // 본체 중심 = +0.050
  // 도어 앞면은 cx - D/2 = -0.460 (원래 캐비닛 동측 개구부)

  const [openTL, setOpenTL] = useState(false)
  const [openTR, setOpenTR] = useState(false)
  const [openBL, setOpenBL] = useState(false)
  const [openBR, setOpenBR] = useState(false)
  // 컴파트먼트 밝기 — 열 때 즉시 true, 90% 닫히면 false
  const [fridgeBright, setFridgeBright] = useState(false)
  const [freezerBright, setFreezerBright] = useState(false)

  const tlRef = useRef<THREE.Group>(null)
  const trRef = useRef<THREE.Group>(null)
  const blRef = useRef<THREE.Group>(null)
  const brRef = useRef<THREE.Group>(null)
  const anglesRef = useRef([0, 0, 0, 0])
  // 각 도어의 "밝게 리포트됨" 상태 (90% 닫힘 판정용)
  const brightReportedRef = useRef([false, false, false, false])
  const rootRef = useRef<THREE.Group>(null)
  const { invalidate } = useThree()

  // === 도어 치수 — 단차 없이 opening 완전 커버 ===
  // 도어 Y 범위: 상=[H/2+DIVIDER_T/2, H], 하=[0, H/2-DIVIDER_T/2]
  const doorH = H / 2 - DIVIDER_T / 2                        // 0.885
  const doorTopY = 3 * H / 4 + DIVIDER_T / 4                  // 1.3575
  const doorBotY = H / 4 - DIVIDER_T / 4                      // 0.4425
  const doorW = W / 2 - 0.0025                                 // 중앙 갭 5mm
  const hingeX = frontFace - HINGE_FROM_BACK                    // 힌지 = 본체 앞면에서 30mm 앞
  // 도어 local 좌표 (pivot 기준): 뒷면 = +HINGE_FROM_BACK, 앞면 = -(DOOR_THICK - HINGE_FROM_BACK)
  const doorBackLocal = HINGE_FROM_BACK                         // +0.03
  const doorFrontLocal = -(DOOR_THICK - HINGE_FROM_BACK)         // -0.07
  const panelCenterX = doorFrontLocal + DOOR_PANEL_T / 2
  const rimCenterX = (doorFrontLocal + DOOR_PANEL_T + doorBackLocal) / 2
  const rimSizeX = DOOR_THICK - DOOR_PANEL_T
  const tlHingeZ = cz - W / 2
  const trHingeZ = cz + W / 2

  const toggles = useRef({
    tl: () => setOpenTL((o) => !o),
    tr: () => setOpenTR((o) => !o),
    bl: () => setOpenBL((o) => !o),
    br: () => setOpenBR((o) => !o),
  })
  toggles.current = {
    tl: () => setOpenTL((o) => !o),
    tr: () => setOpenTR((o) => !o),
    bl: () => setOpenBL((o) => !o),
    br: () => setOpenBR((o) => !o),
  }

  const doorPositions = useMemo(() => ({
    tl: { hingeZ: tlHingeZ, sideSign: 1, y: doorTopY },
    tr: { hingeZ: trHingeZ, sideSign: -1, y: doorTopY },
    bl: { hingeZ: tlHingeZ, sideSign: 1, y: doorBotY },
    br: { hingeZ: trHingeZ, sideSign: -1, y: doorBotY },
  }), [tlHingeZ, trHingeZ, doorTopY, doorBotY])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.updateMatrixWorld(true)
    const register = (id: DoorId, localZ: number, y: number, toggle: () => void) => {
      const v = new THREE.Vector3(frontFace, y, localZ).applyMatrix4(root.matrixWorld)
      doorRegistry.register({ id, position: [v.x, v.z], y: v.y, toggle })
    }
    register('fridge-tl', tlHingeZ + doorW / 2, doorTopY, () => toggles.current.tl())
    register('fridge-tr', trHingeZ - doorW / 2, doorTopY, () => toggles.current.tr())
    register('fridge-bl', tlHingeZ + doorW / 2, doorBotY, () => toggles.current.bl())
    register('fridge-br', trHingeZ - doorW / 2, doorBotY, () => toggles.current.br())
    return () => {
      doorRegistry.unregister('fridge-tl')
      doorRegistry.unregister('fridge-tr')
      doorRegistry.unregister('fridge-bl')
      doorRegistry.unregister('fridge-br')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, cz])

  // 열릴 때 즉시 밝게
  useEffect(() => { doorRegistry.setOpenState('fridge-tl', openTL) }, [openTL])
  useEffect(() => { doorRegistry.setOpenState('fridge-tr', openTR) }, [openTR])
  useEffect(() => { doorRegistry.setOpenState('fridge-bl', openBL) }, [openBL])
  useEffect(() => { doorRegistry.setOpenState('fridge-br', openBR) }, [openBR])

  useEffect(() => {
    if (openTL || openTR) setFridgeBright(true)
    if (!openTL) { /* handled in frame */ }
  }, [openTL, openTR])
  useEffect(() => {
    if (openBL || openBR) setFreezerBright(true)
  }, [openBL, openBR])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const refs = [tlRef, trRef, blRef, brRef]
    const opens = [openTL, openTR, openBL, openBR]
    const signs = [1, -1, 1, -1]
    let moved = false
    for (let i = 0; i < 4; i++) {
      const fullAngle = signs[i] === 1 ? -Math.PI / 2 : Math.PI / 2
      const target = opens[i] ? fullAngle : 0
      const d = target - anglesRef.current[i]
      if (Math.abs(d) >= 0.0005) {
        anglesRef.current[i] += d * Math.min(1, delta * 6)
        if (refs[i].current) refs[i].current!.rotation.y = anglesRef.current[i]
        moved = true
      }
      // 90% 닫힘 판정 — |현재 각| ≤ |풀 각도| × 0.1
      const isBrightNow = Math.abs(anglesRef.current[i]) > Math.abs(fullAngle) * 0.1
      brightReportedRef.current[i] = isBrightNow
    }
    // 컴파트먼트 집계 (상 = 0,1 / 하 = 2,3)
    const fridgeNow = brightReportedRef.current[0] || brightReportedRef.current[1]
    const freezerNow = brightReportedRef.current[2] || brightReportedRef.current[3]
    if (fridgeNow !== fridgeBright) setFridgeBright(fridgeNow)
    if (freezerNow !== freezerBright) setFreezerBright(freezerNow)
    if (moved) invalidate()
  })

  // === 머티리얼 ===
  const whiteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f5f2', roughness: 0.55 }), [])
  const darkInnerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#050505', roughness: 1.0 }), [])
  const blackExtMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.6 }), [])
  const doorFrontMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8dcc0', roughness: 0.5 }), [])

  const fridgeInner = fridgeBright ? whiteMat : darkInnerMat
  const freezerInner = freezerBright ? whiteMat : darkInnerMat

  // 외벽 multi-material: 외면=blackExtMat, 내면=compartment inner
  // BoxGeometry 면 순서: [+X, -X, +Y, -Y, +Z, -Z]
  const backMats = (inner: THREE.Material) => [blackExtMat, inner, blackExtMat, blackExtMat, blackExtMat, blackExtMat]
  const topPanelMats = [blackExtMat, blackExtMat, blackExtMat, fridgeInner, blackExtMat, blackExtMat]
  const botPanelMats = [blackExtMat, blackExtMat, freezerInner, blackExtMat, blackExtMat, blackExtMat]
  const leftMats = (inner: THREE.Material) => [blackExtMat, blackExtMat, blackExtMat, blackExtMat, inner, blackExtMat]
  const rightMats = (inner: THREE.Material) => [blackExtMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat, inner]

  // === 내부 cavity 치수 ===
  const innerLeftZ = cz - W / 2 + SHELL_T
  const innerRightZ = cz + W / 2 - SHELL_T
  const innerWidth = innerRightZ - innerLeftZ
  const innerDepth = BODY_D - SHELL_T
  const innerDepthCenterX = frontFace + innerDepth / 2
  const innerTopY = H - SHELL_T
  const innerBotY = SHELL_T
  const dividerMinY = H / 2 - DIVIDER_T / 2
  const dividerMaxY = H / 2 + DIVIDER_T / 2

  const fridgeInnerH = innerTopY - dividerMaxY
  const freezerInnerH = dividerMinY - innerBotY

  // 본체 선반 Y
  const fridgeShelfYs = useMemo(() => {
    const ys: number[] = []
    const n = 3
    for (let i = 1; i <= n; i++) ys.push(dividerMaxY + (fridgeInnerH * i) / (n + 1))
    return ys
  }, [dividerMaxY, fridgeInnerH])
  const freezerShelfYs = useMemo(() => {
    const ys: number[] = []
    const n = 2
    for (let i = 1; i <= n; i++) ys.push(innerBotY + (freezerInnerH * i) / (n + 1))
    return ys
  }, [innerBotY, freezerInnerH])

  // === 도어 선반 연장 (둥근 사다리꼴) geometry ===
  const DOOR_SHELF_EXT = 0.100     // 100mm 연장
  const DOOR_SHELF_BZ = (doorW - 2 * DOOR_RIM_T - 0.002) / 2   // 뒷면 half-width
  const DOOR_SHELF_FZ = DOOR_SHELF_BZ * 0.75                    // 앞면 half-width (75%)
  const DOOR_SHELF_RAIL_H = 0.030                                // rail 높이 30mm
  const DOOR_SHELF_RAIL_T = 0.002                                // rail 두께 2mm
  const extensionGeo = useMemo(() => {
    const bZ = DOOR_SHELF_BZ, fZ = DOOR_SHELF_FZ
    const EXT = DOOR_SHELF_EXT
    const r = 0.015
    const s = new THREE.Shape()
    s.moveTo(0, -bZ)
    s.lineTo(EXT - r * 0.3, -fZ)
    s.quadraticCurveTo(EXT, -fZ, EXT, -fZ + r)
    s.lineTo(EXT, fZ - r)
    s.quadraticCurveTo(EXT, fZ, EXT - r * 0.3, fZ)
    s.lineTo(0, bZ)
    s.lineTo(0, -bZ)
    const geo = new THREE.ExtrudeGeometry(s, { depth: SHELF_T, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, -SHELF_T / 2, 0)
    return geo
  }, [DOOR_SHELF_BZ, DOOR_SHELF_FZ])
  const railMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: '#d8e0e8', transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0, clearcoat: 0.3 }),
    [],
  )

  // === 도어 pocket 선반 Y (로컬, pivot 기준) ===
  const doorShelfYs = useMemo(() => {
    const pocketInnerH = doorH - 2 * DOOR_RIM_T
    const ys: number[] = []
    for (let i = 1; i <= 3; i++) ys.push(-doorH / 2 + DOOR_RIM_T + (pocketInnerH * i) / 4)
    return ys
  }, [doorH])

  // 도어 사각 테두리(rim) 묶음. sideSign=+1 (TL/BL): 도어가 로컬 +Z 로 뻗음. -1 (TR/BR): -Z 로 뻗음.
  // 도어 내측 pocket(선반 구역)은 항상 화이트 — 외부 대면 면만 블랙.
  function renderDoor(kind: 'tl' | 'tr' | 'bl' | 'br', sideSign: 1 | -1, ref: React.Ref<THREE.Group>, posY: number, hingeZ: number) {
    const zc = sideSign * doorW / 2
    const zEdgeOuter = sideSign * doorW
    // BoxGeometry 면 순서: [+X, -X, +Y, -Y, +Z, -Z]
    // 전면 패널: -X = 도어 외관(베이지), +X = pocket 안쪽(화이트), edges = 블랙
    const frontFaceMats = [whiteMat, doorFrontMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat]
    // 상단 rim: -Y = pocket 천장(화이트), 나머지 = 블랙
    const topRimMats = [blackExtMat, blackExtMat, blackExtMat, whiteMat, blackExtMat, blackExtMat]
    // 하단 rim: +Y = pocket 바닥(화이트)
    const botRimMats = [blackExtMat, blackExtMat, whiteMat, blackExtMat, blackExtMat, blackExtMat]
    // 힌지/자유단 rim: pocket 대면 Z 방향 (sideSign 반영)
    // TL(+1) 힌지 rim은 z=+DOOR_RIM_T/2 위치, pocket은 +Z 방향 → +Z(idx4)가 pocket 면
    // TR(-1) 힌지 rim은 z=-DOOR_RIM_T/2 위치, pocket은 -Z 방향 → -Z(idx5)가 pocket 면
    const hingeRimMats = sideSign === 1
      ? [blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat, blackExtMat]
      : [blackExtMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat]
    // 자유단 rim: pocket 은 반대 방향
    // TL 자유단은 z=+(doorW-rimT/2), pocket은 -Z → -Z(idx5)
    // TR 자유단은 z=-(doorW-rimT/2), pocket은 +Z → +Z(idx4)
    const freeRimMats = sideSign === 1
      ? [blackExtMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat]
      : [blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat, blackExtMat]
    return (
      <group ref={ref} key={kind} position={[hingeX, posY, hingeZ]}>
        {/* 전면 패널 */}
        <mesh position={[panelCenterX, 0, zc]} material={frontFaceMats}>
          <boxGeometry args={[DOOR_PANEL_T, doorH, doorW]} />
        </mesh>
        {/* 상단 rim */}
        <mesh position={[rimCenterX, doorH / 2 - DOOR_RIM_T / 2, zc]} material={topRimMats}>
          <boxGeometry args={[rimSizeX, DOOR_RIM_T, doorW]} />
        </mesh>
        {/* 하단 rim */}
        <mesh position={[rimCenterX, -doorH / 2 + DOOR_RIM_T / 2, zc]} material={botRimMats}>
          <boxGeometry args={[rimSizeX, DOOR_RIM_T, doorW]} />
        </mesh>
        {/* 힌지쪽 rim */}
        <mesh position={[rimCenterX, 0, sideSign * DOOR_RIM_T / 2]} material={hingeRimMats}>
          <boxGeometry args={[rimSizeX, doorH - 2 * DOOR_RIM_T, DOOR_RIM_T]} />
        </mesh>
        {/* 자유단쪽 rim */}
        <mesh position={[rimCenterX, 0, zEdgeOuter - sideSign * DOOR_RIM_T / 2]} material={freeRimMats}>
          <boxGeometry args={[rimSizeX, doorH - 2 * DOOR_RIM_T, DOOR_RIM_T]} />
        </mesh>
        {/* 3단 선반 — pocket 내부 박스 + 사다리꼴 100mm 연장 + 반투명 guard rail */}
        {doorShelfYs.map((y, i) => {
          const baseFrontX = rimCenterX + (rimSizeX - 0.003) / 2
          const bZ = DOOR_SHELF_BZ, fZ = DOOR_SHELF_FZ
          const EXT = DOOR_SHELF_EXT
          const railH = DOOR_SHELF_RAIL_H, railT = DOOR_SHELF_RAIL_T
          const slopeAngle = Math.atan2(bZ - fZ, EXT)
          const slopeLen = Math.hypot(EXT, bZ - fZ)
          const railY = y + SHELF_T / 2 + railH / 2
          return (
            <group key={`door-shelf-${kind}-${i}`}>
              {/* pocket 내부 기본 박스 */}
              <mesh position={[rimCenterX, y, zc]} material={whiteMat}>
                <boxGeometry args={[rimSizeX - 0.003, SHELF_T, doorW - 2 * DOOR_RIM_T - 0.002]} />
              </mesh>
              {/* 사다리꼴 100mm 연장 */}
              <mesh position={[baseFrontX, y, zc]} geometry={extensionGeo} material={whiteMat} />
              {/* Guard rail — 전면 (tip) */}
              <mesh position={[baseFrontX + EXT - railT / 2, railY, zc]} material={railMat}>
                <boxGeometry args={[railT, railH, 2 * fZ]} />
              </mesh>
              {/* Guard rail — 힌지측 슬로프 */}
              <mesh
                position={[baseFrontX + EXT / 2, railY, zc - (bZ + fZ) / 2]}
                rotation={[0, -slopeAngle, 0]}
                material={railMat}
              >
                <boxGeometry args={[slopeLen, railH, railT]} />
              </mesh>
              {/* Guard rail — 자유단측 슬로프 */}
              <mesh
                position={[baseFrontX + EXT / 2, railY, zc + (bZ + fZ) / 2]}
                rotation={[0, slopeAngle, 0]}
                material={railMat}
              >
                <boxGeometry args={[slopeLen, railH, railT]} />
              </mesh>
            </group>
          )
        })}
      </group>
    )
  }

  return (
    <group ref={rootRef}>
      {/* === 외벽 — 외면 블랙, 내면 컴파트먼트 색 === */}
      {/* 뒷판 — 상하 분할 */}
      <mesh position={[backFace - SHELL_T / 2, (dividerMaxY + H) / 2, cz]} material={backMats(fridgeInner)}>
        <boxGeometry args={[SHELL_T, H - dividerMaxY, W]} />
      </mesh>
      <mesh position={[backFace - SHELL_T / 2, dividerMinY / 2, cz]} material={backMats(freezerInner)}>
        <boxGeometry args={[SHELL_T, dividerMinY, W]} />
      </mesh>
      {/* 천장 */}
      <mesh position={[bodyCenterX, H - SHELL_T / 2, cz]} material={topPanelMats}>
        <boxGeometry args={[BODY_D, SHELL_T, W]} />
      </mesh>
      {/* 바닥 */}
      <mesh position={[bodyCenterX, SHELL_T / 2, cz]} material={botPanelMats}>
        <boxGeometry args={[BODY_D, SHELL_T, W]} />
      </mesh>
      {/* 좌측 (Z-) — 상하 분할 */}
      <mesh position={[bodyCenterX, (dividerMaxY + H - SHELL_T) / 2, cz - W / 2 + SHELL_T / 2]} material={leftMats(fridgeInner)}>
        <boxGeometry args={[BODY_D, H - SHELL_T - dividerMaxY, SHELL_T]} />
      </mesh>
      <mesh position={[bodyCenterX, (SHELL_T + dividerMinY) / 2, cz - W / 2 + SHELL_T / 2]} material={leftMats(freezerInner)}>
        <boxGeometry args={[BODY_D, dividerMinY - SHELL_T, SHELL_T]} />
      </mesh>
      {/* 우측 (Z+) — 상하 분할 */}
      <mesh position={[bodyCenterX, (dividerMaxY + H - SHELL_T) / 2, cz + W / 2 - SHELL_T / 2]} material={rightMats(fridgeInner)}>
        <boxGeometry args={[BODY_D, H - SHELL_T - dividerMaxY, SHELL_T]} />
      </mesh>
      <mesh position={[bodyCenterX, (SHELL_T + dividerMinY) / 2, cz + W / 2 - SHELL_T / 2]} material={rightMats(freezerInner)}>
        <boxGeometry args={[BODY_D, dividerMinY - SHELL_T, SHELL_T]} />
      </mesh>

      {/* 냉장/냉동 divider — 상면(+Y)=fridgeInner, 하면(-Y)=freezerInner */}
      <mesh
        position={[bodyCenterX, H / 2, cz]}
        material={[blackExtMat, blackExtMat, fridgeInner, freezerInner, blackExtMat, blackExtMat]}
      >
        <boxGeometry args={[BODY_D - SHELL_T, DIVIDER_T, W - SHELL_T * 2]} />
      </mesh>

      {/* 본체 선반 — 앞쪽만 100mm 후퇴 (back 유지) → 도어 연장 선반 공간 확보 */}
      {fridgeShelfYs.map((y, i) => (
        <mesh key={`fridge-shelf-${i}`} position={[innerDepthCenterX + 0.050, y, cz]} material={fridgeInner}>
          <boxGeometry args={[innerDepth - 0.110, SHELF_T, innerWidth - 0.010]} />
        </mesh>
      ))}
      {freezerShelfYs.map((y, i) => (
        <mesh key={`freezer-shelf-${i}`} position={[innerDepthCenterX + 0.050, y, cz]} material={freezerInner}>
          <boxGeometry args={[innerDepth - 0.110, SHELF_T, innerWidth - 0.010]} />
        </mesh>
      ))}

      {/* 냉동실 중앙 L/R 분리벽 — 50mm 두께 */}
      <mesh
        position={[innerDepthCenterX, (innerBotY + dividerMinY) / 2, cz]}
        material={freezerInner}
      >
        <boxGeometry args={[innerDepth - 0.010, dividerMinY - innerBotY, 0.050]} />
      </mesh>

      {/* 도어 × 4 */}
      {renderDoor('tl', 1, tlRef, doorTopY, tlHingeZ)}
      {renderDoor('tr', -1, trRef, doorTopY, trHingeZ)}
      {renderDoor('bl', 1, blRef, doorBotY, tlHingeZ)}
      {renderDoor('br', -1, brRef, doorBotY, trHingeZ)}

      {/* 도어 사이 블랙 gap 라인 — 해당 컴파트먼트 모든 문 90%+ 닫힘 시 표시 */}
      {!fridgeBright && (
        <mesh position={[frontFace - DOOR_THICK - 0.001, doorTopY, cz]}>
          <boxGeometry args={[0.002, doorH - 0.01, 0.005]} />
          <meshStandardMaterial color="#000" roughness={0.9} />
        </mesh>
      )}
      {!freezerBright && (
        <mesh position={[frontFace - DOOR_THICK - 0.001, doorBotY, cz]}>
          <boxGeometry args={[0.002, doorH - 0.01, 0.005]} />
          <meshStandardMaterial color="#000" roughness={0.9} />
        </mesh>
      )}

      {(['tl', 'tr', 'bl', 'br'] as const).map((k) => {
        const id: DoorId = `fridge-${k}` as DoorId
        if (activeDoorId !== id) return null
        const dp = doorPositions[k]
        const opens = { tl: openTL, tr: openTR, bl: openBL, br: openBR }[k]
        return (
          <DoorTooltip
            key={id}
            position={[frontFace - DOOR_THICK - 0.05, dp.y, dp.hingeZ + (dp.sideSign * doorW) / 2]}
            label={getDoorLabel(id, opens)}
          />
        )
      })}

    </group>
  )
}

Refrigerator.W = W
Refrigerator.D = D
Refrigerator.H = H
