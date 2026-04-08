/**
 * 변기 (GLB) — 흰색 프리미티브 머티리얼로 통일.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

interface ToiletProps {
  position: [number, number, number]
  rotation?: number
  scale?: number
}

export function Toilet({ position, rotation = 0, scale = 1 }: ToiletProps) {
  const { scene } = useGLTF('/models/bathroom/toilet.glb')
  const cloned = useMemo(() => {
    const s = scene.clone()
    s.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material.clone()
        mat.color = new THREE.Color('#ffffff')
        mat.roughness = 0.15
        mat.metalness = 0.05
        if (mat.map) mat.map = null
        child.material = mat
      }
    })
    return s
  }, [scene])
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={[scale, scale, scale]} />
}
