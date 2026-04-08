/**
 * 외부 도시 뷰 배경 — 북쪽/남쪽 방향 billboard plane.
 * 낮/밤별 텍스처 (파일 없으면 조용히 skip).
 */

import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import { LR_W, LR_D, babyTop } from '../../data/apartment'

interface ExteriorBackgroundProps {
  isNight: boolean
  show?: boolean
}

export function ExteriorBackground({ isNight, show = true }: ExteriorBackgroundProps) {
  const [northDay, setNorthDay] = useState<THREE.Texture | null>(null)
  const [northNight, setNorthNight] = useState<THREE.Texture | null>(null)
  const [southDay, setSouthDay] = useState<THREE.Texture | null>(null)
  const [southNight, setSouthNight] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new TextureLoader()
    const setup = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      return tex
    }
    const loadOne = (path: string, setter: (t: THREE.Texture) => void) => {
      loader.load(
        path,
        (tex) => setter(setup(tex)),
        undefined,
        () => console.warn(`[city-view] ${path} not found`)
      )
    }
    loadOne('/textures/city-view-north-day.jpg', setNorthDay)
    loadOne('/textures/city-view-north-night.jpg', setNorthNight)
    loadOne('/textures/city-view-south-day.jpg', setSouthDay)
    loadOne('/textures/city-view-south-night.jpg', setSouthNight)
  }, [])

  if (!show) return null

  const cityNorthTex = isNight ? northNight : northDay
  const citySouthTex = isNight ? southNight : southDay

  return (
    <>
      {cityNorthTex && (
        <mesh position={[LR_W / 2, 0, babyTop - 40]}>
          <planeGeometry args={[140, 70]} />
          <meshBasicMaterial
            map={cityNorthTex}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}
      {citySouthTex && (
        <mesh position={[LR_W / 2, 0, LR_D + 40]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[140, 70]} />
          <meshBasicMaterial
            map={citySouthTex}
            side={THREE.DoubleSide}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      )}
    </>
  )
}
