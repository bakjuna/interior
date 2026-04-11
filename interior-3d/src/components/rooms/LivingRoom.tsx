/**
 * 거실 — 벽걸이 TV (1450×840mm) + ㄱ자 소파.
 * 코브 LED + 단내림은 shell/Ceilings.tsx 가 처리.
 */

import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Sofa } from '../models/Sofa'
import { useKTX2 } from '../../systems/useKTX2'

interface LivingRoomProps {
  visible: boolean
}

export function LivingRoom({ visible }: LivingRoomProps) {
  const walnutTex = useKTX2('/textures/walnut-closet-door.ktx2')
  const shelfTex = useMemo(() => {
    const t = walnutTex.clone()
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(1, 1)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [walnutTex])

  const soundbarGeo = useMemo(() => {
    const w = 0.886, d = 0.121, r = 0.050, t = 0.098
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, d - r)
    shape.quadraticCurveTo(w / 2, d, w / 2 - r, d)
    shape.lineTo(-w / 2 + r, d)
    shape.quadraticCurveTo(-w / 2, d, -w / 2, d - r)
    shape.lineTo(-w / 2, 0)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, t / 2, 0)
    return geo
  }, [])

  const tvShelfGeo = useMemo(() => {
    const w = 1.450, d = 0.300, r = 0.200, t = 0.018
    const shape = new THREE.Shape()
    // 벽쪽(Y=0)은 직각, 거실쪽(Y=d) 두 모서리만 R200
    shape.moveTo(-w / 2, 0)
    shape.lineTo(w / 2, 0)
    shape.lineTo(w / 2, d - r)
    shape.quadraticCurveTo(w / 2, d, w / 2 - r, d)
    shape.lineTo(-w / 2 + r, d)
    shape.quadraticCurveTo(-w / 2, d, -w / 2, d - r)
    shape.lineTo(-w / 2, 0)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, t / 2, 0)
    return geo
  }, [])

  return (
    <group visible={visible}>
      {/* TV 하부 선반 — PS5 세로(390mm)+50mm 여유, R200 */}
      <mesh geometry={tvShelfGeo} position={[2.832, 0.333, 0.005]}>
        <meshStandardMaterial map={shelfTex} roughness={0.45} />
      </mesh>

      {/* 사운드바 — Yamaha YAS-201 (886×98×121mm), TV 하단 50mm 아래, 앞면 R50 */}
      <mesh geometry={soundbarGeo} position={[2.832, 0.831, 0.005]}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* TV — 거실/현관 사이 벽 */}
      <group position={[2.832, 1.35, 0.005]}>
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
