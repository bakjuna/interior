/**
 * 모든 붙박이장 일괄 렌더 — closets[] 데이터 기반.
 * 본체 + 문짝 (긴 변 따라 N개, 2mm 갭) + 상단 몰딩 + 하단 받침.
 * openShelf 지정 시 해당 영역은 문짝 대신 오픈 선반 + LED.
 */

import { useMemo, useState, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { closets } from '../../data/apartment'
import type { DoorId } from '../../data/sectors'
import { doorRegistry } from '../../systems/doorRegistry'
import { useKTX2 } from '../../systems/useKTX2'

interface ClosetsProps {
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
  allLightsOn?: boolean
}

export function Closets({ activeDoorId, playerPos, allLightsOn }: ClosetsProps) {
  // 거실장 LED 활성: 플레이어가 거실 내 또는 allLightsOn
  const lrLedActive = !!allLightsOn || (!!playerPos && playerPos[0] >= 0 && playerPos[0] <= 3.972 && playerPos[1] >= 0 && playerPos[1] <= 3.666)
  const closetDoorTex = useKTX2('/textures/walnut-closet-door.ktx2')
  const walnutDoorTex = useKTX2('/textures/walnut_door.ktx2')

  const walnutBodyTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  const walnutLinerTex2x1 = useMemo(() => {
    const t = walnutDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [walnutDoorTex])
  const walnutLinerTex1x1 = useMemo(() => {
    const t = walnutDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [walnutDoorTex])

  return (
    <>
      {closets.map((c, ci) => {
        const isZlong = c.size[2] > c.size[0]
        const longSide = isZlong ? c.size[2] : c.size[0]
        const shortSide = isZlong ? c.size[0] : c.size[2]
        const bodyH = c.size[1]
        const doorCount = Math.max(2, Math.round(longSide / 0.6))
        const actualDoorW = longSide / doorCount
        const gap = 0.002
        const panelT = 0.018
        const os = c.openShelf
        const frontOffset = (isZlong ? c.size[0] : c.size[2]) / 2 + 0.002

        // 단내림(150mm) 만큼 상단 패널 + 문짝 축소, 패널-문짝 간 2mm 단차
        const dropH = 0.150
        const doorGap = 0.002  // 문짝-패널 사이 갭
        const doorReducedH = bodyH - dropH - doorGap
        const doorCenterY = doorReducedH / 2
        const topPanelH = dropH
        const topPanelY = bodyH - topPanelH / 2

        // 오픈 선반 영역의 long-axis 범위
        const osStart = os ? -longSide / 2 + actualDoorW * os.startDoor : 0
        const osEnd = os ? -longSide / 2 + actualDoorW * os.endDoor : 0
        const osLen = osEnd - osStart
        const osCenter = (osStart + osEnd) / 2

        return (
          <group key={`closet-${ci}`}>
            {/* === 본체 === */}
            {c.doorGroups ? (
              /* doorGroups: 중공 본체 */
              (() => {
                const bpT = 0.018
                const shelfT = 0.012
                const backX = c.position[0] - shortSide / 2 + bpT / 2
                const interiorDepth = shortSide - bpT
                const interiorCX = c.position[0] - shortSide / 2 + bpT + interiorDepth / 2
                const zStart = c.position[2] - longSide / 2
                const bodyBottom = c.position[1] - bodyH / 2
                const bodyTop = c.position[1] + bodyH / 2

                return (
                  <>
                    {/* 뒷판 */}
                    <mesh position={[backX, c.position[1], c.position[2]]}>
                      <boxGeometry args={[bpT, bodyH, longSide]} />
                      <meshStandardMaterial color="#fff" roughness={0.6} />
                    </mesh>
                    {/* 상판 */}
                    <mesh position={[c.position[0], bodyTop - bpT / 2, c.position[2]]}>
                      <boxGeometry args={[shortSide, bpT, longSide]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                    {/* 하판 */}
                    <mesh position={[c.position[0], bodyBottom + bpT / 2, c.position[2]]}>
                      <boxGeometry args={[shortSide, bpT, longSide]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                    {/* 좌측면 (북) */}
                    <mesh position={[c.position[0], c.position[1], c.position[2] - longSide / 2 + bpT / 2]}>
                      <boxGeometry args={[shortSide, bodyH, bpT]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                    {/* 우측면 (남) */}
                    <mesh position={[c.position[0], c.position[1], c.position[2] + longSide / 2 - bpT / 2]}>
                      <boxGeometry args={[shortSide, bodyH, bpT]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                    {/* 그룹 경계 칸막이 + 선반 */}
                    {c.doorGroups!.map((g, gi) => {
                      const gZStart = zStart + actualDoorW * g.doors[0]
                      const gZEnd = zStart + actualDoorW * (g.doors[g.doors.length - 1] + 1)
                      const gCZ = (gZStart + gZEnd) / 2
                      const gLen = gZEnd - gZStart
                      return (
                        <group key={`cg-${gi}`}>
                          {gi > 0 && (() => {
                            // 오픈선반 영역의 그룹 경계 → 칸막이를 상/하 분할 (오픈선반 구간 제외)
                            const isOpenShelfBoundary = os && g.doors.some(di => di >= os.startDoor && di < os.endDoor)
                            if (isOpenShelfBoundary) {
                              const lowerH = os!.bottomY
                              const upperStart = os!.topY
                              const upperH = bodyH - upperStart
                              return (
                                <>
                                  <mesh position={[interiorCX, lowerH / 2, gZStart]}>
                                    <boxGeometry args={[interiorDepth, lowerH, bpT]} />
                                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                                  </mesh>
                                  <mesh position={[interiorCX, upperStart + upperH / 2, gZStart]}>
                                    <boxGeometry args={[interiorDepth, upperH, bpT]} />
                                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                                  </mesh>
                                </>
                              )
                            }
                            return (
                              <mesh position={[interiorCX, c.position[1], gZStart]}>
                                <boxGeometry args={[interiorDepth, bodyH - bpT * 2, bpT]} />
                                <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                              </mesh>
                            )
                          })()}
                          {(g.shelfYs ?? [bodyH / 2]).map((sy, si) => (
                            <mesh key={`shelf-${si}`} position={[interiorCX, sy, gCZ]}>
                              <boxGeometry args={[interiorDepth - 0.030, shelfT, gLen - bpT * 2]} />
                              <meshStandardMaterial color="#fff" roughness={0.6} />
                            </mesh>
                          ))}
                        </group>
                      )
                    })}
                  </>
                )
              })()
            ) : os ? (
              <>
                {/* 하부 본체 (바닥 ~ openShelf.bottomY) */}
                <mesh position={isZlong
                  ? [c.position[0], os.bottomY / 2, c.position[2]]
                  : [c.position[0], os.bottomY / 2, c.position[2]]
                } castShadow receiveShadow>
                  <boxGeometry args={[c.size[0], os.bottomY, c.size[2]]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
                {/* 상부 본체 (openShelf.topY ~ top) */}
                <mesh position={isZlong
                  ? [c.position[0], (os.topY + bodyH) / 2, c.position[2]]
                  : [c.position[0], (os.topY + bodyH) / 2, c.position[2]]
                } castShadow receiveShadow>
                  <boxGeometry args={[c.size[0], bodyH - os.topY, c.size[2]]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
                {/* 오픈 영역 뒷판 (오픈 선반 Z/X 범위만, 전면 열림) */}
                {(() => {
                  const backThick = panelT
                  const openH = os.topY - os.bottomY
                  // 뒷판: 벽쪽(-X for Zlong, -Z for Xlong)에 배치
                  const backPos: [number, number, number] = isZlong
                    ? [c.position[0] - shortSide / 2 + backThick / 2, os.bottomY + openH / 2, c.position[2] + osCenter]
                    : [c.position[0] + osCenter, os.bottomY + openH / 2, c.position[2] - shortSide / 2 + backThick / 2]
                  const backSize: [number, number, number] = isZlong
                    ? [backThick, openH, osLen]
                    : [osLen, openH, backThick]
                  return (
                    <mesh position={backPos}>
                      <boxGeometry args={backSize} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                  )
                })()}
                {/* 오픈 영역 바깥(비오픈 구간)의 중간 본체 */}
                {/* 오픈 선반 왼쪽 구간 */}
                {os.startDoor > 0 && (() => {
                  const leftLen = actualDoorW * os.startDoor
                  const leftCenter = -longSide / 2 + leftLen / 2
                  const openH = os.topY - os.bottomY
                  return (
                    <mesh position={isZlong
                      ? [c.position[0], os.bottomY + openH / 2, c.position[2] + leftCenter]
                      : [c.position[0] + leftCenter, os.bottomY + openH / 2, c.position[2]]
                    } castShadow receiveShadow>
                      <boxGeometry args={isZlong
                        ? [c.size[0], openH, leftLen]
                        : [leftLen, openH, c.size[2]]
                      } />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                  )
                })()}
                {/* 오픈 선반 오른쪽 구간 */}
                {os.endDoor < doorCount && (() => {
                  const rightLen = actualDoorW * (doorCount - os.endDoor)
                  const rightCenter = longSide / 2 - rightLen / 2
                  const openH = os.topY - os.bottomY
                  return (
                    <mesh position={isZlong
                      ? [c.position[0], os.bottomY + openH / 2, c.position[2] + rightCenter]
                      : [c.position[0] + rightCenter, os.bottomY + openH / 2, c.position[2]]
                    } castShadow receiveShadow>
                      <boxGeometry args={isZlong
                        ? [c.size[0], openH, rightLen]
                        : [rightLen, openH, c.size[2]]
                      } />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                  )
                })()}
              </>
            ) : (
              /* 오픈 선반 없음, doorGroups 없음: 단일 본체 */
              <mesh position={c.position} castShadow receiveShadow>
                <boxGeometry args={c.size} />
                <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
              </mesh>
            )}

            {/* === 인터랙티브 doorGroups === */}
            {c.doorGroups?.map((g) => {
              const isPair = g.doors.length === 2
              const gZStart = c.position[2] - longSide / 2 + actualDoorW * g.doors[0]
              // 오픈선반 영역에 속하는 문인지 확인
              const isSplit = os && g.doors.every(di => di >= os.startDoor && di < os.endDoor)
              const lowerH = isSplit ? os!.bottomY : 0
              const upperBottomY = isSplit ? os!.topY : 0
              const lowerDoorH = isSplit ? lowerH - 0.01 : 0
              const upperDoorH = isSplit ? (bodyH - upperBottomY - doorGap - dropH) : 0

              return (
                <group key={`cdoor-group-${g.doorId}`}>
                {isSplit ? (
                  // 오픈선반 영역: 상/하 분리 도어
                  <ClosetSplitDoorPair
                    frontX={c.position[0] + frontOffset}
                    zStart={gZStart}
                    doorWidth={actualDoorW}
                    pair={isPair}
                    lowerCenterY={lowerH / 2}
                    lowerDoorH={lowerDoorH}
                    lowerHandleY={lowerH - 0.020}
                    upperCenterY={upperBottomY + upperDoorH / 2}
                    upperDoorH={upperDoorH}
                    upperHandleY={upperBottomY + 0.020}
                    walnutTex={walnutBodyTex}
                    doorId={g.doorId}
                    activeDoorId={activeDoorId}
                  />
                ) : (
                  // 전체 높이 도어
                  <ClosetInteractiveDoor
                    frontX={c.position[0] + frontOffset}
                    centerY={doorCenterY}
                    doorH={doorReducedH}
                    zStart={gZStart}
                    doorWidth={actualDoorW}
                    handleY={doorReducedH / 2}
                    pair={isPair}
                    flipHinge={g.flipHinge}
                    walnutTex={walnutBodyTex}
                    doorId={g.doorId}
                    activeDoorId={activeDoorId}
                  />
                )}
                {/* 상단 패널 (단내림 + 20mm, 문짝 대비 2mm 안쪽) */}
                {g.doors.map(di => {
                  const dOffset = -longSide / 2 + actualDoorW / 2 + di * actualDoorW
                  return (
                    <mesh key={`top-panel-${di}`}
                      position={isZlong
                        ? [c.position[0] + frontOffset - 0.002, topPanelY, c.position[2] + dOffset]
                        : [c.position[0] + dOffset, topPanelY, c.position[2] + frontOffset - 0.002]
                      }
                    >
                      <boxGeometry args={isZlong ? [panelT, topPanelH, actualDoorW - gap] : [actualDoorW - gap, topPanelH, panelT]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                  )
                })}
                </group>
              )
            })}

            {/* === 문짝 (정적) === */}
            {Array.from({ length: doorCount }).map((_, di) => {
              // doorGroups에 속한 문은 인터랙티브로 이미 렌더링됨
              if (c.doorGroups?.some(g => g.doors.includes(di))) return null

              const offset = -longSide / 2 + actualDoorW / 2 + di * actualDoorW
              const isOpenShelfDoor = os && di >= os.startDoor && di < os.endDoor
              const doorRot: [number, number, number] = isZlong ? [0, Math.PI / 2, 0] : [0, 0, 0]

              // 손잡이: 문짝 끝에서 20mm 위치, 홀짝 교차
              const handleFlip = c.handleFlipDoors?.includes(di) ? -1
                : (di % 2 === 0 ? 1 : -1)
              const handleEdgeOffset = actualDoorW / 2 - 0.020

              if (isOpenShelfDoor) {
                const openH = os.topY - os.bottomY
                const lowerH = os.bottomY
                const upperH = bodyH - os.topY
                const lowerDoorH = lowerH - 0.01
                const upperDoorH = upperH - doorGap - dropH

                const lowerPos: [number, number, number] = isZlong
                  ? [c.position[0] + frontOffset, lowerH / 2, c.position[2] + offset]
                  : [c.position[0] + offset, lowerH / 2, c.position[2] + frontOffset]
                const upperPos: [number, number, number] = isZlong
                  ? [c.position[0] + frontOffset, os.topY + upperDoorH / 2, c.position[2] + offset]
                  : [c.position[0] + offset, os.topY + upperDoorH / 2, c.position[2] + frontOffset]

                // 하부 손잡이: 상단 끝에서 20mm
                const lowerHandleY = lowerH - 0.020
                // 상부 손잡이: 하단 끝에서 20mm
                const upperHandleY = os.topY + 0.020

                return (
                  <group key={`door-${di}`}>
                    {/* 하부 문짝 */}
                    <mesh position={lowerPos} rotation={doorRot}>
                      <planeGeometry args={[actualDoorW - gap, lowerDoorH]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                    <mesh position={isZlong
                      ? [lowerPos[0] + 0.012, lowerHandleY, lowerPos[2]]
                      : [lowerPos[0], lowerHandleY, lowerPos[2] + 0.012]
                    }>
                      <boxGeometry args={[isZlong ? 0.015 : actualDoorW * 0.4, isZlong ? 0.01 : 0.015, isZlong ? actualDoorW * 0.4 : 0.01]} />
                      <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                    </mesh>
                    {/* 상부 문짝 */}
                    <mesh position={upperPos} rotation={doorRot}>
                      <planeGeometry args={[actualDoorW - gap, upperDoorH]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                    <mesh position={isZlong
                      ? [upperPos[0] + 0.012, upperHandleY, upperPos[2]]
                      : [upperPos[0], upperHandleY, upperPos[2] + 0.012]
                    }>
                      <boxGeometry args={[isZlong ? 0.015 : actualDoorW * 0.4, isZlong ? 0.01 : 0.015, isZlong ? actualDoorW * 0.4 : 0.01]} />
                      <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                    </mesh>
                    {/* 상단 패널 (단내림, 2mm 단차) */}
                    <mesh position={isZlong
                      ? [c.position[0] + frontOffset - 0.002, topPanelY, c.position[2] + offset]
                      : [c.position[0] + offset, topPanelY, c.position[2] + frontOffset - 0.002]
                    }>
                      <boxGeometry args={isZlong ? [panelT, topPanelH, actualDoorW - gap] : [actualDoorW - gap, topPanelH, panelT]} />
                      <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                    </mesh>
                  </group>
                )
              }

              // 일반 전체 높이 문짝
              // 일반 전체 높이 문짝 — 단내림분 축소
              const pos: [number, number, number] = isZlong
                ? [c.position[0] + frontOffset, doorCenterY, c.position[2] + offset]
                : [c.position[0] + offset, doorCenterY, c.position[2] + frontOffset]
              // 손잡이: 문짝의 한쪽 끝에서 20mm (Z축 or X축)
              const handleLongOffset = handleEdgeOffset * handleFlip
              const handlePos: [number, number, number] = isZlong
                ? [pos[0] + 0.012, pos[1], pos[2] + handleLongOffset]
                : [pos[0] + handleLongOffset, pos[1], pos[2] + 0.012]

              return (
                <group key={`door-${di}`}>
                  <mesh position={pos} rotation={doorRot}>
                    <planeGeometry args={[actualDoorW - gap, doorReducedH]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  <mesh position={handlePos}>
                    <boxGeometry args={[isZlong ? 0.015 : 0.01, 0.1, isZlong ? 0.01 : 0.015]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                  {/* 상단 패널 (단내림, 2mm 단차) */}
                  <mesh position={isZlong
                    ? [c.position[0] + frontOffset - 0.002, topPanelY, c.position[2] + offset]
                    : [c.position[0] + offset, topPanelY, c.position[2] + frontOffset - 0.002]
                  }>
                    <boxGeometry args={isZlong ? [panelT, topPanelH, actualDoorW - gap] : [actualDoorW - gap, topPanelH, panelT]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                </group>
              )
            })}

            {/* === 오픈 선반: 칸막이 + 라이너 + LED === */}
            {os && (() => {
              const openH = os.topY - os.bottomY
              const depth = shortSide
              const stripDepth = 0.010
              const ledY = os.topY - panelT - 0.001

              // 오픈 선반 내부 좌표
              const innerLeft = osStart + panelT
              const innerRight = osEnd - panelT
              const innerLen = innerRight - innerLeft
              const innerCenter = (innerLeft + innerRight) / 2
              const innerBottom = os.bottomY + panelT
              const innerTop = os.topY - panelT
              const innerH = innerTop - innerBottom
              const innerCY = (innerBottom + innerTop) / 2

              return (
                <>
                  {/* 좌측 옆면 — 두께 있는 box, 라이너 텍스처 */}
                  <mesh position={isZlong
                    ? [c.position[0], os.bottomY + openH / 2, c.position[2] + osStart + panelT / 2]
                    : [c.position[0] + osStart + panelT / 2, os.bottomY + openH / 2, c.position[2]]
                  }>
                    <boxGeometry args={isZlong ? [depth, openH, panelT] : [panelT, openH, depth]} />
                    <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} />
                  </mesh>
                  {/* 우측 옆면 */}
                  <mesh position={isZlong
                    ? [c.position[0], os.bottomY + openH / 2, c.position[2] + osEnd - panelT / 2]
                    : [c.position[0] + osEnd - panelT / 2, os.bottomY + openH / 2, c.position[2]]
                  }>
                    <boxGeometry args={isZlong ? [depth, openH, panelT] : [panelT, openH, depth]} />
                    <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} />
                  </mesh>
                  {/* 상면 — 두께 있는 box, 라이너 텍스처 */}
                  <mesh position={isZlong
                    ? [c.position[0], os.topY - panelT / 2, c.position[2] + osCenter]
                    : [c.position[0] + osCenter, os.topY - panelT / 2, c.position[2]]
                  }>
                    <boxGeometry args={isZlong ? [depth, panelT, osLen] : [osLen, panelT, depth]} />
                    <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} />
                  </mesh>
                  {/* 하면 */}
                  <mesh position={isZlong
                    ? [c.position[0], os.bottomY + panelT / 2, c.position[2] + osCenter]
                    : [c.position[0] + osCenter, os.bottomY + panelT / 2, c.position[2]]
                  }>
                    <boxGeometry args={isZlong ? [depth, panelT, osLen] : [osLen, panelT, depth]} />
                    <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} />
                  </mesh>

                  {/* 뒷면 라이너 */}
                  <mesh position={isZlong
                    ? [c.position[0] - depth / 2 + panelT + 0.002, innerCY, c.position[2] + innerCenter]
                    : [c.position[0] + innerCenter, innerCY, c.position[2] - depth / 2 + panelT + 0.002]
                  } rotation={isZlong ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
                    <planeGeometry args={[innerLen, innerH]} />
                    <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
                  </mesh>

                  {/* LED strip 발광면 */}
                  <mesh position={isZlong
                    ? [c.position[0] - depth / 2 + panelT + stripDepth / 2 + 0.002, ledY, c.position[2] + innerCenter]
                    : [c.position[0] + innerCenter, ledY, c.position[2] - depth / 2 + panelT + stripDepth / 2 + 0.002]
                  } rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={isZlong ? [stripDepth, innerLen] : [innerLen, stripDepth]} />
                    <meshStandardMaterial color={lrLedActive ? '#fff' : '#444'} emissive={lrLedActive ? '#ffe0b0' : '#111'} emissiveIntensity={lrLedActive ? 3.0 : 0.1} />
                  </mesh>
                  {/* LED rectAreaLight */}
                  <rectAreaLight
                    position={isZlong
                      ? [c.position[0] - depth / 2 + panelT + stripDepth / 2 + 0.002, ledY - 0.002, c.position[2] + innerCenter]
                      : [c.position[0] + innerCenter, ledY - 0.002, c.position[2] - depth / 2 + panelT + stripDepth / 2 + 0.002]
                    }
                    width={isZlong ? stripDepth : innerLen}
                    height={isZlong ? innerLen : stripDepth}
                    intensity={lrLedActive ? 60 : 0}
                    color="#ffe0b0"
                    rotation={[-Math.PI / 2, 0, 0]}
                  />
                </>
              )
            })()}

            {/* 상단 몰딩 */}
            <mesh position={[c.position[0], bodyH + 0.01, c.position[2]]}>
              <boxGeometry args={[c.size[0] + 0.005, 0.02, c.size[2] + 0.005]} />
              <meshStandardMaterial color="#2d1f12" roughness={0.5} />
            </mesh>
            {/* 하단 받침 */}
            <mesh position={[c.position[0], 0.04, c.position[2]]}>
              <boxGeometry args={[c.size[0] + 0.005, 0.08, c.size[2] + 0.005]} />
              <meshStandardMaterial color="#2d1f12" roughness={0.5} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/**
 * 붙박이장 인터랙티브 도어 — +X 방향(방 안쪽)으로 swing.
 * pair=true: 2문짝 동시 개폐.
 */
interface ClosetInteractiveDoorProps {
  frontX: number
  centerY: number
  doorH: number
  zStart: number
  doorWidth: number
  handleY: number
  pair?: boolean
  flipHinge?: boolean  // 단독 도어 경첩 반대 (south hinge)
  walnutTex: THREE.Texture
  doorId: DoorId
  activeDoorId?: DoorId | null
}

function ClosetInteractiveDoor({
  frontX, centerY, doorH, zStart, doorWidth, handleY, pair = false, flipHinge = false,
  walnutTex, doorId, activeDoorId,
}: ClosetInteractiveDoorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pivotARef = useRef<THREE.Group>(null)
  const pivotBRef = useRef<THREE.Group>(null)
  const angleARef = useRef(0)
  const angleBRef = useRef(0)
  const { invalidate } = useThree()

  const totalWidth = pair ? doorWidth * 2 : doorWidth
  const zCenter = zStart + totalWidth / 2
  const zEnd = zStart + totalWidth

  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  useEffect(() => {
    doorRegistry.register({
      id: doorId,
      position: [frontX, zCenter],
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  // +X 방향으로 swing (주방과 반대)
  // 북쪽 hinge: free end(남) → +X → rotation +π/2
  // 남쪽 hinge: free end(북) → +X → rotation -π/2
  const TARGET_A = flipHinge ? -Math.PI / 2 : Math.PI / 2
  const TARGET_B = -Math.PI / 2
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const tA = isOpen ? TARGET_A : 0
    const tB = isOpen ? TARGET_B : 0
    const dA = tA - angleARef.current
    const dB = pair ? tB - angleBRef.current : 0
    if (Math.abs(dA) < 0.0005 && Math.abs(dB) < 0.0005) return
    angleARef.current += dA * Math.min(1, delta * 6)
    if (pivotARef.current) pivotARef.current.rotation.y = angleARef.current
    if (pair) {
      angleBRef.current += dB * Math.min(1, delta * 6)
      if (pivotBRef.current) pivotBRef.current.rotation.y = angleBRef.current
    }
    invalidate()
  })

  const isActive = activeDoorId === doorId
  const doorThickX = 0.018
  const panelW = doorWidth - 0.005
  const panelH = doorH

  return (
    <group>
      {/* 도어 A */}
      <group ref={pivotARef} position={[frontX, centerY, flipHinge ? zEnd - 0.0025 : zStart + 0.0025]}>
        <mesh position={[-doorThickX / 2, 0, flipHinge ? -panelW / 2 : panelW / 2]}>
          <boxGeometry args={[doorThickX, panelH, panelW]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        <mesh position={[0.001, handleY - centerY, flipHinge ? -panelW + 0.020 : panelW - 0.020]}>
          <boxGeometry args={[0.005, 0.1, 0.01]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
      {/* 도어 B (south hinge, 페어) */}
      {pair && (
        <group ref={pivotBRef} position={[frontX, centerY, zEnd - 0.0025]}>
          <mesh position={[-doorThickX / 2, 0, -panelW / 2]}>
            <boxGeometry args={[doorThickX, panelH, panelW]} />
            <meshStandardMaterial map={walnutTex} roughness={0.45} />
          </mesh>
          <mesh position={[0.001, handleY - centerY, -panelW + 0.020]}>
            <boxGeometry args={[0.005, 0.1, 0.01]} />
            <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      )}
      {isActive && (
        <Html position={[frontX + 0.05, centerY + 0.30, zCenter]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(20,20,25,0.85)', color: '#fff5e6', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontFamily: 'system-ui, sans-serif', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none' }}>
            <kbd style={{ background: '#fff5e6', color: '#1a1a1a', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 12, border: '1px solid #888', boxShadow: '0 1px 0 #555' }}>F</kbd>
            <span>{isOpen ? '도어 닫기' : '도어 열기'}</span>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * 오픈선반 영역 분리 도어 — 상/하 문짝이 동시에 열림.
 * pair=true: 2문짝×2(상하) = 4개 문짝 동시 개폐.
 */
interface ClosetSplitDoorPairProps {
  frontX: number
  zStart: number
  doorWidth: number
  pair?: boolean
  lowerCenterY: number
  lowerDoorH: number
  lowerHandleY: number
  upperCenterY: number
  upperDoorH: number
  upperHandleY: number
  walnutTex: THREE.Texture
  doorId: DoorId
  activeDoorId?: DoorId | null
}

function ClosetSplitDoorPair({
  frontX, zStart, doorWidth, pair = false,
  lowerCenterY, lowerDoorH, lowerHandleY,
  upperCenterY, upperDoorH, upperHandleY,
  walnutTex, doorId, activeDoorId,
}: ClosetSplitDoorPairProps) {
  const [isOpen, setIsOpen] = useState(false)
  // 북 hinge refs (상/하)
  const pivotNorthLowerRef = useRef<THREE.Group>(null)
  const pivotNorthUpperRef = useRef<THREE.Group>(null)
  // 남 hinge refs (상/하, 페어)
  const pivotSouthLowerRef = useRef<THREE.Group>(null)
  const pivotSouthUpperRef = useRef<THREE.Group>(null)
  const anglesRef = useRef([0, 0, 0, 0])
  const { invalidate } = useThree()

  const totalWidth = pair ? doorWidth * 2 : doorWidth
  const zCenter = zStart + totalWidth / 2
  const zEnd = zStart + totalWidth

  const toggleRef = useRef(() => setIsOpen((o) => !o))
  toggleRef.current = () => setIsOpen((o) => !o)
  useEffect(() => {
    doorRegistry.register({
      id: doorId,
      position: [frontX, zCenter],
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorId])

  const TARGET_N = Math.PI / 2   // north hinge → +X swing
  const TARGET_S = -Math.PI / 2  // south hinge → +X swing
  const refs = [pivotNorthLowerRef, pivotNorthUpperRef, pivotSouthLowerRef, pivotSouthUpperRef]
  const targets = [TARGET_N, TARGET_N, TARGET_S, TARGET_S]

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let moved = false
    const count = pair ? 4 : 2
    for (let i = 0; i < count; i++) {
      const t = isOpen ? targets[i] : 0
      const d = t - anglesRef.current[i]
      if (Math.abs(d) < 0.0005) continue
      anglesRef.current[i] += d * Math.min(1, delta * 6)
      if (refs[i].current) refs[i].current!.rotation.y = anglesRef.current[i]
      moved = true
    }
    if (moved) invalidate()
  })

  const isActive = activeDoorId === doorId
  const doorThickX = 0.018
  const panelW = doorWidth - 0.005

  return (
    <group>
      {/* 북쪽 hinge — 하부 */}
      <group ref={pivotNorthLowerRef} position={[frontX, lowerCenterY, zStart + 0.0025]}>
        <mesh position={[-doorThickX / 2, 0, panelW / 2]}>
          <boxGeometry args={[doorThickX, lowerDoorH, panelW]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        <mesh position={[0.001, lowerHandleY - lowerCenterY, panelW - 0.020 - panelW * 0.1]}>
          <boxGeometry args={[0.005, 0.01, panelW * 0.2]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
      {/* 북쪽 hinge — 상부 */}
      <group ref={pivotNorthUpperRef} position={[frontX, upperCenterY, zStart + 0.0025]}>
        <mesh position={[-doorThickX / 2, 0, panelW / 2]}>
          <boxGeometry args={[doorThickX, upperDoorH, panelW]} />
          <meshStandardMaterial map={walnutTex} roughness={0.45} />
        </mesh>
        <mesh position={[0.001, upperHandleY - upperCenterY, panelW - 0.020 - panelW * 0.1]}>
          <boxGeometry args={[0.005, 0.01, panelW * 0.2]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
      {/* 남쪽 hinge (페어) */}
      {pair && (
        <>
          <group ref={pivotSouthLowerRef} position={[frontX, lowerCenterY, zEnd - 0.0025]}>
            <mesh position={[-doorThickX / 2, 0, -panelW / 2]}>
              <boxGeometry args={[doorThickX, lowerDoorH, panelW]} />
              <meshStandardMaterial map={walnutTex} roughness={0.45} />
            </mesh>
            <mesh position={[0.001, lowerHandleY - lowerCenterY, -(panelW - 0.020 - panelW * 0.1)]}>
              <boxGeometry args={[0.005, 0.01, panelW * 0.2]} />
              <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
            </mesh>
          </group>
          <group ref={pivotSouthUpperRef} position={[frontX, upperCenterY, zEnd - 0.0025]}>
            <mesh position={[-doorThickX / 2, 0, -panelW / 2]}>
              <boxGeometry args={[doorThickX, upperDoorH, panelW]} />
              <meshStandardMaterial map={walnutTex} roughness={0.45} />
            </mesh>
            <mesh position={[0.001, upperHandleY - upperCenterY, -(panelW - 0.020 - panelW * 0.1)]}>
              <boxGeometry args={[0.005, 0.01, panelW * 0.2]} />
              <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
            </mesh>
          </group>
        </>
      )}
      {isActive && (
        <Html position={[frontX + 0.05, (lowerCenterY + upperCenterY) / 2, zCenter]} center distanceFactor={1.5} zIndexRange={[100, 0]}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(20,20,25,0.85)', color: '#fff5e6', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontFamily: 'system-ui, sans-serif', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'none' }}>
            <kbd style={{ background: '#fff5e6', color: '#1a1a1a', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 12, border: '1px solid #888', boxShadow: '0 1px 0 #555' }}>F</kbd>
            <span>{isOpen ? '도어 닫기' : '도어 열기'}</span>
          </div>
        </Html>
      )}
    </group>
  )
}
