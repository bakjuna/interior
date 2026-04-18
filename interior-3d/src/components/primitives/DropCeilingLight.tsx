/**
 * 단일 다운라이트 SpotLight 래퍼.
 * 항상 mount — active 전환은 intensity 로만 제어.
 * castShadow 로 벽/문 뒤로 빛이 새지 않음.
 * shadow map 해상도는 낮게(256) 유지하여 성능 절약.
 */

import { useRef, useEffect, memo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

interface DropCeilingLightProps {
  x: number
  z: number
  ceilingY: number
  active: boolean
  color?: string
  intensity?: number
  distance?: number
}

function DropCeilingLightInner({ x, z, ceilingY, active, color = '#ffe0b0', intensity = 2.0, distance }: DropCeilingLightProps) {
  const lightRef = useRef<THREE.SpotLight>(null)
  const { scene } = useThree()
  const targetRef = useRef<THREE.Object3D | null>(null)

  useEffect(() => {
    const target = new THREE.Object3D()
    target.position.set(x, 0, z)
    scene.add(target)
    targetRef.current = target
    return () => { scene.remove(target) }
  }, [scene, x, z])

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [active])

  // shadow map 설정
  useEffect(() => {
    if (lightRef.current && lightRef.current.shadow) {
      lightRef.current.shadow.mapSize.width = 256
      lightRef.current.shadow.mapSize.height = 256
      lightRef.current.shadow.camera.near = 0.1
      lightRef.current.shadow.camera.far = (distance ?? ceilingY) * 2
      lightRef.current.shadow.bias = -0.002
    }
  }, [ceilingY, distance])

  return (
    <spotLight
      ref={lightRef}
      position={[x, ceilingY - 0.02, z]}
      angle={Math.PI / 2.5}
      penumbra={0.8}
      intensity={active ? intensity : 0}
      distance={(distance ?? ceilingY) * 2}
      decay={2}
      color={color}
      castShadow
    />
  )
}

export const DropCeilingLight = memo(DropCeilingLightInner)
