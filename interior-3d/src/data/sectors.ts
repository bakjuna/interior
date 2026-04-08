/**
 * Sector / Portal / Door 토폴로지 (visibility + collision 용)
 *
 * - 14개 sector AABB. 작은 sector 우선순으로 정렬 (findSector가 첫 매칭 반환).
 * - L자형 방(세탁실 등)은 여러 box.
 * - Portal: sector간 연결. doorId 없으면 always-open (창문/오픈 통로).
 */

import {
  WALL_THICKNESS,
  MB_W,
  LR_W,
  LR_D,
  mbDoorEnd,
  mbBathLeft,
  mbBathRight,
  mbBathBottom,
  mbBathTop,
  bath2RightWallX,
  babyLeft,
  babyRight,
  babyTop,
  babyBottom,
  babyTopWallZ,
  babyRightWallX,
  stairLeftX,
  stair1Z,
  stair2X,
  stair3Z,
  stair4endX,
  rightWallX,
  right1Z,
  laundryBotZ,
  verandaInnerD,
} from './apartment'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W
const bath2Left = mbDoorEnd + 0.1 + T2
const bath2Right = bath2RightWallX - T2
const bath2Bottom = -WALL_THICKNESS - 2.173
const bath2Top = -WALL_THICKNESS
const verandaTop = LR_D + WALL_THICKNESS
const verandaBottom = verandaTop + verandaInnerD
const workVerandaTopZ = babyTopWallZ - 1.119 - 0.770 + 0.795
const workVerandaBotZ = workVerandaTopZ + 1.418

export type SectorId =
  | 'mb'
  | 'mbBath'
  | 'mainBath'
  | 'baby'
  | 'laundry'
  | 'kitchen'
  | 'lr'
  | 'entrance'
  | 'hall'
  | 'work'
  | 'workVeranda'
  | 'mainVeranda'
  | 'cage'
  | 'outdoor'

export type DoorId =
  | 'mb-hall'
  | 'mb-mbBath'
  | 'mainBath-hall'
  | 'baby-hall'
  | 'laundry-kitchen'
  | 'work-hall'
  | 'jungmun'
  | 'cage-mainVeranda'
  | 'outdoor-mainVeranda'

export interface SectorAABB {
  sector: SectorId
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

/**
 * findSector가 위에서부터 검사 → 작은 sector 먼저.
 * mb / lr 같은 큰 방은 마지막.
 */
export const sectorAABBs: SectorAABB[] = [
  // --- 작은 sector 먼저 ---
  { sector: 'cage', minX: mbLeft, maxX: mbLeft + 1.340, minZ: verandaTop, maxZ: verandaBottom },
  { sector: 'outdoor', minX: 0.870 + 2.000, maxX: LR_W, minZ: verandaTop, maxZ: verandaBottom },
  { sector: 'mainVeranda', minX: mbLeft + 1.340, maxX: 0.870 + 2.000, minZ: verandaTop, maxZ: verandaBottom },

  { sector: 'mbBath', minX: mbBathLeft, maxX: mbBathRight, minZ: mbBathBottom, maxZ: mbBathTop },
  { sector: 'mainBath', minX: bath2Left, maxX: bath2Right, minZ: bath2Bottom, maxZ: bath2Top },

  { sector: 'baby', minX: babyLeft, maxX: babyRight, minZ: babyTop, maxZ: babyBottom },

  // 세탁실 L자 (3-box)
  { sector: 'laundry', minX: stairLeftX + T2, maxX: stair2X + T2, minZ: stair1Z + T2, maxZ: laundryBotZ - T2 },
  { sector: 'laundry', minX: stair2X + T2, maxX: stair4endX - T2, minZ: stair3Z + T2, maxZ: laundryBotZ - T2 },
  { sector: 'laundry', minX: rightWallX - 1.217, maxX: rightWallX - T2 + 0.2, minZ: right1Z + T2, maxZ: laundryBotZ - T2 },

  { sector: 'workVeranda', minX: babyRightWallX + 2.500, maxX: babyRightWallX + 2.500 + 2.673, minZ: workVerandaTopZ, maxZ: workVerandaBotZ },
  { sector: 'entrance', minX: LR_W - 1.481, maxX: LR_W + T2, minZ: -T2 - 1.591, maxZ: -T2 },
  { sector: 'hall', minX: babyRightWallX + T2, maxX: LR_W - 1.481, minZ: -T2 - 1.591 + T2, maxZ: -WALL_THICKNESS },
  { sector: 'kitchen', minX: babyRightWallX + T2, maxX: babyRightWallX + 2.555 - T2, minZ: babyTopWallZ - 1.119 - 0.770 + T2, maxZ: -T2 - 1.591 + T2 },
  { sector: 'work', minX: babyRightWallX + 2.555 + T2, maxX: LR_W, minZ: -T2 - 1.591 - T2 + 0.2, maxZ: workVerandaBotZ + T2 - 0.2 },

  // --- 큰 방 마지막 ---
  { sector: 'mb', minX: mbLeft, maxX: -WALL_THICKNESS, minZ: -WALL_THICKNESS, maxZ: LR_D },
  { sector: 'lr', minX: 0, maxX: LR_W, minZ: -WALL_THICKNESS, maxZ: LR_D },
]

export interface Portal {
  a: SectorId
  b: SectorId
  doorId?: DoorId  // 없으면 always-open (창/오픈 통로)
}

export const portals: Portal[] = [
  // --- always-open (창문/오픈 통로) ---
  { a: 'hall', b: 'lr' },
  { a: 'hall', b: 'kitchen' },
  { a: 'mb', b: 'mainVeranda' },
  { a: 'lr', b: 'mainVeranda' },
  { a: 'work', b: 'workVeranda' },

  // --- 도어 통과 ---
  { a: 'mb', b: 'hall', doorId: 'mb-hall' },
  { a: 'mb', b: 'mbBath', doorId: 'mb-mbBath' },
  { a: 'mainBath', b: 'hall', doorId: 'mainBath-hall' },
  { a: 'baby', b: 'hall', doorId: 'baby-hall' },
  { a: 'laundry', b: 'kitchen', doorId: 'laundry-kitchen' },
  { a: 'work', b: 'hall', doorId: 'work-hall' },
  { a: 'entrance', b: 'hall', doorId: 'jungmun' },
  { a: 'cage', b: 'mainVeranda', doorId: 'cage-mainVeranda' },
  { a: 'outdoor', b: 'mainVeranda', doorId: 'outdoor-mainVeranda' },
]

export const ALL_SECTORS: readonly SectorId[] = [
  'mb', 'mbBath', 'mainBath', 'baby', 'laundry', 'kitchen',
  'lr', 'entrance', 'hall', 'work', 'workVeranda',
  'mainVeranda', 'cage', 'outdoor',
] as const
