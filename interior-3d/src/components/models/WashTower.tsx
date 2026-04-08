/**
 * LG WashTower (세탁기 + 건조기 통합) — 본체 720×1700×800mm.
 * 베이지 본체 + 다크 그레이 측면 패널 + 상하 포트홀 + 컨트롤 패널.
 */

interface WashTowerProps {
  position: [number, number, number]
  rotation?: number
}

export function WashTower({ position, rotation = 0 }: WashTowerProps) {
  const W = 0.72
  const H = 1.70
  const D = 0.80
  const sideThick = 0.025
  const bodyColor = '#f0e8d8'
  const sideColor = '#3a3a3a'
  const portColor = '#0a0a0a'
  const trimColor = '#1a1a1a'

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[-W / 2 - sideThick / 2 + 0.001, H / 2, 0]}>
        <boxGeometry args={[sideThick, H, D + 0.005]} />
        <meshStandardMaterial color={sideColor} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[W / 2 + sideThick / 2 - 0.001, H / 2, 0]}>
        <boxGeometry args={[sideThick, H, D + 0.005]} />
        <meshStandardMaterial color={sideColor} roughness={0.5} metalness={0.2} />
      </mesh>

      {/* 상단 (건조기) 포트홀 */}
      <mesh position={[0, H * 0.72 + 0.05, D / 2 + 0.001]}>
        <circleGeometry args={[0.235, 64]} />
        <meshStandardMaterial color={portColor} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, H * 0.72 + 0.05, D / 2 + 0.0015]}>
        <ringGeometry args={[0.235, 0.260, 64]} />
        <meshStandardMaterial color={trimColor} roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, H * 0.72 + 0.05, D / 2 - 0.005]}>
        <circleGeometry args={[0.220, 64]} />
        <meshStandardMaterial color="#050505" roughness={0.9} />
      </mesh>

      {/* 컨트롤 패널 */}
      <mesh position={[0, H * 0.495 + 0.015, D / 2 + 0.0015]}>
        <boxGeometry args={[W + 0.06, 0.105, 0.004]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, H * 0.495, D / 2 + 0.004]}>
        <planeGeometry args={[0.10, 0.04]} />
        <meshStandardMaterial color="#08080f" emissive="#1a3050" emissiveIntensity={0.4} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`btn-l-${i}`} position={[-W * 0.32 + i * 0.025, H * 0.495, D / 2 + 0.004]}>
          <circleGeometry args={[0.005, 12]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={`btn-r-${i}`} position={[W * 0.10 + i * 0.025, H * 0.495, D / 2 + 0.004]}>
          <circleGeometry args={[0.005, 12]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      ))}

      <mesh position={[-W * 0.30, H * 0.43, D / 2 + 0.002]}>
        <boxGeometry args={[0.10, 0.025, 0.005]} />
        <meshStandardMaterial color="#d8d0bc" roughness={0.4} metalness={0.05} />
      </mesh>

      {/* 하단 (세탁기) 포트홀 */}
      <mesh position={[0, H * 0.27, D / 2 + 0.001]}>
        <circleGeometry args={[0.255, 64]} />
        <meshStandardMaterial color={portColor} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, H * 0.27, D / 2 + 0.0015]}>
        <ringGeometry args={[0.255, 0.280, 64]} />
        <meshStandardMaterial color={trimColor} roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, H * 0.27, D / 2 - 0.005]}>
        <circleGeometry args={[0.240, 64]} />
        <meshStandardMaterial color="#050505" roughness={0.9} />
      </mesh>

      <mesh position={[0, H * 0.05, D / 2 + 0.002]}>
        <boxGeometry args={[0.08, 0.05, 0.005]} />
        <meshStandardMaterial color="#d8d0bc" roughness={0.4} metalness={0.05} />
      </mesh>
    </group>
  )
}
