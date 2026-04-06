import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ApartmentModel } from './ApartmentModel'
import { LR_W, LR_D, MB_W, WALL_THICKNESS, WALL_HEIGHT, babyTop } from '../data/apartment'

// 전체 이동 범위 — 외벽 바깥 0.5m 마진까지 (집 외부로 빠져나가지 못하게 제한)
const totalMinX = -WALL_THICKNESS - MB_W - 0.5
const totalMaxX = LR_W + 0.5
const totalMinZ = babyTop - 1.5
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

// 한글 → 영문 매핑 (한글 입력 상태에서도 동작, 두벌식 표준)
const KO_TO_EN: Record<string, string> = {
  'ㅈ': 'w', 'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd',
  'ㅂ': 'q', 'ㄷ': 'e', 'ㄱ': 'r', 'ㄹ': 'f', 'ㅎ': 'g',
}

function resolveKey(key: string): string {
  const lower = key.toLowerCase()
  return KO_TO_EN[lower] ?? lower
}

const MOVE_SPEED = 3.0
const MOUSE_SENSITIVITY = 0.002

function FPSController({ bindings, height, onMove, onHeightChange }: { bindings: KeyBindings; height: number; onMove?: (x: number, z: number) => void; onHeightChange?: (h: number) => void }) {
  const { camera, gl, invalidate } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isLocked = useRef(false)
  const heightRef = useRef(height)

  // 부모에서 슬라이더로 변경 시 동기화
  useEffect(() => { heightRef.current = height }, [height])

  useEffect(() => {
    camera.position.set(LR_W / 2, height, LR_D / 2)
    euler.current.y = 0
    euler.current.x = 0
    invalidate()
  }, [camera, invalidate])

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
      invalidate()   // 마우스 회전 시 재렌더 트리거
    }

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(resolveKey(e.key))
      invalidate()   // 이동 시작 → 렌더 루프 재개
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
  }, [gl, invalidate])

  // 스로틀용 — 마지막으로 부모에게 보고한 시각/위치 (초당 최대 4회)
  const lastReportedAt = useRef<number>(0)
  const lastReportedPos = useRef<[number, number]>([Infinity, Infinity])
  const lastReportedHeight = useRef<number>(height)
  const THROTTLE_MS = 250
  const HEIGHT_SPEED = 1.0  // m/s (Q/E 홀드 시 초당 1m)
  const MIN_HEIGHT = 0.3
  const MAX_HEIGHT = WALL_HEIGHT - 0.1

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

    // Q: 높이 낮추기, E: 높이 높이기 (연속 홀드)
    const qHeld = keys.current.has('q')
    const eHeld = keys.current.has('e')
    if (qHeld || eHeld) {
      const dir = (eHeld ? 1 : 0) - (qHeld ? 1 : 0)
      heightRef.current = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, heightRef.current + dir * HEIGHT_SPEED * delta))
    }

    const margin = 0.3
    newPos.x = Math.max(totalMinX + margin, Math.min(totalMaxX - margin, newPos.x))
    newPos.z = Math.max(totalMinZ + margin, Math.min(totalMaxZ - margin, newPos.z))
    newPos.y = heightRef.current

    camera.position.copy(newPos)

    // 초당 최대 4회 (250ms 간격) + 의미 있는 움직임이 있을 때만
    const now = performance.now()
    const [lx, lz] = lastReportedPos.current
    const moved = Math.abs(newPos.x - lx) > 0.001 || Math.abs(newPos.z - lz) > 0.001
    const heightChanged = Math.abs(heightRef.current - lastReportedHeight.current) > 0.01
    if ((moved || heightChanged) && now - lastReportedAt.current >= THROTTLE_MS) {
      lastReportedAt.current = now
      if (moved) {
        lastReportedPos.current = [newPos.x, newPos.z]
        onMove?.(newPos.x, newPos.z)
      }
      if (heightChanged) {
        lastReportedHeight.current = heightRef.current
        onHeightChange?.(heightRef.current)
      }
    }

    // 이동 중(또는 키 눌림) 이면 다음 프레임 렌더 지속 요청
    if (keys.current.size > 0) {
      invalidate()
    }
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
  const [allLightsOn, setAllLightsOn] = useState(false)

  const handleMove = useCallback((x: number, z: number) => {
    setPlayerPos([x, z])
  }, [])

  // R: 낮/밤 토글, G: 전체 불 켜기 토글 (밤에만)
  // Q/E 는 FPSController 에서 높이 조정용으로 처리 (연속 조정)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = resolveKey(e.key)
      if (k === 'r') {
        e.preventDefault()
        setIsNight((n) => !n)
      } else if (k === 'g') {
        e.preventDefault()
        setAllLightsOn((v) => (isNight ? !v : false))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isNight])

  // 낮으로 전환되면 전체 불 자동 끔
  useEffect(() => {
    if (!isNight) setAllLightsOn(false)
  }, [isNight])

  const handleBindingChange = useCallback((b: KeyBindings) => {
    setBindings(b)
    localStorage.setItem('fps-keybindings', JSON.stringify(b))
  }, [])

  return (
    <>
      <Canvas
        shadows={false}
        frameloop="demand"
        dpr={allLightsOn ? 1 : [1, 2]}
        camera={{
          fov: 75,
          near: 0.1,
          far: 100,
          position: [LR_W / 2, height, LR_D / 2],
        }}
      >
        <ambientLight intensity={isNight ? 0.08 : 0.6} />
        {!isNight && <directionalLight position={[5, 10, 5]} intensity={0.8} />}
        <ApartmentModel showCeiling={true} playerPos={playerPos} isNight={isNight} allLightsOn={allLightsOn} />
        <FPSController bindings={bindings} height={height} onMove={handleMove} onHeightChange={setHeight} />
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
        <br />
        <kbd>Q</kbd> 낮게 · <kbd>E</kbd> 높게 (홀드)
        <br />
        <kbd>R</kbd> 낮/밤 전환 · <kbd>G</kbd> 전체 불 켜기{!isNight && ' (밤에만)'}
        <br />
        <kbd>F</kbd> 문 열기/닫기 (문 근처에서)
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
