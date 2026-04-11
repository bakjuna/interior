/**
 * 모든 분합창 일괄 렌더 — windows[] 데이터 그대로.
 * 2분할 슬라이딩, 하얀 PVC 샷시 + 유리 패널.
 */

import * as THREE from 'three'
import { windows } from '../../data/apartment'

export function Windows() {
  return (
    <>
      {windows.map((w, i) => {
        const cx = w.position[0]
        const cz = w.position[1]
        const cy = w.sillHeight + w.height / 2
        const ww = w.width
        const wh = w.height
        const frame = 0.04
        const mid = 0.03
        const depth = 0.08
        const isX = w.axis === 'x'
        const rot: [number, number, number] = isX ? [0, 0, 0] : [0, Math.PI / 2, 0]

        const halfW = (ww - mid) / 2

        const doubleGap = 0.070  // 2중창 간격 70mm
        const offsets = w.double ? [-doubleGap / 2, doubleGap / 2] : [0]

        return (
          <group key={`win-${i}`} position={[cx, cy, cz]} rotation={rot}>
          {offsets.map((dz, oi) => (
          <group key={`pane-${oi}`} position={[0, 0, dz]}>
            <mesh position={[0, wh / 2 - frame / 2, 0]}>
              <boxGeometry args={[ww, frame, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            <mesh position={[0, -wh / 2 + frame / 2 + 0.003, 0]}>
              <boxGeometry args={[ww, frame, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            <mesh position={[-ww / 2 + frame / 2, 0, 0]}>
              <boxGeometry args={[frame, wh, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            <mesh position={[ww / 2 - frame / 2, 0, 0]}>
              <boxGeometry args={[frame, wh, depth]} />
              <meshStandardMaterial color="#f0f0f0" />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[mid, wh - frame * 2, depth]} />
              <meshStandardMaterial color="#e8e8e8" />
            </mesh>

            {/* 좌측 유리 패널 */}
            {(() => {
              const pH = wh - frame * 2
              const pf = 0.025
              const glassW = halfW - pf * 2
              const glassH = pH - pf * 2
              return (
                <group position={[-halfW / 2 - mid / 2, 0, -depth * 0.2]}>
                  <mesh position={[0, pH / 2 - pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[0, -pH / 2 + pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[-halfW / 2 + pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[halfW / 2 - pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh><planeGeometry args={[glassW, glassH]} /><meshStandardMaterial color="#4477aa" transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
                </group>
              )
            })()}

            {/* 우측 유리 패널 */}
            {(() => {
              const pH = wh - frame * 2
              const pf = 0.025
              const glassW = halfW - pf * 2
              const glassH = pH - pf * 2
              return (
                <group position={[halfW / 2 + mid / 2, 0, depth * 0.2]}>
                  <mesh position={[0, pH / 2 - pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[0, -pH / 2 + pf / 2, 0]}><boxGeometry args={[halfW, pf, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[-halfW / 2 + pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh position={[halfW / 2 - pf / 2, 0, 0]}><boxGeometry args={[pf, pH, 0.02]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
                  <mesh><planeGeometry args={[glassW, glassH]} /><meshStandardMaterial color="#4477aa" transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
                </group>
              )
            })()}
          </group>
          ))}
          </group>
        )
      })}
    </>
  )
}
