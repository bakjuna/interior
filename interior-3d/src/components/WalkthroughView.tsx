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
const MOVE_SPEED_MOBILE = 3.2
const MOUSE_SENSITIVITY = 0.002
const TOUCH_SENSITIVITY = 0.0035

function FPSController({ bindings, height, isMobile, onMove, onHeightChange }: { bindings: KeyBindings; height: number; isMobile: boolean; onMove?: (x: number, z: number) => void; onHeightChange?: (h: number) => void }) {
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
      if (isMobile) return  // 모바일에서는 포인터 잠금 사용 안 함
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

    // 터치 드래그로 시점 회전 (모바일 — 포인터 잠금 없이)
    let touchActiveId: number | null = null
    let lastTouchX = 0
    let lastTouchY = 0
    const isFromMobileUI = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return !!(el && el.closest && el.closest('[data-mobile-ui]'))
    }
    const onTouchStart = (e: TouchEvent) => {
      if (isFromMobileUI(e.target)) return
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      touchActiveId = touch.identifier
      lastTouchX = touch.clientX
      lastTouchY = touch.clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (touchActiveId === null) return
      let touch: Touch | null = null
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchActiveId) {
          touch = e.touches[i]
          break
        }
      }
      if (!touch) return
      const dx = touch.clientX - lastTouchX
      const dy = touch.clientY - lastTouchY
      lastTouchX = touch.clientX
      lastTouchY = touch.clientY
      // 터치는 "월드를 끌어당기는" 느낌 — 마우스와 반대 방향
      euler.current.y += dx * TOUCH_SENSITIVITY
      euler.current.x += dy * TOUCH_SENSITIVITY
      euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x))
      invalidate()
      if (e.cancelable) e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchActiveId === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchActiveId) {
          touchActiveId = null
          return
        }
      }
    }

    canvas.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchcancel', onTouchEnd)

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock()
      }
    }
  }, [gl, invalidate, isMobile])

  // 스로틀용 — 마지막으로 부모에게 보고한 시각/위치 (초당 최대 4회)
  const lastReportedAt = useRef<number>(0)
  const lastReportedPos = useRef<[number, number]>([Infinity, Infinity])
  const lastReportedHeight = useRef<number>(height)
  const THROTTLE_MS = 250
  const HEIGHT_SPEED = 1.0  // m/s (Q/E 홀드 시 초당 1m)
  const MIN_HEIGHT = 0.3
  const MAX_HEIGHT = WALL_HEIGHT - 0.1

  useFrame((_, rawDelta) => {
    // frameloop="demand" 사용 시 idle 후 첫 프레임의 delta 가 매우 커질 수 있음 → clamp
    const delta = Math.min(rawDelta, 0.05)
    camera.quaternion.setFromEuler(euler.current)

    const direction = new THREE.Vector3()
    const right = new THREE.Vector3()

    camera.getWorldDirection(direction)
    direction.y = 0
    direction.normalize()

    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize()

    const speed = (isMobile ? MOVE_SPEED_MOBILE : MOVE_SPEED) * delta
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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 800)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 800)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // 모바일 터치 버튼 → 키보드 이벤트 디스패치 (FPSController가 이미 듣고 있음)
  const pressKey = useCallback((k: string, down: boolean) => {
    document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k }))
  }, [])

  // 키별 release 함수를 저장 — 손가락이 버튼을 벗어나도 글로벌 pointerup으로 안전하게 해제
  const activePressesRef = useRef<Map<string, () => void>>(new Map())

  const holdProps = useCallback(
    (k: string) => ({
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (activePressesRef.current.has(k)) return
        pressKey(k, true)
        const release = () => {
          if (!activePressesRef.current.has(k)) return
          activePressesRef.current.delete(k)
          pressKey(k, false)
          window.removeEventListener('pointerup', release)
          window.removeEventListener('pointercancel', release)
          window.removeEventListener('blur', release)
        }
        activePressesRef.current.set(k, release)
        window.addEventListener('pointerup', release)
        window.addEventListener('pointercancel', release)
        window.addEventListener('blur', release)
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }),
    [pressKey],
  )

  const handleMove = useCallback((x: number, z: number) => {
    setPlayerPos([x, z])
  }, [])

  // R: 낮/밤 토글, G: 전체 불 켜기 토글 (밤에만), F: 가장 가까운 문 토글
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
      } else if (k === 'f') {
        e.preventDefault()
        // 가장 가까운 문 하나만 토글 (각 도어 컴포넌트가 자체 default maxDist 사용)
        const detail: { best: { dist: number; toggle: () => void } | null; maxDist?: number } = { best: null }
        window.dispatchEvent(new CustomEvent('door-toggle-request', { detail }))
        detail.best?.toggle()
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
        <FPSController bindings={bindings} height={height} isMobile={isMobile} onMove={handleMove} onHeightChange={setHeight} />
      </Canvas>
      <div className="crosshair" />
      {!isMobile && (
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
      )}
      {!isMobile && (
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
      )}

      {isMobile && (
        <MobileControls
          isNight={isNight}
          allLightsOn={allLightsOn}
          onToggleNight={() => setIsNight((n) => !n)}
          onToggleAllLights={() => setAllLightsOn((v) => (isNight ? !v : false))}
          onOpenDoor={() => {
            // 모바일은 더 넉넉한 반경(3m) 사용 — 가장 가까운 문 하나만 토글
            const detail: { best: { dist: number; toggle: () => void } | null; maxDist: number } = { best: null, maxDist: 3 }
            window.dispatchEvent(new CustomEvent('door-toggle-request', { detail }))
            detail.best?.toggle()
          }}
          holdProps={holdProps}
        />
      )}
    </>
  )
}

function MobileControls({
  isNight,
  allLightsOn,
  onToggleNight,
  onToggleAllLights,
  onOpenDoor,
  holdProps,
}: {
  isNight: boolean
  allLightsOn: boolean
  onToggleNight: () => void
  onToggleAllLights: () => void
  onOpenDoor: () => void
  holdProps: (k: string) => any
}) {
  const padBtn: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(22, 33, 62, 0.75)',
    color: '#fff5e6',
    fontSize: 20,
    fontWeight: 700,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const actionBtn: React.CSSProperties = {
    minWidth: 64,
    height: 44,
    padding: '0 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(22, 33, 62, 0.85)',
    color: '#fff5e6',
    fontSize: 13,
    fontWeight: 600,
    touchAction: 'manipulation',
    backdropFilter: 'blur(8px)',
  }
  return (
    <div data-mobile-ui>
      {/* 좌하단 — WASD 패드 */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 56px)',
          gridTemplateRows: 'repeat(3, 56px)',
          gap: 6,
          touchAction: 'none',
        }}
      >
        <div />
        <button {...holdProps('w')} style={padBtn}>↑</button>
        <div />
        <button {...holdProps('a')} style={padBtn}>←</button>
        <button {...holdProps('s')} style={padBtn}>↓</button>
        <button {...holdProps('d')} style={padBtn}>→</button>
        <div />
        <div />
        <div />
      </div>

      {/* 우하단 — 액션 버튼 */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          touchAction: 'manipulation',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button {...holdProps('q')} style={{ ...actionBtn, minWidth: 44 }}>낮게</button>
          <button {...holdProps('e')} style={{ ...actionBtn, minWidth: 44 }}>높게</button>
        </div>
        <button
          onClick={onToggleNight}
          style={{
            ...actionBtn,
            background: isNight ? 'rgba(22,33,62,0.85)' : 'rgba(240,232,208,0.95)',
            color: isNight ? '#fff5e6' : '#333',
          }}
        >
          {isNight ? '🌙 밤' : '☀ 낮'}
        </button>
        <button
          onClick={onToggleAllLights}
          disabled={!isNight}
          style={{
            ...actionBtn,
            opacity: isNight ? 1 : 0.4,
            background: allLightsOn ? 'rgba(255, 224, 176, 0.95)' : 'rgba(22,33,62,0.85)',
            color: allLightsOn ? '#222' : '#fff5e6',
          }}
        >
          {allLightsOn ? '💡 전체 ON' : '💡 전체 불 켜기'}
        </button>
        <button
          onClick={onOpenDoor}
          style={{
            ...actionBtn,
            background: 'rgba(58, 123, 213, 0.85)',
          }}
        >
          🚪 문 열기
        </button>
      </div>
    </div>
  )
}
