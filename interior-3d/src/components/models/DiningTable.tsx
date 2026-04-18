/**
 * 식탁 — 1800×800mm 대리석 상판 + 가운데 나무 다리 + 펜던트 조명.
 * 펜던트 LED는 active prop에 따라 발광/RectAreaLight/PointLight 활성.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { WALL_HEIGHT } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'

/** XZ 평면 모서리만 둥글린 직사각형 → Y축으로 extrude한 thin slab geometry.
 *  top/side UV가 [0,1]로 정규화되어 텍스처가 한 번에 매핑됨. */
function makeRoundedSlab(w: number, d: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, d / 2)
  const shape = new THREE.Shape()
  const x = -w / 2, z = -d / 2
  shape.moveTo(x + radius, z)
  shape.lineTo(x + w - radius, z)
  shape.quadraticCurveTo(x + w, z, x + w, z + radius)
  shape.lineTo(x + w, z + d - radius)
  shape.quadraticCurveTo(x + w, z + d, x + w - radius, z + d)
  shape.lineTo(x + radius, z + d)
  shape.quadraticCurveTo(x, z + d, x, z + d - radius)
  shape.lineTo(x, z + radius)
  shape.quadraticCurveTo(x, z, x + radius, z)

  // 커스텀 UVGenerator: top은 shape XY를 [0,1]로 정규화, side는 둘레의 x좌표 ↔ depth(z) 매핑
  const uvGenerator = {
    generateTopUV(_g: THREE.ExtrudeGeometry, vertices: number[], iA: number, iB: number, iC: number) {
      return [iA, iB, iC].map((i) => new THREE.Vector2(
        (vertices[i * 3] + w / 2) / w,
        (vertices[i * 3 + 1] + d / 2) / d,
      ))
    },
    generateSideWallUV(_g: THREE.ExtrudeGeometry, vertices: number[], iA: number, iB: number, iC: number, iD: number) {
      return [iA, iB, iC, iD].map((i) => new THREE.Vector2(
        (vertices[i * 3] + w / 2) / w,
        vertices[i * 3 + 2] / h,
      ))
    },
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    curveSegments: 16,
    UVGenerator: uvGenerator,
  })
  // extrude는 +Z 방향으로 두께가 생기므로 X축 -90°로 회전 → 두께가 +Y가 됨
  geom.rotateX(-Math.PI / 2)
  geom.translate(0, -h / 2, 0)
  return geom
}

interface DiningTableProps {
  position: [number, number]  // [centerX, centerZ]
  active: boolean              // 펜던트 LED 활성
}

const TABLE_W = 1.8
const TABLE_D = 0.9
const TABLE_H = 0.75

export function DiningTable({ position, active }: DiningTableProps) {
  const [tableX, tableZ] = position
  const pendantY = WALL_HEIGHT - 0.6
  const barLen = 1.2

  const topGeom = useMemo(() => makeRoundedSlab(TABLE_W, TABLE_D, 0.03, 0.1), [])
  const marbleTex = useKTX2('/textures/marble-table.ktx2')
  const marbleMap = useMemo(() => {
    const t = marbleTex.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [marbleTex])

  // 안방 bookshelf 와 동일한 오크 텍스처
  const oakBaseTex = useKTX2('/textures/oak-wood.ktx2')
  const oakMap = useMemo(() => {
    const t = oakBaseTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [oakBaseTex])

  // U자 다리: 트렁크 20cm + 양쪽 암이 ±ARM_SPREAD_X 로 벌어져 상판 아래까지
  const TRUNK_BOTTOM_Y = 0.03                 // 황동 받침 상단 (=base top)
  const SPLIT_Y = TRUNK_BOTTOM_Y + 0.20       // 트렁크 20cm → y=0.23
  const TOP_Y = TABLE_H - 0.015               // 상판(대리석) 하단에 flush = 0.735
  const ARM_SPREAD_X = 0.33                   // 벌어지는 정도 (트렁크 높아진 만큼 축소)
  const LEG_T = 0.18                          // 두께 180mm (Z)
  const LEG_W = 0.3                           // 너비 300mm (X)
  const INNER_TOP_X = ARM_SPREAD_X - LEG_W / 2 // 암 안쪽 top edge X (0.18)

  // 트렁크+좌우 U자 암을 하나의 연속된 폴리곤으로 구성 → 겹침/z-fighting 방지
  const legShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-LEG_W / 2, TRUNK_BOTTOM_Y)                 // 1) 트렁크 BL
    s.lineTo(+LEG_W / 2, TRUNK_BOTTOM_Y)                 // 2) 트렁크 BR
    s.lineTo(+LEG_W / 2, SPLIT_Y)                        // 3) 트렁크 TR (=우암 outer bottom)
    s.lineTo(+ARM_SPREAD_X + LEG_W / 2, TOP_Y)           // 4) 우암 top outer
    s.lineTo(+INNER_TOP_X, TOP_Y)                        // 5) 우암 top inner
    // 6) U 곡선: 우암 inner → 좌암 inner (뾰족한 V 대신 부드러운 U)
    s.bezierCurveTo(
      +INNER_TOP_X, SPLIT_Y,
      -INNER_TOP_X, SPLIT_Y,
      -INNER_TOP_X, TOP_Y,
    )
    s.lineTo(-(ARM_SPREAD_X + LEG_W / 2), TOP_Y)         // 7) 좌암 top outer
    s.lineTo(-LEG_W / 2, SPLIT_Y)                        // 8) 트렁크 TL
    s.lineTo(-LEG_W / 2, TRUNK_BOTTOM_Y)                 // close
    return s
  }, [])
  const legGeom = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(legShape, { depth: LEG_T, bevelEnabled: false })
    g.translate(0, 0, -LEG_T / 2)                        // Z 중앙정렬
    return g
  }, [legShape])

  return (
    <>
      {/* lights outside group for stable Three.js light count */}
      <rectAreaLight
        position={[tableX, WALL_HEIGHT - 0.52, tableZ]}
        width={1.15}
        height={0.025}
        intensity={active ? 15 : 0}
        color="#ffe0b0"
        rotation={[Math.PI / 2, 0, 0]}
      />
      <pointLight
        position={[tableX, WALL_HEIGHT - 0.55, tableZ]}
        intensity={active ? 0.8 : 0}
        distance={2.5}
        decay={2}
        color="#ffe0b0"
        castShadow
        shadow-mapSize-width={128}
        shadow-mapSize-height={128}
        shadow-bias={-0.002}
      />
      <group>
        {/* 상판 (대리석) — XZ 모서리만 100mm 라운딩, 두께 30mm 유지, marble 텍스처 */}
        <mesh geometry={topGeom} position={[tableX, TABLE_H, tableZ]}>
          <meshStandardMaterial map={marbleMap} roughness={0.15} metalness={0.05} />
        </mesh>
        {/* 받침판 — 황동 40×70 */}
        <mesh position={[tableX, 0.015, tableZ]}>
          <boxGeometry args={[0.7, 0.03, 0.4]} />
          <meshStandardMaterial color="#b5a642" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* V자 다리 — 트렁크(10cm) + 두 암을 단일 폴리곤으로 합쳐 z-fighting 제거 */}
        <mesh geometry={legGeom} position={[tableX, 0, tableZ]}>
          <meshStandardMaterial map={oakMap} roughness={0.7} />
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
      </group>
    </>
  )
}
