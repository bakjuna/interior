# 워크스루 리팩터링 + 성능 최적화 마스터 플랜

> 이 문서는 `ApartmentModel.tsx`(3,549줄 모놀리식) 를 방/모델 단위로 분할하고,
> 동시에 portal culling + 벽 충돌을 도입하기 위한 단계별 실행 플랜이다.
>
> **원칙**: 매 phase 끝마다 앱이 동작 상태를 유지해야 한다 (빅뱅 금지).
> 한 phase = 한 PR/커밋 단위로 진행.

---

## 0. 목표

1. **방/모델 단위로 코드 분할** — 3500줄 단일파일 → 도메인 단위 다파일
2. **방별 portal culling** — visible 방만 렌더 + 라이트 활성
3. **벽 충돌** — 플레이어가 벽을 통과 못함. 예외: ① 열린 도어, ② 거실 풀높이 창 (베란다로 통과)
4. **방 컴포넌트 내 geometry merging + InstancedMesh** 로 draw call 축소
5. 매 단계마다 앱 동작 유지

---

## 1. 최종 디렉토리 구조

```
src/
  data/
    apartment.ts              # 좌표/벽/도어/창/방 데이터 — 손 안 댐
    sectors.ts                # 신규: SectorId, SectorAABB, Portal, DoorId, helpers
  systems/                    # 신규
    visibility.ts             # computeVisibleSectors(playerPos, doorOpen)
    collision.ts              # moveWithCollision(oldPos, newPos, doorOpen)
  components/
    ApartmentModel.tsx        # 슬림화 — 방 컴포넌트 조립자
    shell/
      Walls.tsx               # walls[] 통합 렌더 (실크/타일/콘크리트 분기)
      Windows.tsx             # windows[] 통합 렌더
      Doors.tsx               # 모든 도어 인스턴스 + doorId 매핑
      Ceilings.tsx            # 방별 천장 plane + 단내림
      Floors.tsx              # 방별 바닥 plane (텍스처 분기)
      ExteriorBackground.tsx
    rooms/                    # 방 단위 — 방 내부 가구 + 천장 라이트만
      MasterBedroom.tsx       # 가벽, 화장대+4면라이트, 다운라이트, 안방 closet
      LivingRoom.tsx          # 소파, TV, 거실 수납장, 코브 LED, 다운라이트
      Kitchen.tsx             # 싱크대, 식탁, 빌트인, ㄷ자 라인등
      BabyRoom.tsx            # 침대, 수납, 다운라이트
      WorkRoom.tsx            # 트레슬 책상×2, 다운라이트
      Hallway.tsx             # 복도 다운라이트
      Entrance.tsx            # 신발장, 중문, 다운라이트
      MasterBath.tsx          # 변기/세면대/거울/타일/다운라이트
      MainBath.tsx            # 샤워부스/니치/거울/다운라이트
      Laundry.tsx             # 워시타워
      WorkVeranda.tsx
      MainVeranda.tsx
      Cage.tsx                # 새장 (1340mm 분할)
      OutdoorUnit.tsx
    models/                   # 가구/가전 단일 객체
      Bed.tsx
      ToddlerBed.tsx
      Sofa.tsx
      Toilet.tsx
      Sink.tsx
      WashTower.tsx
      Refrigerator.tsx
      KimchiFridge.tsx
      RiceCooker.tsx
      LightWaveOven.tsx
      WaterPurifier.tsx
      DiningTable.tsx
      TrestleDesk.tsx
      ShoeCabinet.tsx
      JungmunDoor.tsx         # 중문 3-piece (스윙+고정+유리)
      FlushDoor.tsx           # 일반 도어
      Closet.tsx              # 붙박이장 일반화
    primitives/               # 공통 빌딩 블록
      RoomCeiling.tsx         # 직사각형 방 천장 + 4코너 다운라이트
      Downlight.tsx           # 단일 다운라이트
      WindowFrame.tsx         # 분합창 프레임
      MirrorWithBacklight.tsx
    WalkthroughView.tsx       # 충돌 통합
    BirdsEyeView.tsx          # 거의 변경 없음
    FloorPlanView.tsx         # 거의 변경 없음
```

**대원칙:**
- **벽은 데이터(`apartment.ts`) 그대로, `Walls.tsx`가 한 번에 렌더한다.** 방별로 벽을 쪼개지 않음. 이유: 공유벽 owner 결정이 모호해지고, geometry merging 효과가 분산됨.
- **방 컴포넌트는 "방 안에 있는 것"만 담당.** 가구, 가전, 천장 라이트, 천장 단내림, 코브 LED, 거울 백라이트.
- **천장/바닥은 별도 shell 컴포넌트.** 단내림 영역 처리가 방 경계를 가로지르기 때문.

---

## 2. Phase별 작업 순서

매 phase 끝나면 **앱이 동작해야 함**. 시각적/기능적 회귀 없는지 확인 후 다음 phase.

### Phase 0 — Foundation (데이터/타입만, 동작 변화 0)

**산출물:** `src/data/sectors.ts`, `src/systems/visibility.ts`, `src/systems/collision.ts`

1. `sectors.ts` 작성:
   - `SectorId` union (14개): `mb | mbBath | mainBath | baby | laundry | kitchen | lr | entrance | hall | work | workVeranda | mainVeranda | cage | outdoor`
   - `SectorAABB[]` — 각 sector의 minX/maxX/minZ/maxZ. 작은 방 우선순으로 정렬 (findSector가 첫 매칭 반환). L자형 방은 여러 box.
   - `DoorId` union (9개): `mb-hall | mb-mbBath | mainBath-hall | baby-hall | laundry-kitchen | work-hall | jungmun | cage-mainVeranda | outdoor-mainVeranda`
   - `Portal[]` — sector 간 연결. 항상 열림(창문/오픈 통로) vs 도어 통과
     - Always: `hall↔lr`, `hall↔kitchen`, `mb↔mainVeranda`, `lr↔mainVeranda`, `work↔workVeranda`
     - Door: 9개 도어 매핑

2. `visibility.ts`:
   - `findSector(x, z): SectorId | null` — AABB 검사
   - `computeVisibleSectors(playerPos, doorOpen: Map<DoorId, boolean>): Set<SectorId>` — BFS
   - `playerPos === undefined` 이면 전체 sector 반환 (조감도/평면도 호환)

3. `collision.ts`:
   - 벽 → "충돌 세그먼트"로 변환:
     - 풀높이 벽 (`height === undefined` 또는 `height >= 1.8` && `bottomY < 0.5`) → blocker
     - 린텔/단차벽 (`bottomY > 0.5`) → 제외
     - 창 spandrel (sill≥0.5 아래 부분) → blocker (난간 역할)
   - 도어 갭 blocker (도어 닫힘 시만 활성):
     - `doors[]`의 각 도어에 대해 도어 폭만큼의 가상 세그먼트
   - 거실 풀높이 창 통과 처리: `windows[]`에 `passable?: boolean` 필드 추가, 거실 창에만 true.
   - 핵심 함수:
     ```ts
     function moveWithCollision(
       old: [number, number],
       desired: [number, number],
       doorOpen: Map<DoorId, boolean>,
       playerRadius = 0.25
     ): [number, number]
     ```
     - X축, Z축 분리해서 시도 (axis-aligned slide)
     - 각 시도마다 모든 active blocker와 segment-vs-circle 교차 검사
     - 충돌하면 그 축은 막힘, 다른 축만 적용

4. `apartment.ts`에 `passable?: boolean` 필드 추가, 거실 창문(`position: [0.870 + 1.000, LR_D + T2]`)에만 `passable: true`.

**검증:** 빌드만 통과. 동작 변화 없음.

---

### Phase 1 — 벽 충돌 적용

**산출물:** `WalkthroughView.tsx` 수정만.

1. WalkthroughView에 `doorOpenStatesRef: Ref<Map<DoorId, boolean>>` 추가 (Phase 2에서 채워지기 전엔 빈 Map = 모든 도어 닫힘으로 취급)
2. `FPSController`의 `useFrame` 안에서:
   ```ts
   const desired: [number, number] = [newPos.x, newPos.z]
   const old: [number, number] = [camera.position.x, camera.position.z]
   const resolved = moveWithCollision(old, desired, doorOpenStatesRef.current)
   newPos.x = resolved[0]; newPos.z = resolved[1]
   ```
3. 외곽 clamp는 그대로 유지 (보험)
4. **임시 dev flag** `COLLISION_ALL_DOORS_OPEN = true` 추가 (Phase 2 끝나면 false). 그래야 도어 통과 가능 상태로 테스트 가능.

**검증:** 워크스루에서 벽을 뚫지 못함. 거실 창문만 통과 가능. dev flag로 도어 통과 가능.

---

### Phase 2 — 도어 컴포넌트 분리 + 도어 상태 lift

**산출물:** `models/FlushDoor.tsx`, `models/JungmunDoor.tsx`, `shell/Doors.tsx`

1. `FlushDoor`, `JungmunSwingDoor` 함수를 ApartmentModel.tsx에서 잘라서 각자 파일로
2. props 추가: `doorId?: DoorId`, `onOpenChange?: (open: boolean) => void`
3. 컴포넌트 내부:
   ```ts
   useEffect(() => { onOpenChange?.(isOpen) }, [isOpen, onOpenChange])
   ```
4. `shell/Doors.tsx` — 9개 인스턴스를 한 곳에 모아서 렌더 + doorId 매핑
   - 현관문(외부)은 doorId 없이 그대로
5. WalkthroughView에서 `doorOpenStates: Map<DoorId, boolean>` state 보유
6. 안정화된 콜백 Map 생성 후 ApartmentModel → Doors로 prop drill
7. WalkthroughView의 `doorOpenStatesRef`도 동기화 → 충돌이 도어 상태 인식
8. Phase 1의 dev flag 제거

**도어 매핑 (확인 필요):**

| FlushDoor 위치 | doorId |
|---|---|
| `[-WALL_THICKNESS - 0.45 - 0.009, -T2]` | `mb-hall` |
| `[(mbDoorHinge + mbDoorEnd) / 2, -T2]` | `mb-mbBath` |
| `[bath2RightWallX, -WALL_THICKNESS - 0.1 - 0.45]` | `mainBath-hall` |
| `[bath2RightWallX, babyBottom - 0.22 - 0.45]` | `baby-hall` |
| `[babyRightWallX, babyTopWallZ - 0.5595]` | `laundry-kitchen` |
| `[babyRightWallX + 2.555 - 0.1 + 0.250 + 0.45, -T2 - 1.591]` | `work-hall` |
| `[0.870 + 2.000, LR_D + WALL_THICKNESS + 1.308 / 2]` | `outdoor-mainVeranda` |
| `[mbLeft + 1.340, LR_D + WALL_THICKNESS + 1.308 / 2]` | `cage-mainVeranda` |
| `[LR_W + T2, -T2 - T2 - 0.410 - 0.450]` (현관문) | (외부, doorId 없음) |
| JungmunSwingDoor (중문) | `jungmun` |

**검증:** 도어 클릭/F키 토글 정상. 닫힌 도어 → 충돌 막힘, 열린 도어 → 통과.

---

### Phase 3 — Shell 컴포넌트 분리

**산출물:** `shell/Walls.tsx`, `shell/Windows.tsx`, `shell/Floors.tsx`, `shell/Ceilings.tsx`, `shell/ExteriorBackground.tsx`

1. ApartmentModel.tsx의 walls 렌더 블록 (~200~245줄) → `Walls.tsx`로 이동
2. windows 렌더 블록 (~248~333줄) → `Windows.tsx`
3. 방 바닥 렌더 → `Floors.tsx`
4. 천장 렌더(showCeiling 분기 + 단내림) → `Ceilings.tsx`
5. 도시 배경 plane → `ExteriorBackground.tsx`
6. ApartmentModel은 import + 조립만:
   ```tsx
   <Walls />
   <Floors />
   <Ceilings showCeiling={showCeiling} />
   <Windows />
   <Doors ... />
   <ExteriorBackground isNight={isNight} ... />
   ```

**검증:** 시각적 동일.

---

### Phase 4 — 방 컴포넌트 추출 (한 번에 한 방)

**산출물:** `rooms/*.tsx` 14개

각 방마다 동일한 절차:
1. ApartmentModel에서 해당 방의 가구/가전/RectAreaLight/다운라이트 렌더 코드를 잘라서 `rooms/Foo.tsx`로
2. 표준 시그니처:
   ```tsx
   interface RoomProps {
     visible: boolean
     playerPos?: [number, number]
     allLightsOn: boolean
     isNight: boolean
   }
   export const MasterBedroom = React.memo(function MasterBedroom({ visible, playerPos, ... }: RoomProps) {
     if (!visible) return null
     return <group>{/* ... */}</group>
   })
   ```
3. ApartmentModel:
   ```tsx
   <MasterBedroom visible={true} playerPos={rawPlayerPos} ... />
   ```
4. `visible={true}`는 일단 하드코딩. Phase 6에서 portal culling으로 교체.

**작업 순서 (작은 것부터):**
- Cage, OutdoorUnit, MainVeranda, WorkVeranda, Laundry → 작고 단순
- MasterBath, MainBath → 욕실
- BabyRoom, WorkRoom, Entrance, Hallway → 중간
- Kitchen, MasterBedroom, LivingRoom → 복잡 (마지막)

**검증:** 방 추출 매번 시각 비교. 한 번에 하나만 작업하고 커밋.

---

### Phase 5 — 가구/가전 모델 분리

**산출물:** `models/*.tsx`

1. ApartmentModel에 정의된 함수형 컴포넌트들 (`Bed`, `Sofa`, `Toilet`, `Sink`, `WashTower`, `ToddlerBed`, `RiceCooker`, `LightWaveOven`, `CuckooWaterPurifier`, `TrestleDesk`, 냉장고/김치냉장고, 식탁, 신발장 …) 을 각자 파일로 cut-paste
2. 방 컴포넌트는 단순 import 후 사용

**검증:** 가구 위치/외관 동일.

---

### Phase 6 — Portal culling 활성화

**산출물:** ApartmentModel에 visibility 통합

1. `import { computeVisibleSectors } from '../systems/visibility'`
2. `useMemo`:
   ```ts
   const visibleSectors = useMemo(
     () => computeVisibleSectors(rawPlayerPos, doorOpenStates),
     [rawPlayerPos, doorOpenStates]
   )
   ```
3. 각 방에 visible prop:
   ```tsx
   <MasterBedroom visible={visibleSectors.has('mb')} ... />
   <LivingRoom visible={visibleSectors.has('lr')} ... />
   ```
4. `Walls.tsx`, `Windows.tsx`, `Floors.tsx`, `Ceilings.tsx`는 전체 렌더 유지 (벽은 sector 경계라 culling 의미 적음)
5. `BirdsEyeView` / `FloorPlanView`에선 playerPos=undefined → visibleSectors가 모두 → culling 비활성

**검증 시나리오:**
- 안방 들어가서 모든 도어 닫고 G(전체 불) → 안방 + 메인베란다 라이트만 활성
- 안방 도어 열고 → 거실 + 주방 + 복도 라이트도 켜짐
- 메인베란다 라이트는 항상 (창문 always-open portal)
- 새장 도어 닫혀있으면 새장 라이트 안 켜짐, 열면 켜짐

---

### Phase 7 — 방 내 geometry merging

**산출물:** 각 방 컴포넌트 내부 최적화

1. 방 컴포넌트의 정적 메시 (가구 케이스, 트림, 단내림 박스 등)를 `useMemo` + `BufferGeometryUtils.mergeGeometries`로 합치기
2. 같은 머티리얼 그룹별로 합침 (호두 도어는 호두 도어끼리, 흰 패널은 패널끼리)
3. 도어/움직이는 부분은 별도
4. 방 1개당 메시 30~80 → 5~10개로 감소

**검증:** 시각 동일, FPS 측정.

---

### Phase 8 — InstancedMesh

**산출물:** `primitives/Downlight.tsx` 등 instancing 적용

1. `Downlight` 디스크 + 링: 38개 → InstancedMesh 1개 (디스크) + 1개 (링)
2. `WindowFrame` 박스들: 창 1개당 18개 메시 → ExtrudeGeometry로 단일 메시
3. 도어 손잡이/경첩 등 반복 메시
4. 다운라이트 emissive 색상 변경은 `instanceColor` 사용

**검증:** 시각 동일, FPS 측정.

---

### Phase 9 — Cleanup

1. ApartmentModel.tsx 최종 슬림화 — 100~200줄 정도의 조립자
2. 데드 코드 제거
3. 사용 안 하는 import 정리
4. README / PROJECT_OVERVIEW 갱신

---

## 3. 위험 요소 + 완화

| 위험 | 완화 |
|---|---|
| Phase 4에서 방 추출 중 좌표 어긋남 | 한 번에 한 방. 매번 시각 비교. 좌표는 apartment.ts 그대로 사용 |
| Phase 1 충돌이 너무 빡빡해서 가구 사이에 끼임 | playerRadius 작게(0.2m) 시작, 가구는 충돌 대상 아님 (벽만) |
| 도어 컴포넌트 useEffect → 무한 루프 | onOpenChange를 useMemo로 안정화, 동일 값일 때 setState 스킵 |
| Geometry merging 후 머티리얼 분리 안 됨 | 같은 머티리얼끼리만 머지. 다른 머티리얼은 그룹 유지 |
| 방 컴포넌트 visible=false 시 useEffect cleanup leak | `if (!visible) return null`로 unmount → React가 정상 cleanup |
| WalkthroughView ↔ ApartmentModel 도어 상태 동기화 어긋남 | 단일 source: WalkthroughView가 보유, prop 전달, 콜백으로 update |

---

## 4. 컴포넌트 표준 시그니처

### 방 컴포넌트
```tsx
interface RoomProps {
  visible: boolean
  playerPos?: [number, number]   // 워크스루에서만
  isNight: boolean
  allLightsOn: boolean
}
export const MasterBedroom = React.memo(function MasterBedroom(props: RoomProps) {
  if (!props.visible) return null
  // ...
})
```

### 모델 컴포넌트
```tsx
interface BedProps {
  position?: [number, number, number]
  rotation?: number
}
```

### 도어 컴포넌트
```tsx
interface FlushDoorProps {
  doorId?: DoorId          // 충돌/visibility 연동
  onOpenChange?: (open: boolean) => void
  position: [number, number]
  axis: 'x' | 'z'
  // ... 기존 props
}
```

---

## 5. 검증 체크리스트 (각 phase 끝날 때마다)

- [ ] `pnpm dev` 정상 실행
- [ ] `pnpm build` 정상 빌드
- [ ] 평면도 / 조감도 / 워크스루 3개 뷰 모두 시각적 동일
- [ ] 워크스루: WASD 이동, 마우스 회전, F 도어 토글, R 낮/밤, G 전체 불 동작
- [ ] 도어 클릭 토글 동작
- [ ] (Phase 1+) 벽 통과 불가, 거실 창 통과 가능
- [ ] (Phase 6+) 도어 닫힌 방의 라이트 OFF, 열면 ON

---

## 6. 결정된 사항

| 질문 | 결정 |
|---|---|
| 통과 가능 창문 | **거실 풀창만**. 작업실 베란다 창은 막힘 (시각만 portal). 데이터에 명시적 `passable: true` 플래그. |
| 도어 닫힘 시 portal 동작 | 닫힘 → 양쪽 sector 격리 (라이트도 메시도 culling) |
| 도어 열림 시 | 양쪽 sector 모두 visible |
| 벽은 portal cull 대상? | 아니오. Walls.tsx가 항상 전체 렌더 (geometry merging으로 충분히 빠름) |
| 작업 단위 | Phase 1개 = 1커밋. 한 번에 한 방만 추출. |

---

# === 진행 체크리스트 ===

> 각 phase 끝나면 [x]로 표시. 다음 작업할 때 여기 먼저 확인.

## Phase 0 — Foundation
- [x] `src/data/sectors.ts` 작성 (SectorId, SectorAABB[], DoorId, Portal[])
- [x] `src/systems/visibility.ts` 작성 (findSector, computeVisibleSectors)
- [x] `src/systems/collision.ts` 작성 (blockers 빌드, moveWithCollision)
- [x] `apartment.ts`에 `passable?: boolean` 필드 추가, 거실 창에 true
- [x] 빌드 통과 확인 (`pnpm build`)
- [x] 커밋: "Phase 0: sectors/visibility/collision 데이터 레이어"

## Phase 1 — 벽 충돌 적용
- [x] WalkthroughView에 `doorOpenStatesRef` 추가
- [x] FPSController의 useFrame에 moveWithCollision 통합
- [x] dev flag `COLLISION_ALL_DOORS_OPEN = true` 추가
- [x] 워크스루에서 모든 벽 막힘 + 거실 창 통과 가능 확인
- [x] 커밋: "Phase 1: 벽 충돌 시스템 도입"

## Phase 2 — 도어 분리 + 상태 lift
- [x] `models/FlushDoor.tsx` 생성 (cut from ApartmentModel)
- [x] `models/JungmunDoor.tsx` 생성
- [x] FlushDoor에 doorId/onOpenChange props 추가
- [x] `shell/Doors.tsx` 생성 + 9개 도어 인스턴스 + doorId 매핑
- [x] WalkthroughView에 doorOpenStates state + 콜백 안정화
- [x] doorOpenStatesRef 동기화
- [x] dev flag 제거
- [x] 도어 토글 → 충돌 통과 변경 확인
- [x] 커밋: "Phase 2: 도어 컴포넌트 분리 + 상태 리프트"

## Phase 3 — Shell 분리
- [x] `shell/Walls.tsx` 생성 (cut)
- [x] `shell/Windows.tsx` 생성 (cut)
- [x] `shell/Floors.tsx` 생성 (cut)
- [x] `shell/Ceilings.tsx` 생성 (cut, 단내림 + 코브 LED + 방별 천장 plane 통합)
- [x] `shell/ExteriorBackground.tsx` 생성 (cut)
- [x] ApartmentModel에서 import + 조립
- [x] 시각 동일 확인
- [x] 커밋: "Phase 3: 벽/창/바닥/천장 shell 분리"

## Phase 4 — 방 컴포넌트 추출 (한 번에 하나, 14개 커밋)
- [x] `rooms/Cage.tsx`
- [x] `rooms/OutdoorUnit.tsx`
- [x] `rooms/MainVeranda.tsx`
- [x] `rooms/WorkVeranda.tsx`
- [x] `rooms/Laundry.tsx` (+ models/WashTower, primitives/DropCeilingLight 부수 추출)
- [x] `rooms/MasterBath.tsx`
- [x] `rooms/MainBath.tsx`
- [x] `rooms/BabyRoom.tsx` (+ models/ToddlerBed)
- [x] `rooms/WorkRoom.tsx` (+ models/TrestleDesk)
- [x] `rooms/Entrance.tsx`
- [x] `rooms/Hallway.tsx`
- [x] `rooms/Kitchen.tsx` (+ models/RiceCooker/CuckooWaterPurifier/LightWaveOven)
- [x] `rooms/MasterBedroom.tsx` (+ models/Bed)
- [x] `rooms/LivingRoom.tsx` (+ models/Sofa)

## Phase 5 — 가구/가전 모델 분리
- [ ] `models/Bed.tsx`
- [ ] `models/ToddlerBed.tsx`
- [ ] `models/Sofa.tsx`
- [ ] `models/Toilet.tsx`
- [ ] `models/Sink.tsx`
- [ ] `models/WashTower.tsx`
- [ ] `models/Refrigerator.tsx`
- [ ] `models/KimchiFridge.tsx`
- [ ] `models/RiceCooker.tsx`
- [ ] `models/LightWaveOven.tsx`
- [ ] `models/WaterPurifier.tsx`
- [ ] `models/DiningTable.tsx`
- [ ] `models/TrestleDesk.tsx`
- [ ] `models/ShoeCabinet.tsx`
- [ ] `models/Closet.tsx`
- [ ] 커밋: "Phase 5: 가구/가전 모델 분리"

## Phase 6 — Portal culling 활성화
- [ ] ApartmentModel에 computeVisibleSectors 통합
- [ ] 각 방에 visible prop 전달
- [ ] 검증 시나리오 4개 통과
- [ ] 커밋: "Phase 6: portal culling 활성화"

## Phase 7 — Geometry merging
- [ ] 방별 정적 메시 mergeGeometries 적용
- [ ] FPS 측정 (before/after)
- [ ] 커밋: "Phase 7: 방별 geometry merging"

## Phase 8 — InstancedMesh
- [ ] Downlight InstancedMesh
- [ ] WindowFrame 합치기
- [ ] 손잡이/경첩 instancing
- [ ] FPS 측정
- [ ] 커밋: "Phase 8: 반복 메시 instancing"

## Phase 9 — Cleanup
- [ ] ApartmentModel 최종 슬림화 확인 (~200줄)
- [ ] 데드 코드 제거
- [ ] PROJECT_OVERVIEW.md 갱신
- [ ] 커밋: "Phase 9: cleanup"

---

## 7. 다음 시작 지점

context clear 후 새 세션에서:

1. 이 문서 (`docs/refactor_plan.md`) 먼저 읽기
2. 위 체크리스트에서 첫 번째 미체크 항목 찾기
3. 거기서부터 시작
4. 각 항목 끝나면 이 문서의 체크박스 [ ] → [x]로 업데이트
