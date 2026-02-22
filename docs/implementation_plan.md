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

## Phase 8: User Management Page (Admin Only) [Completed]

### Goal
시스템 관리자가 사용자를 관리할 수 있는 전용 페이지를 구현합니다. 사용자 목록 조회, 추가, 수정, 활성/비활성 제어 기능을 포함합니다.

### Implemented Changes
- **Backend API**: `get_all_users`, `create_user`, `update_user` API 구현 및 Admin 권한 체크 적용.
- **Frontend**: `Users.tsx` 컴포넌트 구현 (목록, 모달, 토글).
- **Navigation**: Admin Only 메뉴 및 라우팅 가드 적용.

---

## Phase 9: Login Session Persistence [Completed]

### Goal
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


---

## Phase 10: MCP Tool Usage Tracking [Completed]

### Goal
MCP Tool 실행 이력을 사용자별로 추적하고 기록하여, 시스템 활용 통계 및 감사 로그(Audit Log)로 활용할 수 있도록 합니다.

### Implemented Changes
- **Schema**: `h_mcp_tool_usage` 테이블 생성.
- **Backend**: `call_tool` 핸들러에 `user_id` 전달 및 로깅 로직(`log_tool_usage`) 추가.
- **Frontend**: Tool 호출 시 사용자 정보 주입 로직 추가.
#### 1. Database Schema (`src/db_manager.py`)
- **[MODIFY] `init_db()`**: `h_mcp_tool_usage` 테이블 생성 쿼리 추가.
    - `id` (PK, Auto Increment)
    - `user_uid` (FK, `h_user.uid`)
    - `tool_nm` (Text)
    - `tool_params` (Text)
    - `tool_success` (Text - 'SUCCESS'/'FAIL')
    - `tool_result` (Text)
    - `reg_dt` (Text - Timestamp)
- **[NEW] `log_tool_usage(...)`**: Tool 사용 이력을 INSERT 하는 함수 구현.

#### 2. Backend Logic (`src/sse_server.py`)
- **[MODIFY] `call_tool` handler**:
    - `arguments`에서 `user_id` (또는 `uid`) 추출 로직 추가.
    - Tool 실행 전후에 DB 조회 및 로깅 함수(`log_tool_usage`) 호출.
    - 예외 발생 시에도 'FAIL' 상태와 에러 메시지로 로깅.

#### 3. Frontend Implementation (`src/frontend/src/hooks/useMcp.ts`)
- **[MODIFY] `useMcp.ts`** or related logic:
    - Tool 호출 메시지(JSON-RPC `tools/call`)를 보낼 때, `arguments`에 현재 로그인한 사용자 정보를 주입하는 로직 추가. 
    - (참고: 로그인한 사용자의 `uid`를 찾아서 `_user_uid` 필드로 전송)

### Verification Plan
1. **DB Table Check**: 서버 재시작 후 `h_mcp_tool_usage` 테이블 생성 여부 확인.
2. **Tool Execution**: 웹 인터페이스에서 `add` 또는 `hellouser` 툴 실행.
3. **Log Retrieval**: DB를 조회하여 정상적으로 Insert 되었는지 확인.

---

## Phase 11: MCP Tool Usage History (Admin) [Completed]

### Goal
관리자가 사용자들의 Tool 사용 이력을 조회할 수 있는 기능을 구현한다.

### Implemented Changes
- **Backend**: `GET /mcp/usage-history` API 구현 및 페이징 처리.
- **Frontend**: `UsageHistory.tsx` 구현 (테이블, 페이징).

#### [MODIFY] [sse_server.py](src/sse_server.py)
- **API 추가**: `GET /mcp/usage-history`
    - Query Params: `page`, `size`
    - Response: `{ total: number, items: UsageLog[] }`

#### [MODIFY] [db_manager.py](src/db_manager.py)
- **Function 추가**: `get_tool_usage_logs(page, size)`
    - `h_mcp_tool_usage`와 `h_user` 테이블 조인 조회
    - 최신순 정렬

### Frontend Changes

#### [NEW] [UsageHistory.tsx](src/frontend/src/components/UsageHistory.tsx)
- 관리자 전용 사용 이력 조회 컴포넌트
- 테이블 형태로 데이터 표시 (Time, User, Tool, Success, Params, Result)
- 간단한 페이징 (더보기 또는 페이지네이션)

#### [MODIFY] [App.tsx](src/frontend/src/App.tsx)
- 라우팅 및 메뉴 추가 ('usage-history', '사용 이력')
- `ROLE_ADMIN` 체크하여 접근 제어


---

## Phase 12: DB Integration Tool (User Info)

### Goal
LLM(모델)이 내부 데이터베이스의 사용자 정보에 접근할 수 있도록 `get_user_info` 도구를 추가합니다.
이를 통해 "user의 정보 알려줘" 같은 자연어 질의에 대해 실제 DB 데이터를 기반으로 응답할 수 있게 합니다.

### Security Requirement
- **비밀번호 필드 제외**: 조회 결과에서 `password` 해시 값은 절대 노출되지 않도록 제거해야 합니다.

### Proposed Changes

#### 1. Backend (`src/server.py`)
- **[MODIFY] Import**: `src/db_manager.py` import 추가.
- **[NEW] Tool Implementation**:
```python
@mcp.tool()
def get_user_info(user_id: str) -> str:
    """
    Get user details by user_id from the database.
    Useful when you need to find user information like name, role, last login time, etc.
    """
    user = db_manager.get_user(user_id)
    if not user:
        return f"User not found with ID: {user_id}"
    
    # dict 변환 및 password 제거
    user_dict = dict(user)
    if 'password' in user_dict:
        del user_dict['password']
        
    return str(user_dict)
```

### Verification Plan
1. **Web Tester**:
    - `get_user_info` 도구가 목록에 뜨는지 확인.
    - `user_id`로 `admin` 입력 후 실행.
    - 결과 JSON에 `password` 필드가 없는지 확인.
    - 결과에 `user_nm`, `role` 등이 잘 나오는지 확인.


# Phase 1: 사용자 토큰 관리 (Completed)

## 1. 개요
MCP 도구 사용을 위한 인증 수단으로 **온디맨드 사용자 토큰(On-Demand User Token)** 시스템을 구축합니다. 사용자는 웹 인터페이스에서 직접 API 키를 발급받고 관리할 수 있습니다.

## 2. 변경 사항

### A. DB 스키마 설계
#### [NEW] h_user_token 테이블
- 사용자별 토큰 발급 이력을 관리합니다.
- 컬럼: `id`, `user_uid` (FK), `token_value` (Unique), `expired_at`, `is_active`

### B. Backend 구현
#### [NEW] src/db_manager.py
- `create_user_token(user_uid, days_valid=365)`: 안전한 랜덤 토큰 생성, 기존 토큰 만료 처리, 새 토큰 저장
- `get_user_token(user_uid)`: 현재 유효한 토큰 조회

#### [MODIFY] src/sse_server.py
- `POST /api/user/token`: 토큰 발급 요청 (로그인 필수)
- `GET /api/user/token`: 토큰 조회 요청

### C. Frontend 구현
#### [NEW] src/frontend/src/components/MyPage.tsx
- 내 정보 컴포넌트 신규 추가
- 토큰이 없으면 [토큰 발급받기] 버튼 표시
- 토큰이 있으면 토큰 값, 만료일, 복사/재발급 버튼 표시

#### [MODIFY] src/frontend/src/App.tsx
- 사이드바 하단 프로필 영역 클릭 시 'mypage' 뷰로 전환 기능 추가


---

# Phase 2: 도구 실행 보안 적용 (Security Implementation)

## 1. 개요
현재 MCP 서버는 인증 없이 누구나 접근 가능하며, 도구 실행 시 사용자 식별을 클라이언트가 보낸 인자(`_user_uid`)에 의존하고 있습니다. Phase 2에서는 **토큰 기반 인증**을 도입하고, **서버 측 세션 바인딩(User Binding)**을 통해 보안을 강화합니다.

## 2. 변경 사항

### A. Context 관리 (New)
요청(Request) 스코프 내에서 인증된 사용자 정보를 저장하고 접근하기 위한 `ContextVar` 유틸리티를 추가합니다.

#### [NEW] src/utils/context.py
- `user_context: ContextVar[dict]`: 현재 요청의 사용자 정보를 담는 컨텍스트 변수
- `set_current_user(user: dict)`: 사용자 정보 설정
- `get_current_user() -> dict`: 사용자 정보 조회 (없으면 None)

### B. SSE 연결 인증 (Modify)
`src/sse_server.py`의 `/sse` 엔드포인트를 수정하여 토큰 검증 로직을 추가합니다.

#### [MODIFY] src/sse_server.py
1.  `handle_sse` 함수 수정:
    - `token` 쿼리 파라미터 수신
    - `db_manager.get_user_by_active_token(token)` 호출 (함수 신규 추가 필요)
    - 유효한 토큰이면 `set_current_user()`로 컨텍스트 설정
    - 유효하지 않으면 `HTTP 401 Unauthorized` 반환

### C. DB Manager 확장 (Modify)
토큰으로 사용자 정보를 조회하는 함수를 추가합니다.

#### [MODIFY] src/db_manager.py
- `get_user_by_active_token(token: str) -> dict`: 활성 토큰으로 사용자 정보 조회 (만료일 체크 포함)

### D. 도구 실행 로직 개선 (Modify)
도구 핸들러(`handle_call_tool`)에서 인자(`arguments`) 대신 컨텍스트(`get_current_user`)를 사용하도록 변경합니다.

#### [MODIFY] src/sse_server.py (@mcp.call_tool)
- 기존: `user_uid = arguments.get("_user_uid")`
- 변경: `user = get_current_user(); user_uid = user['uid'] if user else None`
- 인자 정리 로직 유지 (`_user_uid`가 들어오더라도 무시하거나 제거)

### E. 관리자 권한 체크 (Modify)
관리자 전용 도구(`get_user_info`) 실행 시 권한을 검증합니다.

#### [MODIFY] src/sse_server.py
- `get_user_info` 블록 내에서 `user['role'] == 'ROLE_ADMIN'` 체크 추가
- 권한 부족 시 에러 메시지 반환 또는 실행 거부

## 3. 검증 계획 (Verification Plan)
1.  **인증 실패 테스트**: 토큰 없이 `/sse` 접근 시 401 에러 확인
2.  **인증 성공 테스트**: 유효한 토큰으로 `/sse` 접근 시 연결 성공 확인
3.  **User Binding 테스트**: 도구 실행 시 `h_mcp_tool_usage` 테이블에 올바른 `user_uid`가 기록되는지 확인 (클라이언트가 `_user_uid`를 보내지 않아도)
4.  **권한 체크 테스트**: 일반 사용자 토큰으로 `get_user_info` 실행 시 거부 확인

---

# Phase 13: Bugfix - DB Connection & Initialization

## 1. Issue Description
사용자가 `get_user_info` 도구 실행 시 `no such table: h_user` 에러 발생.
- **Cause 1**: `db_manager.py`에서 상대 경로(`"agent_mcp.db"`) 사용으로 인해 실행 컨텍스트에 따라 DB 파일 위치가 달라짐.
- **Cause 2**: `server.py` 실행 시 `init_db()`가 호출되지 않아 테이블이 생성되지 않음.

## 2. Fix Details
- **[MODIFY] src/db_manager.py**: `DB_PATH`를 `os.path.abspath(__file__)` 기반의 절대 경로로 변경.
- **[MODIFY] src/server.py**: 서버 시작 시 `init_db()` 호출 추가.

## 3. Verification
- 서버 재시작 후 `get_user_info` 실행 시 정상적으로 DB 조회 및 결과 반환 확인 필요.

# Phase 14: Admin 기능 강화: 도구 사용 제한 관리

## 목표
관리자(Admin)가 사용자의 도구 사용 제한 정책(h_mcp_tool_limit)을 직접 조회하고 수정할 수 있는 기능을 제공합니다. 이를 통해 특정 사용자에게 추가 사용량을 할당하거나, 등급별 정책을 조정할 수 있습니다.

## 핵심 요구사항
1. **Access Control**: 오직 `ROLE_ADMIN` 권한을 가진 사용자만 접근 가능.
2. **Limit List**: 현재 적용된 모든 제한 정책(User별/Role별)을 조회.
3. **Limit Upsert**: 
    - 대상 타입(USER/ROLE)과 대상 ID(user_id/role_name) 선택.
    - 제한 횟수 설정 (-1: 무제한).
    - 기존 정책이 있으면 업데이트, 없으면 생성.
4. **Limit Delete**: 적용된 제한 정책 삭제.

## 변경 사항

### Backend (`src/db/mcp_tool_limit.py`, `src/sse_server.py`)

#### 1. DB Logic (`src/db/mcp_tool_limit.py`)
- **[NEW] `get_limit_list(page, size)`**: 
    - `h_mcp_tool_limit` 테이블 전체 조회.
    - 페이징 처리.
- **[NEW] `upsert_limit(limit_data)`**:
    - `target_type`, `target_id` 조합으로 기존 레코드 확인.
    - 존재하면 `UPDATE`, 없으면 `INSERT`.
- **[NEW] `delete_limit(limit_id)`**:
    - 해당 ID의 정책 삭제.

#### 2. API Endpoints (`src/sse_server.py`)
- **Prefix**: `/api/mcp/limits`
- **`GET /`**: 제한 정책 목록 조회.
- **`POST /`**: 제한 정책 추가/수정 (Body: `{target_type, target_id, max_count, description}`).
- **`DELETE /{id}`**: 정책 삭제.

### Frontend (`src/frontend`)

#### 1. Components
- **[NEW] `LimitManagement.tsx`**
    - **Header**: "제한 정책 관리" 타이틀 및 "정책 추가" 버튼.
    - **Table**: 정책 목록 (Type, Target, Limit, Description).
    - **Modal**: 정책 추가/수정 폼.
        - Target Type: Select (USER / ROLE).
        - Target ID: Input (User ID or Role Name).
        - Limit Count: Input (Number).
        - Description: Input (Text).

#### 2. Navigation
- **`App.tsx`**: 라우트 추가 (`/limits`).
- **Sidebar**: "사용 제한 관리" 메뉴 추가 (Admin Only).

## 검증 계획
1. **기본 정책 확인**: 페이지 접속 시 초기 시딩된 `ROLE_USER` (50), `ROLE_ADMIN` (-1) 정책이 보이는지 확인.
2. **Role 정책 수정**: `ROLE_USER`의 제한을 100으로 수정 후 저장 -> 목록 갱신 확인 -> 실제 유저(`user`) 계정으로 `/api/mcp/my-usage` 조회 시 Limit이 100으로 변경되었는지 확인.
3. **User 정책 추가**: `user` 계정에 대해 별도 제한(200) 추가 -> 저장 -> 실제 유저 계정에서 Limit 200 적용 확인 (Role보다 우선순위 확인).
4. **정책 삭제**: User 정책 삭제 -> 다시 Role 정책(100)으로 복귀 확인.

# Phase 16: 동적 Tool 생성 기능 (Dynamic Tool Creation) (important)

## Goal
관리자가 웹 UI를 통해 SQL 쿼리나 간단한 Python 로직을 수행하는 Tool을 동적으로 생성하고, 서버 재배포 없이 Agent가 즉시 사용할 수 있도록 합니다.

## Implementation Steps

### Phase 1: Database Schema & Init
- **[MODIFY] `src/db/init_manager.py`**:
    - `h_custom_tool` 테이블 생성 (name, type, definition 등)
    - `h_custom_tool_param` 테이블 생성 (param_name, type, required 등)

### Phase 2: Dynamic Tool Loader & Handler
- **[NEW] `src/dynamic_loader.py`**:
    - DB에서 활성 Tool 목록 로드.
    - `pydantic.create_model`을 사용하여 인자 모델 동적 생성.
    - `fastmcp.tool` 데코레이터에 함수 바인딩.
- **[NEW] `src/tool_executor.py`**:
    - **SQL Executor**: `connection.py` 활용하여 파라미터 바인딩 및 쿼리 실행.
    - **Python Executor**: `simpleeval` 등을 활용한 샌드박스 실행.

### Phase 3: Frontend Tool Builder
- **[NEW] `src/frontend/src/components/CustomTools.tsx`**:
    - Tool 목록 조회 및 활성/비활성 토글.
    - Tool 생성/수정 모달 (Step-by-step UI 권장).
    - 파라미터 추가/삭제 UI.
    - 로직 작성 에디터 (CodeMirror 등 활용 가능성 검토).

### Phase 4: Integration & Testing
- Server 시작 시 로드 및 주기적 리로드(Optional) 또는 API 호출 시 리로드 구현.
- 생성된 Tool이 Client(Agent)에서 정상 호출되는지 테스트.
- SQL Injection 및 Code Injection 보안 테스트.


# Phase 17: Dynamic Tool Tester Integration

## Goal
동적으로 생성된 도구를 실제 Agent(Tester)가 바로 조회하고 실행할 수 있도록 통합합니다. 서버 재시작 없이 목록을 갱신하고, 실행 결과를 직관적으로 확인할 수 있어야 합니다.

## Implemented Changes

### 1. Backend Integration (`src/sse_server.py`)
- **`list_tools` Handler Update**: 
    - 정적 도구 목록 외에 DB(`h_custom_tool`)에서 활성 상태인 동적 도구를 조회하여 합침.
    - JSON Schema 동적 생성 (Params 정보 기반).
- **`call_tool` Handler Update**:
    - 요청된 도구 이름이 정적 도구에 없으면 동적 도구 목록에서 검색.
    - `ToolExecutor` (SQL/Python)를 호출하여 결과 반환.
    - 실행 이력(`h_mcp_tool_usage`) 저장 로직 공유.

### 2. Frontend Tester Refinement (`src/frontend`)
- **[MODIFY] `useMcp.ts`**:
    - `refreshTools()` 함수 추가: `tools/list` RPC를 명시적으로 재호출하여 도구 목록 갱신.
- **[MODIFY] `App.tsx`**:
    - `refreshTools` 함수를 `Tester` 컴포넌트로 전달.
- **[MODIFY] `Tester.tsx`**:
    - **Refresh Button**: 도구 선택 셀렉트 박스 옆에 새로고침 버튼 배치.
    - **Auto Reset**: 도구 변경 시 기존 입력 폼 및 실행 결과 초기화.
    - **Smart JSON View**: 실행 결과(`content[0].text`)가 JSON 문자열인 경우, 파싱하여 구조화된 형태로 표시.

## Verification Plan
1. **Frontend Build**: `npm run build` 수행 (React App 배포).
2. **Dynamic Load**: Admin 메뉴에서 새 도구 생성 후, Tester 화면에서 '새로고침' 클릭 시 목록에 뜨는지 확인.
3. **Execution**: 생성한 동적 도구 실행 및 결과(JSON Parsing) 확인.
4. **Usage Log**: 실행 후 Admin > Usage History에 기록 남는지 확인.

# Phase 18: Tool Output JSONization

## Goal
사용자가 도구의 출력을 더 쉽게 파악하고(JSON 구조화), 도구의 출처(시스템 vs 동적)를 명확히 구별할 수 있도록 개선합니다.

## Requirements
1. **JSON Output**: `get_user_info`, `get_user_tokens` 등 객체를 반환하는 도구는 Python `dict` 문자열(`{'k': 'v'}`) 대신 표준 `JSON` 문자열(`{"k": "v"}`)을 반환해야 합니다. Frontend의 Smart JSON View가 이를 인식하여 구조화해서 보여줄 수 있습니다.
2. **Source Distinction**: 도구 목록에서 이 도구가 `server.py`에 정의된 정적 도구인지, Admin이 생성한 동적 도구인지 구분되어야 합니다.

## Proposed Changes

### 1. Backend (`src/sse_server.py`)
- **JSON Serialization**: `get_user_info`, `get_user_tokens` 결과 반환 시 `str(dict)` 대신 `json.dumps(dict, ensure_ascii=False)` 사용.
- **Description Tagging**: `list_tools` 반환 시,
    - Static Tools: Description 앞에 `[System]` 태그 추가.
    - Dynamic Tools: Description 앞에 `[Dynamic]` 태그 추가.

### 2. Frontend (`src/frontend/src/components/Tester.tsx`)
- **Dropdown UI**: 도구 선택 옵션 렌더링 시 Description의 태그를 확인.
    - `[System]` -> 도구명 뒤에 `(System)` 표시.
    - `[Dynamic]` -> 도구명 뒤에 `(Dynamic)` 표시.
    - 태그 자체는 툴팁이 아닌 이상 UI에 노출되지 않도록 처리하거나, 이름 옆에만 표기.
- **Copy Button**: 실행 결과(JSON) 영역 우측 상단에 복사 아이콘(또는 버튼) 추가. 클릭 시 클립보드에 전체 결과 텍스트 복사.

## Verification Plan
1. **Tool List**: Tester 화면 진입 시 도구 목록에 `(System)` / `(Dynamic)` 라벨이 붙어있는지 확인.
2. **Execution**: 
    - `get_user_info` 실행 -> 결과가 JSON 형태로 예쁘게 나오는지 확인.
    - `get_user_tokens` 실행 -> 결과가 JSON 형태로 예쁘게 나오는지 확인.

# Phase 19: System Config Management UI [Refactor]

## Goal
기존 단순 Key-Value 구조의 설정을 **그룹화된 JSON 설정 관리** 방식으로 변경합니다.
예: "Gmail Settings"라는 이름 하에 `host`, `port`, `auth` 정보를 JSON 형태로 한 번에 관리.

## Requirements
1.  **Database Refactor**:
    -   Existing `h_system_config` table MUST be dropped and recreated.
    -   **Columns**:
        -   `name` (PK, Text): 설정 그룹명 (예: `gmail_config`)
        -   `configuration` (Text/JSON): 설정 값들의 JSON 문자열
        -   `description` (Text): 설명
        -   `reg_dt` (Text): 등록일시
2.  **Backend API**:
    -   Update APIs to handle JSON content.
    -   Validation checks for valid JSON format.
3.  **Frontend UI**:
    -   **List**: Show `name`, `description`. `configuration` might be too long, show preview or hidden.
    -   **Add/Edit**:
        -   `name` (Input)
        -   `configuration` (Textarea - JSON format validation required)
        -   `description` (Input)

## Proposed Changes

### 1. Database Schema (`src/db/init_manager.py`)
-   Logic to DROP `h_system_config` if schema doesn't match or force drop for this transition.
-   Create new table with `name`, `configuration`, `description`.
-   Seed default:
    ```json
    {
        "name": "gmail_config",
        "configuration": {
            "mail.host": "smtp.gmail.com",
            "mail.port": 587,
            "mail.username": "",
            "mail.password": ""
        },
        "description": "Gmail SMTP Settings"
    }
    ```

### 2. Backend Logic (`src/db/system_config.py`)
-   Update `get_config(name)` logic.
-   Update `set_config` logic to store JSON string.

### 3. Frontend (`SystemConfig.tsx`)
-   Update table columns.
-   Update Form:
    -   Use a textarea for `configuration`.
    -   Add "Beautify JSON" or simple validation before submit.

## Phase 20: Gmail 연동 및 메일 발송 기능 (Items 32, 34-37) [Completed]

### 1. 개요
시스템 설정을 통해 SMTP 정보를 관리하고, 사용자가 웹 UI에서 즉시 또는 예약 메일을 발송할 수 있는 기능을 구현했습니다.

### 2. 구현 내용
- **Mailer Utility (`src/utils/mailer.py`)**: `smtplib`와 `email.mime`을 사용하여 실제 메일 발송 로직을 구현했습니다. `h_system_config`의 Gmail 설정을 동적으로 불러옵니다.
- **Database Layer (`src/db/email_manager.py`)**: 메일 발송 이력 저장(`h_email_log`), 상태 업데이트(SENT, FAILED, PENDING), 발송 취소 기능을 구현했습니다.
- **Backend API (`src/sse_server.py`)**: 
    - `POST /api/email/send`: 메일 발송 요청 접수 (즉시/예약 분기)
    - `GET /api/email/logs`: 발송 이력 조회
    - `POST /api/email/cancel/{log_id}`: 예약된 메일 발송 취소
- **Frontend UI (`EmailSender.tsx`)**: 
    - 수신자, 제목, 내용 입력 폼
    - 예약 발송 설정 (현재 시간 기준 미래 시간 선택)
    - 발송 이력 테이블 및 '취소' 버튼 (PENDING 상태 전용)

---

## Phase 21: 자동 예약 발송 스케줄러 (Item 38) [Completed]

### 1. 개요
사용자가 설정한 예약 시간에 맞춰 PENDING 상태인 메일을 자동으로 발송하는 백그라운드 스케줄러를 구현했습니다.

### 2. 구현 내용
- **Scheduler (`src/scheduler.py`)**: `APScheduler` 라이브러리를 사용하여 1분마다 `process_scheduled_emails`를 실행합니다.
- **발송 로직**: 현재 시간(`now`)보다 이전에 예약된 `PENDING` 건을 조회하여 순차적으로 발송하고 결과를 DB에 업데이트합니다.
- **통합**: `sse_server.py`의 Lifespan 핸들러에 스케줄러 시작/종료 로직을 포함하여 서버 생명주기와 동기화했습니다.

---

## Phase 22: JWT Authentication Implementation [Completed]

### Goal
기존의 단순 토큰 방식을 **JWT (JSON Web Token)** 기반 인증으로 교체하여 보안성 및 표준성을 강화합니다.
관리자 페이지 접근 시 토큰 검증 및 권한 체크를 수행하며, 로그인 지속 시간은 **12시간**으로 설정합니다.
**[Update]**: 사용자 토큰 시스템(`h_user_token`)은 제거되었으며, 모든 인증은 **로그인 기반의 JWT**로 통일되었습니다.

### Requirements
1.  **Tech Stack**:
    -   `python-jose` (JWT 생성 및 검증)
    -   `passlib[bcrypt]` (비밀번호 해싱 및 검증)
    -   `python-multipart` (OAuth2PasswordRequestForm 지원)
2.  **Auth Flow**:
    -   **Login**: OAuth2 Password Flow (`username`/`password`) -> 검증 -> JWT Access Token 발급 (12h).
    -   **MCP Connection**: MyPage -> '토큰 발급' -> JWT Access Token 발급 (365 days).
    -   **Verification**: 요청 헤더 `Authorization: Bearer {token}` -> JWT 디코딩 -> 사용자 식별 & 권한 체크.
3.  **Token Policy**:
    -   Algorithm: `HS256`
    -   Expiration: 12시간 (Login), 1년 (MCP Key)
    -   Payload: `sub` (user_id), `role` (권한), `type` (api_key/login)
4.  **Admin Protection**:
    -   관리자 전용 API 접근 시, JWT의 `role`이 `ROLE_ADMIN`인지 확인.

### Implemented Changes
-   **Dependencies**: `python-jose`, `passlib`, `python-multipart` 추가.
-   **Auth Utility**: `src/utils/auth.py` (JWT Creation/Verification, Bcrypt).
-   **User Token**: `src/db/user_token.py` 수정 (Random String -> Long-lived JWT).
-   **Server Refactor**: `src/sse_server.py`의 `handle_sse` 및 API 의존성을 JWT 기반으로 변경.
-   **Frontend**: `App.tsx`, `MyPage.tsx` 등에서 `Authorization: Bearer` 헤더 사용.

### Verification Results
1.  **Login**: JWT 발급 및 로그인 성공.
2.  **MCP Token**: MyPage에서 Long-lived JWT 발급 확인.
3.  **Validation**: `curl` 및 Frontend API 호출 테스트 완료.

---

## Phase 23 작업 결과 및 워크스루 (Walkthrough)

### 1. Database Layer 수정
- **`src/db/access_token.py`**: `get_user_by_active_token(token)` 함수를 구현했습니다.
    - JWT 토큰인 경우 디코딩하여 해당 유저 정보를 반환합니다.
    - 외부 액세스 토큰(`sk_...`)인 경우 `h_access_token` 테이블 확인 후, 유효하다면 시스템 연동용 유저인 `external` 계정 정보를 반환합니다.
- **`src/db/__init__.py`**: 위 함수를 외부 모듈에서 `db.get_user_by_active_token`으로 접근할 수 있도록 노출했습니다.

### 2. Stdio Server (`server.py`) 수정
- **`get_user_info` 도구**: 
    - 조회 결과 반환 시 `json.dumps`를 사용하여 SSE 버전과 동일하게 JSON 문자열 형식을 갖추도록 수정했습니다.
    - `ROLE_ADMIN` 권한 체크 및 오류 메시지 형식을 통일했습니다.

### 3. 오류 수정 및 성능 개선
- **`sqlite3.Row` 오류 해결**: `db.get_user_by_active_token`이 `sqlite3.Row` 객체를 반환하여 `server.py`에서 `.get()` 메서드를 사용할 수 없던 문제를 `dict()` 변환을 통해 해결했습니다.
- **응답 형식 일치**: `get_user_info` 실행 시 사용자 정보가 SSE 서버와 동일한 JSON 포맷으로 응답됩니다.
- **데이터 시딩 중단**: `src/db/init_manager.py`에서 서버 시작 시 마다 데이터가 초기화되는 로직을 주석 처리하여 데이터 보존성을 높였습니다.

### 4. 동적 도구(Dynamic Tool) 감사 로그 추가
- **`src/utils/server_audit.py`**: `audit_log` 데코레이터가 `async` 함수(Coroutine)를 지원하도록 수정했습니다.
- **`src/dynamic_loader.py`**: 동적으로 생성된 도구 핸들러에 `@audit_log`를 적용하여, Claude Desktop 등 Stdio 방식을 사용할 때도 동적 도구 실행 이력이 DB에 정상적으로 기록되도록 했습니다.

## Phase 24: UI/UX 고도화 및 편의 기능 (Items 33-37, 43-48) [Completed]
- **메뉴 구조 개편**: 기능별 그룹화 및 사이드바 레이아웃 개선 (Item 33)
- **메일 발송 관리**: 발송 이력 기록, 취소 기능 및 UI 보강 (Items 34-37)
- **대시보드 개선**: 사용자별 통계 차트(Donut) 및 결과 통계 레이아웃 최적화 (Items 43-44)
- **디자인 통일**: 전반적인 UI에 Glassmorphism 스타일 및 동일한 헤더/페이지네이션 적용 (Items 45-47)
- **데이터 뷰어**: 사용 이력 상세(JSON) 조회를 위한 모달 뷰어 구현 (Item 48)

---

## Phase 25: OpenAPI Proxy Management (Item 49) [Completed]
- **데이터베이스 연동**: `h_openapi` 테이블 구축 및 CRUD 로직 구현
- **프록시 서버**: 외부 API를 호출하고 결과를 JSON으로 변환하여 반환하는 엔드포인트 구현
- **XML 변환**: `xmltodict`를 사용하여 공공데이터 등의 XML 응답을 자동 JSON 변환 처리
- **관리 UI**: OpenAPI 등록, 수정, 삭제 및 즉석 실행 테스트 UI 구축

---

## Phase 26: OpenAPI Proxy 보안 강화 (Item 50) [Completed]
- **통합 인증 도입**: JWT와 외부 액세스 토큰(`sk_...`)을 모두 지원하는 `get_current_active_user` 의존성 구현
- **보안 적용**: 프록시 실행 엔드포인트에 인증 체크를 추가하여 무분별한 외부 호출 차단
- **인증 유연성**: `Authorization: Bearer` 헤더 및 `token` 쿼리 파라미터 방식 지원

---

## Phase 27: OpenAPI 사용 통계 및 사용량 제한 구현 [Completed]

### 목표
OpenAPI 프록시를 통해 발생하는 모든 호출을 기록하고, 사용자, 권한, 그리고 **외부 접속 토큰별**로 일일리 사용량을 제한하는 기능을 구현합니다. 사용 이력은 **차트와 그래프**를 통해 시각화하여 관리 편의성을 높입니다.

### Proposed Changes

#### 1. Database Layer
*   **[MODIFY] `src/db/init_manager.py`**: 
    *   `h_openapi_usage`: `user_uid` (Nullable), `token_id` (Nullable, 외부 토큰 식별용) 포함하여 생성.
    *   `h_openapi_limit`: `target_type`에 `TOKEN` 추가.
*   **[NEW] `src/db/openapi_usage.py`**: 사용 이력 저장 및 **ECharts 연동용 통계 데이터** 반환 함수 구현.
*   **[NEW] `src/db/openapi_limit.py`**: TOKEN > USER > ROLE 순으로 적용되는 사용량 제한 조회 로직 구현.
*   **[MODIFY] `src/db/__init__.py`**: 신규 함수들 Expose.

#### 2. Backend API Layer
*   **[MODIFY] `src/routers/openapi.py`**:
    *   `api_execute_openapi` 핸들러 수정: 호출 전 토큰/유저별 제한 체크 및 호출 후 결과(성공/실패/IP 등) 로깅.
    *   신규 API 추가: `/api/openapi/stats` (차트용 데이터), `/api/openapi/limits` (토큰 포함 관리), `/api/openapi/my-usage`.

#### 3. Frontend Layer
*   **[NEW] `types/openapi.ts`**: 관련 타입 정의.
*   **[NEW] `OpenApiStats.tsx`**: 사용 통계 대시보드 (ECharts를 활용한 시각화).
*   **[NEW] `OpenApiLimit.tsx`**: 사용 제한 관리 UI (토큰 선택 기능 포함).
*   **[MODIFY] `App.tsx`**: 라우팅 및 메뉴 추가.

#### Implemented Changes
- **통계 대시보드**: ECharts를 활용한 호출 통계 시각화 구현
- **사용량 제한**: TOKEN > USER > ROLE 순위의 제한 로직 적용
- **표시 개선**: 사용 제한 목록에서 ID 대신 실제 이름(사용자명/토큰명) 표시 (`target_name` 추가)

---

## Phase 28: 사이드바 반응형 및 레이아웃 개선 [Completed]
- **접이식 사이드바**: `isSidebarCollapsed` 상태를 통한 레이아웃 너비 조정 (w-64 <-> w-20)
- **반응형 디자인**: 1024px 미만 화면에서 사이드바 자동 접힘 처리
- **UI 최적화**: 접힘 상태에서 아이콘 중심 정렬 및 라벨 숨김 처리

---

## Phase 29: OpenAPI 가이드 에디터 고도화 [Completed]
- **에디터 UI**: 마크다운 편집과 실시간 미리보기를 전환할 수 있는 **탭 방식** 도입
- **데이터 모델**: `h_openapi` 테이블 및 Pydantic 모델에 `description_info` 필드 반영 및 저장 오류 수정
- **렌더링 지원**:
    - `rehype-raw` 적용으로 마크다운 내 HTML 태그(`<b>` 등) 지원
    - `remark-gfm` 적용으로 표, 링크 등 풍부한 서식 지원
- **사용자 경험**: 목록의 '눈' 아이콘을 통해 깔끔한 `prose` 테마 모달로 가이드 제공


---

## Phase 30: Account Locking & Admin Unlocking Logic (New)

### Goal
보안 강화를 위해 5회 이상 로그인 실패 시 계정을 자동으로 잠금 처리하고, 관리자가 이를 확인하고 해제할 수 있는 기능을 구현합니다.

### Proposed Changes

#### 1. Database Layer
- **[MODIFY] `src/db/init_manager.py`**:
    - `h_user` 테이블에 `is_locked` (TEXT, 'N'/'Y'), `login_fail_count` (INTEGER, Default 0) 컬럼 추가.
    - 기존 DB를 위한 ALTER TABLE 마이그레이션 로직 추가.
- **[MODIFY] `src/db/user.py`**:
    - `increment_login_fail_count(user_id)`: 실패 횟수 증가 및 현재 횟수 반환.
    - `reset_login_fail_count(user_id)`: 실패 횟수 0으로 초기화 및 잠금 해제.
    - `set_user_locked(user_id, is_locked)`: 잠금 상태 직접 변경.

#### 2. Backend API
- **[MODIFY] `src/routers/auth.py`**:
    - 로그인 시도 시 `is_locked` 체크.
    - 비밀번호 불일치 시 `login_fail_count` 증가, 5회 도달 시 `is_locked='Y'`.
    - 로그인 성공 시 `login_fail_count` 초기화.
- **[MODIFY] `src/routers/users.py`**:
    - 사용자 정보 수정 API에서 `is_locked` 필드 처리 지원.

#### 3. Frontend Layer
- **[MODIFY] `src/frontend/src/components/Login.tsx`**:
    - 403 에러 발생 시 'locked' 포함 여부에 따라 잠금 메시지 표시.
- **[MODIFY] `src/frontend/src/components/Users.tsx`**:
    - 사용자 목록에 '잠금 상태' 컬럼 추가.
    - 모달 또는 목록에서 잠금 해제 기능 제공.

### Verification Plan
1. 잘못된 비번으로 5회 로그인 시도 -> 계정 잠금 메시지 확인.
2. DB 상에서 `is_locked='Y'`, `login_fail_count=5` 확인.
3. 관리자 계정으로 로그인하여 '사용자 관리' 메뉴 접속.
4. 해당 유저의 잠금 상태 확인 및 '해제' 버튼 클릭.
5. 유저가 다시 정상 로그인 가능한지 확인 (실패 횟수 초기화 여부 포함).
 
 ---
 
 ## Phase 31: OpenAPI PDF Export [Completed]
 
 ### Goal
 등록된 OpenAPI의 상세 정보를 PDF 파일로 내보내는 기능을 구현하여 사용자가 문서를 오프라인으로 보관하거나 공유하기 쉽게 합니다.
 
 ### Implemented Changes
 - **PDF Generator**: `fpdf2` 라이브러리를 기반으로 한 `src/utils/pdf_generator.py`를 구현했습니다.
     - 한국어 지원을 위해 `Malgun Gothic` 폰트를 시스템 또는 프로젝트 경로에서 로드합니다.
     - 사용자 가이드 내 HTML 태그(`<b>` 등)를 제거하여 텍스트만 깔끔하게 출력합니다.
     - `fpdf2`의 최신 테이블 기능을 사용하여 URL, 서비스 키 등 길이가 긴 데이터도 셀 높이가 자동 조절되도록 최적화했습니다.
 - **Backend API**: `src/routers/openapi.py`에 `/api/openapi/{tool_id}/export` 엔드포인트를 추가했습니다.
     - 다운로드하는 사용자가 `ROLE_ADMIN`일 경우에만 서비스 키 정보를 포함하여 생성합니다.
     - 파일명 인코딩을 처리하여 한글 파일명이 깨지지 않도록 구현했습니다.
 - **Frontend**: `OpenApiManager.tsx` 목록 화면의 '작업' 컬럼에 PDF 다운로드 아이콘 및 핸들러를 추가했습니다.
 
 ### Verification Results
 1. OpenAPI 목록에서 PDF 아이콘 클릭 시 파일 다운로드 확인.
 2. 관리자 계정으로 다운로드 시 서비스 키 포함 확인.
 3. 일반 사용자 계정으로 다운로드 시 서비스 키 제외 확인.
 4. 긴 텍스트 및 한글 깨짐 없이 레이아웃이 깔끔하게 유지됨을 확인.
 
 ---
 
 ## Phase 32: Dark Mode Implementation [Planned]
 
 ### Goal
 사용자 경험(UX) 개선을 위해 시스템 전반에 다크 모드(Dark Mode)를 지원합니다. 사용자는 헤더의 버튼을 통해 테마를 전환할 수 있으며, 설정은 브라우저에 저장되어 유지됩니다.
 
 ### Proposed Changes
 - **Styles**: Tailwind CSS의 `darkMode: 'class'` 설정을 활성화하고 전역 테마 변수를 정의합니다.
 - **State Logic**: `localStorage`와 연동되는 `useTheme` 커스텀 훅을 통해 테마 상태를 관리합니다.
 - **UI Components**:
     - **Header**: 테마 전환(Sun/Moon) 버튼 추가.
     - **Common**: `dark:` 클래스 접두사를 사용하여 배경, 텍스트, 보더 색상을 어두운 톤으로 조정합니다.
     - **ECharts**: 테마 변경 시 차트 테마(Dark/Light)도 동적으로 전환되도록 처리합니다.
 
 ### Verification Plan
 1. 테마 토글 버튼 작동 여부 및 즉각적인 UI 반영 확인.
 2. 새로고침 시 테마 유지 확인.
 3. 전반적인 UI 컴포넌트(모달, 테이블, 차트) 시인성 검토.
---

## Phase 32: Dark Mode Implementation [Completed]

### Goal
사용자가 라이트 모드와 다크 모드를 자유롭게 전환할 수 있도록 시스템 전반에 테마 기능을 도입합니다. 사용자 설정은 저장되어 새로고침 후에도 유지되어야 합니다.

### Implemented Changes

#### 1. Configuration & Utilities
- **Tailwind CSS**: `darkMode: 'class'` 설정을 통해 클래스 기반 다크 모드 활성화.
- **useTheme Hook**: 테마 상태 (`light` / `dark`) 관리, `localStorage` 연동, DOM 클래스 조작 로직 구현.
- **Global Styles**: `index.css`에 기본 배경/글자색 및 매끄러운 전환을 위한 `transition` 효과 추가.

#### 2. Frontend Components
- **App Layout**: 헤더에 테마 전환 버튼 (Sun/Moon 아이콘) 추가, 사이드바 및 레이아웃에 다크 모드 스타일 적용.
- **Dashboard**: ECharts 차트 테마를 현재 모드에 맞게 동적으로 변경하도록 구현 (`backgroundColor: 'transparent'`).
- **Tester / LogViewer**: 입력 필드, 코드 블록, 결과 표시창 등 주요 컴포넌트에 통일된 다크 모드 스타일 적용.
- **OpenApiManager**: 복잡한 모달, 탭, 에디터 및 미리보기 영역까지 모든 UI 요소에 다크 모드 적용 완료.

### Verification Results
1. **Persistence**: 테마 변경 후 새로고침 시 설정이 유지됨을 확인.
2. **Component Unity**: 모든 메뉴 및 모달에서 일관된 다크 테마가 적용됨을 확인.
3. **Chart Integration**: 대시보드 진입 시 및 테마 전환 시 차트 색상이 즉시 반응함을 확인.

---

## Phase 33: OpenAPI Meta Management (Admin Only) [Completed]

### Goal
관리자(Admin)가 OpenAPI의 카테고리와 태그를 체계적으로 관리(이름 수정, 안전한 삭제)할 수 있는 전용 인터페이스를 제공하고, 데이터 정합성을 유지합니다.

### Implemented Changes
- **Database (`src/db/openapi_meta.py`)**: 
    - 카테고리/태그 이름 수정을 위한 `update_openapi_category`, `update_openapi_tag` 구현.
    - 삭제 시 연관된 OpenAPI 존재 여부를 체크하는 안전 장치가 포함된 `delete_openapi_category`, `delete_openapi_tag` 구현.
    - 특정 메타데이터에 속한 API 목록 조회를 위한 `get_openapi_by_meta` 구현.
- **Backend API**: `src/routers/openapi.py`에 메타데이터 관리 전용 엔드포인트 추가.
- **Frontend**: 
    - `OpenApiMetaManager.tsx`: 카테고리/태그 목록, 인라인 수정, 연관 API 조회 기능을 포함한 어드민 전용 컴포넌트 구축.
    - `OpenApiManager.tsx`: 기존의 중복된 통계 요약 카드 UI 제거 및 코드 정리.
- **Integration**: `App.tsx` 사이드바 메뉴 연동 및 타입 안정성 강화.

---

## Phase 34: OpenAPI PDF Export Refinement [Completed]

### Goal
PDF 스펙 문서의 정보력을 높이기 위해 문서를 다운로드할 때 해당 API의 카테고리와 태그 정보를 포함하도록 보완합니다.

### Implemented Changes
- **Backend (`src/db/openapi.py`)**: `get_openapi_by_tool_id` 함수를 수정하여 카테고리명과 태그 목록을 조인 테이블을 통해 함께 조회하도록 최적화했습니다.
- **Utils (`src/utils/pdf_generator.py`)**: 
    - PDF 내 "Basic Information" 섹션에 'Category'와 'Tags' 항목을 추가했습니다.
    - 태그 정보가 없는 경우에도 레이아웃이 깨지지 않도록 예외 처리 로직을 적용했습니다.
- **Frontend**: `OpenApiConfig` 타입 인터페이스를 업데이트하여 카테고리명과 태그 데이터를 명시적으로 정의하고 `any` 타입을 제거했습니다.

### Verification Results
1. PDF 문서 내 카테고리와 태그 정보가 정상적으로 표시됨을 확인.
2. 관리자 메뉴를 통한 카테고리/태그 수정 결과가 실시간으로 반영됨을 확인.
3. 연관된 API가 있는 메타데이터 삭제 시도시 안내 메시지와 함께 삭제가 방지됨을 확인.

---


## Phase 35: DB 백업 및 복구 기능 (관리자 전용)

### 목표
서버 내 `backups/` 디렉토리에 DB 스냅샷을 저장하고, 관리자가 목록에서 선택하여 특정 시점으로 복구할 수 있는 기능을 구현합니다.

### 상세 요구사항
1. **백업 (Backup)**:
   - 실행 시점의 `agent_mcp.db` 파일을 `backups/` 디렉토리에 복사.
   - 포맷: `YYYY-MM-DD_HH-mm.db` (예: 2026-02-19_22-24.db)
2. **목록 조회 (List)**:
   - `backups/` 디렉토리 내의 파일 목록을 날짜 역순으로 제공.
3. **복구 (Restore)**:
   - 관리자가 목록에서 파일을 선택하여 복구 요청.
   - 현재 DB를 다른 이름으로 안전하게 보관 후, 선택한 파일로 교체.
   - **주의**: SQLite 연결 상태에 따라 서버 프로세스 재시작이 필요할 수 있으나 유지 가능한 방식으로 시도.

### Proposed Changes

- [x] 상세 구현 계획 수정 반영 (implementation_plan.md)
- [x] 1. Backend: DB 백업 생성 API 구현 (`POST /api/admin/db/backup`)
- [x] 2. Backend: 백업 파일 목록 조회 API 구현 (`GET /api/admin/db/backups`)
- [x] 3. Backend: 특정 파일 선택 복구 API 구현 (`POST /api/admin/db/restore/{filename}`)
- [x] 4. Frontend: DB 백업 관리 UI 구현 (목록, 생성 버튼)
- [x] 5. 기능 테스트 및 검증
- **`DELETE /api/admin/db/backups/{filename}`**: (선택) 불필요한 백업 삭제.

#### 2. Frontend (`src/frontend/src/components/DbBackupManager.tsx` 신설)
- **UI**:
  - [백업 생성] 버튼.
  - 백업 목록 테이블 (파일명, 생성일시, 크기, [복구] 버튼, [삭제] 버튼).
- **Navigation**: `App.tsx` 메뉴에 추가.

### Verification Plan
1. **Backup Test**: 클릭 시 DB 파일이 정상적으로 다운로드되는지 확인.
2. **Restore Test**: 다른 상태의 DB 파일을 업로드하여 복구 후 데이터 확인.
3. **Security Test**: 일반 유저 접근 차단 확인.
---

## Phase 36: 내 정보 관리 화면 도구 사용 이력 보완 [Completed]

### 목표
내 정보(My Page) 화면에서 기존의 OpenAPI 사용량뿐만 아니라, 일반 MCP 도구(add, subtract 등)의 사용 현황도 확인할 수 있도록 기능을 보완합니다.

### 구현 내용
- **DB Layer (`src/db/mcp_tool_usage.py`)**: 특정 사용자의 오늘 날짜 기준 도구별 사용 횟수를 집계하는 `get_specific_user_tool_usage` 함수를 추가했습니다.
- **Backend API (`src/routers/mcp.py`)**: `/api/mcp/my-usage` 엔드포인트가 `tool_usage` 배열을 추가로 응답하도록 수정했습니다.
- **Frontend UI (`MyPage.tsx`)**: 
    - `Terminal` 아이콘과 함께 "오늘의 일반 MCP 도구 사용 현황" 카드를 새롭게 추가했습니다.
    - 전체 한도 대비 사용률을 시각화하는 게이지 바와 도구별 상세 횟수 목록을 구현했습니다.
    - 다크 모드 스타일이 완벽하게 적용되도록 `transition` 및 색상 토큰을 정비했습니다.

### 검증 결과
1. 일반 MCP 도구 실행 후 My Page 진입 시 실시간으로 사용 횟수가 반영됨을 확인.
2. OpenAPI 사용량 카드와 일반 도구 사용량 카드가 나란히 배치되어 일관된 UX 제공 확인.
3. 무제한(-1) 한도일 경우 '∞' 표시 및 게이지 바 0% 고정 로직 정상 동작 확인.
---

## Phase 37: 대시보드 통계 새로고침 기능 추가 [Completed]

### 목표
메인 대시보드에서 도구 사용 및 사용자별 요청 통계 데이터를 페이지 전체 새로고침 없이 수동으로 갱신할 수 있는 기능을 추가합니다.

### 구현 내용
- **Hooks (`useMcp.ts`)**: 내부 `fetchStats` 함수를 외부에서 호출 가능하도록 `refreshStats`라는 이름으로 `UseMcpResult`에 포함하여 반환합니다.
- **App (`App.tsx`)**: `useMcp`에서 추출한 `refreshStats`를 `Dashboard` 컴포너트의 `onRefresh` prop으로 전달합니다.
- **UI (`Dashboard.tsx`)**:
    - 대시보드 상단에 표준 헤더 디자인을 적용했습니다. (`Activity` 아이콘, 타이틀, 설명문 포함)
    - `RotateCw` 아이콘을 활용한 '새로고침' 버튼을 추가했습니다.
    - 버튼 클릭 시 `animate-spin` 애니메이션과 `disabled` 처리를 통해 사용자에게 진행 상태를 시각적으로 전달합니다.

### 검증 결과
1. 새로고침 버튼 클릭 시 네트워크 탭에서 `/api/mcp/stats` 호출 및 데이터 갱신 확인.
2. 도구 실행 후 대시보드로 돌아와 새로고침 시 즉각적으로 차트의 수치가 업데이트됨을 확인.
3. 다크 모드 환경에서도 버튼 및 헤더 디자인이 조화롭게 표시됨을 확인.