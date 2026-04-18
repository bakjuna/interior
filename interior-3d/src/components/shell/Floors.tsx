/**
 * 모든 방 바닥 일괄 렌더 — 타일 타입별 병합 (walnut/porcelain/entrance).
 * UV에 repeat을 bake하여 타입당 단일 draw call.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { rooms } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'
import { tileGroutOnBeforeCompile } from '../primitives/bathroomTile'

export function Floors() {
  const floorTex = useKTX2('/textures/walnut-floor.ktx2')
  const porcelainTex = useKTX2('/textures/porcelain-tile.ktx2')
  const entranceTex = useKTX2('/textures/entrance-tile.v2.ktx2')
  const bathWallTex = useKTX2('/textures/bathroom-wall-tile.ktx2')

  const mergedFloors = useMemo(() => {
    // 테라코타 타일: 타일 중앙(메지 사이) 기준 crop(1649×912) — mirror repeat 에서 경계가 tile 내부라 이음매 불가시
    const TERRACOTTA_IMG_W = 1.456  // 이미지 가로(u) 방향이 덮는 실제 m — world Z (size[1])
    const TERRACOTTA_IMG_H = 0.909  // 이미지 세로(v) 방향이 덮는 실제 m — world X (size[0])

    const groups: Array<{
      filterFn: (r: (typeof rooms)[number]) => boolean
      baseTex: THREE.Texture
      roughness: number
      color?: string
      grout?: boolean
      terracotta?: boolean  // 90도 회전 + 현관 기준 절대 스케일 반복
    }> = [
      { filterFn: (r) => !r.floorTile, baseTex: floorTex, roughness: 0.35 },
      { filterFn: (r) => r.floorTile === 'porcelain', baseTex: porcelainTex, roughness: 0.2 },
      { filterFn: (r) => r.floorTile === 'entrance', baseTex: entranceTex, roughness: 0.9, terracotta: true },
      { filterFn: (r) => r.floorTile === 'bathWall', baseTex: bathWallTex, roughness: 0.2, color: '#d9d9d9', grout: true },
    ]

    return groups.map(({ filterFn, baseTex, roughness, color, grout, terracotta }) => {
      const groupRooms = rooms.filter(filterFn)
      if (groupRooms.length === 0) return null

      const geos = groupRooms.map((room) => {
        const g = new THREE.PlaneGeometry(room.size[0], room.size[1])
        const uv = g.getAttribute('uv') as THREE.BufferAttribute
        const tileSize = room.tileSize ?? 1
        for (let i = 0; i < uv.count; i++) {
          const u0 = uv.getX(i)
          const v0 = uv.getY(i)
          if (terracotta) {
            uv.setX(i, v0 * (room.size[1] / TERRACOTTA_IMG_W))
            uv.setY(i, (1 - u0) * (room.size[0] / TERRACOTTA_IMG_H))
          } else {
            uv.setX(i, u0 * (room.size[0] / tileSize))
            uv.setY(i, v0 * (room.size[1] / tileSize))
          }
        }
        g.rotateX(-Math.PI / 2)
        g.translate(room.center[0], (room.floorY ?? 0) + 0.001, room.center[1])
        return g
      })

      const merged = mergeGeometries(geos, false)
      geos.forEach(g => g.dispose())

      const tex = baseTex.clone()
      const wrap = terracotta ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping
      tex.wrapS = wrap
      tex.wrapT = wrap
      tex.repeat.set(1, 1) // UV에 이미 bake됨
      tex.colorSpace = THREE.SRGBColorSpace

      return { geometry: merged, texture: tex, roughness, color: color ?? '#ffffff', grout: grout ?? false }
    }).filter(Boolean) as Array<{ geometry: THREE.BufferGeometry; texture: THREE.Texture; roughness: number; color: string; grout: boolean }>
  }, [floorTex, porcelainTex, entranceTex, bathWallTex])

  return (
    <>
      {mergedFloors.map((floor, i) => (
        <mesh key={i} geometry={floor.geometry} renderOrder={1} receiveShadow>
          <meshStandardMaterial
            map={floor.texture}
            roughness={floor.roughness}
            color={floor.color}
            polygonOffset
            polygonOffsetFactor={-1}
            onBeforeCompile={floor.grout ? tileGroutOnBeforeCompile : undefined}
          />
        </mesh>
      ))}
    </>
  )
}
