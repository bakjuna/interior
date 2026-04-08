/**
 * 모든 방 바닥 일괄 렌더 — rooms[] 데이터 그대로.
 * 방별 floorTile (porcelain/entrance/walnut) 분기.
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { rooms } from '../../data/apartment'

export function Floors() {
  const floorTex = useLoader(TextureLoader, '/textures/walnut-floor.png')
  const porcelainTex = useLoader(TextureLoader, '/textures/porcelain-tile.png')
  const entranceTex = useLoader(TextureLoader, '/textures/entrance-tile.png')

  const roomFloorTextures = useMemo(() => {
    return rooms.map((room) => {
      const baseTex = room.floorTile === 'porcelain' ? porcelainTex
                    : room.floorTile === 'entrance' ? entranceTex
                    : floorTex
      const tex = baseTex.clone()
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      tex.colorSpace = THREE.SRGBColorSpace
      const tileSize = room.tileSize ?? 1
      tex.repeat.set(room.size[0] / tileSize, room.size[1] / tileSize)
      return tex
    })
  }, [floorTex, porcelainTex, entranceTex])

  return (
    <>
      {rooms.map((room, ri) => {
        const tex = roomFloorTextures[ri]
        const fY = room.floorY ?? 0
        return (
          <mesh
            key={`floor-${room.name}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[room.center[0], fY + 0.001, room.center[1]]}
            renderOrder={1}
          >
            <planeGeometry args={room.size} />
            <meshStandardMaterial
              map={tex}
              roughness={room.floorTile ? 0.2 : 0.35}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
        )
      })}
    </>
  )
}
