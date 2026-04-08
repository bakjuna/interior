/**
 * 도어 레지스트리 — 모든 활성 도어가 자기 자신을 등록.
 *
 * WalkthroughView 의 매 프레임 루프가 카메라 forward 와 가장 가까운 도어 1개를 선택
 * (각도 우선, 거리 보조). 선택된 도어만 툴팁 표시 + F 키로 토글.
 */

import type { DoorId } from '../data/sectors'

export interface DoorEntry {
  id: DoorId
  position: [number, number]  // [x, z] 도어 중심
  toggle: () => void
}

const entries = new Map<DoorId, DoorEntry>()

export const doorRegistry = {
  register(entry: DoorEntry) {
    entries.set(entry.id, entry)
  },
  unregister(id: DoorId) {
    entries.delete(id)
  },
  get(id: DoorId): DoorEntry | undefined {
    return entries.get(id)
  },
  list(): DoorEntry[] {
    return Array.from(entries.values())
  },
}

/**
 * 카메라 위치 + 정면 방향에서 가장 시야 중앙에 가까운 도어 선택.
 * - 거리 maxDist 이내 + dot ≥ minDot (시야각 제한)
 * - 점수: 각도 우선(-dot) + 거리 보조 → 최소 점수 = best
 */
export function pickActiveDoor(
  camX: number,
  camZ: number,
  fwdX: number,
  fwdZ: number,
  maxDist: number = 2.5,
  minDot: number = 0.5,
): DoorId | null {
  let best: { id: DoorId; score: number } | null = null
  for (const d of entries.values()) {
    const dx = d.position[0] - camX
    const dz = d.position[1] - camZ
    const dist = Math.hypot(dx, dz)
    if (dist < 1e-4) continue
    if (dist > maxDist) continue
    const ndx = dx / dist
    const ndz = dz / dist
    const dot = ndx * fwdX + ndz * fwdZ
    if (dot < minDot) continue
    // 각도 우선, 거리 보조
    const score = -dot * 10 + dist
    if (!best || score < best.score) best = { id: d.id, score }
  }
  return best?.id ?? null
}
