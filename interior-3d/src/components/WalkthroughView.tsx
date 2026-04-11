import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ApartmentModel } from './ApartmentModel'
import { LR_W, LR_D, MB_W, WALL_THICKNESS, WALL_HEIGHT, babyTop, downlightGroups } from '../data/apartment'
import { moveWithCollision } from '../systems/collision'
import type { DoorId } from '../data/sectors'
import { doorRegistry, pickActiveDoor } from '../systems/doorRegistry'
import { findSector } from '../systems/visibility'
import { preloadAllKTX2 } from '../systems/useKTX2'
import { mirrorState, useMirrorEnabled } from '../systems/mirrorToggle'

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
  'ㅂ': 'q', 'ㄷ': 'e', 'ㄱ': 'r', 'ㄹ': 'f', 'ㅎ': 'g', 'ㅅ': 't',
}

function resolveKey(key: string): string {
  const lower = key.toLowerCase()
  return KO_TO_EN[lower] ?? lower
}

const MOVE_SPEED = 3.0
const MOVE_SPEED_MOBILE = 1.5
const MOUSE_SENSITIVITY = 0.002
const TOUCH_SENSITIVITY = 0.0035

// 매 프레임 재사용 — new THREE.Vector3() 할당 회피 (GC 압력 ↓)
const _scratchDir = new THREE.Vector3()
const _scratchRight = new THREE.Vector3()
const _scratchUp = new THREE.Vector3(0, 1, 0)
const _scratchNewPos = new THREE.Vector3()
const _scratchFwd = new THREE.Vector3()

/**
 * Prewarm — 시작 시 모든 sector 가 보이고 allLightsOn 의 두 상태를 거치며
 * gl.compile 로 shader program 을 미리 컴파일. three.js 는 program key 가
 * (NUM_DIR/POINT/SPOT/RECT_AREA + define 조합)으로 캐시되므로 한 번 컴파일 한
 * 상태는 이후 동일 조합 재현 시 instant. G 토글 시 발생하던 100~200ms freeze 가
 * 사라진다.
 *
 * Stage 0: allOn  → 다음 프레임에 gl.compile → stage 1
 * Stage 1: allOff → 다음 프레임에 gl.compile → onDone
 *
 * Canvas 안에서만 mount 가능 (useThree 사용).
 */
/**
 * Splash 오버레이 — Prewarm 진행 중에 화면을 가려서 라이트 깜빡임/freeze 가
 * 사용자에게 보이지 않게 함. 단계 표시 + 부드러운 진행 바.
 */
function SplashScreen({ label, progress }: { label: string; progress: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at center, #16213e 0%, #0a0e1f 100%)',
        color: '#fff5e6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 0.5, marginBottom: 28 }}>
        마이하우스 워크스루!
      </div>
      <div
        style={{
          width: 280,
          height: 4,
          borderRadius: 4,
          background: 'rgba(255,245,230,0.12)',
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ffe0b0, #ffb070)',
            transition: 'width 280ms ease-out',
            boxShadow: '0 0 12px rgba(255,224,176,0.6)',
          }}
        />
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
    </div>
  )
}

/** Canvas 밖에서 호출 가능한 전역 invalidate — 즉시 + 지연 2회로 React 리렌더 후에도 보장 */
const globalInvalidateRef: { current: (() => void) | null } = { current: null }
export function globalInvalidate() {
  globalInvalidateRef.current?.()
  requestAnimationFrame(() => globalInvalidateRef.current?.())
  setTimeout(() => globalInvalidateRef.current?.(), 50)
}

/** 상태 변경 시 R3F invalidate — 모바일에서 버튼 액션 후 리렌더 보장 */
function Invalidator({ deps }: { deps: string }) {
  const { invalidate } = useThree()
  globalInvalidateRef.current = invalidate
  useEffect(() => { invalidate() }, [deps, invalidate])
  return null
}

/** FPS 업데이터 — Canvas 내부에서 useFrame 으로 외부 DOM 엘리먼트 직접 업데이트 */
function FPSUpdater({ domRef }: { domRef: React.RefObject<HTMLDivElement | null> }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frames.current++
    const now = performance.now()
    if (now - lastTime.current >= 500) {
      const fps = Math.round((frames.current * 1000) / (now - lastTime.current))
      frames.current = 0
      lastTime.current = now
      if (domRef.current) {
        const info = gl.info.render
        domRef.current.textContent = `${fps} FPS | ${info.calls} draws | ${info.triangles} tris`
      }
    }
  })

  return null
}

function Prewarm({ index, active, onAdvance }: { index: number; active: boolean; onAdvance: () => void }) {
  const { gl, scene, camera, invalidate } = useThree()

  // 첫 stage에서 모든 KTX2 텍스처를 useLoader 캐시에 preload
  // → room 전환 시 useKTX2 가 suspend 하지 않음
  useEffect(() => {
    if (index === 0) preloadAllKTX2(gl)
  }, [index, gl])

  useEffect(() => {
    if (!active) return
    // 1) 현재 React 트리 mount 가 끝난 후 → next rAF 에서 compile
    // 2) compile 결과가 GPU 에 올라간 다음 프레임에서 stage 전환
    let rafA = 0, rafB = 0
    invalidate()
    rafA = requestAnimationFrame(() => {
      // 1) 셰이더 컴파일
      try { gl.compile(scene, camera) } catch { /* noop */ }

      // 2) 텍스처 GPU 업로드
      const seen = new Set<THREE.Texture>()
      scene.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return
        const mats = Array.isArray((obj as THREE.Mesh).material)
          ? (obj as THREE.Mesh).material as THREE.Material[]
          : [(obj as THREE.Mesh).material]
        for (const mat of mats) {
          if (!mat) continue
          for (const val of Object.values(mat)) {
            if (val && (val as THREE.Texture).isTexture && !seen.has(val as THREE.Texture)) {
              seen.add(val as THREE.Texture)
              try { gl.initTexture(val as THREE.Texture) } catch { /* noop */ }
            }
          }
        }
      })

      // 3) 실제 렌더 1프레임 — GPU 버퍼(VBO/IBO) 업로드 + draw call 파이프라인 워밍
      try { gl.render(scene, camera) } catch { /* noop */ }

      rafB = requestAnimationFrame(onAdvance)
    })
    return () => {
      if (rafA) cancelAnimationFrame(rafA)
      if (rafB) cancelAnimationFrame(rafB)
    }
  }, [index, active, gl, scene, camera, invalidate, onAdvance])
  return null
}

function FPSController({ bindings, height, isMobile, doorOpenStatesRef, onMove, onHeightChange, onActiveDoorChange }: { bindings: KeyBindings; height: number; isMobile: boolean; doorOpenStatesRef: React.MutableRefObject<Map<DoorId, boolean>>; onMove?: (x: number, z: number) => void; onHeightChange?: (h: number) => void; onActiveDoorChange?: (id: DoorId | null) => void }) {
  const { camera, gl, invalidate } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const isLocked = useRef(false)
  const heightRef = useRef(height)
  const heightSelfDriven = useRef(false)  // Q/E 키로 내부 변경 중 플래그

  // 부모에서 슬라이더로 변경 시 동기화 (Q/E 키 변경 중에는 skip)
  useEffect(() => {
    if (heightSelfDriven.current) {
      heightSelfDriven.current = false
      return
    }
    heightRef.current = height
  }, [height])

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
  const lastActiveDoorIdRef = useRef<DoorId | null>(null)
  const THROTTLE_MS = 250
  const HEIGHT_SPEED = 1.0  // m/s (Q/E 홀드 시 초당 1m)
  const MIN_HEIGHT = 0.3
  const MAX_HEIGHT = WALL_HEIGHT - 0.1

  useFrame((_, rawDelta) => {
    // frameloop="demand" 사용 시 idle 후 첫 프레임의 delta 가 매우 커질 수 있음 → clamp
    const delta = Math.min(rawDelta, 0.05)
    camera.quaternion.setFromEuler(euler.current)

    // 모듈 스코프 scratch 재사용 — new THREE.Vector3() 할당 회피
    camera.getWorldDirection(_scratchDir)
    _scratchDir.y = 0
    _scratchDir.normalize()

    _scratchRight.crossVectors(_scratchDir, _scratchUp).normalize()

    const speed = (isMobile ? MOVE_SPEED_MOBILE : MOVE_SPEED) * delta
    _scratchNewPos.copy(camera.position)

    // 정규화된 forward 를 직접 multiplyScalar 하지 않고 임시 합산용 스칼라로 — direction 손상 방지
    let fwdAmt = 0
    let rightAmt = 0
    if (keys.current.has(bindings.forward)) fwdAmt += speed
    if (keys.current.has(bindings.backward)) fwdAmt -= speed
    if (keys.current.has(bindings.right)) rightAmt += speed
    if (keys.current.has(bindings.left)) rightAmt -= speed
    if (fwdAmt !== 0) _scratchNewPos.addScaledVector(_scratchDir, fwdAmt)
    if (rightAmt !== 0) _scratchNewPos.addScaledVector(_scratchRight, rightAmt)

    // Q: 높이 낮추기, E: 높이 높이기 (연속 홀드)
    const qHeld = keys.current.has('q')
    const eHeld = keys.current.has('e')
    if (qHeld || eHeld) {
      const dir = (eHeld ? 1 : 0) - (qHeld ? 1 : 0)
      heightRef.current = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, heightRef.current + dir * HEIGHT_SPEED * delta))
      heightSelfDriven.current = true
    }

    // 벽 충돌 (axis-slide). 도어 상태는 lift된 ref에서 (Phase 2).
    const [resolvedX, resolvedZ] = moveWithCollision(
      [camera.position.x, camera.position.z],
      [_scratchNewPos.x, _scratchNewPos.z],
      doorOpenStatesRef.current,
    )
    _scratchNewPos.x = resolvedX
    _scratchNewPos.z = resolvedZ

    // 외곽 clamp는 보험으로 유지 (충돌 그물에 안 잡히는 외부 영역 방지)
    const margin = 0.3
    _scratchNewPos.x = Math.max(totalMinX + margin, Math.min(totalMaxX - margin, _scratchNewPos.x))
    _scratchNewPos.z = Math.max(totalMinZ + margin, Math.min(totalMaxZ - margin, _scratchNewPos.z))
    _scratchNewPos.y = heightRef.current

    camera.position.copy(_scratchNewPos)

    // 카메라가 향하는 도어 1개 선택 (각도 우선, 거리 보조)
    // 변경 시에만 부모에 알림 → 매 프레임 re-render 방지
    {
      camera.getWorldDirection(_scratchFwd)
      const sector = findSector(camera.position.x, camera.position.z)
      const newActive = pickActiveDoor(
        camera.position.x, camera.position.z,
        _scratchFwd.x, _scratchFwd.z,
        camera.position.y, _scratchFwd.y,
        2.5, 0.5,
        sector,
      )
      if (newActive !== lastActiveDoorIdRef.current) {
        lastActiveDoorIdRef.current = newActive
        onActiveDoorChange?.(newActive)
        invalidate()
      }
    }

    // 초당 최대 4회 (250ms 간격) + 의미 있는 움직임이 있을 때만
    const now = performance.now()
    const [lx, lz] = lastReportedPos.current
    const moved = Math.abs(_scratchNewPos.x - lx) > 0.001 || Math.abs(_scratchNewPos.z - lz) > 0.001
    const heightChanged = Math.abs(heightRef.current - lastReportedHeight.current) > 0.01
    if ((moved || heightChanged) && now - lastReportedAt.current >= THROTTLE_MS) {
      lastReportedAt.current = now
      if (moved) {
        lastReportedPos.current = [_scratchNewPos.x, _scratchNewPos.z]
        onMove?.(_scratchNewPos.x, _scratchNewPos.z)
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

  // === Prewarm ===
  // 고정 light pool (12 PointLight) 이므로 셰이더 variant 가 적음.
  // Stage 0: 조명 off (baseline material 컴파일)
  // Stage 1: 전체 조명 on (모든 room-internal light 활성 variant 컴파일 + 텍스처 GPU 업로드)
  const PREWARM_STAGES = useMemo(() => {
    const stages: Array<{ playerPos: [number, number] | undefined; allLightsOn: boolean; label: string }> = []
    stages.push({ playerPos: undefined, allLightsOn: false, label: '베이스 컴파일 중…' })
    stages.push({ playerPos: undefined, allLightsOn: true, label: '전체 조명 컴파일 중…' })
    return stages
  }, [])

  const [prewarmIndex, setPrewarmIndex] = useState(0)
  const isPrewarming = prewarmIndex < PREWARM_STAGES.length
  const advancePrewarm = useCallback(() => {
    setPrewarmIndex((i) => i + 1)
  }, [])
  const currentStage = PREWARM_STAGES[Math.min(prewarmIndex, PREWARM_STAGES.length - 1)]
  // Prewarm 중에는 stage 가 props 를 강제. 끝나면 실제 player/allLightsOn 사용.
  const effectivePlayerPos = isPrewarming ? currentStage.playerPos : playerPos
  const effectiveAllLightsOn = isPrewarming ? currentStage.allLightsOn : allLightsOn

  // 도어 상태:
  //  - 충돌은 ref(매 프레임 즉시 반영)
  //  - visibility (Phase 6)는 state(React 렌더 트리거)
  const mirrorEnabled = useMirrorEnabled()

  const doorOpenStatesRef = useRef<Map<DoorId, boolean>>(new Map())
  const [doorOpenStates, setDoorOpenStates] = useState<Map<DoorId, boolean>>(() => new Map())

  // 카메라 forward 가 향하는 도어 (툴팁 + F 키 토글 대상)
  const activeDoorIdRef = useRef<DoorId | null>(null)
  const [activeDoorId, setActiveDoorId] = useState<DoorId | null>(null)
  const handleActiveDoorChange = useCallback((id: DoorId | null) => {
    activeDoorIdRef.current = id
    setActiveDoorId(id)
  }, [])

  const handleDoorOpenChange = useCallback((id: DoorId, open: boolean) => {
    doorOpenStatesRef.current.set(id, open)
    setDoorOpenStates((prev) => {
      const next = new Map(prev)
      next.set(id, open)
      return next
    })
  }, [])

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
      } else if (k === 't') {
        e.preventDefault()
        mirrorState.toggle()
      } else if (k === 'f') {
        e.preventDefault()
        // 카메라가 향하는 도어 1개 토글
        const id = activeDoorIdRef.current
        if (id) doorRegistry.get(id)?.toggle()
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

  const fpsRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <Canvas
        shadows={false}
        frameloop="demand"
        // dpr 을 동적으로 바꾸면 캔버스 resize → context 재설정 비용. 정적 유지.
        dpr={[0.5, 1.5]}
        performance={{ min: 0.3 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        camera={{
          fov: 75,
          near: 0.1,
          far: 100,
          position: [LR_W / 2, height, LR_D / 2],
        }}
      >
        <ambientLight intensity={isNight ? 0.08 : 0.6} />
        <directionalLight position={[5, 10, 5]} intensity={isNight ? 0 : 0.8} />
        <ApartmentModel showCeiling={true} playerPos={effectivePlayerPos} isNight={isNight} allLightsOn={effectiveAllLightsOn} doorOpenStates={doorOpenStates} activeDoorId={activeDoorId} onDoorOpenChange={handleDoorOpenChange} mirrorEnabled={mirrorEnabled} />
        {!isPrewarming && (
          <FPSController bindings={bindings} height={height} isMobile={isMobile} doorOpenStatesRef={doorOpenStatesRef} onMove={handleMove} onHeightChange={setHeight} onActiveDoorChange={handleActiveDoorChange} />
        )}
        <Prewarm index={prewarmIndex} active={isPrewarming} onAdvance={advancePrewarm} />
        <Invalidator deps={`${isNight}|${allLightsOn}|${mirrorEnabled}|${activeDoorId}`} />
        <FPSUpdater domRef={fpsRef} />
      </Canvas>
      {!isMobile && (
        <div
          ref={fpsRef}
          style={{
            position: 'fixed',
            top: 8,
            right: 8,
            color: '#0f0',
            background: 'rgba(0,0,0,0.7)',
            padding: '4px 8px',
            fontSize: 13,
            fontFamily: 'monospace',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          -- FPS
        </div>
      )}
      {isPrewarming && (
        <SplashScreen
          label={currentStage.label}
          progress={Math.round((prewarmIndex / PREWARM_STAGES.length) * 100)}
        />
      )}
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
          <br />
          <kbd>T</kbd> 거울 반사 {mirrorEnabled ? 'ON' : 'OFF'}
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
        <>
          <VirtualJoystick safeBottom="calc(env(safe-area-inset-bottom, 0px) + 20px)" pressKey={pressKey} />
          <MobileControls
            isNight={isNight}
            allLightsOn={allLightsOn}
            onToggleNight={() => { setIsNight((n) => !n); globalInvalidate() }}
            onToggleAllLights={() => { setAllLightsOn((v) => (isNight ? !v : false)); globalInvalidate() }}
            onOpenDoor={() => {
              const id = activeDoorIdRef.current
              if (id) doorRegistry.get(id)?.toggle()
              globalInvalidate()
            }}
            onToggleMirror={() => { mirrorState.toggle(); globalInvalidate() }}
            mirrorEnabled={mirrorEnabled}
            holdProps={holdProps}
          />
        </>
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
  onToggleMirror,
  mirrorEnabled,
  holdProps,
}: {
  isNight: boolean
  allLightsOn: boolean
  onToggleNight: () => void
  onToggleAllLights: () => void
  onOpenDoor: () => void
  onToggleMirror: () => void
  mirrorEnabled: boolean
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
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(22, 33, 62, 0.85)',
    color: '#fff5e6',
    fontSize: 13,
    fontWeight: 600,
    touchAction: 'manipulation',
    backdropFilter: 'blur(8px)',
  }
  // 모바일 주소창 영역에 묻히지 않도록:
  //  - 바깥 컨테이너를 position:fixed + height:100dvh 로 잡아 dynamic viewport 추적
  //  - safe-area-inset-bottom 추가 마진
  //  - pointer-events:none 으로 캔버스 터치(시점 회전) 방해 안 함, 버튼에서만 auto
  const safeBottom = 'calc(env(safe-area-inset-bottom, 0px) + 20px)'
  return (
    <div
      data-mobile-ui
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        height: '100dvh',
        pointerEvents: 'none',
      }}
    >
      {/* 우하단 — 액션 버튼 */}
      <div
        style={{
          position: 'absolute',
          bottom: safeBottom,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          touchAction: 'manipulation',
          pointerEvents: 'auto',
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
          <kbd style={{ background: '#fff5e6', color: '#1a1a1a', padding: '1px 6px', borderRadius: 3, fontWeight: 700, fontSize: 11, border: '1px solid #888', boxShadow: '0 1px 0 #555', marginRight: 4 }}>F</kbd>상호작용
        </button>
        <button
          onClick={onToggleMirror}
          style={{
            ...actionBtn,
            background: mirrorEnabled ? 'rgba(40, 167, 69, 0.85)' : 'rgba(22, 33, 62, 0.85)',
          }}
        >
          🪞 거울 {mirrorEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  )
}

/**
 * 가상 조이스틱 — 좌하단, 터치 드래그로 WASD 시뮬레이션.
 */
function VirtualJoystick({ safeBottom, pressKey }: { safeBottom: string; pressKey: (k: string, down: boolean) => void }) {
  const RADIUS = 50
  const DEAD = 12
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activeKeys = useRef(new Set<string>())
  const touchId = useRef<number | null>(null)

  const update = useCallback((dx: number, dy: number) => {
    // 조이스틱 노브 위치
    const dist = Math.hypot(dx, dy)
    const clamped = dist > RADIUS ? RADIUS / dist : 1
    const cx = dx * clamped
    const cy = dy * clamped
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${cx}px, ${cy}px)`
    }
    // 방향 → WASD
    const next = new Set<string>()
    if (dist > DEAD) {
      const angle = Math.atan2(-dy, dx) // 위 = +, 우 = +
      if (angle > -Math.PI * 0.625 && angle < Math.PI * 0.625) next.add('d') // 우
      if (angle > Math.PI * 0.375 || angle < -Math.PI * 0.375) {
        if (angle > 0) next.add('w') // 위(전진)
        else next.add('s') // 아래(후진)
      }
      if (angle > Math.PI * 0.375 && angle < Math.PI * 0.625) { /* 위+우 이미 처리 */ }
      if (Math.abs(angle) > Math.PI * 0.375) {
        // 좌/우 재판정
      }
      // 간단한 4방향
      next.clear()
      if (dy < -DEAD) next.add('w')
      if (dy > DEAD) next.add('s')
      if (dx < -DEAD) next.add('a')
      if (dx > DEAD) next.add('d')
    }
    // 키 이벤트 디스패치
    for (const k of ['w', 'a', 's', 'd']) {
      const wasActive = activeKeys.current.has(k)
      const isActive = next.has(k)
      if (isActive && !wasActive) pressKey(k, true)
      if (!isActive && wasActive) pressKey(k, false)
    }
    activeKeys.current = next
  }, [pressKey])

  const reset = useCallback(() => {
    for (const k of activeKeys.current) pressKey(k, false)
    activeKeys.current.clear()
    touchId.current = null
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)'
  }, [pressKey])

  const handleStart = useCallback((e: React.TouchEvent) => {
    if (touchId.current !== null) return
    const t = e.changedTouches[0]
    touchId.current = t.identifier
    const rect = baseRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    update(t.clientX - cx, t.clientY - cy)
  }, [update])

  useEffect(() => {
    const move = (e: TouchEvent) => {
      if (touchId.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier !== touchId.current) continue
        const rect = baseRef.current!.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        update(t.clientX - cx, t.clientY - cy)
      }
    }
    const end = (e: TouchEvent) => {
      if (touchId.current === null) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) { reset(); return }
      }
    }
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    window.addEventListener('touchcancel', end)
    return () => {
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
      window.removeEventListener('touchcancel', end)
    }
  }, [update, reset])

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      style={{
        position: 'absolute',
        bottom: safeBottom,
        left: 20,
        width: RADIUS * 2 + 20,
        height: RADIUS * 2 + 20,
        borderRadius: '50%',
        background: 'rgba(22, 33, 62, 0.4)',
        border: '2px solid rgba(255,255,255,0.2)',
        touchAction: 'none',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={knobRef}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(255, 245, 230, 0.7)',
          border: '2px solid rgba(255,255,255,0.5)',
          transition: 'none',
        }}
      />
    </div>
  )
}
