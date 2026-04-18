/**
 * 전역 거울 Reflector 활성 상태 — T 키로 토글. default ON.
 * 전역 ON일 때, 각 거울은 플레이어 sector 기반 정책으로 가시성 결정.
 */
import { useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { findSector } from './visibility'
import type { SectorId } from '../data/sectors'

type Listener = () => void
const listeners = new Set<Listener>()

export const mirrorState = {
  enabled: true,
  subscribe(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn) } },
  toggle() {
    mirrorState.enabled = !mirrorState.enabled
    listeners.forEach(fn => fn())
  },
}

/** React hook — mirrorState.enabled 변경 시 리렌더 */
export function useMirrorEnabled(): boolean {
  return useSyncExternalStore(
    mirrorState.subscribe,
    () => mirrorState.enabled,
  )
}

export type MirrorId = 'mainBath' | 'shoeCabinet' | 'jungmun' | 'masterBath'

/**
 * 거울별 "활성 sector" 정책. 플레이어가 이 sector 중 하나에 있을 때만 렌더.
 */
const MIRROR_SECTOR_POLICY: Record<MirrorId, SectorId[]> = {
  mainBath: ['entrance', 'hall', 'mainBath'],
  shoeCabinet: ['entrance', 'hall'],
  jungmun: ['kitchen', 'hall'],
  masterBath: ['mb', 'mbBath'],
}

/**
 * 거울 렌더 여부 판정 — 전역 ON + 플레이어가 허용 sector에 위치.
 * playerPos 없으면(prewarm/조감도 등) 거울 비활성 — prewarm 시 Reflector 대량 활성화 방지.
 */
export function isMirrorActiveFor(id: MirrorId, playerPos?: [number, number]): boolean {
  if (!mirrorState.enabled) return false
  if (!playerPos) return false
  const sector = findSector(playerPos[0], playerPos[1])
  if (!sector) return false
  return MIRROR_SECTOR_POLICY[id].includes(sector)
}

/** 전역 토글 변경 시 리렌더 + sector 정책 적용된 활성 여부 반환 */
export function useMirrorActive(id: MirrorId, playerPos?: [number, number]): boolean {
  useMirrorEnabled()
  return isMirrorActiveFor(id, playerPos)
}

/**
 * Reflector가 카메라에 실제로 보이는지 per-frame 판정.
 * 1) XZ 거리 컷오프
 * 2) 카메라 frustum (bounding sphere)
 * 3) 전면(front-face) 체크 — 거울 normal(+Z local)이 카메라→거울 벡터와 반대 방향이어야 정면
 */
const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _frustum = new THREE.Frustum()
const _m4 = new THREE.Matrix4()
const _sphere = new THREE.Sphere()

/**
 * Reflector 재귀 렌더 방지 — 마주보는 거울이 서로의 reflection을 계속 재렌더해
 * 프레임당 O(N²)+ 의 scene render 가 발생하는 현상을 차단.
 * depth ≥ 1 이면 중첩 Reflector 의 reflection 재생성을 skip (이전 프레임 텍스처 사용).
 * 결과: 프레임당 거울 1개당 최대 1회 scene render (마주봄 상관 없이).
 */
let _reflectionDepth = 0

export function makeNonRecursiveReflector<T extends THREE.Object3D & { onBeforeRender: THREE.Object3D['onBeforeRender'] }>(reflector: T): T {
  const orig = reflector.onBeforeRender
  reflector.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    if (_reflectionDepth >= 1) return
    _reflectionDepth++
    try {
      orig.call(this, renderer, scene, camera, geometry, material, group)
    } finally {
      _reflectionDepth--
    }
  }
  return reflector
}

export function isReflectorVisible(
  obj: THREE.Object3D,
  camera: THREE.Camera,
  maxDistance = 12,
  sphereRadius = 1.2,
): boolean {
  obj.getWorldPosition(_v1)
  const dx = _v1.x - camera.position.x
  const dz = _v1.z - camera.position.z
  if (dx * dx + dz * dz > maxDistance * maxDistance) return false

  _m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  _frustum.setFromProjectionMatrix(_m4)
  _sphere.set(_v1, sphereRadius)
  if (!_frustum.intersectsSphere(_sphere)) return false

  obj.getWorldQuaternion(_q)
  _v2.set(0, 0, 1).applyQuaternion(_q)
  const dy = _v1.y - camera.position.y
  const dot = _v2.x * dx + _v2.y * dy + _v2.z * dz
  if (dot > 0) return false

  return true
}
