/**
 * 단일 다운라이트 SpotLight 래퍼.
 * 항상 mount — active 전환은 intensity 로만 제어.
 * 셰이더 패치(shaderPatch.ts)로 intensity=0 light는 RE_Direct 를 건너뛰므로
 * GPU 비용 거의 0 + 셰이더 재컴파일 0.
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
  intensity?: number
  distance?: number
}

export function DropCeilingLight({ x, z, ceilingY, active, color = '#ffe0b0', intensity = 2.0, distance }: DropCeilingLightProps) {
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
