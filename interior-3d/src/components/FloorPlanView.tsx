import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Line, Text, MapControls } from '@react-three/drei'
import { useMemo } from 'react'
import { walls, rooms, doors, doorArcs, windows, LR_W, LR_D, MB_W, WALL_THICKNESS, mbBathLeft, mbBathRight, mbBathTop, mbBathBottom, mbBathInnerW, mbBathInnerD, verandaInnerD, BABY_INNER_W, BABY_INNER_D, babyLeft, babyRight, babyTop, babyBottomZ, laundryBotZ, stairLeftX, stair1Z, stair2X, stair3Z, stair4endX, rightWallX, right1Z, right2X } from '../data/apartment'

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
      <ambientLight intensity={1.0} />

      {/* 방 바닥 */}
      {rooms.map((room) => (
        <mesh
          key={room.name}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[room.center[0], 0, room.center[1]]}
        >
          <planeGeometry args={room.size} />
          <meshBasicMaterial color={room.color} />
        </mesh>
      ))}

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
      {rooms.map((room) => (
        <Text
          key={`label-${room.name}`}
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

      {/* 벽체 */}
      {walls.map((wall, i) => {
        const dx = wall.end[0] - wall.start[0]
        const dz = wall.end[1] - wall.start[1]
        const isH = Math.abs(dz) < 0.001
        const length = Math.sqrt(dx * dx + dz * dz)
        return (
          <mesh
            key={`w-${i}`}
            position={[wall.start[0] + dx / 2, 0.05, wall.start[1] + dz / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry
              args={[isH ? length : wall.thickness, isH ? wall.thickness : length]}
            />
            <meshBasicMaterial color="#555" />
          </mesh>
        )
      })}

      {/* 창문 표시 (도면 스타일: 이중선 + 벽 개구부) */}
      {windows.map((w, i) => {
        const cx = w.position[0]
        const cz = w.position[1]
        const ww = w.width
        const t = WALL_THICKNESS
        const isX = w.axis === 'x'

        if (isX) {
          // 수평벽 창문: X 방향으로 열림
          return (
            <group key={`win-${i}`}>
              {/* 벽 개구부 배경 */}
              <mesh position={[cx, 0.06, cz]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[ww, t + 0.04]} />
                <meshBasicMaterial color="#aaddff" />
              </mesh>
              {/* 이중선 — 상 */}
              <Line points={[[cx - ww / 2, 0.08, cz - t / 2 + 0.02], [cx + ww / 2, 0.08, cz - t / 2 + 0.02]]} color="#4488bb" lineWidth={1.5} />
              <Line points={[[cx - ww / 2, 0.08, cz + t / 2 - 0.02], [cx + ww / 2, 0.08, cz + t / 2 - 0.02]]} color="#4488bb" lineWidth={1.5} />
              {/* 중심선 */}
              <Line points={[[cx - ww / 2, 0.08, cz], [cx + ww / 2, 0.08, cz]]} color="#4488bb" lineWidth={0.5} />
            </group>
          )
        } else {
          // 수직벽 창문: Z 방향으로 열림
          return (
            <group key={`win-${i}`}>
              <mesh position={[cx, 0.06, cz]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[t + 0.04, ww]} />
                <meshBasicMaterial color="#aaddff" />
              </mesh>
              <Line points={[[cx - t / 2 + 0.02, 0.08, cz - ww / 2], [cx - t / 2 + 0.02, 0.08, cz + ww / 2]]} color="#4488bb" lineWidth={1.5} />
              <Line points={[[cx + t / 2 - 0.02, 0.08, cz - ww / 2], [cx + t / 2 - 0.02, 0.08, cz + ww / 2]]} color="#4488bb" lineWidth={1.5} />
              <Line points={[[cx, 0.08, cz - ww / 2], [cx, 0.08, cz + ww / 2]]} color="#4488bb" lineWidth={0.5} />
            </group>
          )
        }
      })}

      {/* 도어 표시 — 개구부 바닥색 + 호 */}
      {doors.map((door, i) => (
        <mesh
          key={`door-${i}`}
          position={[door.position[0], 0.06, door.position[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry
            args={door.axis === 'x' ? [door.width, WALL_THICKNESS + 0.02] : [WALL_THICKNESS + 0.02, door.width]}
          />
          <meshBasicMaterial color="#f5e6d3" />
        </mesh>
      ))}
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
