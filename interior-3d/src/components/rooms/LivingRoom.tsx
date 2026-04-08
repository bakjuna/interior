/**
 * 거실 — 벽걸이 TV (1450×840mm) + ㄱ자 소파.
 * 코브 LED + 단내림은 shell/Ceilings.tsx 가 처리.
 */

import { Suspense } from 'react'
import { Sofa } from '../models/Sofa'

interface LivingRoomProps {
  visible: boolean
}

export function LivingRoom({ visible }: LivingRoomProps) {
  if (!visible) return null
  return (
    <group>
      {/* TV — 거실/현관 사이 벽 */}
      <group position={[2.832, 1.2, 0.005]}>
        <mesh>
          <boxGeometry args={[1.450, 0.840, 0.015]} />
          <meshStandardMaterial color="#111" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[1.400, 0.790]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.1} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.395, 0.008]}>
          <boxGeometry args={[0.06, 0.01, 0.005]} />
          <meshStandardMaterial color="#444" metalness={0.5} />
        </mesh>
      </group>

      {/* ㄱ자 소파 */}
      <Suspense fallback={null}>
        <Sofa />
      </Suspense>
    </group>
  )
}
