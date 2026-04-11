/**
 * 외부 도시 뷰 배경 — 북쪽/남쪽 방향 billboard plane.
 * 낮/밤별 텍스처 2장만 로드 (KTX2). 파일 없으면 조용히 skip.
 */

import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { useThree } from '@react-three/fiber'
import { LR_W, LR_D, babyTop } from '../../data/apartment'

interface ExteriorBackgroundProps {
  isNight: boolean
  show?: boolean
}

export function ExteriorBackground({ isNight, show = true }: ExteriorBackgroundProps) {
  const gl = useThree((s) => s.gl)
  const [northTex, setNorthTex] = useState<THREE.Texture | null>(null)
  const [southTex, setSouthTex] = useState<THREE.Texture | null>(null)
  const loaderRef = useRef<KTX2Loader | null>(null)

  useEffect(() => {
    if (!loaderRef.current) {
      loaderRef.current = new KTX2Loader()
      loaderRef.current.setTranscoderPath('/basis/')
      loaderRef.current.detectSupport(gl)
    }
    const loader = loaderRef.current
    const suffix = isNight ? 'night' : 'day'
    let disposed = false
    let newNorth: THREE.Texture | null = null
    let newSouth: THREE.Texture | null = null
    const tryApply = () => {
      if (disposed || !newNorth || !newSouth) return
      setNorthTex(newNorth)
      setSouthTex(newSouth)
    }
    loader.load(
      `/textures/city-view-north-${suffix}.ktx2`,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; newNorth = tex; tryApply() },
      undefined,
      () => console.warn(`[city-view] north-${suffix} not found`),
    )
    loader.load(
      `/textures/city-view-south-${suffix}.ktx2`,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; newSouth = tex; tryApply() },
      undefined,
      () => console.warn(`[city-view] south-${suffix} not found`),
    )
    return () => { disposed = true }
  }, [isNight, gl])

  if (!show) return null

  return (
    <>
      {northTex && (
        <mesh position={[LR_W / 2, 0, babyTop - 40]} scale={[1, -1, 1]}>
          <planeGeometry args={[140, 70]} />
          <meshBasicMaterial
            map={northTex}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}
      {southTex && (
        <mesh position={[LR_W / 2, 0, LR_D + 40]} rotation={[0, Math.PI, 0]} scale={[1, -1, 1]}>
          <planeGeometry args={[140, 70]} />
          <meshBasicMaterial
            map={southTex}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}
    </>
  )
}
