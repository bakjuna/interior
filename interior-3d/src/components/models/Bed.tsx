/**
 * 안방 침대 (GLTF). 이불 머티리얼만 베이지 단색으로 교체.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { LR_D, MB_W, WALL_THICKNESS } from '../../data/apartment'

const mbLeft = -WALL_THICKNESS - MB_W

export function Bed() {
  const { scene } = useGLTF('/models/bed/scene.gltf')
  const cloned = useMemo(() => {
    const s = scene.clone()
    s.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material
        if (mat.name === 'initialShadingGroup') {
          const newMat = mat.clone()
          newMat.map = null
          newMat.color = new THREE.Color('#f0ece0')
          newMat.roughness = 0.8
          newMat.normalMap = null
          child.material = newMat
        }
      }
    })
    return s
  }, [scene])

  const scale = 1.1
  return (
    <primitive
      object={cloned}
      scale={[scale, scale, scale]}
      position={[mbLeft + 0.55 + 2.6, 0.45, LR_D - 1.150]}
      rotation={[0, Math.PI / 2 * 3, 0]}
    />
  )
}
