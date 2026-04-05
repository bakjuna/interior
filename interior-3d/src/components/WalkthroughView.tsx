import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ApartmentModel } from './ApartmentModel'
import { LR_W, LR_D, MB_W, WALL_THICKNESS, babyTop } from '../data/apartment'

// 전체 이동 범위
const totalMinX = -WALL_THICKNESS - MB_W - 0.5
const totalMaxX = LR_W + 3.0 + 2.7  // 거실 우측 + 작업실베란다
const totalMinZ = babyTop - 4.0      // 아기방/세탁실 위쪽
const totalMaxZ = LR_D + 1.6         // 메인베란다 아래

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

const MOVE_SPEED = 3.0
const MOUSE_SENSITIVITY = 0.002
const PLAYER_HEIGHT = 1.6

function FPSController({ bindings }: { bindings: KeyBindings }) {
  const { camera, gl } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isLocked = useRef(false)

  useEffect(() => {
    // Initial position: center of living room
    camera.position.set(LR_W / 2, PLAYER_HEIGHT, LR_D / 2)
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
      keys.current.add(e.key.toLowerCase())
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase())
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

    // Forward/backward direction (horizontal only)
    camera.getWorldDirection(direction)
    direction.y = 0
    direction.normalize()

    // Right vector
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

    // Simple boundary clamping
    const margin = 0.3
    newPos.x = Math.max(totalMinX + margin, Math.min(totalMaxX - margin, newPos.x))
    newPos.z = Math.max(totalMinZ + margin, Math.min(totalMaxZ - margin, newPos.z))
    newPos.y = PLAYER_HEIGHT

    camera.position.copy(newPos)
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
        onChange({ ...bindings, [action]: e.key.toLowerCase() })
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
        클릭하여 변경
      </div>
    </div>
  )
}

export function WalkthroughView() {
  const [bindings, setBindings] = useState<KeyBindings>(() => {
    const saved = localStorage.getItem('fps-keybindings')
    return saved ? JSON.parse(saved) : DEFAULT_BINDINGS
  })

  const handleBindingChange = useCallback((b: KeyBindings) => {
    setBindings(b)
    localStorage.setItem('fps-keybindings', JSON.stringify(b))
  }, [])

  return (
    <>
      <Canvas
        camera={{
          fov: 75,
          near: 0.1,
          far: 100,
          position: [LR_W / 2, PLAYER_HEIGHT, LR_D / 2],
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1.0} />
        <pointLight position={[3, 2.2, 3]} intensity={0.8} distance={8} />
        <pointLight position={[8, 2.2, 3]} intensity={0.6} distance={8} />
        <pointLight position={[3, 2.2, 7]} intensity={0.6} distance={8} />
        <ApartmentModel showCeiling={true} />
        <FPSController bindings={bindings} />
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
        <kbd>{bindings.right.toUpperCase()}</kbd> 이동
        <br />
        마우스: 시점 회전 / <kbd>ESC</kbd> 잠금 해제
      </div>
      <KeyBindSettings bindings={bindings} onChange={handleBindingChange} />
    </>
  )
}
