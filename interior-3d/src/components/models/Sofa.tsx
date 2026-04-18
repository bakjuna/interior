/**
 * 거실 L자 모듈러 소파 — 3000(X) × 1500(Z) × 700(Y) mm, 다리 없음.
 * 서쪽(X=0): 두꺼운 armrest 350mm (높이 550mm, full 높이에서 150mm 낮춤)
 * 동쪽(X=3000): wrap-around back 200mm (full 높이 700mm)
 * 3개 좌석 (동→서: 750 / 750 / 950):
 *   - 동측 750 좌석: 깊이 1250mm (chaise, 전면까지 연장)
 *   - 중간 750 / 서측 950 좌석: 깊이 700mm
 * 3개 백쿠션: 바닥까지 닿음 (Y=[0, 700]), Z=[1250, 1500] 위치.
 * Throw pillow 2개.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBox } from '@react-three/drei'
import { useKTX2 } from '../../systems/useKTX2'
import { LR_W, LR_D } from '../../data/apartment'

/**
 * 커스텀 pillow geometry — 사방 perimeter 가 닫히고(Z=0) parabolic seam, 중앙 부풀어 오름.
 * 정면 face 실루엣도 4 모서리만 extreme, edge midpoint 는 안쪽으로 오목하게 수렴.
 * Z: sin²(πu) × sin²(πv) → edge 에서 derivative=0 (둥근 seam)
 * X, Y: corner 는 (±W/2, ±H/2) 고정, edge midpoint 는 안쪽으로 edgePull 만큼 당김.
 */
function makePillowGeometry(W: number, H: number, thickness: number, segments = 32) {
  const geom = new THREE.BufferGeometry()
  const positions: number[] = []
  const indices: number[] = []
  const nx = segments, ny = segments

  const edgePull = 0.06   // edge midpoint 안쪽 당김 (6%)
  const cornerR = 0.06    // 베이스 모양의 corner radius (60mm) — 날카로운 모서리 제거

  // Z 깊이: sin^0.5(πu) × sin^0.5(πv) — 중앙 plateau + 주변부도 볼록 (편차 감소)
  //   (0.1, 0.5) 위치: 0.556 (기존 0.8 지수: 0.386) → 주변부 훨씬 빵빵
  //   (0.3, 0.5) 위치: 0.9 (plateau 넓게 확장)
  const getDepth = (u: number, v: number) => {
    return Math.sqrt(Math.sin(Math.PI * u) * Math.sin(Math.PI * v))
  }

  // X/Y 변위:
  // 1) 베이스 모양 = rounded rectangle. 4 corner 영역에 있는 점을 arc(radius=cornerR)에 snap.
  // 2) 그 위에 edge midpoint 를 안쪽으로 당기는 concave pull (sin×cos 가중치) 적용.
  const getXY = (u: number, v: number): [number, number] => {
    let x = u * W - W / 2
    let y = v * H - H / 2

    // --- 1) 각 corner 별 arc clamp ---
    //   sgnU/V: corner 가 속한 사분면. arc center = (sgnU*(W/2-R), sgnV*(H/2-R)).
    //   점이 arc center 기준으로 corner 방향에 있고 (sgn*(pos-center) > 0) 거리가 R 를 초과하면
    //   arc 위로 project → 결과적으로 rounded rectangle 베이스가 됨.
    const sgns: Array<[1 | -1, 1 | -1]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    for (const [sgnU, sgnV] of sgns) {
      const arcCx = sgnU * (W / 2 - cornerR)
      const arcCy = sgnV * (H / 2 - cornerR)
      if (sgnU * (x - arcCx) > 0 && sgnV * (y - arcCy) > 0) {
        const dx = x - arcCx
        const dy = y - arcCy
        const dist = Math.hypot(dx, dy)
        if (dist > cornerR) {
          const s = cornerR / dist
          x = arcCx + dx * s
          y = arcCy + dy * s
        }
      }
    }

    // --- 2) concave edge pull (rounded rect base 위에) ---
    const su = Math.sin(Math.PI * u)
    const sv = Math.sin(Math.PI * v)
    const cu = Math.cos(Math.PI * u)
    const cv = Math.cos(Math.PI * v)
    x += cu * sv * edgePull * W
    y += cv * su * edgePull * H

    return [x, y]
  }

  const uvs: number[] = []
  // Top face (+Z)
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny
      const [x, y] = getXY(u, v)
      positions.push(x, y, getDepth(u, v) * thickness / 2)
      uvs.push(u, v)
    }
  }
  const topCount = (nx + 1) * (ny + 1)
  // Bottom face (-Z)
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny
      const [x, y] = getXY(u, v)
      positions.push(x, y, -getDepth(u, v) * thickness / 2)
      uvs.push(u, v)
    }
  }
  // Top indices (CCW → +Z normal)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i
      const b = a + 1
      const c = a + (nx + 1)
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }
  // Bottom indices (reverse winding → -Z normal)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = topCount + j * (nx + 1) + i
      const b = a + 1
      const c = a + (nx + 1)
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geom.setIndex(indices)
  // perimeter 의 top/bottom 중복 vertex 를 병합 → shading 이 seam 을 가로질러 부드럽게
  const merged = mergeVertices(geom, 1e-4)
  merged.computeVertexNormals()
  return merged
}

export function Sofa() {
  // === 전체 AABB ===
  const W = 3.0
  const D = 1.5
  const H = 0.7

  // === 수직 레이아웃 ===
  const seatTopY = 0.4            // 좌석 표면 높이
  const armrestH = H - 0.15       // 두꺼운 팔걸이 높이 550mm (150mm 낮춤)

  // === 등받이/팔걸이 치수 ===
  const backPadD = 0.25           // 백쿠션 Z 두께
  const wrapLength = 0.7          // armrest / wrap-around Z 길이
  const armW = 0.35               // 서측 두꺼운 팔걸이 폭
  const wrapW = 0.2               // 동측 wrap-around back 폭

  // === 좌석 폭 (동 → 서) ===
  const eastW = 0.75
  const middleW = 0.75
  const westW = 0.95

  // === 좌석 Z 깊이 ===
  const eastSeatD = 1.25          // 동측 750 좌석: 1250mm (chaise 깊이)
  const middleSeatD = 0.7         // 중간 750: 700mm
  const westSeatD = 0.7           // 서측 950: 700mm

  // 좌석 Z 위치 — 모두 백쿠션 앞면에 back-flush
  const seatZBack = D - backPadD                         // 1.25
  const eastSeatCenterZ = seatZBack - eastSeatD / 2      // 0.625 (Z 범위 [0, 1.25])
  const middleSeatCenterZ = seatZBack - middleSeatD / 2  // 0.9   (Z 범위 [0.55, 1.25])
  const westSeatCenterZ = seatZBack - westSeatD / 2      // 0.9

  const seatCenterY = seatTopY / 2  // 0.2

  // 좌석 X 중심 (서→동 순서: armrest - west 950 - middle 750 - east 750 - wrap)
  const armrestCenterX = armW / 2                                   // 0.175
  const westCenterX = armW + westW / 2                              // 0.825
  const middleCenterX = armW + westW + middleW / 2                  // 1.675
  const eastCenterX = armW + westW + middleW + eastW / 2            // 2.425
  const wrapCenterX = W - wrapW / 2                                 // 2.9

  // 백쿠션: 바닥부터 top 까지 (Y=[0, H])
  const backPadCenterY = H / 2    // 0.35

  const r = 0.06
  const rBack = 0.08

  // 패브릭 텍스처 — 스웨이드 느낌. MirroredRepeat 로 타일 seam 숨김.
  const fabricBaseTex = useKTX2('/textures/sofa-fabric.ktx2')
  const fabricTex = useMemo(() => {
    const t = fabricBaseTex.clone()
    t.wrapS = THREE.MirroredRepeatWrapping
    t.wrapT = THREE.MirroredRepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.repeat.set(1, 1)
    return t
  }, [fabricBaseTex])
  const pillowTex = useMemo(() => {
    const t = fabricBaseTex.clone()
    t.wrapS = THREE.MirroredRepeatWrapping
    t.wrapT = THREE.MirroredRepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.repeat.set(1, 1)
    return t
  }, [fabricBaseTex])

  // 공유 pillow geometry — 750×500×300 mm, 빵빵한 plateau 중앙 + 오목 perimeter
  const pillowGeo = useMemo(() => makePillowGeometry(0.75, 0.5, 0.3, 32), [])

  // === 월드 배치 — 동벽 flush, 남측 커튼박스(200mm) + 80mm 여유 ===
  const gx = LR_W - W
  const gz = LR_D - D - 0.08 - 0.2

  return (
    <group position={[gx, 0, gz]}>
      {/* ========== 3개 좌석 모듈 (Y=[0, 0.4]) ========== */}
      {/* West 950 좌석 (armrest 옆) */}
      <RoundedBox
        args={[westW, seatTopY, westSeatD]}
        radius={r}
        smoothness={4}
        position={[westCenterX, seatCenterY, westSeatCenterZ]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>

      {/* Middle 750 좌석 */}
      <RoundedBox
        args={[middleW, seatTopY, middleSeatD]}
        radius={r}
        smoothness={4}
        position={[middleCenterX, seatCenterY, middleSeatCenterZ]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>

      {/* East 750 좌석 — 깊이 1250mm (chaise) */}
      <RoundedBox
        args={[eastW, seatTopY, eastSeatD]}
        radius={r}
        smoothness={4}
        position={[eastCenterX, seatCenterY, eastSeatCenterZ]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>

      {/* ========== 3개 백쿠션 — 바닥까지 닿음, Y=[0, 0.7] ========== */}
      <RoundedBox
        args={[westW, H, backPadD]}
        radius={rBack}
        smoothness={4}
        position={[westCenterX, backPadCenterY, D - backPadD / 2]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>
      <RoundedBox
        args={[middleW, H, backPadD]}
        radius={rBack}
        smoothness={4}
        position={[middleCenterX, backPadCenterY, D - backPadD / 2]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>
      <RoundedBox
        args={[eastW, H, backPadD]}
        radius={rBack}
        smoothness={4}
        position={[eastCenterX, backPadCenterY, D - backPadD / 2]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>

      {/* ========== West 두꺼운 팔걸이 — 높이 550mm (150mm 낮춤) ========== */}
      <RoundedBox
        args={[armW, armrestH, wrapLength]}
        radius={r}
        smoothness={4}
        position={[armrestCenterX, armrestH / 2, D - wrapLength / 2]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>

      {/* ========== East wrap-around back — full 높이 700mm ========== */}
      <RoundedBox
        args={[wrapW, H, wrapLength]}
        radius={r}
        smoothness={4}
        position={[wrapCenterX, H / 2, D - wrapLength / 2]}
      >
        <meshStandardMaterial map={fabricTex} roughness={0.95} />
      </RoundedBox>

      {/* ========== 쿠션 2개 — 750×500×220, 연필심 모서리 + 볼록 중앙 ========== */}
      {/* West 쿠션 */}
      <mesh
        geometry={pillowGeo}
        position={[westCenterX, seatTopY + 0.25, D - backPadD - 0.15]}
        rotation={[0.1, 0.06, -0.03]}
      >
        <meshStandardMaterial map={pillowTex} roughness={0.92} />
      </mesh>

      {/* East 쿠션 */}
      <mesh
        geometry={pillowGeo}
        position={[eastCenterX, seatTopY + 0.25, D - backPadD - 0.15]}
        rotation={[0.1, -0.06, 0.03]}
      >
        <meshStandardMaterial map={pillowTex} roughness={0.92} />
      </mesh>
    </group>
  )
}
