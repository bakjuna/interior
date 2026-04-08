/**
 * 모든 붙박이장 일괄 렌더 — closets[] 데이터 그대로.
 * 본체 + 문짝 (긴 변에 따라 N개 분할) + 상단 몰딩 + 하단 받침.
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { closets } from '../../data/apartment'

export function Closets() {
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')

  // 본체 + 모든 문짝에서 동일 텍스처(repeat 1×1) 공유 — clone 1번만.
  const walnutBodyTex = useMemo(() => {
    const t = closetDoorTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [closetDoorTex])

  // closet 별 문짝 정적 데이터 — 1번만 계산
  const closetEntries = useMemo(() => {
    return closets.map((c) => {
      const isZlong = c.size[2] > c.size[0]
      const longSide = isZlong ? c.size[2] : c.size[0]
      const doorWidth = 0.6
      const doorCount = Math.max(2, Math.round(longSide / doorWidth))
      const actualDoorW = longSide / doorCount
      const gap = 0.003
      const doorH = c.size[1] - 0.02

      const doors = Array.from({ length: doorCount }).map((_, di) => {
        const offset = -longSide / 2 + actualDoorW / 2 + di * actualDoorW
        const pos: [number, number, number] = isZlong
          ? [c.position[0] + c.size[0] / 2 + 0.002, c.size[1] / 2, c.position[2] + offset]
          : [c.position[0] + offset, c.size[1] / 2, c.position[2] + c.size[2] / 2 + 0.002]
        const handlePos: [number, number, number] = [
          pos[0] + (isZlong ? 0.012 : 0),
          pos[1],
          pos[2] + (isZlong ? 0 : 0.012),
        ]
        const handleSize: [number, number, number] = [
          isZlong ? 0.015 : 0.01,
          0.1,
          isZlong ? 0.01 : 0.015,
        ]
        const doorRot: [number, number, number] = isZlong ? [0, Math.PI / 2, 0] : [0, 0, 0]
        return { pos, handlePos, handleSize, doorRot, doorW: actualDoorW - gap }
      })

      return {
        body: { position: c.position, size: c.size },
        doors,
        doorH,
        molding: {
          top: [c.position[0], c.size[1] - 0.01, c.position[2]] as [number, number, number],
          base: [c.position[0], 0.04, c.position[2]] as [number, number, number],
          topSize: [c.size[0] + 0.005, 0.02, c.size[2] + 0.005] as [number, number, number],
          baseSize: [c.size[0] + 0.005, 0.08, c.size[2] + 0.005] as [number, number, number],
        },
      }
    })
  }, [])

  return (
    <>
      {closetEntries.map((c, i) => (
        <group key={`closet-${i}`}>
          {/* 본체 (뒤판) */}
          <mesh position={c.body.position}>
            <boxGeometry args={c.body.size} />
            <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
          </mesh>

          {/* 문짝들 */}
          {c.doors.map((d, di) => (
            <group key={`door-${di}`}>
              <mesh position={d.pos} rotation={d.doorRot}>
                <planeGeometry args={[d.doorW, c.doorH]} />
                <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
              </mesh>
              <mesh position={d.handlePos}>
                <boxGeometry args={d.handleSize} />
                <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
              </mesh>
            </group>
          ))}

          {/* 상단 몰딩 */}
          <mesh position={c.molding.top}>
            <boxGeometry args={c.molding.topSize} />
            <meshStandardMaterial color="#2d1f12" roughness={0.5} />
          </mesh>
          {/* 하단 받침 */}
          <mesh position={c.molding.base}>
            <boxGeometry args={c.molding.baseSize} />
            <meshStandardMaterial color="#2d1f12" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </>
  )
}
