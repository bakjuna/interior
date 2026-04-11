# Interior 3D - 아파트 인테리어 시뮬레이터

실제 아파트 도면 기반의 인터랙티브 3D 인테리어 시뮬레이터. React Three Fiber로 구현된 1인칭 워크스루와 조감도 평면도 뷰를 제공합니다.

## 기술 스택

- **React 19** + **TypeScript 5.9**
- **Three.js 0.183** + **@react-three/fiber 9** + **@react-three/drei 10**
- **Vite 8** (빌드 / 개발서버)
- **KTX2** 텍스처 압축 (GPU 바로 디코딩)

## 실행

```bash
pnpm install
pnpm dev        # 개발서버 (http://localhost:5173)
pnpm build      # 프로덕션 빌드
pnpm preview    # 빌드 결과 미리보기
```

Node.js 22 이상 필요.

## 뷰 모드

### 평면도 (BirdsEyeView)
- 조감도 시점에서 전체 아파트 구조 확인
- 방 이름, 가구 위치 라벨 표시
- 클릭하여 워크스루 모드 진입

### 워크스루 (WalkthroughView)
- 1인칭 시점으로 실내 탐색
- `frameloop="demand"` 모드 (필요 시에만 렌더링)
- 거리 기반 Reflector 거울 (T 키로 토글)
- 낮/밤 조명 전환

#### 조작키 (한/영 모두 지원)

| 키 | 기능 |
|---|---|
| W/A/S/D | 이동 |
| Q/E (홀드) | 시점 낮게/높게 |
| R | 낮/밤 전환 |
| G | 전체 조명 켜기 (밤에만) |
| F | 문/서랍 상호작용 (근처에서) |
| T | 거울 반사 ON/OFF (기본 OFF) |

#### 모바일
- 좌하단 가상 조이스틱 (4방향 이동)
- 우하단 액션 버튼 (낮/밤, 조명, 상호작용, 거울)
- 터치 드래그로 시점 회전

## 프로젝트 구조

```
src/
  data/
    apartment.ts        # 아파트 전체 데이터 (벽, 방, 창문, 도어, 붙박이장, 다운라이트)
    sectors.ts          # 섹터 정의 (방 경계, 포탈, doorId 타입)
  systems/
    collision.ts        # 벽/가구 충돌 감지 (segment + AABB)
    doorRegistry.ts     # 도어 인터랙션 레지스트리 (F키 토글, 상호 배제)
    mirrorToggle.ts     # 거울 Reflector 전역 토글 (useSyncExternalStore)
    visibility.ts       # 섹터 기반 가시성 판정
    useKTX2.ts          # KTX2 텍스처 로딩 훅
    shaderPatch.ts      # 셰이더 패치 유틸
  components/
    ApartmentModel.tsx  # 전체 아파트 렌더 (다운라이트 인스턴스, 조명, 배경)
    WalkthroughView.tsx # 워크스루 모드 (Canvas, FPS 컨트롤러, 모바일 UI)
    FloorPlanView.tsx   # 평면도 모드 (2D 조감도)
    BirdsEyeView.tsx    # 조감도 3D 뷰
    shell/              # 건축 구조물 (일괄 렌더)
      Walls.tsx         # 벽체 (실크벽지 / 욕실타일 / 스터코 분리 렌더)
      Floors.tsx        # 바닥 (마루 / 포슬린 / 현관 / 욕실 타일)
      Ceilings.tsx      # 천장 (단내림 + 코브 LED + 스터코 천장)
      Windows.tsx       # 창문 (2분할 슬라이딩, 2중창 지원)
      Doors.tsx         # 도어 (FlushDoor/JungmunDoor 일괄 생성)
      Closets.tsx       # 붙박이장 (안방/거실/아기방, 스윙/슬라이딩/분할 도어)
      ExteriorBackground.tsx  # 외부 도시 배경 (낮/밤)
    rooms/              # 방별 가구/조명
      Kitchen.tsx       # 주방 (하단장, 상부장, 냉장고장, 키큰장, 팬트리, 식탁)
      MasterBedroom.tsx # 안방 (화장대 3단 서랍장, 거울 수납장, 침대)
      LivingRoom.tsx    # 거실 (소파)
      WorkRoom.tsx      # 작업실 (트레슬 책상 2개, cubby 책장)
      BabyRoom.tsx      # 아기방 (유아침대)
      MainBath.tsx      # 메인욕실 (슬라이딩 거울장, 세면대, 변기, 샤워부스)
      MasterBath.tsx    # 안방욕실 (슬라이딩 거울장, 세면대, 변기)
      Entrance.tsx      # 현관 (신발장)
      Hallway.tsx       # 복도
      Laundry.tsx       # 세탁실 (세탁타워)
      WorkVeranda.tsx   # 작업실 베란다
      MainVeranda.tsx   # 메인 베란다
      Cage.tsx          # 새장
      OutdoorUnit.tsx   # 실외기실
    models/             # 개별 가구/기물 모델
      Refrigerator.tsx  # 4도어 냉장고
      KimchiFridge.tsx  # 김치냉장고
      TrestleDesk.tsx   # 트레슬 책상 (사선 다리, 테이퍼 발판)
      ShoeCabinet.tsx   # 신발장 (거울 도어)
      FlushDoor.tsx     # 플러시 도어 (스윙)
      JungmunDoor.tsx   # 중문 (유리/거울, 라운드 프레임)
      Bed.tsx, Sofa.tsx, DiningTable.tsx, Toilet.tsx, Sink.tsx ...
    ui/
      DoorTooltip.tsx   # F키 인터랙션 툴팁 (뷰포트 클램핑, doorId별 라벨)
```

## 아키텍처

### 데이터 중심 설계
- `apartment.ts`에 모든 벽/방/창문/도어/붙박이장/다운라이트 데이터가 집중
- 벽 데이터에 `isBalcony`, `isBathroom`, `tile` 플래그로 재질 분기
- 2장 분리 벽 (내측 실크 + 외측 스터코) 으로 양면 재질 처리

### 렌더링 최적화
- **Instanced Mesh**: 다운라이트 발광면 + 크롬링 일괄 렌더
- **Merged Geometry**: 벽/바닥/천장을 재질별로 병합 → 최소 draw call
- **frameloop="demand"**: 카메라/상태 변경 시에만 렌더
- **KTX2 텍스처**: GPU 네이티브 디코딩, 메모리 절약
- **섹터 기반 가시성**: 현재 방 + 포탈 연결 방만 렌더
- **Reflector 거리 제한**: 1~3m 이내에서만 활성, 그 외 메탈릭 폴백

### 인터랙션 시스템
- **doorRegistry**: 모든 도어/서랍/수납장이 자기 자신을 등록
- **pickActiveDoor**: 카메라 방향 + 거리 기반으로 최적 도어 1개 선택
- **상호 배제**: 슬라이딩 도어 쌍 (욕실 거울장, 아기방 붙박이) 자동 닫힘
- **doorAllowedSectors**: 섹터 기반 인터랙션 필터링

### 충돌 시스템
- 벽 segment + 가구 AABB → 원형 플레이어 충돌 판정
- 축 분리 슬라이드 (X/Z 독립 시도)
- 열린 도어 통과 영역 (벽 충돌 무시)

### 벽 재질 시스템
- **실크벽지**: 기본 내벽
- **욕실타일**: `tile: 'bathWall'` 벽
- **스터코/탄성코트**: `isBalcony: true` 벽 (베란다 외벽, 세탁실 내벽)
- 스터코 셰이더 패치: 해시 기반 타일 브레이킹으로 반복 패턴 저감

### 조명
- **다운라이트**: 방별 자동 배치 (generateDownlights), 섹터/allLightsOn 연동
- **코브 LED**: 단내림 천장 하단, 방 활성 시 점등
- **간접조명**: RectAreaLight (화장대 거울 하단, 거실 수납장 등)
- **개별 다운라이트**: SpotLight + 피팅 mesh (화장대 상부)

## 텍스처

모든 텍스처는 KTX2 포맷 (Basis Universal 압축). 원본 PNG/JPG 보관.

| 텍스처 | 용도 |
|---|---|
| walnut-floor.ktx2 | 마루 바닥 |
| walnut-closet-door.ktx2 | 붙박이장/주방 도어 |
| walnut_door.ktx2 | 실내 문 |
| silk.ktx2 | 실크 벽지 |
| stucco-wall.ktx2 | 베란다/세탁실 탄성코트 |
| porcelain-tile.ktx2 | 베란다/세탁실 바닥 |
| bathroom-wall-tile.ktx2 | 욕실 벽/바닥 타일 |
| entrance-tile.ktx2 | 현관 바닥 |
| kitchen-tile.ktx2 | 주방 백스플래시 |
| marble-table.ktx2 | 식탁 상판 |
| city-view-*.ktx2 | 외부 배경 (남/북, 낮/밤) |

## 방 구성

| 방 | 주요 요소 |
|---|---|
| 안방 | 붙박이장(5문), 화장대(3단 서랍+거울 수납장), 다운라이트, 침대 |
| 거실 | 수납장(키큰장+2단분할+오픈선반+LED), 소파 |
| 주방 | 냉장고장, 키큰장(풀아웃 팬트리), 인덕션, 식기세척기, 싱크, 식탁 |
| 작업실 | 트레슬 책상 2개(큰/작은), cubby 책장 |
| 아기방 | 슬라이딩 붙박이장(4문, 상호배제), 유아침대 |
| 메인욕실 | 슬라이딩 거울장(상호배제), 세면대, 변기, 샤워부스 |
| 안방욕실 | 슬라이딩 거울장(상호배제), 세면대, 변기 |
| 현관 | 신발장(거울도어+일반도어), 중문(거울) |
| 세탁실 | 세탁타워, 탄성코트 벽/천장 |
| 베란다 | 2중창(작업실), 스터코 벽/천장, 도시 배경 |
