/**
 * 책상 — IKEA IDÅSEN 스타일 트레슬 레그 + 블랙 상판.
 * position: 상판 중심 월드 좌표 [x, z]
 * rotationY: 상판 긴 변 방향 (0 = X축, π/2 = Z축)
 */

interface TrestleDeskProps {
  position: [number, number]
  rotationY?: number
  width?: number
  depth?: number
  height?: number
  topT?: number
  topColor?: string
  legColor?: string
}

export function TrestleDesk({
  position,
  rotationY = 0,
  width = 1.800,
  depth = 0.720,
  height = 0.730,
  topT = 0.025,
  topColor = '#121212',
  legColor = '#3a3a3d',
}: TrestleDeskProps) {
  const legInset = 0.150
  const postT = 0.050
  const braceT = 0.030
  const footLen = depth - 0.10
  const postH = height - topT
  const topSurfaceY = height
  const topCenterY = topSurfaceY - topT / 2

  const legXs = [-width / 2 + legInset, width / 2 - legInset]

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, topCenterY, 0]}>
        <boxGeometry args={[width, topT, depth]} />
        <meshStandardMaterial color={topColor} roughness={0.35} metalness={0.1} />
      </mesh>

      {legXs.map((lx, i) => {
        const pivotY = postH / 2
        return (
          <group key={`leg-${i}`} position={[lx, 0, 0]}>
            <mesh position={[0, pivotY, 0]}>
              <boxGeometry args={[postT, postH, postT]} />
              <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.020, 0]}>
              <boxGeometry args={[postT, 0.030, footLen]} />
              <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
            </mesh>

            {[-1, 1].map((dir) => {
              const dz = dir * (footLen / 2)
              const bx = 0
              const by = postH - 0.050
              const cy = 0.02
              const midY = (by + cy) / 2
              const midZ = dz / 2
              const len = Math.hypot(by - cy, dz)
              const angle = Math.atan2(dz, by - cy)
              return (
                <mesh
                  key={`br-${dir}`}
                  position={[bx, midY, midZ]}
                  rotation={[angle, 0, 0]}
                >
                  <boxGeometry args={[braceT, len, braceT]} />
                  <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
                </mesh>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
