/**
 * 안방 — 가벽 (50mm, 안방욕실 문쪽) + 화장대 (붙박이장 첫 자리, 4면 RectAreaLight 거울) + 침대.
 * 단내림 + 코브 LED는 shell/Ceilings.tsx.
 */

import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Bed } from '../models/Bed'
import { useKTX2 } from '../../systems/useKTX2'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  MB_W,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2
const mbLeft = -WALL_THICKNESS - MB_W

interface MasterBedroomProps {
  visible: boolean
}

export function MasterBedroom({ visible }: MasterBedroomProps) {
  const silkTex = useKTX2('/textures/silk.ktx2')
  const closetDoorTex = useKTX2('/textures/walnut-closet-door.ktx2')

  // 안방 가벽 (안방욕실 문쪽~2600mm, 두께 50mm) — 실크벽지
  const partLen = 2.6
  const silk = useMemo(() => {
    const t = silkTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set(partLen / 2, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [silkTex])

  // 화장대 + 도어들이 공유하는 호두 텍스처 — clone 1번만
  const walnutBodyTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  // 화장대 — 안방욕실 인접
  const vanityX = mbLeft + 0.275
  const vanityZ = 0.3
  const vanityW = 0.55

  return (
    <>
      {/* 거울 4면 RectAreaLight — outside visible group */}
      <rectAreaLight position={[mbLeft + 0.02, 1.3 + 0.36, vanityZ]} width={0.5} height={0.02} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
      <rectAreaLight position={[mbLeft + 0.02, 1.3 - 0.36, vanityZ]} width={0.5} height={0.02} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
      <rectAreaLight position={[mbLeft + 0.02, 1.3, vanityZ - 0.26]} width={0.02} height={0.7} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
      <rectAreaLight position={[mbLeft + 0.02, 1.3, vanityZ + 0.26]} width={0.02} height={0.7} intensity={5} color="#fff5e6" rotation={[0, Math.PI / 2, 0]} />
      <group visible={visible}>
        {/* 안방 가벽 */}
        <mesh position={[mbLeft + 1.476, WALL_HEIGHT / 2, -T2 + 1.3]}>
          <boxGeometry args={[0.05, WALL_HEIGHT, partLen]} />
          <meshStandardMaterial map={silk} roughness={0.55} metalness={0} />
        </mesh>

        {/* 안방 화장대 */}
        <group>
          <mesh position={[vanityX, 0.75, vanityZ]}>
            <boxGeometry args={[vanityW, 0.03, 0.6]} />
            <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} />
          </mesh>
          <mesh position={[vanityX, 0.37, vanityZ]}>
            <boxGeometry args={[vanityW, 0.72, 0.58]} />
            <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
          </mesh>
          {[0.55, 0.25].map((yRatio, di) => {
            return (
              <group key={`vanity-d-${di}`}>
                <mesh position={[vanityX + vanityW / 2 + 0.001, yRatio, vanityZ]} rotation={[0, Math.PI / 2, 0]}>
                  <planeGeometry args={[0.58, 0.33]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
                <mesh position={[vanityX + vanityW / 2 + 0.01, yRatio, vanityZ]}>
                  <boxGeometry args={[0.015, 0.06, 0.01]} />
                  <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                </mesh>
              </group>
            )
          })}
          {/* 거울 */}
          <mesh position={[mbLeft + 0.012, 1.3, vanityZ]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.5, 0.7]} />
            <meshStandardMaterial color="#c8dce8" metalness={0.95} roughness={0.03} />
          </mesh>
        </group>

        {/* 안방 침대 */}
        <Suspense fallback={null}>
          <Bed />
        </Suspense>
      </group>
    </>
  )
}
