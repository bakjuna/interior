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
  baby: new THREE.BoxGeometry(BABY_INNER_W + 0.2, DROP_H, DROP_D),
  work: new THREE.BoxGeometry(_workW, DROP_H, DROP_D),
}
const DOWNLIGHT_GEO = {
  cylinder: new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16),
  circle: new THREE.CircleGeometry(0.035, 16),
  ring: new THREE.RingGeometry(0.035, 0.045, 16),
}
const DROP_MAT = new THREE.MeshStandardMaterial({ color: '#f5f3f0', roughness: 0.4, metalness: 0.02 })
const HOUSING_MAT = new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.5 })
const RING_MAT = new THREE.MeshStandardMaterial({ color: '#ccc', metalness: 0.6, roughness: 0.3 })

function MergedCeilings() {
  const stuccoTex = useKTX2('/textures/stucco-wall.ktx2')

  const { normalGeo, stuccoGeo, stuccoMat } = useMemo(() => {
    const normalRooms = rooms.filter(r => !STUCCO_CEILING_ROOMS.has(r.name))
    const stuccoRooms = rooms.filter(r => STUCCO_CEILING_ROOMS.has(r.name))

    const normalGeos = normalRooms.map((room) => {
      const g = new THREE.PlaneGeometry(room.size[0], room.size[1])
      g.rotateX(-Math.PI / 2)
      g.translate(room.center[0], WALL_HEIGHT, room.center[1])
      return g
    })
    const normalGeo = mergeGeometries(normalGeos, false)
    normalGeos.forEach(g => g.dispose())

    const stuccoGeos = stuccoRooms.map((room) => {
      const g = new THREE.PlaneGeometry(room.size[0], room.size[1])
      g.rotateX(-Math.PI / 2)
      g.translate(room.center[0], WALL_HEIGHT, room.center[1])
      return g
    })
    const stuccoGeo = stuccoGeos.length > 0 ? mergeGeometries(stuccoGeos, false) : null
    stuccoGeos.forEach(g => g.dispose())

    const sTex = stuccoTex.clone()
    sTex.wrapS = THREE.RepeatWrapping
    sTex.wrapT = THREE.RepeatWrapping
    sTex.repeat.set(5, 5)
    sTex.colorSpace = THREE.SRGBColorSpace
    const stuccoMat = new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.85, metalness: 0, side: THREE.BackSide })
    stuccoMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        float stuccoHash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        `
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          vec2 uv0 = vMapUv;
          vec2 tile = floor(uv0);
          float h = stuccoHash(tile);
          vec2 uvA = uv0 + vec2(h, fract(h * 17.3)) * 0.5;
          vec4 s1 = texture2D(map, uvA);
          vec4 s2 = texture2D(map, uv0 * 1.73 + 0.31);
          vec4 s3 = texture2D(map, uv0 * 0.57 + 0.67);
          vec2 f = fract(uv0);
          vec2 w = smoothstep(0.0, 0.15, f) * smoothstep(0.0, 0.15, 1.0 - f);
          float edgeMix = 1.0 - w.x * w.y;
          vec4 sampledDiffuseColor = mix(s1, mix(s2, s3, 0.5), edgeMix * 0.6);
          diffuseColor *= sampledDiffuseColor;
        #endif
        `
      )
    }

    return { normalGeo, stuccoGeo, stuccoMat }
  }, [stuccoTex])

  return (
    <>
      {normalGeo && (
        <mesh geometry={normalGeo}>
          <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} side={THREE.BackSide} />
        </mesh>
      )}
      {stuccoGeo && (
        <mesh geometry={stuccoGeo} material={stuccoMat} />
      )}
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

      {/* 안방 화장대 다운라이트 — 좌상단 300×300mm, 서측 10° 틸트 */}
      {(() => {
        const dlX = mbLeft + 0.27   // 화장대 상판 X 중심 (vanityW/2 = 0.27)
        const dlZ = 0.3            // 화장대 Z 중심 (vanityZ)
        const tiltRad = -30 * Math.PI / 180
        const targetX = dlX - Math.tan(tiltRad) * WALL_HEIGHT
        return (
          <group>
            {/* 천장~라이트 사이 실린더 하우징 */}
            <mesh position={[dlX - 0.014, WALL_HEIGHT + 0.002, dlZ]} rotation={[Math.PI , 0, tiltRad]} geometry={DOWNLIGHT_GEO.cylinder} material={HOUSING_MAT} />
            {/* 다운라이트 피팅 — circle + ring */}
            <mesh position={[dlX, WALL_HEIGHT - 0.025, dlZ]} rotation={[Math.PI / 2, -tiltRad, 0]} geometry={DOWNLIGHT_GEO.circle}>
              <meshStandardMaterial toneMapped={false} emissive={mbActive ? '#ffffff' : '#111'} emissiveIntensity={mbActive ? 2.0 : 0.1} color={mbActive ? '#ffffff' : '#222'} />
            </mesh>
            <mesh position={[dlX, WALL_HEIGHT - 0.026, dlZ]} rotation={[Math.PI / 2, -tiltRad, 0]} geometry={DOWNLIGHT_GEO.ring} material={RING_MAT} />
            {/* 동쪽 30° 틸트 스팟라이트 */}
            <spotLight
              position={[dlX, WALL_HEIGHT - 0.01, dlZ]}
              angle={Math.PI / 6}
              penumbra={0.8}
              intensity={mbActive ? 15 : 0}
              color="#ffffff"
              distance={3}
              decay={2}
              ref={(light: THREE.SpotLight | null) => {
                if (light) {
                  light.target.position.set(targetX, 0, dlZ)
                  light.target.updateMatrixWorld()
                }
              }}
            />
          </group>
        )
      })()}

      {/* 안방 단내림 천장 */}
      <mesh position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]} geometry={DROP_GEO.mb} material={DROP_MAT} />
      {/* 거실 단내림 천장 */}
      <mesh position={[LR_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]} geometry={DROP_GEO.lr} material={DROP_MAT} />

      {/* 아기방 단내림 (상단벽쪽, 거울상) */}
      <mesh position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.075, babyTop + 0.4]} geometry={DROP_GEO.baby} material={DROP_MAT} />
      {/* 아기방 LED 스트립 */}
      <mesh position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.008, babyTop + 0.8 + 0.01]} geometry={LED_GEO.baby}>
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
      <mesh position={[workCenterX, WALL_HEIGHT - 0.075, workTopZ + 0.4]} geometry={DROP_GEO.work} material={DROP_MAT} />
      <mesh position={[workCenterX, WALL_HEIGHT - 0.008, workTopZ + 0.8 + 0.01]} geometry={LED_GEO.work}>
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
