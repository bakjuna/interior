/**
 * 삼성 광파오븐 — 523×330×515mm.
 * 본체 + 컨트롤 패널 + 디스플레이 + 다이얼 + 도어 핸들/베젤/유리/로고 + 통풍구 + 다리.
 */

interface LightWaveOvenProps {
  position: [number, number, number]
  rotation?: number
}

export function LightWaveOven({ position, rotation = 0 }: LightWaveOvenProps) {
  const W = 0.523
  const H = 0.330
  const D = 0.515
  const bodyColor = '#e8dfc8'
  const sideColor = '#2a2a2a'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={sideColor} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0, D / 2 - 0.001]}>
        <boxGeometry args={[W - 0.012, H - 0.008, 0.012]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, H / 2 - 0.045, D / 2 + 0.006]}>
        <boxGeometry args={[W - 0.04, 0.060, 0.003]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[-W * 0.20, H / 2 - 0.045, D / 2 + 0.0085]}>
        <planeGeometry args={[0.13, 0.034]} />
        <meshStandardMaterial color="#0a0a12" emissive="#1a3050" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[W * 0.30, H / 2 - 0.045, D / 2 + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.012, 24]} />
        <meshStandardMaterial color="#888" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, H / 2 - 0.092, D / 2 + 0.015]}>
        <boxGeometry args={[W - 0.06, 0.020, 0.020]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.030, D / 2 + 0.007]}>
        <boxGeometry args={[W - 0.020, H - 0.150, 0.005]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, -0.035, D / 2 + 0.010]}>
        <planeGeometry args={[W - 0.080, H - 0.190]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.15} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.035, D / 2 + 0.0105]}>
        <planeGeometry args={[W - 0.085, H - 0.195]} />
        <meshStandardMaterial color="#1a1a22" transparent opacity={0.4} roughness={0.1} metalness={0.6} />
      </mesh>
      <mesh position={[0, -H / 2 + 0.025, D / 2 + 0.011]}>
        <planeGeometry args={[0.10, 0.012]} />
        <meshStandardMaterial color="#ffffff" emissive="#444" emissiveIntensity={0.2} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`vent-${i}`} position={[-W / 2 + 0.030, H / 2 - 0.090 - i * 0.030, D / 2 - 0.001]}>
          <boxGeometry args={[0.025, 0.004, 0.005]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
      ))}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`foot-${i}`} position={[sx * (W / 2 - 0.030), -H / 2 - 0.012, sz * (D / 2 - 0.030)]}>
          <cylinderGeometry args={[0.010, 0.012, 0.024, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}
