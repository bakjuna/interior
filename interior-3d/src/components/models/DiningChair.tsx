/**
 * 다이닝 의자 — 월넛 사이드 프레임(V자 조형) + 가죽 쿠션 + 어두운 앞다리.
 * 참고: /tmp/chair-reference/reference.png (mid-century modern arm chair)
 *
 * 구성:
 *  - SideFrame x2: ExtrudeGeometry (측면 실루엣, X=전후, Y=상하, Z=프레임 두께)
 *    뒷다리 → 좌판높이 junction → 팔걸이 상판 (앞쪽 tapered) → 등받이 지지 → 등받이 상단
 *  - FrontLeg x2: 뒷다리 하부 절반 테이퍼 프로필 (80% 두께), 바닥→좌판 단일 피스
 *  - SeatCushion: 검정 가죽 (rounded rectangle + edge bevel)
 *  - BackrestCushion: 검정 가죽, 약간 뒤로 기울어짐
 *
 * 로컬 축: +X = 정면(앞), +Y = 위, ±Z = 좌/우 측면.
 *
 * F 인터랙션: doorId 제공 시 의자를 뺐다/넣었다 (local -X 방향 400mm 슬라이드).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useKTX2 } from '../../systems/useKTX2'
import { DoorTooltip } from '../ui/DoorTooltip'
import { doorRegistry } from '../../systems/doorRegistry'
import type { DoorId } from '../../data/sectors'

interface DiningChairProps {
  position: [number, number]   // [x, z]
  rotationY?: number
  doorId?: DoorId
  activeDoorId?: DoorId | null
}

export function DiningChair({ position, rotationY = 0, doorId, activeDoorId }: DiningChairProps) {
  // 안방 bookshelf 와 동일한 oak 텍스처 — 원본 이미지 1회 매핑 (UV 는 각 geometry 가 직접 제어)
  const oakBaseTex = useKTX2('/textures/oak-wood.ktx2')
  const frameTex = useMemo(() => {
    const t = oakBaseTex.clone()
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [oakBaseTex])

  // 검정 가죽 — 좌판·등받이 공용. ClampToEdge 로 repeat 없이 한 번 매핑.
  const leatherBaseTex = useLoader(THREE.TextureLoader, '/textures/leather-black.png')
  const leatherTex = useMemo(() => {
    const t = leatherBaseTex.clone()
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [leatherBaseTex])

  // 사이드 프레임 — 뒷다리 (솔리드 Y자 확장, 총 길이 760mm).
  // 중심 X (6° 전방 continuation):
  //   0% Y=0       : X=-0.200, 폭 25mm
  //   50% Y=0.380  : X=-0.150, 폭 50mm  (바닥보다 50mm 앞)
  //   80% Y=0.608  : X=-0.120, 폭 50mm  (연속 방향)
  //   100% Y=0.760 : X=-0.100, 폭 160mm (방사형 Y자, solid)
  // 0~50% quadratic curve, 50~80% 직선, 80~100% cubic Bezier (부드러운 확장).
  const FRAME_T = 0.040

  // 47° fold line. Front 80% (-0.064, 0.608) → back pivot (-0.111, 0.652).
  // Bending 160° (엿가락 휘듯) = rotation of upper around fold axis.
  // Axis 는 lower 내측면 Z 에 위치 → lower 와 upper 가 fold line 에서 edge 공유 (갭 없이 연결).

  // 65% 지점부터 forward tilt 22° (slope 0.132 → 0.404).
  // 0-50%: 원래 curve. 50-65%: old slope (0.132). 65-100%: new slope (0.404).
  // 80% front = (-0.064, 0.608), 100% front outer = (0.053, 0.760), 100% back outer = (-0.108, 0.760).

  const sideFrameLowerGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.2125, 0)
    s.lineTo(-0.1875, 0)
    s.quadraticCurveTo(-0.150, 0.190, -0.125, 0.380)    // → front 50%
    s.lineTo(-0.110, 0.494)                              // → front 65% (old slope 0.132)
    s.lineTo(-0.064, 0.608)                              // → front 80% (new slope 0.404)
    s.lineTo(-0.111, 0.652)                              // fold line 47° → back pivot
    s.bezierCurveTo(-0.113, 0.635, -0.115, 0.620, -0.114, 0.608)
    s.lineTo(-0.160, 0.494)                              // back 65%
    s.lineTo(-0.175, 0.380)                              // back 50%
    s.quadraticCurveTo(-0.200, 0.190, -0.2125, 0)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, {
      depth: FRAME_T, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.003, bevelThickness: 0.003, curveSegments: 16,
    })
  }, [])

  // UPPER — ORIGINAL (mirror 안 함), 렌더에서 160° 회전.
  // 상단 Y자 span 80mm. Top edge 대각선 절단: back-top Y=0.760, front-top Y=0.680 (80mm 낮춤)
  const sideFrameUpperGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.064, 0.608)                                          // front 80%
    s.lineTo(-0.111, 0.652)                                          // fold line 47° → back pivot
    s.bezierCurveTo(-0.107, 0.700, -0.093, 0.760, -0.108, 0.760)     // back up to top
    s.lineTo(-0.028, 0.680)                                          // top edge (대각선, front 80mm 낮춤)
    // front top → front 80%
    s.bezierCurveTo(-0.045, 0.680, -0.055, 0.640, -0.064, 0.608)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, {
      depth: FRAME_T, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.003, bevelThickness: 0.003, curveSegments: 16,
    })
  }, [])

  // Fold line 3D 정보 (47° from vertical)
  const foldLineMidX = (-0.064 + -0.111) / 2   // -0.0875
  const foldLineMidY = (0.608 + 0.652) / 2     // 0.630
  const foldAxisDir = useMemo(() => new THREE.Vector3(-0.7314, 0.6820, 0), [])  // 47° from vertical
  const bendAngle = 160 * Math.PI / 180        // 160° rotation
  const foldLineLen = Math.hypot(-0.111 - (-0.064), 0.652 - 0.608)   // ≈ 0.0644
  // Cylinder 쐐기 축을 foldAxisDir 로 정렬하는 회전 (local +Y → foldAxisDir)
  const foldAxisQuat = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      foldAxisDir.clone().normalize(),
    )
  }, [foldAxisDir])

  // Wedge geometries 별도 (merge 성공 여부와 무관하게 보장)
  const wedgeGeos = useMemo(() => {
    const halfW_ = 0.215
    const result: Record<string, THREE.BufferGeometry> = {}
    for (const sz of [-1, 1]) {
      const axisZ = sz * halfW_
      const axisPos = new THREE.Vector3(foldLineMidX, foldLineMidY, axisZ)
      const wedgeH = foldLineLen + 0.005
      const wedgeR = 0.043
      const thetaS = sz > 0 ? 0 : Math.PI - bendAngle
      const wedge = new THREE.CylinderGeometry(
        wedgeR, wedgeR, wedgeH, 24, 1, false, thetaS, bendAngle,
      )
      // 상단 사선 절단 (slope 0.3 → 내림) + 하단 사선 절단 (slope 0.1 → 올림, 반대 방향)
      const pos = wedge.getAttribute('position') as THREE.BufferAttribute
      const topY = wedgeH / 2
      const botY = -wedgeH / 2
      const slopeTop = (wedgeH * 0.3) / wedgeR
      const slopeBot = (wedgeH * 0.1) / wedgeR
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        const x = pos.getX(i)
        if (y > topY - 1e-4) {
          const newY = Math.max(botY + 0.003, topY - slopeTop * Math.max(0, x))
          pos.setY(i, newY)
        } else if (y < botY + 1e-4) {
          const newY = Math.min(topY - 0.003, botY + slopeBot * Math.max(0, x))
          pos.setY(i, newY)
        }
      }
      pos.needsUpdate = true
      wedge.computeVertexNormals()
      wedge.applyQuaternion(foldAxisQuat)
      wedge.translate(axisPos.x, axisPos.y, axisPos.z)
      // Planar UV projection (world X, Y) + 90° 회전 — mergedSideFrame 과 동일 매핑
      {
        const wpos = wedge.getAttribute('position') as THREE.BufferAttribute
        const xMin = -0.2125, xMax = 0.053
        const yMin = 0, yMax = 0.760
        const scale = Math.max(xMax - xMin, yMax - yMin)
        const wuvs = new Float32Array(wpos.count * 2)
        for (let i = 0; i < wpos.count; i++) {
          const x = wpos.getX(i)
          const y = wpos.getY(i)
          const u0 = (x - xMin) / scale
          const v0 = (y - yMin) / scale
          wuvs[i * 2] = 1 - v0
          wuvs[i * 2 + 1] = u0
        }
        wedge.setAttribute('uv', new THREE.BufferAttribute(wuvs, 2))
      }
      result[String(sz)] = wedge
    }
    return result
  }, [foldAxisDir, foldAxisQuat])

  // 사이드 프레임 merged geometry — lower + rotated upper (wedge 제외)
  const mergedSideFrame = useMemo(() => {
    const halfW_ = 0.215
    const result: Record<string, THREE.BufferGeometry> = {}
    for (const sz of [-1, 1]) {
      const zBase = sz * halfW_
      const lowerZ = sz < 0 ? zBase - FRAME_T : zBase
      const upperZ = lowerZ
      const axisZ = sz * halfW_
      const angle = sz < 0 ? -bendAngle : bendAngle
      const axisPos = new THREE.Vector3(foldLineMidX, foldLineMidY, axisZ)
      const foldQuat = new THREE.Quaternion().setFromAxisAngle(foldAxisDir.clone().normalize(), angle)

      const lower = sideFrameLowerGeo.clone()
      lower.translate(0, 0, lowerZ)

      const upper = sideFrameUpperGeo.clone()
      upper.translate(0, 0, upperZ)
      upper.translate(-axisPos.x, -axisPos.y, -axisPos.z)
      upper.applyQuaternion(foldQuat)
      upper.translate(axisPos.x, axisPos.y, axisPos.z)

      const merged = mergeGeometries([lower, upper])
      if (merged) {
        // Planar UV projection (world X, Y) + 90° 회전 — 모든 면 (caps + side walls) 일관된 oak grain
        const pos = merged.getAttribute('position') as THREE.BufferAttribute
        const xMin = -0.2125, xMax = 0.053
        const yMin = 0, yMax = 0.760
        const scale = Math.max(xMax - xMin, yMax - yMin)   // 정사각형 UV 공간
        const uvs = new Float32Array(pos.count * 2)
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const y = pos.getY(i)
          // 정규화 원본 UV
          const u0 = (x - xMin) / scale
          const v0 = (y - yMin) / scale
          // 90° 회전: (u, v) → (1 - v, u)
          uvs[i * 2] = 1 - v0
          uvs[i * 2 + 1] = u0
        }
        merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        result[String(sz)] = merged
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideFrameLowerGeo, sideFrameUpperGeo, foldAxisDir, foldAxisQuat])

  // 밝게 + 붉은 기운 tint — R 채널 1.5× 추가 boost
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: frameTex,
    color: new THREE.Color(1.3875, 1.175, 1.175),   // tint 한 번 더 절반 — 약 17.5% brighter + 12.5% redness
    roughness: 0.55,
    metalness: 0.05,
  }), [frameTex])

  const halfW = 0.215              // 좌판 반폭 (Z 방향)
  const seatTopY = 0.440
  const seatCushionH = 0.060
  const seatD = 0.440              // 좌판 X 깊이
  const seatW = 2 * halfW          // 좌판 Z 폭 (프레임 사이)

  // 앞다리 geo — 뒷다리 하부 절반 (sideFrame Y=0~0.380) 테이퍼드 프로필을 seatTopY 로 Y-스케일,
  // 두께는 X·Z 모두 뒷다리의 80%. 단일 피스로 바닥~좌판 전체 높이 커버.
  const frontLegGeo = useMemo(() => {
    const H = seatTopY
    const s = new THREE.Shape()
    // 80% of back leg widths: 20mm (Y=0) → 40mm (Y=H), centered at X=0
    s.moveTo(-0.010, 0)
    s.lineTo(0.010, 0)
    s.quadraticCurveTo(0.020, H * 0.5, 0.020, H)
    s.lineTo(-0.020, H)
    s.quadraticCurveTo(-0.020, H * 0.5, -0.010, 0)
    s.closePath()
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: FRAME_T * 0.8, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.0015, bevelThickness: 0.0015, curveSegments: 16,
    })
    // Planar UV projection (local X, Y) + 90° 회전 — 뒷다리와 동일. 옆면(side walls) 포함 일관된 oak grain.
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const xMin = -0.020, xMax = 0.020
    const yMin = 0, yMax = H
    const scale = Math.max(xMax - xMin, yMax - yMin)
    const uvs = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const u0 = (x - xMin) / scale
      const v0 = (y - yMin) / scale
      // 90° 회전: (u, v) → (1 - v, u)
      uvs[i * 2] = 1 - v0
      uvs[i * 2 + 1] = u0
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    return geo
  }, [])

  // 좌판 쿠션 geo — rounded rectangle 을 ExtrudeGeometry 로 Y 방향 extrude.
  // Shape 은 XY 평면에 정의 (X=seatD, Y=seatW-0.008), 렌더에서 [-π/2, 0, 0] 회전으로 flat.
  // bevel 로 위·아래 edge 도 부드럽게 — 총 높이 = seatCushionH (= depth + 2·bevelThickness).
  const seatCushionGeo = useMemo(() => {
    const w = seatD
    const d = seatW - 0.008
    const r = 0.024                 // border radius (corners)
    const bevelT = 0.005            // edge softening
    const depth = seatCushionH - 2 * bevelT
    const hw = w / 2
    const hd = d / 2
    const s = new THREE.Shape()
    s.moveTo(-hw + r, -hd)
    s.lineTo(hw - r, -hd)
    s.quadraticCurveTo(hw, -hd, hw, -hd + r)
    s.lineTo(hw, hd - r)
    s.quadraticCurveTo(hw, hd, hw - r, hd)
    s.lineTo(-hw + r, hd)
    s.quadraticCurveTo(-hw, hd, -hw, hd - r)
    s.lineTo(-hw, -hd + r)
    s.quadraticCurveTo(-hw, -hd, -hw + r, -hd)
    s.closePath()
    const geo = new THREE.ExtrudeGeometry(s, {
      depth, bevelEnabled: true, bevelSegments: 4,
      bevelSize: bevelT, bevelThickness: bevelT, curveSegments: 12,
    })
    // Top-down planar UV — XY bounding box [0,1] 매핑. 텍스처가 좌판 전체에 한 번만 적용.
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const uvs = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = (pos.getX(i) + hw) / w
      uvs[i * 2 + 1] = (pos.getY(i) + hd) / d
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    return geo
  }, [])

  // 등받이 geo — rounded rectangle (shape X=width 0.360 → 세계Z, shape Y=height 0.280 → 세계Y),
  // 두께 0.065 세계X extrude. 강한 corner radius (70mm) + edge bevel (12mm) → 모든 모서리 round.
  // 렌더에서 [0, π/2, 0] 회전으로 local-Z extrusion 을 세계 X 축에 정렬.
  const backrestGeo = useMemo(() => {
    const w = 0.370
    const h = 0.285
    const depth = 0.065
    const r = 0.070              // strong corner radius (쿠션 24mm 의 ~3배)
    const bevelT = 0.012         // 3D edge softening (앞/뒤 면 round)
    const depthCore = depth - 2 * bevelT
    const hw = w / 2
    const hh = h / 2
    const s = new THREE.Shape()
    s.moveTo(-hw + r, -hh)
    s.lineTo(hw - r, -hh)
    s.quadraticCurveTo(hw, -hh, hw, -hh + r)
    s.lineTo(hw, hh - r)
    s.quadraticCurveTo(hw, hh, hw - r, hh)
    s.lineTo(-hw + r, hh)
    s.quadraticCurveTo(-hw, hh, -hw, hh - r)
    s.lineTo(-hw, -hh + r)
    s.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
    s.closePath()
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: depthCore, bevelEnabled: true, bevelSegments: 5,
      bevelSize: bevelT, bevelThickness: bevelT, curveSegments: 16,
    })
    geo.translate(0, 0, -depthCore / 2)   // local Z 대칭 (thickness 중앙 정렬)

    // Front/back face planar UV — XY bounding box [0,1] 매핑 (가죽 텍스처 한 번)
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const uvs = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = (pos.getX(i) + hw) / w
      uvs[i * 2 + 1] = (pos.getY(i) + hh) / h
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    return geo
  }, [])

  // F 인터랙션 — 의자 뒤로 400mm 빼기 (local -X 방향)
  const PULL_DISTANCE = 0.40
  const [isOut, setIsOut] = useState(false)
  const innerGroupRef = useRef<THREE.Group>(null)
  const offsetRef = useRef(0)
  const { invalidate } = useThree()

  const toggleRef = useRef(() => {})
  toggleRef.current = () => setIsOut(v => !v)
  useEffect(() => {
    if (!doorId) return
    doorRegistry.register({
      id: doorId,
      position,
      y: 0.45,
      toggle: () => toggleRef.current(),
    })
    return () => doorRegistry.unregister(doorId)
  }, [doorId, position])

  useFrame((_, rawDelta) => {
    if (!doorId) return
    const delta = Math.min(rawDelta, 0.05)
    const target = isOut ? -PULL_DISTANCE : 0
    const diff = target - offsetRef.current
    if (Math.abs(diff) > 0.001) {
      offsetRef.current += diff * Math.min(1, delta * 5)
      if (innerGroupRef.current) innerGroupRef.current.position.x = offsetRef.current
      invalidate()
    } else if (offsetRef.current !== target) {
      offsetRef.current = target
      if (innerGroupRef.current) innerGroupRef.current.position.x = offsetRef.current
      invalidate()
    }
  })

  const isActive = !!doorId && activeDoorId === doorId

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotationY, 0]}>
      <group ref={innerGroupRef}>
      {/* 좌/우 사이드 프레임 — merged (lower+upper) + 별도 wedge mesh.
          Wedge 는 merge 에서 분리되어 확실히 렌더 보장. */}
      {[-1, 1].map((sz) => {
        const zBase = sz * halfW
        const lowerZ = sz < 0 ? zBase - FRAME_T : zBase
        const upperZ = lowerZ
        const axisZ = sz * halfW
        const merged = mergedSideFrame[String(sz)]
        const wedgeGeo = wedgeGeos[String(sz)]
        return (
          <group key={`side-${sz}`}>
            {merged ? (
              <mesh geometry={merged} material={frameMat} />
            ) : (
              <>
                <mesh position={[0, 0, lowerZ]} geometry={sideFrameLowerGeo} material={frameMat} />
                <FoldGroup
                  axisPosition={[foldLineMidX, foldLineMidY, axisZ]}
                  axisDir={foldAxisDir}
                  angle={sz < 0 ? -bendAngle : bendAngle}
                >
                  <mesh position={[0, 0, upperZ]} geometry={sideFrameUpperGeo} material={frameMat} />
                </FoldGroup>
              </>
            )}
            {/* Wedge — 사선 절단된 160° cylinder */}
            <mesh geometry={wedgeGeo} material={frameMat} />
          </group>
        )
      })}

      {/* 앞다리 — 뒷다리 하부 절반 테이퍼 프로필 (80% 두께), 단일 피스 (Y=0→seatTopY, 20mm→40mm 확장).
          좌우 간격 50mm 축소 (각 다리 25mm씩 중앙으로 이동). */}
      {[-1, 1].map((sz) => {
        const zOffset = sz * (halfW - 0.037) - (FRAME_T * 0.8) / 2
        return (
          <mesh
            key={`front-leg-${sz}`}
            position={[0.195, 0, zOffset]}
            geometry={frontLegGeo}
            material={frameMat}
          />
        )
      })}

      {/* 좌판 쿠션 — 검정 가죽 (rounded rectangle + 부드러운 edge bevel), leather 텍스처 한 번 매핑 */}
      <mesh
        position={[0, seatTopY + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={seatCushionGeo}
      >
        <meshStandardMaterial map={leatherTex} roughness={0.65} metalness={0.04} />
      </mesh>

      {/* 등받이 쿠션 — 검정 가죽, 6° 뒤로 기울어짐. rounded rectangle (strong corner r=70mm + edge bevel 12mm).
          backrestGeo 는 shape XY 평면 정의, mesh 를 [0, π/2, 0] 회전하여 extrusion 을 세계 X 축(두께)에 정렬. */}
      <group position={[-0.195, 0.705, 0]} rotation={[0, 0, Math.PI * 6 / 180]}>
        <mesh rotation={[0, Math.PI / 2, 0]} geometry={backrestGeo}>
          <meshStandardMaterial map={leatherTex} roughness={0.65} metalness={0.04} />
        </mesh>
      </group>

      {/* 등받이↔좌판 연결 나무 스파인 — 폭 60mm(세계 Z), 두께 15mm, 길이 350mm, 6° 뒤로 기울어짐 (등받이와 동일 각도).
          원 위치에서 세계 -X 20mm 이동 (등받이쪽으로 더 깊이 박힘). 뒷다리·사이드프레임과 동일한 frameMat (boosted walnut). */}
      <group position={[-0.196, 0.645, 0]} rotation={[0, 0, Math.PI * 6 / 180]}>
        <mesh material={frameMat}>
          <boxGeometry args={[0.015, 0.350, 0.100]} />
        </mesh>
      </group>
      </group>

      {/* F 툴팁 — 의자 원래 위치 (쑥 들어간 상태 기준) 에 고정, 내부 그룹 밖 */}
      {isActive && (
        <DoorTooltip
          position={[0, 0.65, 0]}
          label={isOut ? '의자 넣기' : '의자 빼기'}
        />
      )}
    </group>
  )
}

/**
 * Fold helper — 임의 축(axisDir)을 지나는 point(axisPosition) 에서 angle rad 만큼 회전.
 * 자식 mesh/group 은 원래 world 좌표로 배치되어 있다고 가정.
 */
function FoldGroup({
  axisPosition,
  axisDir,
  angle,
  children,
}: {
  axisPosition: [number, number, number]
  axisDir: THREE.Vector3
  angle: number
  children: ReactNode
}) {
  const quat = useMemo(() => {
    return new THREE.Quaternion().setFromAxisAngle(axisDir.clone().normalize(), angle)
  }, [axisDir, angle])
  return (
    <group position={axisPosition}>
      <group quaternion={quat}>
        <group position={[-axisPosition[0], -axisPosition[1], -axisPosition[2]]}>
          {children}
        </group>
      </group>
    </group>
  )
}
