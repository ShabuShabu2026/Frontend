## 최종

| 1 depth | 2 depth | 3 depth | 설명 |
| --- | --- | --- | --- |
| 1. Explore | Mission Configuration | Landing Date | - 착륙일 선택 (Date Picker) - 기본값: 2027-03-05 - 선택 가능 범위: 2027-01-01 ~ 2027-12-31 (착륙일 − 탐색 범위가 시작일 이상, 착륙일 + 체류 기간 + 탐색 범위가 종료일 이하) - 날짜를 바꾸면 같은 입력값으로 분석을 다시 실행 |
|  |  | Stay Duration | - 체류 기간 입력 (Number Input) - 단위: days - 1 이상의 정수 - 기본값: 6일 |
|  |  | Mission Type | - Crewed / Uncrewed 선택 - 기본값: Crewed - 선택값에 따라 적용되는 절대 조건과 평탄도·거칠기 중요도 시작값 변경 (Crewed 5 / 5, Uncrewed 3 / 3) |
|  |  | Mission Objective | - 미션 목적 선택 (Dropdown) - 기본값: General - 선택지 8개: General + NASA 목표 7개 (전체 목록은 아래 추가 확정 참고) - 기타 점수가 있는 목적 3개, 없는 목적 5개 (General 포함) - 기타 점수가 없는 목적을 고르면 Other를 제외하고 나머지 4개 가중치를 다시 정규화 |
|  |  | Power Requirement | - Low / Normal / High 선택 - 기본값: Normal - 일조 중요도 시작값: 1 / 3 / 5 - 필요 일조율 기본값: 30% / 50% / 80% |
|  |  | Communication Dependency | - Independent / Normal / Critical 선택 - 기본값: Normal - 통신 중요도 시작값: 1 / 3 / 5 |
|  | Mission Priorities | Auto Weight Summary | - Communication / Flatness / Roughness / Sunlight / Other 가중치 표시 - 미션 입력에 따라 중요도 1~5 자동 설정 - 시작값: Communication ← Communication Dependency, Flatness·Roughness ← Mission Type, Sunlight ← Power Requirement, Other 3 - 기본 입력(Crewed / Normal / Normal)의 중요도: 3 / 5 / 5 / 3 / (Other 3) - 합계 100%로 정규화 (Other가 제외되면 4개로 정규화) - 입력(Mission Type, Power Requirement, Communication Dependency, Mission Objective)이나 슬라이더를 바꿀 때마다 자동 가중치 조회 API로 중요도와 정규화 가중치를 받아 표시 (분석 실행 전에도 값이 정해져 있음), 분석 실행 후에는 응답의 가중치가 최종값 - 직접 수정은 Advanced Settings에서 가능 |
|  | Advanced Settings | Expand / Collapse | - 고급 설정 펼치기/접기 - 기본 상태: 접힘 - 기본값에서 변경된 항목 수 표시 |
|  |  | Absolute Slope Constraint | - 경사 절대 조건 ON/OFF - 기본값: ON, 5° - 허용 상한: 0~15° - ON이면 상한 초과 후보지 제외 - OFF이면 15°까지만 분석 대상으로 표시하며 평탄도 점수 상한도 15° 사용 - 5° 기준 완화 시 경고 표시 |
|  |  | Crewed Sunlight Constraint | - 유인 연속 일조 절대 조건 ON/OFF - 기본값: ON - 유인 임무에서 체류 내내 일조 필요 - 1시간 단위 분석에서 태양 원반 가시 비율 0.5 미만인 시간이 있으면 제외 (0.5는 고정, Sun Visibility Criterion과 무관) - 무인 임무에서는 적용하지 않음 - 조건 완화 시 경고 표시 |
|  |  | Uncrewed Absolute Constraints | - 무인 절대 조건 ON/OFF - 기본값: OFF - ON 시 Battery Endurance, Maximum Communication Blackout 입력 - 유인 임무에서는 적용하지 않음 |
|  |  | Battery Endurance | - 배터리 버팀 시간 입력 (Number Input) - 단위: hours - 무인 절대 조건 활성화 시 필수 - 최장 연속 암흑 시간과 비교 |
|  |  | Maximum Communication Blackout | - 최대 허용 통신 두절 시간 입력 (Number Input) - 단위: hours - 무인 절대 조건 활성화 시 필수 - 최장 연속 통신 두절 시간과 비교 |
|  |  | Importance Weights | - Communication / Flatness / Roughness / Sunlight / Other 중요도 조정 - Slider 5개, 각각 정수 1~5 - 미션 입력에 따라 시작 위치 자동 설정 - 사용자 직접 조정 가능 - 변경 시 가중치 재정규화 - Other 슬라이더는 기타 점수가 있는 목적에서만 표시 |
|  |  | Required Sunlight Ratio | - 필요 일조율 직접 입력 (Number Input) - 단위: % (0~100) - 전력 필요도 단계별 기본값 적용: Low 30 / Normal 50 / High 80 |
|  |  | Sun Visibility Criterion | - Partial / Half Disk / Full 선택 - 기본값: Half Disk - Partial: 태양 원반이 조금이라도 보이면 가시 - Half Disk: 원반 가시 비율 0.5 이상 - Full: 원반 전체가 보일 때 - 일조율, 최장 연속 암흑 시간 계산에 사용 |
|  |  | Earth Visibility Criterion | - Upper Edge / Center + Δ / Full 선택 - 기본값: Center + Δ - Upper Edge: 지구 위쪽 끝이 지형 차폐선 위 - Center + Δ: 지구 중심이 지형 차폐선 + Δ 위 - Full: 지구 아래쪽 끝까지 지형 차폐선 위 |
|  |  | Panel / Antenna Height | - 1 / 5 / 10 m 선택 - 기본값: 1m - 선택한 높이에 따른 지형 차폐 분석 결과 적용 |
|  |  | Landing Date Search Range | - 착륙일 탐색 범위 설정 (Slider) - 범위: 0~30일 - 기본값: ±7일 - 범위 안의 날짜별 적합도를 비교해 지점마다 가장 좋은 착륙일(Best Landing Date) 제공 - 지도와 후보지의 적합도는 입력한 착륙일 기준 - 0이면 입력한 착륙일만 분석 |
|  | Landing Site Analysis | Analyze Landing Sites | - 위의 모든 입력값을 한 번의 요청으로 전송해 후보지 분석 실행 - 백엔드에서 절대 조건 판정 및 5개 점수 계산 - 조건을 충족한 지점만 최종 적합도 산출 - 응답: 적용된 중요도·가중치, 지도용 전체 지점, 후보지 10개, 경고 문구 |
|  | Lunar South Pole Map | Site Suitability Map | - 달 남극 지도에 지점별 적합도 표시 - 분석 격자: 남위 85° 이남, 1 km 간격 (약 71,000개 지점) - 최종 점수 범위: 0~100 - 적합도에 따라 색상 표시 - 절대 조건 미충족 지점은 회색 표시 및 제외 이유 제공 - 지도를 확대하면 보이는 영역을 더 촘촘한 격자로 다시 계산해 표시 (최소 간격 200 m) |
|  |  | Landing Date Change | - 착륙 날짜를 변경하면 해당 날짜의 일조·지구 가시성 및 적합도 갱신 - 유인 연속 일조 조건에 따른 제외 여부도 변경 - 같은 입력값에 착륙일만 바꿔 분석을 다시 실행 |
|  |  | Site Selection | - 지도에서 후보지 선택 - 선택한 후보지의 좌표를 기준으로 상세 지형 및 분석 결과 표시 |
|  |  | Viewport Recommendation | - 지도를 확대·축소·이동해도 보이는 영역 안에서 후보지를 항상 10개 추천 - 적합도가 높은 순으로 고르되 서로 일정 거리 이상 떨어진 지점만 선택 - 영역이 넓으면 넓게 흩어진 지점, 좁으면 그 영역 안의 가까운 지점 - 절대 조건을 통과한 지점이 10개보다 적으면 있는 만큼만 표시 - 같은 지점의 적합도는 확대·축소와 관계없이 동일 |
|  | Candidate Sites | Candidate List | - 순위, 후보지 ID(LSP-숫자 형식), 위도·경도 표시 - 적합도 점수 표시 - 상태 표시: Feasible(절대 조건 통과) / Marginal(통과했지만 한계에 가까움) - 강점 태그 2개 표시 (예: High sunlight, Low roughness) - 절대 조건 통과 여부 및 제외 이유 표시 - 후보지 선택 시 상세 분석 연결 |
|  | Selected Site Details | Overview | - 선택한 후보지의 ID, 위도·경도 표시 - 최종 적합도 및 5개 세부 점수 표시 - 적용된 중요도와 가중치 표시 - 절대 조건 통과 여부 및 제외 이유 표시 - 경사, 거칠기, 일조율, 지구 가시율, 최장 연속 암흑 시간, 최장 연속 통신 두절 시간, Best Landing Date 표시 |
|  |  | 3D Terrain | - 선택한 후보지 좌표 주변의 지형을 입체적으로 표시 - 백엔드에서 해당 지점 주변 DEM 고도 데이터 제공 (80 m 간격, 기본 반경 2 km, 최대 5 km) |
|  |  | Sun & Earth | - 체류 기간의 태양·지구 가시성 분석 결과 표시 - 일조율, 지구 가시율 표시 - 최장 연속 암흑 시간, 최장 연속 통신 두절 시간 표시 - 시간별 가시성 및 태양·지구 방위각·고도각 확인 - 탐색 범위 안의 다른 착륙일 결과도 조회 가능 |

## 계산 기준

| 기준 | 계산 방식 | 비고 |
| --- | --- | --- |
| 분석 격자 | 남위 85° 이남, 1 km 간격 격자 | 약 71,000개 지점. 지점마다 ID(LSP-숫자) 부여 |
| 지형 차폐선 | 지점마다 방위각 720개(0.5° 간격)에서 θ(A) = max[ arctan( (Δh − d² / 2R) / d ) ], R = 1737.4 km | 최대 탐색 거리 100 km. Δh는 지형 고도 − (지점 고도 + 패널·안테나 높이). 높이 1 / 5 / 10 m별로 계산 |
| 태양·지구 위치 | 2027-01-01 ~ 2027-12-31, 1시간 간격. JPL Horizons 결과로 달 고정 좌표계(MOON_ME)의 태양·지구 위치를 미리 계산 | 지점별 방위각·고도각은 지점 위치와 두 천체의 거리 차이(시차)를 반영해 계산 |
| 태양 원반 가시 비율 | f = 1 − (arccos x − x√(1−x²)) / π, x = clip((태양 고도 − 지형 차폐선) / 태양 각반지름, −1, 1) | x = −1 → 0, x = 0 → 0.5, x = 1 → 1 |
| 태양 가시 판정 | Sun Visibility Criterion: Partial f > 0, Half Disk f ≥ 0.5, Full f = 1 | 일조율 = 가시 시간 / 체류 시간. 최장 연속 암흑 = 가시가 아닌 시간이 연속된 최장 길이 |
| 지구 가시 판정 | Earth Visibility Criterion: Upper Edge 고도 + 지구 각반지름 > 차폐선, Center + Δ 고도 > 차폐선 + Δ, Full 고도 − 지구 각반지름 > 차폐선 | 지구 가시율 = 가시 시간 / 체류 시간. 최장 연속 통신 두절 = 가시가 아닌 시간이 연속된 최장 길이 |
| 절대 조건: 경사 | 경사 > 허용 상한이면 제외 | 기본 상한 5°, 유·무인 공통. OFF이면 15°까지만 분석 |
| 절대 조건: 유인 일조 | 체류 중 한 시각이라도 태양 원반 가시 비율 0.5 미만이면 제외 | 기본 ON, 1시간 간격, 유인 임무만 |
| 절대 조건: 무인 | 기본적으로 암흑·통신 두절에 따른 제외 없음 | 고급 설정에서 활성화 가능. 최장 연속 암흑 > Battery Endurance 또는 최장 연속 통신 두절 > Maximum Communication Blackout이면 제외 |
| Communication Score | 0.5 × 지구 가시율 + 0.5 × (1 − 최장 통신 두절 시간 / 체류 기간) | 0~1 |
| Flatness Score | 1 − 경사 / 경사 상한 | 0~1, 기본 상한 5°. 상한 0° 입력 시 처리는 미확정 |
| Roughness Score | 1 − (전체 격자 지점 중 거칠기 백분위) | 0~1, 100m 거칠기 데이터. 후보 지점이 아니라 전체 격자의 분포를 고정 기준으로 사용해 필터·확대와 관계없이 같은 지점은 같은 점수 |
| Sunlight Score | 0.5 × min(1, 일조율 / 필요 일조율) + 0.5 × (1 − 최장 암흑 시간 / 체류 기간) | 0~1 |
| Other Score | 미션 목적에 따른 별도 계산 (아래 추가 확정 표) | 점수가 있는 목적 3개. 기준값은 전체 격자 분포의 95번째 백분위로 고정 |
| Weight Normalization | 각 중요도 / 중요도 전체 합 | 가중치 합계 1. 기타 점수가 없는 목적은 Other를 제외하고 나머지 4개로 정규화 |
| Suitability Score | 100 × Σ(정규화 가중치 × 세부 점수) | 0~100점 |
| Excluded Site | 절대 조건 미충족 시 점수 계산 없이 제외 | 회색 표시 + 사유 |
| Best Landing Date | 탐색 범위 안의 날짜 중 지점의 적합도가 가장 높은 날 | 절대 조건을 통과한 날짜만 비교. 범위 0이면 없음 |
| 후보지 선택 | 적합도 높은 순으로 고르고, 고른 지점에서 일정 거리 안의 지점은 제외하는 과정을 N개가 찰 때까지 반복 | N 기본 10. 최소 거리 = 0.5 × √(영역 면적 / N). 개수가 안 차면 최소 거리를 절반으로 줄여 다시 선택 |
| 확대 영역 격자 | 격자 간격 = max(200 m, √(영역 면적 / 5000)) | 간격이 1 km 이상이면 기본 격자 사용. 미만이면 영역 안을 더 촘촘한 격자로 새로 계산하고, 새 지점도 ID를 받아 상세 조회에 사용 |
| 후보지 상태 | Feasible: 모든 절대 조건 통과. Marginal: 통과했지만 경사 상한, 배터리 버팀 시간, 통신 두절 허용 시간 중 하나가 한계의 90% 이상 | 90%는 임시값 |
| 후보지 태그 | 5개 점수 중 높은 2개를 표시 문구로 변환 | High sunlight, Low roughness, Flat terrain, Good Earth visibility, Objective match |

## 반환 데이터

| 기능 | 반환값 | 데이터 타입 |
| --- | --- | --- |
| 분석 결과 | 분석 결과 ID | `string` |
|  | 경고 문구 | `string[]` |
|  | 지점 수 (전체 / 통과 / 제외 / 제외 이유별) | `number`, `number`, `number`, `object` |
| 후보지 목록 | 후보지 목록 (기본 10개) | `array<object>` |
|  | 순위 | `number` |
|  | 후보지 ID (LSP-숫자) | `string` |
|  | 위도, 경도 | `number`, `number` |
|  | 지도 좌표 x, y (m) | `number`, `number` |
|  | 상태 (Feasible / Marginal) | `string` |
|  | 강점 태그 2개 | `string[]` |
|  | Best Landing Date | `string |
| 지도 표시 | 전체 지점 ID, 위도, 경도 | `string[]`, `number[]`, `number[]` |
| 적합도 표시 | 최종 적합도 (0~100) | `number |
|  | 절대 조건 통과 여부 | `boolean` |
|  | 제외 이유 | `string[]` |
| 세부 점수 | Communication Score | `number` (0~1) |
|  | Flatness Score | `number` (0~1) |
|  | Roughness Score | `number` (0~1) |
|  | Sunlight Score | `number` (0~1) |
|  | Other Score | `number |
| 가중치 | 중요도 5개 (Communication, Flatness, Roughness, Sunlight, Other 순) | `integer[5]` (Other 제외 시 해당 값 null) |
|  | 정규화 가중치 5개 | `number[5]` (Other 제외 시 해당 값 null) |
|  | Other 포함 여부 | `boolean` |
| 지형 분석 | 경사 | `number` (°) |
|  | 거칠기 | `number` (m) |
| 가시성 분석 | 일조율 | `number` (0~1) |
|  | 지구 가시율 | `number` (0~1) |
|  | 최장 연속 암흑 시간 | `number` (hours) |
|  | 최장 연속 통신 두절 시간 | `number` (hours) |
| 시간별 분석 | 시각 | `string` (ISO 8601 UTC) |
|  | 태양 방위각, 고도각 | `number`, `number` |
|  | 지구 방위각, 고도각 | `number`, `number` |
|  | 태양 원반 가시 비율 | `number` (0~1) |
|  | 태양·지구 가시 여부 | `boolean`, `boolean` |
|  | 시간별 분석 데이터 | `array<object>` |
| 영역 추천 | 지도 영역(bbox) 안의 후보지 목록 | `array<object>` |
|  | 실제 반환 개수, 격자 간격, 후보지 사이 최소 거리 | `number`, `number`, `number` |
| 영역 점수 | 지도 영역(bbox) 안의 지점 ID, 좌표, 적합도, 통과 여부, 제외 이유 | `string[]`, `number[]`, `number[]`, `(number |
| 3D 지형 | 후보지 중심 좌표 | `number`, `number` |
|  | 주변 DEM 고도 격자 | `number[][]` |
|  | 격자 간격 및 좌표계 정보 | `number`, `string` |
| 자동 가중치 | 입력(임무 유형, 전력 필요도, 통신 의존도, 목적)에 따른 중요도 5개, 정규화 가중치 5개, Other 포함 여부 | `integer[5]`, `number[5]`, `boolean` |
| 설정 | 입력 기본값, 목적 목록, 전력 단계별 필요 일조율, 중요도 시작값, 입력 허용 범위 | `object` |

## 미확정 사항

- Earth Visibility의 Center + Δ에서 Δ의 값 (임시 0.25°. PGDA 78 5 m DEM과 80 m DEM의 차폐선 차이의 95번째 백분위로 검증)
- 지형 차폐선 최대 탐색 거리 (임시 100 km. 50 km와 비교해 차이 확인)
- 경사 상한 0° 입력 시 평탄도 점수 계산 처리 (임시: 통과한 지점은 1)
- Impact history 목적의 기타 점수 정의 (카탈로그에 나이 정보가 없어 지질 다양성과 큰 충돌구 근접도를 반반 합산하는 임시 정의)
- 지질 다양성 점수의 반경 N km (임시 20 km), 큰 충돌구 기준 지름 (임시 20 km)
- 후보지 상태의 한계 비율 90%, 후보지 최소 거리 계수 0.5, 확대 영역 최소 격자 간격 200 m, 최대 지점 수 5,000, 후보지 개수 최대 50
- 후보지 태그 문구 목록
- 필요 일조율 30 / 50 / 80%의 근거 (임시값. 항공우주 팀원 검토 필요)
- 기타 점수가 없는 5개 목적의 "점수 없음" 판단 (항공우주 팀원 검토 필요)
- 화면 라벨 정리: Sun Visibility Criterion(기획) / Darkness Criterion(화면 시안), Importance Weights(기획) / Priority Bars(화면 시안)

---

### 추가 확정

- [x]  전력 입력 방식 → **"낮음 / 보통 / 높음" → 필요 일조율 단계**
    
    
    | 전력 필요도 | 필요 일조율 |
    | --- | --- |
    | 낮음 | 30% |
    | 보통 | 50% |
    | 높음 | 80% |
- [x]  기타 점수 내용 → 목적별로 뭘 볼지 (예: 물 얼음 = 영구음영지역 거리)
    - NASA 공식 목적 목록 (General은 NASA 목표가 아닌 기본 선택지, 기타 점수 없음)
        
        
        | NASA 목표 | 점수 유형 | 계산 | 데이터 |
        | --- | --- | --- | --- |
        | 달 극지 휘발성 물질의 특성과 기원 이해 (Understanding the character and origin of lunar polar volatiles) | PSR 거리형 | 1 − (가장 가까운 PSR까지 거리 ÷ 기준 거리), 0 미만이면 0. 기준 거리 = 전체 격자 지점의 PSR 거리 95번째 백분위 | PGDA 90 PSR |
        | 행성 과정 이해 (Understanding planetary processes) | 지질 다양성형 | 반경 N km 안의 지질 단위 수를 전체 격자의 95번째 백분위로 나눔 (1 초과는 1) | geologic map |
        | 지구-달 계의 충돌 역사 해석 (Interpreting the impact history of the Earth-Moon system) | 지질 다양성형 | 0.5 × 지질 다양성 점수 + 0.5 × 큰 충돌구 근접도 | geologic map, crater catalog |
        | 고대 태양과 우리 천문 환경의 기록 규명 (Revealing the record of the ancient sun and our astronomical environment) | 없음 | Other 제외 | 없음 |
        | 독특한 위치에서 우주와 국지 우주 환경 관측 (Observing the universe and the local space environment from a unique location) | 없음 | Other 제외 | 없음 |
        | 달 환경에서 실험 과학 수행 (Conducting experimental science in the lunar environment) | 없음 | Other 제외 | 없음 |
        | 탐사 위험 조사·완화 (Investigating and mitigating exploration risks) | 없음 | Other 제외 | 없음 |
- [x]  막대 범위 1~5 확정, 입력별 시작 위치 값
    
    
    | 입력 | 값 | 시작 중요도 |
    | --- | --- | --- |
    | Communication Dependency | Independent / Normal / Critical | Communication 1 / 3 / 5 |
    | Mission Type | Crewed / Uncrewed | Flatness, Roughness 5 / 3 |
    | Power Requirement | Low / Normal / High | Sunlight 1 / 3 / 5 |
    | Mission Objective | 기타 점수가 있는 목적 | Other 3 |
- [x]  체류 기간 기본값 7일 → **6일로 변경**
- [x]  후보지 개수는 고정하지 않음 → 지도에 보이는 영역마다 10개 추천, 절대 조건을 통과한 지점이 부족하면 있는 만큼
- [x]  착륙일 변경 → 같은 입력값에 착륙일만 바꿔 분석을 다시 실행