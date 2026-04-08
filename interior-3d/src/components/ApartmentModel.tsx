import { useMemo, useRef, useEffect, useCallback, useState, Suspense } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { useLoader, useThree, useFrame } from '@react-three/fiber'

// RectAreaLight 초기화 (한 번만)
RectAreaLightUniformsLib.init()
import { TextureLoader } from 'three'
import { useGLTF, Html, RoundedBox } from '@react-three/drei'
import {
  walls,
  rooms,
  windows,
  closets,
  downlights,
  downlightGroups,
  WALL_HEIGHT,
  MB_W,
  LR_W,
  LR_D,
  WALL_THICKNESS,
  BABY_INNER_W,
  BABY_INNER_D,
  mbBathLeft,
  mbBathRight,
  mbBathTop,
  mbBathBottom,
  babyLeft,
  babyRight,
  babyTop,
  babyBottomZ,
  right1Z,
  verandaInnerD,
  stairLeftX,
  stair2X,
  stair3Z,
  stair4endX,
  laundryBotZ,
  rightWallX,
  mbDoorHinge,
  mbDoorEnd,
  bath2RightWallX,
  babyBottom,
  babyRightWallX,
  babyTopWallZ,
} from '../data/apartment'
import type { DoorId } from '../data/sectors'
import { computeVisibleSectors, findSector } from '../systems/visibility'
import { Doors } from './shell/Doors'
import { Walls } from './shell/Walls'
import { Windows } from './shell/Windows'
import { Floors } from './shell/Floors'
import { Ceilings } from './shell/Ceilings'
import { ExteriorBackground } from './shell/ExteriorBackground'
import { Closets } from './shell/Closets'
import { MainVeranda } from './rooms/MainVeranda'
import { WorkVeranda } from './rooms/WorkVeranda'
import { Laundry } from './rooms/Laundry'
import { OutdoorUnit } from './rooms/OutdoorUnit'
import { Cage } from './rooms/Cage'
import { BabyRoom } from './rooms/BabyRoom'
import { WorkRoom } from './rooms/WorkRoom'
import { Hallway } from './rooms/Hallway'
import { MainBath } from './rooms/MainBath'
import { MasterBath } from './rooms/MasterBath'
import { LivingRoom } from './rooms/LivingRoom'
import { MasterBedroom } from './rooms/MasterBedroom'
import { Entrance } from './rooms/Entrance'
import { Kitchen } from './rooms/Kitchen'
import { DropCeilingLight } from './primitives/DropCeilingLight'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

interface ApartmentModelProps {
  showCeiling?: boolean
  playerPos?: [number, number]  // [x, z] — 워크스루 전용, 현재 위치
  isNight?: boolean             // 워크스루 야간 모드 (조명 ON 판정)
  allLightsOn?: boolean         // 조감도용, 전체 조명 ON/OFF
  showCityBackground?: boolean  // 외부 도시 배경 이미지 표시 (조감도에서는 false)
  doorOpenStates?: Map<DoorId, boolean>  // visibility 용 (Phase 6)
  activeDoorId?: DoorId | null            // 카메라 forward 가 향하는 도어 (툴팁 표시 / F 키 토글 대상)
  onDoorOpenChange?: (id: DoorId, open: boolean) => void  // 도어 상태 lift (워크스루 충돌/visibility용)
}

// 전체 내측 범위
const totalLeft = -WALL_THICKNESS - MB_W
const totalRight = LR_W
const totalW = totalRight - totalLeft
const centerX = (totalLeft + totalRight) / 2
const centerZ = LR_D / 2

export function ApartmentModel({ showCeiling = true, playerPos: rawPlayerPos, isNight = true, allLightsOn = false, showCityBackground = true, doorOpenStates, activeDoorId, onDoorOpenChange }: ApartmentModelProps) {
  // 도어 인터랙션은 항상 raw 사용. 조명 로직은 야간일 때만 playerPos 사용.
  const playerPos = isNight ? rawPlayerPos : undefined

  // === Phase 6: portal culling ===
  // visualOnly portal (베란다 창문) 은 한 경로에서 최대 1 hop 제한.
  // 즉 mb → mainVeranda 보임, mb → mainVeranda → lr 차단.
  // playerPos 없으면(BirdsEye/FloorPlan) 모든 sector 반환.
  const visibleSectors = useMemo(
    () => computeVisibleSectors(rawPlayerPos, doorOpenStates ?? new Map()),
    [rawPlayerPos, doorOpenStates]
  )

  const floorTex = useLoader(TextureLoader, '/textures/walnut-floor.png')
  const porcelainTex = useLoader(TextureLoader, '/textures/porcelain-tile.png')
  const entranceTex = useLoader(TextureLoader, '/textures/entrance-tile.png')
  const bathroomWallTex = useLoader(TextureLoader, '/textures/bathroom-wall-tile.png')

  // 화장실 타일 메지(grout) — 흰색 라인. 타일 600×1200mm 기준 약 3mm 두께
  // x축 threshold = 3/600 ≈ 0.005, y축 threshold = 3/1200 ≈ 0.0025
  const tileGroutOnBeforeCompile = useMemo(() => (shader: THREE.Shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      vec2 _tuv = fract(vMapUv);
      float _gx = 0.005;
      float _gy = 0.0025;
      if (_tuv.x < _gx || _tuv.x > 1.0 - _gx || _tuv.y < _gy || _tuv.y > 1.0 - _gy) {
        diffuseColor.rgb = vec3(1.0);
      }
      `
    )
  }, [])
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')
  const walnutDoorTex = useLoader(TextureLoader, '/textures/walnut_door.png')
  const silkTex = useLoader(TextureLoader, '/textures/silk.png')

  // 외부 뷰 텍스처 — 북/남 각각 낮/밤 (파일 없으면 조용히 skip)
  const [cityNorthDayTex, setCityNorthDayTex] = useState<THREE.Texture | null>(null)
  const [cityNorthNightTex, setCityNorthNightTex] = useState<THREE.Texture | null>(null)
  const [citySouthDayTex, setCitySouthDayTex] = useState<THREE.Texture | null>(null)
  const [citySouthNightTex, setCitySouthNightTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    const loader = new TextureLoader()
    const setup = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      return tex
    }
    const loadOne = (path: string, setter: (t: THREE.Texture) => void) => {
      loader.load(
        path,
        (tex) => setter(setup(tex)),
        undefined,
        () => console.warn(`[city-view] ${path} not found`)
      )
    }
    loadOne('/textures/city-view-north-day.jpg', setCityNorthDayTex)
    loadOne('/textures/city-view-north-night.jpg', setCityNorthNightTex)
    loadOne('/textures/city-view-south-day.jpg', setCitySouthDayTex)
    loadOne('/textures/city-view-south-night.jpg', setCitySouthNightTex)
  }, [])
  const cityNorthTex = isNight ? cityNorthNightTex : cityNorthDayTex
  const citySouthTex = isNight ? citySouthNightTex : citySouthDayTex

  const floorTexture = useMemo(() => {
    const tex = floorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1) // 1m당 1타일 기준, 방 크기에 따라 조정
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [floorTex])

  // 신발장 오픈 선반 월넛 라이너 — 2x1, 1x1 2개만 사용
  const walnutLinerTex2x1 = useMemo(() => {
    const tex = walnutDoorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [walnutDoorTex])
  const walnutLinerTex1x1 = useMemo(() => {
    const tex = walnutDoorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [walnutDoorTex])

  // 모든 캐비넷 본체(상부장/하부장 박스, 측면, 필러) 공통 호두 텍스처
  // 도어와 동일한 톤을 위해 closetDoorTex 사용. face별로 1타일 매핑.
  const walnutBodyTex = useMemo(() => {
    const tex = closetDoorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [closetDoorTex])

  // === 다운라이트 정적 메타데이터 — 1번만 계산 ===
  // 위치/sector/단내림 여부/색상 등은 downlights 데이터 + 상수에만 의존하므로
  // 매 렌더마다 reduce 할 필요 없음. playerPos 변경 시 isActive 만 다시 계산.
  const downlightStatic = useMemo(() => {
    const workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1
    return downlights.map(([x, z]) => {
      const sector = findSector(x, z)
      const isDropCeilingBottom = z > LR_D - 0.8 && x >= mbLeft && x <= LR_W
      const isDropCeilingBabyTop = z < babyTop + 0.8 && z >= babyTop && x >= babyLeft && x <= babyRight + 0.2
      const isDropCeilingWorkTop = z < workTopZ + 0.8 && z >= workTopZ && x >= babyRight + 2.555 + 0.2 && x <= LR_W
      const isDropCeiling = isDropCeilingBottom || isDropCeilingBabyTop || isDropCeilingWorkTop
      const ceilingY = isDropCeiling ? WALL_HEIGHT - 0.15 : WALL_HEIGHT
      // 화장대 앞 다운라이트 (안방 좌측 상단) → 흰색
      const isVanity = Math.abs(x - (mbLeft + 1.013)) < 0.05 && z < 0.8
      const color = isVanity ? '#fff5e6' : '#ffe0b0'
      const key = `${x.toFixed(4)}|${z.toFixed(4)}`
      return { x, z, sector, ceilingY, color, isVanity, key }
    })
  }, [])

  // 현재 플레이어가 있는 방의 라이트 그룹 — playerPos 변경 시에만 갱신
  const activeGroup = useMemo(() => {
    if (!playerPos) return null
    return downlightGroups.find(g => {
      const minZ = Math.min(g.bounds.topZ, g.bounds.bottomZ)
      const maxZ = Math.max(g.bounds.topZ, g.bounds.bottomZ)
      return playerPos[0] >= g.bounds.leftX && playerPos[0] <= g.bounds.rightX &&
        playerPos[1] >= minZ && playerPos[1] <= maxZ
    }) ?? null
  }, [playerPos])

  // activeGroup 의 라이트 좌표를 Set 으로 — O(1) 멤버십 검사
  const activeGroupKeys = useMemo(() => {
    if (!activeGroup) return null
    const set = new Set<string>()
    for (const [lx, lz] of activeGroup.lights) {
      set.add(`${lx.toFixed(4)}|${lz.toFixed(4)}`)
    }
    return set
  }, [activeGroup])

  // 방별 바닥 텍스처 — 1번만 생성 (매 렌더마다 clone 방지)
  const roomFloorTextures = useMemo(() => {
    return rooms.map((room) => {
      const baseTex = room.floorTile === 'porcelain' ? porcelainTex
                    : room.floorTile === 'entrance' ? entranceTex
                    : floorTex
      const tex = baseTex.clone()
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      tex.colorSpace = THREE.SRGBColorSpace
      const tileSize = room.tileSize ?? 1
      tex.repeat.set(room.size[0] / tileSize, room.size[1] / tileSize)
      return tex
    })
  }, [floorTex, porcelainTex, entranceTex])

  return (
    <group>
      <ExteriorBackground show={showCityBackground} isNight={isNight} />
      <Floors />
      <Walls />
      <Windows />

      <Closets />

      {/* 다운라이트 — 정적 메타데이터는 useMemo 캐시, 렌더 루프는 isActive 만 계산 */}
      {downlightStatic.map((d, i) => {
        const inActiveGroup = activeGroupKeys?.has(d.key) ?? false
        // allLightsOn 이어도 visible sector 의 다운라이트만 활성 (벽 통과 누출 방지)
        const isActive = inActiveGroup ||
          (!!allLightsOn && (d.sector ? visibleSectors.has(d.sector) : true))
        return (
          <group key={`dl-${i}`}>
            {/* 발광면 */}
            <mesh position={[d.x, d.ceilingY - 0.005, d.z]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.035, 16]} />
              <meshStandardMaterial
                color={isActive ? '#fff' : '#888'}
                emissive={isActive ? d.color : '#222'}
                emissiveIntensity={isActive ? 1.0 : 0.1}
              />
            </mesh>
            {/* 크롬 링 */}
            <mesh position={[d.x, d.ceilingY - 0.006, d.z]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.035, 0.045, 16]} />
              <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* 워크스루: 모든 다운라이트를 SpotLight로 */}
            <DropCeilingLight x={d.x} z={d.z} ceilingY={d.ceilingY} active={isActive} color={d.color} />
          </group>
        )
      })}
      {/* 워크스루: 조명 없는 공간에서만 외부 라이트 */}
      {playerPos && !activeGroup && (
        <pointLight
          position={[playerPos[0], WALL_HEIGHT - 0.1, playerPos[1]]}
          intensity={0.5}
          distance={4}
          decay={2}
          color="#ffffff"
        />
      )}

      <Ceilings showCeiling={showCeiling} playerPos={playerPos} allLightsOn={allLightsOn} visibleSectors={visibleSectors} />


      {/* Phase 6: visibleSectors 기반 portal culling */}
      <MainVeranda visible={visibleSectors.has('mainVeranda')} />
      <WorkVeranda visible={visibleSectors.has('workVeranda')} />
      <Laundry visible={visibleSectors.has('laundry')} />
      <OutdoorUnit
        wallVisible={visibleSectors.has('outdoor') || visibleSectors.has('mainVeranda')}
        contentsVisible={visibleSectors.has('outdoor')}
      />
      <Cage wallVisible={visibleSectors.has('cage') || visibleSectors.has('mainVeranda')} />
      <BabyRoom visible={visibleSectors.has('baby')} />
      <WorkRoom visible={visibleSectors.has('work')} />
      <Hallway visible={visibleSectors.has('hall')} playerPos={playerPos} allLightsOn={allLightsOn} />
      <MainBath visible={visibleSectors.has('mainBath')} playerPos={playerPos} />
      <MasterBath visible={visibleSectors.has('mbBath')} playerPos={playerPos} />
      <LivingRoom visible={visibleSectors.has('lr')} />
      <MasterBedroom visible={visibleSectors.has('mb')} />
      <Entrance visible={visibleSectors.has('entrance')} playerPos={playerPos} allLightsOn={allLightsOn} />
      <Kitchen visible={visibleSectors.has('kitchen')} playerPos={playerPos} allLightsOn={allLightsOn} activeDoorId={activeDoorId} />


      {/* 도어는 shell/Doors.tsx 가 일괄 렌더 (Phase 2) */}
      <Doors activeDoorId={activeDoorId} onDoorOpenChange={onDoorOpenChange} />

    </group>
  )
}



