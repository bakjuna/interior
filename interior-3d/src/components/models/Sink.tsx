/**
 * 세면대 (GLB).
 */

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

interface SinkProps {
  position: [number, number, number]
  rotation?: number
  scale?: number
}

export function Sink({ position, rotation = 0, scale = 1 }: SinkProps) {
  const { scene } = useGLTF('/models/bathroom/sink.glb')
  const cloned = useMemo(() => scene.clone(), [scene])
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={[scale, scale, scale]} />
}
