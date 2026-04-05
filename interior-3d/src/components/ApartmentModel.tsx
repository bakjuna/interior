import { useMemo, useRef, useEffect, useCallback, Suspense } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { useLoader, useThree } from '@react-three/fiber'

// RectAreaLight 초기화 (한 번만)
RectAreaLightUniformsLib.init()
import { TextureLoader } from 'three'
import { useGLTF } from '@react-three/drei'
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
} from '../data/apartment'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

interface ApartmentModelProps {
  showCeiling?: boolean
  playerPos?: [number, number]  // [x, z] — 워크스루 전용, 현재 위치 기반 조명
  allLightsOn?: boolean         // 조감도용, 전체 조명 ON/OFF
}

// 전체 내측 범위
const totalLeft = -WALL_THICKNESS - MB_W
const totalRight = LR_W
const totalW = totalRight - totalLeft
const centerX = (totalLeft + totalRight) / 2
const centerZ = LR_D / 2

export function ApartmentModel({ showCeiling = true, playerPos, allLightsOn = false }: ApartmentModelProps) {
  const floorTex = useLoader(TextureLoader, '/textures/walnut-floor.png')
  const porcelainTex = useLoader(TextureLoader, '/textures/porcelain-tile.png')
  const entranceTex = useLoader(TextureLoader, '/textures/entrance-tile.png')
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')

  const floorTexture = useMemo(() => {
    const tex = floorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1) // 1m당 1타일 기준, 방 크기에 따라 조정
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [floorTex])

  return (
    <group>
      {/* 바닥 */}
      {rooms.map((room) => {
        let baseTex = floorTex
        if (room.floorTile === 'porcelain') baseTex = porcelainTex
        else if (room.floorTile === 'entrance') baseTex = entranceTex
        const tex = baseTex.clone()
        tex.wrapS = THREE.RepeatWrapping
        tex.wrapT = THREE.RepeatWrapping
        tex.colorSpace = THREE.SRGBColorSpace
        const tileSize = room.tileSize ?? 1
        tex.repeat.set(room.size[0] / tileSize, room.size[1] / tileSize)
        const fY = room.floorY ?? 0
        return (
          <mesh
            key={`floor-${room.name}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.center[0], fY + 0.001, room.center[1]]}
            receiveShadow
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

        return (
          <mesh
            key={i}
            position={[
              wall.start[0] + dx / 2,
              bY + h / 2,
              wall.start[1] + dz / 2,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[isH ? length : t, h, isH ? t : length]} />
            <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
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
            <mesh position={c.position} castShadow receiveShadow>
              <boxGeometry args={c.size} />
              <meshStandardMaterial color="#3d2b1a" roughness={0.7} />
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
              // playerPos 없음(조감도) → allLightsOn prop, 있음(워크스루) → 현재 방만
              const isActive = playerPos
                ? activeGroup?.lights.some(([lx, lz]) => lx === x && lz === z) ?? false
                : !!allLightsOn

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
                      emissive={isActive ? ((Math.abs(x - (mbLeft + 0.550 + 0.3)) < 0.05 && z > LR_D - 0.8) ? '#fff5e6' : '#ffe0b0') : '#222'}
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
                      // 화장대 앞 다운라이트 (안방 좌측 하단) → 흰색
                      (Math.abs(x - (mbLeft + 0.550 + 0.3)) < 0.05 && z > LR_D - 0.8) ? '#fff5e6' : '#ffe0b0'
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
            const mbActive = (!playerPos ? allLightsOn : false) || (playerPos && playerPos[0] >= mbLeft && playerPos[0] <= -WALL_THICKNESS && playerPos[1] >= 0 && playerPos[1] <= LR_D)
            const lrActive = (!playerPos ? allLightsOn : false) || (playerPos && playerPos[0] >= 0 && playerPos[0] <= LR_W && playerPos[1] >= 0 && playerPos[1] <= LR_D)
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
            const babyActive = (!playerPos ? allLightsOn : false) || (playerPos && playerPos[0] >= babyLeft && playerPos[0] <= babyRight && playerPos[1] >= babyTop && playerPos[1] <= babyBottomZ)
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
            const workActive = (!playerPos ? allLightsOn : false) || (playerPos && playerPos[0] >= workLeftX - 0.2 && playerPos[0] <= workRightX + 0.1 && playerPos[1] <= -0.1 - 1.591 - 0.1 && playerPos[1] >= workTopZ - 0.2)
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
        const kitchenActive = (!playerPos ? allLightsOn : false) || (playerPos && (
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
              <meshStandardMaterial color="#3d2b1a" roughness={0.7} />
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
                <mesh position={[kitLeft + upperLeftW / 2, 1.75, upperZ]}>
                  <boxGeometry args={[upperLeftW, 0.7, 0.35]} />
                  <meshStandardMaterial color="#3d2b1a" roughness={0.7} />
                </mesh>
                {/* 상부장 문들 */}
                {Array.from({ length: Math.max(1, Math.round(upperLeftW / 0.5)) }).map((_, di) => {
                  const dw = upperLeftW / Math.max(1, Math.round(upperLeftW / 0.5))
                  const dx = kitLeft + dw / 2 + di * dw
                  const dt = closetDoorTex.clone()
                  dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
                  dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
                  return (
                    <mesh key={`uc-l-${di}`} position={[dx, 1.75, upperZ + 0.176]}>
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
                <mesh position={[kitRight - 0.175, 1.75, (urStartZ + urEndZ) / 2]}>
                  <boxGeometry args={[0.35, 0.7, urLen]} />
                  <meshStandardMaterial color="#3d2b1a" roughness={0.7} />
                </mesh>
                {Array.from({ length: Math.max(1, Math.round(urLen / 0.5)) }).map((_, di) => {
                  const dw = urLen / Math.max(1, Math.round(urLen / 0.5))
                  const dz = urStartZ + dw / 2 + di * dw
                  const dt = closetDoorTex.clone()
                  dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
                  dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
                  return (
                    <mesh key={`uc-r-${di}`} position={[kitRight - 0.175 - 0.176, 1.75, dz]} rotation={[0, -Math.PI / 2, 0]}>
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
                    <meshStandardMaterial color="#3d2b1a" roughness={0.7} />
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
                    <meshStandardMaterial color="#3d2b1a" roughness={0.7} />
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
                  <mesh position={[extUpperCenterX, 1.75, extCenterZ]}><boxGeometry args={[0.35, 0.7, extLen]} /><meshStandardMaterial color="#3d2b1a" roughness={0.7} /></mesh>
                  {[0.25, 0.75].map((t, di) => {
                    const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
                    return (<mesh key={`ext-uc-${di}`} position={[extUpperCenterX - 0.176, 1.75, extStartZ + extLen * t]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[extLen / 2 - 0.005, 0.68]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>)
                  })}
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
                  {/* 본체 (옆면 새까만색) */}
                  <mesh position={[fridgeX, fridgeH / 2, fridgeZ]}>
                    <boxGeometry args={[fridgeD, fridgeH, fridgeW]} />
                    <meshStandardMaterial color="#111" roughness={0.5} />
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

                  {/* === 2번째 냉장고 (810x790x1800, 프렌치도어+서랍2단) === */}
                  {(() => {
                    const f2W = 0.810
                    const f2D = 0.790
                    const f2H = 1.800
                    const f2Z = fridgeZ + fridgeW / 2 + f2W / 2 + 0.03  // 냉장고에서 30mm
                    const frontFace = fridgeX - fridgeD / 2  // 기존 냉장고 전면
                    const f2X = frontFace + f2D / 2  // 전면 정렬
                    const topH = f2H * 0.55   // 상단 프렌치도어
                    const midH = f2H * 0.22   // 중단 서랍
                    const botH = f2H * 0.22   // 하단 서랍
                    return (
                      <group>
                        {/* 본체 (검정) */}
                        <mesh position={[f2X, f2H / 2, f2Z]}>
                          <boxGeometry args={[f2D, f2H, f2W]} />
                          <meshStandardMaterial color="#111" roughness={0.5} />
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
              const kitchenActive = (!playerPos ? allLightsOn : false) || (playerPos && (
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
                  <mesh position={[leftCabX, 0.41, leftCenterZ]}><boxGeometry args={[leftCabDepth, 0.82, leftLen]} /><meshStandardMaterial color="#3d2b1a" roughness={0.7} /></mesh>
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

        const isActive = playerPos ? (
          // 복도
          (playerPos[0] >= -1.2 && playerPos[0] <= LR_W - 1.481 &&
            playerPos[1] >= Math.min(-WALL_THICKNESS, -T2 - 1.591 + T2) && playerPos[1] <= Math.max(-WALL_THICKNESS, -T2 - 1.591 + T2)) ||
          // 현관
          (playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
            playerPos[1] >= Math.min(-WALL_THICKNESS, -T2 - 1.591 + T2) && playerPos[1] <= Math.max(-WALL_THICKNESS, -T2 - 1.591 + T2)) ||
          // 거실
          (playerPos[0] >= 0 && playerPos[0] <= LR_W && playerPos[1] >= 0 && playerPos[1] <= LR_D)
        ) : allLightsOn

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

      {/* 안방 가벽 (창문 좌측~2600mm, 두께 50mm) */}
      <mesh position={[mbLeft + 1.340, WALL_HEIGHT / 2, LR_D + T2 - 1.3]}>
        <boxGeometry args={[0.05, WALL_HEIGHT, 2.6]} />
        <meshStandardMaterial color="#f5f3f0" roughness={0.4} metalness={0.02} />
      </mesh>

      {/* 안방 화장대 (붙박이장 마지막 자리) */}
      {(() => {
        const vanityX = mbLeft + 0.275
        const vanityZ = LR_D - 0.3
        const vanityW = 0.55
        return (
          <group>
            <mesh position={[vanityX, 0.75, vanityZ]}>
              <boxGeometry args={[vanityW, 0.03, 0.6]} />
              <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} />
            </mesh>
            <mesh position={[vanityX, 0.37, vanityZ]}>
              <boxGeometry args={[vanityW, 0.72, 0.58]} />
              <meshStandardMaterial color="#3d2b1a" roughness={0.7} />
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
      position={[mbLeft + 0.55 + 2.6, 0.45, LR_D - 1]}
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
        mat.color = new THREE.Color('#faf0dc')
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
