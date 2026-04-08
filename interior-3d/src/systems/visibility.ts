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
    if (x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ) return a.sector
  }
  return null
}

export function computeVisibleSectors(
  playerPos: [number, number] | undefined,
  doorOpen: Map<DoorId, boolean>,
): Set<SectorId> {
  if (!playerPos) return new Set(ALL_SECTORS)

  const start = findSector(playerPos[0], playerPos[1])
  if (!start) return new Set(ALL_SECTORS)  // 외부 → 전체 (안전)

  // 인접 그래프
  const visible = new Set<SectorId>([start])
  const queue: SectorId[] = [start]
  while (queue.length) {
    const cur = queue.shift()!
    for (const p of portals) {
      const isOpen = p.doorId === undefined || doorOpen.get(p.doorId) === true
      if (!isOpen) continue
      let next: SectorId | null = null
      if (p.a === cur) next = p.b
      else if (p.b === cur) next = p.a
      if (next && !visible.has(next)) {
        visible.add(next)
        queue.push(next)
      }
    }
  }
  return visible
}
