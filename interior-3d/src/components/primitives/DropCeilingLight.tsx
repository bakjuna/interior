/**
 * 단일 다운라이트 SpotLight 래퍼.
 * target object를 scene에 한 번만 추가/정리.
 */

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

interface DropCeilingLightProps {
  x: number
  z: number
  ceilingY: number
  active: boolean
  color?: string
}

export function DropCeilingLight({ x, z, ceilingY, active, color = '#ffe0b0' }: DropCeilingLightProps) {
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
    if (active && lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
    }
  }, [active])

  if (!active) return null

  return (
    <spotLight
      ref={lightRef}
      position={[x, ceilingY - 0.02, z]}
      angle={Math.PI / 2.5}
      penumbra={0.8}
      intensity={2.0}
      distance={ceilingY}
      decay={2}
      color={color}
    />
  )
}
