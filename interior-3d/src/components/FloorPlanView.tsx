import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Line, Text, MapControls } from '@react-three/drei'
import { useMemo } from 'react'
import { rooms, doorArcs, LR_W, LR_D, MB_W, WALL_THICKNESS, mbBathLeft, mbBathRight, mbBathTop, mbBathBottom, mbBathInnerW, mbBathInnerD, verandaInnerD, BABY_INNER_W, BABY_INNER_D, babyLeft, babyRight, babyTop, babyBottomZ, laundryBotZ, stairLeftX, stair1Z, stair2X, stair3Z, stair4endX, rightWallX, right1Z, right2X, bath2RightWallX } from '../data/apartment'
import { ApartmentModel } from './ApartmentModel'

// 도면 오버레이가 가구/벽 위로 보이도록 띄우는 Y 높이 (벽 높이 2.4m + 여유)
const OVERLAY_Y = 3.0

const verandaWallEndZ = LR_D + WALL_THICKNESS + verandaInnerD + WALL_THICKNESS / 2

const totalLeft = -WALL_THICKNESS - MB_W
const totalRight = LR_W
const centerX = (totalLeft + totalRight) / 2
const centerZ = LR_D / 2

// 메인욕실 내측 좌표 (apartment.ts에서 계산된 값 재현)
const mbLeft = -WALL_THICKNESS - MB_W
const mbDoorHinge = mbLeft + 0.551
const mbDoorEnd = mbDoorHinge + 0.900
const T2 = WALL_THICKNESS / 2
const bath2Left = mbDoorEnd + 0.1 + T2
const bath2Right = bath2Left + 1.413
const bath2Top = -WALL_THICKNESS
const bath2Bottom = bath2Top - 2.173

// === 주방 내측 좌표 (kitchen.tsx 재현) ===
const wall2300Z = babyTop - T2 - 1.119 - 0.770
const kitchenTopInner = wall2300Z + T2
const kitLeft = babyRight + 0.2 + T2 + T2
const kitRight = babyRight + 0.2 + T2 + 2.500 - WALL_THICKNESS
const fridgeBottomZ = babyBottomZ - 0.22 - 0.9
const fridgeFrontX = kitLeft + 0.92  // Refrigerator.D
const extStartZ = wall2300Z + T2
const extCabCenterX = kitRight - 0.3
const extEndZ = (babyBottomZ - 0.22 - 0.9) + 0.42
// 키큰장 (서벽 북단)
const REFRIGERATOR_D = 0.92
const tallX = kitLeft - 0.12 + REFRIGERATOR_D / 2  // CAB_BACK_OFFSET = 0.12
const tallZCenter = ((wall2300Z + T2) + (babyTop - T2 - 1.119)) / 2

// === 평면도용 가구/기물 라벨 === XZ 월드좌표.
//   라벨은 초록 글씨, 방 이름(0.2)보다 약간 작게 (0.14).
const ITEM_LABELS: { name: string; pos: [number, number] }[] = [
  // === 안방 ===
  { name: '침대', pos: [mbLeft + 1.6 + 1.5, LR_D - 1.15] },
  { name: '화장대', pos: [mbLeft + 0.3, 1.0] },

  // === 안방욕실 ===
  { name: '변기', pos: [mbBathLeft + 0.4, mbBathBottom + 0.4] },
  { name: '세면대', pos: [mbBathLeft + 1.1, mbBathBottom + 0.35] },

  // === 메인욕실 ===
  { name: '변기', pos: [bath2RightWallX - 0.4 - 0.3 - 0.5, -WALL_THICKNESS - 0.5 + 0.2] },
  { name: '세면대', pos: [mbDoorEnd + 0.4, -WALL_THICKNESS - 0.6 - 0.3] },
  { name: '샤워부스', pos: [mbDoorEnd + 0.4, -WALL_THICKNESS - 1.6 - 0.3] },

  // === 아기방 ===
  { name: '아기침대', pos: [babyRight - 0.55, babyTop + 0.55] },
  { name: '옷장', pos: [babyLeft + 0.3, babyTop + 0.5] },

  // === 주방 ===
  { name: '김치냉장고', pos: [kitLeft + 0.46, fridgeBottomZ - 0.46] },
  { name: '냉장고', pos: [kitLeft + 0.46, fridgeBottomZ - 0.46 - 0.91] },
  // 인덕션: 후드 정중앙 아래(extStartZ + 0.949)로 이동된 실제 위치 반영
  // 실제 layout: dish (북쪽, +1.6) | sink (남쪽, +2.319) — 이전과 자리 바뀜
  { name: '인덕션', pos: [kitRight - 0.3, extStartZ + 0.949] },
  { name: '식기세척기', pos: [extCabCenterX, extStartZ + 1.6] },
  { name: '싱크', pos: [extCabCenterX, extStartZ + 2.319] },
  { name: '식탁', pos: [(kitLeft + kitRight) / 2 - 0.25 + 1.0, extEndZ + 1.0] },
  { name: '정수기/밥솥', pos: [extCabCenterX, extStartZ + 0.25] },
  { name: '광파오븐', pos: [tallX, tallZCenter] },

  // === 거실 ===
  { name: 'TV', pos: [LR_W / 2, 0.2] },
  { name: '소파', pos: [LR_W / 2, LR_D - 1.0] },

  // === 작업실 ===
  { name: '책상', pos: [LR_W - 0.5, right1Z - 0.770 + 0.795 + 1.418 + 0.7] },
  { name: '책상', pos: [LR_W - 0.5, right1Z - 0.770 + 0.795 + 1.418 + 2.0] },

  // === 세탁실 ===
  { name: '세탁/건조기', pos: [stair2X + 0.5, (stair3Z + laundryBotZ) / 2] },

  // === 현관 ===
  { name: '신발장', pos: [LR_W - 0.74, -WALL_THICKNESS - 0.8 + 0.5] },
]

/** ITEM_LABELS 의 텍스트가 서로 겹치지 않도록 단순 push-apart.
 *  Korean char ≈ 0.10m wide @ fontSize 0.14, height ≈ 0.16. Text 는 X축 정렬이므로 폭은 X, 높이는 Z. */
const ITEM_FONT = 0.14
const CHAR_W = 0.10
const PAD = 0.02

function resolveLabelOverlaps(labels: { name: string; pos: [number, number] }[]) {
  const items = labels.map((l) => ({
    name: l.name,
    x: l.pos[0],
    z: l.pos[1],
    halfW: (l.name.length * CHAR_W) / 2 + PAD,
    halfH: ITEM_FONT / 2 + PAD,
  }))
  for (let iter = 0; iter < 30; iter++) {
    let moved = false
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        const dx = b.x - a.x
        const dz = b.z - a.z
        const minDx = a.halfW + b.halfW
        const minDz = a.halfH + b.halfH
        const overlapX = minDx - Math.abs(dx)
        const overlapZ = minDz - Math.abs(dz)
        if (overlapX > 0 && overlapZ > 0) {
          // Z 축으로 밀어냄 (라벨 줄 단위 분리가 더 자연스러움)
          const sign = dz === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dz)
          const push = (overlapZ + 0.005) / 2
          a.z -= sign * push
          b.z += sign * push
          moved = true
        }
      }
    }
    if (!moved) break
  }
  return items
}

const RESOLVED_ITEM_LABELS = resolveLabelOverlaps(ITEM_LABELS)

function FloorPlanScene() {
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[centerX, 20, centerZ]}
        zoom={100}
        near={0.1}
        far={100}
        up={[0, 0, -1]}
      />
      <MapControls
        enableRotate={false}
        enableDamping={false}
        screenSpacePanning
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
        maxAzimuthAngle={0}
        minAzimuthAngle={0}
      />
      <ambientLight intensity={1.1} />
      <directionalLight position={[5, 15, 5]} intensity={0.9} />

      {/* === 풀 3D 모델 === 조감도/워크스루와 동일 컨텐츠.
          평면도는 낮 모드 + 모든 인테리어 조명 OFF (천장/도시배경도 OFF). */}
      <ApartmentModel showCeiling={false} allLightsOn={false} isNight={false} showCityBackground={false} />

      {/* 방 바닥 (도면용 단색) — 모델 바닥 위에 살짝 띄워 덮음. 가구는 위에 있으므로 그대로 보임 */}
      {rooms.map((room) => (
        <mesh
          key={`floor-${room.name}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[room.center[0], 0.02, room.center[1]]}
        >
          <planeGeometry args={room.size} />
          <meshBasicMaterial color={room.color} />
        </mesh>
      ))}

      {/* === 도면 오버레이 === 라인/텍스트를 가구 위로 띄워서 표시 (Y = OVERLAY_Y 기준 상대 높이) */}
      <group position={[0, OVERLAY_Y, 0]}>

      {/* 맹지 빗금 */}
      {rooms.filter((r: any) => r.hatched).map((room) => {
        const lines: [number, number, number][][] = []
        const [w, fullD] = room.size
        const d = fullD - 0.2  // 아래쪽 200mm(벽) 제외
        const left = room.center[0] - w / 2
        const top = room.center[1] - fullD / 2  // 상단 기준 유지
        const step = 0.15
        const maxLen = w + d
        for (let offset = step; offset < maxLen; offset += step) {
          const x1 = left + Math.min(offset, w)
          const z1 = top + Math.max(0, offset - w)
          const x2 = left + Math.max(0, offset - d)
          const z2 = top + Math.min(offset, d)
          lines.push([[x1, 0.07, z1], [x2, 0.07, z2]])
        }
        return lines.map((pts, i) => (
          <Line key={`hatch-${i}`} points={pts} color="#777" lineWidth={0.8} />
        ))
      })}

      {/* 방 이름 */}
      {rooms.map((room, ri) => (
        <Text
          key={`label-${ri}-${room.name}`}
          position={[room.center[0], 0.1, room.center[1] + (room.name === '맹지' ? -0.1 : 0)]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.2}
          color="#444"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {room.name}
        </Text>
      ))}

      {/* 가구/기물 라벨 — 초록, 방 이름보다 약간 작게, 자동 오버랩 회피 */}
      {RESOLVED_ITEM_LABELS.map((item, i) => (
        <Text
          key={`item-${i}-${item.name}`}
          position={[item.x, 0.12, item.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={ITEM_FONT}
          color="#1d8a3a"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {item.name}
        </Text>
      ))}

      {/* 도어 호 (스윙 방향) — 라인만 */}
      {doorArcs.map((arc, i) => (
        <DoorArc key={`arc-${i}`} {...arc} />
      ))}

      {/* 치수선: 거실 상단벽 분할 (거실 내측, 벽에서 100mm) */}
      <DimensionLine
        start={[0, 0.1, 0.1]}
        end={[0.45, 0.1, 0.1]}
        label="450"
        labelBelow
      />
      <DimensionLine
        start={[LR_W - 1.481, 0.1, 0.1]}
        end={[LR_W, 0.1, 0.1]}
        label="1481"
        labelBelow
      />
      {/* 작업실 우측벽 (새 수직벽) 내측 치수 */}
      <DimensionLine
        start={[LR_W + T2 - T2 - 0.1, 0.1, -T2 - 1.591 - T2]}
        end={[LR_W + T2 - T2 - 0.1, 0.1, right1Z - 0.770 + 0.795 + 1.418 + 0.429 - 0.1 + T2]}
        label={`${((Math.abs((-T2 - 1.591 - T2) - (right1Z - 0.770 + 0.795 + 1.418 + 0.429 - 0.1 + T2))) * 1000).toFixed(0)}`}
        vertical
      />
      {/* 작업실 좌측벽 내측 치수 (329 포함) */}
      <DimensionLine
        start={[rightWallX + 2.555 + T2 + 0.1, 0.1, -T2 - 1.591 - T2]}
        end={[rightWallX + 2.555 + T2 + 0.1, 0.1, right1Z - 0.770 + 0.795 + 1.418 + T2]}
        label="3071"
        vertical
        labelRight
      />

      {/* 복도/현관 상단벽 치수 (내측) */}
      <DimensionLine
        start={[rightWallX + 2.555 - T2, 0.1, -T2 - 1.591 + T2 + 0.1]}
        end={[LR_W, 0.1, -T2 - 1.591 + T2 + 0.1]}
        label={`${((LR_W - (rightWallX + 2.555 - T2)) * 1000).toFixed(0)}`}
        labelBelow
      />

      {/* 1591벽 내측 1391 (거실 우측벽 위, 좌측에서) */}
      <DimensionLine
        start={[LR_W + T2 - 0.2, 0.1, -T2 - T2]}
        end={[LR_W + T2 - 0.2, 0.1, -T2 - 1.591 + T2]}
        label="1391"
        vertical
      />

      {/* 치수선: 안방욕실 가로 (내측, 벽에서 100mm) */}
      <DimensionLine
        start={[mbBathLeft, 0.1, mbBathBottom + 0.1]}
        end={[mbBathRight, 0.1, mbBathBottom + 0.1]}
        label={`${(mbBathInnerW * 1000).toFixed(0)}`}
        labelBelow
      />
      {/* 치수선: 안방욕실 세로 (내측, 벽에서 100mm) */}
      <DimensionLine
        start={[mbBathLeft + 0.1, 0.1, mbBathBottom]}
        end={[mbBathLeft + 0.1, 0.1, mbBathTop]}
        label={`${(Math.abs(mbBathInnerD) * 1000).toFixed(0)}`}
        vertical
        labelRight
      />

      {/* 치수선: 메인욕실 가로 (내측, 하단벽에서 100mm) */}
      <DimensionLine
        start={[bath2Left, 0.1, bath2Top - 0.1]}
        end={[bath2Right, 0.1, bath2Top - 0.1]}
        label="1413"
      />
      {/* 치수선: 메인욕실 세로 (내측, 우측벽에서 100mm) */}
      <DimensionLine
        start={[bath2Right - 0.1, 0.1, bath2Bottom]}
        end={[bath2Right - 0.1, 0.1, bath2Top]}
        label="2173"
        vertical
      />

      {/* 치수선: 아기방 가로 (하단벽에서 100mm) */}
      <DimensionLine
        start={[babyLeft, 0.1, babyBottomZ - 0.1]}
        end={[babyRight, 0.1, babyBottomZ - 0.1]}
        label={`${(BABY_INNER_W * 1000).toFixed(0)}`}
      />
      {/* 치수선: 아기방 세로 (좌측벽에서 100mm) */}
      <DimensionLine
        start={[babyLeft + 0.1, 0.1, babyBottomZ]}
        end={[babyLeft + 0.1, 0.1, babyTop]}
        label={`${(BABY_INNER_D * 1000).toFixed(0)}`}
        vertical
        labelRight
      />

      {/* 치수선: 거실 세로 3666 (우측벽에서 100mm) */}
      <DimensionLine
        start={[LR_W - 0.1, 0.1, 0]}
        end={[LR_W - 0.1, 0.1, LR_D]}
        label={`${(LR_D * 1000).toFixed(0)}`}
        vertical
      />

      {/* 치수선: 안방 세로 3666 (좌측벽에서 100mm) */}
      <DimensionLine
        start={[mbBathLeft + 0.1, 0.1, 0]}
        end={[mbBathLeft + 0.1, 0.1, LR_D]}
        label={`${(LR_D * 1000).toFixed(0)}`}
        vertical
        labelRight
      />

      {/* === 세탁실 치수선 === */}
      {/* 좌측: 세로 947 내측 */}
      <DimensionLine
        start={[stairLeftX + T2 + 0.1, 0.1, laundryBotZ - T2]}
        end={[stairLeftX + T2 + 0.1, 0.1, stair1Z + T2]}
        label={`${((Math.abs(laundryBotZ - T2 - (stair1Z + T2))) * 1000).toFixed(0)}`}
        vertical
        labelRight
      />
      {/* 373 가로 (벽 가장자리까지) */}
      <DimensionLine
        start={[stairLeftX + T2, 0.1, stair1Z - T2 + 0.1]}
        end={[stair2X + T2, 0.1, stair1Z - T2 + 0.1]}
        label={`${((stair2X + T2 - (stairLeftX + T2)) * 1000).toFixed(0)}`}
        labelBelow
      />
      {/* 세로 (상단 100mm 제외, 치수 위치 100mm 아래) */}
      <DimensionLine
        start={[stair2X + T2 + 0.1, 0.1, stair1Z + 0.1]}
        end={[stair2X + T2 + 0.1, 0.1, stair3Z + 0.1]}
        label={`${((Math.abs(stair1Z - stair3Z)) * 1000).toFixed(0)}`}
        vertical
        labelRight
      />
      {/* 1574 가로 (내측 = 1774 - 2*T2) */}
      <DimensionLine
        start={[stair2X + T2, 0.1, stair3Z - T2 + 0.1]}
        end={[stair4endX - T2, 0.1, stair3Z - T2 + 0.1]}
        label={`${((stair4endX - T2 - (stair2X + T2)) * 1000).toFixed(0)}`}
        labelBelow
      />
      {/* 연결벽 세로 274 (1117 하단 ~ 1574 내측) */}
      <DimensionLine
        start={[right2X + T2 + 0.1 - 0.38, 0.1, right1Z + 0.1]}
        end={[right2X + T2 + 0.1 - 0.38, 0.1, stair3Z + T2]}
        label="274"
        vertical
      />

      {/* 1117 우측 상단 벽 570 */}
      <DimensionLine
        start={[rightWallX + T2 + 0.1, 0.1, right1Z]}
        end={[rightWallX + T2 + 0.1, 0.1, right1Z - 0.770 + T2]}
        label="570"
        vertical
        labelRight
      />

      {/* 2500mm 벽 → 2300 (내측) */}
      <DimensionLine
        start={[rightWallX + T2, 0.1, right1Z - 0.770 + T2 - 0.1]}
        end={[rightWallX + 2.500 - T2, 0.1, right1Z - 0.770 + T2 - 0.1]}
        label="2300"
      />
      {/* 695mm 벽 */}
      <DimensionLine
        start={[rightWallX + 2.500 + T2 + 0.1, 0.1, right1Z - 0.770 + T2]}
        end={[rightWallX + 2.500 + T2 + 0.1, 0.1, right1Z - 0.770 + 0.795]}
        label="695"
        vertical
        labelRight
      />

      {/* 작업실베란다 우측 하단 429벽 내측 329 */}
      <DimensionLine
        start={[rightWallX + 2.500 + 2.673 - T2 - 0.1, 0.1, right1Z - 0.770 + 0.795 + 1.418 + T2]}
        end={[rightWallX + 2.500 + 2.673 - T2 - 0.1, 0.1, right1Z - 0.770 + 0.795 + 1.418 + 0.429]}
        label="329"
        vertical
      />

      {/* 작업실베란다 가로 (내측, 상단벽에서 100mm) */}
      <DimensionLine
        start={[rightWallX + 2.500 + T2, 0.1, right1Z - 0.770 + 0.795 + 0.2]}
        end={[rightWallX + 2.500 + 2.673 - T2, 0.1, right1Z - 0.770 + 0.795 + 0.2]}
        label={`${((2.673 - WALL_THICKNESS) * 1000).toFixed(0)}`}
        labelBelow
      />
      {/* 작업실베란다 세로 (내측, 우측벽에서 100mm) */}
      <DimensionLine
        start={[rightWallX + 2.500 + 2.673 - T2 - 0.1, 0.1, right1Z - 0.770 + 0.795 + T2]}
        end={[rightWallX + 2.500 + 2.673 - T2 - 0.1, 0.1, right1Z - 0.770 + 0.795 + 1.418 - T2]}
        label={`${((1.418 - WALL_THICKNESS) * 1000).toFixed(0)}`}
        vertical
      />

      {/* 우측: 세로 919 (내측 = 1119 - 2*T2) */}
      <DimensionLine
        start={[rightWallX - T2 - 0.1, 0.1, laundryBotZ - T2]}
        end={[rightWallX - T2 - 0.1, 0.1, right1Z + T2]}
        label={`${((Math.abs(laundryBotZ - T2 - (right1Z + T2))) * 1000).toFixed(0)}`}
        vertical
      />
      {/* 1117 가로 (벽 좌측 끝 ~ 우측 벽 내측) */}
      <DimensionLine
        start={[rightWallX - 1.217, 0.1, right1Z - T2 + 0.1]}
        end={[rightWallX - T2, 0.1, right1Z - T2 + 0.1]}
        label={`${((rightWallX - T2 - (rightWallX - 1.217)) * 1000).toFixed(0)}`}
        labelBelow
      />

      {/* 치수선: 안방 가로 (메인베란다 하단벽에서 100mm) */}
      <DimensionLine
        start={[totalLeft, 0.1, verandaWallEndZ + T2 + 0.1]}
        end={[totalLeft + MB_W, 0.1, verandaWallEndZ + T2 + 0.1]}
        label={`${(MB_W * 1000).toFixed(0)}`}
        labelBelow
      />

      {/* 치수선: 거실 가로 (메인베란다 하단벽에서 100mm) */}
      <DimensionLine
        start={[0, 0.1, verandaWallEndZ + T2 + 0.1]}
        end={[LR_W, 0.1, verandaWallEndZ + T2 + 0.1]}
        label={`${(LR_W * 1000).toFixed(0)}`}
        labelBelow
      />
      </group>{/* /도면 오버레이 */}
    </>
  )
}

function DoorArc({
  hinge,
  radius,
  openDirection,
  wallAxis = 'x',
  mirrorZ = false,
  mirrorX = false,
}: {
  hinge: [number, number]
  radius: number
  openDirection: number
  hingeEnd: 'left' | 'right'
  wallAxis?: 'x' | 'z'
  mirrorZ?: boolean
  mirrorX?: boolean
}) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    const segments = 24
    if (wallAxis === 'x') {
      // 수평벽 도어: 호가 Z 방향으로 열림
      // mirrorX=true → 힌지가 도어의 +X 끝, 도어는 -X 방향으로 뻗음
      const startAngle = openDirection < 0 ? -Math.PI / 2 : 0
      const endAngle = openDirection < 0 ? 0 : Math.PI / 2
      const xSign = mirrorX ? -1 : 1
      for (let i = 0; i <= segments; i++) {
        const a = startAngle + (endAngle - startAngle) * (i / segments)
        pts.push([hinge[0] + xSign * Math.cos(a) * radius, 0.08, hinge[1] + Math.sin(a) * radius])
      }
    } else {
      // 수직벽 도어: 호가 X 방향으로 열림
      const startAngle = 0
      const endAngle = openDirection > 0 ? Math.PI / 2 : -Math.PI / 2
      for (let i = 0; i <= segments; i++) {
        const a = startAngle + (endAngle - startAngle) * (i / segments)
        const zSign = mirrorZ ? 1 : -1
        pts.push([hinge[0] + Math.sin(a) * radius, 0.08, hinge[1] + zSign * Math.cos(a) * radius])
      }
    }
    return pts
  }, [hinge, radius, openDirection, wallAxis, mirrorZ, mirrorX])

  let leafEnd: [number, number, number]
  if (wallAxis === 'x') {
    leafEnd = [hinge[0], 0.08, hinge[1] + openDirection * radius]
  } else {
    leafEnd = [hinge[0] + openDirection * radius, 0.08, hinge[1]]
  }

  return (
    <group>
      <Line points={points} color="#666" lineWidth={1} />
      <Line
        points={[[hinge[0], 0.08, hinge[1]], leafEnd]}
        color="#888"
        lineWidth={1.5}
      />
    </group>
  )
}

function DimensionLine({
  start,
  end,
  label,
  vertical = false,
  labelBelow = false,
  labelRight = false,
}: {
  start: [number, number, number]
  end: [number, number, number]
  label: string
  vertical?: boolean
  labelBelow?: boolean
  labelRight?: boolean
}) {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ]

  const offset = labelBelow ? 0.15 : -0.15
  const vOffset = labelRight ? 0.12 : -0.12

  return (
    <group>
      <Line points={[start, end]} color="#e74c3c" lineWidth={1.5} />
      <Text
        position={vertical ? [mid[0] + vOffset, mid[1], mid[2]] : [mid[0], mid[1], mid[2] + offset]}
        rotation={[-Math.PI / 2, 0, vertical ? -Math.PI / 2 : 0]}
        fontSize={0.14}
        color="#e74c3c"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {label}
      </Text>
    </group>
  )
}

export function FloorPlanView() {
  return (
    <>
      <Canvas>
        <FloorPlanScene />
      </Canvas>
      <div className="overlay-info">
        <strong>평면도</strong> (치수 표시)
        <br />
        스크롤: 확대/축소
        <br />
        드래그: 이동
      </div>
    </>
  )
}
