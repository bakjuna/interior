/**
 * 모든 붙박이장 일괄 렌더 — closets[] 데이터 그대로.
 * 본체 + 문짝 (긴 변에 따라 N개 분할) + 상단 몰딩 + 하단 받침.
 */

import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { closets } from '../../data/apartment'

export function Closets() {
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')

  const walnutBodyTex = closetDoorTex.clone()
  walnutBodyTex.wrapS = THREE.RepeatWrapping
  walnutBodyTex.wrapT = THREE.RepeatWrapping
  walnutBodyTex.repeat.set(1, 1)
  walnutBodyTex.colorSpace = THREE.SRGBColorSpace

  return (
    <>
      {closets.map((c, i) => {
        const isZlong = c.size[2] > c.size[0]
        const longSide = isZlong ? c.size[2] : c.size[0]
        const doorWidth = 0.6
        const doorCount = Math.max(2, Math.round(longSide / doorWidth))
        const actualDoorW = longSide / doorCount
        const gap = 0.003

        return (
          <group key={`closet-${i}`}>
            {/* 본체 (뒤판) */}
            <mesh position={c.position}>
              <boxGeometry args={c.size} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>

            {/* 문짝들 */}
            {Array.from({ length: doorCount }).map((_, di) => {
              const doorT = closetDoorTex.clone()
              doorT.wrapS = THREE.RepeatWrapping
              doorT.wrapT = THREE.RepeatWrapping
              doorT.repeat.set(1, 1)
              doorT.colorSpace = THREE.SRGBColorSpace

              const offset = -longSide / 2 + actualDoorW / 2 + di * actualDoorW

              const pos: [number, number, number] = isZlong
                ? [c.position[0] + c.size[0] / 2 + 0.002, c.size[1] / 2, c.position[2] + offset]
                : [c.position[0] + offset, c.size[1] / 2, c.position[2] + c.size[2] / 2 + 0.002]

              const doorW = actualDoorW - gap
              const doorH = c.size[1] - 0.02

              return (
                <group key={`door-${di}`}>
                  <mesh position={pos} rotation={isZlong ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
                    <planeGeometry args={[doorW, doorH]} />
                    <meshStandardMaterial map={doorT} roughness={0.45} />
                  </mesh>
                  <mesh position={[
                    pos[0] + (isZlong ? 0.012 : 0),
                    pos[1],
                    pos[2] + (isZlong ? 0 : 0.012),
                  ]}>
                    <boxGeometry args={[isZlong ? 0.015 : 0.01, 0.1, isZlong ? 0.01 : 0.015]} />
                    <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
                  </mesh>
                </group>
              )
            })}

            {/* 상단 몰딩 */}
            <mesh position={[c.position[0], c.size[1] - 0.01, c.position[2]]}>
              <boxGeometry args={[c.size[0] + 0.005, 0.02, c.size[2] + 0.005]} />
              <meshStandardMaterial color="#2d1f12" roughness={0.5} />
            </mesh>
            {/* 하단 받침 */}
            <mesh position={[c.position[0], 0.04, c.position[2]]}>
              <boxGeometry args={[c.size[0] + 0.005, 0.08, c.size[2] + 0.005]} />
              <meshStandardMaterial color="#2d1f12" roughness={0.5} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}
