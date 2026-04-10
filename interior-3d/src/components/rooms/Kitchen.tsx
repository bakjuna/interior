/**
 * 주방 — 단일 라인 천장 LED + 하부장/상부장 (인덕션 + 식기세척기 + 싱크 + 수전) +
 * ㄱ자 우측벽 확장 (식기세척기/싱크) + 4도어 냉장고 + 김치냉장고 + 냉장고 빌트인 상부장 +
 * 식탁 + 펜던트 조명 + 좌측 하부장 (광파오븐 + 밥솥) + 좌측 월넛 선반.
 *
 * 주방 활성: playerPos가 주방 bounds 내 또는 allLightsOn.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { CuckooWaterPurifier } from '../models/CuckooWaterPurifier'
import { RiceCooker } from '../models/RiceCooker'
import { LightWaveOven } from '../models/LightWaveOven'
import { Refrigerator } from '../models/Refrigerator'
import { KimchiFridge } from '../models/KimchiFridge'
import { DiningTable } from '../models/DiningTable'
import { doorRegistry } from '../../systems/doorRegistry'
import type { DoorId } from '../../data/sectors'
import { useKTX2 } from '../../systems/useKTX2'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  babyTop,
  babyBottomZ,
  babyRight,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface KitchenProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
  activeDoorId?: DoorId | null
}

export function Kitchen({ visible, playerPos, allLightsOn, activeDoorId }: KitchenProps) {
  const closetDoorTex = useKTX2('/textures/walnut-closet-door.ktx2')
  const kitchenTileTex = useKTX2('/textures/kitchen-tile.ktx2')

  // 백스플래시 타일 — 한 이미지 ≈ 1.95m × 0.9m
  // 동측 벽이 Z=-5.062 에서 X=kitRight → X=kitRight+0.055 로 5.5cm 들어가는 step 있음 (apartment.ts 231/301)
  // → 동측 슬랩을 두 부분으로 분할 + step 커버 perpendicular + 북쪽 wrap (창문 안 가리게 0.4m)
  const tileMapEastNorth = useMemo(() => {
    const tileH_ = 1.45 - 0.84
    const t = kitchenTileTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    // 동측 북쪽 슬랩 길이 = -5.062 - (-7.175) = 2.113
    t.repeat.set(2.113 / 1.95, tileH_ / 0.9)
    t.needsUpdate = true
    return t
  }, [kitchenTileTex])

  const tileMapEastSouth = useMemo(() => {
    const tileH_ = 1.45 - 0.84
    const t = kitchenTileTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    // 동측 남쪽 슬랩 길이 = -3.273 - (-5.062) = 1.789
    t.repeat.set(1.789 / 1.95, tileH_ / 0.9)
    t.needsUpdate = true
    return t
  }, [kitchenTileTex])

  const tileMapNorth = useMemo(() => {
    const tileH_ = 1.45 - 0.84
    const northLen_ = 0.4   // 0.6 → 0.4 로 단축 (북쪽 벽 창문 X[+1.1, +2.0] 안 가리도록)
    const t = kitchenTileTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.repeat.set(northLen_ / 1.95, tileH_ / 0.9)
    t.needsUpdate = true
    return t
  }, [kitchenTileTex])

  // 주방 내 모든 호두 마감(본체/도어/선반/패널)이 동일 텍스처(repeat 1×1) 공유 — clone 1번만.
  // 기존엔 매 렌더마다 13회 clone → 4Hz playerPos throttle 과 결합 시 초당 50+ alloc.
  const walnutBodyTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  // === 주방 좌표 기준 ===
  const wall2300Z = babyTop - T2 - 1.119 - 0.770
  const kitchenTopInner = wall2300Z + T2
  const wLight = 0.08
  const lightY = WALL_HEIGHT - 0.008

  const kitchenLeft = babyRight + 0.2 + T2
  const kitchenRight = kitchenLeft + 2.5 - WALL_THICKNESS
  const kitchenBottom = -T2 - 1.591 + T2
  const kitchenActive = allLightsOn || (!!playerPos && (
    playerPos[0] >= kitchenLeft - 0.1 && playerPos[0] <= kitchenRight + 0.1 &&
    playerPos[1] >= kitchenTopInner - 0.1 && playerPos[1] <= kitchenBottom + 0.1
  ))

  // === 주방 캐비닛 ===
  const cabinetZ = wall2300Z + T2 + 0.3
  const babyRightWallX = babyRight + T2
  const kitLeft = babyRightWallX + T2
  const kitRight = babyRightWallX + 2.500 - T2

  // === 주방 단일 라인 천장 LED ===
  // 북쪽 창문 벽 내측면(kitchenTopInner)에서 100mm 남쪽 → 냉장고장 남쪽 끝까지
  // X: 냉장고장(서벽) 동측면 ~ 우측 하부장 서측면 사이 내측 공간 정중앙
  const fridgeBottomZ = (babyBottomZ - 0.22 - 0.9) + 0.030  // outerZEnd (= groupZEnd + sideT)
  const lineZstart = kitchenTopInner + 0.1
  const lineZend = fridgeBottomZ
  const lineLen = lineZend - lineZstart
  const lineCenterZ = (lineZstart + lineZend) / 2
  const fridgeFrontX = kitLeft + Refrigerator.D                     // 냉장고장 동측면(전면)
  const lowerCabFrontX = (kitRight - 0.3) - 0.3                     // 우측 하부장 서측면(전면)
  const lineCenterX = (fridgeFrontX + lowerCabFrontX) / 2
  const inductionW = 0.6
  // 인덕션을 메인 하단장의 cab2|cab3 boundary 위에 배치 + 시계방향 90° 회전.
  // 회전 후 본체의 월드 X 폭 = 0.5, 월드 Z 폭 = 0.58 (= inductionW - 0.02).
  // X: 우측 벽에서 50mm 띄움.
  // Z: extStartZ + 2.738 (= drawer 0.5 + cab1 0.4 + sink 0.838 + dish 0.6 + cab2 0.4 → cab2|cab3 boundary)
  const inductionWallGap = 0.05  // 벽에서 50mm
  const inductionGroupX = kitRight - inductionWallGap - 0.5 / 2
  // 인덕션을 후드 정중앙 아래에 배치 — 50cm cab(extStartZ~+0.5) + 898mm hood 의 중심
  // = extStartZ + 0.5 + 0.898/2 = extStartZ + 0.949
  const inductionGroupZ = wall2300Z + T2 + 0.949

  return (
    <>
      {/* === 주방 천장 LED lights (outside visible group) === */}
      <rectAreaLight
        position={[lineCenterX, lightY - 0.005, lineCenterZ]}
        width={wLight}
        height={lineLen}
        intensity={kitchenActive ? 225 : 0}
        color="#ffffff"
        rotation={[Math.PI / 2, 0, 0]}
      />
      {[0.25, 0.5, 0.75].map((t, i) => (
        <pointLight
          key={`kit-pl-${i}`}
          position={[lineCenterX, WALL_HEIGHT - 0.02, lineZstart + lineLen * t]}
          intensity={kitchenActive ? 9.0 : 0}
          distance={6.0}
          decay={2}
          color="#ffffff"
        />
      ))}
      <group visible={visible}>
      {/* === 주방 단일 라인 천장 LED mesh === */}
      <group>
        <mesh position={[lineCenterX, lightY, lineCenterZ]}>
          <boxGeometry args={[wLight, 0.015, lineLen]} />
          <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff' : '#111'} emissiveIntensity={kitchenActive ? 3.0 : 0.1} />
        </mesh>
      </group>

      {/* === 인덕션 (우측 ㄱ자 카운터 코너 — 시계방향 90° 회전) + 화구 3개 (좌 2 / 우 1) === */}
      {/* 본체: 가로(local X = 회전 후 world Z) 580mm × 세로(local Z = 회전 후 world X) 515mm */}
      <group position={[inductionGroupX, 0, inductionGroupZ]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.885, 0]}>
          <boxGeometry args={[inductionW - 0.02, 0.01, 0.515]} />
          <meshStandardMaterial color="#111" roughness={0.1} metalness={0.3} />
        </mesh>
        {/* 좌 2: 긴 축의 좌측 1/3 영역에 앞/뒤로 배치 (작은 화구) */}
        <mesh position={[-0.18, 0.892, -0.10]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.060, 0.080, 32]} />
          <meshStandardMaterial color="#333" roughness={0.2} />
        </mesh>
        <mesh position={[-0.18, 0.892, +0.10]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.060, 0.080, 32]} />
          <meshStandardMaterial color="#333" roughness={0.2} />
        </mesh>
        {/* 우 1: 긴 축의 우측 1/3 영역에 가운데, 큰 화구 */}
        <mesh position={[+0.10, 0.892, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.090, 0.115, 32]} />
          <meshStandardMaterial color="#333" roughness={0.2} />
        </mesh>
      </group>
      {/* 옛 upperRightW 60cm 상부장 블록 제거 — 새 ㄱ자 ext IIFE 의 상부장 재구성 IIFE 가 대체 */}

      {/* === ㄱ자 확장: 우측벽 따라 남쪽 (식기세척기 + 싱크 + 수전) === */}
      {(() => {
        const extWallInner = kitRight
        const extCabCenterX = extWallInner - 0.3
        // 하부장/상판은 북쪽 벽까지 연장 (정수기·인덕션이 놓이던 빈 공간을 메움)
        const extStartZ = wall2300Z + T2
        // 하부장은 우측 하부장(밥솥 칸)까지 통합 — 남쪽 끝 = babyDoorEnd + 0.42
        // 상부장은 별도 IIFE 에서 새로 구성 — 옛 변수(extUpper*) 제거
        const babyDoorEnd = babyBottomZ - 0.22 - 0.9
        const extEndZ = babyDoorEnd + 0.42

        // 수전(싱크): 북쪽에서 4번째 하부장 문이 시작하는 위치에 sink 북쪽 면 정렬.
        //   cabBefore 에 0.5m 폭 도어 3개 (round(1.5/0.5)=3) → 4번째 도어 = sink 첫 도어.
        //   sink 북쪽 면 = extStartZ + 1.5 (sinkHalfD 변해도 그대로 유지)
        // 싱크볼: 가로(Z) 838mm, 깊이(X) 500mm, 높이(Y) 400mm.
        // 식기세척기: 싱크 남쪽 면에서 0.05m 갭 후 시작.
        // 새 컬럼 레이아웃 (N→S, extStartZ 기준):
        //   drawer N (0.5) | cab1 (0.4) | sink (0.838) | cab2 (0.4) | cab3 (0.4) | dish (0.6) | 짜투리 | drawer S (0.5)
        //   인덕션은 cab2|cab3 boundary (= extStartZ + 2.138) 위에 배치.
        const sinkHalfD = 0.838 / 2  // = 0.419
        const sinkW = 0.4            // X 깊이 (벽-룸 방향)
        const dishW = 0.6
        const cabW = 0.4             // 일반 하단장 컬럼 폭
        const drawerColW = 0.5       // 양쪽 drawer 컬럼 폭
        // 새 N→S: drawer | cab1 | cab2 | dish | sink | cab3 | 짜투리 | drawer S
        // dish + sink 모두 +400mm 시프트 — cab2 를 dish 북쪽으로 이동.
        const cab1Z0 = extStartZ + drawerColW            // 0.5
        const cab2Z0 = cab1Z0 + cabW                     // 0.9 (dish 북쪽)
        const dishZstart = cab2Z0 + cabW                 // 1.3
        const dishZend = dishZstart + dishW              // 1.9
        const sinkZstart = dishZend                      // 1.9 (dish 바로 남쪽)
        const sinkZend = sinkZstart + sinkHalfD * 2      // 2.738
        const sinkZpos = sinkZstart + sinkHalfD          // 2.319 (sink 중심)
        // tiny ↔ cab3 위치 swap: tiny 가 sink 남쪽에 먼저 오고, cab3 가 drawer S 직전
        const tinyZ0 = sinkZend                          // 2.738 (sink 남쪽)
        const drawerSZ0 = extEndZ - drawerColW           // 3.402 (= extEndZ - 0.5)
        const cab3Z0 = drawerSZ0 - cabW                  // 3.002 (drawer S 직전)
        const tinyLen = cab3Z0 - tinyZ0                  // ≈ 0.264

        // === 정수기 하단 drawer 슬롯 ===
        // 첫 도어 컬럼(북단 0.5m)을 drawer + 하단 도어로 분할
        const drawerColLen = 0.5
        const drawerZStart = extStartZ
        const drawerZEnd = extStartZ + drawerColLen
        const drawerSplitY = 0.42  // 하단 도어 / drawer 분할 Y (drawer 내부 ~38cm 확보)
        const cabExtDepth = 0.6

        // 메인 하부장 박스 — extStartZ → dishZstart, Y 0~0.42 lower 한 덩어리 (drawer + cab1 + sink_lower + cab2 + cab3)
        const mainCabLen = dishZstart - extStartZ        // = 2.538
        const mainCabCenterZ = (extStartZ + dishZstart) / 2

        // 상단 박스 (Y drawerSplitY ~ 0.84) — drawer 슬롯 + sink X-Z 영역 제외:
        //   upperA: cab1 = drawerZEnd → sinkZstart (full X)
        //   upperB: cab2 + cab3 = sinkZend → dishZstart (full X)
        //   sink 양옆 W/E strip
        const upperY = (drawerSplitY + 0.84) / 2
        const upperH = 0.84 - drawerSplitY
        const upperALen = dishZstart - drawerZEnd        // = 0.4 (cab1 only)
        const upperACenterZ = (drawerZEnd + dishZstart) / 2
        const upperBLen = 0
        const upperBCenterZ = 0

        const sinkWestEdgeX = extCabCenterX - sinkW / 2     // sink 서쪽 면 (room 쪽)
        const sinkEastEdgeX = extCabCenterX + sinkW / 2     // sink 동쪽 면 (벽 쪽)
        const cabWestX = extCabCenterX - cabExtDepth / 2    // 하부장 서쪽 면
        const cabEastX = extCabCenterX + cabExtDepth / 2    // 하부장 동쪽 면 (= kitRight)
        const upperWestStripW = sinkWestEdgeX - cabWestX    // = 0.1
        const upperEastStripW = cabEastX - sinkEastEdgeX    // = 0.1
        const upperWestStripCenterX = (cabWestX + sinkWestEdgeX) / 2
        const upperEastStripCenterX = (sinkEastEdgeX + cabEastX) / 2
        const sinkAreaCenterZ = (sinkZstart + sinkZend) / 2
        const sinkAreaLen = sinkZend - sinkZstart

        return (
          <>
            {/* 하단 솔리드 박스 — extStartZ → dishZstart, Y 0~drawerSplitY (drawer + cab1 + sink lower + cab2 + cab3) */}
            {mainCabLen > 0.01 && <mesh position={[extCabCenterX, drawerSplitY / 2, mainCabCenterZ]}>
              <boxGeometry args={[cabExtDepth, drawerSplitY, mainCabLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            {/* 상단 박스 A — cab1 (drawerZEnd → sinkZstart) */}
            {upperALen > 0.01 && <mesh position={[extCabCenterX, upperY, upperACenterZ]}>
              <boxGeometry args={[cabExtDepth, upperH, upperALen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            {/* 상단 박스 B — cab2 + cab3 (sinkZend → dishZstart) */}
            {upperBLen > 0.01 && <mesh position={[extCabCenterX, upperY, upperBCenterZ]}>
              <boxGeometry args={[cabExtDepth, upperH, upperBLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            {/* sink 서측 strip (Y 0.42~0.84): cabWestX → sinkWestEdgeX, sink Z range */}
            {upperWestStripW > 0.001 && sinkAreaLen > 0.01 && <mesh position={[upperWestStripCenterX, upperY, sinkAreaCenterZ]}>
              <boxGeometry args={[upperWestStripW, upperH, sinkAreaLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            {/* sink 동측 strip (Y 0.42~0.84): sinkEastEdgeX → cabEastX, sink Z range */}
            {upperEastStripW > 0.001 && sinkAreaLen > 0.01 && <mesh position={[upperEastStripCenterX, upperY, sinkAreaCenterZ]}>
              <boxGeometry args={[upperEastStripW, upperH, sinkAreaLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            {/* drawer 슬롯 좌측(북) 주방장 벽 — 18mm 월넛 패널 */}
            <mesh position={[extCabCenterX, (drawerSplitY + 0.84) / 2, drawerZStart + 0.009]}>
              <boxGeometry args={[cabExtDepth, 0.84 - drawerSplitY, 0.018]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            <mesh position={[extCabCenterX, 0.42, (dishZstart + dishZend) / 2]}>
              <boxGeometry args={[0.6, 0.84, dishW]} />
              <meshStandardMaterial color="#e0e0e0" metalness={0.4} roughness={0.3} />
            </mesh>
            <mesh position={[extCabCenterX - 0.301, 0.42, (dishZstart + dishZend) / 2]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[dishW - 0.01, 0.8]} />
              <meshStandardMaterial color="#d5d5d5" metalness={0.5} roughness={0.25} />
            </mesh>
            <mesh position={[extCabCenterX - 0.31, 0.66, (dishZstart + dishZend) / 2]}>
              <boxGeometry args={[0.015, 0.02, 0.4]} />
              <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.15} />
            </mesh>
            <mesh position={[extCabCenterX - 0.31, 0.26, (dishZstart + dishZend) / 2]}>
              <boxGeometry args={[0.005, 0.02, 0.06]} />
              <meshStandardMaterial color="#888" metalness={0.6} roughness={0.2} />
            </mesh>
            {/* sink 하단 박스 (Y 0~drawerSplitY) — sinkZstart → sinkZend (mainCabLen 이 dishZstart 까지만 가니까 별도) */}
            {sinkAreaLen > 0.01 && <mesh position={[extCabCenterX, drawerSplitY / 2, sinkAreaCenterZ]}>
              <boxGeometry args={[cabExtDepth, drawerSplitY, sinkAreaLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            {/* 짜투리 풀박스는 KitchenRiceCookerDrawer (closedFront) 가 그룹 안에서 직접 렌더 → 별도 정적 박스 없음 */}
            {/* cab3 본체 — cab3Z0 → drawerSZ0 (drawer S 직전, 40cm cab) */}
            <mesh position={[extCabCenterX, 0.42, (cab3Z0 + drawerSZ0) / 2]}>
              <boxGeometry args={[cabExtDepth, 0.84, cabW]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {/* === 마지막 50cm 컬럼 — 빈공간(0~0.15) + 스윙도어 본체(0.15~0.40) + 드로어 슬롯(0.40~0.84) === */}
            {(() => {
              const lastColLen = 0.5
              const lastColZStart = extEndZ - lastColLen
              const lastColZEnd = extEndZ
              const lastColCenterZ = (lastColZStart + lastColZEnd) / 2
              const swingBottomY = 0.15
              const swingTopY = 0.40
              const lastDrawerBottomY = 0.40
              const lastDrawerTopY = 0.84
              const slotPanelT = 0.018
              const slotCenterY = (lastDrawerBottomY + lastDrawerTopY) / 2
              const slotH = lastDrawerTopY - lastDrawerBottomY
              return (
                <>
                  {/* 스윙 도어 영역 본체 (Y 0.15 ~ 0.40) */}
                  <mesh position={[extCabCenterX, (swingBottomY + swingTopY) / 2, lastColCenterZ]}>
                    <boxGeometry args={[0.6, swingTopY - swingBottomY, lastColLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 드로어 슬롯 — 5면 중 후면(동) / 천장 / 북측 패널 (남측은 cabinet 남쪽 마감벽이 가림) */}
                  <mesh position={[extWallInner - slotPanelT / 2, slotCenterY, lastColCenterZ]}>
                    <boxGeometry args={[slotPanelT, slotH, lastColLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  <mesh position={[extCabCenterX, lastDrawerTopY - slotPanelT / 2, lastColCenterZ]}>
                    <boxGeometry args={[0.6, slotPanelT, lastColLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  <mesh position={[extCabCenterX, slotCenterY, lastColZStart + slotPanelT / 2]}>
                    <boxGeometry args={[0.6, slotH, slotPanelT]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                </>
              )
            })()}
            {/* 남쪽 끝 마감 벽 — 동쪽으로 5cm 더 연장 (X depth 0.65, Z 두께 18mm) */}
            <mesh position={[extWallInner - 0.65 / 2 + 0.05, 0.42, extEndZ + 0.009]}>
              <boxGeometry args={[0.65, 0.84, 0.018]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {/* === 컬럼 도어 === */}
            {/* 정수기 drawer (북단 컬럼, drawerColW 0.5m) — 하단 도어 + 드로어 슬롯 */}
            {(() => {
              const dz = drawerZStart + drawerColLen / 2
              const dw = drawerColLen
              return (<group key="ext-lc-drawerN">
                {/* 하단 도어 (drawer 아래) */}
                <mesh position={[extCabCenterX - 0.301, drawerSplitY / 2, dz]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[dw - 0.005, drawerSplitY - 0.010]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
                <mesh position={[extCabCenterX - 0.31, drawerSplitY - 0.06, dz]}>
                  <boxGeometry args={[0.015, 0.08, 0.01]} />
                  <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                </mesh>
                {/* 캐비닛 슬롯 양쪽 고정 레일 트랙 */}
                <mesh position={[extCabCenterX, drawerSplitY + 0.008 + 0.001, drawerZStart + 0.018 + 0.005]}>
                  <boxGeometry args={[cabExtDepth - 0.04, 0.014, 0.018]} />
                  <meshStandardMaterial color="#777" metalness={0.85} roughness={0.30} />
                </mesh>
                <mesh position={[extCabCenterX, drawerSplitY + 0.008 + 0.001, drawerZEnd - 0.018 - 0.005]}>
                  <boxGeometry args={[cabExtDepth - 0.04, 0.014, 0.018]} />
                  <meshStandardMaterial color="#777" metalness={0.85} roughness={0.30} />
                </mesh>
                {/* drawer (밥솥 포함, F 키 슬라이드) */}
                <KitchenRiceCookerDrawer
                  extWallInner={extWallInner}
                  depth={cabExtDepth}
                  drawerZStart={drawerZStart}
                  drawerZEnd={drawerZEnd}
                  drawerBottomY={drawerSplitY}
                  drawerTopY={0.84}
                  walnutTex={walnutBodyTex}
                  doorId="kitchen-drawer"
                  activeDoorId={activeDoorId}
                />
              </group>)
            })()}
            {/* cab1, cab2, cab3 — 일반 40cm 도어 (Y 0.42 중심 × 0.8 높이) */}
            {([
              { z0: cab1Z0, key: 'cab1' },
              { z0: cab2Z0, key: 'cab2' },
              { z0: cab3Z0, key: 'cab3' },
            ] as const).map(({ z0, key }) => {
              const dz = z0 + cabW / 2
              return (
                <group key={`ext-lc-${key}`}>
                  <mesh position={[extCabCenterX - 0.301, 0.42, dz]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[cabW - 0.005, 0.8]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  <mesh position={[extCabCenterX - 0.31, 0.42, dz]}>
                    <boxGeometry args={[0.015, 0.08, 0.01]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}
            {(() => {
              const sinkDoorCount = 2
              const sinkDoorW = (sinkHalfD * 2) / sinkDoorCount
              return Array.from({ length: sinkDoorCount }).map((_, di) => {
                const dz = (sinkZpos - sinkHalfD) + sinkDoorW / 2 + di * sinkDoorW
                  return (<group key={`ext-lc-sink-${di}`}>
                  <mesh position={[extCabCenterX - 0.301, 0.42, dz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[sinkDoorW, 0.8]} /><meshStandardMaterial map={walnutBodyTex} roughness={0.45} /></mesh>
                  <mesh position={[extCabCenterX - 0.31, 0.42, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
                </group>)
              })
            })()}
            {/* 짜투리 thin pull-out drawer — F 키로 전체 풀박스 슬라이드 (closedFront) */}
            {tinyLen > 0.05 && (
              <KitchenRiceCookerDrawer
                extWallInner={extWallInner}
                depth={cabExtDepth}
                drawerZStart={tinyZ0}
                drawerZEnd={tinyZ0 + tinyLen}
                drawerBottomY={0}
                drawerTopY={0.84}
                walnutTex={walnutBodyTex}
                doorId="kitchen-tiny"
                activeDoorId={activeDoorId}
                withRiceCooker={false}
                closedFront={true}
              />
            )}
            {/* 마지막 50cm 컬럼 — 스윙 도어 패널 + 드로어 */}
            {(() => {
              const lastColLen = 0.5
              const lastColZStart = extEndZ - lastColLen
              const lastColZEnd = extEndZ
              const swingBottomY = 0.15
              const swingTopY = 0.40
              return (
                <group key="ext-lc-south-special">
                  {/* 캐비닛 슬롯 양쪽 고정 레일 트랙 */}
                  <mesh position={[extCabCenterX, 0.40 + 0.008 + 0.001, lastColZStart + 0.018 + 0.005]}>
                    <boxGeometry args={[0.6 - 0.04, 0.014, 0.018]} />
                    <meshStandardMaterial color="#777" metalness={0.85} roughness={0.30} />
                  </mesh>
                  <mesh position={[extCabCenterX, 0.40 + 0.008 + 0.001, lastColZEnd - 0.018 - 0.005]}>
                    <boxGeometry args={[0.6 - 0.04, 0.014, 0.018]} />
                    <meshStandardMaterial color="#777" metalness={0.85} roughness={0.30} />
                  </mesh>
                  {/* 드로어 (밥솥 없이) + 하단 스윙 도어 + 로봇청소기 (모두 같은 F 키 토글) */}
                  <KitchenRiceCookerDrawer
                    extWallInner={extWallInner}
                    depth={0.6}
                    drawerZStart={lastColZStart}
                    drawerZEnd={lastColZEnd}
                    drawerBottomY={0.40}
                    drawerTopY={0.84}
                    walnutTex={walnutBodyTex}
                    doorId="kitchen-drawer-south"
                    activeDoorId={activeDoorId}
                    withRiceCooker={false}
                    swingDoorBelow={{ bottomY: swingBottomY, topY: swingTopY, hingeZend: 'north' }}
                    withVacuum={true}
                  />
                </group>
              )
            })()}
            {/* === 싱크볼 + 수전 그룹 === */}
            <group>
            {(() => {
              const sinkZ = sinkZpos
              const sinkW = 0.4      // 싱크 깊이(X, 벽-룸 방향) 400mm
              const sinkD = 0.838    // 싱크 가로(Z, 벽 따라) 838mm
              const rim = 0.015
              const depth = 0.215    // 볼 높이(Y) 215mm
              const topY = 0.86
              const ctH = 0.04
              // 조리대(상판) — 동쪽(벽쪽, +X) 50mm + 서쪽(전면, -X) 50mm 양방향 연장.
              // 싱크 위치는 그대로(extCabCenterX 기준) → 양옆 strip 모두 넓어짐 (대칭).
              const ctBackExt = 0.05    // 동(벽)쪽 연장
              const ctFrontExt = 0.05   // 서(전면)쪽 연장
              const ctW = 0.62 + ctBackExt + ctFrontExt                          // 0.72
              const ctCenterX = extCabCenterX + (ctBackExt - ctFrontExt) / 2     // 0 (대칭)
              const sinkZstart = sinkZ - sinkD / 2
              const sinkZend = sinkZ + sinkD / 2
              const beforeLen = Math.abs(sinkZstart - extStartZ)
              const beforeCenterZ = (extStartZ + sinkZstart) / 2
              // 상판 남쪽 끝을 cabAfter 본체보다 50mm 더 남쪽으로 연장
              const ctSouthExt = 0.05
              const ctEndZ = extEndZ + ctSouthExt
              const afterLen = Math.abs(ctEndZ - sinkZend)
              const afterCenterZ = (sinkZend + ctEndZ) / 2
              // 싱크 좌우 (X 방향) strip
              const frontStripW = (0.62 - sinkW) / 2 + ctFrontExt   // 0.11 + 0.05 = 0.16
              const backStripW  = (0.62 - sinkW) / 2 + ctBackExt    // 0.11 + 0.05 = 0.16
              return (
                <>
                  {beforeLen > 0.01 && <mesh position={[ctCenterX, topY, beforeCenterZ]}><boxGeometry args={[ctW, ctH, beforeLen]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>}
                  {afterLen > 0.01 && <mesh position={[ctCenterX, topY, afterCenterZ]}><boxGeometry args={[ctW, ctH, afterLen]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>}
                  <mesh position={[extCabCenterX - sinkW / 2 - frontStripW / 2, topY, sinkZ]}><boxGeometry args={[frontStripW, ctH, sinkD]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
                  <mesh position={[extCabCenterX + sinkW / 2 + backStripW / 2, topY, sinkZ]}><boxGeometry args={[backStripW, ctH, sinkD]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
                  <mesh position={[extCabCenterX, topY + 0.005, sinkZ + sinkD / 2 - rim / 2]}>
                    <boxGeometry args={[sinkW, 0.01, rim]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY + 0.005, sinkZ - sinkD / 2 + rim / 2]}>
                    <boxGeometry args={[sinkW, 0.01, rim]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX - sinkW / 2 + rim / 2, topY + 0.005, sinkZ]}>
                    <boxGeometry args={[rim, 0.01, sinkD]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX + sinkW / 2 - rim / 2, topY + 0.005, sinkZ]}>
                    <boxGeometry args={[rim, 0.01, sinkD]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth / 2, sinkZ + sinkD / 2 - rim]}>
                    <boxGeometry args={[sinkW - rim * 2, depth, 0.003]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth / 2, sinkZ - sinkD / 2 + rim]}>
                    <boxGeometry args={[sinkW - rim * 2, depth, 0.003]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX - sinkW / 2 + rim, topY - depth / 2, sinkZ]}>
                    <boxGeometry args={[0.003, depth, sinkD - rim * 2]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX + sinkW / 2 - rim, topY - depth / 2, sinkZ]}>
                    <boxGeometry args={[0.003, depth, sinkD - rim * 2]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth, sinkZ]}>
                    <boxGeometry args={[sinkW - rim * 2, 0.003, sinkD - rim * 2]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.2} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth + 0.005, sinkZ]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.02, 16]} />
                    <meshStandardMaterial color="#555" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )
            })()}
            {(() => {
              // 수전 — 싱크볼과 X/Z 정렬:
              //  · Z = sinkZpos (sink 중심 = sink 두 도어 4|5 boundary)
              //  · 베이스 X = 싱크 뒤쪽 림 + 30mm (back strip 위에 안착)
              //  · 가로 암(0.24m)이 -X 방향으로 뻗어서 spout 끝이 정확히 싱크 중심(=배수구)에 위치
              const faucetZ = sinkZpos
              const sinkBackRimX = extCabCenterX + 0.4 / 2  // sinkW/2
              const baseX = sinkBackRimX + 0.03
              return (
                <>
                  <mesh position={[baseX, 0.87, faucetZ]}>
                    <cylinderGeometry args={[0.02, 0.025, 0.02, 12]} />
                    <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.08} />
                  </mesh>
                  <mesh position={[baseX, 0.95, faucetZ]}>
                    <cylinderGeometry args={[0.01, 0.012, 0.16, 8]} />
                    <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.08} />
                  </mesh>
                  <mesh position={[baseX - 0.12, 1.02, faucetZ]}>
                    <boxGeometry args={[0.24, 0.015, 0.015]} />
                    <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[baseX - 0.23, 1.0, faucetZ]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
                    <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )
            })()}
            </group>{/* /싱크볼 + 수전 그룹 */}
            {/* === 백스플래시 — 동측 벽 step 따라가는 분할 타일 === */}
            {(() => {
              const tileBottomY = 0.84
              const tileTopY = 1.45
              const tileH = tileTopY - tileBottomY
              const tileThick = 0.008
              const tileCenterY = (tileBottomY + tileTopY) / 2
              // 동측 벽 step Z = babyTopWallZ + 0.324 (라인 231 wall end)
              const stepZ = (babyTop - T2) + 0.324    // ≈ -5.062
              const stepDX = 0.055                     // 벽이 들어가는 깊이 (라인 301: 2.555 vs 라인 231: 2.500)

              // 북쪽 슬랩
              const northSlabZStart = extStartZ
              const northSlabZEnd = stepZ
              const northSlabLen = northSlabZEnd - northSlabZStart
              const northSlabCenterZ = (northSlabZStart + northSlabZEnd) / 2
              const northSlabCenterX = extWallInner - tileThick / 2 - 0.001

              // 남쪽 슬랩 (벽이 5.5cm 안쪽)
              const southSlabZStart = stepZ
              const southSlabZEnd = extEndZ
              const southSlabLen = southSlabZEnd - southSlabZStart
              const southSlabCenterZ = (southSlabZStart + southSlabZEnd) / 2
              const southSlabCenterX = extWallInner + stepDX - tileThick / 2 - 0.001

              // step 커버 perpendicular — 북쪽 슬랩 남쪽 끝 ↔ 남쪽 슬랩 X 차이 면
              const stepCoverCenterX = extWallInner + stepDX / 2 - tileThick / 2 - 0.001
              const stepCoverCenterZ = stepZ + tileThick / 2 + 0.001

              // 북쪽 벽 wrap (창문 안 가리도록 0.4m 단축)
              const northWrapLen = 0.4
              const northWrapCenterX = extWallInner - northWrapLen / 2
              const northWrapCenterZ = extStartZ + tileThick / 2 + 0.001

              return (
                <>
                  <mesh position={[northSlabCenterX, tileCenterY, northSlabCenterZ]}>
                    <boxGeometry args={[tileThick, tileH, northSlabLen]} />
                    <meshStandardMaterial map={tileMapEastNorth} roughness={0.18} metalness={0.04} />
                  </mesh>
                  <mesh position={[southSlabCenterX, tileCenterY, southSlabCenterZ]}>
                    <boxGeometry args={[tileThick, tileH, southSlabLen]} />
                    <meshStandardMaterial map={tileMapEastSouth} roughness={0.18} metalness={0.04} />
                  </mesh>
                  {/* step 커버 (5.5cm 면, 남쪽을 향함 = -Z 면) */}
                  <mesh position={[stepCoverCenterX, tileCenterY, stepCoverCenterZ]}>
                    <boxGeometry args={[stepDX, tileH, tileThick]} />
                    <meshStandardMaterial map={tileMapNorth} roughness={0.18} metalness={0.04} />
                  </mesh>
                  {/* 북쪽 벽 wrap 코너 마감 — 0.4m */}
                  <mesh position={[northWrapCenterX, tileCenterY, northWrapCenterZ]}>
                    <boxGeometry args={[northWrapLen, tileH, tileThick]} />
                    <meshStandardMaterial map={tileMapNorth} roughness={0.18} metalness={0.04} />
                  </mesh>
                </>
              )
            })()}
            {/* === 상부장 재구성 === 정수기 위 50cm + 후드 60cm + 나머지 40cm 균등(마지막 약간 큼) */}
            {(() => {
              const upperY = 1.80
              const upperH = 0.70
              // 남쪽: 동쪽으로 50mm 연장 (depth 0.35 → 0.40), 동쪽 면 = extWallInner + 0.05
              const upperEastShift = 0.05
              const upperDepth = 0.35 + upperEastShift   // 남쪽 cab depth
              const upperX = extWallInner + upperEastShift - upperDepth / 2  // 남쪽 cab X 중심
              // 북쪽 3개: 벽이 55mm 안쪽으로 튀어나옴 → 후면을 extWallInner 에 맞춤.
              //   depth 0.35 (east shift 없음), 전면 X 는 남쪽과 동일 (= extWallInner - 0.35)
              const upperDepthN = 0.35
              const upperXN = extWallInner - upperDepthN / 2

              // 슬롯 정의 — extStartZ(=캐비닛 북단) 에서 시작
              const cab50W = 0.5     // 후드 왼편(정수기 위) 캐비닛 — 50cm
              const hoodW = 0.898    // 후드 가로 898mm
              const baseCabW = 0.4

              const cab50ZStart = extStartZ
              const cab50ZEnd = cab50ZStart + cab50W
              const hoodZStart = cab50ZEnd
              const hoodZEnd = hoodZStart + hoodW
              const remainStartZ = hoodZEnd
              const remainEndZ = extEndZ
              const remainLen = remainEndZ - remainStartZ
              const cabCount = Math.max(1, Math.floor(remainLen / baseCabW))
              const lastCabW = remainLen - baseCabW * (cabCount - 1)

              const ucDoorIds: DoorId[] = [
                'kitchen-uc-0', 'kitchen-uc-1', 'kitchen-uc-2', 'kitchen-uc-3', 'kitchen-uc-4',
              ]
              // 북쪽 3 = purifier + ext-uc-0 + ext-uc-1 → ext-uc index 0, 1 이 북쪽
              const NORTH_REMAIN_COUNT = 2

              return (
                <>
                  {/* 50cm 정수기 위 캐비닛 — 내부 수평 3분할. 북쪽 wall 에 후면 정렬 */}
                  <KitchenUpperCabinet
                    key="ext-uc-purifier"
                    cabX={upperXN}
                    cabY={upperY}
                    zStart={cab50ZStart}
                    width={cab50W}
                    depth={upperDepthN}
                    height={upperH}
                    divisions={3}
                    walnutTex={walnutBodyTex}
                    doorId="kitchen-uc-purifier"
                    activeDoorId={activeDoorId}
                  />


                  {/* 60cm 후드 — 캐노피 + 굴뚝 + 컨트롤 패널 */}
                  {(() => {
                    const hoodCenterZ = (hoodZStart + hoodZEnd) / 2
                    const canopyBottomY = upperY - upperH / 2          // 1.45
                    const canopyTopY = canopyBottomY + 0.10            // 1.55
                    // 후드도 상부장과 같이 동쪽 50mm 연장 (동쪽 면 = extWallInner + 0.05)
                    const canopyDepthX = 0.50    // 후드 깊이 500mm
                    const canopyX = extWallInner + upperEastShift - canopyDepthX / 2
                    const chimneyDepthX = 0.30
                    const chimneyW = 0.30
                    const chimneyX = extWallInner + upperEastShift - chimneyDepthX / 2
                    const chimneyBottomY = canopyTopY
                    const chimneyTopY = WALL_HEIGHT - 0.005  // 천장 간섭 방지 -5mm
                    const chimneyCenterY = (chimneyBottomY + chimneyTopY) / 2
                    return (
                      <group key="ext-uc-hood">
                        {/* 캐노피 (스테인레스 평판) */}
                        <mesh position={[canopyX, (canopyBottomY + canopyTopY) / 2, hoodCenterZ]}>
                          <boxGeometry args={[canopyDepthX, canopyTopY - canopyBottomY, hoodW]} />
                          <meshStandardMaterial color="#bcbcc4" metalness={0.85} roughness={0.20} />
                        </mesh>
                        {/* 캐노피 바닥 그릴/필터 */}
                        <mesh position={[canopyX + 0.02, canopyBottomY + 0.003, hoodCenterZ]}>
                          <boxGeometry args={[canopyDepthX - 0.06, 0.006, hoodW - 0.10]} />
                          <meshStandardMaterial color="#dcdce0" metalness={0.7} roughness={0.40} />
                        </mesh>
                        {/* 정면 컨트롤 패널 (검정 디스플레이) */}
                        <mesh position={[canopyX - canopyDepthX / 2 - 0.0005, canopyBottomY + 0.05, hoodCenterZ]}>
                          <boxGeometry args={[0.001, 0.030, 0.18]} />
                          <meshStandardMaterial color="#0a0a0e" emissive="#1a2030" emissiveIntensity={0.6} />
                        </mesh>
                        {/* 굴뚝 박스 — 캐노피 위 → 천장 */}
                        <mesh position={[chimneyX, chimneyCenterY, hoodCenterZ]}>
                          <boxGeometry args={[chimneyDepthX, chimneyTopY - chimneyBottomY, chimneyW]} />
                          <meshStandardMaterial color="#a4a4ac" metalness={0.85} roughness={0.30} />
                        </mesh>
                      </group>
                    )
                  })()}

                  {/* 나머지 — 40cm 캐비닛 (마지막은 lastCabW 로 잔여 흡수). 내부 4분할 */}
                  {Array.from({ length: cabCount }).map((_, i) => {
                    const w = i === cabCount - 1 ? lastCabW : baseCabW
                    const zStart = remainStartZ + baseCabW * i
                    const id = ucDoorIds[Math.min(i, ucDoorIds.length - 1)]
                    const isNorth = i < NORTH_REMAIN_COUNT  // 북쪽 2개 (purifier 와 합쳐 북쪽 3)
                    return (
                      <KitchenUpperCabinet
                        key={`ext-uc-${i}`}
                        cabX={isNorth ? upperXN : upperX}
                        cabY={upperY}
                        zStart={zStart}
                        width={w}
                        depth={isNorth ? upperDepthN : upperDepth}
                        height={upperH}
                        divisions={4}
                        walnutTex={walnutBodyTex}
                        doorId={id}
                        activeDoorId={activeDoorId}
                      />
                    )
                  })}
                </>
              )
            })()}
            {(() => {
              const purifierD = 0.506
              const purifierW = 0.260
              const wallGap = 0.06   // 동(東) 벽 + 북(北) 벽 각각 60mm 띄움
              const pX = extWallInner - purifierD / 2 - wallGap
              const pY = 0.88
              const pZ = (cabinetZ - 0.3) + purifierW / 2 + wallGap
              return <CuckooWaterPurifier position={[pX, pY, pZ]} rotation={-Math.PI / 2} />
            })()}
          </>
        )
      })()}

      {/* === 4도어 냉장고 + 김치냉장고 + 빌트인 상부장 (좌측 벽 — 180° 회전) === */}
      {(() => {
        const fridgeW = Refrigerator.W
        const fridgeD = Refrigerator.D

        const f2W = KimchiFridge.W
        // 아기방 문을 가리지 않도록 남쪽 끝(groupZEnd)을 babyDoorEnd 에 정렬 → 북쪽으로 밀어 올림.
        // 김치냉장고가 fridge 보다 남쪽 (groupZEnd 측) 에 위치 — 원본 우측 벽 배치와 동일한 순서 유지.
        const babyDoorEndZ = babyBottomZ - 0.22 - 0.9
        const f2Z = babyDoorEndZ - f2W / 2
        const fridgeZ = f2Z - (fridgeW / 2 + f2W / 2 + 0.080)

        const sideT = 0.030
        const groupZStart = fridgeZ - fridgeW / 2
        const groupZEnd = f2Z + f2W / 2
        const groupLen = groupZEnd - groupZStart
        const outerZStart = groupZStart - sideT
        const outerZEnd = groupZEnd + sideT
        const outerLen = outerZEnd - outerZStart
        const outerCenterZ = (outerZStart + outerZEnd) / 2
        const cabDepth = fridgeD
        // 캐비닛 박스만 120mm 뒤(-X)로 물러섬. 냉장고/김치냉장고 모델은 그대로 유지.
        const CAB_BACK_OFFSET = 0.12
        const fridgeModelX = kitLeft + cabDepth / 2                    // 모델 위치 (그대로)
        const cabX = fridgeModelX - CAB_BACK_OFFSET                    // 박스 위치 (-X 120mm)
        const cabBottomY = 1.800 - 0.030
        const cabTopY = WALL_HEIGHT + 0.030 - 0.050   // 천장과의 간섭 방지 -50mm
        const cabH = cabTopY - cabBottomY
        const cabCenterY = (cabBottomY + cabTopY) / 2
        const doorCount = Math.max(2, Math.round(groupLen / 0.6))
        const doorLen = groupLen / doorCount
        const doorGap = 0.003

        return (
          <group>
            {/* 모델은 -X 정면으로 하드코딩 → 180° 회전 그룹으로 +X(룸 인테리어) 정면. 위치 고정. */}
            <group position={[fridgeModelX, 0, fridgeZ]} rotation={[0, Math.PI, 0]}>
              <Refrigerator position={[0, 0]} />
              <KimchiFridge frontFaceX={-fridgeD / 2} centerZ={-(f2Z - fridgeZ)} />
            </group>

            {/* 빌트인 상부장 + 측면 벽 — 박스만 -X 120mm 시프트 */}
            <mesh position={[cabX, cabCenterY, outerCenterZ]}>
              <boxGeometry args={[cabDepth, cabH, outerLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {Array.from({ length: doorCount }).map((_, di) => {
              const dz = groupZStart + doorLen * (di + 0.5)
              return (
                <mesh
                  key={`fridge-uc-${di}`}
                  position={[cabX + cabDepth / 2 + 0.002, cabCenterY, dz]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <planeGeometry args={[doorLen - doorGap, cabH - 0.010]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
              )
            })}
            <mesh position={[cabX, cabBottomY / 2, outerZStart + sideT / 2]}>
              <boxGeometry args={[cabDepth, cabBottomY, sideT]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            <mesh position={[cabX, cabBottomY / 2, outerZEnd - sideT / 2]}>
              <boxGeometry args={[cabDepth, cabBottomY, sideT]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {(() => {
              // 김치냉장고가 더 얕음 → 벽 쪽(-X) 빈 공간을 채움. 박스이므로 시프트 적용.
              const fillerD = fridgeD - KimchiFridge.D
              const fillerX = (kitLeft + fillerD / 2) - CAB_BACK_OFFSET
              const kimchiZStart = f2Z - f2W / 2
              const kimchiZEnd = f2Z + f2W / 2
              return (
                <mesh position={[fillerX, 1.800 / 2, (kimchiZStart + kimchiZEnd) / 2]}>
                  <boxGeometry args={[fillerD, 1.800, f2W]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
              )
            })()}
          </group>
        )
      })()}

      {/* === 냉장고장 ↔ 키큰장 사이 스윙도어 (2짝) — 주방/세탁실 경계 ===
           경첩: 키큰장 남쪽 끝(tallZEnd) + 냉장고장 북쪽 끝(outerZStart),
                 둘 다 캐비닛 전면(싱크대쪽 = +X 면) 코너에 부착. 가운데에서 만남.
           하단 600mm 개방 — 강아지 통로. F 키 토글, 주방 안쪽으로 swing. */}
      {(() => {
        const doorThickX = 0.040                                       // 도어 패널 두께(X)
        // 냉장고장/키큰장 모두 -X 120mm 시프트됨 → 전면 평면도 같이 이동
        const hingeX = kitLeft + Refrigerator.D - 0.12                 // 캐비닛 전면(+X) 평면
        const tallZEndLocal = babyTop - T2 - 1.119                     // 키큰장 남쪽 끝 (북쪽 경첩)
        const fridgeOuterZStart =
          (babyBottomZ - 0.22 - 0.9) - KimchiFridge.W - 0.080 - Refrigerator.W - 0.030 // 냉장고장 북쪽 끝 (남쪽 경첩)
        const midZ = (tallZEndLocal + fridgeOuterZStart) / 2
        const leafLen = (midZ - tallZEndLocal) - 0.003                 // 각 도어 길이 = 갭/2 - 미세 여유
        const dogGapH = 0.6                                            // 하단 600mm 개방
        const doorTopY = WALL_HEIGHT
        const doorH = doorTopY - dogGapH
        const doorCenterY = (dogGapH + doorTopY) / 2
        return (
          <>
            <KitchenPetPassDoor
              hingeX={hingeX}
              hingeZ={tallZEndLocal}
              extendDir={+1}
              leafLen={leafLen}
              doorThickX={doorThickX}
              doorH={doorH}
              doorCenterY={doorCenterY}
              walnutTex={walnutBodyTex}
              doorId="kitchen-pet-pass-n"
              activeDoorId={activeDoorId}
            />
            <KitchenPetPassDoor
              hingeX={hingeX}
              hingeZ={fridgeOuterZStart}
              extendDir={-1}
              leafLen={leafLen}
              doorThickX={doorThickX}
              doorH={doorH}
              doorCenterY={doorCenterY}
              walnutTex={walnutBodyTex}
              doorId="kitchen-pet-pass-s"
              activeDoorId={activeDoorId}
            />
          </>
        )
      })()}

      {/* === 정수기 맞은편 키큰장 (서벽 북단) — 가운데 빌트인 오븐 === */}
      {(() => {
        // 깊이는 4도어 냉장고장과 동일
        const tallDepth = Refrigerator.D
        // 키큰장 전체를 -X 120mm 뒤로 시프트 (냉장고장과 동일)
        const CAB_BACK_OFFSET = 0.12
        const tallLeft = kitLeft - CAB_BACK_OFFSET                     // 키큰장 -X 끝 (벽 안쪽)
        const tallX = tallLeft + tallDepth / 2
        const tallFrontX = tallLeft + tallDepth
        // Z 폭: line 209 의 서벽 솔리드 구간 (wall2300Z ~ babyTop-T2-1.119) 내부 면 길이
        const tallZStart = wall2300Z + T2
        const tallZEnd = babyTop - T2 - 1.119
        const tallZLen = tallZEnd - tallZStart
        const tallZCenter = (tallZStart + tallZEnd) / 2

        // 분할: 하단 도어(0~lowerH) / 오븐 오픈 선반(lowerH~upperBottomY) / 상단 유리장+drawer(upperBottomY~tallTopY)
        // 오픈 선반 H 를 70% 로 줄이고 그만큼 하단장을 연장 (구 0.85→1.03, 오픈 선반 0.6→0.42)
        const tallTopY = WALL_HEIGHT - 0.050          // 천장과의 간섭 방지 -50mm
        const upperBottomY = 1.45
        const ovenSlotH = 0.42                       // 0.6 × 0.7
        const ovenTopY = upperBottomY                // 1.45
        const ovenBottomY = ovenTopY - ovenSlotH     // 1.03
        const lowerH = ovenBottomY                   // 1.03
        const upperH = tallTopY - upperBottomY

        // drawer 슬롯은 visible 영역(kitLeft 부터)에서 30cm. 벽 안쪽 12cm 는 dead space.
        // 전면 50cm 가 솔리드 본체/오븐/유리장.
        const drawerSlotDepthX = 0.30
        const drawerSlotFrontX = kitLeft                       // visible 영역 시작
        const dividerX = drawerSlotFrontX + drawerSlotDepthX   // = kitLeft + 0.30
        const displayDepthX = tallFrontX - dividerX            // 0.50 (= kitLeft + 0.80 - kitLeft - 0.30)
        const displayCenterX = dividerX + displayDepthX / 2

        // 5mm 단차: 인접 drawer face 사이 5mm gap (clearance 0.0025 + 슬롯 경계 공유)
        // 또한 drawer face Z 를 캐비닛 남쪽 외면에서 5mm 안쪽 (= tallZEnd - 0.005)
        const drawerClearance = 0.0025
        const drawerSlotZEnd = tallZEnd - 0.005    // face +Z 면 = tallZEnd - 5mm
        const drawerSlotZStart = tallZStart + 0.018  // panelT 만큼 안쪽 (북 측면에 부딪히지 않게)

        return (
          <group>
            {/* 본체 — 하단 솔리드 박스 (front 50cm × Y [0, lowerH]). 뒷쪽 drawer 슬롯은 vis 30cm */}
            <mesh position={[displayCenterX, lowerH / 2, tallZCenter]}>
              <boxGeometry args={[displayDepthX, lowerH, tallZLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>

            {/* 오픈 선반 (오븐 자리) — 전면 50cm. 천장 패널만 추가 (상단 유리장 바닥 겸함) */}
            {(() => {
              const panelT = 0.018
              return (
                <mesh position={[displayCenterX, upperBottomY - panelT / 2, tallZCenter]}>
                  <boxGeometry args={[displayDepthX, panelT, tallZLen]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
              )
            })()}

            {/* 본체 — 상단 유리장 + 3 단 drawer (top=유리장 뒤, mid=오븐 뒤, bot=하부장 뒤) */}
            {(() => {
              const panelT = 0.018
              const upCenterY = upperBottomY + upperH / 2
              const interiorZLen = tallZLen - panelT * 2
              return (
                <>
                  {/* 디스플레이/drawer 분리 격판 — Y [0, tallTopY] 전체 (drawer 슬롯 +X 벽) */}
                  <mesh position={[dividerX + panelT / 2, tallTopY / 2, tallZCenter]}>
                    <boxGeometry args={[panelT, tallTopY, tallZLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* drawer 슬롯 -X 벽 (벽쪽) */}
                  <mesh position={[drawerSlotFrontX + panelT / 2, tallTopY / 2, tallZCenter]}>
                    <boxGeometry args={[panelT, tallTopY, tallZLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 좌측면 (북) — 전체 깊이, 전체 높이 */}
                  <mesh position={[tallX, tallTopY / 2, tallZStart + panelT / 2]}>
                    <boxGeometry args={[tallDepth, tallTopY, panelT]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 우측면 (남) — 디스플레이 영역(전면 0.50m)만 */}
                  <mesh position={[displayCenterX, tallTopY / 2, tallZEnd - panelT / 2]}>
                    <boxGeometry args={[displayDepthX, tallTopY, panelT]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 상단면 (천장) — 전체 깊이 */}
                  <mesh position={[tallX, tallTopY - panelT / 2, tallZCenter]}>
                    <boxGeometry args={[tallDepth, panelT, tallZLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 중간 선반 — 상단 유리장 내 */}
                  <mesh position={[displayCenterX, upCenterY, tallZCenter]}>
                    <boxGeometry args={[displayDepthX - 0.04, panelT, interiorZLen - 0.005]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* TOP drawer — 유리장 뒤 (Y [upperBottomY, WALL_HEIGHT]) */}
                  <KitchenTallBackDrawer
                    slotFrontX={drawerSlotFrontX + panelT}
                    slotBackX={dividerX}
                    slotZStart={drawerSlotZStart}
                    slotZEnd={drawerSlotZEnd}
                    slotBottomY={upperBottomY}
                    slotTopY={WALL_HEIGHT}
                    clearance={drawerClearance}
                    openDistance={0.50}
                    walnutTex={walnutBodyTex}
                    doorId="kitchen-tall-drawer"
                    activeDoorId={activeDoorId}
                  />
                  {/* MIDDLE drawer — 오븐 뒤 (Y [lowerH, upperBottomY]) */}
                  <KitchenTallBackDrawer
                    slotFrontX={drawerSlotFrontX + panelT}
                    slotBackX={dividerX}
                    slotZStart={drawerSlotZStart}
                    slotZEnd={drawerSlotZEnd}
                    slotBottomY={lowerH}
                    slotTopY={upperBottomY}
                    clearance={drawerClearance}
                    openDistance={0.50}
                    walnutTex={walnutBodyTex}
                    doorId="kitchen-tall-drawer-mid"
                    activeDoorId={activeDoorId}
                  />
                  {/* BOTTOM drawer — 하부장 뒤 (Y [0, lowerH]) */}
                  <KitchenTallBackDrawer
                    slotFrontX={drawerSlotFrontX + panelT}
                    slotBackX={dividerX}
                    slotZStart={drawerSlotZStart}
                    slotZEnd={drawerSlotZEnd}
                    slotBottomY={0}
                    slotTopY={lowerH}
                    clearance={drawerClearance}
                    openDistance={0.50}
                    walnutTex={walnutBodyTex}
                    doorId="kitchen-tall-drawer-bot"
                    activeDoorId={activeDoorId}
                  />
                </>
              )
            })()}

            {/* 하단 도어 (2분할) */}
            {[0, 1].map((i) => {
              const dw = tallZLen / 2
              const dz = tallZStart + dw * (i + 0.5)
              return (
                <group key={`tall-lower-door-${i}`}>
                  <mesh position={[tallFrontX + 0.001, lowerH / 2, dz]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[dw - 0.005, lowerH - 0.010]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 손잡이 (도어 상단) */}
                  <mesh position={[tallFrontX + 0.010, lowerH - 0.06, dz]}>
                    <boxGeometry args={[0.015, 0.08, 0.01]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}

            {/* 오븐 — 오픈 선반 바닥(lowerH=0.85) 위에 안착. LightWaveOven H=0.330 → centerY=1.015 */}
            <Suspense fallback={null}>
              <LightWaveOven
                position={[tallFrontX - 0.515 / 2, lowerH + 0.330 / 2, tallZCenter]}
                rotation={Math.PI / 2}
              />
            </Suspense>

            {/* 상단 도어 (2분할) */}
            {[0, 1].map((i) => {
              const dw = tallZLen / 2
              const dz = tallZStart + dw * (i + 0.5)
              return (
                <group key={`tall-upper-door-${i}`}>
                  <mesh position={[tallFrontX + 0.001, upperBottomY + upperH / 2, dz]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[dw - 0.005, upperH - 0.010]} />
                    <meshStandardMaterial color="#cfe0e6" roughness={0.05} metalness={0.1} transparent opacity={0.3} />
                  </mesh>
                  {/* 손잡이 (도어 하단) */}
                  <mesh position={[tallFrontX + 0.010, upperBottomY + 0.06, dz]}>
                    <boxGeometry args={[0.015, 0.08, 0.01]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}
          </group>
        )
      })()}

      {/* === 식탁 + 펜던트 조명 + 의자 — 회전 해제(east-west), 주방 남쪽 빈 공간 가운데 === */}
      {(() => {
        // 식탁 1.8m(X) × 0.9m(Z). 주방 남쪽 빈 공간 Z [extEndZ_, kitchenSouthZ] = [-3.273, -1.591] (1.682m)
        // 의자 4개 (2 N + 2 S) — 식탁 안쪽으로 200mm tucked
        const extEndZ_ = (babyBottomZ - 0.22 - 0.9) + 0.42        // ≈ -3.273 (동측 하부장 남쪽 끝)
        const tableCenterX = kitRight - 0.85             // 주방 X 가운데
        const tableCenterZ = extEndZ_ + 0.75 + 0.45       // 빈 공간 Z 가운데 ≈ -2.432

        const woodColor = '#5a3018'
        const cushionColor = '#1a1a1a'

        // 의자 1개 렌더 — local +X = 정면, rotY 로 방향 회전
        const renderChair = (cx: number, cz: number, rotY: number, key: string) => (
          <group key={key} position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
            <mesh position={[0, 0.42, 0]}>
              <boxGeometry args={[0.46, 0.04, 0.46]} />
              <meshStandardMaterial color={woodColor} roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.46, 0]}>
              <boxGeometry args={[0.42, 0.05, 0.42]} />
              <meshStandardMaterial color={cushionColor} roughness={0.85} />
            </mesh>
            {[
              [-0.20, -0.20],
              [-0.20, +0.20],
              [+0.20, -0.20],
              [+0.20, +0.20],
            ].map(([lx, lz], i) => (
              <mesh key={`leg-${i}`} position={[lx, 0.20, lz]}>
                <boxGeometry args={[0.035, 0.40, 0.035]} />
                <meshStandardMaterial color={woodColor} roughness={0.55} />
              </mesh>
            ))}
            {[-0.20, +0.20].map((pz, i) => (
              <mesh key={`back-post-${i}`} position={[-0.21, 0.62, pz]}>
                <boxGeometry args={[0.035, 0.46, 0.035]} />
                <meshStandardMaterial color={woodColor} roughness={0.55} />
              </mesh>
            ))}
            <mesh position={[-0.21, 0.84, 0]}>
              <boxGeometry args={[0.035, 0.035, 0.42]} />
              <meshStandardMaterial color={woodColor} roughness={0.55} />
            </mesh>
            <mesh position={[-0.18, 0.66, 0]}>
              <boxGeometry args={[0.06, 0.36, 0.40]} />
              <meshStandardMaterial color={cushionColor} roughness={0.85} />
            </mesh>
            {[-0.20, +0.20].map((az, i) => (
              <mesh key={`arm-${i}`} position={[-0.05, 0.62, az]}>
                <boxGeometry args={[0.34, 0.025, 0.05]} />
                <meshStandardMaterial color={woodColor} roughness={0.55} />
              </mesh>
            ))}
            {[-0.20, +0.20].map((az, i) => (
              <mesh key={`arm-support-${i}`} position={[+0.10, 0.53, az]}>
                <boxGeometry args={[0.025, 0.20, 0.025]} />
                <meshStandardMaterial color={woodColor} roughness={0.55} />
              </mesh>
            ))}
          </group>
        )

        // 의자 4개 — 2개 북측(+ S 향함, rot -π/2), 2개 남측(N 향함, rot +π/2)
        // 식탁 안쪽으로 200mm tucked: chair Z = tableCenterZ ± (0.45 + 0.23 - 0.20) = ±0.48
        const nChairZ = tableCenterZ - 0.48
        const sChairZ = tableCenterZ + 0.48
        // 의자 X 위치 — 긴 축(1.8m) 위에 좌우 ±0.45
        const chairXOffset = 0.45
        const leftChairX = tableCenterX - chairXOffset
        const rightChairX = tableCenterX + chairXOffset

        return (
          <>
            {/* 식탁 — 회전 없음 (TABLE_W=1.8 along X, TABLE_D=0.9 along Z) */}
            <DiningTable position={[tableCenterX, tableCenterZ]} active={kitchenActive} />

            {/* 북측 의자 2개 (남쪽 향함, rot -π/2 → local +X = world +Z) */}
            {renderChair(leftChairX, nChairZ, -Math.PI / 2, 'chair-n-l')}
            {renderChair(rightChairX, nChairZ, -Math.PI / 2, 'chair-n-r')}

            {/* 남측 의자 2개 (북쪽 향함, rot +π/2 → local +X = world -Z) */}
            {renderChair(leftChairX, sChairZ, Math.PI / 2, 'chair-s-l')}
            {renderChair(rightChairX, sChairZ, Math.PI / 2, 'chair-s-r')}
          </>
        )
      })()}

      {/* 우측 하부장(밥솥 칸)은 메인 ㄱ자 하부장에 통합됨 — 위 메인 IIFE 의 cabAfter + 밥솥 으로 이동 */}

    </group>
    </>
  )
}

/**
 * 정수기 하단 밥솥 drawer — 슬라이드 인/아웃 (F 키 토글).
 *
 * 좌표계:
 *  - 캐비닛은 동측 벽(extWallInner = kitRight) 에 붙어 있음
 *  - 캐비닛 정면(서쪽) X = extWallInner - depth
 *  - drawer 는 +X 방향(동쪽)에서 -X 방향(서쪽)으로 슬라이드 → 열리면 정면 -openOffset
 */
interface SwingDoorBelow {
  bottomY: number
  topY: number
  hingeZend: 'north' | 'south'   // 경첩 위치 = 슬롯 북단(north) 또는 남단(south)
}

interface KitchenDrawerProps {
  extWallInner: number      // 동측 벽 안쪽 면 X (= kitRight)
  depth: number             // 캐비닛 깊이 (X) — 0.6
  drawerZStart: number      // drawer Z 북단
  drawerZEnd: number        // drawer Z 남단
  drawerBottomY: number     // drawer 바닥 Y (= 하단 도어 슬롯 위)
  drawerTopY: number        // drawer 천장 Y (= 상판 아래)
  walnutTex: THREE.Texture
  doorId: DoorId
  activeDoorId?: DoorId | null
  withRiceCooker?: boolean  // 밥솥 모델 포함 여부 (기본 true)
  swingDoorBelow?: SwingDoorBelow  // 동측 벽 캐비닛에서 drawer 아래 스윙 도어 — 동시에 F 로 회전
  withVacuum?: boolean  // drawer 슬라이드 그룹 안에서 함께 -X 로 나오는 로봇청소기
  closedFront?: boolean  // open-tray 대신 walnut 풀박스 + 도어 face (전체 column 이 통으로 슬라이드)
}

function KitchenRiceCookerDrawer({
  extWallInner,
  depth,
  drawerZStart,
  drawerZEnd,
  drawerBottomY,
  drawerTopY,
  walnutTex,
  doorId,
  activeDoorId,
  withRiceCooker = true,
  swingDoorBelow,
  withVacuum = false,
  closedFront = false,
}: KitchenDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const offsetRef = useRef(0)
  const swingPivotRef = useRef<THREE.Group>(null)
  const swingAngleRef = useRef(0)
  const vacuumGroupRef = useRef<THREE.Group>(null)
  const vacuumOffsetRef = useRef(0)
  const { invalidate } = useThree()

  // 레지스트리 등록 — toggle 은 ref 통해 stale closure 방지
  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  useEffect(() => {
    const drawerCenterX = extWallInner - depth / 2
    const drawerCenterZ = (drawerZStart + drawerZEnd) / 2
    doorRegistry.register({
      id: doorId,
      position: [drawerCenterX, drawerCenterZ],
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  // 슬라이드 + 스윙 애니메이션 — 닫힘 → 열림
  const OPEN_DIST = 0.42
  const VACUUM_OPEN_DIST = OPEN_DIST + 0.20  // 청소기는 drawer 보다 200mm 더 앞으로
  // 동측 벽 캐비닛: 도어가 -X(서, 주방 안쪽)으로 swing 90°.
  //   hingeZend='north' → 회전 -π/2,  'south' → 회전 +π/2
  const SWING_TARGET = swingDoorBelow
    ? (Math.PI / 2) * (swingDoorBelow.hingeZend === 'north' ? -1 : 1)
    : 0
  useFrame((_, rawDelta) => {
    // frameloop="demand" idle 후 첫 프레임 delta 폭주 방지 → clamp 50ms
    const delta = Math.min(rawDelta, 0.05)
    let dirty = false
    // drawer 슬라이드
    const target = isOpen ? -OPEN_DIST : 0
    const diff = target - offsetRef.current
    if (Math.abs(diff) >= 0.0005) {
      offsetRef.current += diff * Math.min(1, delta * 6)
      if (groupRef.current) groupRef.current.position.x = offsetRef.current
      dirty = true
    }
    // 스윙 도어 회전
    if (swingDoorBelow) {
      const sTarget = isOpen ? SWING_TARGET : 0
      const sDiff = sTarget - swingAngleRef.current
      if (Math.abs(sDiff) >= 0.0005) {
        swingAngleRef.current += sDiff * Math.min(1, delta * 6)
        if (swingPivotRef.current) swingPivotRef.current.rotation.y = swingAngleRef.current
        dirty = true
      }
    }
    // 로봇청소기 슬라이드 (drawer 보다 200mm 더 멀리)
    if (withVacuum) {
      const vTarget = isOpen ? -VACUUM_OPEN_DIST : 0
      const vDiff = vTarget - vacuumOffsetRef.current
      if (Math.abs(vDiff) >= 0.0005) {
        vacuumOffsetRef.current += vDiff * Math.min(1, delta * 6)
        if (vacuumGroupRef.current) vacuumGroupRef.current.position.x = vacuumOffsetRef.current
        dirty = true
      }
    }
    if (dirty) invalidate()
  })

  const isActive = activeDoorId === doorId

  const drawerCenterY = (drawerBottomY + drawerTopY) / 2
  const frontX = extWallInner - depth      // 캐비닛 정면 X (서쪽 면)
  const panelT = 0.018
  const interiorBottomY = drawerBottomY + panelT  // 바닥판 두께 18mm

  // 캐비닛 북측(좌측) 주방장 벽 18mm 보정 — 슬롯 내부 Z 만 사용
  const wallNorthT = 0.018
  const interiorZStart = drawerZStart + wallNorthT
  const interiorZEnd = drawerZEnd
  const interiorLen = interiorZEnd - interiorZStart
  const interiorCenterZ = (interiorZStart + interiorZEnd) / 2
  const drawerCenterZ = interiorCenterZ

  // 밥솥 위치 — drawer 바닥 위, 슬롯 내부 중심
  const rcX = extWallInner - depth / 2
  const rcY = interiorBottomY + 0.0165
  const rcZ = drawerCenterZ

  // 30mm 림 (개방형 서랍) — 앞/옆은 손잡이 부착·구조용 30mm 만 남김
  const lipH = 0.030

  // 스윙 도어 메쉬 파라미터 (옵션)
  const swingHingeX = extWallInner - depth   // 캐비닛 정면 X (drawer face X 와 동일)
  const swingHingeZ = swingDoorBelow
    ? (swingDoorBelow.hingeZend === 'north' ? drawerZStart : drawerZEnd)
    : 0
  const swingLeafLen = drawerZEnd - drawerZStart
  const swingThickX = 0.018
  const swingDoorH = swingDoorBelow ? swingDoorBelow.topY - swingDoorBelow.bottomY : 0
  const swingDoorCenterY = swingDoorBelow ? (swingDoorBelow.bottomY + swingDoorBelow.topY) / 2 : 0
  // 메쉬 local: 경첩 코너가 그룹 origin 이 되도록 — 동측 벽 캐비닛이므로 +X 로 두께, 경첩에서 leaf 가 ±Z 로 펼침
  const swingMeshLocalX = +swingThickX / 2
  const swingMeshLocalZ = swingDoorBelow
    ? (swingDoorBelow.hingeZend === 'north' ? +swingLeafLen / 2 : -swingLeafLen / 2)
    : 0

  return (
    <>
    <group ref={groupRef}>
      {closedFront ? (() => {
        // 메탈 프레임 풀아웃 (이미지 5 컨셉) — 정면 walnut 도어 + 메탈 사이드/선반
        const colW = drawerZEnd - drawerZStart   // Z 폭 (~0.264)
        const colH = drawerTopY - drawerBottomY  // Y 높이 (~0.84)
        const colDx = depth                       // X 깊이
        const cx = extWallInner - colDx / 2       // 본체 X 중심
        const cz = drawerCenterZ
        const postT = 0.015                        // 메탈 포스트 두께
        const shelfT = 0.008                       // 선반 두께
        const shelfDepth = colDx - 0.04            // X
        const shelfWidth = colW - 0.02             // Z
        // 선반 Y 위치 (3개: 하/중/상)
        const shelfYs = [
          drawerBottomY + 0.05,
          drawerBottomY + colH * 0.40,
          drawerBottomY + colH * 0.75,
        ]
        return (
          <>
            {/* 정면 walnut 도어 face — 닫혔을 때 일반 캐비넷처럼 보임 */}
            <mesh position={[frontX - 0.001, drawerCenterY, cz]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[colW - 0.005, colH - 0.010]} />
              <meshStandardMaterial map={walnutTex} roughness={0.45} />
            </mesh>
            {/* 손잡이 */}
            <mesh position={[frontX - 0.01, drawerCenterY, cz]}>
              <boxGeometry args={[0.015, 0.08, 0.01]} />
              <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
            </mesh>
            {/* 메탈 포스트 (4 코너 수직 바) */}
            {[
              [cx - colDx / 2 + postT / 2, cz - colW / 2 + postT / 2],
              [cx - colDx / 2 + postT / 2, cz + colW / 2 - postT / 2],
              [cx + colDx / 2 - postT / 2, cz - colW / 2 + postT / 2],
              [cx + colDx / 2 - postT / 2, cz + colW / 2 - postT / 2],
            ].map(([px, pz], i) => (
              <mesh key={`tinypost-${i}`} position={[px, drawerBottomY + colH / 2, pz]}>
                <boxGeometry args={[postT, colH, postT]} />
                <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.20} />
              </mesh>
            ))}
            {/* 메탈 선반 (3 단) */}
            {shelfYs.map((sy, i) => (
              <mesh key={`tinyshelf-${i}`} position={[cx, sy, cz]}>
                <boxGeometry args={[shelfDepth, shelfT, shelfWidth]} />
                <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.18} />
              </mesh>
            ))}
            {/* 선반 측면 가드 (각 선반 양옆 작은 메탈 림 — 떨어짐 방지) */}
            {shelfYs.map((sy, i) => (
              <group key={`tinyguard-${i}`}>
                <mesh position={[cx, sy + 0.020, cz - colW / 2 + postT / 2 + 0.001]}>
                  <boxGeometry args={[shelfDepth, 0.025, 0.003]} />
                  <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.18} />
                </mesh>
                <mesh position={[cx, sy + 0.020, cz + colW / 2 - postT / 2 - 0.001]}>
                  <boxGeometry args={[shelfDepth, 0.025, 0.003]} />
                  <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.18} />
                </mesh>
              </group>
            ))}
          </>
        )
      })() : (
      <>
      {/* drawer 바닥판 — 밥솥이 놓이는 면 */}
      <mesh position={[extWallInner - depth / 2, drawerBottomY + panelT / 2, interiorCenterZ]}>
        <boxGeometry args={[depth - 0.02, panelT, interiorLen - 0.005]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* drawer 정면 림 (30mm) — 손잡이 부착부 */}
      <mesh position={[frontX + 0.009, drawerBottomY + panelT + lipH / 2, interiorCenterZ]}>
        <boxGeometry args={[panelT, lipH, interiorLen - 0.005]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 가로 손잡이 (정면 림 위) */}
      <mesh position={[frontX, drawerBottomY + panelT + lipH + 0.012, interiorCenterZ]}>
        <boxGeometry args={[0.018, 0.020, interiorLen - 0.10]} />
        <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* drawer 측면 림 (30mm, 북) — 캐비닛 좌측 벽 안쪽 면에 인접 */}
      <mesh position={[extWallInner - depth / 2, drawerBottomY + panelT + lipH / 2, interiorZStart + panelT / 2]}>
        <boxGeometry args={[depth - 0.02, lipH, panelT]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* drawer 측면 림 (30mm, 남) */}
      <mesh position={[extWallInner - depth / 2, drawerBottomY + panelT + lipH / 2, interiorZEnd - panelT / 2]}>
        <boxGeometry args={[depth - 0.02, lipH, panelT]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* drawer 후면 림 (30mm, 동) */}
      <mesh position={[extWallInner - 0.02, drawerBottomY + panelT + lipH / 2, interiorCenterZ]}>
        <boxGeometry args={[panelT, lipH, interiorLen - 0.005]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>

      {/* 슬라이드 레일 (서랍 측면, drawer 와 함께 이동) — 메탈 박스 2개 (북/남) */}
      <mesh position={[extWallInner - depth / 2, drawerBottomY + 0.008, interiorZStart + 0.005]}>
        <boxGeometry args={[depth - 0.04, 0.012, 0.012]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[extWallInner - depth / 2, drawerBottomY + 0.008, interiorZEnd - 0.005]}>
        <boxGeometry args={[depth - 0.04, 0.012, 0.012]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* 밥솥 — drawer 와 함께 슬라이드 (옵션) */}
      {withRiceCooker && (
        <Suspense fallback={null}>
          <RiceCooker position={[rcX, rcY, rcZ]} rotation={-Math.PI / 2} />
        </Suspense>
      )}
      </>
      )}


      {/* 인터랙션 툴팁 */}
      {isActive && (
        <Html position={[frontX - 0.05, drawerCenterY + 0.2, drawerCenterZ]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
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
            <span>{isOpen ? '서랍 닫기' : '서랍 열기'}</span>
          </div>
        </Html>
      )}
    </group>
    {/* 스윙 도어 — drawer 와 같은 isOpen 으로 회전 (옵션) */}
    {swingDoorBelow && (
      <group ref={swingPivotRef} position={[swingHingeX, 0, swingHingeZ]}>
        <mesh position={[swingMeshLocalX, swingDoorCenterY, swingMeshLocalZ]}>
          <boxGeometry args={[swingThickX, swingDoorH, swingLeafLen]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        {/* 손잡이 (스윙 도어 free Z-end 근처) */}
        <mesh position={[
          swingMeshLocalX - 0.012,
          swingDoorBelow.topY - 0.04,
          swingDoorBelow.hingeZend === 'north' ? swingLeafLen - 0.06 : -swingLeafLen + 0.06,
        ]}>
          <boxGeometry args={[0.015, 0.08, 0.01]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
    )}
    {/* 로봇청소기 — drawer 보다 200mm 더 멀리 슬라이드 (별도 그룹) */}
    {withVacuum && (() => {
      const vR = 0.16
      const vH = 0.085
      const vCX = extWallInner - depth / 2
      const vCY = vH / 2 + 0.005
      const vCZ = (drawerZStart + drawerZEnd) / 2
      return (
        <group ref={vacuumGroupRef}>
          <group position={[vCX, vCY, vCZ]}>
            <mesh>
              <cylinderGeometry args={[vR, vR, vH, 32]} />
              <meshStandardMaterial color="#161616" roughness={0.45} metalness={0.30} />
            </mesh>
            <mesh position={[0, vH / 2 - 0.003, 0]}>
              <cylinderGeometry args={[vR - 0.005, vR - 0.005, 0.006, 32]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.30} metalness={0.40} />
            </mesh>
            <mesh position={[0, vH / 2 + 0.012, 0]}>
              <cylinderGeometry args={[0.035, 0.040, 0.024, 24]} />
              <meshStandardMaterial color="#222" roughness={0.25} metalness={0.50} />
            </mesh>
            <mesh position={[-vR + 0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.006, 0.006, 0.004, 12]} />
              <meshStandardMaterial color="#3aa0ff" emissive="#3aa0ff" emissiveIntensity={1.5} />
            </mesh>
          </group>
        </group>
      )
    })()}
    </>
  )
}

/**
 * 냉장고장 ↔ 키큰장 사이 펫 통로 스윙도어 (한 짝).
 *
 * 좌표계:
 *  - 캐비닛 전면 평면(X = hingeX) 안에서 닫혀 있음.
 *  - 경첩축 = 수직(Y), 위치 = (hingeX, hingeZ).
 *  - 패널 길이는 +Z (extendDir=+1) 또는 -Z (-1) 방향으로 펼침.
 *  - 닫힘: 패널은 전면 평면에 sit. 열림: 주방 안쪽(+X) 으로 swing (90°).
 *
 * 메쉬 local:
 *  - 그룹은 (hingeX, 0, hingeZ) 에 위치.
 *  - 메쉬 box [doorThickX, doorH, leafLen], center 가 그룹 local 에서
 *      x = -doorThickX/2 (메쉬 +X 면 = 전면 평면)
 *      z = extendDir * leafLen/2
 *    → 메쉬의 (+X, -extendDir*Z) 코너 = 그룹 origin = 경첩.
 *  - 회전 Y: extendDir=+1 → +rot 으로 free end 가 +X 로 이동
 *           extendDir=-1 → -rot 으로 동일 동작 (mirror).
 */
interface KitchenPetPassDoorProps {
  hingeX: number
  hingeZ: number
  extendDir: 1 | -1
  leafLen: number
  doorThickX: number
  doorH: number
  doorCenterY: number
  walnutTex: THREE.Texture
  doorId: DoorId
  activeDoorId?: DoorId | null
}

function KitchenPetPassDoor({
  hingeX,
  hingeZ,
  extendDir,
  leafLen,
  doorThickX,
  doorH,
  doorCenterY,
  walnutTex,
  doorId,
  activeDoorId,
}: KitchenPetPassDoorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pivotRef = useRef<THREE.Group>(null)
  const angleRef = useRef(0)
  const { invalidate } = useThree()

  // 레지스트리 등록
  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  useEffect(() => {
    // 도어 중심(닫힘 자세) — 메쉬가 +X로 doorThickX/2, ±Z로 leafLen/2 떨어진 곳
    const centerX = hingeX - doorThickX / 2
    const centerZ = hingeZ + extendDir * (leafLen / 2)
    doorRegistry.register({
      id: doorId,
      position: [centerX, centerZ],
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  // 회전 애니메이션 (90° = π/2). extendDir=+1 → +rot, -1 → -rot.
  const TARGET_ANGLE = (Math.PI / 2) * extendDir
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)   // demand frameloop idle 후 delta 폭주 방지
    const target = isOpen ? TARGET_ANGLE : 0
    const diff = target - angleRef.current
    if (Math.abs(diff) < 0.0005) return
    angleRef.current += diff * Math.min(1, delta * 6)
    if (pivotRef.current) pivotRef.current.rotation.y = angleRef.current
    invalidate()
  })

  const isActive = activeDoorId === doorId

  // 메쉬 로컬 위치: 경첩 코너가 (0,0,0) 이 되도록 오프셋
  const meshLocalX = -doorThickX / 2
  const meshLocalZ = extendDir * (leafLen / 2)
  // 툴팁: 도어 중심 살짝 앞쪽
  const tipX = hingeX - doorThickX / 2 + 0.05
  const tipY = doorCenterY + 0.25
  const tipZ = hingeZ + extendDir * (leafLen / 2)

  return (
    <>
      <group ref={pivotRef} position={[hingeX, 0, hingeZ]}>
        <mesh position={[meshLocalX, doorCenterY, meshLocalZ]}>
          <boxGeometry args={[doorThickX, doorH, leafLen]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
      </group>
      {isActive && (
        <Html position={[tipX, tipY, tipZ]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
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
            <span>{isOpen ? '도어 닫기' : '도어 열기'}</span>
          </div>
        </Html>
      )}
    </>
  )
}

/**
 * 키큰장 유리 상부 뒷쪽 40cm drawer — 세탁실 쪽(-X)으로 슬라이드 인/아웃 (F 키 토글).
 *
 * 좌표계:
 *  - 슬롯 X span = [slotFrontX, slotBackX] (slotFrontX = kitLeft = 세탁실 쪽 면)
 *  - 닫힘: drawer face 가 slotFrontX 에 위치
 *  - 열림: -X 방향으로 OPEN_DIST 만큼 슬라이드 (세탁실 쪽으로 빠짐)
 */
interface KitchenTallBackDrawerProps {
  slotFrontX: number      // 슬롯 -X 끝 (벽 쪽 — 보이는 영역에서)
  slotBackX: number       // 슬롯 +X 끝 (디스플레이 격판)
  slotZStart: number
  slotZEnd: number
  slotBottomY: number
  slotTopY: number
  clearance?: number      // 슬롯 내 face 패딩. 기본 0.004 — 5mm gap 원하면 0.0025
  openDistance?: number   // 슬라이드 거리(+Z); 미지정 시 drawerLenZ/2
  walnutTex: THREE.Texture
  doorId: DoorId
  activeDoorId?: DoorId | null
}

function KitchenTallBackDrawer({
  slotFrontX,
  slotBackX,
  slotZStart,
  slotZEnd,
  slotBottomY,
  slotTopY,
  clearance = 0.004,
  openDistance,
  walnutTex,
  doorId,
  activeDoorId,
}: KitchenTallBackDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const offsetRef = useRef(0)
  const { invalidate } = useThree()

  // drawer box 공통 치수
  const panelT = 0.018
  const drawerWidthX = (slotBackX - slotFrontX) - clearance
  const drawerLenZ = (slotZEnd - slotZStart) - clearance * 2
  const drawerHeightY = (slotTopY - slotBottomY) - clearance * 2
  const drawerCenterX = (slotFrontX + slotBackX) / 2
  const drawerCenterY = (slotBottomY + slotTopY) / 2
  const drawerCenterZ = (slotZStart + slotZEnd) / 2

  // 레지스트리 등록 — 3 단 vertically stacked drawer 를 picking 하기 위해 Y 도 등록.
  // 위치는 ref 로 보존, deps 는 doorId 만 → FP 변동으로 매 render unregister/register 방지.
  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  const posRef = useRef({ x: drawerCenterX, y: drawerCenterY, z: drawerCenterZ })
  posRef.current = { x: drawerCenterX, y: drawerCenterY, z: drawerCenterZ }
  useEffect(() => {
    const p = posRef.current
    doorRegistry.register({
      id: doorId,
      position: [p.x, p.z],
      y: p.y,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  // 슬라이드 거리: 지정값 또는 drawerLenZ/2
  const OPEN_DIST = openDistance ?? drawerLenZ / 2
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)   // demand frameloop idle 후 delta 폭주 방지
    const target = isOpen ? OPEN_DIST : 0
    const diff = target - offsetRef.current
    if (Math.abs(diff) < 0.0005) return
    offsetRef.current += diff * Math.min(1, delta * 6)
    if (groupRef.current) groupRef.current.position.z = offsetRef.current
    invalidate()
  })

  const isActive = activeDoorId === doorId
  const faceZ = slotZEnd                                          // drawer face Z (남쪽 끝)
  const lipH = 0.030

  return (
    <group ref={groupRef}>
      {/* 바닥판 */}
      <mesh position={[drawerCenterX, slotBottomY + clearance + panelT / 2, drawerCenterZ]}>
        <boxGeometry args={[drawerWidthX, panelT, drawerLenZ]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* 후면 림 (-Z 끝, 북쪽) */}
      <mesh position={[drawerCenterX, slotBottomY + clearance + panelT + lipH / 2, slotZStart + clearance + panelT / 2]}>
        <boxGeometry args={[drawerWidthX, lipH, panelT]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* 측면 림 (서, -X 끝, 벽쪽) — 30mm */}
      <mesh position={[slotFrontX + clearance / 2 + panelT / 2, slotBottomY + clearance + panelT + lipH / 2, drawerCenterZ]}>
        <boxGeometry args={[panelT, lipH, drawerLenZ]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* 측면 림 (동, +X 끝, 디스플레이 격판쪽) */}
      <mesh position={[slotBackX - clearance / 2 - panelT / 2, slotBottomY + clearance + panelT + lipH / 2, drawerCenterZ]}>
        <boxGeometry args={[panelT, lipH, drawerLenZ]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.5} metalness={0.05} />
      </mesh>
      {/* 정면 패널 (남쪽 face) — 슬롯 전체 높이/X 폭 */}
      <mesh position={[drawerCenterX, drawerCenterY, faceZ - panelT / 2]}>
        <boxGeometry args={[drawerWidthX, drawerHeightY, panelT]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 가로 손잡이 */}
      <mesh position={[drawerCenterX, drawerCenterY, faceZ + 0.012]}>
        <boxGeometry args={[Math.min(0.30, drawerWidthX - 0.10), 0.020, 0.018]} />
        <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* 인터랙션 툴팁 */}
      {isActive && (
        <Html position={[drawerCenterX, drawerCenterY + 0.20, faceZ + 0.05]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
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
            <span>{isOpen ? '서랍 닫기' : '서랍 열기'}</span>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * 주방 동측 상부장 — 본체 + 내부 수직 분할 + F 키 swing 도어.
 *
 * 좌표:
 *  - cabX: 본체 X 중심
 *  - cabY: 본체 Y 중심
 *  - zStart, width: Z 슬롯 범위
 *  - depth, height: X / Y 치수
 *  - divisions: 내부 수직 분할 수 (3 또는 4)
 *  - hingeSide: 'north' | 'south' (Z 어느 끝에 경첩) — 기본 'north'
 *
 * 도어는 cabinet 전면(-X)에 부착, vertical hinge 축, -X 방향(주방 안쪽)으로 swing.
 */
interface KitchenUpperCabinetProps {
  cabX: number
  cabY: number
  zStart: number
  width: number
  depth: number
  height: number
  divisions: number
  hingeSide?: 'north' | 'south'
  walnutTex: THREE.Texture
  doorId: DoorId
  activeDoorId?: DoorId | null
}

function KitchenUpperCabinet({
  cabX,
  cabY,
  zStart,
  width,
  depth,
  height,
  divisions,
  hingeSide = 'north',
  walnutTex,
  doorId,
  activeDoorId,
}: KitchenUpperCabinetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pivotRef = useRef<THREE.Group>(null)
  const angleRef = useRef(0)
  const { invalidate } = useThree()

  const zCenter = zStart + width / 2
  const zEnd = zStart + width
  const cabFrontX = cabX - depth / 2     // -X = 주방 안쪽 (전면)
  const panelT = 0.018
  const interiorT = 0.012  // 내부 분할 패널 두께 (얇게)

  // 레지스트리 등록
  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  const posRef = useRef({ x: cabFrontX, y: cabY, z: zCenter })
  posRef.current = { x: cabFrontX, y: cabY, z: zCenter }
  useEffect(() => {
    const p = posRef.current
    doorRegistry.register({
      id: doorId,
      position: [p.x, p.z],
      y: p.y,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  // 회전 애니메이션 (90° = π/2)
  // hingeSide=north → 경첩=zStart, free end=zEnd. 도어 swing = -X 방향.
  //   회전 +sign: free end 가 +Z → 잘못. 음 sign 으로 -X 로 가야 함.
  //   직관: 메쉬가 +Z 로 leafLen extension 일 때 -rot 로 -X 로 swing.
  const extendDir = hingeSide === 'north' ? +1 : -1
  // door panel local: hinge 코너가 group origin
  //   메쉬 center: x = -panelT/2 (door 두께가 -X 로 있음 → panel +X face 가 cabFrontX),
  //                z = extendDir * (width - 0.005) / 2
  // free end 가 +X 로 가려면: extendDir=+1 → -rot, extendDir=-1 → +rot
  const TARGET_ANGLE = (Math.PI / 2) * (-extendDir)
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)   // demand frameloop idle 후 delta 폭주 방지
    const target = isOpen ? TARGET_ANGLE : 0
    const diff = target - angleRef.current
    if (Math.abs(diff) < 0.0005) return
    angleRef.current += diff * Math.min(1, delta * 6)
    if (pivotRef.current) pivotRef.current.rotation.y = angleRef.current
    invalidate()
  })

  const isActive = activeDoorId === doorId
  const doorThickX = 0.018  // 도어 두께
  const doorPanelW = width - 0.005
  const doorPanelH = height - 0.020
  const hingeZ = hingeSide === 'north' ? zStart + 0.0025 : zEnd - 0.0025

  // 내부 분할 — divisions 개 컬럼 → divisions-1 개 패널
  const interiorZ0 = zStart + panelT
  const interiorZ1 = zEnd - panelT
  const interiorWidth = interiorZ1 - interiorZ0
  const colW = interiorWidth / divisions
  const interiorY0 = cabY - height / 2 + panelT
  const interiorY1 = cabY + height / 2 - panelT
  const interiorYCenter = (interiorY0 + interiorY1) / 2
  const interiorYHeight = interiorY1 - interiorY0
  const interiorXCenter = cabX

  // Hollow 본체 — 후면(+X 벽쪽, 흰색) + 상/하/좌/우 5면(호두). 전면은 도어가 차지.
  // z-fighting 방지: 본체 패널을 좌우 2mm, 상하 2mm 축소
  const shrink = 0.002
  const cabBackX = cabX + depth / 2     // +X 끝 (벽 쪽)
  const cabTopY = cabY + height / 2
  const cabBottomY = cabY - height / 2
  return (
    <group>
      {/* 후면 패널 (+X, 벽쪽) — 흰색. 추가 1mm 축소로 z-fighting 방지 */}
      <mesh position={[cabBackX - panelT / 2 - 0.001, cabY, zCenter]}>
        <boxGeometry args={[panelT, height - shrink * 2 - 0.002, width - shrink * 2 - 0.002]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      {/* 상단 패널 */}
      <mesh position={[cabX, cabTopY - panelT / 2 - shrink, zCenter]}>
        <boxGeometry args={[depth, panelT, width - shrink * 2]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 하단 패널 */}
      <mesh position={[cabX, cabBottomY + panelT / 2 + shrink, zCenter]}>
        <boxGeometry args={[depth, panelT, width - shrink * 2]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 좌측면 (북) */}
      <mesh position={[cabX, cabY, zStart + panelT / 2 + shrink]}>
        <boxGeometry args={[depth, height - shrink * 2, panelT]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>
      {/* 우측면 (남) */}
      <mesh position={[cabX, cabY, zEnd - panelT / 2 - shrink]}>
        <boxGeometry args={[depth, height - shrink * 2, panelT]} />
        <meshStandardMaterial map={walnutTex} roughness={0.45} />
      </mesh>

      {/* 내부 수평 분할 선반 (divisions-1 개, 흰색) — 캐비닛을 위/아래로 N 등분 */}
      {Array.from({ length: divisions - 1 }).map((_, i) => {
        const dy = interiorY0 + (interiorYHeight / divisions) * (i + 1)
        return (
          <mesh key={`uc-shelf-${i}`} position={[interiorXCenter, dy, zCenter]}>
            <boxGeometry args={[depth - panelT * 2, interiorT, width - panelT * 2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        )
      })}

      {/* 도어 — 경첩 그룹 */}
      <group ref={pivotRef} position={[cabFrontX, cabY, hingeZ]}>
        <mesh position={[-doorThickX / 2, 0, extendDir * doorPanelW / 2]}>
          <boxGeometry args={[doorThickX, doorPanelH, doorPanelW]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
      </group>

      {/* 인터랙션 툴팁 */}
      {isActive && (
        <Html position={[cabFrontX - 0.05, cabY + 0.20, zCenter]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
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
            <span>{isOpen ? '도어 닫기' : '도어 열기'}</span>
          </div>
        </Html>
      )}
    </group>
  )
}
