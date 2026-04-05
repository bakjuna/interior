/**
 * 은행현대 84㎡
 * 단위: 미터
 * 좌표계: X = 가로, Z = 세로, Y = 높이
 * 내측 치수 기준, 벽 중심은 내측 면에서 100mm 바깥
 */

export const WALL_HEIGHT = 2.4
export const WALL_THICKNESS = 0.2
const T2 = WALL_THICKNESS / 2 // 100mm

// 방 내측 치수 (mm → m)
export const MB_W = 4.220  // 안방 가로 4220mm
export const LR_W = 3.972  // 거실 가로 3972mm
export const LR_D = 3.666  // 거실/안방 세로 3666mm

// 안방: X = -WALL_THICKNESS - MB_W ~ -WALL_THICKNESS (공유벽 내측면)
// 거실: X = 0 ~ LR_W
// 공유벽 중심: X = -T2

export interface Wall {
  start: [number, number]
  end: [number, number]
  thickness: number
  height?: number
}

export interface Opening {
  position: [number, number]
  width: number
  height: number
  sillHeight: number
  axis: 'x' | 'z'
  type: 'door' | 'window'
}

export interface Room {
  name: string
  center: [number, number]
  size: [number, number]
  color: string
}

const mbLeft = -WALL_THICKNESS - MB_W  // 안방 내측 좌측면 X

// 안방 상단 도어: 좌측 내측면 기준 551mm(경첩), 폭 900mm
const mbDoorHinge = mbLeft + 0.551
const mbDoorEnd = mbDoorHinge + 0.900
export const MB_DOOR_WIDTH = 0.900  // 900mm

// 안방욕실 내측 치수
const MB_BATH_INNER_D = 1.607 // 내측 세로 1607mm
// 벽 끝점: 안방 상단벽 외측면(-0.2)에서 내측 1607mm + 벽 두께
const mbBathWallEnd = -WALL_THICKNESS - MB_BATH_INNER_D - T2

export const mbBathLeft = mbLeft          // 좌측벽 내측면
export const mbBathRight = mbDoorEnd + 0.1 - T2 // 우측벽 내측면
export const mbBathTop = -WALL_THICKNESS  // 안방 상단벽 외측면 (욕실 바닥쪽)
export const mbBathBottom = -WALL_THICKNESS - MB_BATH_INNER_D // 상단벽 내측면 (욕실 안쪽)
export const mbBathInnerW = mbBathRight - mbBathLeft
export const mbBathInnerD = MB_BATH_INNER_D

// 안방욕실 우측 공간 (내측 1413 x 2173mm)
const BATH2_INNER_W = 1.413
const BATH2_INNER_D = 2.173
const bath2Left = mbDoorEnd + 0.1 + T2         // 안방욕실 우측벽 외측면
const bath2Right = bath2Left + BATH2_INNER_W
const bath2Top = -WALL_THICKNESS                // 안방 상단벽 외측면 (욕실과 동일 시작)
const bath2Bottom = bath2Top - BATH2_INNER_D
const bath2RightWallX = bath2Right + T2         // 우측벽 중심
const bath2TopWallZ = bath2Bottom - T2          // 상단벽 중심

// 아기방 (맹지/메인욕실 위, 내측 3064 x 2713mm)
export const BABY_INNER_W = 3.064
export const BABY_INNER_D = 2.713
const babyBottom = bath2TopWallZ - T2              // 기존 상단벽 윗면 (아기방 하단 내측)
export const babyTop = babyBottom - BABY_INNER_D
const babyTopWallZ = babyTop - T2                  // 아기방 상단벽 중심
export const babyLeft = mbLeft                            // 안방 좌측 내측 = 아기방 좌측 내측
export const babyRight = mbLeft + BABY_INNER_W
export const babyBottomZ = babyBottom
const babyRightWallX = babyRight + T2

// 세탁실 주요 좌표
export const laundryBotZ = babyTopWallZ         // 하단 = 아기방 상단벽
export const stairLeftX = mbLeft - T2            // 좌측 벽 X
export const stair1Z = babyTopWallZ - 0.947      // 1단 꺾임 Z (847+100mm)
export const stair2X = mbLeft - T2 + 0.373       // 2단 꺾임 X (100mm 좌측 이동)
export const stair3Z = babyTopWallZ - 0.847 - 0.486  // 3단 꺾임 Z (위치 유지)
export const stair4endX = mbLeft - T2 + 0.373 + 1.774  // 1774mm 끝 X
export const rightWallX = babyRightWallX         // 우측 벽 X
export const right1Z = babyTopWallZ - 1.119       // 우측 꺾임 Z
export const right2X = babyRightWallX - 1.217 + 0.1  // 연결벽 X (+100mm)

// 메인베란다 (안방 아래, 내측 1308mm)
const VERANDA_INNER_D = 1.308
const verandaTop = LR_D + WALL_THICKNESS        // 안방 하단벽 외측면
const verandaBottom = verandaTop + VERANDA_INNER_D
const verandaWallEnd = verandaBottom + T2        // 하단벽 중심

export const verandaInnerD = VERANDA_INNER_D

export const rooms: Room[] = [
  { name: '안방욕실', center: [(mbBathLeft + mbBathRight) / 2, (0 + mbBathBottom) / 2], size: [mbBathInnerW, Math.abs(mbBathBottom)], color: '#c5dbe8' },
  { name: '메인욕실', center: [(bath2Left + bath2Right) / 2, (bath2Top + bath2Bottom) / 2], size: [BATH2_INNER_W, BATH2_INNER_D], color: '#d4dce8' },
  { name: '아기방', center: [(babyLeft + babyRight) / 2, (babyBottom + babyTop) / 2], size: [BABY_INNER_W, BABY_INNER_D], color: '#f0e0f0' },
  // 세탁실 좌측 (373×747)
  { name: '', center: [(stairLeftX + T2 + stair2X + T2) / 2, (laundryBotZ - T2 + stair1Z + T2) / 2], size: [stair2X + T2 - (stairLeftX + T2), Math.abs((laundryBotZ - T2) - (stair1Z + T2))], color: '#e8e0d4' },
  // 세탁실 중간 (1574×1233) — 태그 여기
  { name: '세탁실', center: [(stair2X + T2 + stair4endX - T2) / 2, (laundryBotZ - T2 + stair3Z + T2) / 2], size: [stair4endX - T2 - (stair2X + T2), Math.abs((laundryBotZ - T2) - (stair3Z + T2))], color: '#e8e0d4' },
  // 세탁실 우측 (1117×919)
  { name: '', center: [(rightWallX - 1.217 + rightWallX - T2) / 2, (laundryBotZ - T2 + right1Z + T2) / 2], size: [rightWallX - T2 - (rightWallX - 1.217), Math.abs((laundryBotZ - T2) - (right1Z + T2))], color: '#e8e0d4' },
  { name: '맹지', center: [(mbBathLeft + mbBathRight) / 2, (mbBathBottom + bath2Bottom) / 2], size: [mbBathInnerW, Math.abs(bath2Bottom - mbBathBottom)], color: '#999', hatched: true } as Room & { hatched: boolean },
  { name: '안방', center: [mbLeft + MB_W / 2, LR_D / 2], size: [MB_W, LR_D], color: '#dce8d4' },
  { name: '거실', center: [LR_W / 2, (-WALL_THICKNESS + LR_D) / 2], size: [LR_W, LR_D + WALL_THICKNESS], color: '#f5e6d3' },
  { name: '메인베란다', center: [(mbLeft + LR_W) / 2, (verandaTop + verandaBottom) / 2], size: [LR_W - mbLeft, VERANDA_INNER_D], color: '#e0e0e0' },
  // 작업실베란다
  { name: '작업실베란다', center: [babyRightWallX + 2.500 + 2.673 / 2, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 / 2], size: [2.673, 1.418], color: '#e0e0e0' },
  // 현관 (복도까지 확장)
  { name: '현관', center: [(LR_W - 1.481 + LR_W + T2) / 2, -T2 - 1.591 / 2], size: [1.481 + T2, 1.591], color: '#d4c4a8' },
  // 작업실 메인 (3371mm벽 ~ 거실 우측벽, 상단벽 ~ 수평벽)
  { name: '작업실', center: [(babyRightWallX + 2.555 + T2 + LR_W) / 2, (-T2 - 1.591 - T2 + babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1 + T2) / 2], size: [LR_W - (babyRightWallX + 2.555 + T2), Math.abs((-T2 - 1.591 - T2) - (babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1 + T2))], color: '#d8e8d8' },
  // 작업실 상단 확장 (329mm, 작업실베란다 우측)
  { name: '', center: [(babyRightWallX + 2.555 + T2 + babyRightWallX + 2.500 + 2.673 - T2) / 2, (babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1 + T2 + babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1 + T2 + 0.329) / 2], size: [babyRightWallX + 2.500 + 2.673 - T2 - (babyRightWallX + 2.555 + T2), 0.329], color: '#d8e8d8' },
  // 복도 (현관 ~ 욕실)
  { name: '복도', center: [(babyRightWallX + T2 + LR_W - 1.481) / 2, (-WALL_THICKNESS + (-T2 - 1.591 + T2)) / 2], size: [LR_W - 1.481 - (babyRightWallX + T2), 1.591 - WALL_THICKNESS], color: '#ede8e0' },
  // 주방 (2300+55mm 폭 × 2300벽~복도)
  { name: '주방', center: [(babyRightWallX + T2 + babyRightWallX + 2.555 - T2) / 2, ((-T2 - 1.591 + T2) + (babyTopWallZ - 1.119 - 0.770 + T2)) / 2], size: [2.555 - WALL_THICKNESS, Math.abs((-T2 - 1.591 + T2) - (babyTopWallZ - 1.119 - 0.770 + T2))], color: '#e8dcc8' },
]

export const walls: Wall[] = [
  // === 안방 ===
  // 안방 좌측벽
  { start: [mbLeft - T2, -T2], end: [mbLeft - T2, LR_D + T2], thickness: WALL_THICKNESS },
  // 안방 상단벽 — 도어 좌측
  { start: [mbLeft - T2, -T2], end: [mbDoorHinge, -T2], thickness: WALL_THICKNESS },
  // 안방 상단벽 — 도어 우측 ~ 우측 도어 전까지
  { start: [mbDoorEnd, -T2], end: [-WALL_THICKNESS - 0.9, -T2], thickness: WALL_THICKNESS },
  // 안방 상단벽 — 우측 도어 후 (공유벽 접합)
  { start: [-WALL_THICKNESS, -T2], end: [-T2, -T2], thickness: WALL_THICKNESS },
  // 안방 하단벽
  { start: [mbLeft - T2, LR_D + T2], end: [-T2, LR_D + T2], thickness: WALL_THICKNESS },

  // 안방욕실 우측벽 (새 공간까지 연장)
  { start: [mbDoorEnd + 0.1, -T2], end: [mbDoorEnd + 0.1, bath2TopWallZ], thickness: WALL_THICKNESS },
  // 안방욕실/맹지/아기방 좌측벽 (아기방 상단까지 연장)
  { start: [mbLeft - T2, -T2], end: [mbLeft - T2, babyTopWallZ], thickness: WALL_THICKNESS },
  // 안방욕실 상단벽 (안방욕실과 맹지 구분)
  { start: [mbLeft - T2, mbBathWallEnd], end: [mbDoorEnd + 0.1, mbBathWallEnd], thickness: WALL_THICKNESS },

  // 메인욕실 우측벽 — 상단 100mm (도어 위)
  { start: [bath2RightWallX, -T2], end: [bath2RightWallX, -WALL_THICKNESS - 0.1], thickness: WALL_THICKNESS },
  // 메인욕실 우측벽 — 도어 아래 ~ 아기방 하단
  { start: [bath2RightWallX, -WALL_THICKNESS - 0.1 - 0.9], end: [bath2RightWallX, babyBottom - 0.22], thickness: WALL_THICKNESS },
  // 아기방 우측벽 — 도어 위 (나머지)
  { start: [bath2RightWallX, babyBottom - 0.22 - 0.9], end: [bath2RightWallX, babyTopWallZ], thickness: WALL_THICKNESS },
  // 맹지/메인욕실 상단벽 (아기방과의 구분)
  { start: [mbLeft - T2, bath2TopWallZ], end: [bath2RightWallX, bath2TopWallZ], thickness: WALL_THICKNESS },
  // 아기방 상단벽
  { start: [mbLeft - T2, babyTopWallZ], end: [babyRightWallX, babyTopWallZ], thickness: WALL_THICKNESS },

  // 아기방 좌상단에서 계단형 벽
  // 1) 위로 947mm
  { start: [mbLeft - T2, babyTopWallZ], end: [mbLeft - T2, babyTopWallZ - 0.947], thickness: WALL_THICKNESS },
  // 2) 우측으로 373mm
  { start: [mbLeft - T2, babyTopWallZ - 0.947], end: [mbLeft - T2 + 0.373, babyTopWallZ - 0.947], thickness: WALL_THICKNESS },
  // 3) stair1Z+0.1 ~ stair3Z (아래로 100mm 연장)
  { start: [mbLeft - T2 + 0.373, babyTopWallZ - 0.947 + 0.1], end: [mbLeft - T2 + 0.373, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS },
  // 4) 우측으로 1774mm
  { start: [mbLeft - T2 + 0.373, babyTopWallZ - 0.847 - 0.486], end: [mbLeft - T2 + 0.373 + 1.774, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS },

  // 아기방 우측에서 위로 1119mm — 도어로 분할
  // 하단 (babyTopWallZ ~ 도어 시작): (1119-900)/2 = 109.5mm
  { start: [babyRightWallX, babyTopWallZ], end: [babyRightWallX, babyTopWallZ - 0.1095], thickness: WALL_THICKNESS },
  // 상단 (도어 끝 ~ 1119mm): 109.5mm
  { start: [babyRightWallX, babyTopWallZ - 1.0095], end: [babyRightWallX, babyTopWallZ - 1.119], thickness: WALL_THICKNESS },
  // 끝점에서 좌측으로 1217mm
  { start: [babyRightWallX, babyTopWallZ - 1.119], end: [babyRightWallX - 1.217, babyTopWallZ - 1.119], thickness: WALL_THICKNESS },
  // 919벽 위로 770mm 연장
  { start: [babyRightWallX, babyTopWallZ - 1.119], end: [babyRightWallX, babyTopWallZ - 1.119 - 0.770], thickness: WALL_THICKNESS },
  // 거기서 우측으로 2500mm
  { start: [babyRightWallX, babyTopWallZ - 1.119 - 0.770], end: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770], thickness: WALL_THICKNESS },
  // 2500mm 끝에서 아래로 795mm (내측 695 + 상단벽 100mm)
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770], end: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795], thickness: WALL_THICKNESS },
  // 695벽 끝에서 우측으로 2673mm
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795], thickness: WALL_THICKNESS },
  // 695벽 끝에서 아래로 1418mm (좌측)
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], thickness: WALL_THICKNESS },
  // 2673벽 끝에서 아래로 1418mm (우측)
  { start: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], thickness: WALL_THICKNESS },
  // 우측 1418벽 끝에서 아래로 429mm
  { start: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429], thickness: WALL_THICKNESS },
  // 429벽 끝에서 우측으로 (좌측 100mm 연장, 위로 100mm 이동)
  { start: [babyRightWallX + 2.500 + 2.673 - 0.1, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1], end: [LR_W + T2, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1], thickness: WALL_THICKNESS },
  // 현관 상단벽 ~ 방금 벽 수직 연결
  { start: [LR_W + T2, -T2 - 1.591], end: [LR_W + T2, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1], thickness: WALL_THICKNESS },
  // 1418끼리 하단 연결
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], thickness: WALL_THICKNESS },

  // 세탁실 연결벽 — 좌측 끝에서 우측 끝으로 (+100mm 우측)
  { start: [mbLeft - T2 + 0.473 + 1.774, babyTopWallZ - 0.847 - 0.486], end: [babyRightWallX - 1.217 + 0.1, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS },
  { start: [babyRightWallX - 1.217 + 0.1, babyTopWallZ - 0.847 - 0.486], end: [babyRightWallX - 1.217 + 0.1, babyTopWallZ - 1.119], thickness: WALL_THICKNESS },

  // 메인베란다 좌측벽
  { start: [mbLeft - T2, LR_D + T2], end: [mbLeft - T2, verandaWallEnd], thickness: WALL_THICKNESS },
  // 메인베란다 우측벽
  { start: [LR_W + T2, LR_D + T2], end: [LR_W + T2, verandaWallEnd], thickness: WALL_THICKNESS },
  // 메인베란다 하단벽 (전체 폭)
  { start: [mbLeft - T2, verandaWallEnd], end: [LR_W + T2, verandaWallEnd], thickness: WALL_THICKNESS },

  // === 공유벽 (안방 | 거실) ===
  { start: [-T2, -T2], end: [-T2, LR_D + T2], thickness: WALL_THICKNESS },

  // === 거실 ===
  // 거실 상단 — 좌측 450mm
  { start: [-T2, -T2], end: [0.450, -T2], thickness: WALL_THICKNESS },
  // 거실 상단 — 우측 1481mm
  { start: [LR_W - 1.481, -T2], end: [LR_W + T2, -T2], thickness: WALL_THICKNESS },
  // 거실 하단
  { start: [-T2, LR_D + T2], end: [LR_W + T2, LR_D + T2], thickness: WALL_THICKNESS },
  // 거실 우측벽
  { start: [LR_W + T2, -T2], end: [LR_W + T2, LR_D + T2], thickness: WALL_THICKNESS },
  // 거실 우측벽 위로 1591mm
  { start: [LR_W + T2, -T2], end: [LR_W + T2, -T2 - 1.591], thickness: WALL_THICKNESS },
  // 1591벽 상단에서 좌측으로 — 좌측 150mm 벽
  { start: [babyRightWallX + 2.555 - 0.1, -T2 - 1.591], end: [babyRightWallX + 2.555 - 0.1 + 0.250, -T2 - 1.591], thickness: WALL_THICKNESS },
  // 도어 우측 벽
  { start: [babyRightWallX + 2.555 - 0.1 + 0.250 + 0.900, -T2 - 1.591], end: [LR_W + T2, -T2 - 1.591], thickness: WALL_THICKNESS },
  // 상단벽 좌측에서 위로 3371mm (55mm 우측 이동)
  { start: [babyRightWallX + 2.555, -T2 - 1.591], end: [babyRightWallX + 2.555, -T2 - 1.591 - 3.371], thickness: WALL_THICKNESS },
]

export const doors: Opening[] = [
  // 안방 상단 도어 — 바깥(위)으로 열림, 경첩=551mm 지점
  {
    position: [(mbDoorHinge + mbDoorEnd) / 2, -T2],
    width: MB_DOOR_WIDTH,
    height: 2.1,
    sillHeight: 0,
    axis: 'x',
    type: 'door',
  },
  // 안방 상단 우측 도어 — 바깥(위)으로 열림, 우측 끝
  {
    position: [-WALL_THICKNESS - 0.45, -T2],
    width: MB_DOOR_WIDTH,
    height: 2.1,
    sillHeight: 0,
    axis: 'x',
    type: 'door',
  },
  // 아기방 우측 도어 — 바깥(우)으로 열림, 하단 220mm 지점
  {
    position: [bath2RightWallX, babyBottom - 0.22 - 0.45],
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    axis: 'z',
    type: 'door',
  },
  // 메인욕실 우측벽 도어 — 바깥(우)으로 열림, 내측 상단 100mm부터 900mm
  {
    position: [bath2RightWallX, -WALL_THICKNESS - 0.1 - 0.45],
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    axis: 'z',
    type: 'door',
  },
  // 복도/현관 상단벽 도어 — 안쪽(복도)으로 열림, 좌측 150mm부터 900mm
  {
    position: [babyRightWallX + 2.555 - 0.1 + 0.250 + 0.45, -T2 - 1.591],
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    axis: 'x',
    type: 'door',
  },
  // 세탁실 919벽 가운데 도어 — 바깥(우)으로 열림
  {
    position: [babyRightWallX, babyTopWallZ - 0.5595],
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    axis: 'z',
    type: 'door',
  },
]

// 도어 시각화용 데이터
export const doorArcs = [
  {
    hinge: [mbDoorHinge, 0] as [number, number],
    radius: MB_DOOR_WIDTH,
    openDirection: -1 as number,                        // Z 감소 (위)
    hingeEnd: 'left' as 'left' | 'right',
  },
  {
    hinge: [-WALL_THICKNESS - MB_DOOR_WIDTH, 0] as [number, number],   // 우측 도어 좌측 끝 (경첩)
    radius: MB_DOOR_WIDTH,
    openDirection: -1 as number,                        // Z 감소 (위)
    hingeEnd: 'left' as 'left' | 'right',
  },
  {
    hinge: [babyRight, babyBottom - 0.22 - 0.9] as [number, number],   // 아기방 우측 도어, 경첩=상단
    radius: 0.9,
    openDirection: 1 as number,                          // +X (바깥)
    hingeEnd: 'left' as 'left' | 'right',
    wallAxis: 'z' as 'x' | 'z',
    mirrorZ: true,
  },
  {
    hinge: [babyRight, babyTopWallZ - 1.0095] as [number, number],   // 세탁실 도어, 경첩=상단
    radius: 0.9,
    openDirection: 1 as number,                          // +X (바깥)
    hingeEnd: 'left' as 'left' | 'right',
    wallAxis: 'z' as 'x' | 'z',
    mirrorZ: true,
  },
  {
    hinge: [babyRight, -WALL_THICKNESS - 0.1 - 0.9] as [number, number],   // 메인욕실 도어, 경첩=하단, 복도(+X)로 열림
    radius: 0.9,
    openDirection: 1 as number,                          // +X (복도쪽)
    hingeEnd: 'left' as 'left' | 'right',
    wallAxis: 'z' as 'x' | 'z',
    mirrorZ: true,
  },
  {
    hinge: [babyRightWallX + 2.555 - 0.1 + 0.250, -T2 - 1.591] as [number, number],   // 복도 상단벽 도어, 경첩=좌측
    radius: 0.9,
    openDirection: -1 as number,                         // -Z (위, 주방 방향)
    hingeEnd: 'left' as 'left' | 'right',
  },
]
export const windows: Opening[] = []
