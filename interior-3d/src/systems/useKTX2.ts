/**
 * KTX2 텍스처 로더 훅 — GPU 압축 텍스처(UASTC/ETC1S) 지원.
 * Basis Universal transcoder 를 /basis/ 에서 로드.
 *
 * loader 설정(setTranscoderPath + detectSupport)은 최초 1회만 실행.
 * preloadAll()로 모든 텍스처를 미리 로드하면 room 전환 시 suspend 방지.
 */

import { useLoader, useThree } from '@react-three/fiber'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import type { WebGLRenderer } from 'three'

let _configured = false

function configureLoader(loader: KTX2Loader) {
  if (_configured) return
  loader.setTranscoderPath('/basis/')
  _configured = true
}

/** 훅 외부에서 detectSupport 1회 호출 — Canvas 마운트 후 실행 */
export function initKTX2Support(gl: WebGLRenderer) {
  const loader = new KTX2Loader()
  loader.setTranscoderPath('/basis/')
  loader.detectSupport(gl)
  _configured = true
  // useLoader 내부 캐시에 등록되도록 임의 참조만 생성
  return loader
}

export function useKTX2(url: string) {
  const gl = useThree((s) => s.gl)
  return useLoader(KTX2Loader, url, (loader) => {
    configureLoader(loader)
    loader.detectSupport(gl)
  })
}

/**
 * 모든 KTX2 텍스처 URL 을 미리 로드 — Prewarm 단계에서 호출.
 * useLoader.preload 를 사용하여 캐시에 넣어두면 room 전환 시 suspend 없음.
 */
export const ALL_KTX2_URLS = [
  '/textures/walnut-floor.ktx2',
  '/textures/porcelain-tile.ktx2',
  '/textures/entrance-tile.ktx2',
  '/textures/bathroom-wall-tile.ktx2',
  '/textures/walnut-closet-door.ktx2',
  '/textures/walnut_door.ktx2',
  '/textures/silk.ktx2',
  '/textures/kitchen-tile.ktx2',
  '/textures/marble-table.ktx2',
] as const

export function preloadAllKTX2(gl: WebGLRenderer) {
  for (const url of ALL_KTX2_URLS) {
    useLoader.preload(KTX2Loader, url, (loader) => {
      configureLoader(loader)
      loader.detectSupport(gl)
    })
  }
}
