/**
 * 모든 방 바닥 일괄 렌더 — 타일 타입별 병합 (walnut/porcelain/entrance).
 * UV에 repeat을 bake하여 타입당 단일 draw call.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { rooms } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'

export function Floors() {
  const floorTex = useKTX2('/textures/walnut-floor.ktx2')
  const porcelainTex = useKTX2('/textures/porcelain-tile.ktx2')
  const entranceTex = useKTX2('/textures/entrance-tile.ktx2')

  const mergedFloors = useMemo(() => {
    const groups: Array<{
      filterFn: (r: (typeof rooms)[number]) => boolean
      baseTex: THREE.Texture
      roughness: number
    }> = [
      { filterFn: (r) => !r.floorTile, baseTex: floorTex, roughness: 0.35 },
      { filterFn: (r) => r.floorTile === 'porcelain', baseTex: porcelainTex, roughness: 0.2 },
      { filterFn: (r) => r.floorTile === 'entrance', baseTex: entranceTex, roughness: 0.2 },
    ]

    return groups.map(({ filterFn, baseTex, roughness }) => {
      const groupRooms = rooms.filter(filterFn)
      if (groupRooms.length === 0) return null

      const geos = groupRooms.map((room) => {
        const g = new THREE.PlaneGeometry(room.size[0], room.size[1])
        // UV에 repeat bake
        const uv = g.getAttribute('uv') as THREE.BufferAttribute
        const tileSize = room.tileSize ?? 1
        for (let i = 0; i < uv.count; i++) {
          uv.setX(i, uv.getX(i) * (room.size[0] / tileSize))
          uv.setY(i, uv.getY(i) * (room.size[1] / tileSize))
        }
        g.rotateX(-Math.PI / 2)
        g.translate(room.center[0], (room.floorY ?? 0) + 0.001, room.center[1])
        return g
      })

      const merged = mergeGeometries(geos, false)
      geos.forEach(g => g.dispose())

      const tex = baseTex.clone()
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(1, 1) // UV에 이미 bake됨
      tex.colorSpace = THREE.SRGBColorSpace

      return { geometry: merged, texture: tex, roughness }
    }).filter(Boolean) as Array<{ geometry: THREE.BufferGeometry; texture: THREE.Texture; roughness: number }>
  }, [floorTex, porcelainTex, entranceTex])

  return (
    <>
      {mergedFloors.map((floor, i) => (
        <mesh key={i} geometry={floor.geometry} renderOrder={1}>
          <meshStandardMaterial
            map={floor.texture}
            roughness={floor.roughness}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ))}
    </>
  )
}
