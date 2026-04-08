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
import { Doors } from './shell/Doors'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

interface ApartmentModelProps {
  showCeiling?: boolean
  playerPos?: [number, number]  // [x, z] — 워크스루 전용, 현재 위치
  isNight?: boolean             // 워크스루 야간 모드 (조명 ON 판정)
  allLightsOn?: boolean         // 조감도용, 전체 조명 ON/OFF
  showCityBackground?: boolean  // 외부 도시 배경 이미지 표시 (조감도에서는 false)
  onDoorOpenChange?: (id: DoorId, open: boolean) => void  // 도어 상태 lift (워크스루 충돌/visibility용)
}

// 전체 내측 범위
const totalLeft = -WALL_THICKNESS - MB_W
const totalRight = LR_W
const totalW = totalRight - totalLeft
const centerX = (totalLeft + totalRight) / 2
const centerZ = LR_D / 2

export function ApartmentModel({ showCeiling = true, playerPos: rawPlayerPos, isNight = true, allLightsOn = false, showCityBackground = true, onDoorOpenChange }: ApartmentModelProps) {
  // 도어 인터랙션은 항상 raw 사용. 조명 로직은 야간일 때만 playerPos 사용.
  const playerPos = isNight ? rawPlayerPos : undefined
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
      {/* 외부 뷰 배경 (북쪽) — 주방/작업실 창문 방향 billboard plane */}
      {showCityBackground && cityNorthTex && (
        <mesh position={[LR_W / 2, 0, babyTop - 40]}>
          <planeGeometry args={[140, 70]} />
          <meshBasicMaterial
            map={cityNorthTex}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}

      {/* 외부 뷰 배경 (남쪽) — 거실/안방 창문 방향 billboard plane, 카메라쪽(-Z)을 향하도록 회전 */}
      {showCityBackground && citySouthTex && (
        <mesh position={[LR_W / 2, 0, LR_D + 40]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[140, 70]} />
          <meshBasicMaterial
            map={citySouthTex}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}

      {/* 바닥 */}
      {rooms.map((room, ri) => {
        const tex = roomFloorTextures[ri]
        const fY = room.floorY ?? 0
        return (
          <mesh
            key={`floor-${room.name}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.center[0], fY + 0.001, room.center[1]]}
           
            renderOrder={1}
          >
            <planeGeometry args={room.size} />
            <meshStandardMaterial map={tex} roughness={room.floorTile ? 0.2 : 0.35} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        )
      })}

      {/* 벽체 */}
      {walls.map((wall, i) => {
        const dx = wall.end[0] - wall.start[0]
        const dz = wall.end[1] - wall.start[1]
        const length = Math.sqrt(dx * dx + dz * dz)
        const isH = Math.abs(dz) < 0.001
        const specifiedH = wall.height ?? WALL_HEIGHT
        const bY = wall.bottomY ?? -0.03  // 기본 -30mm까지 내림
        const h = wall.bottomY !== undefined ? specifiedH : specifiedH + 0.03  // bottomY 미지정 시 높이 30mm 추가
        const t = wall.thickness

        // 실크 벽지 텍스처 — 가로는 2m당 1회 반복, 세로는 벽 전체 높이에 1회(하단 100px 흰색 = 걸레받이)
        const silk = silkTex.clone()
        silk.wrapS = THREE.RepeatWrapping
        silk.wrapT = THREE.ClampToEdgeWrapping
        silk.repeat.set(length / 2, 1)
        silk.colorSpace = THREE.SRGBColorSpace

        return (
          <mesh
            key={i}
            position={[
              wall.start[0] + dx / 2,
              bY + h / 2,
              wall.start[1] + dz / 2,
            ]}
           
           
          >
            <boxGeometry args={[isH ? length : t, h, isH ? t : length]} />
            <meshStandardMaterial
              map={silk}
              roughness={0.55}
              metalness={0}
            />
          </mesh>
        )
      })}

      {/* 2분할 슬라이딩 창문 (하얀 PVC 샷시) */}
      {windows.map((w, i) => {
        const cx = w.position[0]
        const cz = w.position[1]
        const cy = w.sillHeight + w.height / 2
        const ww = w.width
        const wh = w.height
        const frame = 0.04   // 프레임 두께 40mm
        const mid = 0.03     // 중앙 분할대 30mm
        const depth = 0.08   // 샷시 깊이 80mm
        const isX = w.axis === 'x'
        const rot: [number, number, number] = isX ? [0, 0, 0] : [0, Math.PI / 2, 0]

        const halfW = (ww - mid) / 2

        return (
          <group key={`win-${i}`} position={[cx, cy, cz]} rotation={rot}>
            {/* 외곽 프레임 — 상 */}
            <mesh position={[0, wh / 2 - frame / 2, 0]}>
              <boxGeometry args={[ww, frame, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            {/* 외곽 프레임 — 하 */}
            <mesh position={[0, -wh / 2 + frame / 2 + 0.003, 0]}>
              <boxGeometry args={[ww, frame, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            {/* 외곽 프레임 — 좌 */}
            <mesh position={[-ww / 2 + frame / 2, 0, 0]}>
              <boxGeometry args={[frame, wh, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            {/* 외곽 프레임 — 우 */}
            <mesh position={[ww / 2 - frame / 2, 0, 0]}>
              <boxGeometry args={[frame, wh, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            {/* 중앙 분할대 */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[mid, wh - frame * 2, depth]} />
              <meshStandardMaterial color="#e8e8e8" />
            </mesh>

            {/* 좌측 유리창 패널 */}
            {(() => {
              const pH = wh - frame * 2  // 패널 높이
              const pf = 0.025           // 패널 프레임 두께
              const glassW = halfW - pf * 2
              const glassH = pH - pf * 2
              return (
                <group position={[-halfW / 2 - mid / 2, 0, -depth * 0.2]}>
                  {/* 패널 프레임 4변 */}
                  <mesh position={[0, pH / 2 - pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[0, -pH / 2 + pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[-halfW / 2 + pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[halfW / 2 - pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  {/* 유리 */}
                  <mesh><planeGeometry args={[glassW, glassH]} /><meshStandardMaterial color="#4477aa" transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
                  {/* 손잡이 (우측=중앙쪽, 실내면) */}
                  <mesh position={[halfW / 2 - 0.035, 0, 0.015]}><boxGeometry args={[0.01, 0.07, 0.018]} /><meshStandardMaterial color="#555" /></mesh>
                </group>
              )
            })()}

            {/* 우측 유리창 패널 */}
            {(() => {
              const pH = wh - frame * 2
              const pf = 0.025
              const glassW = halfW - pf * 2
              const glassH = pH - pf * 2
              return (
                <group position={[halfW / 2 + mid / 2, 0, depth * 0.2]}>
                  {/* 패널 프레임 4변 */}
                  <mesh position={[0, pH / 2 - pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[0, -pH / 2 + pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[-halfW / 2 + pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[halfW / 2 - pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  {/* 유리 */}
                  <mesh><planeGeometry args={[glassW, glassH]} /><meshStandardMaterial color="#4477aa" transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
                  {/* 손잡이 (좌측=중앙쪽, 실내면) */}
                  <mesh position={[-halfW / 2 + 0.035, 0, 0.015]}><boxGeometry args={[0.01, 0.07, 0.018]} /><meshStandardMaterial color="#555" /></mesh>
                </group>
              )
            })()}
          </group>
        )
      })}

      {/* 붙박이장/수납공간 */}
      {closets.map((c, i) => {
        const doorTex = closetDoorTex.clone()
        // 문짝 방향: size[2](Z)가 길면 Z 방향 나열, size[0](X)가 길면 X 방향
        const isZlong = c.size[2] > c.size[0]
        const longSide = isZlong ? c.size[2] : c.size[0]
        const doorWidth = 0.6  // 문짝 하나 폭 ~600mm
        const doorCount = Math.max(2, Math.round(longSide / doorWidth))
        const actualDoorW = longSide / doorCount
        const gap = 0.003  // 문짝 사이 간격

        return (
          <group key={`closet-${i}`}>
            {/* 본체 (뒤판) */}
            <mesh position={c.position}>
              <boxGeometry args={c.size} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>

            {/* 문짝들 */}
            {Array.from({ length: doorCount }).map((_, di) => {
              const doorT = closetDoorTex.clone()
              doorT.wrapS = THREE.RepeatWrapping
              doorT.wrapT = THREE.RepeatWrapping
              doorT.repeat.set(1, 1)
              doorT.colorSpace = THREE.SRGBColorSpace

              const offset = -longSide / 2 + actualDoorW / 2 + di * actualDoorW

              // 문짝 위치: 긴 방향을 따라 나열, 앞면에 배치
              const pos: [number, number, number] = isZlong
                ? [c.position[0] + c.size[0] / 2 + 0.002, c.size[1] / 2, c.position[2] + offset]
                : [c.position[0] + offset, c.size[1] / 2, c.position[2] + c.size[2] / 2 + 0.002]

              const doorW = actualDoorW - gap
              const doorH = c.size[1] - 0.02

              return (
                <group key={`door-${di}`}>
                  {/* 문짝 판넬 */}
                  <mesh position={pos} rotation={isZlong ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
                    <planeGeometry args={[doorW, doorH]} />
                    <meshStandardMaterial map={doorT} roughness={0.45} />
                  </mesh>
                  {/* 손잡이 */}
                  <mesh position={[
                    pos[0] + (isZlong ? 0.012 : 0),
                    pos[1],
                    pos[2] + (isZlong ? 0 : 0.012),
                  ]}>
                    <boxGeometry args={[isZlong ? 0.015 : 0.01, 0.1, isZlong ? 0.01 : 0.015]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}

            {/* 상단 몰딩 */}
            <mesh position={[c.position[0], c.size[1] - 0.01, c.position[2]]}>
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

      {/* 다운라이트 */}
      {(() => {
        // 현재 플레이어가 있는 방의 라이트 그룹 찾기
        const activeGroup = playerPos
          ? downlightGroups.find(g => {
              const minZ = Math.min(g.bounds.topZ, g.bounds.bottomZ)
              const maxZ = Math.max(g.bounds.topZ, g.bounds.bottomZ)
              return playerPos[0] >= g.bounds.leftX && playerPos[0] <= g.bounds.rightX &&
                playerPos[1] >= minZ && playerPos[1] <= maxZ
            })
          : null
        const hasLightsInRoom = !!activeGroup

        return (
          <>
            {/* 모든 다운라이트 하우징 (항상 보임) */}
            {downlights.map(([x, z], i) => {
              // allLightsOn=true 이면 전체 ON, 아니면 조감도=off / 워크스루=현재 방만
              const isActive = !!allLightsOn || (playerPos
                ? (activeGroup?.lights.some(([lx, lz]) => lx === x && lz === z) ?? false)
                : false)

              // 단내림 영역: 안방/거실 하단 + 아기방/작업실 상단
              const isDropCeilingBottom = z > LR_D - 0.8 && x >= mbLeft && x <= LR_W
              const isDropCeilingBabyTop = z < babyTop + 0.8 && z >= babyTop && x >= babyLeft && x <= babyRight + 0.2
              const workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1
              const isDropCeilingWorkTop = z < workTopZ + 0.8 && z >= workTopZ && x >= babyRight + 2.555 + 0.2 && x <= LR_W
              const isDropCeiling = isDropCeilingBottom || isDropCeilingBabyTop || isDropCeilingWorkTop
              const ceilingY = isDropCeiling ? WALL_HEIGHT - 0.15 : WALL_HEIGHT

              return (
                <group key={`dl-${i}`}>
                  {/* 발광면 */}
                  <mesh position={[x, ceilingY - 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.035, 16]} />
                    <meshStandardMaterial
                      color={isActive ? '#fff' : '#888'}
                      emissive={isActive ? ((Math.abs(x - (mbLeft + 1.013)) < 0.05 && z < 0.8) ? '#fff5e6' : '#ffe0b0') : '#222'}
                      emissiveIntensity={isActive ? 1.0 : 0.1}
                    />
                  </mesh>
                  {/* 크롬 링 */}
                  <mesh position={[x, ceilingY - 0.006, z]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.035, 0.045, 16]} />
                    <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
                  </mesh>
                  {/* 워크스루: 모든 다운라이트를 SpotLight로 */}
                  <DropCeilingLight x={x} z={z} ceilingY={ceilingY} active={isActive}
                    color={
                      // 화장대 앞 다운라이트 (안방 좌측 상단) → 흰색
                      (Math.abs(x - (mbLeft + 1.013)) < 0.05 && z < 0.8) ? '#fff5e6' : '#ffe0b0'
                    }
                  />
                </group>
              )
            })}
            {/* 워크스루: 조명 없는 공간에서만 외부 라이트 */}
            {playerPos && !hasLightsInRoom && (
              <pointLight
                position={[playerPos[0], WALL_HEIGHT - 0.1, playerPos[1]]}
                intensity={0.5}
                distance={4}
                decay={2}
                color="#ffffff"
              />
            )}
          </>
        )
      })()}

      {/* 안방/거실 하단 천장 단내림 (800mm 깊이, 100mm 내림) */}
      {/* 안방/거실 하단 천장 단내림 (조감도에서 수직면 숨김) */}
      {showCeiling && (
        <>
          {/* 간접조명 — 단내림 앞쪽 코브 LED */}
          {/* 안방 간접조명 — playerPos 연동 */}
          {(() => {
            const mbActive = allLightsOn || (playerPos && playerPos[0] >= mbLeft && playerPos[0] <= -WALL_THICKNESS && playerPos[1] >= 0 && playerPos[1] <= LR_D)
            const lrActive = allLightsOn || (playerPos && playerPos[0] >= 0 && playerPos[0] <= LR_W && playerPos[1] >= 0 && playerPos[1] <= LR_D)
            return (
              <>
                {/* 안방 LED 스트립 */}
                <mesh position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.008, LR_D - 0.8 - 0.01]}>
                  <boxGeometry args={[MB_W, 0.015, 0.008]} />
                  <meshStandardMaterial color={mbActive ? '#fff' : '#444'} emissive={mbActive ? '#ffe0b0' : '#111'} emissiveIntensity={mbActive ? 3.0 : 0.1} />
                </mesh>
                {mbActive && (
                  <rectAreaLight
                    position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.005, LR_D - 0.8 - 0.02]}
                    width={MB_W}
                    height={0.03}
                    intensity={8}
                    color="#ffe0b0"
                    rotation={[-Math.PI / 2, 0, 0]}
                  />
                )}
                {/* 거실 LED 스트립 */}
                <mesh position={[LR_W / 2, WALL_HEIGHT - 0.008, LR_D - 0.8 - 0.01]}>
                  <boxGeometry args={[LR_W, 0.015, 0.008]} />
                  <meshStandardMaterial color={lrActive ? '#fff' : '#444'} emissive={lrActive ? '#ffe0b0' : '#111'} emissiveIntensity={lrActive ? 3.0 : 0.1} />
                </mesh>
                {lrActive && (
                  <rectAreaLight
                    position={[LR_W / 2, WALL_HEIGHT - 0.005, LR_D - 0.8 - 0.02]}
                    width={LR_W}
                    height={0.03}
                    intensity={16}
                    color="#ffe0b0"
                    rotation={[-Math.PI / 2, 0, 0]}
                  />
                )}
              </>
            )
          })()}

          {/* 안방 단내림 천장 (150mm 두께 박스) */}
          <mesh position={[mbLeft + MB_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]}>
            <boxGeometry args={[MB_W + WALL_THICKNESS, 0.15, 0.8]} />
            <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
          </mesh>
          {/* 거실 단내림 천장 (150mm 두께 박스) */}
          <mesh position={[LR_W / 2, WALL_HEIGHT - 0.075, LR_D - 0.4]}>
            <boxGeometry args={[LR_W + WALL_THICKNESS, 0.15, 0.8]} />
            <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
          </mesh>

          {/* === 아기방 단내림 (상단벽쪽, 거울상) === */}
          <mesh position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.075, babyTop + 0.4]}>
            <boxGeometry args={[BABY_INNER_W + 0.2, 0.15, 0.8]} />
            <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
          </mesh>
          {/* 아기방 간접조명 */}
          {(() => {
            const babyActive = allLightsOn || (playerPos && playerPos[0] >= babyLeft && playerPos[0] <= babyRight && playerPos[1] >= babyTop && playerPos[1] <= babyBottomZ)
            return (
              <>
                <mesh position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.008, babyTop + 0.8 + 0.01]}>
                  <boxGeometry args={[BABY_INNER_W + 0.2, 0.015, 0.008]} />
                  <meshStandardMaterial color={babyActive ? '#fff' : '#444'} emissive={babyActive ? '#ffe0b0' : '#111'} emissiveIntensity={babyActive ? 3.0 : 0.1} />
                </mesh>
                {babyActive && (
                  <rectAreaLight
                    position={[(babyLeft + babyRight + 0.2) / 2, WALL_HEIGHT - 0.005, babyTop + 0.8 + 0.02]}
                    width={BABY_INNER_W + 0.2}
                    height={0.03}
                    intensity={8}
                    color="#ffe0b0"
                    rotation={[-Math.PI / 2, 0, 0]}
                  />
                )}
              </>
            )
          })()}

          {/* === 작업실 단내림 (상단벽쪽, 거울상) === */}
          {(() => {
            const workLeftX = babyRight + 2.555 + 0.1 + 0.1
            const workRightX = LR_W
            const workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1  // screen top (most negative)
            const workW = workRightX - workLeftX
            const workCenterX = (workLeftX + workRightX) / 2
            const workActive = allLightsOn || (playerPos && playerPos[0] >= workLeftX - 0.2 && playerPos[0] <= workRightX + 0.1 && playerPos[1] <= -0.1 - 1.591 - 0.1 && playerPos[1] >= workTopZ - 0.2)
            return (
              <>
                <mesh position={[workCenterX, WALL_HEIGHT - 0.075, workTopZ + 0.4]}>
                  <boxGeometry args={[workW, 0.15, 0.8]} />
                  <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
                </mesh>
                <mesh position={[workCenterX, WALL_HEIGHT - 0.008, workTopZ + 0.8 + 0.01]}>
                  <boxGeometry args={[workW, 0.015, 0.008]} />
                  <meshStandardMaterial color={workActive ? '#fff' : '#444'} emissive={workActive ? '#ffe0b0' : '#111'} emissiveIntensity={workActive ? 3.0 : 0.1} />
                </mesh>
                {workActive && (
                  <rectAreaLight
                    position={[workCenterX, WALL_HEIGHT - 0.005, workTopZ + 0.8 + 0.02]}
                    width={workW}
                    height={0.03}
                    intensity={8}
                    color="#ffe0b0"
                    rotation={[-Math.PI / 2, 0, 0]}
                  />
                )}
              </>
            )
          })()}
        </>
      )}

      {/* 주방 ㄱ자 조명 — playerPos 연동 */}
      {(() => {
        const wall2300Z = babyTop - T2 - 1.119 - 0.770
        const kitchenTopInner = wall2300Z + T2
        const hZ = kitchenTopInner + 0.7
        const kitchenLeft = babyRight + 0.2 + T2
        const hXstart = kitchenLeft + 0.35
        const hXend = hXstart + 1.25
        const vZend = hZ + 0.9
        const w = 0.08
        const lightY = WALL_HEIGHT - 0.008

        // 주방 bounds
        const kitchenRight = kitchenLeft + 2.5 - WALL_THICKNESS
        const kitchenBottom = -T2 - 1.591 + T2
        const kitchenActive = allLightsOn || (playerPos && (
          playerPos[0] >= kitchenLeft - 0.1 && playerPos[0] <= kitchenRight + 0.1 &&
          playerPos[1] >= kitchenTopInner - 0.1 && playerPos[1] <= kitchenBottom + 0.1
        ))

        return (
          <group>
            {/* 수평부 */}
            <mesh position={[(hXstart + hXend) / 2, lightY, hZ]}>
              <boxGeometry args={[1.25, 0.015, w]} />
              <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 3.0 : 0.1} />
            </mesh>
            {kitchenActive && (
              <>
                <rectAreaLight
                  position={[(hXstart + hXend) / 2, lightY - 0.005, hZ]}
                  width={1.25}
                  height={w}
                  intensity={50}
                  color="#ffe0b0"
                  rotation={[Math.PI / 2, 0, 0]}
                />
                {/* 보조 포인트라이트 — 수평부 중앙 */}
                <pointLight position={[(hXstart + hXend) / 2, WALL_HEIGHT - 0.3, hZ + 0.3]} intensity={1.5} distance={5} decay={1.5} color="#fff5e6" />
              </>
            )}
            {/* 수직부 */}
            <mesh position={[hXend, lightY, (hZ + vZend) / 2]}>
              <boxGeometry args={[w, 0.015, 0.9]} />
              <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 3.0 : 0.1} />
            </mesh>
            {kitchenActive && (
              <>
                <rectAreaLight
                  position={[hXend, lightY - 0.005, (hZ + vZend) / 2]}
                  width={w}
                  height={0.9}
                  intensity={50}
                  color="#ffe0b0"
                  rotation={[Math.PI / 2, 0, 0]}
                />
                {/* 보조 포인트라이트 — 수직부 중앙 */}
                <pointLight position={[hXend - 0.3, WALL_HEIGHT - 0.3, (hZ + vZend) / 2]} intensity={1.5} distance={5} decay={1.5} color="#fff5e6" />
              </>
            )}

            {/* === 좌측 확장 (hXstart에서 복도 방향, 아일랜드장 커버) === */}
            {(() => {
              const tableZ2 = babyBottomZ - 0.22 - 0.9  // 아일랜드장(아기방 문 상단) Z
              const extLeftLen = Math.abs(tableZ2 - hZ)  // hZ ~ 식탁까지
              const extLeftCenterZ = (hZ + tableZ2) / 2
              return (
                <>
                  <mesh position={[hXstart, lightY, extLeftCenterZ]}>
                    <boxGeometry args={[w, 0.015, extLeftLen]} />
                    <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 3.0 : 0.1} />
                  </mesh>
                  {kitchenActive && (
                    <>
                      <rectAreaLight
                        position={[hXstart, lightY - 0.005, extLeftCenterZ]}
                        width={w}
                        height={extLeftLen}
                        intensity={50}
                        color="#fff5e6"
                        rotation={[Math.PI / 2, 0, 0]}
                      />
                      <pointLight position={[hXstart, WALL_HEIGHT - 0.3, extLeftCenterZ]} intensity={1.0} distance={5} decay={1.5} color="#fff5e6" />
                    </>
                  )}
                </>
              )
            })()}
          </group>
        )
      })()}

      {/* === 화장실 보조 포인트라이트 (진입 시 밝게) === */}
      {(() => {
        if (!playerPos) return null
        const mbBathCX = (mbLeft + mbLeft + MB_W - WALL_THICKNESS - 0.2 + 0.1 - T2) / 2  // approximate
        const mbBathActive = playerPos[0] >= mbLeft && playerPos[0] <= mbLeft + 1.5 &&
          playerPos[1] >= -WALL_THICKNESS - 1.607 && playerPos[1] <= -WALL_THICKNESS
        const bath2CX = (mbLeft + 0.551 + 0.9 + 0.1 + T2 + mbLeft + 0.551 + 0.9 + 0.1 + T2 + 1.413) / 2
        const bath2Active = playerPos[0] >= mbLeft + 0.551 + 0.9 + 0.2 && playerPos[0] <= mbLeft + 0.551 + 0.9 + 0.2 + 1.413 &&
          playerPos[1] >= -WALL_THICKNESS - 2.173 && playerPos[1] <= -WALL_THICKNESS
        return (
          <>
            {mbBathActive && (
              <pointLight position={[(mbLeft + mbLeft + MB_W * 0.3) / 2, WALL_HEIGHT - 0.3, (-WALL_THICKNESS + (-WALL_THICKNESS - 1.607)) / 2]} intensity={1.5} distance={3} decay={1.5} color="#ffffff" />
            )}
            {bath2Active && (
              <pointLight position={[bath2CX, WALL_HEIGHT - 0.3, (-WALL_THICKNESS + (-WALL_THICKNESS - 2.173)) / 2]} intensity={1.5} distance={3} decay={1.5} color="#ffffff" />
            )}
          </>
        )
      })()}

      {/* === 베란다/세탁실 스폿라이트 (항상 켜짐) === */}
      {/* 메인베란다 좌측 (왼쪽에서 2110mm) */}
      <DropCeilingLight x={mbLeft + 2.110} z={LR_D + WALL_THICKNESS + verandaInnerD / 2} ceilingY={WALL_HEIGHT} active={true} />
      {/* 메인베란다 우측 (오른쪽에서 2000mm) */}
      <DropCeilingLight x={LR_W - 2.000} z={LR_D + WALL_THICKNESS + verandaInnerD / 2} ceilingY={WALL_HEIGHT} active={true} />
      {/* 세탁실 가운데 */}
      <DropCeilingLight x={(stair2X + T2 + rightWallX - T2) / 2} z={(Math.min(stair3Z + T2, laundryBotZ - T2) + Math.max(stair3Z + T2, laundryBotZ - T2)) / 2} ceilingY={WALL_HEIGHT} active={true} />
      {/* 작업실베란다 가운데 */}
      <DropCeilingLight x={(babyRight + 0.2 + 2.500 + T2 + babyRight + 0.2 + 2.500 + 2.673 - T2) / 2} z={(right1Z - 0.770 + 0.795 + T2 + right1Z - 0.770 + 0.795 + 1.418 - T2) / 2} ceilingY={WALL_HEIGHT} active={true} />

      {/* === 주방 하부장/상부장 === */}
      {(() => {
        const wall2300Z = babyTop - T2 - 1.119 - 0.770
        const cabinetZ = wall2300Z + T2 + 0.3 // 하부장 중심 (깊이 600mm)
        const upperZ = wall2300Z + T2 + 0.175 // 상부장 중심 (깊이 350mm)
        const babyRightWallX = babyRight + T2 // = mbLeft + 3.064 + T2
        const kitLeft = babyRightWallX + T2 // 570벽 내측면
        const kitRight = babyRightWallX + 2.500 - T2
        const totalW = kitRight - kitLeft
        const winStartX = babyRightWallX + T2 + 1.000
        const winEndX = winStartX + 0.900

        // 인덕션 폭 600mm (좌측벽에서 100mm 떨어져서 시작)
        const inductionW = 0.6
        const inductionX = kitLeft + 0.1 + inductionW / 2  // 인덕션 위치만 100mm 우측

        // 하부장: 전체 폭 (kitLeft부터 끝까지 연속)
        const lowerCabW = totalW
        const lowerCabX = kitLeft + totalW / 2

        // 상부장 구간: 인덕션 위 (후드+상부장) + 창문 좌측 + 창문 우측
        const upperLeftW = winStartX - kitLeft // 인덕션~창문 시작
        const upperRightW = kitRight - winEndX // 창문 끝~우측 끝

        // 하부장 문 텍스처
        const doorT = closetDoorTex.clone()
        doorT.wrapS = THREE.RepeatWrapping
        doorT.wrapT = THREE.RepeatWrapping
        doorT.repeat.set(1, 1)
        doorT.colorSpace = THREE.SRGBColorSpace

        return (
          <group>
            {/* 인덕션 (검정 상판 + 버너 표시, 카운터탑 위) */}
            <mesh position={[inductionX, 0.885, cabinetZ]}>
              <boxGeometry args={[inductionW - 0.02, 0.01, 0.5]} />
              <meshStandardMaterial color="#111" roughness={0.1} metalness={0.3} />
            </mesh>
            {/* 버너 2구 */}
            <mesh position={[inductionX - 0.12, 0.892, cabinetZ]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.06, 0.08, 24]} />
              <meshStandardMaterial color="#333" roughness={0.2} />
            </mesh>
            <mesh position={[inductionX + 0.12, 0.892, cabinetZ]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.08, 0.1, 24]} />
              <meshStandardMaterial color="#333" roughness={0.2} />
            </mesh>
            {/* 하부장 전체 (kitLeft~kitRight) */}
            <mesh position={[lowerCabX, 0.41, cabinetZ]}>
              <boxGeometry args={[lowerCabW, 0.82, 0.6]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {/* 하부장 문들 */}
            {Array.from({ length: Math.round(lowerCabW / 0.5) }).map((_, di) => {
              const dw = lowerCabW / Math.round(lowerCabW / 0.5)
              const dx = kitLeft + dw / 2 + di * dw
              const dt = closetDoorTex.clone()
              dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
              dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
              return (
                <group key={`lc-${di}`}>
                  <mesh position={[dx, 0.41, cabinetZ + 0.301]}>
                    <planeGeometry args={[dw - 0.005, 0.8]} />
                    <meshStandardMaterial map={dt} roughness={0.45} />
                  </mesh>
                  {/* 손잡이 */}
                  <mesh position={[dx, 0.41, cabinetZ + 0.31]}>
                    <boxGeometry args={[0.01, 0.08, 0.015]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}
            {/* 카운터탑 (전체) */}
            <mesh position={[(kitLeft + kitRight) / 2, 0.86, cabinetZ]}>
              <boxGeometry args={[totalW, 0.04, 0.62]} />
              <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} />
            </mesh>

            {/* 상부장 — 인덕션~창문 시작 */}
            {upperLeftW > 0.1 && (
              <>
                <mesh position={[kitLeft + upperLeftW / 2, 1.80, upperZ]}>
                  <boxGeometry args={[upperLeftW, 0.7, 0.35]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
                {/* 상부장 문들 */}
                {Array.from({ length: Math.max(1, Math.round(upperLeftW / 0.5)) }).map((_, di) => {
                  const dw = upperLeftW / Math.max(1, Math.round(upperLeftW / 0.5))
                  const dx = kitLeft + dw / 2 + di * dw
                  const dt = closetDoorTex.clone()
                  dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
                  dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
                  return (
                    <mesh key={`uc-l-${di}`} position={[dx, 1.80, upperZ + 0.176]}>
                      <planeGeometry args={[dw - 0.005, 0.68]} />
                      <meshStandardMaterial map={dt} roughness={0.45} />
                    </mesh>
                  )
                })}
              </>
            )}

            {/* 상부장 — 창문 우측 → 우측벽 따라, 수전 상부장과 맞닿음 */}
            {upperRightW > 0.1 && (() => {
              const urStartZ = wall2300Z + T2  // 2300벽 내측부터
              const urEndZ = cabinetZ + 0.3    // 메인 캐비닛 끝 (수전 상부장 시작점)
              const urLen = Math.abs(urEndZ - urStartZ)
              return (
              <>
                <mesh position={[kitRight - 0.175, 1.80, (urStartZ + urEndZ) / 2]}>
                  <boxGeometry args={[0.35, 0.7, urLen]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
                {Array.from({ length: Math.max(1, Math.round(urLen / 0.5)) }).map((_, di) => {
                  const dw = urLen / Math.max(1, Math.round(urLen / 0.5))
                  const dz = urStartZ + dw / 2 + di * dw
                  const dt = closetDoorTex.clone()
                  dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
                  dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
                  return (
                    <mesh key={`uc-r-${di}`} position={[kitRight - 0.175 - 0.176, 1.80, dz]} rotation={[0, -Math.PI / 2, 0]}>
                      <planeGeometry args={[dw - 0.005, 0.68]} />
                      <meshStandardMaterial map={dt} roughness={0.45} />
                    </mesh>
                  )
                })}
              </>
              )})()}

            {/* === ㄱ자 확장: 우측벽 따라 남쪽으로 (수전+상부장) === */}
            {(() => {
              const extWallInner = kitRight  // 우측벽 내측
              const extCabCenterX = extWallInner - 0.3  // 하부장 중심X (600mm 깊이)
              const extStartZ = cabinetZ + 0.3  // 메인 캐비닛 끝
              const extEndZ = right1Z - 0.770 + 0.795 + 1.418  // 작업실베란다 하단까지
              const extLen = extEndZ - extStartZ
              const extCenterZ = (extStartZ + extEndZ) / 2
              const extUpperCenterX = extWallInner - 0.175

              // 싱크 Z 범위 (하부장 분할용)
              const sinkZpos = extEndZ - 0.1 - 0.4
              const sinkHalfD = 0.4  // 800mm / 2
              const dishW = 0.6  // 식기세척기 600mm
              const dishZend = sinkZpos - sinkHalfD  // 싱크 바로 왼쪽
              const dishZstart = dishZend - dishW
              const cabBeforeLen = Math.abs(dishZstart - extStartZ)  // 식기세척기 앞 캐비닛
              const cabAfterLen = Math.abs(extEndZ - (sinkZpos + sinkHalfD))

              return (
                <>
                  {/* 하부장 — 식기세척기 앞 */}
                  {cabBeforeLen > 0.01 && <mesh position={[extCabCenterX, 0.41, (extStartZ + dishZstart) / 2]}>
                    <boxGeometry args={[0.6, 0.82, cabBeforeLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>}
                  {/* 식기세척기 (싱크 바로 왼쪽 600mm) */}
                  <mesh position={[extCabCenterX, 0.41, (dishZstart + dishZend) / 2]}>
                    <boxGeometry args={[0.6, 0.82, dishW]} />
                    <meshStandardMaterial color="#e0e0e0" metalness={0.4} roughness={0.3} />
                  </mesh>
                  {/* 식기세척기 전면 패널 */}
                  <mesh position={[extCabCenterX - 0.301, 0.41, (dishZstart + dishZend) / 2]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[dishW - 0.01, 0.8]} />
                    <meshStandardMaterial color="#d5d5d5" metalness={0.5} roughness={0.25} />
                  </mesh>
                  {/* 식기세척기 손잡이 (가로 바) */}
                  <mesh position={[extCabCenterX - 0.31, 0.65, (dishZstart + dishZend) / 2]}>
                    <boxGeometry args={[0.015, 0.02, 0.4]} />
                    <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.15} />
                  </mesh>
                  {/* 식기세척기 로고 */}
                  <mesh position={[extCabCenterX - 0.31, 0.25, (dishZstart + dishZend) / 2]}>
                    <boxGeometry args={[0.005, 0.02, 0.06]} />
                    <meshStandardMaterial color="#888" metalness={0.6} roughness={0.2} />
                  </mesh>
                  {/* 하부장 — 싱크 뒤 */}
                  {cabAfterLen > 0.01 && <mesh position={[extCabCenterX, 0.41, (sinkZpos + sinkHalfD + extEndZ) / 2]}>
                    <boxGeometry args={[0.6, 0.82, cabAfterLen]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>}
                  {/* 하부장 문 — 식기세척기 앞 섹션만 */}
                  {cabBeforeLen > 0.2 && Array.from({ length: Math.max(1, Math.round(cabBeforeLen / 0.5)) }).map((_, di) => {
                    const cnt = Math.max(1, Math.round(cabBeforeLen / 0.5))
                    const dw = cabBeforeLen / cnt
                    const dz = extStartZ + dw / 2 + di * dw
                    const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
                    return (<group key={`ext-lc-${di}`}>
                      <mesh position={[extCabCenterX - 0.301, 0.41, dz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[dw - 0.005, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                      <mesh position={[extCabCenterX - 0.31, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
                    </group>)
                  })}
                  {/* 하부장 문 — 싱크 영역 */}
                  {(() => {
                    const sinkDoorCount = 2
                    const sinkDoorW = (sinkHalfD * 2) / sinkDoorCount
                    return Array.from({ length: sinkDoorCount }).map((_, di) => {
                      const dz = (sinkZpos - sinkHalfD) + sinkDoorW / 2 + di * sinkDoorW
                      const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
                      return (<group key={`ext-lc-sink-${di}`}>
                        <mesh position={[extCabCenterX - 0.301, 0.41, dz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[sinkDoorW, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                        <mesh position={[extCabCenterX - 0.31, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
                      </group>)
                    })
                  })()}
                  {/* 하부장 문 — 싱크 뒤 섹션 */}
                  {cabAfterLen > 0.2 && Array.from({ length: Math.max(1, Math.round(cabAfterLen / 0.5)) }).map((_, di) => {
                    const cnt = Math.max(1, Math.round(cabAfterLen / 0.5))
                    const dw = cabAfterLen / cnt
                    const dz = (sinkZpos + sinkHalfD) + dw / 2 + di * dw
                    const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
                    return (<group key={`ext-lc-after-${di}`}>
                      <mesh position={[extCabCenterX - 0.301, 0.41, dz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[dw - 0.005, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                      <mesh position={[extCabCenterX - 0.31, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
                    </group>)
                  })}
                  {/* 카운터탑 (싱크 구멍 분할) + 수전 싱크 */}
                  {(() => {
                    const sinkZ = extEndZ - 0.1 - 0.4
                    const sinkW = 0.5
                    const sinkD = 0.8
                    const rim = 0.015
                    const depth = 0.15
                    const topY = 0.86
                    const ctW = 0.62
                    const ctH = 0.04
                    // 싱크 Z 범위
                    const sinkZstart = sinkZ - sinkD / 2  // 더 negative Z
                    const sinkZend = sinkZ + sinkD / 2    // 더 positive Z
                    // 카운터탑 before (더 negative Z, 싱크 위쪽)
                    const beforeLen = Math.abs(sinkZstart - extStartZ)
                    const beforeCenterZ = (extStartZ + sinkZstart) / 2
                    // 카운터탑 after (더 positive Z, 싱크 아래쪽)
                    const afterLen = Math.abs(extEndZ - sinkZend)
                    const afterCenterZ = (sinkZend + extEndZ) / 2
                    // 좌우 strip (싱크 양옆)
                    const stripW = (ctW - sinkW) / 2
                    return (
                      <>
                        {/* 카운터탑 — 싱크 위쪽 */}
                        {beforeLen > 0.01 && <mesh position={[extCabCenterX, topY, beforeCenterZ]}><boxGeometry args={[ctW, ctH, beforeLen]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>}
                        {/* 카운터탑 — 싱크 아래쪽 */}
                        {afterLen > 0.01 && <mesh position={[extCabCenterX, topY, afterCenterZ]}><boxGeometry args={[ctW, ctH, afterLen]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>}
                        {/* 카운터탑 — 싱크 좌측 strip */}
                        <mesh position={[extCabCenterX - sinkW / 2 - stripW / 2, topY, sinkZ]}><boxGeometry args={[stripW, ctH, sinkD]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
                        {/* 카운터탑 — 싱크 우측 strip */}
                        <mesh position={[extCabCenterX + sinkW / 2 + stripW / 2, topY, sinkZ]}><boxGeometry args={[stripW, ctH, sinkD]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
                        {/* 테두리 — 4개 바 */}
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
                        {/* 내벽 4면 (카운터탑에서 아래로) */}
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
                        {/* 바닥 */}
                        <mesh position={[extCabCenterX, topY - depth, sinkZ]}>
                          <boxGeometry args={[sinkW - rim * 2, 0.003, sinkD - rim * 2]} />
                          <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.2} />
                        </mesh>
                        {/* 배수구 */}
                        <mesh position={[extCabCenterX, topY - depth + 0.005, sinkZ]} rotation={[-Math.PI / 2, 0, 0]}>
                          <circleGeometry args={[0.02, 16]} />
                          <meshStandardMaterial color="#555" metalness={0.9} roughness={0.1} />
                        </mesh>
                      </>
                    )
                  })()}
                  {/* 수도꼭지 — 기둥 (싱크 뒤쪽 카운터탑에서 올라옴) */}
                  {(() => {
                    const sinkZ2 = extEndZ - 0.1 - 0.4
                    const faucetX = extCabCenterX  // 싱크 X 가운데
                    const faucetZ = sinkZ2  // 싱크 Z 가운데
                    return (
                      <>
                        {/* 받침 (벽쪽 카운터탑, 싱크 뒤 가운데) */}
                        <mesh position={[extWallInner - 0.01, 0.87, faucetZ]}>
                          <cylinderGeometry args={[0.02, 0.025, 0.02, 12]} />
                          <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.08} />
                        </mesh>
                        {/* 기둥 */}
                        <mesh position={[extWallInner - 0.01, 0.95, faucetZ]}>
                          <cylinderGeometry args={[0.01, 0.012, 0.16, 8]} />
                          <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.08} />
                        </mesh>
                        {/* 아암 (싱크 위로 -X 방향) */}
                        <mesh position={[extWallInner - 0.01 - 0.12, 1.02, faucetZ]}>
                          <boxGeometry args={[0.24, 0.015, 0.015]} />
                          <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
                        </mesh>
                        {/* 토출구 (아래로) */}
                        <mesh position={[extWallInner - 0.01 - 0.23, 1.0, faucetZ]}>
                          <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
                          <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
                        </mesh>
                      </>
                    )
                  })()}
                  {/* 상부장 */}
                  <mesh position={[extUpperCenterX, 1.80, extCenterZ]}><boxGeometry args={[0.35, 0.7, extLen]} /><meshStandardMaterial map={walnutBodyTex} roughness={0.45} /></mesh>
                  {[0.25, 0.75].map((t, di) => {
                    const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
                    return (<mesh key={`ext-uc-${di}`} position={[extUpperCenterX - 0.176, 1.80, extStartZ + extLen * t]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[extLen / 2 - 0.005, 0.68]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>)
                  })}
                  {/* === Cuckoo 정수기 (260×527×506mm) — ㄱ자 코너 안쪽 깊숙이, 동·북쪽 벽에 모두 밀착 === */}
                  {(() => {
                    const purifierD = 0.506   // local Z 깊이 → 회전 후 world X
                    const purifierW = 0.260   // local X 폭 → 회전 후 world Z
                    const pX = extWallInner - purifierD / 2          // 동쪽 벽에 등 부착
                    const pY = 0.88
                    const pZ = (cabinetZ - 0.3) + purifierW / 2      // 북쪽 벽 (메인 카운터 뒤) 밀착
                    return <CuckooWaterPurifier position={[pX, pY, pZ]} rotation={-Math.PI / 2} />
                  })()}
                </>
              )
            })()}

            {/* === 4도어 냉장고 (싱크대 옆, 915x920x1800mm) === */}
            {(() => {
              const fridgeW = 0.915
              const fridgeD = 0.920
              const fridgeH = 1.800
              const extEndZ2 = right1Z - 0.770 + 0.795 + 1.418
              const fridgeZ = extEndZ2 + fridgeW / 2 + 0.03  // 하부장에서 30mm
              const fridgeX = kitRight - fridgeD / 2
              return (
                <group>
                  {/* 본체 — 빌트인 호두 마감 (도어 갭 사이로 보이는 면) */}
                  <mesh position={[fridgeX, fridgeH / 2, fridgeZ]}>
                    <boxGeometry args={[fridgeD, fridgeH, fridgeW]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 상단 좌문 (베이지) */}
                  <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.75, fridgeZ - fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
                    <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                  </mesh>
                  {/* 상단 우문 (베이지) */}
                  <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.75, fridgeZ + fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
                    <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                  </mesh>
                  {/* 하단 좌문 (베이지) */}
                  <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.25, fridgeZ - fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
                    <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                  </mesh>
                  {/* 하단 우문 (베이지) */}
                  <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.25, fridgeZ + fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
                    <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                  </mesh>
                  {/* 분할선 (상하 구분) */}
                  <mesh position={[fridgeX - fridgeD / 2 - 0.002, fridgeH * 0.5, fridgeZ]}>
                    <boxGeometry args={[0.005, 0.01, fridgeW]} />
                    <meshStandardMaterial color="#222" roughness={0.5} />
                  </mesh>

                  {/* === 2번째 냉장고 (810x790x1800, 프렌치도어+서랍2단) — 남쪽으로 50mm 추가 이동 === */}
                  {(() => {
                    const f2W = 0.810
                    const f2D = 0.790
                    const f2H = 1.800
                    const f2Z = fridgeZ + fridgeW / 2 + f2W / 2 + 0.03 + 0.050  // 냉장고에서 80mm
                    const frontFace = fridgeX - fridgeD / 2  // 기존 냉장고 전면
                    const f2X = frontFace + f2D / 2  // 전면 정렬
                    const topH = f2H * 0.55   // 상단 프렌치도어
                    const midH = f2H * 0.22   // 중단 서랍
                    const botH = f2H * 0.22   // 하단 서랍
                    return (
                      <group>
                        {/* 본체 — 빌트인 호두 마감 */}
                        <mesh position={[f2X, f2H / 2, f2Z]}>
                          <boxGeometry args={[f2D, f2H, f2W]} />
                          <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                        </mesh>
                        {/* 상단 좌문 (베이지) */}
                        <mesh position={[frontFace - 0.001, f2H - topH / 2 - 0.01, f2Z - f2W / 4]} rotation={[0, -Math.PI / 2, 0]}>
                          <planeGeometry args={[f2W / 2 - 0.005, topH - 0.02]} />
                          <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                        </mesh>
                        {/* 상단 우문 (베이지) */}
                        <mesh position={[frontFace - 0.001, f2H - topH / 2 - 0.01, f2Z + f2W / 4]} rotation={[0, -Math.PI / 2, 0]}>
                          <planeGeometry args={[f2W / 2 - 0.005, topH - 0.02]} />
                          <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                        </mesh>
                        {/* 중단 서랍 (베이지) */}
                        <mesh position={[frontFace - 0.001, f2H - topH - midH / 2 - 0.005, f2Z]} rotation={[0, -Math.PI / 2, 0]}>
                          <planeGeometry args={[f2W - 0.01, midH - 0.015]} />
                          <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                        </mesh>
                        {/* 하단 서랍 (베이지) */}
                        <mesh position={[frontFace - 0.001, botH / 2 + 0.01, f2Z]} rotation={[0, -Math.PI / 2, 0]}>
                          <planeGeometry args={[f2W - 0.01, botH - 0.015]} />
                          <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
                        </mesh>
                        {/* 분할선 — 상단/중단 */}
                        <mesh position={[frontFace - 0.002, f2H - topH, f2Z]}>
                          <boxGeometry args={[0.005, 0.01, f2W]} />
                          <meshStandardMaterial color="#222" roughness={0.5} />
                        </mesh>
                        {/* 분할선 — 중단/하단 */}
                        <mesh position={[frontFace - 0.002, f2H - topH - midH, f2Z]}>
                          <boxGeometry args={[0.005, 0.01, f2W]} />
                          <meshStandardMaterial color="#222" roughness={0.5} />
                        </mesh>
                        {/* 상단 좌우 분할선 */}
                        <mesh position={[frontFace - 0.002, f2H - topH / 2, f2Z]}>
                          <boxGeometry args={[0.005, topH - 0.02, 0.008]} />
                          <meshStandardMaterial color="#222" roughness={0.5} />
                        </mesh>
                      </group>
                    )
                  })()}

                  {/* === 냉장고 & 김치냉장고 빌트인 상부장 + 측면 벽 === */}
                  {(() => {
                    const f2W = 0.810
                    const f2D = 0.790
                    const f2Z = fridgeZ + fridgeW / 2 + f2W / 2 + 0.03 + 0.050
                    const sideT = 0.030                                       // 30mm 측면 벽 두께

                    // 냉장고 블록 Z 범위
                    const groupZStart = fridgeZ - fridgeW / 2                 // 북쪽 끝
                    const groupZEnd = f2Z + f2W / 2                           // 남쪽 끝
                    const groupLen = groupZEnd - groupZStart

                    // 장 외곽 Z (측면 벽 포함)
                    const outerZStart = groupZStart - sideT
                    const outerZEnd = groupZEnd + sideT
                    const outerLen = outerZEnd - outerZStart
                    const outerCenterZ = (outerZStart + outerZEnd) / 2

                    const cabDepth = fridgeD                                  // 0.920
                    const cabX = kitRight - cabDepth / 2

                    // 상부 장 — 위아래 30mm씩 확장
                    const cabBottomY = 1.800 - 0.030                          // 1.770 (30mm 아래로)
                    const cabTopY = WALL_HEIGHT + 0.030                       // 2.430 (30mm 위로)
                    const cabH = cabTopY - cabBottomY
                    const cabCenterY = (cabBottomY + cabTopY) / 2

                    const doorCount = Math.max(2, Math.round(groupLen / 0.6))
                    const doorLen = groupLen / doorCount
                    const doorGap = 0.003

                    return (
                      <group>
                        {/* 상부장 본체 — 측면 벽 포함한 외곽 Z 전체 */}
                        <mesh position={[cabX, cabCenterY, outerCenterZ]}>
                          <boxGeometry args={[cabDepth, cabH, outerLen]} />
                          <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                        </mesh>

                        {/* 문짝들 (전면, -X 면) — 냉장고 구간에만 */}
                        {Array.from({ length: doorCount }).map((_, di) => {
                          const dz = groupZStart + doorLen * (di + 0.5)
                          const dt = closetDoorTex.clone()
                          dt.wrapS = THREE.RepeatWrapping
                          dt.wrapT = THREE.RepeatWrapping
                          dt.repeat.set(1, 1)
                          dt.colorSpace = THREE.SRGBColorSpace
                          return (
                            <mesh
                              key={`fridge-uc-${di}`}
                              position={[cabX - cabDepth / 2 - 0.002, cabCenterY, dz]}
                              rotation={[0, -Math.PI / 2, 0]}
                            >
                              <planeGeometry args={[doorLen - doorGap, cabH - 0.010]} />
                              <meshStandardMaterial map={dt} roughness={0.45} />
                            </mesh>
                          )
                        })}

                        {/* 북쪽 30mm 측면 벽 — 상부장 아래 ~ 바닥까지 */}
                        <mesh position={[cabX, cabBottomY / 2, outerZStart + sideT / 2]}>
                          <boxGeometry args={[cabDepth, cabBottomY, sideT]} />
                          <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                        </mesh>

                        {/* 남쪽 30mm 측면 벽 — 상부장 아래 ~ 바닥까지 */}
                        <mesh position={[cabX, cabBottomY / 2, outerZEnd - sideT / 2]}>
                          <boxGeometry args={[cabDepth, cabBottomY, sideT]} />
                          <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                        </mesh>

                        {/* 김치냉장고 후면 필러 (김치냉장고 뒤 ~ 벽 사이, 깊이 130mm) */}
                        {(() => {
                          const fillerD = fridgeD - f2D                     // 0.130
                          const fillerX = kitRight - fillerD / 2
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
                </group>
              )
            })()}

            {/* === 식탁 (1500x800, 대리석 상판, 나무 가운데 다리) === */}
            {(() => {
              const tableW = 1.5
              const tableD = 0.8
              const tableH = 0.75
              const tableX = 0.45
              const tableZ = (cabinetZ + 4.2 + (-T2 - 1.591 + T2)) / 2
              const kitchenLeft2 = babyRight + T2 + T2
              const kitchenRight2 = kitchenLeft2 + 2.5 - WALL_THICKNESS
              const kitchenTopInner2 = wall2300Z + T2
              const kitchenBottom2 = -T2 - 1.591 + T2
              const kitchenActive = allLightsOn || (playerPos && (
                playerPos[0] >= kitchenLeft2 - 0.1 && playerPos[0] <= kitchenRight2 + 0.1 &&
                playerPos[1] >= kitchenTopInner2 - 0.1 && playerPos[1] <= kitchenBottom2 + 0.1
              ))

              return (
                <group>
                  {/* 상판 (대리석) */}
                  <mesh position={[tableX, tableH, tableZ]}>
                    <boxGeometry args={[tableW, 0.03, tableD]} />
                    <meshStandardMaterial color="#f0ece4" roughness={0.15} metalness={0.05} />
                  </mesh>
                  {/* 상판 측면 (두께감) */}
                  <mesh position={[tableX, tableH - 0.015, tableZ]}>
                    <boxGeometry args={[tableW - 0.01, 0.03, tableD - 0.01]} />
                    <meshStandardMaterial color="#e8e2d8" roughness={0.2} metalness={0.05} />
                  </mesh>
                  {/* 가운데 기둥 (나무, 원기둥) */}
                  <mesh position={[tableX, tableH / 2 - 0.02, tableZ]}>
                    <cylinderGeometry args={[0.04, 0.04, tableH - 0.06, 12]} />
                    <meshStandardMaterial color="#6b4226" roughness={0.7} />
                  </mesh>
                  {/* 받침판 (나무, 넓은 원판) */}
                  <mesh position={[tableX, 0.015, tableZ]}>
                    <cylinderGeometry args={[0.3, 0.35, 0.03, 16]} />
                    <meshStandardMaterial color="#5a3620" roughness={0.7} />
                  </mesh>
                  {/* 기둥-상판 연결 (나무, 넓어지는 부분) */}
                  <mesh position={[tableX, tableH - 0.05, tableZ]}>
                    <cylinderGeometry args={[0.15, 0.04, 0.06, 12]} />
                    <meshStandardMaterial color="#6b4226" roughness={0.7} />
                  </mesh>

                  {/* === 펜던트 조명 (테이블 위) === */}
                  {(() => {
                    const pendantY = WALL_HEIGHT - 0.6  // 매달린 높이
                    const barLen = 1.2
                    return (
                      <>
                        {/* 천장 캐노피 */}
                        <mesh position={[tableX, WALL_HEIGHT - 0.01, tableZ]}>
                          <boxGeometry args={[0.2, 0.02, 0.04]} />
                          <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
                        </mesh>
                        {/* 좌측 와이어 */}
                        <mesh position={[tableX - barLen / 2 + 0.05, (WALL_HEIGHT + pendantY) / 2, tableZ]}>
                          <cylinderGeometry args={[0.001, 0.001, WALL_HEIGHT - pendantY - 0.02, 4]} />
                          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                        </mesh>
                        {/* 우측 와이어 */}
                        <mesh position={[tableX + barLen / 2 - 0.05, (WALL_HEIGHT + pendantY) / 2, tableZ]}>
                          <cylinderGeometry args={[0.001, 0.001, WALL_HEIGHT - pendantY - 0.02, 4]} />
                          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                        </mesh>
                        {/* 펜던트 바 본체 (검정 직사각 바) */}
                        <mesh position={[tableX, pendantY, tableZ]}>
                          <boxGeometry args={[barLen, 0.04, 0.05]} />
                          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.3} />
                        </mesh>
                        {/* LED 하단면 (발광) */}
                        <mesh position={[tableX, pendantY - 0.021, tableZ]}>
                          <boxGeometry args={[barLen - 0.02, 0.005, 0.04]} />
                          <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 4.0 : 0.1} />
                        </mesh>
                      </>
                    )
                  })()}
                  {/* RectAreaLight (주방등 연동) */}
                  {kitchenActive && (
                    <rectAreaLight
                      position={[tableX, WALL_HEIGHT - 0.52, tableZ]}
                      width={1.15}
                      height={0.025}
                      intensity={15}
                      color="#ffe0b0"
                      rotation={[Math.PI / 2, 0, 0]}
                    />
                  )}
                  {/* PointLight (주방등 연동) */}
                  {kitchenActive && (
                    <pointLight
                      position={[tableX, WALL_HEIGHT - 0.55, tableZ]}
                      intensity={0.8}
                      distance={2.5}
                      decay={2}
                      color="#ffe0b0"
                    />
                  )}
                </group>
              )
            })()}

            {/* === 아기방~세탁실 문 사이 하부장 (500mm 깊이, 상부장 없음) === */}
            {(() => {
              const leftWallInner = kitLeft  // babyRightWallX + T2
              const leftCabDepth = 0.5
              const leftCabX = leftWallInner + leftCabDepth / 2
              // 아기방 문 끝 ~ 세탁실 문 시작
              const babyDoorEnd = babyBottomZ - 0.22 - 0.9  // 아기방 문 상단
              const laundryDoorStart = babyTop - T2 - 0.1095  // 세탁실 문 하단
              const leftStartZ = babyDoorEnd  // 더 positive Z (아기방 쪽)
              const leftEndZ = laundryDoorStart  // 더 negative Z (세탁실 쪽)
              const leftLen = Math.abs(leftEndZ - leftStartZ)
              const leftCenterZ = (leftStartZ + leftEndZ) / 2
              const doorCount = Math.max(2, Math.round(leftLen / 0.5))
              return (
                <>
                  <mesh position={[leftCabX, 0.41, leftCenterZ]}><boxGeometry args={[leftCabDepth, 0.82, leftLen]} /><meshStandardMaterial map={walnutBodyTex} roughness={0.45} /></mesh>
                  {Array.from({ length: doorCount }).map((_, di) => {
                    const dw = leftLen / doorCount
                    const dz = leftEndZ + dw / 2 + di * dw  // negative Z부터 시작
                    const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
                    return (<group key={`left-lc-${di}`}>
                      <mesh position={[leftCabX + leftCabDepth / 2 + 0.001, 0.41, dz]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[dw - 0.005, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                      <mesh position={[leftCabX + leftCabDepth / 2 + 0.01, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
                    </group>)
                  })}
                  <mesh position={[leftCabX, 0.86, leftCenterZ]}><boxGeometry args={[leftCabDepth + 0.02, 0.04, leftLen + 0.02]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
                  {/* === 삼성 광파오븐 (523×330×515mm, 좌측 하부장 카운터 위 — 제일 왼쪽 padding 10mm, 동쪽 정면) === */}
                  {(() => {
                    const ovD = 0.515
                    const ovW = 0.523
                    const ovH = 0.330
                    const ovX = leftWallInner + ovD / 2  // back against west wall
                    const ovY = 0.88 + ovH / 2          // 카운터탑 위
                    const ovZ = leftStartZ - 0.01 - ovW / 2 // 남쪽(=facing west 기준 좌측) 끝에서 10mm padding
                    // 밥솥 — 오븐 북쪽 옆 (5mm 갭), 같은 카운터, 같은 정면 방향
                    const rcZ = (ovZ - ovW / 2) - 0.005 - 0.428 / 2
                    const rcX = leftWallInner + 0.428 / 2 // back against west wall
                    return (
                      <Suspense fallback={null}>
                        <LightWaveOven position={[ovX, ovY, ovZ]} rotation={Math.PI / 2} />
                        <RiceCooker position={[rcX, 0.88 + 0.0165, rcZ]} rotation={Math.PI / 2} />
                      </Suspense>
                    )
                  })()}
                </>
              )
            })()}

            {/* === 주방 좌측 하부장 위 월넛 선반 (벽 길이의 80%, 2줄) === */}
            {(() => {
              const wallInnerX = babyRightWallX + T2  // 주방 좌측 벽 내측면
              const cabBottomZ = babyBottomZ - 0.22 - 0.9
              const cabTopZ = babyTop - T2 - 0.1095
              const cabLen = Math.abs(cabTopZ - cabBottomZ)
              const cabCenterZ = (cabBottomZ + cabTopZ) / 2
              const shelfLen = cabLen * 0.8
              const shelfDepth = 0.25
              const shelfThick = 0.030
              const shelfX = wallInnerX + shelfDepth / 2
              const shelfY1 = 1.28
              const shelfY2 = 1.68
              const shelfTex = closetDoorTex.clone()
              shelfTex.wrapS = THREE.RepeatWrapping
              shelfTex.wrapT = THREE.RepeatWrapping
              shelfTex.repeat.set(1, 1)
              shelfTex.colorSpace = THREE.SRGBColorSpace
              return (
                <>
                  {[shelfY1, shelfY2].map((y, i) => (
                    <mesh key={`kit-shelf-${i}`} position={[shelfX, y, cabCenterZ]}>
                      <boxGeometry args={[shelfDepth, shelfThick, shelfLen]} />
                      <meshStandardMaterial map={shelfTex} roughness={0.55} metalness={0.05} />
                    </mesh>
                  ))}
                </>
              )
            })()}
          </group>
        )
      })()}

      {/* 현관 신발장 — 거실/현관 경계벽, 깊이 400mm, 4칸 (우측 1칸 전신거울), 하단 100mm 띄움 */}
      {(() => {
        const totalW = 1.470
        const depth = 0.400
        const floorClear = 0.100
        const cabH = 2.000
        const topY = floorClear + cabH
        const lowerH = 0.850
        const openH = 0.250
        const upperH = 0.900
        const colW = totalW / 4
        const zBack = -T2 - T2
        const zFront = zBack - depth
        const zCenter = (zBack + zFront) / 2
        const xLeft = LR_W - 1.481 + 0.005      // 복도/거실 800벽 끝 기준 살짝 여유
        const xCenter = xLeft + totalW / 2
        const lowerCenterY = floorClear + lowerH / 2
        const openCenterY = floorClear + lowerH + openH / 2
        const upperCenterY = floorClear + lowerH + openH + upperH / 2
        const bodyColor = '#f5f3f0'
        const doorColor = '#fafaf8'
        const walnutColor = '#6b4423'
        const t = 0.018

        return (
          <group>
            <mesh position={[xCenter, floorClear + cabH / 2, zBack - t / 2]}>
              <boxGeometry args={[totalW, cabH, t]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
            {/* 좌측 측판 — 바닥까지 */}
            <mesh position={[xLeft - t / 2, topY / 2, zCenter]}>
              <boxGeometry args={[t, topY, depth]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
            {/* 우측 측판 — 바닥까지 */}
            <mesh position={[xLeft + totalW + t / 2, topY / 2, zCenter]}>
              <boxGeometry args={[t, topY, depth]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
            <mesh position={[xCenter, topY + t / 2, zCenter]}>
              <boxGeometry args={[totalW + t * 2, t, depth]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
            <mesh position={[xCenter, floorClear - t / 2, zCenter]}>
              <boxGeometry args={[totalW + t * 2, t, depth]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
            {/* 칸막이 (문짝 질감) — col 0|1, 1|2 는 오픈 선반 구간을 비우고 상/하로 분할, col 2|3 (거울 경계)는 풀 높이 */}
            {[1, 2].map((i) => (
              <group key={`shoe-div-${i}`}>
                {/* 하부 구간 */}
                <mesh position={[xLeft + colW * i, floorClear + lowerH / 2, zCenter]}>
                  <boxGeometry args={[t, lowerH, depth - 0.01]} />
                  <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
                </mesh>
                {/* 상부 구간 */}
                <mesh position={[xLeft + colW * i, floorClear + lowerH + openH + upperH / 2, zCenter]}>
                  <boxGeometry args={[t, upperH, depth - 0.01]} />
                  <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
                </mesh>
              </group>
            ))}
            {/* 거울 경계 칸막이 (풀 높이) */}
            <mesh position={[xLeft + colW * 3, floorClear + cabH / 2, zCenter]}>
              <boxGeometry args={[t, cabH, depth - 0.01]} />
              <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
            </mesh>
            {/* 오픈 선반 상/하 수평판 (몸체 자체) */}
            <mesh position={[xLeft + colW * 1.5, floorClear + lowerH + t / 2, zCenter]}>
              <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
            <mesh position={[xLeft + colW * 1.5, floorClear + lowerH + openH - t / 2, zCenter]}>
              <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
              <meshStandardMaterial color={bodyColor} roughness={0.5} />
            </mesh>
            {/* === 오픈 선반 내측 월넛 라이너 5면 (뒤/상/하/좌/우) === */}
            {(() => {
              const interiorLeft = xLeft + t / 2                  // 좌측 측판 내측
              const interiorRight = xLeft + colW * 3 - t / 2      // col 2|3 칸막이 내측
              const interiorBottom = floorClear + lowerH + t      // 아래 수평판 상면
              const interiorTop = floorClear + lowerH + openH - t // 위 수평판 하면
              const interiorWidth = interiorRight - interiorLeft
              const interiorHeight = interiorTop - interiorBottom
              const interiorDepth = depth - 0.01
              const interiorCx = (interiorLeft + interiorRight) / 2
              const interiorCy = (interiorBottom + interiorTop) / 2
              const linerT = 0.004

              return (
                <>
                  {/* 뒤 — 캐비닛 백패널 전면(Z = zBack - t) 보다 2mm 앞쪽 */}
                  <mesh position={[interiorCx, interiorCy, zBack - t - 0.002]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[interiorWidth, interiorHeight]} />
                    <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
                  </mesh>
                  {/* 상 */}
                  <mesh position={[interiorCx, interiorTop - linerT / 2, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[interiorWidth, interiorDepth]} />
                    <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
                  </mesh>
                  {/* 하 */}
                  <mesh position={[interiorCx, interiorBottom + linerT / 2, zCenter]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[interiorWidth, interiorDepth]} />
                    <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
                  </mesh>
                  {/* 좌 */}
                  <mesh position={[interiorLeft + linerT / 2, interiorCy, zCenter]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[interiorDepth, interiorHeight]} />
                    <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} side={THREE.DoubleSide} />
                  </mesh>
                  {/* 우 */}
                  <mesh position={[interiorRight - linerT / 2, interiorCy, zCenter]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[interiorDepth, interiorHeight]} />
                    <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} side={THREE.DoubleSide} />
                  </mesh>
                </>
              )
            })()}

            {/* 오픈 선반 상부 간접조명 (rect) — 백패널에서 현관쪽 10mm */}
            {(() => {
              const interiorLeft = xLeft + t / 2
              const interiorRight = xLeft + colW * 3 - t / 2
              const interiorTop = floorClear + lowerH + openH - t
              const interiorCx = (interiorLeft + interiorRight) / 2
              const interiorWidth = interiorRight - interiorLeft
              const stripDepth = 0.010
              // 백패널 전면(Z = zBack - t)에서 현관 방향(-Z)으로 10mm 지점에 strip 중심
              const stripZ = zBack - t - stripDepth / 2 - 0.002
              const stripY = interiorTop - 0.001
              const isActive = !!allLightsOn || (playerPos ? (
                playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
                playerPos[1] >= -T2 - 1.591 && playerPos[1] <= -T2
              ) : false)
              return (
                <>
                  <mesh position={[interiorCx, stripY, stripZ]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[interiorWidth, stripDepth]} />
                    <meshStandardMaterial
                      color={isActive ? '#fff' : '#444'}
                      emissive={isActive ? '#ffe0b0' : '#111'}
                      emissiveIntensity={isActive ? 3.0 : 0.1}
                    />
                  </mesh>
                  {isActive && (
                    <rectAreaLight
                      position={[interiorCx, stripY - 0.002, stripZ]}
                      width={interiorWidth}
                      height={stripDepth}
                      intensity={60}
                      color="#ffe0b0"
                      rotation={[-Math.PI / 2, 0, 0]}
                    />
                  )}
                </>
              )
            })()}

            {[0, 1, 2].map((ci) => {
              // 인접 문짝 사이 1mm 갭 (양쪽 0.5mm씩), 바깥쪽 가장자리는 flush
              const halfG = 0.0005
              const leftBound = xLeft + ci * colW + (ci > 0 ? halfG : 0)
              const rightBound = xLeft + (ci + 1) * colW - (ci < 2 ? halfG : 0)
              const cx = (leftBound + rightBound) / 2
              const dW = rightBound - leftBound
              return (
                <group key={`shoe-col-${ci}`}>
                  <mesh position={[cx, lowerCenterY, zFront - t / 2]}>
                    <boxGeometry args={[dW, lowerH, t]} />
                    <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
                  </mesh>
                  <mesh position={[cx, upperCenterY, zFront - t / 2]}>
                    <boxGeometry args={[dW, upperH, t]} />
                    <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
                  </mesh>
                </group>
              )
            })}
            {(() => {
              const cx = xLeft + colW * 3.5
              return (
                <group>
                  <mesh position={[cx, floorClear + cabH / 2, zFront - 0.004]}>
                    <boxGeometry args={[colW - 0.006, cabH - 0.006, 0.008]} />
                    <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
                  </mesh>
                  <mesh position={[cx, floorClear + cabH / 2, zFront - 0.0085]}>
                    <planeGeometry args={[colW - 0.03, cabH - 0.03]} />
                    <meshStandardMaterial color="#dfe5ea" roughness={0.02} metalness={1.0} />
                  </mesh>
                </group>
              )
            })()}

            {/* 신발장 밑면 다운라이트 4개 */}
            {(() => {
              const dlY = floorClear - t - 0.002
              const isActive = !!allLightsOn || (playerPos ? (
                playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
                playerPos[1] >= -T2 - 1.591 && playerPos[1] <= -T2
              ) : false)
              return (
                <>
                  {[0, 1, 2, 3].map((ci) => {
                    const cx = xLeft + colW * (ci + 0.5)
                    return (
                      <group key={`shoe-dl-${ci}`}>
                        {/* 발광면 */}
                        <mesh position={[cx, dlY, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                          <circleGeometry args={[0.03, 16]} />
                          <meshStandardMaterial
                            color={isActive ? '#fff' : '#888'}
                            emissive={isActive ? '#ffe0b0' : '#222'}
                            emissiveIntensity={isActive ? 1.0 : 0.1}
                          />
                        </mesh>
                        {/* 크롬 링 */}
                        <mesh position={[cx, dlY + 0.001, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                          <ringGeometry args={[0.03, 0.038, 16]} />
                          <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
                        </mesh>
                        {/* 스포트라이트 */}
                        {isActive && (
                          <spotLight
                            position={[cx, dlY - 0.005, zCenter]}
                            target-position={[cx, 0, zCenter]}
                            angle={Math.PI / 3}
                            penumbra={0.6}
                            intensity={1.5}
                            distance={1.5}
                            decay={2}
                            color="#ffe0b0"
                          />
                        )}
                      </group>
                    )
                  })}
                </>
              )
            })()}
          </group>
        )
      })()}

      {/* TV — 거실/현관 사이 벽 (1450x840mm, 벽걸이) */}
      <group position={[2.832, 1.2, 0.005]}>
        {/* 베젤 (검은색 프레임) */}
        <mesh>
          <boxGeometry args={[1.450, 0.840, 0.015]} />
          <meshStandardMaterial color="#111" roughness={0.3} />
        </mesh>
        {/* 화면 (어두운 회색, 약간 반사) */}
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[1.400, 0.790]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.1} metalness={0.3} />
        </mesh>
        {/* 하단 로고 */}
        <mesh position={[0, -0.395, 0.008]}>
          <boxGeometry args={[0.06, 0.01, 0.005]} />
          <meshStandardMaterial color="#444" metalness={0.5} />
        </mesh>
      </group>

      {/* 복도/거실 공유벽 (800mm) 하단 간접조명 */}
      {(() => {
        const wallStartX = LR_W - 1.481 - 0.800
        const wallEndX = LR_W - 1.481
        const wallZ = -T2
        const wallLen = wallEndX - wallStartX  // 800mm
        const wallCenterX = (wallStartX + wallEndX) / 2

        const isActive = !!allLightsOn || (playerPos ? (
          // 복도
          (playerPos[0] >= -1.2 && playerPos[0] <= LR_W - 1.481 &&
            playerPos[1] >= Math.min(-WALL_THICKNESS, -T2 - 1.591 + T2) && playerPos[1] <= Math.max(-WALL_THICKNESS, -T2 - 1.591 + T2)) ||
          // 현관
          (playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
            playerPos[1] >= Math.min(-WALL_THICKNESS, -T2 - 1.591 + T2) && playerPos[1] <= Math.max(-WALL_THICKNESS, -T2 - 1.591 + T2)) ||
          // 거실
          (playerPos[0] >= 0 && playerPos[0] <= LR_W && playerPos[1] >= 0 && playerPos[1] <= LR_D)
        ) : false)

        return (
          <>
            {/* LED 스트립 (벽 아랫면, Y=0.1) */}
            <mesh position={[wallCenterX, 0.1, wallZ]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[wallLen, WALL_THICKNESS]} />
              <meshStandardMaterial color={isActive ? '#fff' : '#444'} emissive={isActive ? '#ffe0b0' : '#111'} emissiveIntensity={isActive ? 3.0 : 0.1} />
            </mesh>
            {isActive && (
              <rectAreaLight
                position={[wallCenterX, 0.1, wallZ]}
                width={wallLen}
                height={WALL_THICKNESS}
                intensity={30}
                color="#ffe0b0"
                rotation={[Math.PI / 2, 0, 0]}
              />
            )}
          </>
        )
      })()}

      {/* 메인베란다 가벽 (거실 창문 우측, 50mm, 에어컨 실외기 공간) */}
      {(() => {
        const pX = 0.870 + 2.000  // 거실 창문 우측
        const vTopZ = LR_D + WALL_THICKNESS
        const vBotZ = vTopZ + 1.308
        const doorCZ = (vTopZ + vBotZ) / 2
        const topSegLen = (doorCZ - 0.45) - vTopZ
        const botSegLen = vBotZ - (doorCZ + 0.45)

        // 에어컨 실외기 크기: ~900x350x800mm
        const acX = (pX + LR_W + T2) / 2
        const acZ = (vTopZ + vBotZ) / 2

        return (
          <group>
            {/* 가벽 상단 */}
            <mesh position={[pX, WALL_HEIGHT / 2, vTopZ + topSegLen / 2]}>
              <boxGeometry args={[0.05, WALL_HEIGHT, topSegLen]} />
              <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
            </mesh>
            {/* 가벽 하단 */}
            <mesh position={[pX, WALL_HEIGHT / 2, vBotZ - botSegLen / 2]}>
              <boxGeometry args={[0.05, WALL_HEIGHT, botSegLen]} />
              <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
            </mesh>
            {/* 상인방 (문 위 100mm) */}
            <mesh position={[pX, WALL_HEIGHT - 0.05, doorCZ]}>
              <boxGeometry args={[0.05, 0.1, 0.9]} />
              <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
            </mesh>

            {/* 에어컨 실외기 */}
            <mesh position={[acX, 0.4, acZ]}>
              <boxGeometry args={[0.9, 0.8, 0.35]} />
              <meshStandardMaterial color="#e8e8e8" metalness={0.3} roughness={0.4} />
            </mesh>
            {/* 실외기 바깥쪽 (Z+ 방향) 큰 원형 검정 구멍 */}
            <mesh position={[acX, 0.4, acZ + 0.176]}>
              <circleGeometry args={[0.25, 24]} />
              <meshStandardMaterial color="#111" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[acX, 0.4, acZ + 0.177]}>
              <ringGeometry args={[0.22, 0.25, 24]} />
              <meshStandardMaterial color="#333" metalness={0.4} roughness={0.3} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )
      })()}

      {/* 메인베란다 가벽 (안방 가벽과 동일 X, 50mm, 문 포함) */}
      {(() => {
        const pX = mbLeft + 1.340  // 안방 가벽과 동일
        const vTopZ = LR_D + WALL_THICKNESS
        const vBotZ = vTopZ + 1.308
        const doorCZ = (vTopZ + vBotZ) / 2
        const topSegLen = (doorCZ - 0.45) - vTopZ
        const botSegLen = vBotZ - (doorCZ + 0.45)

        return (
          <group>
            {/* 가벽 상단 */}
            <mesh position={[pX, WALL_HEIGHT / 2, vTopZ + topSegLen / 2]}>
              <boxGeometry args={[0.05, WALL_HEIGHT, topSegLen]} />
              <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
            </mesh>
            {/* 가벽 하단 */}
            <mesh position={[pX, WALL_HEIGHT / 2, vBotZ - botSegLen / 2]}>
              <boxGeometry args={[0.05, WALL_HEIGHT, botSegLen]} />
              <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
            </mesh>
            {/* 상인방 (문 위 100mm) */}
            <mesh position={[pX, WALL_HEIGHT - 0.05, doorCZ]}>
              <boxGeometry args={[0.05, 0.1, 0.9]} />
              <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
            </mesh>
          </group>
        )
      })()}

      {/* 안방 가벽 (안방욕실 문쪽~2600mm, 두께 50mm, 창문쪽 1066mm 개구부) — 실크벽지 일괄 적용 */}
      {(() => {
        const partLen = 2.6
        const silk = silkTex.clone()
        silk.wrapS = THREE.RepeatWrapping
        silk.wrapT = THREE.ClampToEdgeWrapping
        silk.repeat.set(partLen / 2, 1)
        silk.colorSpace = THREE.SRGBColorSpace
        return (
          <mesh position={[mbLeft + 1.476, WALL_HEIGHT / 2, -T2 + 1.3]}>
            <boxGeometry args={[0.05, WALL_HEIGHT, partLen]} />
            <meshStandardMaterial
              map={silk}
              roughness={0.55}
              metalness={0}
            />
          </mesh>
        )
      })()}

      {/* 안방 화장대 (붙박이장 첫 자리 — 화장실 인접) */}
      {(() => {
        const vanityX = mbLeft + 0.275
        const vanityZ = 0.3
        const vanityW = 0.55
        return (
          <group>
            <mesh position={[vanityX, 0.75, vanityZ]}>
              <boxGeometry args={[vanityW, 0.03, 0.6]} />
              <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} />
            </mesh>
            <mesh position={[vanityX, 0.37, vanityZ]}>
              <boxGeometry args={[vanityW, 0.72, 0.58]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {[0.55, 0.25].map((yRatio, di) => {
              const dt = closetDoorTex.clone()
              dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
              dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
              return (
                <group key={`vanity-d-${di}`}>
                  <mesh position={[vanityX + vanityW / 2 + 0.001, yRatio, vanityZ]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[0.58, 0.33]} />
                    <meshStandardMaterial map={dt} roughness={0.45} />
                  </mesh>
                  <mesh position={[vanityX + vanityW / 2 + 0.01, yRatio, vanityZ]}>
                    <boxGeometry args={[0.015, 0.06, 0.01]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}
            {/* 거울 */}
            <mesh position={[mbLeft + 0.012, 1.3, vanityZ]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.5, 0.7]} />
              <meshStandardMaterial color="#c8dce8" metalness={0.95} roughness={0.03} />
            </mesh>
            {/* 거울 간접조명 — 상단 (흰색) */}
            <rectAreaLight position={[mbLeft + 0.02, 1.3 + 0.36, vanityZ]} width={0.5} height={0.02} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
            {/* 거울 간접조명 — 하단 */}
            <rectAreaLight position={[mbLeft + 0.02, 1.3 - 0.36, vanityZ]} width={0.5} height={0.02} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
            {/* 거울 간접조명 — 좌측 */}
            <rectAreaLight position={[mbLeft + 0.02, 1.3, vanityZ - 0.26]} width={0.02} height={0.7} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
            {/* 거울 간접조명 — 우측 */}
            <rectAreaLight position={[mbLeft + 0.02, 1.3, vanityZ + 0.26]} width={0.02} height={0.7} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
          </group>
        )
      })()}

      {/* 도어는 shell/Doors.tsx 가 일괄 렌더 (Phase 2) */}
      <Doors playerPos={rawPlayerPos} onDoorOpenChange={onDoorOpenChange} />

      {/* 아기방 침대 — 범퍼 포함 총 1115×2065mm, 배면=창문(상단벽)쪽, 우측=우측벽 flush */}
      <ToddlerBed
        position={[
          babyRight - 2.065 / 2,                             // 우측 범퍼 외측이 babyRight
          babyTop + 1.115 / 2,                               // 배면 범퍼 외측이 babyTop
        ]}
        rotationY={0}
      />

      {/* 작업실 책상 2개 — 우측벽 기준, 긴 변 Z축, 창문쪽=1200, 안쪽=1800 */}
      {(() => {
        const workTopZ = right1Z - 0.770 + 0.795 + 1.418 + 0.1   // 북쪽 내측 (창문쪽)
        const wallGap = 0.020                                     // 벽에서 20mm 띄움
        const deskDepth = 0.720
        const gapBetween = 0.100
        const cx = LR_W - deskDepth / 2 - wallGap                // 우측벽에서 20mm 띄움
        // 창문쪽(북) 1200 — 북쪽 벽에서 20mm 띄우고 배치
        const w1 = 1.200
        const z1 = workTopZ + wallGap + w1 / 2
        // 1200 테이블은 북쪽 벽 꺾임(돌출부)과 겹치지 않도록 140mm 왼쪽(-X)으로 이동
        const cx1 = cx - 0.140
        // 안쪽(남) 1800 — 1200 바로 아래 + gap
        const w2 = 1.800
        const z2 = z1 + w1 / 2 + gapBetween + w2 / 2
        return (
          <>
            <TrestleDesk position={[cx1, z1]} rotationY={Math.PI / 2} width={w1} />
            <TrestleDesk position={[cx, z2]} rotationY={Math.PI / 2} width={w2} />
          </>
        )
      })()}

      {/* === 메인욕실 인테리어 (벽 타일 + 변기 + 세면대 + 샤워부스 + 니치) === */}
      {(() => {
        const bL = mbDoorEnd + 0.1 + T2          // 좌측벽 내측면
        const bR = bL + 1.413                     // 우측벽 내측면
        const bT = -WALL_THICKNESS                // -0.2 (안방쪽 끝)
        const bB = bT - 2.173                     // -2.373 (먼쪽 끝)
        const cX = (bL + bR) / 2
        const innerW = bR - bL                    // 1.413
        const innerD = Math.abs(bB - bT)          // 2.173
        // 화장실 메인 조명 활성 (워크스루 야간 + 플레이어 in-room)
        const bathActive = !!playerPos && playerPos[0] >= bL && playerPos[0] <= bR && playerPos[1] >= bB && playerPos[1] <= bT
        const tileW = 0.6
        const tileH = 1.2
        const makeTileTex = (uRep: number, vRep: number) => {
          const t = bathroomWallTex.clone()
          t.wrapS = THREE.RepeatWrapping
          t.wrapT = THREE.RepeatWrapping
          t.repeat.set(uRep, vRep)
          t.colorSpace = THREE.SRGBColorSpace
          return t
        }

        // 샤워부스 영역 (먼쪽, Z=bB ~ bB+0.95, 전체 폭)
        const showerDepth = 0.95
        const showerZend = bB + showerDepth      // 샤워부스 끝 (유리벽 위치)
        const glassZ = showerZend - 0.2                 // 유리벽 Z

        // 세면대 (좌측벽, 600mm 폭)
        const vanW = 0.6

        const oriVanZ = showerZend + 0.15 + vanW / 2
        const vanZ = showerZend + 0 + vanW / 2  // 샤워벽에서 150mm 띄움

        // 변기 (좌측벽, 세면대와 도어 사이)
        const toiletL = 0.68  // Z방향 길이
        const toiletZ = oriVanZ + vanW / 2 - 0.2 + toiletL / 2

        return (
          <group>
            {/* === 벽 타일 (4면, 600×1200 포세린) === */}
            {/* 좌측벽 (X=bL, +X 면) */}
            <mesh position={[bL + 0.001, WALL_HEIGHT / 2, (bT + bB) / 2]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[innerD, WALL_HEIGHT]} />
              <meshStandardMaterial map={makeTileTex(innerD / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
            </mesh>
            {/* 우측벽 (문이 있는 벽) — 도어 개구부를 피해 3조각으로 분할 타일 */}
            {(() => {
              const doorH = 2.1
              const doorW = 0.9
              const doorZ = -WALL_THICKNESS - 0.1 - 0.45  // 도어 중심 Z
              const doorZmin = doorZ - doorW / 2
              const doorZmax = doorZ + doorW / 2
              const aboveH = WALL_HEIGHT - doorH
              const leftLen = doorZmin - bB        // 작은 Z(먼쪽)에서 도어 좌단까지
              const rightLen = bT - doorZmax       // 도어 우단에서 큰 Z(안방쪽)까지
              return (
                <>
                  {/* 도어 위쪽 (가로=doorW, 세로=WALL_HEIGHT-doorH) */}
                  {aboveH > 0.001 && (
                    <mesh position={[bR - 0.001, doorH + aboveH / 2, doorZ]} rotation={[0, -Math.PI / 2, 0]}>
                      <planeGeometry args={[doorW, aboveH]} />
                      <meshStandardMaterial map={makeTileTex(doorW / tileW, aboveH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
                    </mesh>
                  )}
                  {/* 도어 좌측 (Z < doorZmin) */}
                  {leftLen > 0.001 && (
                    <mesh position={[bR - 0.001, WALL_HEIGHT / 2, (bB + doorZmin) / 2]} rotation={[0, -Math.PI / 2, 0]}>
                      <planeGeometry args={[leftLen, WALL_HEIGHT]} />
                      <meshStandardMaterial map={makeTileTex(leftLen / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
                    </mesh>
                  )}
                  {/* 도어 우측 (Z > doorZmax) */}
                  {rightLen > 0.001 && (
                    <mesh position={[bR - 0.001, WALL_HEIGHT / 2, (doorZmax + bT) / 2]} rotation={[0, -Math.PI / 2, 0]}>
                      <planeGeometry args={[rightLen, WALL_HEIGHT]} />
                      <meshStandardMaterial map={makeTileTex(rightLen / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
                    </mesh>
                  )}
                </>
              )
            })()}
            {/* 안방쪽 벽 (Z=bT, -Z 면) */}
            <mesh position={[cX, WALL_HEIGHT / 2, bT - 0.001]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[innerW, WALL_HEIGHT]} />
              <meshStandardMaterial map={makeTileTex(innerW / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
            </mesh>
            {/* 먼쪽 벽 (Z=bB, +Z 면) */}
            <mesh position={[cX, WALL_HEIGHT / 2, bB + 0.001]}>
              <planeGeometry args={[innerW, WALL_HEIGHT]} />
              <meshStandardMaterial map={makeTileTex(innerW / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
            </mesh>

            {/* === 변기 (GLB) === */}
            <Suspense fallback={null}>
              <Toilet position={[bL + 0.30, 0, toiletZ]} rotation={Math.PI / 2} scale={0.4} />
            </Suspense>
            {/* 변기 위 상부장 (주방 상부장과 동일 스타일 — 좌측벽 부착, +X 정면) */}
            {(() => {
              const ucD = 0.30           // 깊이 (X)
              const ucH = 0.70           // 높이 (Y)
              const ucW = toiletL        // 폭 (Z, 변기 길이)
              const ucCY = 1.75          // 중심 Y
              const doorCount = Math.max(1, Math.round(ucW / 0.4))
              const doorW = ucW / doorCount
              return (
                <group>
                  {/* 본체 */}
                  <mesh position={[bL + ucD / 2, ucCY, toiletZ]}>
                    <boxGeometry args={[ucD, ucH, ucW]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 문들 + 손잡이 */}
                  {Array.from({ length: doorCount }).map((_, di) => {
                    const dt = closetDoorTex.clone()
                    dt.wrapS = THREE.RepeatWrapping
                    dt.wrapT = THREE.RepeatWrapping
                    dt.repeat.set(1, 1)
                    dt.colorSpace = THREE.SRGBColorSpace
                    const dz = (toiletZ - ucW / 2) + doorW / 2 + di * doorW
                    return (
                      <group key={`mb2-uc-${di}`}>
                        {/* 도어 패널 */}
                        <mesh position={[bL + ucD + 0.001, ucCY, dz]} rotation={[0, Math.PI / 2, 0]}>
                          <planeGeometry args={[doorW - 0.005, ucH - 0.01]} />
                          <meshStandardMaterial map={dt} roughness={0.45} />
                        </mesh>
                        {/* 손잡이 */}
                        <mesh position={[bL + ucD + 0.01, ucCY - ucH / 2 + 0.08, dz]}>
                          <boxGeometry args={[0.015, 0.06, 0.01]} />
                          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                        </mesh>
                      </group>
                    )
                  })}
                </group>
              )
            })()}

            {/* === 세면대 (GLB) + 거울 === */}
            <Suspense fallback={null}>
              <Sink position={[bL + 0.40, 0.61, vanZ+0.15]} rotation={Math.PI / 2 * 3} scale={1.5} />
            </Suspense>
            {/* 원형 거울 (좌측벽 부착, 세면대 위) + 후면 간접조명 (메인조명 연동) */}
            {(() => {
              const mR = 0.30           // 거울 반경 300mm
              const mY = 1.45
              const mZ = vanZ - 0.1
              return (
                <group>
                  {/* 거울 본체 (원형) */}
                  <mesh position={[bL + 0.012, mY, mZ]} rotation={[0, Math.PI / 2, 0]}>
                    <circleGeometry args={[mR, 64]} />
                    <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
                  </mesh>
                  {/* 후면 백라이트 링 — 메인조명 ON 일 때만 발광 */}
                  <mesh position={[bL + 0.006, mY, mZ]} rotation={[0, Math.PI / 2, 0]}>
                    <ringGeometry args={[mR + 0.005, mR + 0.05, 64]} />
                    <meshStandardMaterial
                      color={bathActive ? '#fff5e6' : '#444'}
                      emissive={bathActive ? '#fff5e6' : '#111'}
                      emissiveIntensity={bathActive ? 2.5 : 0.05}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  {bathActive && (
                    <pointLight position={[bL + 0.10, mY, mZ]} intensity={0.6} distance={1.5} decay={2} color="#fff5e6" />
                  )}
                </group>
              )
            })()}

            {/* === 샤워부스 (먼쪽, 전체 폭, 유리벽 + 유리문) === */}
            {(() => {
              const sZmid = (bB + showerZend) / 2
              const glassH = 2.0
              return (
                <group>
                  {/* 유리벽 — 좌측 (도어 옆) */}
                  <mesh position={[bL + (innerW * 0.3) / 2 + 0.01, glassH / 2 + 0.02, glassZ]}>
                    <boxGeometry args={[innerW * 0.3, glassH, 0.008]} />
                    <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
                  </mesh>
                  {/* 유리벽 — 우측 (도어 옆) */}
                  <mesh position={[bR - (innerW * 0.3) / 2 - 0.01, glassH / 2 + 0.02, glassZ]}>
                    <boxGeometry args={[innerW * 0.3, glassH, 0.008]} />
                    <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
                  </mesh>
                  {/* 유리 도어 (가운데, 안쪽으로 살짝 옵셋) */}
                  <mesh position={[cX, glassH / 2 + 0.02, glassZ - 0.001]}>
                    <boxGeometry args={[innerW * 0.4, glassH - 0.05, 0.008]} />
                    <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
                  </mesh>
                  {/* 도어 손잡이 */}
                  <mesh position={[cX + 0.18, 1.05, glassZ - 0.05]}>
                    <boxGeometry args={[0.02, 0.18, 0.02]} />
                    <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
                  </mesh>
                  {/* 유리 상단 프레임 */}
                  <mesh position={[cX, glassH + 0.02, glassZ]}>
                    <boxGeometry args={[innerW - 0.02, 0.025, 0.025]} />
                    <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.25} />
                  </mesh>
                </group>
              )
            })()}
          </group>
        )
      })()}

      {/* === 안방욕실 (변기 + 세면대 — 메인욕실 세트를 90° CW 회전한 버전) === */}
      {(() => {
        const bL2 = mbBathLeft       // 좌측벽 X
        const bR2 = mbBathRight      // 우측벽 X
        const bT2 = mbBathTop        // 안방쪽 Z (-0.2)
        const bB2 = mbBathBottom     // 먼쪽 Z (-1.807)
        const toiletL2 = 0.68        // 변기 모델 X-extent (회전 후)
        // 안방욕실 메인 조명 활성
        const mbBathActive = !!playerPos && playerPos[0] >= bL2 && playerPos[0] <= bR2 && playerPos[1] >= bB2 && playerPos[1] <= bT2

        // 벽 타일 (600×1200 포세린)
        const innerW2 = bR2 - bL2
        const innerD2 = Math.abs(bT2 - bB2)
        const tileW2 = 0.6
        const tileH2 = 1.2
        const cX2 = (bL2 + bR2) / 2
        const cZ2 = (bT2 + bB2) / 2
        const makeTileTex2 = (uRep: number, vRep: number) => {
          const t = bathroomWallTex.clone()
          t.wrapS = THREE.RepeatWrapping
          t.wrapT = THREE.RepeatWrapping
          t.repeat.set(uRep, vRep)
          t.colorSpace = THREE.SRGBColorSpace
          return t
        }

        // 변기/세면대 — 북쪽 벽 (Z = bB2) 부착, 변기 서쪽, 세면대 동쪽
        const toilet2X = bL2 + 0.40
        const toilet2Z = bB2 + 0.30
        const sink2X = bL2 + 1.00
        const sink2Z = bB2 + 0.30
        return (
          <group>
            {/* === 벽 타일 (4면) === */}
            {/* 좌측벽 (X=bL2, +X 면) */}
            <mesh position={[bL2 + 0.001, WALL_HEIGHT / 2, cZ2]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[innerD2, WALL_HEIGHT]} />
              <meshStandardMaterial map={makeTileTex2(innerD2 / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
            </mesh>
            {/* 우측벽 (X=bR2, -X 면) */}
            <mesh position={[bR2 - 0.001, WALL_HEIGHT / 2, cZ2]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[innerD2, WALL_HEIGHT]} />
              <meshStandardMaterial map={makeTileTex2(innerD2 / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
            </mesh>
            {/* 안방쪽 벽 (Z=bT2, -Z 면) — 도어 개구부를 피해 3조각으로 분할 타일 */}
            {(() => {
              const doorH = 2.1
              const doorW = 0.9
              const doorXmin = mbDoorHinge
              const doorXmax = mbDoorEnd
              const doorXc = (doorXmin + doorXmax) / 2
              const aboveH = WALL_HEIGHT - doorH
              const leftLen = doorXmin - bL2
              const rightLen = bR2 - doorXmax
              return (
                <>
                  {/* 도어 위쪽 */}
                  {aboveH > 0.001 && (
                    <mesh position={[doorXc, doorH + aboveH / 2, bT2 - 0.001]} rotation={[0, Math.PI, 0]}>
                      <planeGeometry args={[doorW, aboveH]} />
                      <meshStandardMaterial map={makeTileTex2(doorW / tileW2, aboveH / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
                    </mesh>
                  )}
                  {/* 도어 좌측 (X < doorXmin) */}
                  {leftLen > 0.001 && (
                    <mesh position={[(bL2 + doorXmin) / 2, WALL_HEIGHT / 2, bT2 - 0.001]} rotation={[0, Math.PI, 0]}>
                      <planeGeometry args={[leftLen, WALL_HEIGHT]} />
                      <meshStandardMaterial map={makeTileTex2(leftLen / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
                    </mesh>
                  )}
                  {/* 도어 우측 (X > doorXmax) */}
                  {rightLen > 0.001 && (
                    <mesh position={[(doorXmax + bR2) / 2, WALL_HEIGHT / 2, bT2 - 0.001]} rotation={[0, Math.PI, 0]}>
                      <planeGeometry args={[rightLen, WALL_HEIGHT]} />
                      <meshStandardMaterial map={makeTileTex2(rightLen / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
                    </mesh>
                  )}
                </>
              )
            })()}
            {/* 먼쪽벽 (Z=bB2, +Z 면) */}
            <mesh position={[cX2, WALL_HEIGHT / 2, bB2 + 0.001]}>
              <planeGeometry args={[innerW2, WALL_HEIGHT]} />
              <meshStandardMaterial map={makeTileTex2(innerW2 / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
            </mesh>

            {/* 변기 (rotation = π/2 - π/2 = 0) */}
            <Suspense fallback={null}>
              <Toilet position={[toilet2X, 0, toilet2Z]} rotation={0} scale={0.4} />
            </Suspense>
            {/* 변기 위 상부장 (주방 상부장 스타일 — 북쪽 벽 부착, +Z 정면) */}
            {(() => {
              const ucD = 0.30           // 깊이 (Z, 벽에서 안쪽)
              const ucH = 0.70           // 높이 (Y)
              const ucW = toiletL2       // 폭 (X)
              const ucCY = 1.75          // 중심 Y
              const doorCount = Math.max(1, Math.round(ucW / 0.4))
              const doorW = ucW / doorCount
              return (
                <group>
                  {/* 본체 */}
                  <mesh position={[toilet2X, ucCY, bB2 + ucD / 2]}>
                    <boxGeometry args={[ucW, ucH, ucD]} />
                    <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                  </mesh>
                  {/* 문들 + 손잡이 */}
                  {Array.from({ length: doorCount }).map((_, di) => {
                    const dt = closetDoorTex.clone()
                    dt.wrapS = THREE.RepeatWrapping
                    dt.wrapT = THREE.RepeatWrapping
                    dt.repeat.set(1, 1)
                    dt.colorSpace = THREE.SRGBColorSpace
                    const dx = (toilet2X - ucW / 2) + doorW / 2 + di * doorW
                    return (
                      <group key={`mb1-uc-${di}`}>
                        {/* 도어 패널 */}
                        <mesh position={[dx, ucCY, bB2 + ucD + 0.001]}>
                          <planeGeometry args={[doorW - 0.005, ucH - 0.01]} />
                          <meshStandardMaterial map={dt} roughness={0.45} />
                        </mesh>
                        {/* 손잡이 */}
                        <mesh position={[dx, ucCY - ucH / 2 + 0.08, bB2 + ucD + 0.01]}>
                          <boxGeometry args={[0.015, 0.06, 0.01]} />
                          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                        </mesh>
                      </group>
                    )
                  })}
                </group>
              )
            })()}

            {/* 세면대 (rotation = 3π/2 - π/2 = π) */}
            <Suspense fallback={null}>
              <Sink position={[sink2X-0.2, 0.61, sink2Z+0.12]} rotation={Math.PI} scale={1.5} />
            </Suspense>
            {/* 원형 거울 (북쪽 벽 부착, 세면대 위) + 후면 간접조명 (메인조명 연동) */}
            {(() => {
              const mR = 0.30
              const mX = sink2X + 0.07
              const mY = 1.45
              return (
                <group>
                  {/* 거울 본체 (원형) */}
                  <mesh position={[mX, mY, bB2 + 0.012]}>
                    <circleGeometry args={[mR, 64]} />
                    <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
                  </mesh>
                  {/* 후면 백라이트 링 — 메인조명 ON 일 때만 발광 */}
                  <mesh position={[mX, mY, bB2 + 0.006]}>
                    <ringGeometry args={[mR + 0.005, mR + 0.05, 64]} />
                    <meshStandardMaterial
                      color={mbBathActive ? '#fff5e6' : '#444'}
                      emissive={mbBathActive ? '#fff5e6' : '#111'}
                      emissiveIntensity={mbBathActive ? 2.5 : 0.05}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  {mbBathActive && (
                    <pointLight position={[mX, mY, bB2 + 0.10]} intensity={0.6} distance={1.5} decay={2} color="#fff5e6" />
                  )}
                </group>
              )
            })()}
          </group>
        )
      })()}

      {/* 세탁실 LG WashTower — 제일 안쪽(서쪽 끝) 벽 부착, 동쪽(문) 방향 정면 */}
      {(() => {
        const D = 0.80
        const wtX = stair2X + T2 + D / 2  // 서쪽 벽 + 깊이/2
        const wtZ = (Math.min(stair3Z + T2, laundryBotZ - T2) + Math.max(stair3Z + T2, laundryBotZ - T2)) / 2
        return <WashTower position={[wtX, 0, wtZ]} rotation={Math.PI / 2} />
      })()}

      {/* 안방 침대 */}
      <Suspense fallback={null}>
        <Bed />
      </Suspense>

      {/* ㄱ자 소파 — 거실 창문 앞 */}
      <Suspense fallback={null}>
        <Sofa />
      </Suspense>

      {/* 천장 — 각 방마다 */}
      {showCeiling && rooms.map((room) => (
        <mesh
          key={`ceiling-${room.name}-${room.center[0]}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[room.center[0], WALL_HEIGHT, room.center[1]]}
        >
          <planeGeometry args={room.size} />
          <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} side={THREE.BackSide} />
        </mesh>
      ))}
    </group>
  )
}

function RiceCooker({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const { scene } = useGLTF('/models/kitchen/rice_cooker.gltf')
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} />
}

function CuckooWaterPurifier({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const W = 0.260
  const H = 0.527
  const D = 0.506
  const bodyColor = '#fafafa'
  const silverColor = '#c8c8c8'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh position={[0, H * 0.78, D / 2 + 0.0005]}>
        <boxGeometry args={[W * 0.75, H * 0.40, 0.005]} />
        <meshStandardMaterial color={silverColor} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, H * 0.92, D / 2 + 0.004]}>
        <planeGeometry args={[0.060, 0.012]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[W * 0.20, H * 0.66, D / 2 + 0.004]}>
        <planeGeometry args={[0.040, 0.008]} />
        <meshStandardMaterial color="#1a8ec0" emissive="#0a5078" emissiveIntensity={0.3} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const r = Math.floor(i / 3)
        const c = i % 3
        return (
          <mesh
            key={`tc-${i}`}
            position={[W * 0.10 + c * 0.020, H * 0.86 - r * 0.020, D / 2 + 0.004]}
          >
            <circleGeometry args={[0.005, 16]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        )
      })}
      <mesh position={[W * 0.30, H * 0.55, D / 2 + 0.008]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.012, 32]} />
        <meshStandardMaterial color={silverColor} metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[W * 0.30, H * 0.55, D / 2 + 0.015]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 32]} />
        <meshStandardMaterial color="#1ab8ff" emissive="#0a8ec0" emissiveIntensity={0.6} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`opt-${i}`}
          position={[-W * 0.20, H * 0.62 - i * 0.026, D / 2 + 0.003]}
        >
          <planeGeometry args={[0.022, 0.014]} />
          <meshStandardMaterial color="#aaa" />
        </mesh>
      ))}
      <mesh position={[0, H * 0.30, D / 2 - 0.045]}>
        <boxGeometry args={[W * 0.75, H * 0.28, 0.092]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      <mesh position={[0, H * 0.40, D / 2 - 0.020]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.010, 0.040, 16]} />
        <meshStandardMaterial color={silverColor} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, H * 0.10, D / 2 + 0.030]}>
        <boxGeometry args={[W * 0.90, 0.018, 0.080]} />
        <meshStandardMaterial color="#dadada" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, H * 0.10 + 0.0095, D / 2 + 0.030]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 0.85, 0.072]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.7} />
      </mesh>
    </group>
  )
}

function LightWaveOven({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const W = 0.523              // 가로 (X)
  const H = 0.330              // 높이 (Y)
  const D = 0.515              // 깊이 (Z)
  const bodyColor = '#e8dfc8'
  const sideColor = '#2a2a2a'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={sideColor} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0, D / 2 - 0.001]}>
        <boxGeometry args={[W - 0.012, H - 0.008, 0.012]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* 컨트롤 패널 */}
      <mesh position={[0, H / 2 - 0.045, D / 2 + 0.006]}>
        <boxGeometry args={[W - 0.04, 0.060, 0.003]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* 디스플레이 */}
      <mesh position={[-W * 0.20, H / 2 - 0.045, D / 2 + 0.0085]}>
        <planeGeometry args={[0.13, 0.034]} />
        <meshStandardMaterial color="#0a0a12" emissive="#1a3050" emissiveIntensity={0.5} />
      </mesh>
      {/* 다이얼 */}
      <mesh position={[W * 0.30, H / 2 - 0.045, D / 2 + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.012, 24]} />
        <meshStandardMaterial color="#888" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* 도어 핸들 */}
      <mesh position={[0, H / 2 - 0.092, D / 2 + 0.015]}>
        <boxGeometry args={[W - 0.06, 0.020, 0.020]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* 도어 베젤 */}
      <mesh position={[0, -0.030, D / 2 + 0.007]}>
        <boxGeometry args={[W - 0.020, H - 0.150, 0.005]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* 글래스 윈도우 */}
      <mesh position={[0, -0.035, D / 2 + 0.010]}>
        <planeGeometry args={[W - 0.080, H - 0.190]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.15} metalness={0.5} />
      </mesh>
      {/* 글래스 반사 */}
      <mesh position={[0, -0.035, D / 2 + 0.0105]}>
        <planeGeometry args={[W - 0.085, H - 0.195]} />
        <meshStandardMaterial color="#1a1a22" transparent opacity={0.4} roughness={0.1} metalness={0.6} />
      </mesh>
      {/* SAMSUNG 로고 자리 */}
      <mesh position={[0, -H / 2 + 0.025, D / 2 + 0.011]}>
        <planeGeometry args={[0.10, 0.012]} />
        <meshStandardMaterial color="#ffffff" emissive="#444" emissiveIntensity={0.2} />
      </mesh>
      {/* 좌측 통풍구 슬릿 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`vent-${i}`} position={[-W / 2 + 0.030, H / 2 - 0.090 - i * 0.030, D / 2 - 0.001]}>
          <boxGeometry args={[0.025, 0.004, 0.005]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
      ))}
      {/* 다리 4개 */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`foot-${i}`} position={[sx * (W / 2 - 0.030), -H / 2 - 0.012, sz * (D / 2 - 0.030)]}>
          <cylinderGeometry args={[0.010, 0.012, 0.024, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function WashTower({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const W = 0.72              // 폭
  const H = 1.70              // 높이
  const D = 0.80              // 깊이
  const sideThick = 0.025
  const bodyColor = '#f0e8d8' // 크림/베이지
  const sideColor = '#3a3a3a' // 다크 그레이
  const portColor = '#0a0a0a'
  const trimColor = '#1a1a1a'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* 본체 (베이지) */}
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* 양측 다크 그레이 패널 */}
      <mesh position={[-W / 2 - sideThick / 2 + 0.001, H / 2, 0]}>
        <boxGeometry args={[sideThick, H, D + 0.005]} />
        <meshStandardMaterial color={sideColor} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[W / 2 + sideThick / 2 - 0.001, H / 2, 0]}>
        <boxGeometry args={[sideThick, H, D + 0.005]} />
        <meshStandardMaterial color={sideColor} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* === 상단 (건조기) 포트홀 === */}
      <mesh position={[0, H * 0.72 + 0.05, D / 2 + 0.001]}>
        <circleGeometry args={[0.235, 64]} />
        <meshStandardMaterial color={portColor} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, H * 0.72 + 0.05, D / 2 + 0.0015]}>
        <ringGeometry args={[0.235, 0.260, 64]} />
        <meshStandardMaterial color={trimColor} roughness={0.25} metalness={0.7} />
      </mesh>
      {/* 포트홀 깊이감 (안쪽 어두운 디스크) */}
      <mesh position={[0, H * 0.72 + 0.05, D / 2 - 0.005]}>
        <circleGeometry args={[0.220, 64]} />
        <meshStandardMaterial color="#050505" roughness={0.9} />
      </mesh>

      {/* === 컨트롤 패널 (가운데 가로 띠 — 본체 폭 + 좌우 50mm, 위로 30mm 확장) === */}
      <mesh position={[0, H * 0.495 + 0.015, D / 2 + 0.0015]}>
        <boxGeometry args={[W + 0.06, 0.105, 0.004]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* 디스플레이 (가운데 작은 직사각형) */}
      <mesh position={[0, H * 0.495, D / 2 + 0.004]}>
        <planeGeometry args={[0.10, 0.04]} />
        <meshStandardMaterial color="#08080f" emissive="#1a3050" emissiveIntensity={0.4} />
      </mesh>
      {/* 컨트롤 패널 양쪽 작은 버튼 점들 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`btn-l-${i}`}
          position={[-W * 0.32 + i * 0.025, H * 0.495, D / 2 + 0.004]}
        >
          <circleGeometry args={[0.005, 12]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`btn-r-${i}`}
          position={[W * 0.10 + i * 0.025, H * 0.495, D / 2 + 0.004]}
        >
          <circleGeometry args={[0.005, 12]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      ))}

      {/* 세제 트레이 (컨트롤 패널 아래 작은 가로 사각형) */}
      <mesh position={[-W * 0.30, H * 0.43, D / 2 + 0.002]}>
        <boxGeometry args={[0.10, 0.025, 0.005]} />
        <meshStandardMaterial color="#d8d0bc" roughness={0.4} metalness={0.05} />
      </mesh>

      {/* === 하단 (세탁기) 포트홀 === */}
      <mesh position={[0, H * 0.27, D / 2 + 0.001]}>
        <circleGeometry args={[0.255, 64]} />
        <meshStandardMaterial color={portColor} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, H * 0.27, D / 2 + 0.0015]}>
        <ringGeometry args={[0.255, 0.280, 64]} />
        <meshStandardMaterial color={trimColor} roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, H * 0.27, D / 2 - 0.005]}>
        <circleGeometry args={[0.240, 64]} />
        <meshStandardMaterial color="#050505" roughness={0.9} />
      </mesh>

      {/* 하단 작은 도어/필터 (바닥 가까이) */}
      <mesh position={[0, H * 0.05, D / 2 + 0.002]}>
        <boxGeometry args={[0.08, 0.05, 0.005]} />
        <meshStandardMaterial color="#d8d0bc" roughness={0.4} metalness={0.05} />
      </mesh>
    </group>
  )
}

function Toilet({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  const { scene } = useGLTF('/models/bathroom/toilet.glb')
  const cloned = useMemo(() => {
    const s = scene.clone()
    s.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material.clone()
        mat.color = new THREE.Color('#ffffff')
        mat.roughness = 0.15
        mat.metalness = 0.05
        if (mat.map) mat.map = null
        child.material = mat
      }
    })
    return s
  }, [scene])
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={[scale, scale, scale]} />
}

function Sink({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  const { scene } = useGLTF('/models/bathroom/sink.glb')
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={[scale, scale, scale]} />
}

function Bed() {
  const { scene } = useGLTF('/models/bed/scene.gltf')
  const cloned = useMemo(() => {
    const s = scene.clone()
    s.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material
        // initialShadingGroup = 이불 → 민무늬 밝은 베이지로
        if (mat.name === 'initialShadingGroup') {
          const newMat = mat.clone()
          newMat.map = null
          newMat.color = new THREE.Color('#f0ece0')
          newMat.roughness = 0.8
          newMat.normalMap = null
          child.material = newMat
        }
      }
    })
    return s
  }, [scene])

  // 안방: mbLeft ~ -WALL_THICKNESS (X), 0 ~ LR_D (Z)
  // 붙박이장이 좌측 550mm 차지 → 침대는 그 오른쪽
  // 침대를 안방 가운데~하단쪽 배치
  const scale = 1.1
  return (
    <primitive
      object={cloned}
      scale={[scale, scale, scale]}
      position={[mbLeft + 0.55 + 2.6, 0.45, LR_D - 1.150]}
      rotation={[0, Math.PI / 2 * 3, 0]}
    />
  )
}

function Sofa() {
  const { scene } = useGLTF('/models/scene.gltf')
  const cloned = useMemo(() => {
    const s = scene.clone()
    // 베이지 패브릭 색상 적용
    s.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material.clone()
        mat.color = new THREE.Color('#fbf8f0')
        mat.roughness = 0.8
        child.material = mat
      }
    })
    return s
  }, [scene])

  // 거실 내측 3/4 = 3.972 * 0.75 ≈ 2.98m. 모델 실효 120*0.016=1.92. scale = 2.98/1.92 ≈ 1.55
  // 하지만 깊이(Z)도 같이 스케일됨. 83*0.016*1.55 ≈ 2.06m 깊이
  const scale = 1.45
  // 거실 하단벽 내측: Z = LR_D = 3.666, 창문에서 10cm: Z = 3.666 - 0.1 - 소파깊이/2
  // 소파 깊이 ≈ 83*0.016*1.45 ≈ 1.93m → center Z ≈ 3.666 - 0.1 - 0.97 ≈ 2.6
  // 소파 X: 거실 중앙 = LR_W/2 ≈ 1.986
  return (
    <primitive
      object={cloned}
      scale={[scale, scale, -scale]}
      position={[LR_W / 2 - 4.3, -0.6, 2.6 - 0.5 + 1.2]}
      rotation={[0, Math.PI / 2, 0]}
    />
  )
}

function DropCeilingLight({ x, z, ceilingY, active, color = '#ffe0b0' }: { x: number; z: number; ceilingY: number; active: boolean; color?: string }) {
  const lightRef = useRef<THREE.SpotLight>(null)
  const { scene } = useThree()
  const targetRef = useRef<THREE.Object3D | null>(null)

  // target을 한 번만 생성하여 scene에 추가
  useEffect(() => {
    const target = new THREE.Object3D()
    target.position.set(x, 0, z)
    scene.add(target)
    targetRef.current = target
    return () => { scene.remove(target) }
  }, [scene, x, z])

  // active 변경 또는 마운트 시 target 연결
  useEffect(() => {
    if (active && lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [active])

  if (!active) return null

  return (
    <spotLight
      ref={lightRef}
      position={[x, ceilingY - 0.02, z]}
      angle={Math.PI / 2.5}
      penumbra={0.8}
      intensity={2.0}
      distance={ceilingY}
      decay={2}
      color={color}
    />
  )
}

// 아기 침대 — 1115×2065mm, 4면 모두 범퍼 (동일 높이, 회색)
function ToddlerBed({
  position,
  rotationY = 0,
  length = 1.905,          // 베이스 길이 (총 외곽 2065 - 범퍼 80×2)
  width = 0.955,           // 베이스 폭  (총 외곽 1115 - 범퍼 80×2)
  baseH = 0.150,
  mattH = 0.120,
  bumperT = 0.080,
  bumperH = 0.600,
  cornerR = 0.040,
  frontCutRight = 0.500,       // 전면 범퍼 +X 쪽 절단 (통행 공간)
  bumperColor = '#a3a3a3',
  mattColor = '#ffffff',
  frameColor = '#f3efe9',
}: {
  position: [number, number]
  rotationY?: number
  length?: number
  width?: number
  baseH?: number
  mattH?: number
  bumperT?: number
  bumperH?: number
  cornerR?: number
  frontCutRight?: number
  bumperColor?: string
  mattColor?: string
  frameColor?: string
}) {
  // 전면 범퍼: 좌측(-X)끝은 헤드 범퍼와 맞닿고, 우측(+X)끝은 frontCutRight 만큼 짧게
  const frontFullLen = length + bumperT * 2
  const frontLen = frontFullLen - frontCutRight
  const frontCx = -frontCutRight / 2   // 중심이 -X 쪽으로 이동

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotationY, 0]}>
      {/* 베이스 프레임 */}
      <mesh position={[0, baseH / 2, 0]}>
        <boxGeometry args={[length, baseH, width]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      {/* 매트리스 */}
      <mesh position={[0, baseH + mattH / 2, 0]}>
        <boxGeometry args={[length - 0.04, mattH, width - 0.04]} />
        <meshStandardMaterial color={mattColor} roughness={0.85} />
      </mesh>

      {/* 배면 범퍼 (긴 변, -Z 쪽 — 벽에 닿음) */}
      <RoundedBox
        args={[length + bumperT * 2, bumperH, bumperT]}
        radius={cornerR}
        smoothness={4}
        position={[0, bumperH / 2, -width / 2 - bumperT / 2]}
       
       
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>

      {/* 전면 범퍼 (긴 변, +Z 쪽 — 방 입구쪽, 우측 통행 공간만큼 짧음) */}
      <RoundedBox
        args={[frontLen, bumperH, bumperT]}
        radius={cornerR}
        smoothness={4}
        position={[frontCx, bumperH / 2, width / 2 + bumperT / 2]}
       
       
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>

      {/* 헤드 범퍼 (짧은 변, -X 쪽) */}
      <RoundedBox
        args={[bumperT, bumperH, width]}
        radius={cornerR}
        smoothness={4}
        position={[-length / 2 - bumperT / 2, bumperH / 2, 0]}
       
       
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>

      {/* 발치 범퍼 (짧은 변, +X 쪽) */}
      <RoundedBox
        args={[bumperT, bumperH, width]}
        radius={cornerR}
        smoothness={4}
        position={[length / 2 + bumperT / 2, bumperH / 2, 0]}
       
       
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>
    </group>
  )
}

// 책상 — IKEA IDÅSEN 스타일 트레슬 레그 + 블랙 상판
// position: 상판 중심 월드 좌표 [x, z]
// rotationY: 상판 긴 변 방향 (0 = X축, π/2 = Z축)
function TrestleDesk({
  position,
  rotationY = 0,
  width = 1.800,         // 긴 변
  depth = 0.720,         // 짧은 변
  height = 0.730,        // 상판 윗면 높이
  topT = 0.025,          // 상판 두께
  topColor = '#121212',
  legColor = '#3a3a3d',
}: {
  position: [number, number]
  rotationY?: number
  width?: number
  depth?: number
  height?: number
  topT?: number
  topColor?: string
  legColor?: string
}) {
  // 양쪽 다리는 상판 양 끝에서 150mm 안쪽
  const legInset = 0.150
  const postT = 0.050     // 세로 기둥 두께
  const braceT = 0.030    // 사선 브레이스 두께
  const footLen = depth - 0.10
  const postH = height - topT   // 기둥 총 높이 (상판 바닥까지)
  const topSurfaceY = height    // 상판 윗면
  const topCenterY = topSurfaceY - topT / 2

  const legXs = [-width / 2 + legInset, width / 2 - legInset]

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotationY, 0]}>
      {/* 상판 */}
      <mesh position={[0, topCenterY, 0]}>
        <boxGeometry args={[width, topT, depth]} />
        <meshStandardMaterial color={topColor} roughness={0.35} metalness={0.1} />
      </mesh>

      {/* 다리 (트레슬) — 좌우 2세트 */}
      {legXs.map((lx, i) => {
        const pivotY = postH / 2
        return (
          <group key={`leg-${i}`} position={[lx, 0, 0]}>
            {/* 세로 기둥 */}
            <mesh position={[0, pivotY, 0]}>
              <boxGeometry args={[postT, postH, postT]} />
              <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
            </mesh>
            {/* 바닥 가로 풋 (depth 방향) */}
            <mesh position={[0, 0.020, 0]}>
              <boxGeometry args={[postT, 0.030, footLen]} />
              <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
            </mesh>

            {/* 사선 브레이스 — 기둥 상단부터 발 끝 2곳까지 (V자) */}
            {[-1, 1].map((dir) => {
              const dz = dir * (footLen / 2)
              const bx = 0
              const by = postH - 0.050   // 기둥 상단 근처
              const cy = 0.02             // 발 바닥
              const midY = (by + cy) / 2
              const midZ = dz / 2
              const len = Math.hypot(by - cy, dz)
              const angle = Math.atan2(dz, by - cy)
              return (
                <mesh
                  key={`br-${dir}`}
                  position={[bx, midY, midZ]}
                  rotation={[angle, 0, 0]}
                 
                 
                >
                  <boxGeometry args={[braceT, len, braceT]} />
                  <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
                </mesh>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
