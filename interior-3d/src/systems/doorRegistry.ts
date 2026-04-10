/**
 * 도어 레지스트리 — 모든 활성 도어가 자기 자신을 등록.
 *
 * WalkthroughView 의 매 프레임 루프가 카메라 forward 와 가장 가까운 도어 1개를 선택
 * (각도 우선, 거리 보조). 선택된 도어만 툴팁 표시 + F 키로 토글.
 */

import type { DoorId, SectorId } from '../data/sectors'
import { portals } from '../data/sectors'

export interface DoorEntry {
  id: DoorId
  position: [number, number]  // [x, z] 도어 중심
  /** 선택: 도어 중심 Y. 지정 시 picker 가 3D 시선을 사용해 vertically stacked 도어를 구분. */
  y?: number
  toggle: () => void
}

const entries = new Map<DoorId, DoorEntry>()
// 등록/해제 시 bump → pickActiveDoor 캐시 무효화
let entriesVersion = 0

export const doorRegistry = {
  register(entry: DoorEntry) {
    entries.set(entry.id, entry)
    entriesVersion++
  },
  unregister(id: DoorId) {
    entries.delete(id)
    entriesVersion++
  },
  get(id: DoorId): DoorEntry | undefined {
    return entries.get(id)
  },
  list(): DoorEntry[] {
    return Array.from(entries.values())
  },
}

// always-open 포탈로 연결된 sector 그래프 (BFS 확장용)
const alwaysOpenAdj = new Map<SectorId, Set<SectorId>>()
for (const p of portals) {
  if (p.doorId) continue // doorId 없는 포탈만 = always-open
  if (p.visualOnly) continue // 베란다 창문 등 시각 전용 제외
  if (!alwaysOpenAdj.has(p.a)) alwaysOpenAdj.set(p.a, new Set())
  if (!alwaysOpenAdj.has(p.b)) alwaysOpenAdj.set(p.b, new Set())
  alwaysOpenAdj.get(p.a)!.add(p.b)
  alwaysOpenAdj.get(p.b)!.add(p.a)
}

function expandThroughOpenPortals(sectors: Set<SectorId>): Set<SectorId> {
  const result = new Set(sectors)
  const queue = [...sectors]
  while (queue.length) {
    const cur = queue.pop()!
    for (const nb of alwaysOpenAdj.get(cur) ?? []) {
      if (!result.has(nb)) { result.add(nb); queue.push(nb) }
    }
  }
  return result
}

// doorId → 인터랙션 가능한 sector 집합 (portal 기반 + always-open 확장)
const doorAllowedSectors = new Map<DoorId, Set<SectorId>>()
for (const p of portals) {
  if (!p.doorId) continue
  let set = doorAllowedSectors.get(p.doorId)
  if (!set) { set = new Set(); doorAllowedSectors.set(p.doorId, set) }
  set.add(p.a)
  set.add(p.b)
}
// always-open 포탈을 통해 연결된 sector 도 허용
for (const [doorId, sectors] of doorAllowedSectors) {
  doorAllowedSectors.set(doorId, expandThroughOpenPortals(sectors))
}

// pickActiveDoor 결과 캐시 — 카메라가 거의 안 움직였으면 직전 결과 재사용.
// FPSController 에서 매 프레임 호출되지만 결과가 바뀌는 빈도는 낮음.
let _cacheVersion = -1
let _cacheCamX = 0
let _cacheCamY = 0
let _cacheCamZ = 0
let _cacheFwdX = 0
let _cacheFwdY = 0
let _cacheFwdZ = 0
let _cacheSector: SectorId | null = null
let _cacheResult: DoorId | null = null
const POS_EPS_SQ = 0.01 * 0.01   // 1cm 미만이면 캐시 hit
const FWD_EPS_SQ = 0.05 * 0.05   // dot product 변화 ~5% 이내 → 약 2.86°

/**
 * 카메라 위치 + 정면 방향에서 가장 시야 중앙에 가까운 도어 선택.
 * - 거리 maxDist 이내 + dot ≥ minDot (시야각 제한)
 * - 점수: 각도 우선(-dot) + 거리 보조 → 최소 점수 = best
 *
 * camY/fwdY 는 vertically stacked 도어(예: 키큰장 3 단 drawer)를 picking 하기 위해 사용.
 * 도어가 y 를 등록한 경우 3D 시선을 쓰고, 그렇지 않으면 2D 만으로 점수 계산.
 */
export function pickActiveDoor(
  camX: number,
  camZ: number,
  fwdX: number,
  fwdZ: number,
  camY: number = 0,
  fwdY: number = 0,
  maxDist: number = 2.5,
  minDot: number = 0.5,
  playerSector: SectorId | null = null,
): DoorId | null {
  // 캐시 hit: 도어 셋이 동일 + 카메라/시선이 미세하게만 변했으면 재계산 skip
  if (_cacheVersion === entriesVersion && _cacheSector === playerSector) {
    const dx = camX - _cacheCamX
    const dy = camY - _cacheCamY
    const dz = camZ - _cacheCamZ
    const dfx = fwdX - _cacheFwdX
    const dfy = fwdY - _cacheFwdY
    const dfz = fwdZ - _cacheFwdZ
    if (
      dx * dx + dy * dy + dz * dz < POS_EPS_SQ &&
      dfx * dfx + dfy * dfy + dfz * dfz < FWD_EPS_SQ
    ) {
      return _cacheResult
    }
  }

  let best: { id: DoorId; score: number } | null = null
  for (const d of entries.values()) {
    // portal 에 등록된 door 는 인접 sector 에서만 인터랙션 허용
    if (playerSector) {
      const allowed = doorAllowedSectors.get(d.id)
      if (allowed && !allowed.has(playerSector)) continue
    }
    const dx = d.position[0] - camX
    const dz = d.position[1] - camZ
    const dy = d.y !== undefined ? d.y - camY : 0   // y 미지정 → 2D fallback
    const dist = d.y !== undefined
      ? Math.sqrt(dx * dx + dy * dy + dz * dz)
      : Math.hypot(dx, dz)
    if (dist < 1e-4) continue
    if (dist > maxDist) continue
    const ndx = dx / dist
    const ndz = dz / dist
    const dot = d.y !== undefined
      ? ndx * fwdX + (dy / dist) * fwdY + ndz * fwdZ
      : ndx * fwdX + ndz * fwdZ
    if (dot < minDot) continue
    // 각도 우선, 거리 보조
    const score = -dot * 10 + dist
    if (!best || score < best.score) best = { id: d.id, score }
  }

  _cacheVersion = entriesVersion
  _cacheCamX = camX
  _cacheCamY = camY
  _cacheCamZ = camZ
  _cacheFwdX = fwdX
  _cacheFwdY = fwdY
  _cacheFwdZ = fwdZ
  _cacheSector = playerSector
  _cacheResult = best?.id ?? null
  return _cacheResult
}
