/**
 * 모든 방 바닥 일괄 렌더 — 타일 타입별 병합 (walnut/porcelain/entrance).
 * UV에 repeat을 bake하여 타입당 단일 draw call.
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { rooms } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'
import { tileGroutOnBeforeCompile } from '../primitives/bathroomTile'
import { woodPlankOnBeforeCompile } from '../primitives/woodPlankTile'
import { grayTileGroutOnBeforeCompile } from '../primitives/grayTile'

// 우드 플랭크 1장 크기 (m): 폭(world X) × 길이(world Z)
const WOOD_PLANK_W = 0.15
const WOOD_PLANK_L = 0.9

export function Floors() {
  const floorTex = useKTX2('/textures/walnut-floor.ktx2')
  const porcelainTex = useKTX2('/textures/porcelain-tile.ktx2')
  const entranceTex = useKTX2('/textures/entrance-tile.v2.ktx2')
  const bathFloorTex = useKTX2('/textures/bathroom-wall-tile-cream.ktx2')
  const woodTex = useLoader(THREE.TextureLoader, '/textures/wood-tile-150x900.png')
  const grayTileTex = useLoader(THREE.TextureLoader, '/textures/laundry-gray-tile.jpg')

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
      grayGrout?: boolean   // 회색 정사각 타일 메지
      terracotta?: boolean  // 90도 회전 + 현관 기준 절대 스케일 반복
      wood?: boolean        // 우드 플랭크 150×900 + 러닝본드 메지
      bathFloor?: boolean   // 욕실 바닥 600×1200 직사각 타일 (U=0.6, V=1.2)
    }> = [
      { filterFn: (r) => !r.floorTile, baseTex: floorTex, roughness: 0.35 },
      { filterFn: (r) => r.floorTile === 'porcelain', baseTex: porcelainTex, roughness: 0.2 },
      { filterFn: (r) => r.floorTile === 'entrance', baseTex: entranceTex, roughness: 0.9, terracotta: true },
      { filterFn: (r) => r.floorTile === 'wood', baseTex: woodTex, roughness: 0.45, wood: true },
      { filterFn: (r) => r.floorTile === 'graytile', baseTex: grayTileTex, roughness: 0.4, grayGrout: true },
      { filterFn: (r) => r.floorTile === 'bathWall', baseTex: bathFloorTex, roughness: 0.2, color: '#ffffff', grout: true, bathFloor: true },
    ]

    return groups.map(({ filterFn, baseTex, roughness, color, grout, grayGrout, terracotta, wood, bathFloor }) => {
      const groupRooms = rooms.filter(filterFn)
      if (groupRooms.length === 0) return null

      const geos = groupRooms.map((room) => {
        const g = new THREE.PlaneGeometry(room.size[0], room.size[1])
        const uv = g.getAttribute('uv') as THREE.BufferAttribute
        const tileSize = room.tileSize ?? 1
        for (let i = 0; i < uv.count; i++) {
          const u0 = uv.getX(i)
          const v0 = uv.getY(i)
          if (wood) {
            // 90도 회전: 판 길이(이미지 가로 u) ← world X, 판 폭(이미지 세로 v) ← world Z
            uv.setX(i, u0 * (room.size[0] / WOOD_PLANK_L))
            uv.setY(i, v0 * (room.size[1] / WOOD_PLANK_W))
          } else if (terracotta) {
            uv.setX(i, v0 * (room.size[1] / TERRACOTTA_IMG_W))
            uv.setY(i, (1 - u0) * (room.size[0] / TERRACOTTA_IMG_H))
          } else if (bathFloor) {
            // 욕실 바닥 600×1200 직사각 타일: U=0.6m, V=1.2m (메지 셰이더 gx/gy 와 일치)
            uv.setX(i, u0 * (room.size[0] / 0.6))
            uv.setY(i, v0 * (room.size[1] / 1.2))
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

      return { geometry: merged, texture: tex, roughness, color: color ?? '#ffffff', grout: grout ?? false, grayGrout: grayGrout ?? false, wood: wood ?? false }
    }).filter(Boolean) as Array<{ geometry: THREE.BufferGeometry; texture: THREE.Texture; roughness: number; color: string; grout: boolean; grayGrout: boolean; wood: boolean }>
  }, [floorTex, porcelainTex, entranceTex, bathFloorTex, woodTex, grayTileTex])

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
            onBeforeCompile={floor.grout ? tileGroutOnBeforeCompile : floor.grayGrout ? grayTileGroutOnBeforeCompile : floor.wood ? woodPlankOnBeforeCompile : undefined}
          />
        </mesh>
      ))}
    </>
  )
}
