/**
 * 도어 레지스트리 — 모든 활성 도어가 자기 자신을 등록.
 *
 * WalkthroughView 의 매 프레임 루프가 카메라 forward 와 가장 가까운 도어 1개를 선택
 * (각도 우선, 거리 보조). 선택된 도어만 툴팁 표시 + F 키로 토글.
 */

import type { DoorId, SectorId } from '../data/sectors'
import { portals, sectorAABBs } from '../data/sectors'

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

/**
 * 상호 배제 — 한 도어가 열리려 할 때 mutex 파트너들이 먼저 닫힘.
 * 닫힘 애니메이션 후 새 도어가 열림 (순차).
 * 다중 파트너 지원: Map<DoorId, Set<DoorId>>
 */
const mutexPartners = new Map<DoorId, Set<DoorId>>()
function registerMutex(a: DoorId, b: DoorId) {
  if (!mutexPartners.has(a)) mutexPartners.set(a, new Set())
  if (!mutexPartners.has(b)) mutexPartners.set(b, new Set())
  mutexPartners.get(a)!.add(b)
  mutexPartners.get(b)!.add(a)
}
const MUTEX_CLOSE_DELAY_MS = 800   // 닫힘 애니메이션 여유 시간
// 욕실 거울장
registerMutex('bath-mirror-n', 'bath-mirror-s')
registerMutex('mb-bath-mirror-l', 'mb-bath-mirror-r')
// 아기방 붙박이 (북쪽 쌍 / 남쪽 쌍)
registerMutex('closet-baby-0', 'closet-baby-1')
registerMutex('closet-baby-2', 'closet-baby-3')
// 냉장고/김냉 상호배제
// Group A: 냉동실 우 ↔ 김냉 중단 서랍 ↔ 김냉 하단 서랍 (3-way mutex)
registerMutex('fridge-br', 'kimchi-drawer-mid')
registerMutex('fridge-br', 'kimchi-drawer-bot')
registerMutex('kimchi-drawer-mid', 'kimchi-drawer-bot')
// Group B: 냉장실 우 ↔ 김냉 상 좌
registerMutex('fridge-tr', 'kimchi-tl')
// Group C: 냉동실 우 ↔ 김냉 상 좌
registerMutex('fridge-br', 'kimchi-tl')

export const doorRegistry = {
  register(entry: DoorEntry) {
    // mutex 래핑: self 가 OPEN 되는 경우에만 파트너 닫기 → 닫힘 모션 후 self 열기
    const originalToggle = entry.toggle
    const wrappedToggle = () => {
      const self = entry as DoorEntry & { _isOpen?: boolean }
      const selfIsOpen = self._isOpen === true
      // self 가 닫히는 경우 (이미 열려있었음) — 그냥 닫기
      if (selfIsOpen) {
        originalToggle()
        return
      }
      // self 가 열리는 경우 — mutex 파트너 중 열려있는 것들 모두 닫기
      const partners = mutexPartners.get(entry.id)
      let anyPartnerClosing = false
      if (partners) {
        for (const pid of partners) {
          const partnerEntry = entries.get(pid) as (DoorEntry & { _isOpen?: boolean }) | undefined
          if (partnerEntry && partnerEntry._isOpen) {
            partnerEntry.toggle()
            anyPartnerClosing = true
          }
        }
      }
      if (anyPartnerClosing) {
        // 닫힘 모션 여유 후 self 열기
        setTimeout(() => originalToggle(), MUTEX_CLOSE_DELAY_MS)
      } else {
        originalToggle()
      }
    }
    entry.toggle = wrappedToggle
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
  /** 컴포넌트가 isOpen 상태를 레지스트리에 동기화 */
  setOpenState(id: DoorId, isOpen: boolean) {
    const entry = entries.get(id) as DoorEntry & { _isOpen?: boolean } | undefined
    if (entry) entry._isOpen = isOpen
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

function findDoorSector(x: number, z: number): SectorId | null {
  for (const a of sectorAABBs) {
    const zLo = Math.min(a.minZ, a.maxZ)
    const zHi = Math.max(a.minZ, a.maxZ)
    if (x >= a.minX && x <= a.maxX && z >= zLo && z <= zHi) return a.sector
  }
  return null
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
// 개별 오버라이드: 주방에서 아기방문 열기 가능
doorAllowedSectors.get('baby-hall')?.add('kitchen')
// 현관 신발장 — 현관 + 복도에서 열기 가능
doorAllowedSectors.set('shoe-mirror', new Set(['entrance', 'hall']))
doorAllowedSectors.set('shoe-doors', new Set(['entrance', 'hall']))
// 메인욕실 거울 수납장
doorAllowedSectors.set('bath-mirror-n', new Set(['mainBath']))
doorAllowedSectors.set('bath-mirror-s', new Set(['mainBath']))
// 안방욕실 거울 수납장
doorAllowedSectors.set('mb-bath-mirror-l', new Set(['mbBath']))
doorAllowedSectors.set('mb-bath-mirror-r', new Set(['mbBath']))
// 주방 식탁 의자 — 복도에서도 빼기/넣기 가능 (예외)
doorAllowedSectors.set('kitchen-chair-nl', new Set(['kitchen', 'hall']))
doorAllowedSectors.set('kitchen-chair-nr', new Set(['kitchen', 'hall']))
doorAllowedSectors.set('kitchen-chair-sl', new Set(['kitchen', 'hall']))
doorAllowedSectors.set('kitchen-chair-sr', new Set(['kitchen', 'hall']))
// 4도어 냉장고 — 주방에서만
doorAllowedSectors.set('fridge-tl', new Set(['kitchen']))
doorAllowedSectors.set('fridge-tr', new Set(['kitchen']))
doorAllowedSectors.set('fridge-bl', new Set(['kitchen']))
doorAllowedSectors.set('fridge-br', new Set(['kitchen']))
// 김치냉장고 상단 2도어 + 중/하단 서랍
doorAllowedSectors.set('kimchi-tl', new Set(['kitchen']))
doorAllowedSectors.set('kimchi-tr', new Set(['kitchen']))
doorAllowedSectors.set('kimchi-drawer-mid', new Set(['kitchen']))
doorAllowedSectors.set('kimchi-drawer-bot', new Set(['kitchen']))

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
    // sector 기반 인터랙션 필터
    if (playerSector) {
      let allowed = doorAllowedSectors.get(d.id)
      if (!allowed) {
        // portal 미등록 door → 위치 기반 sector 판별 (확장 없이 자기 sector만)
        const doorSector = findDoorSector(d.position[0], d.position[1])
        if (doorSector) {
          allowed = new Set([doorSector])
          doorAllowedSectors.set(d.id, allowed)
        }
      }
      if (allowed && !allowed.has(playerSector)) continue
      if (!allowed) continue  // sector 불명 → 접근 불가
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
