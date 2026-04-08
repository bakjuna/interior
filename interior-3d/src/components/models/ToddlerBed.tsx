/**
 * 아기 침대 — 1115×2065mm, 4면 모두 범퍼 (동일 높이, 회색).
 * 전면 범퍼는 통행 공간(frontCutRight)만큼 짧게.
 */

import { RoundedBox } from '@react-three/drei'

interface ToddlerBedProps {
  position: [number, number]
  rotationY?: number
  length?: number
  width?: number
  baseH?: number
  mattH?: number
  bumperT?: number
  bumperH?: number
  cornerR?: number
  frontCutRight?: number
  bumperColor?: string
  mattColor?: string
  frameColor?: string
}

export function ToddlerBed({
  position,
  rotationY = 0,
  length = 1.905,
  width = 0.955,
  baseH = 0.150,
  mattH = 0.120,
  bumperT = 0.080,
  bumperH = 0.600,
  cornerR = 0.040,
  frontCutRight = 0.500,
  bumperColor = '#a3a3a3',
  mattColor = '#ffffff',
  frameColor = '#f3efe9',
}: ToddlerBedProps) {
  const frontFullLen = length + bumperT * 2
  const frontLen = frontFullLen - frontCutRight
  const frontCx = -frontCutRight / 2

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, baseH / 2, 0]}>
        <boxGeometry args={[length, baseH, width]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} />
      </mesh>

      <mesh position={[0, baseH + mattH / 2, 0]}>
        <boxGeometry args={[length - 0.04, mattH, width - 0.04]} />
        <meshStandardMaterial color={mattColor} roughness={0.85} />
      </mesh>

      <RoundedBox
        args={[length + bumperT * 2, bumperH, bumperT]}
        radius={cornerR}
        smoothness={4}
        position={[0, bumperH / 2, -width / 2 - bumperT / 2]}
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>

      <RoundedBox
        args={[frontLen, bumperH, bumperT]}
        radius={cornerR}
        smoothness={4}
        position={[frontCx, bumperH / 2, width / 2 + bumperT / 2]}
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>

      <RoundedBox
        args={[bumperT, bumperH, width]}
        radius={cornerR}
        smoothness={4}
        position={[-length / 2 - bumperT / 2, bumperH / 2, 0]}
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>

      <RoundedBox
        args={[bumperT, bumperH, width]}
        radius={cornerR}
        smoothness={4}
        position={[length / 2 + bumperT / 2, bumperH / 2, 0]}
      >
        <meshStandardMaterial color={bumperColor} roughness={0.6} />
      </RoundedBox>
    </group>
  )
}
