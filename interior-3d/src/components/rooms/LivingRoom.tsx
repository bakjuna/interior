/**
 * 거실 — 벽걸이 TV (1450×840mm) + ㄱ자 소파 + 2단 커튼 (남벽 창).
 * 코브 LED + 단내림은 shell/Ceilings.tsx 가 처리.
 */

import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { Sofa } from '../models/Sofa'
import { useKTX2 } from '../../systems/useKTX2'
import { TwoLayerCurtain } from '../shell/TwoLayerCurtain'
import type { DoorId } from '../../data/sectors'
import { LR_D, LR_W, WALL_HEIGHT } from '../../data/apartment'

interface LivingRoomProps {
  visible: boolean
  activeDoorId?: DoorId | null
  playerPos?: [number, number]
}

export function LivingRoom({ visible, activeDoorId, playerPos }: LivingRoomProps) {
  void playerPos
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

      {/* Yamaha YAS-209 서브우퍼 — 동벽 flush wrap 팔걸이(X=3.772~3.972) 북쪽 앞 슬롯.
          소파 chaise 와 동벽 사이 200×800mm 오픈 스페이스에 딱 맞춤 (sub W=194mm).
          194×419×407mm (W×H×D). */}
      {(() => {
        const subW = 0.194  // X
        const subH = 0.419
        const subD = 0.407  // Z
        const armrestNorthZ = LR_D - 1.5 - 0.08 - 0.2 + 0.8  // = 2.686
        const cx = LR_W - 0.005 - subW / 2              // 동벽에서 5mm 이격 = 3.870
        const cy = subH / 2
        const cz = armrestNorthZ - subD / 2 - 0.005     // wrap 북면에서 5mm 이격
        return (
          <group position={[cx, cy, cz]}>
            {/* 본체 — 무광 블랙 캐비닛 */}
            <mesh>
              <boxGeometry args={[subW, subH, subD]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.85} metalness={0.05} />
            </mesh>
            {/* 전면 그릴 (서쪽 -X면, 거실 중심 방향) — 어두운 패브릭 느낌 */}
            <mesh position={[-subW / 2 - 0.0005, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[subD - 0.02, subH - 0.02]} />
              <meshStandardMaterial color="#0d0d0d" roughness={1.0} />
            </mesh>
            {/* 상단 인셋 라인 (디테일) */}
            <mesh position={[0, subH / 2 - 0.002, 0]}>
              <boxGeometry args={[subW - 0.008, 0.002, subD - 0.008]} />
              <meshStandardMaterial color="#111" roughness={0.7} />
            </mesh>
          </group>
        )
      })()}

      {/* 붙박이 고정 패널 — 남측 축소분(200×450mm) 채움, 붙박이 톤 유지 */}
      <mesh position={[0.225, (WALL_HEIGHT - 0.050) / 2, LR_D - 0.1]}>
        <boxGeometry args={[0.450, WALL_HEIGHT - 0.050, 0.200]} />
        <meshStandardMaterial map={shelfTex} roughness={0.45} />
      </mesh>

      {/* 남벽 2단 커튼 — F 인터랙션 */}
      <TwoLayerCurtain
        doorId="lr-curtain"
        xStart={0.45}
        xEnd={LR_W}
        activeDoorId={activeDoorId}
      />
    </group>
  )
}

