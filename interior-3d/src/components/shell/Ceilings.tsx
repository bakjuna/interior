/**
 * 천장 — 방별 천장 plane + 단내림(150mm) + 코브 LED.
 *
 * 단내림 영역: 안방/거실 하단(LR_D-0.8 ~ LR_D), 아기방/작업실 상단(top ~ top+0.8).
 * 코브 LED는 playerPos 또는 allLightsOn 으로 활성. 단내림은 방 경계를 가로지르므로
 * Rooms.tsx 가 아닌 shell에서 처리.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  rooms,
  walls,
  WALL_HEIGHT,
  WALL_THICKNESS,
  MB_W,
  LR_W,
  LR_D,
  BABY_INNER_W,
  babyLeft,
  babyRight,
  babyTop,
  babyBottomZ,
  right1Z,
} from '../../data/apartment'
import type { SectorId } from '../../data/sectors'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

function MergedCeilings() {
  const geometry = useMemo(() => {
    const geos = rooms.map((room) => {
      const g = new THREE.PlaneGeometry(room.size[0], room.size[1])
      g.rotateX(-Math.PI / 2)
      g.translate(room.center[0], WALL_HEIGHT, room.center[1])
      return g
    })
    const merged = mergeGeometries(geos, false)
    geos.forEach(g => g.dispose())
    return merged
  }, [])

  if (!geometry) return null
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} side={THREE.BackSide} />
    </mesh>
  )
}

interface CeilingsProps {
  showCeiling: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
  visibleSectors: Set<SectorId>
}

export function Ceilings({ showCeiling, playerPos, allLightsOn, visibleSectors }: CeilingsProps) {
  if (!showCeiling) return null

  // 코브 LED는 visibility 게이팅: allLightsOn 이어도 닫힌 방의 LED는 안 켜짐
  // (RectAreaLight가 occluder 무시 → 벽 통과 누출 방지)
  const mbInRoom = !!playerPos && playerPos[0] >= mbLeft && playerPos[0] <= -WALL_THICKNESS && playerPos[1] >= 0 && playerPos[1] <= LR_D
  const lrInRoom = !!playerPos && playerPos[0] >= 0 && playerPos[0] <= LR_W && playerPos[1] >= 0 && playerPos[1] <= LR_D
  const babyInRoom = !!playerPos && playerPos[0] >= babyLeft && playerPos[0] <= babyRight && playerPos[1] >= babyTop && playerPos[1] <= babyBottomZ
  const mbActive = visibleSectors.has('mb') && (allLightsOn || mbInRoom)
  const lrActive = visibleSectors.has('lr') && (allLightsOn || lrInRoom)
  const babyActive = visibleSectors.has('baby') && (allLightsOn || babyInRoom)

  const workLeftX = babyRight + 2.555 + 0.1 + 0.1
  const workRightX = LR_W
  const workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1
  const workW = workRightX - workLeftX
  const workCenterX = (workLeftX + workRightX) / 2
  const workInRoom = !!playerPos && playerPos[0] >= workLeftX - 0.2 && playerPos[0] <= workRightX + 0.1 && playerPos[1] <= -0.1 - 1.591 - 0.1 && playerPos[1] >= workTopZ - 0.2
  const workActive = visibleSectors.has('work') && (allLightsOn || workInRoom)

  // walls 변수 참조 — 향후 ceiling-wall trim 등에 사용 가능 (현재는 사용 안 함)
  void walls

  return (
    <>
      {/* === 단내림 + 코브 LED === */}
      {/* 안방 LED 스트립 */}
      <mesh position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.008, LR_D - 0.8 - 0.01]}>
        <boxGeometry args={[MB_W, 0.015, 0.008]} />
        <meshStandardMaterial color={mbActive ? '#fff' : '#444'} emissive={mbActive ? '#ffe0b0' : '#111'} emissiveIntensity={mbActive ? 3.0 : 0.1} />
      </mesh>
      <rectAreaLight
        position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.005, LR_D - 0.8 - 0.02]}
        width={MB_W}
        height={0.03}
        intensity={mbActive ? 8 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* 거실 LED 스트립 */}
      <mesh position={[LR_W / 2, WALL_HEIGHT - 0.008, LR_D - 0.8 - 0.01]}>
        <boxGeometry args={[LR_W, 0.015, 0.008]} />
        <meshStandardMaterial color={lrActive ? '#fff' : '#444'} emissive={lrActive ? '#ffe0b0' : '#111'} emissiveIntensity={lrActive ? 3.0 : 0.1} />
      </mesh>
      <rectAreaLight
        position={[LR_W / 2, WALL_HEIGHT - 0.005, LR_D - 0.8 - 0.02]}
        width={LR_W}
        height={0.03}
        intensity={lrActive ? 16 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* 안방 단내림 천장 */}
      <mesh position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]}>
        <boxGeometry args={[MB_W + WALL_THICKNESS, 0.15, 0.8]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>
      {/* 거실 단내림 천장 */}
      <mesh position={[LR_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]}>
        <boxGeometry args={[LR_W + WALL_THICKNESS, 0.15, 0.8]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>

      {/* 아기방 단내림 (상단벽쪽, 거울상) */}
      <mesh position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.075, babyTop + 0.4]}>
        <boxGeometry args={[BABY_INNER_W + 0.2, 0.15, 0.8]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>
      {/* 아기방 LED 스트립 */}
      <mesh position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.008, babyTop + 0.8 + 0.01]}>
        <boxGeometry args={[BABY_INNER_W + 0.2, 0.015, 0.008]} />
        <meshStandardMaterial color={babyActive ? '#fff' : '#444'} emissive={babyActive ? '#ffe0b0' : '#111'} emissiveIntensity={babyActive ? 3.0 : 0.1} />
      </mesh>
      <rectAreaLight
        position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.005, babyTop + 0.8 + 0.02]}
        width={BABY_INNER_W + 0.2}
        height={0.03}
        intensity={babyActive ? 8 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* 작업실 단내림 (상단벽쪽, 거울상) */}
      <mesh position={[workCenterX, WALL_HEIGHT - 0.075, workTopZ + 0.4]}>
        <boxGeometry args={[workW, 0.15, 0.8]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>
      <mesh position={[workCenterX, WALL_HEIGHT - 0.008, workTopZ + 0.8 + 0.01]}>
        <boxGeometry args={[workW, 0.015, 0.008]} />
        <meshStandardMaterial color={workActive ? '#fff' : '#444'} emissive={workActive ? '#ffe0b0' : '#111'} emissiveIntensity={workActive ? 3.0 : 0.1} />
      </mesh>
      <rectAreaLight
        position={[workCenterX, WALL_HEIGHT - 0.005, workTopZ + 0.8 + 0.02]}
        width={workW}
        height={0.03}
        intensity={workActive ? 8 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* === 방별 천장 plane (병합) === */}
      <MergedCeilings />
    </>
  )
}
