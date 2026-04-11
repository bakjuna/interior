/**
 * 벽 충돌 시스템
 *
 * walls[] / doors[] / windows[] → 충돌 세그먼트로 변환.
 * - 풀높이 벽: blocker
 * - 린텔/창위 (bottomY > 0.5): skip
 * - 단차벽 (bottomY < 0): skip (floor bump)
 * - 낮은 spandrel (height < 0.5): skip (kerb, walkable)
 * - 창 spandrel (sill ≥ 0.5 아래 부분, height ≥ 0.5): blocker (난간 역할)
 * - passable 창문 (거실 풀창): 통과 — walls[]에 spandrel이 없으므로 자동
 * - 도어 갭: 닫힘 시만 blocker
 *
 * 좌표계: 2D (X, Z). Y는 무시.
 */

import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  LR_W,
  LR_D,
  MB_W,
  mbDoorHinge,
  mbDoorEnd,
  bath2RightWallX,
  babyBottom,
  babyRightWallX,
  babyTopWallZ,
  right1Z,
  walls,
  closets,
} from '../data/apartment'
import type { DoorId } from '../data/sectors'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

interface Segment {
  sx: number
  sz: number
  ex: number
  ez: number
}

interface DoorBlocker extends Segment {
  id: DoorId
}

// AABB → 4변 segment 변환
function aabbToSegments(cx: number, cz: number, hw: number, hd: number): Segment[] {
  const x0 = cx - hw, x1 = cx + hw, z0 = cz - hd, z1 = cz + hd
  return [
    { sx: x0, sz: z0, ex: x1, ez: z0 },  // 북
    { sx: x0, sz: z1, ex: x1, ez: z1 },  // 남
    { sx: x0, sz: z0, ex: x0, ez: z1 },  // 서
    { sx: x1, sz: z0, ex: x1, ez: z1 },  // 동
  ]
}

// --- 정적 벽 blocker (한 번만 빌드) ---
const staticBlockers: Segment[] = (() => {
  const out: Segment[] = []
  for (const w of walls) {
    const bottomY = w.bottomY ?? 0
    const height = w.height ?? WALL_HEIGHT
    if (bottomY < 0) continue              // 단차벽 (floor bump)
    if (bottomY > 0.5) continue            // 린텔/창 위
    if (height < 0.5) continue             // 낮은 kerb
    out.push({ sx: w.start[0], sz: w.start[1], ex: w.end[0], ez: w.end[1] })
  }

  // 붙박이장/수납장 AABB blocker
  for (const c of closets) {
    out.push(...aabbToSegments(c.position[0], c.position[2], c.size[0] / 2, c.size[2] / 2))
  }

  // 냉장고장 (Kitchen.tsx 좌표 기반)
  const kitLeft = babyRightWallX + T2
  const CAB_BACK_OFFSET = 0.12
  const fridgeD = 0.920  // Refrigerator.D
  const fridgeCabLeft = kitLeft + 0.050 - CAB_BACK_OFFSET
  const fridgeCabFront = fridgeCabLeft + fridgeD
  const fridgeCabX = (fridgeCabLeft + fridgeCabFront) / 2
  const fridgeBottomZ = (babyBottom - 0.22 - 0.9) - 0.020 + 0.030
  const fridgeW = 0.915
  const kimchiW = 0.600
  const f2Z = fridgeBottomZ - fridgeW / 2 - 0.060 - kimchiW / 2
  const groupZStart = f2Z - kimchiW / 2
  const groupZEnd = fridgeBottomZ
  const sideT = 0.040
  const outerZStart = groupZStart - sideT - 0.002
  const outerZEnd = groupZEnd + sideT
  out.push(...aabbToSegments(fridgeCabX, (outerZStart + outerZEnd) / 2, fridgeD / 2, (outerZEnd - outerZStart) / 2))

  // 키큰장 (냉장고장과 동일 깊이/X, Z는 2300벽 ~ 1119벽)
  const wall2300Z = babyTopWallZ - 1.119 - 0.770
  const tallZStart = wall2300Z + T2
  const tallZEnd = babyTopWallZ - T2 - 1.119
  const tallZCenter = (tallZStart + tallZEnd) / 2
  const tallZLen = tallZEnd - tallZStart
  out.push(...aabbToSegments(fridgeCabX, tallZCenter, fridgeD / 2, tallZLen / 2))

  return out
})()

// --- 도어 blocker (Phase 2에서 ApartmentModel ↔ doorOpen 동기화 후 사용) ---
// 각 도어의 갭을 닫는 가상 세그먼트. 중심 위치 기반.
function doorSeg(id: DoorId, cx: number, cz: number, axis: 'x' | 'z', width: number): DoorBlocker {
  const half = width / 2
  if (axis === 'x') {
    return { id, sx: cx - half, sz: cz, ex: cx + half, ez: cz }
  }
  return { id, sx: cx, sz: cz - half, ex: cx, ez: cz + half }
}

const DOOR_W = 0.9

// 열린 도어 통과 영역 — 도어 폭 좌우 30cm 추가, 벽 두께 통과 가능한 깊이.
// 플레이어가 이 박스 안에 있으면 모든 wall blocker 무시 (열린 도어 한정).
const PASSAGE_HALF_EXTEND = DOOR_W / 2 + 0.30
const PASSAGE_HALF_DEPTH = 0.40

export const doorBlockers: DoorBlocker[] = [
  doorSeg('mb-mbBath',       (mbDoorHinge + mbDoorEnd) / 2,                       -T2,                       'x', DOOR_W),
  doorSeg('mb-hall',         -WALL_THICKNESS - 0.45 - 0.009,                      -T2,                       'x', DOOR_W),
  doorSeg('mainBath-hall',   bath2RightWallX,                                     -WALL_THICKNESS - 0.1 - 0.45, 'z', DOOR_W),
  doorSeg('baby-hall',       bath2RightWallX,                                     babyBottom - 0.22 - 0.45,  'z', DOOR_W),
  doorSeg('laundry-kitchen', babyRightWallX,                                      babyTopWallZ - 0.5595,     'z', DOOR_W),
  doorSeg('work-hall',       babyRightWallX + 2.555 - 0.1 + 0.250 + 0.45,         -T2 - 1.591,               'x', DOOR_W),
  doorSeg('jungmun',         LR_W - 1.481,                                        -T2 - 1.591 + T2 + DOOR_W / 2, 'z', DOOR_W),
  doorSeg('cage-mainVeranda',     mbLeft + 1.340,                                 LR_D + WALL_THICKNESS + 1.308 / 2, 'z', DOOR_W),
  doorSeg('outdoor-mainVeranda',  0.870 + 2.000,                                  LR_D + WALL_THICKNESS + 1.308 / 2, 'z', DOOR_W),
]

// --- segment vs circle ---
function segCircleHit(seg: Segment, cx: number, cz: number, r: number): boolean {
  const dx = seg.ex - seg.sx
  const dz = seg.ez - seg.sz
  const lenSq = dx * dx + dz * dz
  if (lenSq < 1e-12) {
    const ddx = cx - seg.sx
    const ddz = cz - seg.sz
    return ddx * ddx + ddz * ddz < r * r
  }
  let t = ((cx - seg.sx) * dx + (cz - seg.sz) * dz) / lenSq
  if (t < 0) t = 0
  else if (t > 1) t = 1
  const px = seg.sx + t * dx
  const pz = seg.sz + t * dz
  const ddx = cx - px
  const ddz = cz - pz
  return ddx * ddx + ddz * ddz < r * r
}

/**
 * 플레이어가 열린 도어의 통과 영역(도어 폭 + 좌우 30cm, 벽 두께 ±40cm) 안에 있으면 true.
 * 안에 있으면 wall collision 무시 → 도어 옆 벽 jambs 에 끼지 않고 통과 가능.
 */
function inDoorPassage(
  cx: number,
  cz: number,
  doorOpen: Map<DoorId, boolean>,
): boolean {
  for (const d of doorBlockers) {
    if (doorOpen.get(d.id) !== true) continue
    const dcx = (d.sx + d.ex) / 2
    const dcz = (d.sz + d.ez) / 2
    const isAxisX = Math.abs(d.sz - d.ez) < 1e-6
    if (isAxisX) {
      if (Math.abs(cx - dcx) <= PASSAGE_HALF_EXTEND && Math.abs(cz - dcz) <= PASSAGE_HALF_DEPTH) return true
    } else {
      if (Math.abs(cx - dcx) <= PASSAGE_HALF_DEPTH && Math.abs(cz - dcz) <= PASSAGE_HALF_EXTEND) return true
    }
  }
  return false
}

function collides(
  cx: number,
  cz: number,
  effectiveR: number,
  doorOpen: Map<DoorId, boolean>,
): boolean {
  // 열린 도어의 통과 영역 내부에서는 wall blocker 무시
  const inPassage = inDoorPassage(cx, cz, doorOpen)
  if (!inPassage) {
    for (const s of staticBlockers) {
      if (segCircleHit(s, cx, cz, effectiveR)) return true
    }
  }
  for (const d of doorBlockers) {
    if (doorOpen.get(d.id) === true) continue
    if (segCircleHit(d, cx, cz, effectiveR)) return true
  }
  return false
}

/**
 * 축 분리 슬라이드: X 시도 → Z 시도. 한 축이 막히면 다른 축만 적용.
 * playerRadius: 플레이어 외곽 반지름 (벽 두께 보정은 내부에서 +T2)
 */
export function moveWithCollision(
  old: [number, number],
  desired: [number, number],
  doorOpen: Map<DoorId, boolean>,
  playerRadius = 0.25,
): [number, number] {
  const r = playerRadius + T2  // 벽 centerline과의 최소 거리
  let [x, z] = old

  // X axis
  const tryX = desired[0]
  if (!collides(tryX, z, r, doorOpen)) x = tryX

  // Z axis
  const tryZ = desired[1]
  if (!collides(x, tryZ, r, doorOpen)) z = tryZ

  return [x, z]
}
