import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ApartmentModel } from './ApartmentModel'
import { LR_W, LR_D, WALL_HEIGHT } from '../data/apartment'

export function BirdsEyeView() {
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
          target={[LR_W / 2, 0, LR_D / 2]}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={2}
          maxDistance={15}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <ApartmentModel showCeiling={false} />
        <gridHelper args={[10, 10, '#334', '#223']} position={[LR_W / 2, -0.01, LR_D / 2]} />
      </Canvas>
      <div className="overlay-info">
        <strong>조감도</strong> (천장 제거)
        <br />
        좌클릭: 회전 / 우클릭: 이동 / 스크롤: 줌
      </div>
    </>
  )
}
