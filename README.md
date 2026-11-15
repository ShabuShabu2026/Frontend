# 2026 NASA Space Apps Seoul

Figma의 임무 설정 → 착륙 후보 목록 → 후보 상세 화면을 React와 일반 CSS로 구현한 프로젝트입니다.

## 실행하기

터미널에서 이 프로젝트 폴더로 이동한 다음 실행합니다.

```sh
npm install
npm run dev
```

터미널에 표시된 Local 주소를 브라우저에서 열면 됩니다. `src/App.jsx`나 CSS를 저장하면 개발 화면에 자동으로 반영됩니다. 이미 패키지를 설치했다면 `npm install`은 생략할 수 있습니다.

```sh
npm run build   # 배포할 파일을 dist 폴더에 생성
npm run preview # 빌드 결과를 로컬에서 확인
npm run lint    # 코드 검사
```

## React를 처음 배울 때

React는 화면을 작은 함수인 **컴포넌트**로 나누어 만드는 도구입니다. `App.jsx` 안의 `Configuration`은 설정 화면, `CandidateList`는 후보 목록, `LunarMap`은 지도 컴포넌트입니다. `App`이 이들을 조합합니다.

**JSX**는 JavaScript 안에서 HTML과 비슷하게 화면을 작성하는 문법입니다. 예를 들어 `<h2>Mission Configuration</h2>`는 제목을 표시합니다. JSX에서 CSS 클래스는 `class` 대신 `className`으로 지정합니다.

**props**는 부모가 자식 컴포넌트에 전달하는 값입니다. `<LunarMap view={view} />`는 현재 화면 이름을 지도에 전달합니다. `onSelect`처럼 함수를 전달하면 자식에서 일어난 클릭을 부모가 처리할 수도 있습니다.

**state**는 화면이 기억하는 값입니다.

```jsx
const [view, setView] = useState('configuration')
```

`view`는 현재 값이고, `setView('candidates')`를 호출하면 값이 바뀌면서 React가 후보 화면을 표시합니다. 우선순위와 스위치도 같은 방식으로 동작합니다. `onClick`은 클릭, `onChange`는 입력 변경 시 실행할 함수를 지정합니다.

`sites.map(...)`은 배열의 각 데이터를 후보 버튼으로 바꿉니다. 각 버튼의 `key`는 React가 항목을 구별하는 고유 값입니다.

## 파일 안내

- `src/main.jsx`: React를 HTML의 `root` 요소에 연결하는 시작점
- `src/App.jsx`: 화면 컴포넌트, 입력 상태, 화면 이동, 후보 예시 데이터
- `src/App.css`: 화면 배치와 컴포넌트 스타일. 데스크톱 설정 패널은 Figma와 같은 440px입니다.
- `src/index.css`: 전체 글꼴, 색상 변수, 기본 스타일
- `public/figma/`: Figma에서 다운로드한 원본 이미지와 SVG
- `index.html`: 브라우저가 처음 여는 HTML

## 동작과 현재 범위

1. 날짜, 체류 기간, 임무 종류 등을 입력합니다.
2. 스위치로 제한 조건을 켜거나 끄고, 우선순위 슬라이더로 비율을 조절합니다.
3. `Analyze Landing Sites`를 누르면 Figma 예시 후보 10개를 표시합니다.
4. 후보 또는 지도 마커를 누르면 상세 화면으로 이동합니다.
5. 상단 버튼으로 돌아갑니다. 돌아가도 설정값은 유지됩니다.

모바일에서는 지도 아래에 설정 패널이 배치됩니다. 키보드 Tab으로 입력과 버튼에 접근할 수 있습니다.

실제 달 착륙 적합도 계산, 서버 요청, 데이터 저장, 3D 지도 기능은 포함하지 않았습니다. 설정값에 따라 분석 결과가 달라지지는 않습니다. 서버 연결 시 form 입력을 요청 데이터로 모으고, 예시 `sites` 배열을 API 응답으로 교체해야 합니다. 새로고침하면 설정이 초기화됩니다.

## 검증

`npm run build`, `npm run lint`를 통과했습니다. 원본 이미지와 SVG는 외부 임시 URL 대신 프로젝트 내부 파일로 제공합니다. 자동 브라우저 도구가 없어 실제 브라우저의 시각 비교와 클릭 검증은 수행하지 못했습니다.
