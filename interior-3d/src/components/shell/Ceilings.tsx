/**
 * 천장 — 방별 천장 plane + 단내림(150mm) + 코브 LED.
 *
 * 단내림 영역: 안방/거실 하단(LR_D-0.8 ~ LR_D), 아기방/작업실 하단(도어 벽쪽).
 * 코브 LED는 playerPos 또는 allLightsOn 으로 활성. 단내림은 방 경계를 가로지르므로
 * Rooms.tsx 가 아닌 shell에서 처리.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useKTX2 } from '../../systems/useKTX2'
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

const STUCCO_CEILING_ROOMS = new Set(['작업실베란다', '메인베란다', '세탁실', '세탁실좌', '세탁실우', '새장', '실외기실'])

// 모듈 스코프 precomputed — 매 렌더 JSX 에서 boxGeometry/circleGeometry 재생성 방지
const _workLeftX = babyRight + 2.555 + 0.1 + 0.1
const _workRightX = LR_W
const _workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1
// 작업실 남측 내벽 — 복도 도어 벽 내측면 (z = -T2 - 1.591 + T2 = -1.591)
const _workBotZ = -1.591
const _workW = _workRightX - _workLeftX
const _workCenterX = (_workLeftX + _workRightX) / 2

const STRIP_Y = 0.015
const STRIP_Z = 0.008
const DROP_H = 0.15
const DROP_D = 0.8

const LED_GEO = {
  mb: new THREE.BoxGeometry(MB_W, STRIP_Y, STRIP_Z),
  lr: new THREE.BoxGeometry(LR_W, STRIP_Y, STRIP_Z),
  baby: new THREE.BoxGeometry(BABY_INNER_W + 0.2, STRIP_Y, STRIP_Z),
  work: new THREE.BoxGeometry(_workW, STRIP_Y, STRIP_Z),
}
const DROP_GEO = {
  mb: new THREE.BoxGeometry(MB_W + WALL_THICKNESS, DROP_H, DROP_D),
  lr: new THREE.BoxGeometry(LR_W + WALL_THICKNESS, DROP_H, DROP_D),
  baby: new THREE.BoxGeometry(BABY_INNER_W + 0.2 - 0.01, DROP_H, DROP_D),  // 동측 10mm 축소
  work: new THREE.BoxGeometry(_workW, DROP_H, DROP_D - 0.01),               // 남측 10mm 축소
}
function MergedCeilings({ silkMatBackSide }: { silkMatBackSide: THREE.MeshStandardMaterial }) {
  const { mergedGeo } = useMemo(() => {
    // 모든 천장(일반 + 옛 stucco) silk 벽지로 통일 — 단일 merged geometry
    const allGeos = rooms.map((room) => {
      const g = new THREE.PlaneGeometry(room.size[0], room.size[1])
      g.rotateX(-Math.PI / 2)
      g.translate(room.center[0], WALL_HEIGHT, room.center[1])
      return g
    })
    const mergedGeo = mergeGeometries(allGeos, false)
    allGeos.forEach(g => g.dispose())
    void STUCCO_CEILING_ROOMS  // 옛 stucco 룸 분류 (현재 미사용)
    return { mergedGeo }
  }, [])

  return (
    <>
      {mergedGeo && <mesh geometry={mergedGeo} material={silkMatBackSide} />}
    </>
  )
}

interface CeilingsProps {
  showCeiling: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
  visibleSectors: Set<SectorId>
}

export function Ceilings({ showCeiling, playerPos, allLightsOn, visibleSectors }: CeilingsProps) {
  // 천장 + 단내림 = 벽지(silk)와 동일 텍스처
  const silkTex = useKTX2('/textures/silk.ktx2')
  const { silkMat, silkMatBackSide } = useMemo(() => {
    const t = silkTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return {
      silkMat: new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0 }),
      silkMatBackSide: new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0, side: THREE.BackSide }),
    }
  }, [silkTex])

  if (!showCeiling) return null

  // 코브 LED는 visibility 게이팅: allLightsOn 이어도 닫힌 방의 LED는 안 켜짐
  // (RectAreaLight가 occluder 무시 → 벽 통과 누출 방지)
  const mbInRoom = !!playerPos && playerPos[0] >= mbLeft && playerPos[0] <= -WALL_THICKNESS && playerPos[1] >= 0 && playerPos[1] <= LR_D
  const lrInRoom = !!playerPos && playerPos[0] >= 0 && playerPos[0] <= LR_W && playerPos[1] >= 0 && playerPos[1] <= LR_D
  const babyInRoom = !!playerPos && playerPos[0] >= babyLeft && playerPos[0] <= babyRight && playerPos[1] >= babyTop && playerPos[1] <= babyBottomZ
  const mbActive = visibleSectors.has('mb') && (allLightsOn || mbInRoom)
  const lrActive = visibleSectors.has('lr') && (allLightsOn || lrInRoom)
  const babyActive = visibleSectors.has('baby') && (allLightsOn || babyInRoom)

  const workLeftX = _workLeftX
  const workRightX = _workRightX
  const workTopZ = _workTopZ
  const workBotZ = _workBotZ
  const workCenterX = _workCenterX
  const workW = _workW
  const workInRoom = !!playerPos && playerPos[0] >= workLeftX - 0.2 && playerPos[0] <= workRightX + 0.1 && playerPos[1] <= -0.1 - 1.591 - 0.1 && playerPos[1] >= workTopZ - 0.2
  const workActive = visibleSectors.has('work') && (allLightsOn || workInRoom)

  // walls 변수 참조 — 향후 ceiling-wall trim 등에 사용 가능 (현재는 사용 안 함)
  void walls

  return (
    <>
      {/* === 단내림 + 코브 LED === */}
      {/* 안방 LED 스트립 */}
      <mesh position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.008, LR_D - 0.8 - 0.01]} geometry={LED_GEO.mb}>
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
      <mesh position={[LR_W / 2, WALL_HEIGHT - 0.008, LR_D - 0.8 - 0.01]} geometry={LED_GEO.lr}>
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
      <mesh position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]} geometry={DROP_GEO.mb} material={silkMat} />
      {/* 거실 단내림 천장 */}
      <mesh position={[LR_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]} geometry={DROP_GEO.lr} material={silkMat} />

      {/* 아기방 단내림 (하단벽쪽, 도어 벽) — 동측 10mm 축소 → 중심 서측 5mm shift */}
      <mesh position={[(babyLeft + babyRight + 0.2) / 2 - 0.005, WALL_HEIGHT - 0.075, babyBottomZ - 0.4]} geometry={DROP_GEO.baby} material={silkMat} />
      {/* 아기방 LED 스트립 */}
      <mesh position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.008, babyBottomZ - 0.8 - 0.01]} geometry={LED_GEO.baby}>
        <meshStandardMaterial color={babyActive ? '#fff' : '#444'} emissive={babyActive ? '#ffe0b0' : '#111'} emissiveIntensity={babyActive ? 3.0 : 0.1} />
      </mesh>
      <rectAreaLight
        position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.005, babyBottomZ - 0.8 - 0.02]}
        width={BABY_INNER_W + 0.2}
        height={0.03}
        intensity={babyActive ? 8 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* 작업실 단내림 (하단벽쪽, 복도 도어 벽) — 남측 10mm 축소 → 중심 북측 5mm shift */}
      <mesh position={[workCenterX, WALL_HEIGHT - 0.075, workBotZ - 0.4 - 0.005]} geometry={DROP_GEO.work} material={silkMat} />
      <mesh position={[workCenterX, WALL_HEIGHT - 0.008, workBotZ - 0.8 - 0.01]} geometry={LED_GEO.work}>
        <meshStandardMaterial color={workActive ? '#fff' : '#444'} emissive={workActive ? '#ffe0b0' : '#111'} emissiveIntensity={workActive ? 3.0 : 0.1} />
      </mesh>
      <rectAreaLight
        position={[workCenterX, WALL_HEIGHT - 0.005, workBotZ - 0.8 - 0.02]}
        width={workW}
        height={0.03}
        intensity={workActive ? 8 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* === 방별 천장 plane (병합) === */}
      <MergedCeilings silkMatBackSide={silkMatBackSide} />
    </>
  )
}
