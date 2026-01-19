# Walkthrough - MCP Tool Usage Tracking

MCP Tool 사용 이력을 사용자별로 추적하고 DB에 저장하는 기능을 구현했습니다.

## Changes

### 1. Database Schema
- **[NEW] Table `h_mcp_tool_usage`**
    - `user_uid` (FK), `tool_nm`, `tool_params`, `tool_success`, `tool_result`, `reg_dt` 컬럼 포함.
- **[MODIFY] `src/db_manager.py`**
    - `init_db()`: 테이블 생성 쿼리 추가.
    - `log_tool_usage()`: 이력 저장 함수 추가.

### 2. Backend Logic
- **[MODIFY] `src/sse_server.py`**
    - `login` API: 응답에 `uid` 포함.
    - `call_tool` 핸들러: `_user_uid` 파라미터를 받아 `log_tool_usage()` 호출.

### 3. Frontend Logic
- **[MODIFY] `src/frontend/src/hooks/useMcp.ts`**
    - `sendRpc` 함수에서 `tools/call` 메서드일 경우, 로컬 스토리지의 세션 정보에서 `uid`를 추출하여 `_user_uid` 파라미터로 주입.

## Verification Results

### 1. Tool Execution & Logging
- 웹 인터페이스에서 `add` Tool 실행 시 DB에 정상 저장됨을 확인.
- `src/view_tool_usage.py` 스크립트로 이력 조회 성공.

```text
====================================================================================================
Time                 | User (ID)       | Tool         | Success | Params
====================================================================================================
2026-01-19 11:15:23  | 홍길동 (user1)   | add          | SUCCESS | {'a': 10, 'b': 20}
```

### 2. User Identification
- 로그인한 사용자의 UID가 정확히 매핑되는지 확인.
- 로그아웃 상태이거나 세션에 UID가 없으면 로깅되지 않음(Warn 처리).
