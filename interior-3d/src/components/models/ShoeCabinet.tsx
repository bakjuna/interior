/**
 * 4칸 신발장 — 1470mm 폭, 400mm 깊이, 2000mm 높이.
 *
 * 구성:
 * - col 0~2: 하부 도어 (850mm) + 오픈 선반 (250mm, 월넛 라이너 + 상부 LED) + 상부 도어 (900mm)
 * - col 3: 풀 높이 전신거울
 * - 하단 100mm 띄움 + 4개 다운라이트
 *
 * active prop: LED + 다운라이트 활성 (현관 진입 또는 allLightsOn)
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { LR_W, WALL_THICKNESS } from '../../data/apartment'
import { useKTX2 } from '../../systems/useKTX2'

const T2 = WALL_THICKNESS / 2

interface ShoeCabinetProps {
  active: boolean
}

export function ShoeCabinet({ active }: ShoeCabinetProps) {
  const walnutDoorTex = useKTX2('/textures/walnut_door.ktx2')

  const walnutLinerTex2x1 = useMemo(() => {
    const tex = walnutDoorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [walnutDoorTex])

  const walnutLinerTex1x1 = useMemo(() => {
    const tex = walnutDoorTex.clone()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 1)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [walnutDoorTex])

  const totalW = 1.470
  const depth = 0.400
  const floorClear = 0.100
  const cabH = 2.000
  const topY = floorClear + cabH
  const lowerH = 0.850
  const openH = 0.250
  const upperH = 0.900
  const colW = totalW / 4
  const zBack = -T2 - T2
  const zFront = zBack - depth
  const zCenter = (zBack + zFront) / 2
  const xLeft = LR_W - 1.481 + 0.005
  const xCenter = xLeft + totalW / 2
  const lowerCenterY = floorClear + lowerH / 2
  const upperCenterY = floorClear + lowerH + openH + upperH / 2
  const bodyColor = '#f5f3f0'
  const doorColor = '#fafaf8'
  const t = 0.018

  // 오픈 선반 LED 위치 — IIFE 밖으로 추출 (lights를 root group 밖에 배치하기 위함)
  const ledInteriorLeft = xLeft + t / 2
  const ledInteriorRight = xLeft + colW * 3 - t / 2
  const ledInteriorTop = floorClear + lowerH + openH - t
  const ledInteriorCx = (ledInteriorLeft + ledInteriorRight) / 2
  const ledInteriorWidth = ledInteriorRight - ledInteriorLeft
  const ledStripDepth = 0.010
  const ledStripZ = zBack - t - ledStripDepth / 2 - 0.002
  const ledStripY = ledInteriorTop - 0.001

  // 다운라이트 위치
  const dlY = floorClear - t - 0.002

  return (
    <>
      {/* lights outside group for stable Three.js light count */}
      <rectAreaLight
        position={[ledInteriorCx, ledStripY - 0.002, ledStripZ]}
        width={ledInteriorWidth}
        height={ledStripDepth}
        intensity={active ? 60 : 0}
        color="#ffe0b0"
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {[0, 1, 2, 3].map((ci) => (
        <pointLight
          key={`shoe-dl-light-${ci}`}
          position={[xLeft + colW * (ci + 0.5), dlY - 0.005, zCenter]}
          intensity={active ? 1.5 : 0}
          distance={1.5}
          decay={2}
          color="#ffe0b0"
          castShadow
          shadow-mapSize-width={128}
          shadow-mapSize-height={128}
          shadow-bias={-0.002}
        />
      ))}
      <group>
      {/* 백패널 */}
      <mesh position={[xCenter, floorClear + cabH / 2, zBack - t / 2]}>
        <boxGeometry args={[totalW, cabH, t]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      {/* 서쪽 옆면 */}
      <mesh position={[xLeft - t / 2, topY / 2, zCenter]}>
        <boxGeometry args={[t, topY, depth]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      {/* 동쪽 옆면 */}
      <mesh position={[xLeft + totalW + t / 2, topY / 2, zCenter]}>
        <boxGeometry args={[t, topY, depth]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      {/* 상판 */}
      <mesh position={[xCenter, topY + t / 2, zCenter]}>
        <boxGeometry args={[totalW + t * 2, t, depth]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      {/* 하판 */}
      <mesh position={[xCenter, floorClear - t / 2, zCenter]}>
        <boxGeometry args={[totalW + t * 2, t, depth]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>

      {[1, 2].map((i) => (
        <group key={`shoe-div-${i}`}>
          <mesh position={[xLeft + colW * i, floorClear + lowerH / 2, zCenter]}>
            <boxGeometry args={[t, lowerH, depth - 0.01]} />
            <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
          </mesh>
          <mesh position={[xLeft + colW * i, floorClear + lowerH + openH + upperH / 2, zCenter]}>
            <boxGeometry args={[t, upperH, depth - 0.01]} />
            <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
          </mesh>
        </group>
      ))}
      <mesh position={[xLeft + colW * 3, floorClear + cabH / 2, zCenter]}>
        <boxGeometry args={[t, cabH, depth - 0.01]} />
        <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
      </mesh>
      <mesh position={[xLeft + colW * 1.5, floorClear + lowerH + t / 2, zCenter]}>
        <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      <mesh position={[xLeft + colW * 1.5, floorClear + lowerH + openH - t / 2, zCenter]}>
        <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>

      {/* 오픈 선반 내측 월넛 라이너 */}
      {(() => {
        const interiorLeft = xLeft + t / 2
        const interiorRight = xLeft + colW * 3 - t / 2
        const interiorBottom = floorClear + lowerH + t
        const interiorTop = floorClear + lowerH + openH - t
        const interiorWidth = interiorRight - interiorLeft
        const interiorHeight = interiorTop - interiorBottom
        const interiorDepth = depth - 0.01
        const interiorCx = (interiorLeft + interiorRight) / 2
        const interiorCy = (interiorBottom + interiorTop) / 2
        const linerT = 0.004

        return (
          <>
            <mesh position={[interiorCx, interiorCy, zBack - t - 0.002]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[interiorWidth, interiorHeight]} />
              <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[interiorCx, interiorTop - linerT / 2, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[interiorWidth, interiorDepth]} />
              <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[interiorCx, interiorBottom + linerT / 2, zCenter]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[interiorWidth, interiorDepth]} />
              <meshStandardMaterial map={walnutLinerTex2x1} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[interiorLeft + linerT / 2, interiorCy, zCenter]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[interiorDepth, interiorHeight]} />
              <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[interiorRight - linerT / 2, interiorCy, zCenter]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[interiorDepth, interiorHeight]} />
              <meshStandardMaterial map={walnutLinerTex1x1} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
          </>
        )
      })()}

      {/* 오픈 선반 상부 LED */}
      {(() => {
        const interiorLeft = xLeft + t / 2
        const interiorRight = xLeft + colW * 3 - t / 2
        const interiorTop = floorClear + lowerH + openH - t
        const interiorCx = (interiorLeft + interiorRight) / 2
        const interiorWidth = interiorRight - interiorLeft
        const stripDepth = 0.010
        const stripZ = zBack - t - stripDepth / 2 - 0.002
        const stripY = interiorTop - 0.001
        return (
          <>
            <mesh position={[interiorCx, stripY, stripZ]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[interiorWidth, stripDepth]} />
              <meshStandardMaterial
                color={active ? '#fff' : '#444'}
                emissive={active ? '#ffe0b0' : '#111'}
                emissiveIntensity={active ? 3.0 : 0.1}
              />
            </mesh>
            {/* rectAreaLight moved outside root group */}
          </>
        )
      })()}

      {/* 도어 패널 (col 0~2) */}
      {[0, 1, 2].map((ci) => {
        const halfG = 0.0005
        const leftBound = xLeft + ci * colW + (ci > 0 ? halfG : 0)
        const rightBound = xLeft + (ci + 1) * colW - (ci < 2 ? halfG : 0)
        const cx = (leftBound + rightBound) / 2
        const dW = rightBound - leftBound
        return (
          <group key={`shoe-col-${ci}`}>
            <mesh position={[cx, lowerCenterY, zFront - t / 2]}>
              <boxGeometry args={[dW, lowerH, t]} />
              <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
            </mesh>
            <mesh position={[cx, upperCenterY, zFront - t / 2]}>
              <boxGeometry args={[dW, upperH, t]} />
              <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
            </mesh>
          </group>
        )
      })}

      {/* 우측 전신거울 (col 3) */}
      {(() => {
        const cx = xLeft + colW * 3.5
        return (
          <group>
            <mesh position={[cx, floorClear + cabH / 2, zFront - 0.004]}>
              <boxGeometry args={[colW - 0.006, cabH - 0.006, 0.008]} />
              <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
            </mesh>
            <mesh position={[cx, floorClear + cabH / 2, zFront - 0.0085]}>
              <planeGeometry args={[colW - 0.03, cabH - 0.03]} />
              <meshStandardMaterial color="#dfe5ea" roughness={0.02} metalness={1.0} />
            </mesh>
          </group>
        )
      })()}

      {/* 신발장 밑면 다운라이트 4개 */}
      {(() => {
        const dlY = floorClear - t - 0.002
        return (
          <>
            {[0, 1, 2, 3].map((ci) => {
              const cx = xLeft + colW * (ci + 0.5)
              return (
                <group key={`shoe-dl-${ci}`}>
                  <mesh position={[cx, dlY, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.03, 16]} />
                    <meshStandardMaterial
                      color={active ? '#fff' : '#888'}
                      emissive={active ? '#ffe0b0' : '#222'}
                      emissiveIntensity={active ? 1.0 : 0.1}
                    />
                  </mesh>
                  <mesh position={[cx, dlY + 0.001, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.03, 0.038, 16]} />
                    <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
                  </mesh>
                  {/* pointLight moved outside root group */}
                </group>
              )
            })}
          </>
        )
      })()}
    </group>
    </>
  )
}
