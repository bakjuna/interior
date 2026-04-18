/**
 * 단일 다운라이트 SpotLight 래퍼.
 * 항상 mount — active 전환은 intensity 로만 제어.
 * walkthrough Canvas 는 shadows=false 이므로 castShadow 미사용 (dead GL 셋업 회피).
 */

import { useRef, useLayoutEffect, memo } from 'react'
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

  useLayoutEffect(() => {
    const target = new THREE.Object3D()
    target.position.set(x, 0, z)
    scene.add(target)
    if (lightRef.current) lightRef.current.target = target
    return () => { scene.remove(target) }
  }, [scene, x, z])

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
    />
  )
}

export const DropCeilingLight = memo(DropCeilingLightInner)
