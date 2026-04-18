/**
 * 복도 — 메인화장실~아기방 도어 사이 벽에 걸린 저해상도 아크릴 웨딩 사진.
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { WALL_THICKNESS, bath2RightWallX, babyBottom } from '../../data/apartment'

interface HallwayProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
}

export function Hallway({ visible }: HallwayProps) {
  // 64px 가로로 다운스케일된 웨딩 사진 — 아크릴 액자용
  const photoTex = useLoader(THREE.TextureLoader, '/textures/wedding-photo.png')
  const photoMat = useMemo(() => {
    photoTex.magFilter = THREE.LinearFilter
    photoTex.minFilter = THREE.LinearFilter
    photoTex.generateMipmaps = false
    photoTex.colorSpace = THREE.SRGBColorSpace
    photoTex.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.35, metalness: 0 })
  }, [photoTex])

  const acrylicMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#f5f5f3', roughness: 0.25, metalness: 0, transparent: true, opacity: 0.9 }),
    [],
  )

  // 벽 세그먼트: X = bath2RightWallX, Z = [-1.2, babyBottom-0.22] = [-1.2, -2.793]
  const wallEastFaceX = bath2RightWallX + WALL_THICKNESS / 2
  const zSouth = -WALL_THICKNESS - 0.1 - 0.9
  const zNorth = babyBottom - 0.22
  const centerZ = (zSouth + zNorth) / 2

  // 원본 aspect 1924/1284 ≈ 1.498. 가로 80cm 유지 → 세로 ≈ 53.4cm
  const photoW = 0.80
  const photoH = photoW * (1284 / 1924)
  const photoD = 0.01
  const centerY = 1.50
  const centerX = wallEastFaceX + photoD / 2 + 0.002  // 벽에서 2mm 이격

  // BoxGeometry 면 순서: [+X, -X, +Y, -Y, +Z, -Z]. +X 면이 동쪽(복도 방향) = 사진면.
  // 나머지 5면은 흰 아크릴 톤.
  const materials = useMemo(() => [photoMat, acrylicMat, acrylicMat, acrylicMat, acrylicMat, acrylicMat], [photoMat, acrylicMat])

  return (
    <group visible={visible}>
      <mesh position={[centerX, centerY, centerZ]} material={materials}>
        <boxGeometry args={[photoD, photoH, photoW]} />
      </mesh>
    </group>
  )
}
