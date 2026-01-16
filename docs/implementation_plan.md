# Implementation Plan - Agent MCP Project

## Phase 1: MCP Server Implementation [Completed]
### Goal
- 기본 MCP Server 구축
- `add`, `subtract` Tool 구현

### Implemented Changes
- `src/server.py`: FastMCP 기반 서버 구현
- `docs/rules.md`, `docs/tasks.md`: 프로젝트 규칙 및 작업 관리 문서

---

## Phase 2: Web Interface (Basic) [Completed]
### Goal
- MCP Server의 Tool을 웹 브라우저에서 테스트할 수 있는 인터페이스 구축
- HTTP + SSE (Server-Sent Events) 방식 적용

### Implemented Changes
- `src/sse_server.py`: FastAPI를 이용한 SSE 및 JSON-RPC 엔드포인트 구현
- `src/web/index.html`: 기본 테스트 UI (HTML/CSS)
- `src/web/client.js`: SSE 연결 및 Tool 호출 로직

---

## Phase 3: Web Interface Refactor [Completed]
### Goal
- 웹 인터페이스를 현대적인 대시보드 형태로 전면 개편
- Tailwind CSS, ECharts 도입 및 레이아웃 개선

### Implemented Changes
- `src/web/index.html`: Tailwind CSS 적용, 대시보드/테스터 뷰 분리, Result 영역 추가
- `src/web/client.js`: ECharts 차트 연동, 상태 관리 로직, 한국어 주석 추가
- `src/web/favicon.svg`: 파비콘 추가

---

## Phase 4: 26-01-14 Todo Execution [Completed]
### Goal
`docs/todo.md`에 정의된 4가지 요구사항을 순차적으로 구현하여 웹 인터페이스와 서버 기능을 고도화합니다.

### Implemented Changes
#### 1. Dashboard Chart Update
- `usageStats` 구조 변경 및 Stacked Bar Chart 적용

#### 2. Server-side Logging
- `logs/yyyy-mm-dd.txt` 포맷으로 일별 로그 파일 누적 생성
- `logging` 핸들러 설정을 통해 Uvicorn 간섭 방지

#### 3. Dynamic Tool Tester
- `hellouser` Tool 추가
- `tools/list` 기반 동적 입력 폼 생성 및 JSON 결과 뷰어 구현

#### 4. Log Viewer Menu
- `GET /logs` 및 `GET /logs/{filename}` API 구현
- 웹 UI에서 로그 파일 목록 및 내용 조회 기능 구현

---

## Phase 5: React + TypeScript Migration [Completed]

### Goal
기존 HTML/JS 기반의 프론트엔드를 **React + TypeScript** 환경으로 이관하여 유지보수성, 타입 안정성, 확장성을 확보합니다.

### Implemented Changes

#### 1. Project Initialization
- **Directory**: `src/frontend`
- **Stack**: Vite, React, TypeScript, TailwindCSS v4
- **Dependencies**: `echarts-for-react`, `lucide-react`, `clsx`

#### 2. Architecture & State Management
- **Hooks**:
    - `useMcp`: **[Refactored]** SSE 연결, endpoint 관리, JSON-RPC 메시지 전송, 상태 관리를 모두 통합하여 단일 SSE 연결을 보장하도록 구현.
- **Components**:
    - `App.tsx`: 메인 레이아웃 및 View 상태 관리
    - `Dashboard.tsx`: ECharts 통계 및 실시간 로그 뷰어
    - `Tester.tsx`: 도구 목록 조회, 동적 Form 생성, 실행 결과 뷰 (ID 타입 호환성 개선)
    - `LogViewer.tsx`: 로그 파일 목록 및 컨텐츠 조회

#### 3. Python Server Update
- **[MODIFY] `src/sse_server.py`**
    - CORS 설정 추가 (`localhost:5173`)
    - `src/frontend/dist` 정적 파일 서빙 우선순위 설정

### Debugging Report & Fixes
마이그레이션 후 발생한 주요 이슈와 해결 방법을 기록합니다.

#### 1. SSE Connection Deadlock & Split Brain
- **증상**: 로그가 뜨지 않거나, 초기화(`init_req`) 후 도구 목록(`list_tools`) 요청이 전송되지 않음.
- **원인**: `useSSE`와 `useMcp`가 각각 `EventSource`를 생성하여 두 개의 세션이 열림. 서버는 A 세션에 endpoint를 보냈으나, 클라이언트는 B 세션으로 RPC를 시도하여 실패.
- **해결**: 모든 SSE 연결 및 메시지 처리 로직을 `useMcp.ts`로 통합하여 단일 연결 보장.

#### 2. 'No postEndpoint' Error (Stale Closure)
- **증상**: 연결은 되었으나 RPC 전송 시 "No postEndpoint" 에러 발생.
- **원인**: `useEffect` 내의 `sendRpc` 클로저가 초기 `postEndpoint` (null) 값을 캡처하고 있어, 실제 값이 업데이트되어도 이를 인지하지 못함.
- **해결**: `useRef`를 사용하여 `postEndpoint`의 최신 값을 항상 참조하도록 수정.

#### 3. Tool Execution ID Mismatch
- **증상**: 도구 실행 요청은 성공했으나 결과 화면에 반영되지 않음.
- **원인**: `Tester.tsx`는 도구 이름(String)을 ID로 사용했으나, `useMcp.ts`는 응답 처리 시 숫자(Number) ID만 허용함.
- **해결**: `useMcp.ts`의 ID 타입 체크 조건을 문자열도 허용하도록 완화 (`typeof data.id === 'string'`).

### Verification Results
1. **Build**: `npm run build` 성공 (Chunk size warning 존재하나 동작 무관)
2. **Integration**: Python 서버 구동 후 Dashboard, Tester, LogViewer 정상 로딩 확인.
3. **Features**:
    - **Dashboard**: 실시간 로그 및 차트 업데이트 확인.
    - **Tester**: 도구 목록 정상 로딩 (`list_tools`), `add`/`hellouser` 정상 실행 및 JSON 결과 표시 확인.
    - **LogViewer**: 로그 파일 목록 및 내용 조회 정상 확인.

---

## Phase 6: Database & Authentication [Current]

### Goal
Python 내장 `sqlite3`를 사용하여 별도 설치 없이 동작하는 인메모리(또는 파일 기반) DB를 구축하고, 사용자 인증(로그인) 및 이력 관리 기능을 구현합니다.

### 1. Database Schema Design
SQLite (`:memory:` 모드 또는 파일) 사용.
서버 시작 시 테이블이 없으면 자동 생성합니다.

#### Table: `h_user` (사용자 정보)
| Column | Type | Constraints | Description |
|---|---|---|---|
| uid | INTEGER | PK, Auto Increment | 고유 ID |
| user_id | TEXT | UNIQUE, NOT NULL | 로그인 ID |
| password | TEXT | NOT NULL | 암호화된 비밀번호 (또는 해시) |
| user_nm | TEXT | NOT NULL | 사용자 이름 |
| role | TEXT | DEFAULT 'ROLE_USER' | 권한 (ROLE_ADMIN, ROLE_USER) |
| last_cnn_dt | TEXT | | 마지막 접속일시 (YYYY-MM-DD HH:MM:SS) |

#### Table: `h_login_hist` (로그인 이력)
| Column | Type | Constraints | Description |
|---|---|---|---|
| uid | INTEGER | PK, Auto Increment | 고유 ID |
| user_uid | INTEGER | FK (h_user.uid) | 사용자 FK |
| login_dt | TEXT | NOT NULL | 로그인 시도 일시 |
| login_ip | TEXT | | 접속 IP |
| login_success | TEXT | 'SUCCESS' / 'FAIL' | 로그인 결과 |
| login_msg | TEXT | | 실패 사유 등 메시지 |

### 2. Backend Implementation (`src/sse_server.py` & New Modules)
구조적 깔끔함을 위해 DB 관련 로직을 분리하는 것을 권장하나, 현재 단일 파일 구조를 유지한다면 `src/db_manager.py` (신규) 생성을 고려합니다.

- **[NEW] `src/db_manager.py`**:
    - `init_db()`: 
        - 테이블 자동 생성
        - 초기 관리자 계정 시딩: `admin` / `1234` (Role: `ROLE_ADMIN`)
    - `get_user(user_id)`: 사용자 조회
    - `verify_password(plain, hashed)`: 
        - 비밀번호 정책: 숫자, 문자, 특수문자 포함 무관, **길이 4자리 이상**
    - `log_login_attempt(...)`: 이력 저장
    - `get_login_history()`: 로그인 이력 목록 조회 (최신순)

- **[MODIFY] `src/sse_server.py`**:
    - **API**: 
        - `POST /auth/login`: 로그인 처리 (성공 시 성공 이력, 실패 시 실패 이력 저장)
        - `GET /auth/history`: 로그인 이력 조회 (로그인된 유저만 접근 가능하도록)
    - **Dependency**: `request` 객체에서 IP 추출하여 이력 저장 시 사용

### 3. Frontend Implementation (`src/frontend`)
- **[NEW] `src/types/auth.ts`**: User, LoginResponse, LoginHistory 타입 정의
- **[NEW] `src/components/Login.tsx`**:
    - ID/PW 입력 폼 (비밀번호 4자리 이상 유효성 체크)
    - 로그인 버튼 -> API 호출 -> 성공 시 전역 상태 업데이트 및 대시보드 리다이렉트
- **[NEW] `src/components/LoginHistViewer.tsx`**:
    - 로그인 이력(`h_login_hist`) 조회 및 테이블(Grid) 형태로 표시
- **[MODIFY] `src/App.tsx`**:
    - `RequireAuth` 컴포넌트 추가
    - 메인 메뉴(Sidebar)에 **"접속 이력"** 메뉴 추가 (로그인 성공 시 표시)
    - 라우팅 구조 변경: `/login` (Public), `/` (Protected), `/history` (Protected)

### 4. Verification Plan
1. **DB 구축 확인**: 서버 시작 로그에 "Database initialized" 확인.
2. **로그인 실패 테스트**: 틀린 비번 입력 -> `h_login_hist`에 'FAIL' 기록 확인.
3. **로그인 성공 테스트**: `admin`/`1234` 입력 -> `h_login_hist`에 'SUCCESS' 기록 및 대시보드 진입 확인.
4. **접근 제어**: 로그아웃 상태에서 대시보드 접근 시 로그인 페이지로 튕기는지 확인.
