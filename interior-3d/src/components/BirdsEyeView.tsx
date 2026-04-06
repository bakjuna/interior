import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ApartmentModel } from './ApartmentModel'
import { LR_W, LR_D, WALL_HEIGHT } from '../data/apartment'

const KO_TO_EN: Record<string, string> = {
  'ㅈ': 'w', 'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd',
}

function WASDController({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const { camera } = useThree()
  const keys = useRef<Set<string>>(new Set())

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = KO_TO_EN[e.key.toLowerCase()] ?? e.key.toLowerCase()
      keys.current.add(key)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const key = KO_TO_EN[e.key.toLowerCase()] ?? e.key.toLowerCase()
      keys.current.delete(key)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    const speed = 5 * delta
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    const move = new THREE.Vector3()
    if (keys.current.has('w')) move.add(forward.clone().multiplyScalar(speed))
    if (keys.current.has('s')) move.sub(forward.clone().multiplyScalar(speed))
    if (keys.current.has('a')) move.sub(right.clone().multiplyScalar(speed))
    if (keys.current.has('d')) move.add(right.clone().multiplyScalar(speed))

    if (move.length() > 0) {
      camera.position.add(move)
      // OrbitControls target도 같이 이동
      if (controlsRef.current) {
        controlsRef.current.target.add(move)
      }
    }
  })

  return null
}

export function BirdsEyeView() {
  const controlsRef = useRef<any>(null)
  const [lightsOn, setLightsOn] = useState(false)
  return (
    <>
      <Canvas
        shadows
        camera={{
          position: [LR_W / 2 + 3, WALL_HEIGHT * 3, LR_D / 2 + 4],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
      >
        <OrbitControls
          ref={controlsRef}
          target={[LR_W / 2, 0, LR_D / 2]}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={25}
          screenSpacePanning
        />
        <WASDController controlsRef={controlsRef} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 15, 5]} intensity={1.0} />
        <ApartmentModel showCeiling={false} allLightsOn={lightsOn} showCityBackground={false} />
        <gridHelper args={[10, 10, '#334', '#223']} position={[LR_W / 2, -0.01, LR_D / 2]} />
      </Canvas>
      <div className="overlay-info">
        <strong>조감도</strong> (천장 제거)
        <br />
        좌클릭: 회전 / 두 손가락 스크롤: 이동 / 핀치: 줌
        <br />
        <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 이동 (한/영)
      </div>
      <button
        onClick={() => setLightsOn(!lightsOn)}
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: lightsOn ? '#ffe0b0' : 'rgba(22, 33, 62, 0.95)',
          color: lightsOn ? '#222' : '#e0e8f0',
          border: '2px solid ' + (lightsOn ? '#ddc080' : '#3a7bd5'),
          borderRadius: 8,
          padding: '10px 28px',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          letterSpacing: '0.5px',
        }}
      >
        {lightsOn ? '💡 조명 ON' : '🌙 조명 OFF'}
      </button>
    </>
  )
}
