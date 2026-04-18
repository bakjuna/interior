/**
 * 안방 침대 (GLTF). 이불 머티리얼만 베이지 단색으로 교체.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { MB_W, WALL_THICKNESS } from '../../data/apartment'

const mbLeft = -WALL_THICKNESS - MB_W

// GLTF 로컬 AABB (측정값, m): X=1.8398(폭) Y=0.9106(높이) Z=2.0(길이), min Y=-0.4553
// 목표 박스 2200×1600×1100mm 에 맞춰 축별 비균일 스케일
const SRC_LEN = 2.0
const SRC_WIDTH = 1.8398
const SRC_HEIGHT = 0.9106
const SRC_MIN_Y = -0.4553
const TGT_LEN = 2.2
const TGT_WIDTH = 1.6
const TGT_HEIGHT = 1.1
const scaleX = TGT_WIDTH / SRC_WIDTH
const scaleY = TGT_HEIGHT / SRC_HEIGHT
const scaleZ = TGT_LEN / SRC_LEN

export function Bed() {
  const { scene } = useGLTF('/models/bed/scene.gltf')
  const cloned = useMemo(() => {
    const s = scene.clone()
    s.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material
        if (mat.name === 'initialShadingGroup') {
          const newMat = mat.clone()
          newMat.map = null
          newMat.color = new THREE.Color('#f0ece0')
          newMat.roughness = 0.8
          newMat.normalMap = null
          child.material = newMat
        }
      }
    })
    return s
  }, [scene])

  // 회전 π/2 후 월드 X=길이, 월드 Z=폭.
  const bedHalfLen = (SRC_LEN / 2) * scaleZ  // 1.1
  const partEastX = mbLeft + 1.476 + 0.025
  const bedX = partEastX + bedHalfLen
  // 북측 가벽 오픈 끝(= 본가벽 북단, z=0.9) 에 침대 북쪽 면 정렬
  const partNorthEndZ = 0.9
  const bedZ = partNorthEndZ + TGT_WIDTH / 2
  const bedY = -SRC_MIN_Y * scaleY  // 바닥(y=0)에 침대 밑면 정렬
  return (
    <primitive
      object={cloned}
      scale={[scaleX, scaleY, scaleZ]}
      position={[bedX, bedY, bedZ]}
      rotation={[0, Math.PI / 2, 0]}
    />
  )
}
