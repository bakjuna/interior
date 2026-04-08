/**
 * 쿠쿠 밥솥 (GLTF).
 */

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

interface RiceCookerProps {
  position: [number, number, number]
  rotation?: number
}

export function RiceCooker({ position, rotation = 0 }: RiceCookerProps) {
  const { scene } = useGLTF('/models/kitchen/rice_cooker.gltf')
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} />
}
