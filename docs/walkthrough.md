# Walkthrough - MCP Tool Usage Tracking (Admin View)

관리자 전용 MCP Tool 사용 이력 조회 기능을 구현했습니다.

## Changes

### 1. Backend API
- **[MODIFY] `src/db_manager.py`**
    - `get_tool_usage_logs(page, size)`: `h_mcp_tool_usage`와 `h_user` 테이블을 조인하여 페이징 조회.
- **[MODIFY] `src/sse_server.py`**
    - `GET /api/mcp/usage-history`: 관리자 권한(`X-User-Id` 헤더 기반) 체크 후 이력 반환.
    - **[FIX]** API 정의 순서를 `app.mount("/", ...)` 보다 상위로 이동하여 404 에러 해결.

### 2. Frontend UI
- **[NEW] `src/frontend/src/components/UsageHistory.tsx`**
    - 테이블 형태로 날짜, 사용자, 도구명, 결과 등을 표시.
    - 페이지네이션(Previous/Next) 기능 구현.
- **[MODIFY] `src/frontend/src/App.tsx`**
    - `UsageHistory` 컴포넌트 Import.
    - `ROLE_ADMIN`일 경우 사이드바에 '사용 이력' 메뉴 추가.

## Verification
- 관리자(`admin`) 계정으로 로그인 후 '사용 이력' 메뉴 접근 성공.
- 데이터 테이블 조회 정상 확인.
- 일반 사용자(`user`) 로그인 시 메뉴 미노출 및 API 접근 차단(403) 확인.
