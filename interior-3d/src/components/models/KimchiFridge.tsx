/**
 * 김치냉장고 — 790×1800×810mm (D×H×W).
 * 상단: 프렌치도어 2문 (인터랙티브, 100mm 두께, 힌지 30mm 인셋, pocket+3단 선반)
 * 중/하단: 서랍 (non-interactive planes)
 *
 * 본체 -X가 정면. 상단 컴파트먼트 중공(외벽 블랙, 내부 화이트, 문 90%+ 닫힘 시 다크).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { doorRegistry } from '../../systems/doorRegistry'
import { DoorTooltip, getDoorLabel } from '../ui/DoorTooltip'
import type { DoorId } from '../../data/sectors'

interface KimchiFridgeProps {
  /** 정면 X 좌표 — Refrigerator의 frontFace와 일치시켜야 함 */
  frontFaceX: number
  /** 본체 중심 Z */
  centerZ: number
  activeDoorId?: DoorId | null
}

const W = 0.810
const D = 0.794   // 외부 expose — 총 footprint(본체+도어) 깊이 (캐비닛 사이즈용)
const BODY_D = D - 0.10   // 본체 실제 깊이 694mm
const H = 1.800
const DOOR_THICK = 0.10
const SHELL_T = 0.020
const DIVIDER_T = 0.030
const SHELF_T = 0.010
const DOOR_PANEL_T = 0.015
const DOOR_RIM_T = 0.020
const HINGE_FROM_BACK = 0.03

export function KimchiFridge({ frontFaceX, centerZ, activeDoorId }: KimchiFridgeProps) {
  // 도어 앞면 = frontFaceX (원래 캐비닛 개구부)
  // 본체 앞면 = frontFaceX + 100mm (도어 두께만큼 안쪽)
  // 본체 뒷면 = frontFaceX + D (원래 서벽)
  // 총 footprint = D(794) = 도어(100) + 본체(694)
  const backFace = frontFaceX + D                  // 서벽 (원래 위치)
  const bodyFrontX = backFace - BODY_D              // 본체 앞면
  const cx = (bodyFrontX + backFace) / 2            // 본체 중심
  const topH = H * 0.55
  const midH = H * 0.22
  const botH = H * 0.22

  // 상단 compartment Y 경계: [H - topH, H]. 내부 divider는 하단 경계에.
  const topCompBotY = H - topH        // 0.81
  const topCompTopY = H               // 1.80
  const topCompCenterY = (topCompBotY + topCompTopY) / 2  // 1.305

  const doorH = topH                             // 0.99 — opening 전체 커버
  const doorW = W / 2 - 0.0025     // 중앙 갭 5mm
  const hingeX = bodyFrontX - HINGE_FROM_BACK
  const tlHingeZ = centerZ - W / 2
  const trHingeZ = centerZ + W / 2

  // 도어 local X 치수
  const doorFrontLocal = -(DOOR_THICK - HINGE_FROM_BACK)
  const doorBackLocal = HINGE_FROM_BACK
  const panelCenterX = doorFrontLocal + DOOR_PANEL_T / 2
  const rimCenterX = (doorFrontLocal + DOOR_PANEL_T + doorBackLocal) / 2
  const rimSizeX = DOOR_THICK - DOOR_PANEL_T

  const [openTL, setOpenTL] = useState(false)
  const [openTR, setOpenTR] = useState(false)
  const [openMid, setOpenMid] = useState(false)
  const [openBot, setOpenBot] = useState(false)
  const [bright, setBright] = useState(false)
  const tlRef = useRef<THREE.Group>(null)
  const trRef = useRef<THREE.Group>(null)
  const midDrawerRef = useRef<THREE.Group>(null)
  const botDrawerRef = useRef<THREE.Group>(null)
  const midSlideRef = useRef(0)
  const botSlideRef = useRef(0)
  const anglesRef = useRef([0, 0])
  const brightReportedRef = useRef([false, false])
  const rootRef = useRef<THREE.Group>(null)
  const { invalidate } = useThree()

  const toggles = useRef({
    tl: () => setOpenTL((o) => !o),
    tr: () => setOpenTR((o) => !o),
    mid: () => setOpenMid((o) => !o),
    bot: () => setOpenBot((o) => !o),
  })
  toggles.current = {
    tl: () => setOpenTL((o) => !o),
    tr: () => setOpenTR((o) => !o),
    mid: () => setOpenMid((o) => !o),
    bot: () => setOpenBot((o) => !o),
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.updateMatrixWorld(true)
    const register = (id: DoorId, localZ: number, y: number, toggle: () => void) => {
      const v = new THREE.Vector3(frontFaceX, y, localZ).applyMatrix4(root.matrixWorld)
      doorRegistry.register({ id, position: [v.x, v.z], y: v.y, toggle })
    }
    register('kimchi-tl', tlHingeZ + doorW / 2, topCompCenterY, () => toggles.current.tl())
    register('kimchi-tr', trHingeZ - doorW / 2, topCompCenterY, () => toggles.current.tr())
    register('kimchi-drawer-mid', centerZ, H - topH - midH / 2, () => toggles.current.mid())
    register('kimchi-drawer-bot', centerZ, botH / 2, () => toggles.current.bot())
    return () => {
      doorRegistry.unregister('kimchi-tl')
      doorRegistry.unregister('kimchi-tr')
      doorRegistry.unregister('kimchi-drawer-mid')
      doorRegistry.unregister('kimchi-drawer-bot')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontFaceX, centerZ])

  useEffect(() => { doorRegistry.setOpenState('kimchi-tl', openTL) }, [openTL])
  useEffect(() => { doorRegistry.setOpenState('kimchi-tr', openTR) }, [openTR])
  useEffect(() => { doorRegistry.setOpenState('kimchi-drawer-mid', openMid) }, [openMid])
  useEffect(() => { doorRegistry.setOpenState('kimchi-drawer-bot', openBot) }, [openBot])

  useEffect(() => {
    if (openTL || openTR) setBright(true)
  }, [openTL, openTR])

  const DRAWER_SLIDE = 0.350   // 서랍 빼는 거리 350mm

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const refs = [tlRef, trRef]
    const opens = [openTL, openTR]
    const signs = [1, -1]
    let moved = false
    for (let i = 0; i < 2; i++) {
      const fullAngle = signs[i] === 1 ? -Math.PI / 2 : Math.PI / 2
      const target = opens[i] ? fullAngle : 0
      const d = target - anglesRef.current[i]
      if (Math.abs(d) >= 0.0005) {
        anglesRef.current[i] += d * Math.min(1, delta * 6)
        if (refs[i].current) refs[i].current!.rotation.y = anglesRef.current[i]
        moved = true
      }
      brightReportedRef.current[i] = Math.abs(anglesRef.current[i]) > Math.abs(fullAngle) * 0.1
    }
    const brightNow = brightReportedRef.current[0] || brightReportedRef.current[1]
    if (brightNow !== bright) setBright(brightNow)

    // 서랍 슬라이드 — -X 방향으로 pull out
    const midTarget = openMid ? -DRAWER_SLIDE : 0
    const midDiff = midTarget - midSlideRef.current
    if (Math.abs(midDiff) >= 0.0005) {
      midSlideRef.current += midDiff * Math.min(1, delta * 6)
      if (midDrawerRef.current) midDrawerRef.current.position.x = midSlideRef.current
      moved = true
    }
    const botTarget = openBot ? -DRAWER_SLIDE : 0
    const botDiff = botTarget - botSlideRef.current
    if (Math.abs(botDiff) >= 0.0005) {
      botSlideRef.current += botDiff * Math.min(1, delta * 6)
      if (botDrawerRef.current) botDrawerRef.current.position.x = botSlideRef.current
      moved = true
    }
    if (moved) invalidate()
  })

  const whiteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f5f5f2', roughness: 0.55 }), [])
  const darkInnerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#050505', roughness: 1.0 }), [])
  const blackExtMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.6 }), [])
  const doorFrontMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8dcc0', roughness: 0.5 }), [])

  const innerMat = bright ? whiteMat : darkInnerMat

  // multi-material helpers. 면 순서: [+X, -X, +Y, -Y, +Z, -Z]
  const backMats = [blackExtMat, innerMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat]
  const topPanelMats = [blackExtMat, blackExtMat, blackExtMat, innerMat, blackExtMat, blackExtMat]
  const dividerMats = [blackExtMat, blackExtMat, innerMat, blackExtMat, blackExtMat, blackExtMat]
  const leftSideMats = [blackExtMat, blackExtMat, blackExtMat, blackExtMat, innerMat, blackExtMat]
  const rightSideMats = [blackExtMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat, innerMat]

  // 상단 compartment 내부 치수
  const innerDepth = BODY_D - SHELL_T
  const innerDepthCenterX = bodyFrontX + innerDepth / 2
  const innerTopY = H - SHELL_T
  const innerBotY = topCompBotY + DIVIDER_T / 2
  const innerH = innerTopY - innerBotY
  const innerWidth = W - SHELL_T * 2

  const shelfYs = useMemo(() => {
    const ys: number[] = []
    const n = 3
    for (let i = 1; i <= n; i++) ys.push(innerBotY + (innerH * i) / (n + 1))
    return ys
  }, [innerBotY, innerH])

  const doorShelfYs = useMemo(() => {
    const pocketInnerH = doorH - 2 * DOOR_RIM_T
    const ys: number[] = []
    for (let i = 1; i <= 3; i++) ys.push(-doorH / 2 + DOOR_RIM_T + (pocketInnerH * i) / 4)
    return ys
  }, [doorH])

  // === 도어 선반 연장 (둥근 사다리꼴) ===
  const DOOR_SHELF_EXT = 0.100
  const DOOR_SHELF_BZ = (doorW - 2 * DOOR_RIM_T - 0.002) / 2
  const DOOR_SHELF_FZ = DOOR_SHELF_BZ * 0.75
  const DOOR_SHELF_RAIL_H = 0.030
  const DOOR_SHELF_RAIL_T = 0.002
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

  function renderDoor(kind: 'tl' | 'tr', sideSign: 1 | -1, ref: React.Ref<THREE.Group>, hingeZ: number) {
    const zc = sideSign * doorW / 2
    const zEdgeOuter = sideSign * doorW
    const frontFaceMats = [whiteMat, doorFrontMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat]
    const topRimMats = [blackExtMat, blackExtMat, blackExtMat, whiteMat, blackExtMat, blackExtMat]
    const botRimMats = [blackExtMat, blackExtMat, whiteMat, blackExtMat, blackExtMat, blackExtMat]
    const hingeRimMats = sideSign === 1
      ? [blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat, blackExtMat]
      : [blackExtMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat]
    const freeRimMats = sideSign === 1
      ? [blackExtMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat]
      : [blackExtMat, blackExtMat, blackExtMat, blackExtMat, whiteMat, blackExtMat]
    return (
      <group ref={ref} key={kind} position={[hingeX, topCompCenterY, hingeZ]}>
        <mesh position={[panelCenterX, 0, zc]} material={frontFaceMats}>
          <boxGeometry args={[DOOR_PANEL_T, doorH, doorW]} />
        </mesh>
        <mesh position={[rimCenterX, doorH / 2 - DOOR_RIM_T / 2, zc]} material={topRimMats}>
          <boxGeometry args={[rimSizeX, DOOR_RIM_T, doorW]} />
        </mesh>
        <mesh position={[rimCenterX, -doorH / 2 + DOOR_RIM_T / 2, zc]} material={botRimMats}>
          <boxGeometry args={[rimSizeX, DOOR_RIM_T, doorW]} />
        </mesh>
        <mesh position={[rimCenterX, 0, sideSign * DOOR_RIM_T / 2]} material={hingeRimMats}>
          <boxGeometry args={[rimSizeX, doorH - 2 * DOOR_RIM_T, DOOR_RIM_T]} />
        </mesh>
        <mesh position={[rimCenterX, 0, zEdgeOuter - sideSign * DOOR_RIM_T / 2]} material={freeRimMats}>
          <boxGeometry args={[rimSizeX, doorH - 2 * DOOR_RIM_T, DOOR_RIM_T]} />
        </mesh>
        {doorShelfYs.map((y, i) => {
          const baseFrontX = rimCenterX + (rimSizeX - 0.003) / 2
          const bZ = DOOR_SHELF_BZ, fZ = DOOR_SHELF_FZ
          const EXT = DOOR_SHELF_EXT
          const railH = DOOR_SHELF_RAIL_H, railT = DOOR_SHELF_RAIL_T
          const slopeAngle = Math.atan2(bZ - fZ, EXT)
          const slopeLen = Math.hypot(EXT, bZ - fZ)
          const railY = y + SHELF_T / 2 + railH / 2
          return (
            <group key={`kimchi-door-shelf-${kind}-${i}`}>
              <mesh position={[rimCenterX, y, zc]} material={whiteMat}>
                <boxGeometry args={[rimSizeX - 0.003, SHELF_T, doorW - 2 * DOOR_RIM_T - 0.002]} />
              </mesh>
              <mesh position={[baseFrontX, y, zc]} geometry={extensionGeo} material={whiteMat} />
              <mesh position={[baseFrontX + EXT - railT / 2, railY, zc]} material={railMat}>
                <boxGeometry args={[railT, railH, 2 * fZ]} />
              </mesh>
              <mesh
                position={[baseFrontX + EXT / 2, railY, zc - (bZ + fZ) / 2]}
                rotation={[0, -slopeAngle, 0]}
                material={railMat}
              >
                <boxGeometry args={[slopeLen, railH, railT]} />
              </mesh>
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

  // 하부 (중단 + 하단): 서랍 non-interactive. 기존처럼 솔리드 블랙 박스 + 서랍 전면 패널.
  const bottomSolidY = (topCompBotY) / 2  // 0 ~ topCompBotY 솔리드
  const bottomSolidH = topCompBotY

  return (
    <group ref={rootRef}>
      {/* === 상단 compartment 중공 === */}
      {/* 뒷판 */}
      <mesh position={[backFace - SHELL_T / 2, topCompCenterY, centerZ]} material={backMats}>
        <boxGeometry args={[SHELL_T, topH, W]} />
      </mesh>
      {/* 천장 */}
      <mesh position={[cx, H - SHELL_T / 2, centerZ]} material={topPanelMats}>
        <boxGeometry args={[BODY_D, SHELL_T, W]} />
      </mesh>
      {/* 좌측 외벽 */}
      <mesh position={[cx, topCompCenterY, centerZ - W / 2 + SHELL_T / 2]} material={leftSideMats}>
        <boxGeometry args={[BODY_D, topH - SHELL_T, SHELL_T]} />
      </mesh>
      {/* 우측 외벽 */}
      <mesh position={[cx, topCompCenterY, centerZ + W / 2 - SHELL_T / 2]} material={rightSideMats}>
        <boxGeometry args={[BODY_D, topH - SHELL_T, SHELL_T]} />
      </mesh>
      {/* divider (상 compartment 바닥 = 중단과 경계) */}
      <mesh position={[cx, topCompBotY + DIVIDER_T / 2, centerZ]} material={dividerMats}>
        <boxGeometry args={[BODY_D, DIVIDER_T, W]} />
      </mesh>

      {/* 상단 선반 3단 */}
      {shelfYs.map((y, i) => (
        <mesh key={`kimchi-shelf-${i}`} position={[innerDepthCenterX + 0.050, y, centerZ]} material={innerMat}>
          <boxGeometry args={[innerDepth - 0.110, SHELF_T, innerWidth - 0.010]} />
        </mesh>
      ))}

      {/* === 중/하단 컴파트먼트 외벽 (중공 shell, 블랙) === */}
      {/* 중/하단 공유 뒷판 */}
      <mesh position={[backFace - SHELL_T / 2, bottomSolidY, centerZ]}>
        <boxGeometry args={[SHELL_T, bottomSolidH, W]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
      </mesh>
      {/* 좌측 외벽 */}
      <mesh position={[cx, bottomSolidY, centerZ - W / 2 + SHELL_T / 2]}>
        <boxGeometry args={[BODY_D, bottomSolidH, SHELL_T]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
      </mesh>
      {/* 우측 외벽 */}
      <mesh position={[cx, bottomSolidY, centerZ + W / 2 - SHELL_T / 2]}>
        <boxGeometry args={[BODY_D, bottomSolidH, SHELL_T]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
      </mesh>
      {/* 바닥 */}
      <mesh position={[cx, SHELL_T / 2, centerZ]}>
        <boxGeometry args={[BODY_D, SHELL_T, W]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
      </mesh>
      {/* 중/하 사이 divider (중단 바닥/하단 천장) */}
      <mesh position={[cx, H - topH - midH, centerZ]}>
        <boxGeometry args={[BODY_D, DIVIDER_T, W]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
      </mesh>

      {/* === 중단 서랍 (인터랙티브) === */}
      {(() => {
        const DRAWER_SIDE_T = 0.050
        const DRAWER_BOT_T = 0.050
        const DRAWER_FRONT_T = 0.100
        const DRAWER_BACK_T = 0.015
        const DIV_T = 0.020
        const drawerW_outer = W - 0.010
        const drawerH_outer = midH - 0.015
        const drawerD_outer = BODY_D - 0.030  // 본체 안에 들어가는 길이
        const drawerYCenter = H - topH - midH / 2 - 0.005
        const frontPanelX = frontFaceX + DRAWER_FRONT_T / 2
        const innerW = drawerW_outer - 2 * DRAWER_SIDE_T
        const innerH = drawerH_outer - DRAWER_BOT_T
        const innerD = drawerD_outer - DRAWER_FRONT_T - DRAWER_BACK_T
        const innerCenterX = frontFaceX + DRAWER_FRONT_T + innerD / 2
        const drawerMat = <meshStandardMaterial color="#f5f5f2" roughness={0.6} />
        return (
          <group ref={midDrawerRef}>
            {/* 전면 패널 — 앞면(-X) 베이지, 나머지 5면 블랙 (도어와 동일) */}
            <mesh
              position={[frontPanelX, drawerYCenter, centerZ]}
              material={[blackExtMat, doorFrontMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat]}
            >
              <boxGeometry args={[DRAWER_FRONT_T, drawerH_outer, drawerW_outer]} />
            </mesh>
            {/* 좌측벽 (50mm) */}
            <mesh position={[innerCenterX, drawerYCenter, centerZ - drawerW_outer / 2 + DRAWER_SIDE_T / 2]}>
              <boxGeometry args={[innerD, drawerH_outer, DRAWER_SIDE_T]} />
              {drawerMat}
            </mesh>
            {/* 우측벽 */}
            <mesh position={[innerCenterX, drawerYCenter, centerZ + drawerW_outer / 2 - DRAWER_SIDE_T / 2]}>
              <boxGeometry args={[innerD, drawerH_outer, DRAWER_SIDE_T]} />
              {drawerMat}
            </mesh>
            {/* 바닥 (50mm) */}
            <mesh position={[innerCenterX, drawerYCenter - drawerH_outer / 2 + DRAWER_BOT_T / 2, centerZ]}>
              <boxGeometry args={[innerD, DRAWER_BOT_T, innerW]} />
              {drawerMat}
            </mesh>
            {/* 뒷벽 */}
            <mesh position={[frontFaceX + drawerD_outer - DRAWER_BACK_T / 2, drawerYCenter, centerZ]}>
              <boxGeometry args={[DRAWER_BACK_T, drawerH_outer, innerW]} />
              {drawerMat}
            </mesh>
            {/* 중앙 세로 divider — 좌/우 2칸 분리 */}
            <mesh position={[innerCenterX, drawerYCenter - drawerH_outer / 2 + DRAWER_BOT_T + innerH / 2, centerZ]}>
              <boxGeometry args={[innerD, innerH, DIV_T]} />
              {drawerMat}
            </mesh>
          </group>
        )
      })()}

      {/* === 하단 서랍 === */}
      {(() => {
        const DRAWER_SIDE_T = 0.050
        const DRAWER_BOT_T = 0.050
        const DRAWER_FRONT_T = 0.100
        const DRAWER_BACK_T = 0.015
        const DIV_T = 0.020
        const drawerW_outer = W - 0.010
        const drawerH_outer = botH - 0.015
        const drawerD_outer = BODY_D - 0.030
        const drawerYCenter = botH / 2 + 0.005
        const frontPanelX = frontFaceX + DRAWER_FRONT_T / 2
        const innerW = drawerW_outer - 2 * DRAWER_SIDE_T
        const innerH = drawerH_outer - DRAWER_BOT_T
        const innerD = drawerD_outer - DRAWER_FRONT_T - DRAWER_BACK_T
        const innerCenterX = frontFaceX + DRAWER_FRONT_T + innerD / 2
        const drawerMat = <meshStandardMaterial color="#f5f5f2" roughness={0.6} />
        return (
          <group ref={botDrawerRef}>
            {/* 전면 패널 — 앞면(-X) 베이지, 나머지 5면 블랙 */}
            <mesh
              position={[frontPanelX, drawerYCenter, centerZ]}
              material={[blackExtMat, doorFrontMat, blackExtMat, blackExtMat, blackExtMat, blackExtMat]}
            >
              <boxGeometry args={[DRAWER_FRONT_T, drawerH_outer, drawerW_outer]} />
            </mesh>
            <mesh position={[innerCenterX, drawerYCenter, centerZ - drawerW_outer / 2 + DRAWER_SIDE_T / 2]}>
              <boxGeometry args={[innerD, drawerH_outer, DRAWER_SIDE_T]} />
              {drawerMat}
            </mesh>
            <mesh position={[innerCenterX, drawerYCenter, centerZ + drawerW_outer / 2 - DRAWER_SIDE_T / 2]}>
              <boxGeometry args={[innerD, drawerH_outer, DRAWER_SIDE_T]} />
              {drawerMat}
            </mesh>
            <mesh position={[innerCenterX, drawerYCenter - drawerH_outer / 2 + DRAWER_BOT_T / 2, centerZ]}>
              <boxGeometry args={[innerD, DRAWER_BOT_T, innerW]} />
              {drawerMat}
            </mesh>
            <mesh position={[frontFaceX + drawerD_outer - DRAWER_BACK_T / 2, drawerYCenter, centerZ]}>
              <boxGeometry args={[DRAWER_BACK_T, drawerH_outer, innerW]} />
              {drawerMat}
            </mesh>
            {/* 중앙 세로 divider */}
            <mesh position={[innerCenterX, drawerYCenter - drawerH_outer / 2 + DRAWER_BOT_T + innerH / 2, centerZ]}>
              <boxGeometry args={[innerD, innerH, DIV_T]} />
              {drawerMat}
            </mesh>
          </group>
        )
      })()}

      {/* 도어 × 2 */}
      {renderDoor('tl', 1, tlRef, tlHingeZ)}
      {renderDoor('tr', -1, trRef, trHingeZ)}

      {/* 도어 사이 블랙 gap 라인 — 양 문 90%+ 닫힘 시 표시 */}
      {!bright && (
        <mesh position={[frontFaceX - 0.001, topCompCenterY, centerZ]}>
          <boxGeometry args={[0.002, doorH - 0.01, 0.005]} />
          <meshStandardMaterial color="#000" roughness={0.9} />
        </mesh>
      )}

      {(['tl', 'tr'] as const).map((k) => {
        const id: DoorId = `kimchi-${k}` as DoorId
        if (activeDoorId !== id) return null
        const opens = { tl: openTL, tr: openTR }[k]
        const hZ = k === 'tl' ? tlHingeZ : trHingeZ
        const ss = k === 'tl' ? 1 : -1
        return (
          <DoorTooltip
            key={id}
            position={[frontFaceX - DOOR_THICK - 0.05, topCompCenterY, hZ + (ss * doorW) / 2]}
            label={getDoorLabel(id, opens)}
          />
        )
      })}

      {activeDoorId === 'kimchi-drawer-mid' && (
        <DoorTooltip
          position={[frontFaceX - 0.15, H - topH - midH / 2, centerZ]}
          label={getDoorLabel('kimchi-drawer-mid', openMid)}
        />
      )}
      {activeDoorId === 'kimchi-drawer-bot' && (
        <DoorTooltip
          position={[frontFaceX - 0.15, botH / 2, centerZ]}
          label={getDoorLabel('kimchi-drawer-bot', openBot)}
        />
      )}
    </group>
  )
}

KimchiFridge.W = W
KimchiFridge.D = D
KimchiFridge.H = H
