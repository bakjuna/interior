/**
 * 안방욕실 — 메인욕실 세트를 90° CW 회전한 버전.
 * 변기 + 세면대 + 거울/백라이트 + 변기 위 상부장. 샤워부스 없음.
 */

import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Toilet } from '../models/Toilet'
import { Sink } from '../models/Sink'
import { tileGroutOnBeforeCompile } from '../primitives/bathroomTile'
import { useKTX2 } from '../../systems/useKTX2'
import {
  WALL_HEIGHT,
  mbBathLeft,
  mbBathRight,
  mbBathTop,
  mbBathBottom,
  mbDoorHinge,
  mbDoorEnd,
} from '../../data/apartment'

interface MasterBathProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn?: boolean
}

export function MasterBath({ visible, playerPos, allLightsOn }: MasterBathProps) {
  const bathroomWallTex = useKTX2('/textures/bathroom-wall-tile.ktx2')
  const closetDoorTex = useKTX2('/textures/walnut-closet-door.ktx2')
  const walnutDoorTex = useKTX2('/textures/walnut_door.ktx2')

  // 타일 텍스처 캐시 — 동일 (uRep, vRep) 조합은 1번만 clone (기존 7 clone/render → 첫 렌더만)
  const makeTileTex2 = useMemo(() => {
    const cache = new Map<string, THREE.Texture>()
    return (uRep: number, vRep: number) => {
      const key = `${uRep.toFixed(4)}|${vRep.toFixed(4)}`
      let t = cache.get(key)
      if (!t) {
        t = bathroomWallTex.clone()
        t.wrapS = THREE.RepeatWrapping
        t.wrapT = THREE.RepeatWrapping
        t.repeat.set(uRep, vRep)
        t.colorSpace = THREE.SRGBColorSpace
        cache.set(key, t)
      }
      return t
    }
  }, [bathroomWallTex])

  // 변기 위 상부장 본체 + 도어들이 공유하는 호두 텍스처 — clone 1번만
  const walnutBodyTex = useMemo(() => {
    const t = walnutDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [walnutDoorTex])

  // 도어 텍스처 (closetDoorTex 기반, walnutBodyTex 와 별도) — clone 1번만
  const cabDoorTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  const bL2 = mbBathLeft
  const bR2 = mbBathRight
  const bT2 = mbBathTop
  const bB2 = mbBathBottom
  const toiletL2 = 0.68
  const mbBathActive = !!allLightsOn || (!!playerPos && playerPos[0] >= bL2 && playerPos[0] <= bR2 && playerPos[1] >= bB2 && playerPos[1] <= bT2)

  const innerW2 = bR2 - bL2
  const innerD2 = Math.abs(bT2 - bB2)
  const tileW2 = 0.6
  const tileH2 = 1.2
  const cX2 = (bL2 + bR2) / 2
  const cZ2 = (bT2 + bB2) / 2

  const toilet2X = bL2 + 0.40
  const toilet2Z = bB2 + 0.30
  const sink2X = bL2 + 1.00
  const sink2Z = bB2 + 0.30

  // 거울 백라이트 위치 — IIFE 밖으로 추출 (lights를 visible group 밖에 배치하기 위함)
  const mirrorLightX = sink2X + 0.07
  const mirrorLightY = 1.45
  const mirrorLightZ = bB2 + 0.10

  const doorH = 2.1
  const doorW = 0.9
  const doorXmin = mbDoorHinge
  const doorXmax = mbDoorEnd
  const doorXc = (doorXmin + doorXmax) / 2
  const aboveH = WALL_HEIGHT - doorH
  const leftLen = doorXmin - bL2
  const rightLen = bR2 - doorXmax

  return (
    <>
      {/* lights outside visible group */}
      <pointLight position={[cX2, WALL_HEIGHT - 0.3, cZ2]} intensity={mbBathActive ? 1.5 : 0} distance={3} decay={1.5} color="#ffffff" castShadow shadow-mapSize-width={128} shadow-mapSize-height={128} shadow-bias={-0.002} />
      <pointLight position={[mirrorLightX, mirrorLightY, mirrorLightZ]} intensity={mbBathActive ? 0.6 : 0} distance={1.5} decay={2} color="#fff5e6" castShadow shadow-mapSize-width={128} shadow-mapSize-height={128} shadow-bias={-0.002} />
      <group visible={visible}>
      {/* === 벽 타일 === */}
      <mesh position={[bL2 + 0.001, WALL_HEIGHT / 2, cZ2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[innerD2, WALL_HEIGHT]} />
        <meshStandardMaterial map={makeTileTex2(innerD2 / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      <mesh position={[bR2 - 0.001, WALL_HEIGHT / 2, cZ2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[innerD2, WALL_HEIGHT]} />
        <meshStandardMaterial map={makeTileTex2(innerD2 / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      {aboveH > 0.001 && (
        <mesh position={[doorXc, doorH + aboveH / 2, bT2 - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[doorW, aboveH]} />
          <meshStandardMaterial map={makeTileTex2(doorW / tileW2, aboveH / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {leftLen > 0.001 && (
        <mesh position={[(bL2 + doorXmin) / 2, WALL_HEIGHT / 2, bT2 - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[leftLen, WALL_HEIGHT]} />
          <meshStandardMaterial map={makeTileTex2(leftLen / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {rightLen > 0.001 && (
        <mesh position={[(doorXmax + bR2) / 2, WALL_HEIGHT / 2, bT2 - 0.001]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[rightLen, WALL_HEIGHT]} />
          <meshStandardMaterial map={makeTileTex2(rightLen / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      <mesh position={[cX2, WALL_HEIGHT / 2, bB2 + 0.001]}>
        <planeGeometry args={[innerW2, WALL_HEIGHT]} />
        <meshStandardMaterial map={makeTileTex2(innerW2 / tileW2, WALL_HEIGHT / tileH2)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>

      {/* 변기 */}
      <Suspense fallback={null}>
        <Toilet position={[toilet2X, 0, toilet2Z]} rotation={0} scale={0.4} />
      </Suspense>
      {/* 변기 위 상부장 */}
      {(() => {
        const ucD = 0.30
        const ucH = 0.70
        const ucW = toiletL2
        const ucCY = 1.75
        const doorCount = Math.max(1, Math.round(ucW / 0.4))
        const dW = ucW / doorCount
        return (
          <group>
            <mesh position={[toilet2X, ucCY, bB2 + ucD / 2]}>
              <boxGeometry args={[ucW, ucH, ucD]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {Array.from({ length: doorCount }).map((_, di) => {
              const dx = (toilet2X - ucW / 2) + dW / 2 + di * dW
              return (
                <group key={`mb1-uc-${di}`}>
                  <mesh position={[dx, ucCY, bB2 + ucD + 0.001]}>
                    <planeGeometry args={[dW - 0.005, ucH - 0.01]} />
                    <meshStandardMaterial map={cabDoorTex} roughness={0.45} />
                  </mesh>
                  <mesh position={[dx, ucCY - ucH / 2 + 0.08, bB2 + ucD + 0.01]}>
                    <boxGeometry args={[0.015, 0.06, 0.01]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}
          </group>
        )
      })()}

      {/* 세면대 + 거울 */}
      <Suspense fallback={null}>
        <Sink position={[sink2X - 0.2, 0.61, sink2Z + 0.12]} rotation={Math.PI} scale={1.5} />
      </Suspense>
      {(() => {
        const mR = 0.30
        const mX = sink2X + 0.07
        const mY = 1.45
        return (
          <group>
            <mesh position={[mX, mY, bB2 + 0.012]}>
              <circleGeometry args={[mR, 64]} />
              <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
            </mesh>
            <mesh position={[mX, mY, bB2 + 0.006]}>
              <ringGeometry args={[mR + 0.005, mR + 0.05, 64]} />
              <meshStandardMaterial
                color={mbBathActive ? '#fff5e6' : '#444'}
                emissive={mbBathActive ? '#fff5e6' : '#111'}
                emissiveIntensity={mbBathActive ? 2.5 : 0.05}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })()}
    </group>
    </>
  )
}
