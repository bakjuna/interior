import * as THREE from 'three'
import {
  walls,
  rooms,
  WALL_HEIGHT,
  MB_W,
  LR_W,
  LR_D,
  WALL_THICKNESS,
} from '../data/apartment'

interface ApartmentModelProps {
  showCeiling?: boolean
}

// 전체 내측 범위
const totalLeft = -WALL_THICKNESS - MB_W
const totalRight = LR_W
const totalW = totalRight - totalLeft
const centerX = (totalLeft + totalRight) / 2
const centerZ = LR_D / 2

export function ApartmentModel({ showCeiling = true }: ApartmentModelProps) {
  return (
    <group>
      {/* 바닥 */}
      {rooms.map((room) => (
        <mesh
          key={`floor-${room.name}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[room.center[0], 0, room.center[1]]}
          receiveShadow
        >
          <planeGeometry args={room.size} />
          <meshStandardMaterial color={room.color} />
        </mesh>
      ))}

      {/* 벽체 */}
      {walls.map((wall, i) => {
        const dx = wall.end[0] - wall.start[0]
        const dz = wall.end[1] - wall.start[1]
        const length = Math.sqrt(dx * dx + dz * dz)
        const isH = Math.abs(dz) < 0.001
        const h = wall.height ?? WALL_HEIGHT
        const t = wall.thickness

        return (
          <mesh
            key={i}
            position={[
              wall.start[0] + dx / 2,
              h / 2,
              wall.start[1] + dz / 2,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[isH ? length : t, h, isH ? t : length]} />
            <meshStandardMaterial color="#b0a898" />
          </mesh>
        )
      })}

      {/* 천장 */}
      {showCeiling && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[centerX, WALL_HEIGHT, centerZ]}>
          <planeGeometry args={[totalW + WALL_THICKNESS, LR_D + WALL_THICKNESS]} />
          <meshStandardMaterial color="#f0f0f0" side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  )
}
