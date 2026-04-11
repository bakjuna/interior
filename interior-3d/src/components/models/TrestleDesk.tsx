/**
 * 책상 — IKEA IDÅSEN 스타일 트레슬 레그 + 블랙 상판.
 * position: 상판 중심 월드 좌표 [x, z]
 * rotationY: 상판 긴 변 방향 (0 = X축, π/2 = Z축)
 */

import { useMemo } from 'react'
import * as THREE from 'three'

interface TrestleDeskProps {
  position: [number, number]
  rotationY?: number
  width?: number
  depth?: number
  height?: number
  topT?: number
  topColor?: string
  legColor?: string
  hideBraces?: boolean
  braceScale?: number
  topMap?: THREE.Texture
}

export function TrestleDesk({
  position,
  rotationY = 0,
  width = 1.800,
  depth = 0.720,
  height = 0.730,
  topT = 0.025,
  topColor = '#121212',
  legColor = '#3a3a3d',
  hideBraces = false,
  braceScale = 1,
  topMap,
}: TrestleDeskProps) {
  const legInset = 0.150
  const postT = 0.050
  const braceT = 0.030
  const footLen = depth - 0.10
  const postH = height - topT
  const topSurfaceY = height
  const topCenterY = topSurfaceY - topT / 2

  const legXs = [-width / 2 + legInset, width / 2 - legInset]

  const footH = 0.030
  const footW = hideBraces ? postT * 1.6 : postT
  const footTaper = 0.050  // 끝 50mm 구간에서 아래로 곡선
  // 측면 프로파일 (YZ plane): Y=높이, Z=길이. X 방향으로 extrude.
  const footGeo = useMemo(() => {
    const hl = footLen / 2
    const taperStart = hl - footTaper
    const s = new THREE.Shape()
    // 하면: 평평 (전체 길이)
    s.moveTo(-hl, 0)
    s.lineTo(hl, 0)
    // 우측 끝: 상면이 곡선으로 올라감
    s.quadraticCurveTo(hl, footH, taperStart, footH)
    // 상면: 평평 (중앙 구간)
    s.lineTo(-taperStart, footH)
    // 좌측 끝: 상면이 곡선으로 내려감
    s.quadraticCurveTo(-hl, footH, -hl, 0)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: footW, bevelEnabled: false })
  }, [footLen, footW])

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, topCenterY, 0]}>
        <boxGeometry args={[width, topT, depth]} />
        <meshStandardMaterial color={topColor} map={topMap} roughness={0.35} metalness={0.1} />
      </mesh>

      {legXs.map((lx, i) => {
        const pivotY = postH / 2
        return (
          <group key={`leg-${i}`} position={[lx, 0, 0]}>
            <mesh position={[0, pivotY, 0]}>
              {hideBraces
                ? <boxGeometry args={[postT, postH, postT]} />
                : <cylinderGeometry args={[postT / 2, postT / 2, postH, 16]} />}
              <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
            </mesh>
            <mesh position={[-footW / 2, 0.005, 0]} rotation={[0, Math.PI / 2, 0]} geometry={footGeo}>
              <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
            </mesh>

            {!hideBraces && [-1, 1].map((dir) => {
              const dz = dir * (footLen / 2 - 0.030)
              const braceH = (postH - 0.070) * braceScale
              // 사선: 중간(by) 중앙 → 하단(cy=발) 양쪽으로 벌어짐
              const by = 0.02 + braceH  // 상단 시작점 (포스트 중간)
              const cy = 0.02           // 하단 끝점 (발 높이)
              const midY = (by + cy) / 2
              const midZ = dz / 2
              const len = Math.hypot(by - cy, dz)
              const angle = Math.atan2(-dz, by - cy)
              return (
                <mesh
                  key={`br-${dir}`}
                  position={[0, midY, midZ]}
                  rotation={[angle, 0, 0]}
                >
                  <cylinderGeometry args={[braceT / 2, braceT / 2, len, 12]} />
                  <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.5} />
                </mesh>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
