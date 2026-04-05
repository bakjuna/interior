import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ApartmentModel } from './ApartmentModel'
import { LR_W, LR_D, MB_W, WALL_THICKNESS, WALL_HEIGHT, babyTop } from '../data/apartment'

// 전체 이동 범위
const totalMinX = -WALL_THICKNESS - MB_W - 0.5
const totalMaxX = LR_W + 3.0 + 2.7
const totalMinZ = babyTop - 4.0
const totalMaxZ = LR_D + 1.6

interface KeyBindings {
  forward: string
  backward: string
  left: string
  right: string
}

const DEFAULT_BINDINGS: KeyBindings = {
  forward: 'w',
  backward: 's',
  left: 'a',
  right: 'd',
}

// 한글 → 영문 매핑 (한글 입력 상태에서도 WASD 동작)
const KO_TO_EN: Record<string, string> = {
  'ㅈ': 'w', 'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd',
  'ㅂ': 'q', 'ㄱ': 'r', 'ㅅ': 'e', 'ㅎ': 'f',
}

function resolveKey(key: string): string {
  const lower = key.toLowerCase()
  return KO_TO_EN[lower] ?? lower
}

const MOVE_SPEED = 3.0
const MOUSE_SENSITIVITY = 0.002

function FPSController({ bindings, height, onMove }: { bindings: KeyBindings; height: number; onMove?: (x: number, z: number) => void }) {
  const { camera, gl } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isLocked = useRef(false)

  useEffect(() => {
    camera.position.set(LR_W / 2, height, LR_D / 2)
    euler.current.y = 0
    euler.current.x = 0
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement

    const onPointerLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas
    }

    const onClick = () => {
      if (!isLocked.current) {
        canvas.requestPointerLock()
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return
      euler.current.y -= e.movementX * MOUSE_SENSITIVITY
      euler.current.x -= e.movementY * MOUSE_SENSITIVITY
      euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x))
    }

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(resolveKey(e.key))
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(resolveKey(e.key))
    }

    canvas.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock()
      }
    }
  }, [gl])

  useFrame((_, delta) => {
    camera.quaternion.setFromEuler(euler.current)

    const direction = new THREE.Vector3()
    const right = new THREE.Vector3()

    camera.getWorldDirection(direction)
    direction.y = 0
    direction.normalize()

    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize()

    const speed = MOVE_SPEED * delta
    const newPos = camera.position.clone()

    if (keys.current.has(bindings.forward)) newPos.add(direction.multiplyScalar(speed))
    if (keys.current.has(bindings.backward)) {
      camera.getWorldDirection(direction)
      direction.y = 0
      direction.normalize()
      newPos.sub(direction.multiplyScalar(speed))
    }
    if (keys.current.has(bindings.left)) newPos.sub(right.multiplyScalar(speed))
    if (keys.current.has(bindings.right)) newPos.add(right.multiplyScalar(speed))

    const margin = 0.3
    newPos.x = Math.max(totalMinX + margin, Math.min(totalMaxX - margin, newPos.x))
    newPos.z = Math.max(totalMinZ + margin, Math.min(totalMaxZ - margin, newPos.z))
    newPos.y = height

    camera.position.copy(newPos)
    onMove?.(newPos.x, newPos.z)
  })

  return null
}

function KeyBindSettings({
  bindings,
  onChange,
}: {
  bindings: KeyBindings
  onChange: (b: KeyBindings) => void
}) {
  const [capturing, setCapturing] = useState<keyof KeyBindings | null>(null)

  const handleCapture = useCallback(
    (action: keyof KeyBindings) => {
      setCapturing(action)
      const handler = (e: KeyboardEvent) => {
        e.preventDefault()
        onChange({ ...bindings, [action]: resolveKey(e.key) })
        setCapturing(null)
        document.removeEventListener('keydown', handler)
      }
      document.addEventListener('keydown', handler)
    },
    [bindings, onChange],
  )

  const labels: Record<keyof KeyBindings, string> = {
    forward: '앞으로',
    backward: '뒤로',
    left: '왼쪽',
    right: '오른쪽',
  }

  return (
    <div className="keybind-settings">
      <h3>키 설정</h3>
      {(Object.keys(labels) as Array<keyof KeyBindings>).map((action) => (
        <div className="keybind-row" key={action}>
          <label>{labels[action]}</label>
          <input
            readOnly
            value={capturing === action ? '...' : bindings[action].toUpperCase()}
            onClick={() => handleCapture(action)}
            style={capturing === action ? { borderColor: '#3a7bd5' } : undefined}
          />
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 11, color: '#667' }}>
        클릭하여 변경 (한/영 모두 지원)
      </div>
    </div>
  )
}

export function WalkthroughView() {
  const [bindings, setBindings] = useState<KeyBindings>(() => {
    const saved = localStorage.getItem('fps-keybindings')
    return saved ? JSON.parse(saved) : DEFAULT_BINDINGS
  })

  const [height, setHeight] = useState(1.6)
  const [playerPos, setPlayerPos] = useState<[number, number]>([LR_W / 2, LR_D / 2])
  const [isNight, setIsNight] = useState(true)

  const handleMove = useCallback((x: number, z: number) => {
    setPlayerPos([x, z])
  }, [])

  const handleBindingChange = useCallback((b: KeyBindings) => {
    setBindings(b)
    localStorage.setItem('fps-keybindings', JSON.stringify(b))
  }, [])

  return (
    <>
      <Canvas
        shadows
        camera={{
          fov: 75,
          near: 0.1,
          far: 100,
          position: [LR_W / 2, height, LR_D / 2],
        }}
      >
        <ambientLight intensity={isNight ? 0.08 : 0.6} />
        {!isNight && <directionalLight position={[5, 10, 5]} intensity={0.8} />}
        <ApartmentModel showCeiling={true} playerPos={isNight ? playerPos : undefined} />
        <FPSController bindings={bindings} height={height} onMove={handleMove} />
      </Canvas>
      <div className="crosshair" />
      <div className="overlay-info">
        <strong>워크스루</strong> (1인칭)
        <br />
        화면 클릭: 마우스 잠금
        <br />
        <kbd>{bindings.forward.toUpperCase()}</kbd>{' '}
        <kbd>{bindings.left.toUpperCase()}</kbd>{' '}
        <kbd>{bindings.backward.toUpperCase()}</kbd>{' '}
        <kbd>{bindings.right.toUpperCase()}</kbd> 이동 (한/영 모두)
        <br />
        마우스: 시점 회전 / <kbd>ESC</kbd> 잠금 해제
      </div>
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(22, 33, 62, 0.9)',
        backdropFilter: 'blur(8px)',
        padding: '10px 20px',
        borderRadius: 8,
        border: '1px solid #0f3460',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
      }}>
        <span>높이</span>
        <input
          type="range"
          min={0.3}
          max={WALL_HEIGHT - 0.1}
          step={0.05}
          value={height}
          onChange={(e) => setHeight(parseFloat(e.target.value))}
          style={{ width: 180 }}
        />
        <span style={{ minWidth: 55, textAlign: 'right' }}>{(height * 1000).toFixed(0)}mm</span>
        <div style={{ width: 1, height: 20, background: '#0f3460' }} />
        <button
          onClick={() => setIsNight(!isNight)}
          style={{
            background: isNight ? '#1a2a4a' : '#f0e8d0',
            color: isNight ? '#fff5e6' : '#333',
            border: '1px solid ' + (isNight ? '#0f3460' : '#ccc'),
            borderRadius: 4,
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {isNight ? '밤' : '낮'}
        </button>
      </div>
    </>
  )
}
