/**
 * 현관 — 거실/현관 경계벽 신발장 (4칸, 우측 1칸 전신거울).
 *
 * 4칸 구성:
 * - col 0~2: 하부장 + 오픈 선반 (월넛 라이너 + 간접조명) + 상부장
 * - col 3: 풀 높이 전신거울
 * - 하단 100mm 띄움 + 4개 다운라이트
 *
 * 활성 영역: 현관 (xLeft~LR_W+T2, -T2-1.591~-T2)
 */

import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { LR_W, WALL_THICKNESS } from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface EntranceProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
}

export function Entrance({ visible, playerPos, allLightsOn }: EntranceProps) {
  const walnutDoorTex = useLoader(TextureLoader, '/textures/walnut_door.png')

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

  if (!visible) return null

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
  const openCenterY = floorClear + lowerH + openH / 2
  const upperCenterY = floorClear + lowerH + openH + upperH / 2
  const bodyColor = '#f5f3f0'
  const doorColor = '#fafaf8'
  const t = 0.018

  // openCenterY는 사용 안 함 (오픈 선반은 수평판으로만 표현)
  void openCenterY

  const isActive = !!allLightsOn || (playerPos ? (
    playerPos[0] >= LR_W - 1.481 && playerPos[0] <= LR_W + T2 &&
    playerPos[1] >= -T2 - 1.591 && playerPos[1] <= -T2
  ) : false)

  return (
    <group>
      {/* 백패널 */}
      <mesh position={[xCenter, floorClear + cabH / 2, zBack - t / 2]}>
        <boxGeometry args={[totalW, cabH, t]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      {/* 좌측 측판 */}
      <mesh position={[xLeft - t / 2, topY / 2, zCenter]}>
        <boxGeometry args={[t, topY, depth]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      {/* 우측 측판 */}
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

      {/* 칸막이 1, 2 — 상하 분할 (오픈 선반 구간 비움) */}
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
      {/* 거울 경계 칸막이 (풀 높이) */}
      <mesh position={[xLeft + colW * 3, floorClear + cabH / 2, zCenter]}>
        <boxGeometry args={[t, cabH, depth - 0.01]} />
        <meshPhysicalMaterial color={doorColor} roughness={0.15} clearcoat={0.8} clearcoatRoughness={0.1} />
      </mesh>
      {/* 오픈 선반 상/하 수평판 */}
      <mesh position={[xLeft + colW * 1.5, floorClear + lowerH + t / 2, zCenter]}>
        <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>
      <mesh position={[xLeft + colW * 1.5, floorClear + lowerH + openH - t / 2, zCenter]}>
        <boxGeometry args={[colW * 3 - t, t, depth - 0.005]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} />
      </mesh>

      {/* 오픈 선반 내측 월넛 라이너 5면 */}
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

      {/* 오픈 선반 상부 간접조명 */}
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
                color={isActive ? '#fff' : '#444'}
                emissive={isActive ? '#ffe0b0' : '#111'}
                emissiveIntensity={isActive ? 3.0 : 0.1}
              />
            </mesh>
            {isActive && (
              <rectAreaLight
                position={[interiorCx, stripY - 0.002, stripZ]}
                width={interiorWidth}
                height={stripDepth}
                intensity={60}
                color="#ffe0b0"
                rotation={[-Math.PI / 2, 0, 0]}
              />
            )}
          </>
        )
      })()}

      {/* 도어 패널 (col 0~2 상/하) */}
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
                      color={isActive ? '#fff' : '#888'}
                      emissive={isActive ? '#ffe0b0' : '#222'}
                      emissiveIntensity={isActive ? 1.0 : 0.1}
                    />
                  </mesh>
                  <mesh position={[cx, dlY + 0.001, zCenter]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.03, 0.038, 16]} />
                    <meshStandardMaterial color="#ccc" metalness={0.6} roughness={0.3} />
                  </mesh>
                  {isActive && (
                    <spotLight
                      position={[cx, dlY - 0.005, zCenter]}
                      target-position={[cx, 0, zCenter]}
                      angle={Math.PI / 3}
                      penumbra={0.6}
                      intensity={1.5}
                      distance={1.5}
                      decay={2}
                      color="#ffe0b0"
                    />
                  )}
                </group>
              )
            })}
          </>
        )
      })()}
    </group>
  )
}
