/**
 * 메인욕실 — 변기 + 세면대 + 거울/백라이트 + 샤워부스 + 변기 위 상부장.
 * 4면 600×1200 포세린 타일, 우측벽은 도어 개구부 분할.
 */

import { Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { Toilet } from '../models/Toilet'
import { Sink } from '../models/Sink'
import { tileGroutOnBeforeCompile } from '../primitives/bathroomTile'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  mbDoorEnd,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface MainBathProps {
  visible: boolean
  playerPos?: [number, number]
}

export function MainBath({ visible, playerPos }: MainBathProps) {
  const bathroomWallTex = useLoader(TextureLoader, '/textures/bathroom-wall-tile.png')
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')
  const walnutDoorTex = useLoader(TextureLoader, '/textures/walnut_door.png')

  if (!visible) return null

  const bL = mbDoorEnd + 0.1 + T2
  const bR = bL + 1.413
  const bT = -WALL_THICKNESS
  const bB = bT - 2.173
  const cX = (bL + bR) / 2
  const innerW = bR - bL
  const innerD = Math.abs(bB - bT)

  const bathActive = !!playerPos && playerPos[0] >= bL && playerPos[0] <= bR && playerPos[1] >= bB && playerPos[1] <= bT
  const tileW = 0.6
  const tileH = 1.2
  const makeTileTex = (uRep: number, vRep: number) => {
    const t = bathroomWallTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(uRep, vRep)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  const walnutBodyTex = walnutDoorTex.clone()
  walnutBodyTex.wrapS = THREE.RepeatWrapping
  walnutBodyTex.wrapT = THREE.RepeatWrapping
  walnutBodyTex.repeat.set(1, 1)
  walnutBodyTex.colorSpace = THREE.SRGBColorSpace

  const showerDepth = 0.95
  const showerZend = bB + showerDepth
  const glassZ = showerZend - 0.2

  const vanW = 0.6
  const oriVanZ = showerZend + 0.15 + vanW / 2
  const vanZ = showerZend + 0 + vanW / 2

  const toiletL = 0.68
  const toiletZ = oriVanZ + vanW / 2 - 0.2 + toiletL / 2

  const doorH = 2.1
  const doorW = 0.9
  const doorZ = -WALL_THICKNESS - 0.1 - 0.45
  const doorZmin = doorZ - doorW / 2
  const doorZmax = doorZ + doorW / 2
  const aboveH = WALL_HEIGHT - doorH
  const leftLen = doorZmin - bB
  const rightLen = bT - doorZmax

  return (
    <group>
      {/* === 벽 타일 === */}
      <mesh position={[bL + 0.001, WALL_HEIGHT / 2, (bT + bB) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[innerD, WALL_HEIGHT]} />
        <meshStandardMaterial map={makeTileTex(innerD / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      {aboveH > 0.001 && (
        <mesh position={[bR - 0.001, doorH + aboveH / 2, doorZ]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[doorW, aboveH]} />
          <meshStandardMaterial map={makeTileTex(doorW / tileW, aboveH / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {leftLen > 0.001 && (
        <mesh position={[bR - 0.001, WALL_HEIGHT / 2, (bB + doorZmin) / 2]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[leftLen, WALL_HEIGHT]} />
          <meshStandardMaterial map={makeTileTex(leftLen / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      {rightLen > 0.001 && (
        <mesh position={[bR - 0.001, WALL_HEIGHT / 2, (doorZmax + bT) / 2]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[rightLen, WALL_HEIGHT]} />
          <meshStandardMaterial map={makeTileTex(rightLen / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
        </mesh>
      )}
      <mesh position={[cX, WALL_HEIGHT / 2, bT - 0.001]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[innerW, WALL_HEIGHT]} />
        <meshStandardMaterial map={makeTileTex(innerW / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>
      <mesh position={[cX, WALL_HEIGHT / 2, bB + 0.001]}>
        <planeGeometry args={[innerW, WALL_HEIGHT]} />
        <meshStandardMaterial map={makeTileTex(innerW / tileW, WALL_HEIGHT / tileH)} roughness={0.15} metalness={0.05} onBeforeCompile={tileGroutOnBeforeCompile} />
      </mesh>

      {/* 변기 */}
      <Suspense fallback={null}>
        <Toilet position={[bL + 0.30, 0, toiletZ]} rotation={Math.PI / 2} scale={0.4} />
      </Suspense>

      {/* 변기 위 상부장 */}
      {(() => {
        const ucD = 0.30
        const ucH = 0.70
        const ucW = toiletL
        const ucCY = 1.75
        const doorCount = Math.max(1, Math.round(ucW / 0.4))
        const dW = ucW / doorCount
        return (
          <group>
            <mesh position={[bL + ucD / 2, ucCY, toiletZ]}>
              <boxGeometry args={[ucD, ucH, ucW]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {Array.from({ length: doorCount }).map((_, di) => {
              const dt = closetDoorTex.clone()
              dt.wrapS = THREE.RepeatWrapping
              dt.wrapT = THREE.RepeatWrapping
              dt.repeat.set(1, 1)
              dt.colorSpace = THREE.SRGBColorSpace
              const dz = (toiletZ - ucW / 2) + dW / 2 + di * dW
              return (
                <group key={`mb2-uc-${di}`}>
                  <mesh position={[bL + ucD + 0.001, ucCY, dz]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[dW - 0.005, ucH - 0.01]} />
                    <meshStandardMaterial map={dt} roughness={0.45} />
                  </mesh>
                  <mesh position={[bL + ucD + 0.01, ucCY - ucH / 2 + 0.08, dz]}>
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
        <Sink position={[bL + 0.40, 0.61, vanZ + 0.15]} rotation={Math.PI / 2 * 3} scale={1.5} />
      </Suspense>
      {(() => {
        const mR = 0.30
        const mY = 1.45
        const mZ = vanZ - 0.1
        return (
          <group>
            <mesh position={[bL + 0.012, mY, mZ]} rotation={[0, Math.PI / 2, 0]}>
              <circleGeometry args={[mR, 64]} />
              <meshStandardMaterial color="#cfdde8" metalness={0.95} roughness={0.03} />
            </mesh>
            <mesh position={[bL + 0.006, mY, mZ]} rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[mR + 0.005, mR + 0.05, 64]} />
              <meshStandardMaterial
                color={bathActive ? '#fff5e6' : '#444'}
                emissive={bathActive ? '#fff5e6' : '#111'}
                emissiveIntensity={bathActive ? 2.5 : 0.05}
                side={THREE.DoubleSide}
              />
            </mesh>
            {bathActive && (
              <pointLight position={[bL + 0.10, mY, mZ]} intensity={0.6} distance={1.5} decay={2} color="#fff5e6" />
            )}
          </group>
        )
      })()}

      {/* 진입 시 보조 포인트라이트 */}
      {bathActive && (
        <pointLight position={[cX, WALL_HEIGHT - 0.3, (bT + bB) / 2]} intensity={1.5} distance={3} decay={1.5} color="#ffffff" />
      )}

      {/* 샤워부스 */}
      {(() => {
        const glassH = 2.0
        return (
          <group>
            <mesh position={[bL + (innerW * 0.3) / 2 + 0.01, glassH / 2 + 0.02, glassZ]}>
              <boxGeometry args={[innerW * 0.3, glassH, 0.008]} />
              <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
            </mesh>
            <mesh position={[bR - (innerW * 0.3) / 2 - 0.01, glassH / 2 + 0.02, glassZ]}>
              <boxGeometry args={[innerW * 0.3, glassH, 0.008]} />
              <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
            </mesh>
            <mesh position={[cX, glassH / 2 + 0.02, glassZ - 0.001]}>
              <boxGeometry args={[innerW * 0.4, glassH - 0.05, 0.008]} />
              <meshStandardMaterial color="#cfe8f0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
            </mesh>
            <mesh position={[cX + 0.18, 1.05, glassZ - 0.05]}>
              <boxGeometry args={[0.02, 0.18, 0.02]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[cX, glassH + 0.02, glassZ]}>
              <boxGeometry args={[innerW - 0.02, 0.025, 0.025]} />
              <meshStandardMaterial color="#c8c8c8" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        )
      })()}
    </group>
  )
}
