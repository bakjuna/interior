/**
 * 쿠쿠 정수기 — 260×527×506mm.
 * 본체 + 디스플레이 + 키패드 + 토출구 + 컵 받침.
 */

interface CuckooWaterPurifierProps {
  position: [number, number, number]
  rotation?: number
}

export function CuckooWaterPurifier({ position, rotation = 0 }: CuckooWaterPurifierProps) {
  const W = 0.260
  const H = 0.527
  const D = 0.506
  const bodyColor = '#fafafa'
  const silverColor = '#c8c8c8'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.05} />
      </mesh>
      <mesh position={[0, H * 0.78, D / 2 + 0.0005]}>
        <boxGeometry args={[W * 0.75, H * 0.40, 0.005]} />
        <meshStandardMaterial color={silverColor} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, H * 0.92, D / 2 + 0.004]}>
        <planeGeometry args={[0.060, 0.012]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[W * 0.20, H * 0.66, D / 2 + 0.004]}>
        <planeGeometry args={[0.040, 0.008]} />
        <meshStandardMaterial color="#1a8ec0" emissive="#0a5078" emissiveIntensity={0.3} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const r = Math.floor(i / 3)
        const c = i % 3
        return (
          <mesh
            key={`tc-${i}`}
            position={[W * 0.10 + c * 0.020, H * 0.86 - r * 0.020, D / 2 + 0.004]}
          >
            <circleGeometry args={[0.005, 16]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        )
      })}
      <mesh position={[W * 0.30, H * 0.55, D / 2 + 0.008]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.012, 32]} />
        <meshStandardMaterial color={silverColor} metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[W * 0.30, H * 0.55, D / 2 + 0.015]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 32]} />
        <meshStandardMaterial color="#1ab8ff" emissive="#0a8ec0" emissiveIntensity={0.6} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`opt-${i}`}
          position={[-W * 0.20, H * 0.62 - i * 0.026, D / 2 + 0.003]}
        >
          <planeGeometry args={[0.022, 0.014]} />
          <meshStandardMaterial color="#aaa" />
        </mesh>
      ))}
      <mesh position={[0, H * 0.30, D / 2 - 0.045]}>
        <boxGeometry args={[W * 0.75, H * 0.28, 0.092]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      <mesh position={[0, H * 0.40, D / 2 - 0.020]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.010, 0.040, 16]} />
        <meshStandardMaterial color={silverColor} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, H * 0.10, D / 2 + 0.030]}>
        <boxGeometry args={[W * 0.90, 0.018, 0.080]} />
        <meshStandardMaterial color="#dadada" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, H * 0.10 + 0.0095, D / 2 + 0.030]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 0.85, 0.072]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.7} />
      </mesh>
    </group>
  )
}
