/**
 * Sector visibility (portal culling)
 * - playerPos가 있으면 BFS로 connected sector 집합 반환
 * - playerPos === undefined → 전체 (조감도/평면도 호환)
 */

import {
  ALL_SECTORS,
  portals,
  sectorAABBs,
  type DoorId,
  type SectorId,
} from '../data/sectors'

export function findSector(x: number, z: number): SectorId | null {
  for (const a of sectorAABBs) {
    const zLo = Math.min(a.minZ, a.maxZ)
    const zHi = Math.max(a.minZ, a.maxZ)
    if (x >= a.minX && x <= a.maxX && z >= zLo && z <= zHi) return a.sector
  }
  return null
}

/**
 * BFS — 시각 + 라이트 통합. visualOnly portal (베란다 창문 등)은 한 경로에서
 * 최대 1번만 통과 가능. 즉 mb → mainVeranda(창) → lr(창) 같은 2-hop은 차단.
 *
 * 결과로 시각/라이트 모두 같은 set 사용:
 *  - 안방에서 도어 닫고 → {mb, mainVeranda} (mainVeranda 까지만, lr 차단)
 *  - 안방에서 도어 열고 → {mb, hall, lr, kitchen, mainVeranda}
 *  - 거실에서 → {lr, hall, kitchen, mainVeranda}
 */
export function computeVisibleSectors(
  playerPos: [number, number] | undefined,
  doorOpen: Map<DoorId, boolean>,
  maxVisualHops: number = 1,
): Set<SectorId> {
  if (!playerPos) return new Set(ALL_SECTORS)

  const start = findSector(playerPos[0], playerPos[1])
  if (!start) return new Set(ALL_SECTORS)

  // sector → 도달 가능한 최소 visualOnly hop 수
  const minHops = new Map<SectorId, number>([[start, 0]])
  const queue: Array<[SectorId, number]> = [[start, 0]]

  while (queue.length) {
    const [cur, hops] = queue.shift()!
    for (const p of portals) {
      const isOpen = p.doorId === undefined || doorOpen.get(p.doorId) === true
      // 유리 도어(seeThroughClosed): 닫혀 있어도 시각적으로는 통과 가능 → visualOnly hop 으로 취급
      const isSeeThroughClosed = !isOpen && p.seeThroughClosed === true
      if (!isOpen && !isSeeThroughClosed) continue
      let next: SectorId | null = null
      if (p.a === cur) next = p.b
      else if (p.b === cur) next = p.a
      if (!next) continue

      // visualOnly portal 또는 유리 도어 통과는 1 hop 소비
      const isVisualHop = p.visualOnly === true || isSeeThroughClosed
      const newHops = hops + (isVisualHop ? 1 : 0)
      if (newHops > maxVisualHops) continue

      const prev = minHops.get(next)
      if (prev === undefined || newHops < prev) {
        minHops.set(next, newHops)
        queue.push([next, newHops])
      }
    }
  }
  return new Set(minHops.keys())
}
