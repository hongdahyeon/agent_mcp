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

## Phase 6: Database & Authentication [Completed]

### Goal
Python 내장 `sqlite3`를 사용하여 별도 설치 없이 동작하는 인메모리(또는 파일 기반) DB를 구축하고, 사용자 인증(로그인) 및 이력 관리 기능을 구현합니다.

### Implemented Changes
- **[NEW] `src/db_manager.py`**: SQLite DB 연동 및 사용자/이력 관리 함수 구현
- **[MODIFY] `src/sse_server.py`**: 로그인/이력 API 구현
- **[NEW] `src/frontend` Components**: 로그인 페이지, 이력 조회 페이지 및 인증 상태 관리 구현

---

## Phase 7: User Table Schema Update [Completed]

### Goal
`h_user` 테이블에 계정 활성화 여부를 제어하는 `is_enable` 컬럼을 추가하고, 로그인 시 이를 검증하는 로직을 추가합니다. 테스트 편의를 위해 비활성화된 테스트 유저를 자동 시딩합니다.

### Implemented Changes
- **Schema**: `is_enable` check & migration. (Default 'Y')
- **Policy**: `is_enable = 'N'` login block with "Account is disabled" error.
- **Data Seeding**: Auto-created `user` / `1234` with `is_enable='N'`.
- **Frontend**: Handle 403 Forbidden error in `Login.tsx`.

---

## Phase 8: User Management Page (Admin Only) [Pending]

### Goal
시스템 관리자가 사용자를 관리할 수 있는 전용 페이지를 구현합니다. 사용자 목록 조회, 추가, 수정, 활성/비활성 제어 기능을 포함합니다.

### Requirement Analysis
1. **Access Control**: 오직 `ROLE_ADMIN` 권한을 가진 사용자만 접근 가능.
2. **List**: ID, 이름, 권한, 활성상태 표시.
3. **Add**: ID(중복체크), PW, 이름, 권한 선택.
4. **Edit**: 이름, 권한, is_enable 수정 (Row 클릭 시 모달).
5. **Toggle**: 목록에서 버튼으로 즉시 활성/비활성 전환.

### Proposed Changes

#### 1. Backend API (`src/sse_server.py`, `src/db_manager.py`)
- **DB Manager**:
    - `get_all_users()`: 전체 사용자 목록 (PW 제외)
    - `create_user(user_data)`: INSERT 쿼리 (PW 해싱)
    - `update_user(user_id, update_data)`: UPDATE 쿼리 (Dynamic)
    - `check_user_id(user_id)`: 존재 여부 확인
- **Server API** (prefix: `/api/users`):
    - `GET /`: 목록 조회 (Admin check)
    - `POST /`: 사용자 생성
    - `PUT /{user_id}`: 사용자 정보 수정
    - `GET /check/{user_id}`: ID 중복 체크

#### 2. Frontend (`src/frontend`)
- **Type**: `User` 타입 확장 (목록 조회용)
- **Component**: `src/components/Users.tsx`
    - **Header**: "사용자 추가" 버튼.
    - **Table**: 사용자 목록 표시 (Tailwind Styled).
        - Columns: ID, 이름, 권한(Badge), 상태(Toggle/Badge), 가입일/접속일.
    - **Modal (Add/Edit)**:
        - Mode: Create / Update
        - Fields: ID(Create only + Check btn), PW(Create only), Name, Role(Select), Enable(Select/Toggle).
- **Route**: `App.tsx`에서 `/users` 라우트 추가 및 `RoleGuard` 적용 (Admin only).
- **Navigation**: Sidebar에 "사용자 관리" 메뉴 추가 (`ROLE_ADMIN`일 때만 표시).

### Verification Plan
1. **Access Control**: `user` 계정(비활성 풀고)으로 로그인 -> 메뉴 안보임 / URL 접근 시 차단 확인. `admin` 계정 -> 메뉴 보임 / 접근 가능.
2. **CRUD Flow**:
    - 사용자 추가 (ID 중복 체크) -> 목록 갱신 확인.
    - 사용자 정보 수정 (이름 변경) -> 확인.
    - 상태 토글 (활성 <-> 비활성) -> 해당 유저 로그인 시도하여 반영 확인.

# [Phase 9] 로그인 세션 유지 (Session Persistence)

## 목표 (Goal Description)
페이지를 새로고침하거나 브라우저 탭을 닫았다가 다시 열어도 로그인 상태가 유지되도록 세션 지속성을 구현합니다.

## 변경 제안 (Proposed Changes)

### Frontend
#### [MODIFY] [App.tsx](file:///d:/hong/9.%20project/agent_mcp/src/frontend/src/App.tsx)
- **초기화 (Initialization)**: 앱 시작 시 `localStorage.getItem('user_session')`을 확인하여 로그인 상태를 복구합니다.
- **로그인 (Login)**: 로그인 성공 시 `localStorage.setItem('user_session', JSON.stringify(user))`로 사용자 정보를 저장합니다.
- **로그아웃 (Logout)**: 로그아웃 시 `localStorage.removeItem('user_session')`으로 저장된 정보를 삭제합니다.

## 검증 계획 (Verification Plan)
1.  **새로고침 테스트**: 로그인 -> 페이지 새로고침 -> 여전히 로그인 상태인지 확인.
2.  **로그아웃 테스트**: 로그아웃 -> 페이지 새로고침 -> 로그아웃 상태가 유지되는지 확인.
