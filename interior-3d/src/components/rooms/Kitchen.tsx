/**
 * 주방 — ㄱ자 천장 LED 조명 + 하부장/상부장 (인덕션 + 식기세척기 + 싱크 + 수전) +
 * ㄱ자 우측벽 확장 (식기세척기/싱크) + 4도어 냉장고 + 김치냉장고 + 냉장고 빌트인 상부장 +
 * 식탁 + 펜던트 조명 + 좌측 하부장 (광파오븐 + 밥솥) + 좌측 월넛 선반.
 *
 * 주방 활성: playerPos가 주방 bounds 내 또는 allLightsOn.
 */

import { Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { CuckooWaterPurifier } from '../models/CuckooWaterPurifier'
import { RiceCooker } from '../models/RiceCooker'
import { LightWaveOven } from '../models/LightWaveOven'
import {
  WALL_THICKNESS,
  WALL_HEIGHT,
  babyTop,
  babyBottomZ,
  babyRight,
  right1Z,
} from '../../data/apartment'

const T2 = WALL_THICKNESS / 2

interface KitchenProps {
  visible: boolean
  playerPos?: [number, number]
  allLightsOn: boolean
}

export function Kitchen({ visible, playerPos, allLightsOn }: KitchenProps) {
  const closetDoorTex = useLoader(TextureLoader, '/textures/walnut-closet-door.png')

  if (!visible) return null

  const walnutBodyTex = closetDoorTex.clone()
  walnutBodyTex.wrapS = THREE.RepeatWrapping
  walnutBodyTex.wrapT = THREE.RepeatWrapping
  walnutBodyTex.repeat.set(1, 1)
  walnutBodyTex.colorSpace = THREE.SRGBColorSpace

  // === 주방 ㄱ자 조명 ===
  const wall2300Z = babyTop - T2 - 1.119 - 0.770
  const kitchenTopInner = wall2300Z + T2
  const hZ = kitchenTopInner + 0.7
  const kitchenLeft = babyRight + 0.2 + T2
  const hXstart = kitchenLeft + 0.35
  const hXend = hXstart + 1.25
  const vZend = hZ + 0.9
  const wLight = 0.08
  const lightY = WALL_HEIGHT - 0.008

  const kitchenRight = kitchenLeft + 2.5 - WALL_THICKNESS
  const kitchenBottom = -T2 - 1.591 + T2
  const kitchenActive = allLightsOn || (!!playerPos && (
    playerPos[0] >= kitchenLeft - 0.1 && playerPos[0] <= kitchenRight + 0.1 &&
    playerPos[1] >= kitchenTopInner - 0.1 && playerPos[1] <= kitchenBottom + 0.1
  ))

  // === 주방 캐비닛 ===
  const cabinetZ = wall2300Z + T2 + 0.3
  const upperZ = wall2300Z + T2 + 0.175
  const babyRightWallX = babyRight + T2
  const kitLeft = babyRightWallX + T2
  const kitRight = babyRightWallX + 2.500 - T2
  const totalW = kitRight - kitLeft
  const winStartX = babyRightWallX + T2 + 1.000
  const winEndX = winStartX + 0.900

  const inductionW = 0.6
  const inductionX = kitLeft + 0.1 + inductionW / 2

  const lowerCabW = totalW
  const lowerCabX = kitLeft + totalW / 2

  const upperLeftW = winStartX - kitLeft
  const upperRightW = kitRight - winEndX

  return (
    <group>
      {/* === 주방 ㄱ자 천장 LED === */}
      <group>
        {/* 수평부 */}
        <mesh position={[(hXstart + hXend) / 2, lightY, hZ]}>
          <boxGeometry args={[1.25, 0.015, wLight]} />
          <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 3.0 : 0.1} />
        </mesh>
        {kitchenActive && (
          <>
            <rectAreaLight
              position={[(hXstart + hXend) / 2, lightY - 0.005, hZ]}
              width={1.25}
              height={wLight}
              intensity={50}
              color="#ffe0b0"
              rotation={[Math.PI / 2, 0, 0]}
            />
            <pointLight position={[(hXstart + hXend) / 2, WALL_HEIGHT - 0.3, hZ + 0.3]} intensity={1.5} distance={5} decay={1.5} color="#fff5e6" />
          </>
        )}
        {/* 수직부 */}
        <mesh position={[hXend, lightY, (hZ + vZend) / 2]}>
          <boxGeometry args={[wLight, 0.015, 0.9]} />
          <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 3.0 : 0.1} />
        </mesh>
        {kitchenActive && (
          <>
            <rectAreaLight
              position={[hXend, lightY - 0.005, (hZ + vZend) / 2]}
              width={wLight}
              height={0.9}
              intensity={50}
              color="#ffe0b0"
              rotation={[Math.PI / 2, 0, 0]}
            />
            <pointLight position={[hXend - 0.3, WALL_HEIGHT - 0.3, (hZ + vZend) / 2]} intensity={1.5} distance={5} decay={1.5} color="#fff5e6" />
          </>
        )}
        {/* 좌측 확장 */}
        {(() => {
          const tableZ2 = babyBottomZ - 0.22 - 0.9
          const extLeftLen = Math.abs(tableZ2 - hZ)
          const extLeftCenterZ = (hZ + tableZ2) / 2
          return (
            <>
              <mesh position={[hXstart, lightY, extLeftCenterZ]}>
                <boxGeometry args={[wLight, 0.015, extLeftLen]} />
                <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 3.0 : 0.1} />
              </mesh>
              {kitchenActive && (
                <>
                  <rectAreaLight
                    position={[hXstart, lightY - 0.005, extLeftCenterZ]}
                    width={wLight}
                    height={extLeftLen}
                    intensity={50}
                    color="#fff5e6"
                    rotation={[Math.PI / 2, 0, 0]}
                  />
                  <pointLight position={[hXstart, WALL_HEIGHT - 0.3, extLeftCenterZ]} intensity={1.0} distance={5} decay={1.5} color="#fff5e6" />
                </>
              )}
            </>
          )
        })()}
      </group>

      {/* === 인덕션 + 메인 하부장/상부장 === */}
      <mesh position={[inductionX, 0.885, cabinetZ]}>
        <boxGeometry args={[inductionW - 0.02, 0.01, 0.5]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[inductionX - 0.12, 0.892, cabinetZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 24]} />
        <meshStandardMaterial color="#333" roughness={0.2} />
      </mesh>
      <mesh position={[inductionX + 0.12, 0.892, cabinetZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 24]} />
        <meshStandardMaterial color="#333" roughness={0.2} />
      </mesh>
      <mesh position={[lowerCabX, 0.41, cabinetZ]}>
        <boxGeometry args={[lowerCabW, 0.82, 0.6]} />
        <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
      </mesh>
      {Array.from({ length: Math.round(lowerCabW / 0.5) }).map((_, di) => {
        const dw = lowerCabW / Math.round(lowerCabW / 0.5)
        const dx = kitLeft + dw / 2 + di * dw
        const dt = closetDoorTex.clone()
        dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
        dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
        return (
          <group key={`lc-${di}`}>
            <mesh position={[dx, 0.41, cabinetZ + 0.301]}>
              <planeGeometry args={[dw - 0.005, 0.8]} />
              <meshStandardMaterial map={dt} roughness={0.45} />
            </mesh>
            <mesh position={[dx, 0.41, cabinetZ + 0.31]}>
              <boxGeometry args={[0.01, 0.08, 0.015]} />
              <meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[(kitLeft + kitRight) / 2, 0.86, cabinetZ]}>
        <boxGeometry args={[totalW, 0.04, 0.62]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} />
      </mesh>

      {upperLeftW > 0.1 && (
        <>
          <mesh position={[kitLeft + upperLeftW / 2, 1.80, upperZ]}>
            <boxGeometry args={[upperLeftW, 0.7, 0.35]} />
            <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
          </mesh>
          {Array.from({ length: Math.max(1, Math.round(upperLeftW / 0.5)) }).map((_, di) => {
            const dw = upperLeftW / Math.max(1, Math.round(upperLeftW / 0.5))
            const dx = kitLeft + dw / 2 + di * dw
            const dt = closetDoorTex.clone()
            dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
            dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
            return (
              <mesh key={`uc-l-${di}`} position={[dx, 1.80, upperZ + 0.176]}>
                <planeGeometry args={[dw - 0.005, 0.68]} />
                <meshStandardMaterial map={dt} roughness={0.45} />
              </mesh>
            )
          })}
        </>
      )}

      {upperRightW > 0.1 && (() => {
        const urStartZ = wall2300Z + T2
        const urEndZ = cabinetZ + 0.3
        const urLen = Math.abs(urEndZ - urStartZ)
        return (
          <>
            <mesh position={[kitRight - 0.175, 1.80, (urStartZ + urEndZ) / 2]}>
              <boxGeometry args={[0.35, 0.7, urLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {Array.from({ length: Math.max(1, Math.round(urLen / 0.5)) }).map((_, di) => {
              const dw = urLen / Math.max(1, Math.round(urLen / 0.5))
              const dz = urStartZ + dw / 2 + di * dw
              const dt = closetDoorTex.clone()
              dt.wrapS = THREE.RepeatWrapping; dt.wrapT = THREE.RepeatWrapping
              dt.repeat.set(1, 1); dt.colorSpace = THREE.SRGBColorSpace
              return (
                <mesh key={`uc-r-${di}`} position={[kitRight - 0.175 - 0.176, 1.80, dz]} rotation={[0, -Math.PI / 2, 0]}>
                  <planeGeometry args={[dw - 0.005, 0.68]} />
                  <meshStandardMaterial map={dt} roughness={0.45} />
                </mesh>
              )
            })}
          </>
        )
      })()}

      {/* === ㄱ자 확장: 우측벽 따라 남쪽 (식기세척기 + 싱크 + 수전) === */}
      {(() => {
        const extWallInner = kitRight
        const extCabCenterX = extWallInner - 0.3
        const extStartZ = cabinetZ + 0.3
        const extEndZ = right1Z - 0.770 + 0.795 + 1.418
        const extLen = extEndZ - extStartZ
        const extCenterZ = (extStartZ + extEndZ) / 2
        const extUpperCenterX = extWallInner - 0.175

        const sinkZpos = extEndZ - 0.1 - 0.4
        const sinkHalfD = 0.4
        const dishW = 0.6
        const dishZend = sinkZpos - sinkHalfD
        const dishZstart = dishZend - dishW
        const cabBeforeLen = Math.abs(dishZstart - extStartZ)
        const cabAfterLen = Math.abs(extEndZ - (sinkZpos + sinkHalfD))

        return (
          <>
            {cabBeforeLen > 0.01 && <mesh position={[extCabCenterX, 0.41, (extStartZ + dishZstart) / 2]}>
              <boxGeometry args={[0.6, 0.82, cabBeforeLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            <mesh position={[extCabCenterX, 0.41, (dishZstart + dishZend) / 2]}>
              <boxGeometry args={[0.6, 0.82, dishW]} />
              <meshStandardMaterial color="#e0e0e0" metalness={0.4} roughness={0.3} />
            </mesh>
            <mesh position={[extCabCenterX - 0.301, 0.41, (dishZstart + dishZend) / 2]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[dishW - 0.01, 0.8]} />
              <meshStandardMaterial color="#d5d5d5" metalness={0.5} roughness={0.25} />
            </mesh>
            <mesh position={[extCabCenterX - 0.31, 0.65, (dishZstart + dishZend) / 2]}>
              <boxGeometry args={[0.015, 0.02, 0.4]} />
              <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.15} />
            </mesh>
            <mesh position={[extCabCenterX - 0.31, 0.25, (dishZstart + dishZend) / 2]}>
              <boxGeometry args={[0.005, 0.02, 0.06]} />
              <meshStandardMaterial color="#888" metalness={0.6} roughness={0.2} />
            </mesh>
            {cabAfterLen > 0.01 && <mesh position={[extCabCenterX, 0.41, (sinkZpos + sinkHalfD + extEndZ) / 2]}>
              <boxGeometry args={[0.6, 0.82, cabAfterLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>}
            {cabBeforeLen > 0.2 && Array.from({ length: Math.max(1, Math.round(cabBeforeLen / 0.5)) }).map((_, di) => {
              const cnt = Math.max(1, Math.round(cabBeforeLen / 0.5))
              const dw = cabBeforeLen / cnt
              const dz = extStartZ + dw / 2 + di * dw
              const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
              return (<group key={`ext-lc-${di}`}>
                <mesh position={[extCabCenterX - 0.301, 0.41, dz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[dw - 0.005, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                <mesh position={[extCabCenterX - 0.31, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
              </group>)
            })}
            {(() => {
              const sinkDoorCount = 2
              const sinkDoorW = (sinkHalfD * 2) / sinkDoorCount
              return Array.from({ length: sinkDoorCount }).map((_, di) => {
                const dz = (sinkZpos - sinkHalfD) + sinkDoorW / 2 + di * sinkDoorW
                const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
                return (<group key={`ext-lc-sink-${di}`}>
                  <mesh position={[extCabCenterX - 0.301, 0.41, dz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[sinkDoorW, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                  <mesh position={[extCabCenterX - 0.31, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
                </group>)
              })
            })()}
            {cabAfterLen > 0.2 && Array.from({ length: Math.max(1, Math.round(cabAfterLen / 0.5)) }).map((_, di) => {
              const cnt = Math.max(1, Math.round(cabAfterLen / 0.5))
              const dw = cabAfterLen / cnt
              const dz = (sinkZpos + sinkHalfD) + dw / 2 + di * dw
              const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
              return (<group key={`ext-lc-after-${di}`}>
                <mesh position={[extCabCenterX - 0.301, 0.41, dz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[dw - 0.005, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                <mesh position={[extCabCenterX - 0.31, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
              </group>)
            })}
            {(() => {
              const sinkZ = extEndZ - 0.1 - 0.4
              const sinkW = 0.5
              const sinkD = 0.8
              const rim = 0.015
              const depth = 0.15
              const topY = 0.86
              const ctW = 0.62
              const ctH = 0.04
              const sinkZstart = sinkZ - sinkD / 2
              const sinkZend = sinkZ + sinkD / 2
              const beforeLen = Math.abs(sinkZstart - extStartZ)
              const beforeCenterZ = (extStartZ + sinkZstart) / 2
              const afterLen = Math.abs(extEndZ - sinkZend)
              const afterCenterZ = (sinkZend + extEndZ) / 2
              const stripW = (ctW - sinkW) / 2
              return (
                <>
                  {beforeLen > 0.01 && <mesh position={[extCabCenterX, topY, beforeCenterZ]}><boxGeometry args={[ctW, ctH, beforeLen]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>}
                  {afterLen > 0.01 && <mesh position={[extCabCenterX, topY, afterCenterZ]}><boxGeometry args={[ctW, ctH, afterLen]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>}
                  <mesh position={[extCabCenterX - sinkW / 2 - stripW / 2, topY, sinkZ]}><boxGeometry args={[stripW, ctH, sinkD]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
                  <mesh position={[extCabCenterX + sinkW / 2 + stripW / 2, topY, sinkZ]}><boxGeometry args={[stripW, ctH, sinkD]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
                  <mesh position={[extCabCenterX, topY + 0.005, sinkZ + sinkD / 2 - rim / 2]}>
                    <boxGeometry args={[sinkW, 0.01, rim]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY + 0.005, sinkZ - sinkD / 2 + rim / 2]}>
                    <boxGeometry args={[sinkW, 0.01, rim]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX - sinkW / 2 + rim / 2, topY + 0.005, sinkZ]}>
                    <boxGeometry args={[rim, 0.01, sinkD]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX + sinkW / 2 - rim / 2, topY + 0.005, sinkZ]}>
                    <boxGeometry args={[rim, 0.01, sinkD]} />
                    <meshStandardMaterial color="#ccc" metalness={0.85} roughness={0.08} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth / 2, sinkZ + sinkD / 2 - rim]}>
                    <boxGeometry args={[sinkW - rim * 2, depth, 0.003]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth / 2, sinkZ - sinkD / 2 + rim]}>
                    <boxGeometry args={[sinkW - rim * 2, depth, 0.003]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX - sinkW / 2 + rim, topY - depth / 2, sinkZ]}>
                    <boxGeometry args={[0.003, depth, sinkD - rim * 2]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX + sinkW / 2 - rim, topY - depth / 2, sinkZ]}>
                    <boxGeometry args={[0.003, depth, sinkD - rim * 2]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.15} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth, sinkZ]}>
                    <boxGeometry args={[sinkW - rim * 2, 0.003, sinkD - rim * 2]} />
                    <meshStandardMaterial color="#ddd" metalness={0.6} roughness={0.2} />
                  </mesh>
                  <mesh position={[extCabCenterX, topY - depth + 0.005, sinkZ]} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.02, 16]} />
                    <meshStandardMaterial color="#555" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )
            })()}
            {(() => {
              const sinkZ2 = extEndZ - 0.1 - 0.4
              const faucetZ = sinkZ2
              return (
                <>
                  <mesh position={[extWallInner - 0.01, 0.87, faucetZ]}>
                    <cylinderGeometry args={[0.02, 0.025, 0.02, 12]} />
                    <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.08} />
                  </mesh>
                  <mesh position={[extWallInner - 0.01, 0.95, faucetZ]}>
                    <cylinderGeometry args={[0.01, 0.012, 0.16, 8]} />
                    <meshStandardMaterial color="#aaa" metalness={0.9} roughness={0.08} />
                  </mesh>
                  <mesh position={[extWallInner - 0.01 - 0.12, 1.02, faucetZ]}>
                    <boxGeometry args={[0.24, 0.015, 0.015]} />
                    <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
                  </mesh>
                  <mesh position={[extWallInner - 0.01 - 0.23, 1.0, faucetZ]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
                    <meshStandardMaterial color="#999" metalness={0.9} roughness={0.1} />
                  </mesh>
                </>
              )
            })()}
            <mesh position={[extUpperCenterX, 1.80, extCenterZ]}><boxGeometry args={[0.35, 0.7, extLen]} /><meshStandardMaterial map={walnutBodyTex} roughness={0.45} /></mesh>
            {[0.25, 0.75].map((tt, di) => {
              const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
              return (<mesh key={`ext-uc-${di}`} position={[extUpperCenterX - 0.176, 1.80, extStartZ + extLen * tt]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[extLen / 2 - 0.005, 0.68]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>)
            })}
            {(() => {
              const purifierD = 0.506
              const purifierW = 0.260
              const pX = extWallInner - purifierD / 2
              const pY = 0.88
              const pZ = (cabinetZ - 0.3) + purifierW / 2
              return <CuckooWaterPurifier position={[pX, pY, pZ]} rotation={-Math.PI / 2} />
            })()}
          </>
        )
      })()}

      {/* === 4도어 냉장고 + 김치냉장고 + 빌트인 상부장 === */}
      {(() => {
        const fridgeW = 0.915
        const fridgeD = 0.920
        const fridgeH = 1.800
        const extEndZ2 = right1Z - 0.770 + 0.795 + 1.418
        const fridgeZ = extEndZ2 + fridgeW / 2 + 0.03
        const fridgeX = kitRight - fridgeD / 2

        const f2W = 0.810
        const f2D = 0.790
        const f2H = 1.800
        const f2Z = fridgeZ + fridgeW / 2 + f2W / 2 + 0.03 + 0.050
        const frontFace = fridgeX - fridgeD / 2
        const f2X = frontFace + f2D / 2
        const topH = f2H * 0.55
        const midH = f2H * 0.22
        const botH = f2H * 0.22

        const sideT = 0.030
        const groupZStart = fridgeZ - fridgeW / 2
        const groupZEnd = f2Z + f2W / 2
        const groupLen = groupZEnd - groupZStart
        const outerZStart = groupZStart - sideT
        const outerZEnd = groupZEnd + sideT
        const outerLen = outerZEnd - outerZStart
        const outerCenterZ = (outerZStart + outerZEnd) / 2
        const cabDepth = fridgeD
        const cabX = kitRight - cabDepth / 2
        const cabBottomY = 1.800 - 0.030
        const cabTopY = WALL_HEIGHT + 0.030
        const cabH = cabTopY - cabBottomY
        const cabCenterY = (cabBottomY + cabTopY) / 2
        const doorCount = Math.max(2, Math.round(groupLen / 0.6))
        const doorLen = groupLen / doorCount
        const doorGap = 0.003

        return (
          <group>
            {/* 4도어 냉장고 */}
            <mesh position={[fridgeX, fridgeH / 2, fridgeZ]}>
              <boxGeometry args={[fridgeD, fridgeH, fridgeW]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.75, fridgeZ - fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.75, fridgeZ + fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.25, fridgeZ - fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[fridgeX - fridgeD / 2 - 0.001, fridgeH * 0.25, fridgeZ + fridgeW / 4]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[fridgeW / 2 - 0.005, fridgeH / 2 - 0.02]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[fridgeX - fridgeD / 2 - 0.002, fridgeH * 0.5, fridgeZ]}>
              <boxGeometry args={[0.005, 0.01, fridgeW]} />
              <meshStandardMaterial color="#222" roughness={0.5} />
            </mesh>

            {/* 김치냉장고 */}
            <mesh position={[f2X, f2H / 2, f2Z]}>
              <boxGeometry args={[f2D, f2H, f2W]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            <mesh position={[frontFace - 0.001, f2H - topH / 2 - 0.01, f2Z - f2W / 4]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[f2W / 2 - 0.005, topH - 0.02]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[frontFace - 0.001, f2H - topH / 2 - 0.01, f2Z + f2W / 4]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[f2W / 2 - 0.005, topH - 0.02]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[frontFace - 0.001, f2H - topH - midH / 2 - 0.005, f2Z]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[f2W - 0.01, midH - 0.015]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[frontFace - 0.001, botH / 2 + 0.01, f2Z]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[f2W - 0.01, botH - 0.015]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.5} />
            </mesh>
            <mesh position={[frontFace - 0.002, f2H - topH, f2Z]}>
              <boxGeometry args={[0.005, 0.01, f2W]} />
              <meshStandardMaterial color="#222" roughness={0.5} />
            </mesh>
            <mesh position={[frontFace - 0.002, f2H - topH - midH, f2Z]}>
              <boxGeometry args={[0.005, 0.01, f2W]} />
              <meshStandardMaterial color="#222" roughness={0.5} />
            </mesh>
            <mesh position={[frontFace - 0.002, f2H - topH / 2, f2Z]}>
              <boxGeometry args={[0.005, topH - 0.02, 0.008]} />
              <meshStandardMaterial color="#222" roughness={0.5} />
            </mesh>

            {/* 빌트인 상부장 + 측면 벽 */}
            <mesh position={[cabX, cabCenterY, outerCenterZ]}>
              <boxGeometry args={[cabDepth, cabH, outerLen]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {Array.from({ length: doorCount }).map((_, di) => {
              const dz = groupZStart + doorLen * (di + 0.5)
              const dt = closetDoorTex.clone()
              dt.wrapS = THREE.RepeatWrapping
              dt.wrapT = THREE.RepeatWrapping
              dt.repeat.set(1, 1)
              dt.colorSpace = THREE.SRGBColorSpace
              return (
                <mesh
                  key={`fridge-uc-${di}`}
                  position={[cabX - cabDepth / 2 - 0.002, cabCenterY, dz]}
                  rotation={[0, -Math.PI / 2, 0]}
                >
                  <planeGeometry args={[doorLen - doorGap, cabH - 0.010]} />
                  <meshStandardMaterial map={dt} roughness={0.45} />
                </mesh>
              )
            })}
            <mesh position={[cabX, cabBottomY / 2, outerZStart + sideT / 2]}>
              <boxGeometry args={[cabDepth, cabBottomY, sideT]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            <mesh position={[cabX, cabBottomY / 2, outerZEnd - sideT / 2]}>
              <boxGeometry args={[cabDepth, cabBottomY, sideT]} />
              <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
            </mesh>
            {(() => {
              const fillerD = fridgeD - f2D
              const fillerX = kitRight - fillerD / 2
              const kimchiZStart = f2Z - f2W / 2
              const kimchiZEnd = f2Z + f2W / 2
              return (
                <mesh position={[fillerX, 1.800 / 2, (kimchiZStart + kimchiZEnd) / 2]}>
                  <boxGeometry args={[fillerD, 1.800, f2W]} />
                  <meshStandardMaterial map={walnutBodyTex} roughness={0.45} />
                </mesh>
              )
            })()}
          </group>
        )
      })()}

      {/* === 식탁 + 펜던트 조명 === */}
      {(() => {
        const tableW = 1.5
        const tableD = 0.8
        const tableH = 0.75
        const tableX = 0.45
        const tableZ = (cabinetZ + 4.2 + (-T2 - 1.591 + T2)) / 2

        return (
          <group>
            <mesh position={[tableX, tableH, tableZ]}>
              <boxGeometry args={[tableW, 0.03, tableD]} />
              <meshStandardMaterial color="#f0ece4" roughness={0.15} metalness={0.05} />
            </mesh>
            <mesh position={[tableX, tableH - 0.015, tableZ]}>
              <boxGeometry args={[tableW - 0.01, 0.03, tableD - 0.01]} />
              <meshStandardMaterial color="#e8e2d8" roughness={0.2} metalness={0.05} />
            </mesh>
            <mesh position={[tableX, tableH / 2 - 0.02, tableZ]}>
              <cylinderGeometry args={[0.04, 0.04, tableH - 0.06, 12]} />
              <meshStandardMaterial color="#6b4226" roughness={0.7} />
            </mesh>
            <mesh position={[tableX, 0.015, tableZ]}>
              <cylinderGeometry args={[0.3, 0.35, 0.03, 16]} />
              <meshStandardMaterial color="#5a3620" roughness={0.7} />
            </mesh>
            <mesh position={[tableX, tableH - 0.05, tableZ]}>
              <cylinderGeometry args={[0.15, 0.04, 0.06, 12]} />
              <meshStandardMaterial color="#6b4226" roughness={0.7} />
            </mesh>

            {(() => {
              const pendantY = WALL_HEIGHT - 0.6
              const barLen = 1.2
              return (
                <>
                  <mesh position={[tableX, WALL_HEIGHT - 0.01, tableZ]}>
                    <boxGeometry args={[0.2, 0.02, 0.04]} />
                    <meshStandardMaterial color="#222" metalness={0.5} roughness={0.3} />
                  </mesh>
                  <mesh position={[tableX - barLen / 2 + 0.05, (WALL_HEIGHT + pendantY) / 2, tableZ]}>
                    <cylinderGeometry args={[0.001, 0.001, WALL_HEIGHT - pendantY - 0.02, 4]} />
                    <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[tableX + barLen / 2 - 0.05, (WALL_HEIGHT + pendantY) / 2, tableZ]}>
                    <cylinderGeometry args={[0.001, 0.001, WALL_HEIGHT - pendantY - 0.02, 4]} />
                    <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[tableX, pendantY, tableZ]}>
                    <boxGeometry args={[barLen, 0.04, 0.05]} />
                    <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.3} />
                  </mesh>
                  <mesh position={[tableX, pendantY - 0.021, tableZ]}>
                    <boxGeometry args={[barLen - 0.02, 0.005, 0.04]} />
                    <meshStandardMaterial color={kitchenActive ? '#fff' : '#444'} emissive={kitchenActive ? '#fff5e6' : '#111'} emissiveIntensity={kitchenActive ? 4.0 : 0.1} />
                  </mesh>
                </>
              )
            })()}
            {kitchenActive && (
              <rectAreaLight
                position={[tableX, WALL_HEIGHT - 0.52, tableZ]}
                width={1.15}
                height={0.025}
                intensity={15}
                color="#ffe0b0"
                rotation={[Math.PI / 2, 0, 0]}
              />
            )}
            {kitchenActive && (
              <pointLight
                position={[tableX, WALL_HEIGHT - 0.55, tableZ]}
                intensity={0.8}
                distance={2.5}
                decay={2}
                color="#ffe0b0"
              />
            )}
          </group>
        )
      })()}

      {/* === 좌측 하부장 (광파오븐 + 밥솥) === */}
      {(() => {
        const leftWallInner = kitLeft
        const leftCabDepth = 0.5
        const leftCabX = leftWallInner + leftCabDepth / 2
        const babyDoorEnd = babyBottomZ - 0.22 - 0.9
        const laundryDoorStart = babyTop - T2 - 0.1095
        const leftStartZ = babyDoorEnd
        const leftEndZ = laundryDoorStart
        const leftLen = Math.abs(leftEndZ - leftStartZ)
        const leftCenterZ = (leftStartZ + leftEndZ) / 2
        const doorCountL = Math.max(2, Math.round(leftLen / 0.5))
        return (
          <>
            <mesh position={[leftCabX, 0.41, leftCenterZ]}><boxGeometry args={[leftCabDepth, 0.82, leftLen]} /><meshStandardMaterial map={walnutBodyTex} roughness={0.45} /></mesh>
            {Array.from({ length: doorCountL }).map((_, di) => {
              const dw = leftLen / doorCountL
              const dz = leftEndZ + dw / 2 + di * dw
              const dt2 = closetDoorTex.clone(); dt2.wrapS = THREE.RepeatWrapping; dt2.wrapT = THREE.RepeatWrapping; dt2.repeat.set(1, 1); dt2.colorSpace = THREE.SRGBColorSpace
              return (<group key={`left-lc-${di}`}>
                <mesh position={[leftCabX + leftCabDepth / 2 + 0.001, 0.41, dz]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[dw - 0.005, 0.8]} /><meshStandardMaterial map={dt2} roughness={0.45} /></mesh>
                <mesh position={[leftCabX + leftCabDepth / 2 + 0.01, 0.41, dz]}><boxGeometry args={[0.015, 0.08, 0.01]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
              </group>)
            })}
            <mesh position={[leftCabX, 0.86, leftCenterZ]}><boxGeometry args={[leftCabDepth + 0.02, 0.04, leftLen + 0.02]} /><meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.05} /></mesh>
            {(() => {
              const ovD = 0.515
              const ovW = 0.523
              const ovH = 0.330
              const ovX = leftWallInner + ovD / 2
              const ovY = 0.88 + ovH / 2
              const ovZ = leftStartZ - 0.01 - ovW / 2
              const rcZ = (ovZ - ovW / 2) - 0.005 - 0.428 / 2
              const rcX = leftWallInner + 0.428 / 2
              return (
                <Suspense fallback={null}>
                  <LightWaveOven position={[ovX, ovY, ovZ]} rotation={Math.PI / 2} />
                  <RiceCooker position={[rcX, 0.88 + 0.0165, rcZ]} rotation={Math.PI / 2} />
                </Suspense>
              )
            })()}
          </>
        )
      })()}

      {/* === 좌측 월넛 선반 (2줄) === */}
      {(() => {
        const wallInnerX = babyRightWallX + T2
        const cabBottomZ = babyBottomZ - 0.22 - 0.9
        const cabTopZ = babyTop - T2 - 0.1095
        const cabLen = Math.abs(cabTopZ - cabBottomZ)
        const cabCenterZ = (cabBottomZ + cabTopZ) / 2
        const shelfLen = cabLen * 0.8
        const shelfDepth = 0.25
        const shelfThick = 0.030
        const shelfX = wallInnerX + shelfDepth / 2
        const shelfY1 = 1.28
        const shelfY2 = 1.68
        const shelfTex = closetDoorTex.clone()
        shelfTex.wrapS = THREE.RepeatWrapping
        shelfTex.wrapT = THREE.RepeatWrapping
        shelfTex.repeat.set(1, 1)
        shelfTex.colorSpace = THREE.SRGBColorSpace
        return (
          <>
            {[shelfY1, shelfY2].map((y, i) => (
              <mesh key={`kit-shelf-${i}`} position={[shelfX, y, cabCenterZ]}>
                <boxGeometry args={[shelfDepth, shelfThick, shelfLen]} />
                <meshStandardMaterial map={shelfTex} roughness={0.55} metalness={0.05} />
              </mesh>
            ))}
          </>
        )
      })()}
    </group>
  )
}
