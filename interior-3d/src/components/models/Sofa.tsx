/**
 * 거실 ㄱ자 소파 (GLTF). 베이지 패브릭 머티리얼.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { LR_W } from '../../data/apartment'

export function Sofa() {
  const { scene } = useGLTF('/models/scene.gltf')
  const cloned = useMemo(() => {
    const s = scene.clone()
    s.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material.clone()
        mat.color = new THREE.Color('#fbf8f0')
        mat.roughness = 0.8
        child.material = mat
      }
    })
    return s
  }, [scene])

  const scale = 1.45
  return (
    <primitive
      object={cloned}
      scale={[scale, scale, -scale]}
      position={[LR_W / 2 - 4.3, -0.6, 2.6 - 0.5 + 1.2]}
      rotation={[0, Math.PI / 2, 0]}
    />
  )
}
