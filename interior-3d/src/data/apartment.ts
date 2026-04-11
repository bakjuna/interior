/**
 * 은행현대 84㎡
 * 단위: 미터
 * 좌표계: X = 가로, Z = 세로, Y = 높이
 * 내측 치수 기준, 벽 중심은 내측 면에서 100mm 바깥
 */

export const WALL_HEIGHT = 2.2
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
  bottomY?: number  // 벽 하단 Y 위치 (기본 0)
  isBathroom?: boolean  // 화장실 벽 (타일)
  isBalcony?: boolean   // 베란다 벽 (콘크리트)
  tile?: 'bathWall'     // 별도 타일 텍스처
}

export interface Opening {
  position: [number, number]
  width: number
  height: number
  sillHeight: number
  axis: 'x' | 'z'
  type: 'door' | 'window'
  passable?: boolean   // 워크스루에서 통과 가능 (거실 풀창 등)
  double?: boolean     // 2중창 구조
}

export interface Room {
  name: string
  center: [number, number]
  size: [number, number]
  color: string
  floorY?: number  // 바닥 높이 (기본 0, 단내림 시 음수)
  floorTile?: 'porcelain' | 'entrance'  // 특수 바닥 타일
  tileSize?: number  // 타일 크기 (m, 기본 강마루)
}

const mbLeft = -WALL_THICKNESS - MB_W  // 안방 내측 좌측면 X

// 안방 상단 도어: 좌측 내측면 기준 551mm(경첩), 폭 900mm
export const mbDoorHinge = mbLeft + 0.551
export const mbDoorEnd = mbDoorHinge + 0.900
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
export const bath2RightWallX = bath2Right + T2  // 우측벽 중심
const bath2TopWallZ = bath2Bottom - T2          // 상단벽 중심

// 아기방 (맹지/메인욕실 위, 내측 3064 x 2713mm)
export const BABY_INNER_W = 3.064
export const BABY_INNER_D = 2.713
export const babyBottom = bath2TopWallZ - T2              // 기존 상단벽 윗면 (아기방 하단 내측)
export const babyTop = babyBottom - BABY_INNER_D
export const babyTopWallZ = babyTop - T2                  // 아기방 상단벽 중심
export const babyLeft = mbLeft                            // 안방 좌측 내측 = 아기방 좌측 내측
export const babyRight = mbLeft + BABY_INNER_W
export const babyBottomZ = babyBottom
export const babyRightWallX = babyRight + T2

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
  { name: '안방욕실', center: [(mbBathLeft + mbBathRight) / 2, (-WALL_THICKNESS + mbBathBottom) / 2], size: [mbBathInnerW, Math.abs(mbBathBottom) - WALL_THICKNESS], color: '#c5dbe8', floorY: -0.03, floorTile: 'bathWall', tileSize: 0.6 },
  { name: '메인욕실', center: [(bath2Left + bath2Right + 0.2) / 2 + 0.1, (bath2Top + bath2Bottom) / 2], size: [BATH2_INNER_W + 0.4, BATH2_INNER_D], color: '#d4dce8', floorY: -0.03, floorTile: 'bathWall', tileSize: 0.6 },
  { name: '아기방', center: [(babyLeft + babyRight + 0.2) / 2, (babyBottom + babyTop) / 2], size: [BABY_INNER_W + 0.2, BABY_INNER_D], color: '#f0e0f0' },
  // 세탁실 좌측 (373×747)
  { name: '세탁실좌', center: [(stairLeftX + T2 + stair2X + T2) / 2, (laundryBotZ - T2 + stair1Z + T2) / 2], size: [stair2X + T2 - (stairLeftX + T2), Math.abs((laundryBotZ - T2) - (stair1Z + T2))], color: '#e8e0d4', floorTile: 'porcelain' as const, tileSize: 0.3 },
  // 세탁실 중간 (1574×1233) — 태그 여기
  { name: '세탁실', center: [(stair2X + T2 + stair4endX - T2) / 2, (laundryBotZ - T2 + stair3Z + T2) / 2], size: [stair4endX - T2 - (stair2X + T2), Math.abs((laundryBotZ - T2) - (stair3Z + T2))], color: '#e8e0d4', floorTile: 'porcelain' as const, tileSize: 0.3 },
  // 세탁실 우측 (1117×919, 우측 200mm 확장)
  { name: '세탁실우', center: [(rightWallX - 1.217 + rightWallX - T2 + 0.2) / 2, (laundryBotZ - T2 + right1Z + T2) / 2], size: [rightWallX - T2 + 0.2 - (rightWallX - 1.217), Math.abs((laundryBotZ - T2) - (right1Z + T2))], color: '#e8e0d4', floorTile: 'porcelain' as const, tileSize: 0.3 },
  { name: '맹지', center: [(mbBathLeft + mbBathRight) / 2, (mbBathBottom + bath2Bottom) / 2], size: [mbBathInnerW, Math.abs(bath2Bottom - mbBathBottom)], color: '#999', hatched: true } as Room & { hatched: boolean },
  { name: '안방', center: [mbLeft + MB_W / 2, (-WALL_THICKNESS + LR_D) / 2], size: [MB_W, LR_D + WALL_THICKNESS], color: '#dce8d4' },
  { name: '거실', center: [LR_W / 2, (-WALL_THICKNESS + LR_D) / 2], size: [LR_W, LR_D + WALL_THICKNESS], color: '#f5e6d3' },
  // 거실~베란다 사이 벽 바닥 (벽 분리 시 갭 메꿈) — 북반=마루, 남반=타일
  { name: '', center: [LR_W / 2, LR_D + T2 / 2], size: [LR_W, T2], color: '#f5e6d3' },
  { name: '', center: [LR_W / 2, LR_D + T2 + T2 / 2], size: [LR_W, T2], color: '#e0e0e0', floorTile: 'porcelain' as const, tileSize: 0.3 },
  // 메인베란다 3분할
  { name: '새장', center: [(mbLeft + mbLeft + 1.340) / 2, (verandaTop + verandaBottom) / 2], size: [1.340, VERANDA_INNER_D], color: '#d4e8d4', floorTile: 'porcelain' as const, tileSize: 0.3 },
  { name: '메인베란다', center: [(mbLeft + 1.340 + 0.870 + 2.000) / 2, (verandaTop + verandaBottom) / 2], size: [0.870 + 2.000 - (mbLeft + 1.340), VERANDA_INNER_D], color: '#e0e0e0', floorTile: 'porcelain' as const, tileSize: 0.3 },
  { name: '실외기실', center: [(0.870 + 2.000 + LR_W) / 2, (verandaTop + verandaBottom) / 2], size: [LR_W - (0.870 + 2.000), VERANDA_INNER_D], color: '#d4d4e0', floorTile: 'porcelain' as const, tileSize: 0.3 },
  // 작업실베란다
  { name: '작업실베란다', center: [babyRightWallX + 2.500 + 2.673 / 2, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 / 2], size: [2.673, 1.418], color: '#e0e0e0', floorY: -0.002, floorTile: 'porcelain' as const, tileSize: 0.3 },
  // 현관 (복도까지 확장)
  { name: '현관', center: [(LR_W - 1.481 + LR_W + T2) / 2, -T2 - 1.591 / 2], size: [1.481 + T2, 1.591], color: '#d4c4a8', floorY: -0.03, floorTile: 'entrance', tileSize: 0.3 },
  // 작업실 (위로 329mm 확장, 아래 200mm 확장)
  { name: '작업실', center: [(babyRightWallX + 2.555 + T2 + LR_W) / 2, (-T2 - 1.591 - T2 + 0.2 + babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 - 0.2) / 2], size: [LR_W - (babyRightWallX + 2.555 + T2), Math.abs((-T2 - 1.591 - T2 + 0.2) - (babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 - 0.2))], color: '#d8e8d8' },
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
  // 안방 상단벽 — 도어 우측 ~ 우측 도어 전까지 (안방↔복도 도어 폭 + 양쪽 9mm 문선 = 18mm 확장)
  { start: [mbDoorEnd, -T2], end: [-WALL_THICKNESS - 0.9 - 0.018, -T2], thickness: WALL_THICKNESS },
  // 안방 상단벽 — 우측 도어 후 (공유벽 접합)
  { start: [-WALL_THICKNESS, -T2], end: [-T2, -T2], thickness: WALL_THICKNESS },
  // 안방 하단벽 — 창문으로 분할 (2장 분리: 남=베란다, 북=실크)
  // 좌측 벽 — 남면 (베란다)
  { start: [mbLeft - T2, LR_D + T2 + T2 / 2], end: [mbLeft + 1.340, LR_D + T2 + T2 / 2], thickness: T2, isBalcony: true },
  // 좌측 벽 — 북면 (실크)
  { start: [mbLeft - T2, LR_D + T2 - T2 / 2], end: [mbLeft + 1.340, LR_D + T2 - T2 / 2], thickness: T2 },
  // 우측 벽 — 남면 (베란다)
  { start: [mbLeft + 1.340 + 2.000, LR_D + T2 + T2 / 2], end: [-T2, LR_D + T2 + T2 / 2], thickness: T2, isBalcony: true },
  // 우측 벽 — 북면 (실크)
  { start: [mbLeft + 1.340 + 2.000, LR_D + T2 - T2 / 2], end: [-T2, LR_D + T2 - T2 / 2], thickness: T2 },
  // 창문 아래 — 남면 (베란다)
  { start: [mbLeft + 1.340, LR_D + T2 + T2 / 2], end: [mbLeft + 1.340 + 2.000, LR_D + T2 + T2 / 2], thickness: T2, height: 1.000, bottomY: 0, isBalcony: true },
  // 창문 아래 — 북면 (실크)
  { start: [mbLeft + 1.340, LR_D + T2 - T2 / 2], end: [mbLeft + 1.340 + 2.000, LR_D + T2 - T2 / 2], thickness: T2, height: 1.000, bottomY: 0 },
  // 창문 위 — 남면 (베란다)
  { start: [mbLeft + 1.340, LR_D + T2 + T2 / 2], end: [mbLeft + 1.340 + 2.000, LR_D + T2 + T2 / 2], thickness: T2, height: 0.450, bottomY: 1.750, isBalcony: true },
  // 창문 위 — 북면 (실크)
  { start: [mbLeft + 1.340, LR_D + T2 - T2 / 2], end: [mbLeft + 1.340 + 2.000, LR_D + T2 - T2 / 2], thickness: T2, height: 0.450, bottomY: 1.750 },

  // 안방욕실 우측벽 (새 공간까지 연장)
  { start: [mbDoorEnd + 0.1, -T2], end: [mbDoorEnd + 0.1, bath2TopWallZ], thickness: WALL_THICKNESS, isBathroom: true },
  // 안방욕실/맹지/아기방 좌측벽 (아기방 상단까지 연장)
  { start: [mbLeft - T2, -T2], end: [mbLeft - T2, babyTopWallZ], thickness: WALL_THICKNESS },
  // 안방욕실 상단벽 (안방욕실과 맹지 구분)
  { start: [mbLeft - T2, mbBathWallEnd], end: [mbDoorEnd + 0.1, mbBathWallEnd], thickness: WALL_THICKNESS, isBathroom: true },

  // 메인욕실 우측벽 — 상단 100mm (도어 위, 복도 공유벽 → 실크벽지)
  { start: [bath2RightWallX, -T2], end: [bath2RightWallX, -WALL_THICKNESS - 0.1], thickness: WALL_THICKNESS },
  // 메인욕실 우측벽 — 도어 아래 ~ 아기방 하단 (복도 공유벽 → 실크벽지)
  { start: [bath2RightWallX, -WALL_THICKNESS - 0.1 - 0.9], end: [bath2RightWallX, babyBottom - 0.22], thickness: WALL_THICKNESS },
  // 아기방 우측벽 — 도어 위 (나머지)
  { start: [bath2RightWallX, babyBottom - 0.22 - 0.9], end: [bath2RightWallX, babyTopWallZ], thickness: WALL_THICKNESS },
  // 맹지/메인욕실 상단벽 (아기방과의 구분)
  { start: [mbLeft - T2, bath2TopWallZ], end: [bath2RightWallX, bath2TopWallZ], thickness: WALL_THICKNESS },
  // 아기방 상단벽 — 창문으로 분할 (2장 분리: 북=세탁실 탄성코트, 남=아기방 실크)
  // 좌측 벽 — 북면 (세탁실)
  { start: [mbLeft - T2, babyTopWallZ - T2 / 2], end: [mbLeft + 0.486, babyTopWallZ - T2 / 2], thickness: T2, isBalcony: true },
  // 좌측 벽 — 남면 (아기방)
  { start: [mbLeft - T2, babyTopWallZ + T2 / 2], end: [mbLeft + 0.486, babyTopWallZ + T2 / 2], thickness: T2 },
  // 우측 벽 — 북면 (세탁실)
  { start: [mbLeft + 0.486 + 1.996, babyTopWallZ - T2 / 2], end: [babyRightWallX, babyTopWallZ - T2 / 2], thickness: T2, isBalcony: true },
  // 우측 벽 — 남면 (아기방)
  { start: [mbLeft + 0.486 + 1.996, babyTopWallZ + T2 / 2], end: [babyRightWallX, babyTopWallZ + T2 / 2], thickness: T2 },
  // 창문 아래 — 북면 (세탁실)
  { start: [mbLeft + 0.486, babyTopWallZ - T2 / 2], end: [mbLeft + 0.486 + 1.996, babyTopWallZ - T2 / 2], thickness: T2, height: 1.040, bottomY: 0, isBalcony: true },
  // 창문 아래 — 남면 (아기방)
  { start: [mbLeft + 0.486, babyTopWallZ + T2 / 2], end: [mbLeft + 0.486 + 1.996, babyTopWallZ + T2 / 2], thickness: T2, height: 1.040, bottomY: 0 },
  // 창문 위 — 북면 (세탁실)
  { start: [mbLeft + 0.486, babyTopWallZ - T2 / 2], end: [mbLeft + 0.486 + 1.996, babyTopWallZ - T2 / 2], thickness: T2, height: 0.450, bottomY: 1.750, isBalcony: true },
  // 창문 위 — 남면 (아기방)
  { start: [mbLeft + 0.486, babyTopWallZ + T2 / 2], end: [mbLeft + 0.486 + 1.996, babyTopWallZ + T2 / 2], thickness: T2, height: 0.450, bottomY: 1.750 },

  // 아기방 좌상단에서 계단형 벽 (세탁실 내벽 — 탄성코트)
  // 1) 위로 947mm
  { start: [mbLeft - T2, babyTopWallZ], end: [mbLeft - T2, babyTopWallZ - 0.947], thickness: WALL_THICKNESS, isBalcony: true },
  // 2) 우측으로 373mm
  { start: [mbLeft - T2, babyTopWallZ - 0.947], end: [mbLeft - T2 + 0.373, babyTopWallZ - 0.947], thickness: WALL_THICKNESS, isBalcony: true },
  // 3) stair1Z+0.1 ~ stair3Z (아래로 100mm 연장)
  { start: [mbLeft - T2 + 0.373, babyTopWallZ - 0.947 + 0.1], end: [mbLeft - T2 + 0.373, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS, isBalcony: true },
  // 4) 우측으로 1774mm — 가운데 창문 분할 (1300mm, 바닥 1000, 높이 700)
  // 좌측 벽 (전체 높이)
  { start: [mbLeft - T2 + 0.373, babyTopWallZ - 0.847 - 0.486], end: [mbLeft + 0.510, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS, isBalcony: true },
  // 우측 벽 (전체 높이)
  { start: [mbLeft + 0.510 + 1.300, babyTopWallZ - 0.847 - 0.486], end: [mbLeft - T2 + 0.373 + 1.774, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS, isBalcony: true },
  // 창문 아래 (1000mm)
  { start: [mbLeft + 0.510, babyTopWallZ - 0.847 - 0.486], end: [mbLeft + 0.510 + 1.300, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS, height: 1.000, bottomY: 0, isBalcony: true },
  // 창문 위 (500mm)
  { start: [mbLeft + 0.510, babyTopWallZ - 0.847 - 0.486], end: [mbLeft + 0.510 + 1.300, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS, height: 0.500, bottomY: 1.700, isBalcony: true },

  // 아기방 우측에서 위로 1119mm — 도어로 분할 (2장 분리: 서=세탁실 탄성코트, 동=아기방 실크)
  // 하단 — 서면 (세탁실)
  { start: [babyRightWallX - T2 / 2, babyTopWallZ], end: [babyRightWallX - T2 / 2, babyTopWallZ - 0.1095], thickness: T2, isBalcony: true },
  // 하단 — 동면 (아기방)
  { start: [babyRightWallX + T2 / 2, babyTopWallZ], end: [babyRightWallX + T2 / 2, babyTopWallZ - 0.1095], thickness: T2 },
  // 상단 — 서면 (세탁실)
  { start: [babyRightWallX - T2 / 2, babyTopWallZ - 1.0095], end: [babyRightWallX - T2 / 2, babyTopWallZ - 1.119], thickness: T2, isBalcony: true },
  // 상단 — 동면 (아기방)
  { start: [babyRightWallX + T2 / 2, babyTopWallZ - 1.0095], end: [babyRightWallX + T2 / 2, babyTopWallZ - 1.119], thickness: T2 },
  // 끝점에서 좌측으로 1217mm (탄성코트)
  { start: [babyRightWallX, babyTopWallZ - 1.119], end: [babyRightWallX - 1.217, babyTopWallZ - 1.119], thickness: WALL_THICKNESS, isBalcony: true },
  // 919벽 위로 770mm 연장 (2장 분리: 서=세탁실 탄성코트, 동=주방 실크)
  // 서면 (세탁실)
  { start: [babyRightWallX - T2 / 2, babyTopWallZ - 1.119], end: [babyRightWallX - T2 / 2, babyTopWallZ - 1.119 - 0.770], thickness: T2, isBalcony: true },
  // 동면 (주방)
  { start: [babyRightWallX + T2 / 2, babyTopWallZ - 1.119], end: [babyRightWallX + T2 / 2, babyTopWallZ - 1.119 - 0.770], thickness: T2 },
  // 2500mm 벽 — 창문으로 분할 (2300 내측 왼쪽부터 600mm, 폭 1500mm)
  // 좌측 벽 (전체 높이)
  { start: [babyRightWallX, babyTopWallZ - 1.119 - 0.770], end: [babyRightWallX + T2 + 1.000, babyTopWallZ - 1.119 - 0.770], thickness: WALL_THICKNESS },
  // 우측 벽 (전체 높이)
  { start: [babyRightWallX + T2 + 1.000 + 0.900, babyTopWallZ - 1.119 - 0.770], end: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770], thickness: WALL_THICKNESS },
  // 창문 아래 (높이 1030mm)
  { start: [babyRightWallX + T2 + 1.000, babyTopWallZ - 1.119 - 0.770], end: [babyRightWallX + T2 + 1.000 + 0.900, babyTopWallZ - 1.119 - 0.770], thickness: WALL_THICKNESS, height: 1.030, bottomY: 0 },
  // 창문 위 (높이 700mm, y=1500~2200)
  { start: [babyRightWallX + T2 + 1.000, babyTopWallZ - 1.119 - 0.770], end: [babyRightWallX + T2 + 1.000 + 0.900, babyTopWallZ - 1.119 - 0.770], thickness: WALL_THICKNESS, height: 0.700, bottomY: 1.500 },
  // 2500mm 끝에서 아래로 795mm (내측 695 + 상단벽 100mm)
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770], end: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795], thickness: WALL_THICKNESS },
  // 695벽 끝에서 우측으로 2673mm — 창문으로 분할
  // 좌측 벽 (전체 높이)
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.555 + T2 + 0.236, babyTopWallZ - 1.119 - 0.770 + 0.795], thickness: WALL_THICKNESS, isBalcony: true },
  // 우측 벽 (전체 높이)
  { start: [babyRightWallX + 2.555 + T2 + 0.236 + 1.996, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795], thickness: WALL_THICKNESS, isBalcony: true },
  // 창문 아래 (1000mm)
  { start: [babyRightWallX + 2.555 + T2 + 0.236, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.555 + T2 + 0.236 + 1.996, babyTopWallZ - 1.119 - 0.770 + 0.795], thickness: WALL_THICKNESS, height: 1.000, bottomY: 0, isBalcony: true },
  // 창문 위 (200mm)
  { start: [babyRightWallX + 2.555 + T2 + 0.236, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.555 + T2 + 0.236 + 1.996, babyTopWallZ - 1.119 - 0.770 + 0.795], thickness: WALL_THICKNESS, height: 0.200, bottomY: 2.000, isBalcony: true },
  // 695벽 끝에서 아래로 1418mm (좌측, 주방/작업실베란다 공유벽)
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], thickness: WALL_THICKNESS, isBalcony: true },
  // 2673벽 끝에서 아래로 1418mm (우측)
  { start: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], thickness: WALL_THICKNESS, isBalcony: true },
  // 우측 1418벽 끝에서 아래로 429mm (329 내측, 작업실 공유벽 → 실크벽지)
  { start: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429], thickness: WALL_THICKNESS },
  // 429벽 끝에서 우측으로 (좌측 100mm 연장, 위로 100mm 이동)
  { start: [babyRightWallX + 2.500 + 2.673 - 0.1, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1], end: [LR_W + T2, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1], thickness: WALL_THICKNESS },
  // 현관 상단벽 ~ 방금 벽 수직 연결
  { start: [LR_W + T2, -T2 - 1.591], end: [LR_W + T2, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + 0.429 - 0.1], thickness: WALL_THICKNESS },
  // 1418끼리 하단 연결 — 창문으로 분할 (2장 분리: 북=베란다 스터코, 남=작업실 실크)
  // 좌측 벽 — 북면 (베란다)
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 - T2 / 2], end: [babyRightWallX + 2.555 + T2 + 0.236, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 - T2 / 2], thickness: T2, isBalcony: true },
  // 좌측 벽 — 남면 (작업실)
  { start: [babyRightWallX + 2.500, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 / 2], end: [babyRightWallX + 2.555 + T2 + 0.236, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 / 2], thickness: T2 },
  // 우측 벽 — 북면 (베란다)
  { start: [babyRightWallX + 2.555 + T2 + 0.236 + 1.996, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 - T2 / 2], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 - T2 / 2], thickness: T2, isBalcony: true },
  // 우측 벽 — 남면 (작업실)
  { start: [babyRightWallX + 2.555 + T2 + 0.236 + 1.996, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 / 2], end: [babyRightWallX + 2.500 + 2.673, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 / 2], thickness: T2 },
  // 창문 위 — 북면 (베란다)
  { start: [babyRightWallX + 2.555 + T2 + 0.236, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 - T2 / 2], end: [babyRightWallX + 2.555 + T2 + 0.236 + 1.996, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 - T2 / 2], thickness: T2, height: 0.200, bottomY: 2.000, isBalcony: true },
  // 창문 위 — 남면 (작업실)
  { start: [babyRightWallX + 2.555 + T2 + 0.236, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 / 2], end: [babyRightWallX + 2.555 + T2 + 0.236 + 1.996, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 / 2], thickness: T2, height: 0.200, bottomY: 2.000 },

  // 세탁실 연결벽 — 좌측 끝에서 우측 끝으로 (+100mm 우측) (탄성코트)
  { start: [mbLeft - T2 + 0.473 + 1.774, babyTopWallZ - 0.847 - 0.486], end: [babyRightWallX - 1.217 + 0.1, babyTopWallZ - 0.847 - 0.486], thickness: WALL_THICKNESS, isBalcony: true },
  { start: [babyRightWallX - 1.217 + 0.1, babyTopWallZ - 0.847 - 0.486], end: [babyRightWallX - 1.217 + 0.1, babyTopWallZ - 1.119], thickness: WALL_THICKNESS, isBalcony: true },

  // 메인베란다 좌측벽
  { start: [mbLeft - T2, LR_D + T2], end: [mbLeft - T2, verandaWallEnd], thickness: WALL_THICKNESS, isBalcony: true },
  // 메인베란다 우측벽
  { start: [LR_W + T2, LR_D + T2], end: [LR_W + T2, verandaWallEnd], thickness: WALL_THICKNESS, isBalcony: true },
  // 메인베란다 하단벽 — 창문 2개로 분할
  // 1구간: 좌측 벽 (전체 높이)
  { start: [mbLeft - T2, verandaWallEnd], end: [mbLeft + 1.240, verandaWallEnd], thickness: WALL_THICKNESS, isBalcony: true },
  // 창문1 아래 (1000mm)
  { start: [mbLeft + 1.240, verandaWallEnd], end: [mbLeft + 1.240 + 2.200, verandaWallEnd], thickness: WALL_THICKNESS, height: 1.000, bottomY: 0, isBalcony: true },
  // 창문1 위 (450mm)
  { start: [mbLeft + 1.240, verandaWallEnd], end: [mbLeft + 1.240 + 2.200, verandaWallEnd], thickness: WALL_THICKNESS, height: 0.450, bottomY: 1.750, isBalcony: true },
  // 2구간: 중간 벽 (전체 높이)
  { start: [mbLeft + 1.240 + 2.200, verandaWallEnd], end: [0.470, verandaWallEnd], thickness: WALL_THICKNESS, isBalcony: true },
  // 창문2 아래 (100mm)
  { start: [0.470, verandaWallEnd], end: [0.470 + 2.800, verandaWallEnd], thickness: WALL_THICKNESS, height: 0.100, bottomY: 0, isBalcony: true },
  // 창문2 위 (200mm)
  { start: [0.470, verandaWallEnd], end: [0.470 + 2.800, verandaWallEnd], thickness: WALL_THICKNESS, height: 0.200, bottomY: 2.000, isBalcony: true },
  // 3구간: 우측 벽 (전체 높이)
  { start: [0.470 + 2.800, verandaWallEnd], end: [LR_W + T2, verandaWallEnd], thickness: WALL_THICKNESS, isBalcony: true },

  // === 공유벽 (안방 | 거실) ===
  { start: [-T2, -T2], end: [-T2, LR_D + T2], thickness: WALL_THICKNESS },

  // === 거실 ===
  // 거실 상단 — 좌측 450mm
  { start: [-T2, -T2], end: [0.450, -T2], thickness: WALL_THICKNESS },
  // 거실/복도 맞닿는 벽 800mm
  { start: [LR_W - 1.481 - 0.800, -T2], end: [LR_W - 1.481, -T2], thickness: WALL_THICKNESS },
  // 현관/거실 맞닿는 벽 1481mm (바닥까지)
  { start: [LR_W - 1.481, -T2], end: [LR_W + T2, -T2], thickness: WALL_THICKNESS },
  // 거실 하단 — 창문으로 분할 (2장 분리: 남=베란다, 북=실크)
  // 좌측 벽 — 남면 (베란다)
  { start: [-T2, LR_D + T2 + T2 / 2], end: [0.870, LR_D + T2 + T2 / 2], thickness: T2, isBalcony: true },
  // 좌측 벽 — 북면 (실크)
  { start: [-T2, LR_D + T2 - T2 / 2], end: [0.870, LR_D + T2 - T2 / 2], thickness: T2 },
  // 우측 벽 — 남면 (베란다)
  { start: [0.870 + 2.000, LR_D + T2 + T2 / 2], end: [LR_W + T2, LR_D + T2 + T2 / 2], thickness: T2, isBalcony: true },
  // 우측 벽 — 북면 (실크)
  { start: [0.870 + 2.000, LR_D + T2 - T2 / 2], end: [LR_W + T2, LR_D + T2 - T2 / 2], thickness: T2 },
  // 창문 위 — 남면 (베란다)
  { start: [0.870, LR_D + T2 + T2 / 2], end: [0.870 + 2.000, LR_D + T2 + T2 / 2], thickness: T2, height: 0.200, bottomY: 2.000, isBalcony: true },
  // 창문 위 — 북면 (실크)
  { start: [0.870, LR_D + T2 - T2 / 2], end: [0.870 + 2.000, LR_D + T2 - T2 / 2], thickness: T2, height: 0.200, bottomY: 2.000 },
  // 거실 우측벽
  { start: [LR_W + T2, -T2], end: [LR_W + T2, LR_D + T2], thickness: WALL_THICKNESS },
  // 거실 우측벽 위로 1591mm — 문으로 3분할
  // 하단 110mm (1481벽 내측~문 시작)
  { start: [LR_W + T2, -T2], end: [LR_W + T2, -T2 - T2 - 0.410], thickness: WALL_THICKNESS },
  // 상단 282mm (문 끝~2773벽)
  { start: [LR_W + T2, -T2 - T2 - 0.410 - 0.900], end: [LR_W + T2, -T2 - 1.591], thickness: WALL_THICKNESS },
  // 1591벽 상단에서 좌측으로 — 좌측 150mm 벽
  { start: [babyRightWallX + 2.555 - 0.1, -T2 - 1.591], end: [babyRightWallX + 2.555 - 0.1 + 0.250, -T2 - 1.591], thickness: WALL_THICKNESS },
  // 도어 우측 벽
  { start: [babyRightWallX + 2.555 - 0.1 + 0.250 + 0.900, -T2 - 1.591], end: [LR_W + T2, -T2 - 1.591], thickness: WALL_THICKNESS },
  // 상단벽 좌측에서 위로 3371mm (55mm 우측 이동)
  { start: [babyRightWallX + 2.555, -T2 - 1.591], end: [babyRightWallX + 2.555, -T2 - 1.591 - 3.371], thickness: WALL_THICKNESS },

  // === 상인방 (모든 문 위 100mm, y=2.1~2.2) ===
  // 안방욕실 문
  { start: [mbDoorHinge, -T2], end: [mbDoorEnd, -T2], thickness: WALL_THICKNESS, height: 0.1, bottomY: 2.1 },
  // 안방 우측 문 (상인방 — 도어 폭 + 양쪽 9mm 문선)
  { start: [-WALL_THICKNESS - 0.9 - 0.018, -T2], end: [-WALL_THICKNESS, -T2], thickness: WALL_THICKNESS, height: 0.1, bottomY: 2.1 },
  // 아기방 문
  { start: [bath2RightWallX, babyBottom - 0.22 - 0.9], end: [bath2RightWallX, babyBottom - 0.22], thickness: WALL_THICKNESS, height: 0.1, bottomY: 2.1 },
  // 메인욕실 문
  { start: [bath2RightWallX, -WALL_THICKNESS - 0.1 - 0.9], end: [bath2RightWallX, -WALL_THICKNESS - 0.1], thickness: WALL_THICKNESS, height: 0.1, bottomY: 2.1 },
  // 세탁실 문 상단 (2장 분리: 서=세탁실 탄성코트, 동=아기방 실크)
  { start: [babyRightWallX - T2 / 2, babyTopWallZ - 0.1095], end: [babyRightWallX - T2 / 2, babyTopWallZ - 1.0095], thickness: T2, height: 0.1, bottomY: 2.1, isBalcony: true },
  { start: [babyRightWallX + T2 / 2, babyTopWallZ - 0.1095], end: [babyRightWallX + T2 / 2, babyTopWallZ - 1.0095], thickness: T2, height: 0.1, bottomY: 2.1 },
  // 현관문
  { start: [LR_W + T2, -T2 - T2 - 0.410], end: [LR_W + T2, -T2 - T2 - 0.410 - 0.900], thickness: WALL_THICKNESS, height: 0.1, bottomY: 2.1 },
  // 복도 상단벽 문
  { start: [babyRightWallX + 2.555 - 0.1 + 0.250, -T2 - 1.591], end: [babyRightWallX + 2.555 - 0.1 + 0.250 + 0.9, -T2 - 1.591], thickness: WALL_THICKNESS, height: 0.1, bottomY: 2.1 },

  // === 단차벽 (화장실/현관 바닥 30mm 내림 경계, 10mm 두께) ===
  // 안방욕실 문 단차
  { start: [mbDoorHinge, -T2], end: [mbDoorEnd, -T2], thickness: 0.200, height: 0.03, bottomY: -0.03, tile: 'bathWall' as const },
  // 메인욕실 문 단차
  { start: [bath2RightWallX, -WALL_THICKNESS - 0.1], end: [bath2RightWallX, -WALL_THICKNESS - 0.1 - 0.9], thickness: 0.200, height: 0.03, bottomY: -0.03, tile: 'bathWall' as const },
  // 현관 경계 — 복도와 현관 사이
  { start: [LR_W - 1.481, -WALL_THICKNESS], end: [LR_W - 1.481, -T2 - 1.591 + T2], thickness: 0.01, height: 0.03, bottomY: -0.03 },
  // 현관문 단차
  { start: [LR_W + T2, -T2 - T2 - 0.410], end: [LR_W + T2, -T2 - T2 - 0.410 - 0.900], thickness: 0.01, height: 0.03, bottomY: -0.03 },
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
  // 현관 우측벽 도어 — 현관으로 열림, 1481벽 위 110mm부터 1000mm
  {
    position: [LR_W + T2, -T2 - T2 - 0.410 - 0.450],
    width: 0.9,
    height: 2.1,
    sillHeight: 0,
    axis: 'z',
    type: 'door',
  },
  // 복도/현관 상단벽 도어 — 안쪽(복도)으로 열림, 좌측 250mm부터 900mm
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
    // 안방욕실 문 — 경첩=동측 (mbDoorEnd), 욕실(-Z)으로 열림
    hinge: [mbDoorEnd, 0] as [number, number],
    radius: MB_DOOR_WIDTH,
    openDirection: -1 as number,                        // -Z (욕실)
    hingeEnd: 'right' as 'left' | 'right',
    mirrorX: true,
  },
  {
    // 안방 출입문 — 경첩=동측 (-WALL_THICKNESS), 안방 내측(+Z)으로 열림
    hinge: [-WALL_THICKNESS, 0] as [number, number],
    radius: MB_DOOR_WIDTH,
    openDirection: 1 as number,                         // +Z (안방)
    hingeEnd: 'right' as 'left' | 'right',
    mirrorX: true,
  },
  {
    // 아기방 문 — 경첩=상단(안방쪽), 아기방 내측(-X)으로 열림
    hinge: [babyRight, babyBottom - 0.22] as [number, number],
    radius: 0.9,
    openDirection: -1 as number,                          // -X (아기방 내측)
    hingeEnd: 'right' as 'left' | 'right',
    wallAxis: 'z' as 'x' | 'z',
    mirrorZ: false,
  },
  {
    // 세탁실 문 — 경첩=하단(아기방 상단벽쪽), 세탁실 내측(-X)으로 열림
    hinge: [babyRight, babyTopWallZ - 0.1095] as [number, number],
    radius: 0.9,
    openDirection: -1 as number,                          // -X (세탁실 내측)
    hingeEnd: 'right' as 'left' | 'right',
    wallAxis: 'z' as 'x' | 'z',
    mirrorZ: false,
  },
  {
    hinge: [babyRight, -WALL_THICKNESS - 0.1] as [number, number],   // 메인욕실 도어, 경첩=상단(안방쪽), 욕실(-X)로 열림
    radius: 0.9,
    openDirection: -1 as number,                          // -X (욕실 내측)
    hingeEnd: 'right' as 'left' | 'right',
    wallAxis: 'z' as 'x' | 'z',
    mirrorZ: false,
  },
  {
    hinge: [babyRightWallX + 2.555 - 0.1 + 0.250, -T2 - 1.591] as [number, number],   // 복도 상단벽 도어, 경첩=좌측
    radius: 0.9,
    openDirection: -1 as number,                         // -Z (위, 주방 방향)
    hingeEnd: 'left' as 'left' | 'right',
  },
  {
    hinge: [LR_W, -T2 - T2 - 0.410 - 0.900] as [number, number],   // 현관문, 경첩=하단(282mm 쪽), 현관(-X)으로 열림
    radius: 0.9,
    openDirection: -1 as number,                             // -X (현관쪽)
    hingeEnd: 'left' as 'left' | 'right',
    wallAxis: 'z' as 'x' | 'z',
    mirrorZ: true,
  },
]
export const windows: Opening[] = [
  // 주방 2300벽 창문 (900mm 폭, 470mm 높이, 바닥에서 1030mm)
  {
    position: [babyRightWallX + T2 + 1.000 + 0.450, babyTopWallZ - 1.119 - 0.770],
    width: 0.900,
    height: 0.470,
    sillHeight: 1.030,
    axis: 'x',
    type: 'window',
  },
  // 아기방 상단벽 창문 (1996mm 폭, 710mm 높이, 바닥에서 1040mm)
  {
    position: [mbLeft + 0.486 + 0.998, babyTopWallZ],
    width: 1.996,
    height: 0.710,
    sillHeight: 1.040,
    axis: 'x',
    type: 'window',
  },
  // 작업실/작업실베란다 사이 창문 (1996mm 폭, 2000mm 높이, 바닥에서 0mm) — 2중창
  {
    position: [babyRightWallX + 2.555 + T2 + 0.236 + 0.998, babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418],
    width: 1.996,
    height: 2.000,
    sillHeight: 0,
    axis: 'x',
    type: 'window',
    double: true,
  },
  // 거실 하단 창문 (2000mm 폭, 2000mm 높이, 바닥에서 0mm)
  {
    position: [0.870 + 1.000, LR_D + T2],
    width: 2.000,
    height: 2.000,
    sillHeight: 0,
    axis: 'x',
    type: 'window',
    passable: true,
  },
  // 안방 하단 창문 (2000mm 폭, 750mm 높이, 바닥에서 1000mm)
  {
    position: [mbLeft + 1.340 + 1.000, LR_D + T2],
    width: 2.000,
    height: 0.750,
    sillHeight: 1.000,
    axis: 'x',
    type: 'window',
  },
  // 세탁실 1574벽 가운데 창문 (1300mm 폭, 700mm 높이, 바닥 1000mm)
  {
    position: [mbLeft + 0.510 + 0.650, babyTopWallZ - 0.847 - 0.486],
    width: 1.300,
    height: 0.700,
    sillHeight: 1.000,
    axis: 'x',
    type: 'window',
  },
  // 작업실베란다 상단벽 창문 (1996mm 폭, 1000mm 높이, 바닥 1000mm)
  {
    position: [babyRightWallX + 2.555 + T2 + 0.236 + 0.998, babyTopWallZ - 1.119 - 0.770 + 0.795],
    width: 1.996,
    height: 1.000,
    sillHeight: 1.000,
    axis: 'x',
    type: 'window',
  },
  // 메인베란다 하단 창문1 — 안방 맞은편 (2200mm 폭, 750mm 높이, 바닥 1000mm)
  {
    position: [mbLeft + 1.240 + 1.100, verandaWallEnd],
    width: 2.200,
    height: 0.750,
    sillHeight: 1.000,
    axis: 'x',
    type: 'window',
  },
  // 메인베란다 하단 창문2 — 거실 맞은편 (2800mm 폭, 1900mm 높이, 바닥 100mm)
  {
    position: [0.470 + 1.400, verandaWallEnd],
    width: 2.800,
    height: 1.900,
    sillHeight: 0.100,
    axis: 'x',
    type: 'window',
  },
]

// 붙박이장/수납공간
export interface Closet {
  name: string
  position: [number, number, number]  // [x, y, z] center
  size: [number, number, number]      // [width(X), height(Y), depth(Z)]
  color: string
  openShelf?: {                        // 오픈 선반 영역
    bottomY: number                    // 하단 Y
    topY: number                       // 상단 Y
    startDoor: number                  // 시작 문짝 인덱스 (0-based)
    endDoor: number                    // 끝 문짝 인덱스 (exclusive)
  }
  handleFlipDoors?: number[]           // 손잡이 반대방향 문짝 인덱스
  dividerDepth?: number  // 칸막이 깊이 오버라이드
  doorGroups?: Array<{ doorId: import('../data/sectors').DoorId, doors: number[], flipHinge?: boolean, shelfYs?: number[], sliding?: boolean, slideDir?: number }>
}

export const closets: Closet[] = [
  // 안방 좌측 벽 붙박이장 (3066 × 550, 첫 600mm = 화장대 - 화장실 인접)
  // 높이를 50mm 줄여 천장 plane 과의 z-fighting 방지
  {
    name: '붙박이장',
    position: [mbLeft + 0.275, (WALL_HEIGHT - 0.050) / 2, (0.6 + LR_D) / 2],
    size: [0.550, WALL_HEIGHT - 0.050, LR_D - 0.6],
    color: '#8B6914',
    doorGroups: [
      { doorId: 'closet-mb-0', doors: [0, 1] },
      { doorId: 'closet-mb-1', doors: [2, 3] },
      { doorId: 'closet-mb-2', doors: [4], flipHinge: true },
    ],
  },
  // 거실 수납장 — 안방/거실 공유벽, 거실쪽 (3666 × 450)
  {
    name: '수납장',
    position: [0 + 0.225, (WALL_HEIGHT - 0.050) / 2, LR_D / 2],
    size: [0.450, WALL_HEIGHT - 0.050, LR_D],
    color: '#8B6914',
    openShelf: { bottomY: 0.84, topY: 1.34, startDoor: 1, endDoor: 5 },
    doorGroups: [
      { doorId: 'closet-lr-0', doors: [0], shelfYs: [0.43, 0.84, 1.34, 1.745] },
      { doorId: 'closet-lr-1', doors: [1, 2], shelfYs: [0.28, 0.56, 1.745] },
      { doorId: 'closet-lr-2', doors: [3, 4], shelfYs: [0.28, 0.56, 1.745] },
      { doorId: 'closet-lr-3', doors: [5], flipHinge: true, shelfYs: [0.43, 0.84, 1.34, 1.745] },
    ],
  },
  // 아기방 좌측 벽 수납장 (2563 × 450, 각 150mm 축소)
  {
    name: '수납장',
    position: [babyLeft + 0.250, (WALL_HEIGHT - 0.050) / 2, (babyBottom + babyTop) / 2],
    size: [0.500, WALL_HEIGHT - 0.050, BABY_INNER_D - 0.150],
    color: '#8B6914',
    dividerDepth: 0.460,
    doorGroups: [
      { doorId: 'closet-baby-0', doors: [0], sliding: true, slideDir: 1 },   // 남→북 슬라이딩
      { doorId: 'closet-baby-1', doors: [1], sliding: true, slideDir: -1 },  // 북→남 슬라이딩
      { doorId: 'closet-baby-2', doors: [2], sliding: true, slideDir: 1 },   // 남→북
      { doorId: 'closet-baby-3', doors: [3], sliding: true, slideDir: -1 },  // 북→남
    ],
  },
]

// 다운라이트: 각 방 4코너 × 2개 = 8개
// 300mm 벽(또는 붙박이장)에서 띄움
// 상하 위치는 방 깊이를 5등분하여 1/5, 2/5, 3/5, 4/5 지점
interface DownlightRoom {
  leftX: number   // 좌측 벽/붙박이장 내측
  rightX: number  // 우측 벽 내측
  topZ: number    // 상단 내측 (작은 Z)
  bottomZ: number // 하단 내측 (큰 Z)
}

function generateDownlights(room: DownlightRoom): [number, number][] {
  const lx = room.leftX + 0.3
  const rx = room.rightX - 0.3
  // topZ < bottomZ (topZ가 더 음수 = 화면 상단)
  // 방 안쪽: topZ에서 +, bottomZ에서 -
  const isNormalZ = room.topZ < room.bottomZ
  const t1 = isNormalZ ? room.topZ + 0.3 : room.topZ - 0.3
  const t2 = isNormalZ ? room.topZ + 0.6 : room.topZ - 0.6
  const b1 = isNormalZ ? room.bottomZ - 0.3 : room.bottomZ + 0.3
  const b2 = isNormalZ ? room.bottomZ - 0.6 : room.bottomZ + 0.6
  return [
    [lx, t1], [lx, t2],   // 좌상단 2
    [lx, b1], [lx, b2],   // 좌하단 2
    [rx, t1], [rx, t2],   // 우상단 2
    [rx, b1], [rx, b2],   // 우하단 2
  ]
}

export interface DownlightGroup {
  bounds: DownlightRoom  // 방 영역 (플레이어 위치 판별용)
  lights: [number, number][]
}

export const downlightGroups: DownlightGroup[] = [
  { bounds: { leftX: mbLeft, rightX: -WALL_THICKNESS, topZ: 0, bottomZ: LR_D },
    lights: (() => {
      // 안방 가장 좌측 컬럼: 붙박이장 문(mbLeft + 0.550)과 가벽 중심(mbLeft + 1.476)의 중간점
      // 가벽 오른쪽 컬럼: 가벽 중심 기준 좌측 컬럼과 동일 거리로 대칭
      // 방 우측 컬럼: 공유벽(-WALL_THICKNESS)에서 300mm 안쪽 (변경 없음)
      const closetFaceX = mbLeft + 0.550
      const partitionX = mbLeft + 1.476
      const leftColX = (closetFaceX + partitionX) / 2          // = mbLeft + 1.013
      const rightColX = partitionX + (partitionX - leftColX)   // = mbLeft + 1.939
      const farRightColX = -WALL_THICKNESS - 0.3
      // Z 위치는 generateDownlights와 동일한 규칙 사용
      const t1 = 0 + 0.3, t2 = 0 + 0.6
      const b1 = LR_D - 0.3, b2 = LR_D - 0.6
      return [
        // 가장 좌측 컬럼 (붙박이장 문 ↔ 가벽 중간)
        [leftColX, t1], [leftColX, t2],
        [leftColX, b1], [leftColX, b2],
        // 가벽 오른쪽 컬럼 (가벽 중심 기준 대칭)
        [rightColX, t1], [rightColX, t2],
        [rightColX, b1], [rightColX, b2],
        // 방 우측(공유벽쪽) 컬럼
        [farRightColX, t1], [farRightColX, t2],
        [farRightColX, b1], [farRightColX, b2],
      ]
    })() },
  { bounds: { leftX: 0, rightX: LR_W, topZ: 0, bottomZ: LR_D },
    lights: generateDownlights({ leftX: 0.450, rightX: LR_W, topZ: 0, bottomZ: LR_D }) },
  { bounds: { leftX: babyLeft, rightX: babyRight, topZ: babyTop, bottomZ: babyBottom },
    lights: generateDownlights({ leftX: babyLeft + 0.600, rightX: babyRight, topZ: babyTop, bottomZ: babyBottom }) },
  // 세탁실 다운라이트 제거 — 스폿라이트로 대체
  { bounds: { leftX: babyRightWallX + 2.555, rightX: LR_W + T2, topZ: -T2 - 1.591 - T2, bottomZ: babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 + 0.2 },
    lights: generateDownlights({ leftX: babyRightWallX + 2.555 + T2, rightX: LR_W, topZ: -T2 - 1.591 - T2, bottomZ: babyTopWallZ - 1.119 - 0.770 + 0.795 + 1.418 + T2 }) },
  // 복도 — 메인욕실 문 앞 다운라이트 1개
  { bounds: { leftX: babyRightWallX + T2, rightX: LR_W - 1.481, topZ: -WALL_THICKNESS, bottomZ: -T2 - 1.591 + T2 },
    lights: [[babyRightWallX + T2 + 0.45, -WALL_THICKNESS - 0.1 - 0.45], [babyRightWallX + T2 + 0.45 + 0.3, -WALL_THICKNESS - 0.1 - 0.45],
      [(babyRightWallX + 2.555 - 0.1 + 0.250 + (babyRightWallX + 2.555 - 0.1 + 0.250 + 0.900)) / 2, (-WALL_THICKNESS + (-T2 - 1.591 + T2)) / 2]] },
  // 현관 — 신발장 전면(-WALL_THICKNESS - 0.400)과 맞은편 벽(-T2-1.591) 정확히 중앙
  // X 는 신발장 xCenter (= LR_W - 1.476 + 1.470/2 = LR_W - 0.741)
  { bounds: { leftX: LR_W - 1.481, rightX: LR_W + T2, topZ: -WALL_THICKNESS, bottomZ: -T2 - 1.591 + T2 },
    lights: [[
      LR_W - 1.476 + 1.470 / 2,
      (-WALL_THICKNESS - 0.400 + (-T2 - 1.591)) / 2,
    ]] },
  // 주방 — ㄱ자 조명으로 대체 (세탁실/아기방 도어 앞 300mm 다운라이트 2개)
  { bounds: { leftX: babyRightWallX + T2, rightX: babyRightWallX + 2.500 - T2, topZ: babyTopWallZ - 1.119 - 0.770 + T2, bottomZ: -T2 - 1.591 + T2 },
    lights: [
      [babyRightWallX + T2 + 0.3, babyTopWallZ - 0.5595],   // 세탁실 도어 앞 300mm
      [babyRightWallX + T2 + 0.3, babyBottom - 0.22 - 0.45], // 아기방 도어 앞 300mm
    ] },
  // 안방욕실 — 가운데 다운라이트 1개
  { bounds: { leftX: mbLeft, rightX: mbDoorEnd + 0.1 - T2, topZ: -WALL_THICKNESS - MB_BATH_INNER_D, bottomZ: -WALL_THICKNESS },
    lights: [[(mbLeft + mbDoorEnd + 0.1 - T2) / 2, (-WALL_THICKNESS + (-WALL_THICKNESS - MB_BATH_INNER_D)) / 2]] },
  // 메인욕실 — 가운데 다운라이트 1개
  { bounds: { leftX: mbDoorEnd + 0.1 + T2, rightX: mbDoorEnd + 0.1 + T2 + BATH2_INNER_W, topZ: -WALL_THICKNESS - BATH2_INNER_D, bottomZ: -WALL_THICKNESS },
    lights: [[(mbDoorEnd + 0.1 + T2 + mbDoorEnd + 0.1 + T2 + BATH2_INNER_W) / 2, (-WALL_THICKNESS + (-WALL_THICKNESS - BATH2_INNER_D)) / 2]] },
]

// 전체 다운라이트 (평면도/조감도용)
export const downlights: [number, number][] = downlightGroups.flatMap(g => g.lights)
