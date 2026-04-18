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
  | 'entrance'                    // 현관문
  | 'kitchen-drawer'              // 밥솥 서랍
  | 'kitchen-drawer-south'        // 남쪽 서랍
  | 'kitchen-tiny'                // 짜투리 서랍
  | 'kitchen-pet-pass-n'          // 펫도어 북쪽
  | 'kitchen-pet-pass-s'          // 펫도어 남쪽
  | 'kitchen-tall-pantry'         // 팬트리
  | 'closet-mb-0'                 // 북쪽 안방 붙박이
  | 'closet-mb-1'                 // 중간 안방 붙박이
  | 'closet-mb-2'                 // 남쪽 안방 붙박이
  | 'closet-baby-0'               // 북쪽 아기방 붙박이 오른쪽
  | 'closet-baby-1'               // 북쪽 아기방 붙박이 왼쪽
  | 'closet-baby-2'               // 남쪽 아기방 붙박이 오른쪽
  | 'closet-baby-3'               // 남쪽 아기방 붙박이 왼쪽
  | 'closet-lr-0'                 // 북쪽 키큰장
  | 'closet-lr-1'                 // 북쪽 2단 분할
  | 'closet-lr-2'                 // 남쪽 2단 분할
  | 'closet-lr-3'                 // 남쪽 키큰장
  | 'kitchen-lc-north'            // 정수기 하단
  | 'kitchen-lc-cab12'            // 인덕션 하단
  | 'kitchen-lc-sink'             // 싱크 하단
  | 'kitchen-lc-cab3'             // 코너 하단
  | 'kitchen-fridge-uc-0'         // 냉장고 상부 #1
  | 'kitchen-fridge-uc-1'         // 냉장고 상부 #2
  | 'kitchen-tall-lower'          // 키큰장 하단
  | 'kitchen-tall-upper'          // 키큰장 상단
  | 'kitchen-uc-purifier'         // 정수기 상부
  | 'kitchen-uc-0'                // 북쪽 상부장
  | 'kitchen-uc-1'                // 중간 상부장
  | 'kitchen-uc-2'                // 남쪽 상부장
  | 'shoe-mirror'                 // 신발장 거울
  | 'shoe-doors'                  // 신발장
  | 'bath-mirror-n'               // 욕실 거울장 좌
  | 'bath-mirror-s'               // 욕실 거울장 우
  | 'mb-bath-mirror-l'            // 안방욕실 거울장 좌
  | 'mb-bath-mirror-r'            // 안방욕실 거울장 우
  | 'mb-vanity'                   // 화장대 서랍장
  | 'mb-vanity-mirror'            // 화장대 거울 도어
  | 'mb-bookshelf-lower'          // 하버드 책장 하단 양개 간살 도어
  | 'mb-nightstand'               // 침대 북쪽 협탁 서랍
  | 'lr-curtain'                  // 거실 2단 커튼 (쉬어/암막)
  | 'mb-curtain'                  // 안방 2단 커튼 (쉬어/암막)
  | 'mv-cabinet'                  // 메인베란다 흰색 양개 캐비닛
  | 'baby-blind'                  // 아기방 원목 블라인드
  | 'work-blind'                  // 작업실 원목 블라인드
  | 'kitchen-chair-nl'            // 주방 의자 북측 좌
  | 'kitchen-chair-nr'            // 주방 의자 북측 우
  | 'kitchen-chair-sl'            // 주방 의자 남측 좌
  | 'kitchen-chair-sr'            // 주방 의자 남측 우
  | 'fridge-tl'                   // 4도어 냉장고 상단 좌 (냉장)
  | 'fridge-tr'                   // 4도어 냉장고 상단 우 (냉장)
  | 'fridge-bl'                   // 4도어 냉장고 하단 좌 (냉동)
  | 'fridge-br'                   // 4도어 냉장고 하단 우 (냉동)
  | 'kimchi-tl'                   // 김치냉장고 상단 좌
  | 'kimchi-tr'                   // 김치냉장고 상단 우
  | 'kimchi-drawer-mid'           // 김치냉장고 중단 서랍
  | 'kimchi-drawer-bot'           // 김치냉장고 하단 서랍

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
  doorId?: DoorId   // 없으면 always-open (창/오픈 통로)
  visualOnly?: boolean  // true 면 시각/렌더에는 통과하지만 라이트(litSectors)는 전파 안 함
                        // (베란다 창문처럼 보이긴 해도 'G 전체 불'에는 포함 안 됨)
  seeThroughClosed?: boolean  // true: 도어가 닫혀있어도 시각적으로는 통과 (유리 도어 — 중문).
                              // 이때는 닫힌 상태에서도 visualOnly hop 1회로 취급되어
                              // 라이트는 전파 안 됨, 메쉬만 렌더.
}

export const portals: Portal[] = [
  // --- always-open 오픈 통로 (라이트 + 시각 모두 전파) ---
  { a: 'hall', b: 'lr' },
  { a: 'hall', b: 'kitchen' },
  // --- 베란다 창문 (시각만 전파, 라이트 그룹에는 미포함) ---
  { a: 'mb', b: 'mainVeranda', visualOnly: true },
  { a: 'lr', b: 'mainVeranda', visualOnly: true },
  { a: 'work', b: 'workVeranda', visualOnly: true },

  // --- 도어 통과 ---
  { a: 'mb', b: 'hall', doorId: 'mb-hall' },
  { a: 'mb', b: 'mbBath', doorId: 'mb-mbBath' },
  { a: 'mainBath', b: 'hall', doorId: 'mainBath-hall' },
  { a: 'baby', b: 'hall', doorId: 'baby-hall' },
  { a: 'laundry', b: 'kitchen', doorId: 'laundry-kitchen' },
  { a: 'work', b: 'hall', doorId: 'work-hall' },
  { a: 'entrance', b: 'hall', doorId: 'jungmun', seeThroughClosed: true },
  { a: 'cage', b: 'mainVeranda', doorId: 'cage-mainVeranda' },
  { a: 'outdoor', b: 'mainVeranda', doorId: 'outdoor-mainVeranda' },
]

export const ALL_SECTORS: readonly SectorId[] = [
  'mb', 'mbBath', 'mainBath', 'baby', 'laundry', 'kitchen',
  'lr', 'entrance', 'hall', 'work', 'workVeranda',
  'mainVeranda', 'cage', 'outdoor',
] as const
