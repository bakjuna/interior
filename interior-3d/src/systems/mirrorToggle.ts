/**
 * 전역 거울 Reflector 활성 상태 — T 키로 토글.
 * default off. 구독자에게 변경 알림.
 */
type Listener = () => void
const listeners = new Set<Listener>()

export const mirrorState = {
  enabled: false,
  subscribe(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn) } },
  toggle() {
    mirrorState.enabled = !mirrorState.enabled
    listeners.forEach(fn => fn())
  },
}

/** React hook — mirrorState.enabled 변경 시 리렌더 */
import { useSyncExternalStore } from 'react'
export function useMirrorEnabled(): boolean {
  return useSyncExternalStore(
    mirrorState.subscribe,
    () => mirrorState.enabled,
  )
}
