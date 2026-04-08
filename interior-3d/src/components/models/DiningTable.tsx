/**
 * 식탁 — 1500×800mm 대리석 상판 + 가운데 나무 다리 + 펜던트 조명.
 * 펜던트 LED는 active prop에 따라 발광/RectAreaLight/PointLight 활성.
 */

import { WALL_HEIGHT } from '../../data/apartment'

interface DiningTableProps {
  position: [number, number]  // [centerX, centerZ]
  active: boolean              // 펜던트 LED 활성
}

const TABLE_W = 1.5
const TABLE_D = 0.8
const TABLE_H = 0.75

export function DiningTable({ position, active }: DiningTableProps) {
  const [tableX, tableZ] = position
  const pendantY = WALL_HEIGHT - 0.6
  const barLen = 1.2

  return (
    <group>
      {/* 상판 (대리석) */}
      <mesh position={[tableX, TABLE_H, tableZ]}>
        <boxGeometry args={[TABLE_W, 0.03, TABLE_D]} />
        <meshStandardMaterial color="#f0ece4" roughness={0.15} metalness={0.05} />
      </mesh>
      <mesh position={[tableX, TABLE_H - 0.015, tableZ]}>
        <boxGeometry args={[TABLE_W - 0.01, 0.03, TABLE_D - 0.01]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.2} metalness={0.05} />
      </mesh>
      {/* 가운데 기둥 */}
      <mesh position={[tableX, TABLE_H / 2 - 0.02, tableZ]}>
        <cylinderGeometry args={[0.04, 0.04, TABLE_H - 0.06, 12]} />
        <meshStandardMaterial color="#6b4226" roughness={0.7} />
      </mesh>
      {/* 받침판 */}
      <mesh position={[tableX, 0.015, tableZ]}>
        <cylinderGeometry args={[0.3, 0.35, 0.03, 16]} />
        <meshStandardMaterial color="#5a3620" roughness={0.7} />
      </mesh>
      {/* 기둥-상판 연결 */}
      <mesh position={[tableX, TABLE_H - 0.05, tableZ]}>
        <cylinderGeometry args={[0.15, 0.04, 0.06, 12]} />
        <meshStandardMaterial color="#6b4226" roughness={0.7} />
      </mesh>

      {/* 펜던트 조명 */}
      <mesh position={[tableX, WALL_HEIGHT - 0.01, tableZ]}>
        <boxGeometry args={[0.2, 0.02, 0.04]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[tableX - barLen / 2 + 0.05, (WALL_HEIGHT + pendantY) / 2, tableZ]}>
        <cylinderGeometry args={[0.001, 0.001, WALL_HEIGHT - pendantY - 0.02, 4]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[tableX + barLen / 2 - 0.05, (WALL_HEIGHT + pendantY) / 2, tableZ]}>
        <cylinderGeometry args={[0.001, 0.001, WALL_HEIGHT - pendantY - 0.02, 4]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[tableX, pendantY, tableZ]}>
        <boxGeometry args={[barLen, 0.04, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[tableX, pendantY - 0.021, tableZ]}>
        <boxGeometry args={[barLen - 0.02, 0.005, 0.04]} />
        <meshStandardMaterial color={active ? '#fff' : '#444'} emissive={active ? '#fff5e6' : '#111'} emissiveIntensity={active ? 4.0 : 0.1} />
      </mesh>
      {active && (
        <rectAreaLight
          position={[tableX, WALL_HEIGHT - 0.52, tableZ]}
          width={1.15}
          height={0.025}
          intensity={15}
          color="#ffe0b0"
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}
      {active && (
        <pointLight
          position={[tableX, WALL_HEIGHT - 0.55, tableZ]}
          intensity={0.8}
          distance={2.5}
          decay={2}
          color="#ffe0b0"
        />
      )}
    </group>
  )
}
