/**
 * F 키 인터랙션 툴팁 — 화면 밖 클램핑 + 거리 무관 고정 크기.
 */
import { useState, useEffect } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

/** doorId → 사람이 읽을 수 있는 명칭 */
const doorNames: Record<string, string> = {
  // 거실 수납장
  'closet-lr-0': '북쪽 키큰장',
  'closet-lr-1': '북쪽 2단 분할',
  'closet-lr-2': '남쪽 2단 분할',
  'closet-lr-3': '남쪽 키큰장',
  // 안방 붙박이장
  'closet-mb-0': '북쪽 안방 붙박이',
  'closet-mb-1': '중간 안방 붙박이',
  'closet-mb-2': '남쪽 안방 붙박이',
  // 아기방 수납장
  'closet-baby-0': '북쪽 아기방 붙박이 오른쪽',
  'closet-baby-1': '북쪽 아기방 붙박이 왼쪽',
  'closet-baby-2': '남쪽 아기방 붙박이 오른쪽',
  'closet-baby-3': '남쪽 아기방 붙박이 왼쪽',
  // 주방
  'kitchen-drawer': '밥솥 서랍',
  'kitchen-drawer-south': '남쪽 서랍',
  'kitchen-tiny': '짜투리 서랍',
  'kitchen-lc-north': '정수기 하단장',
  'kitchen-lc-cab12': '인덕션 하단장',
  'kitchen-lc-sink': '싱크 하단장',
  'kitchen-lc-cab3': '식기세척기 왼쪽 하단장',
  'kitchen-tall-pantry': '팬트리',
  'kitchen-tall-lower': '키큰장 하단장',
  'kitchen-tall-upper': '키큰장 유리 상단장',
  'kitchen-fridge-uc-0': '북쪽 냉장고 상부장',
  'kitchen-fridge-uc-1': '남쪽 냉장고 상부장',
  'kitchen-uc-purifier': '정수기 상부',
  'kitchen-uc-0': '북쪽 상부장',
  'kitchen-uc-1': '중간 상부장',
  'kitchen-uc-2': '남쪽 상부장',
  'kitchen-pet-pass-n': '펫도어 북쪽',
  'kitchen-pet-pass-s': '펫도어 남쪽',
  // 신발장
  'shoe-mirror': '신발장 거울',
  'shoe-doors': '신발장',
  // 욕실 거울장
  'bath-mirror-n': '욕실 거울장 좌',
  'bath-mirror-s': '욕실 거울장 우',
  'mb-bath-mirror-l': '안방욕실 거울장 좌',
  'mb-bath-mirror-r': '안방욕실 거울장 우',
  // 문
  'work-hall': '작업실 문',
  'baby-hall': '아기방 문',
  'mb-hall': '안방 문',
  'laundry-kitchen': '세탁실 문',
  'jungmun': '중문',
  'entrance': '현관문',
  'mainBath-hall': '화장실 문',
  'mb-mbBath': '안방 화장실 문',
  'cage-mainVeranda': '새장 문',
  'outdoor-mainVeranda': '실외기실 문',
  'mb-vanity': '화장대 서랍장',
  'mb-vanity-mirror': '화장대 거울',
}

export function getDoorLabel(doorId: string | undefined, isOpen: boolean): string {
  const name = doorId ? doorNames[doorId] : undefined
  if (name) return isOpen ? `${name} 닫기` : `${name} 열기`
  return isOpen ? '닫기' : '열기'
}

interface DoorTooltipProps {
  position: [number, number, number]
  label: string
}

const isMobileQuery = typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)')
function useIsMobile() {
  const [m, setM] = useState(() => isMobileQuery ? isMobileQuery.matches : false)
  useEffect(() => {
    if (!isMobileQuery) return
    const h = (e: MediaQueryListEvent) => setM(e.matches)
    isMobileQuery.addEventListener('change', h)
    return () => isMobileQuery.removeEventListener('change', h)
  }, [])
  return m
}

export function DoorTooltip({ position, label }: DoorTooltipProps) {
  const mobile = useIsMobile()
  const s = mobile ? 0.5 : 1  // 모바일 절반 크기
  return (
    <Html
      position={position}
      center
      zIndexRange={[100, 0]}
      calculatePosition={(el, camera, size) => {
        const v = new THREE.Vector3()
        el.getWorldPosition(v)
        v.project(camera)
        const hw = size.width / 2
        const hh = size.height / 2
        let sx = v.x * hw + hw
        let sy = -(v.y * hh) + hh
        const m = 80
        sx = Math.max(m, Math.min(size.width - m, sx))
        sy = Math.max(m, Math.min(size.height - m, sy))
        return [sx, sy]
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10 * s,
          background: 'rgba(20, 20, 25, 0.85)',
          color: '#fff5e6',
          padding: `${10 * s}px ${18 * s}px`,
          borderRadius: 10 * s,
          fontSize: 24 * s,
          fontFamily: 'system-ui, sans-serif',
          border: '1px solid rgba(255,255,255,0.2)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <kbd
          style={{
            background: '#fff5e6',
            color: '#1a1a1a',
            padding: `${4 * s}px ${12 * s}px`,
            borderRadius: 6 * s,
            fontWeight: 700,
            fontSize: 22 * s,
            border: '1px solid #888',
            boxShadow: '0 1px 0 #555',
          }}
        >
          F
        </kbd>
        <span>{label}</span>
      </div>
    </Html>
  )
}
