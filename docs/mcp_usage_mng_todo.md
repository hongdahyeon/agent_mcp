# MCP Tool 사용량 관리 및 보안 강화 계획

이 문서는 현재 식별된 MCP 서버의 보안 취약점(인증 부재)을 해결하고, 사용자별 도구 사용량을 효과적으로 관리/제한하기 위한 로직과 할 일(Todo)을 정리합니다.

## 1. 현황 및 문제점
- **현재 상태**: MCP 서버(`sse_server.py`)는 클라이언트가 요청 시 보내는 `_user_uid` 인자값에 의존하여 로그를 남기고 있습니다.
- **취약점**: 
    - `/sse` 및 `/messages` 엔드포인트에 인증 절차가 없습니다.
    - 악의적인 사용자가 다른 사람의 `_user_uid`를 사칭하여 도구를 실행해도 서버는 이를 검증할 방법이 없습니다.
    - 사용량 제한(Quota) 기능이 없어 리소스 남용 위험이 있습니다.

## 2. 보안 강화 방안 (Security Strategies)

### A. 연결 단계 인증 (Connection Authentication)
MCP 클라이언트(Claude Desktop 등)가 서버에 연결할 때 **인증 토큰**을 반드시 제출하도록 강제합니다.

1.  **HTTP Header 인증**:
    - `Authorization: Bearer <access_token>` 헤더 검사.
2.  **Query Parameter 인증** (SSE 특성상 권장):
    - 예: `http://server:8000/sse?token=sk_v1_...`
    - SSE(Server-Sent Events) 연결 시 헤더 설정이 제한적인 클라이언트가 많아 쿼리 파라미터 방식이 호환성이 좋습니다.

### B. 사용자 바인딩 (User Binding)
- **세션-유저 매핑**: `/sse` 연결 성공 시, 해당 자격증명(Token)에 해당하는 `user_uid`를 서버 메모리(또는 세션 스토리지)에 저장합니다.
- **신뢰할 수 있는 식별자**: `call_tool` 실행 시, 클라이언트가 인자로 보내는 `_user_uid`를 믿지 않고, **연결 시 검증된 세션의 유저 정보**를 사용합니다.

### C. 사용량 제한 (Rate Limiting & Quotas)
- **Token Bucket 알고리즘** 또는 **일일 사용량 카운트**:
- 도구 실행 직전(`call_tool` 진입 시점)에 해당 유저의 금일 사용량을 조회하고, 한도 초과 시 에러(`McpError`)를 반환합니다.

## 3. 구현 로직 (Proposed Logic)

### 3.1. DB 스키마 추가/변경

#### `h_user_token`
사용자별 API 접근 토큰 발급/관리 테이블
- `user_uid`, `token_value`, `expired_at`, `is_active`

#### `h_mcp_tool_limit` (상세 명세)
사용자 등급(Role) 또는 개별 사용자(User)별로 도구 사용량을 제한하기 위한 정책 테이블입니다.

| 컬럼명 | 타입 | 설명 | 예시 값 |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER PK | 고유 ID | 1 |
| `target_type` | VARCHAR | 제한 대상 유형 ('ROLE', 'USER') | 'ROLE' |
| `target_id` | VARCHAR | 대상 식별자 (Role명 또는 User ID) | 'ROLE_USER', 'hong123' |
| `limit_type` | VARCHAR | 제한 기간 단위 ('DAILY', 'MONTHLY') | 'DAILY' |
| `max_count` | INTEGER | 최대 허용 횟수 | 100 |
| `description` | VARCHAR | 설명 | '일반 사용자 일일 제한' |

**작동 방식 예시:**
1.  **우선순위 적용**:
    - 도구 실행 시, 먼저 `target_type='USER'`이고 `target_id='내아이디'`인 정책이 있는지 확인합니다. (개별 설정 우선)
    - 없다면, `target_type='ROLE'`이고 `target_id='내권한(ROLE_USER)'`인 정책을 찾습니다.
2.  **카운트 비교**:
    - `limit_type='DAILY'`인 경우, `h_mcp_tool_usage` 테이블에서 오늘 날짜(`reg_dt` 기준)의 내 사용 횟수를 조회합니다.
    - `사용 횟수 >= max_count`이면 실행을 거부합니다.

### 3.2. 서버 미들웨어 / 의존성 주입
```python
# 가상 코드 예시
async def get_current_user(token: str):
    user = db.find_user_by_token(token)
    if not user:
        raise HTTPException(401, "Invalid Token")
    return user

@app.get("/sse")
async def handle_sse(request: Request, token: str):
    user = await get_current_user(token)
    # SSE 세션에 user 정보 저장 (ContextVar 등 활용)
```

## 4. 실행 계획 (To-Do List)

### Phase 1: 인증 기반 마련
- [ ] **DB 설계**: `h_user_token` 테이블 생성 및 토큰 발급 로직 구현 (로그인 시 발급 등)
- [ ] **SSE 엔드포인트 수정**: `token` 쿼리 파라미터 수신 및 유효성 검증 로직 추가
- [ ] **Context 관리**: 요청(Request) 컨텍스트에서 유저 정보를 `call_tool` 함수까지 전달할 수 있는 메커니즘 구축 (전역 변수 지양, ContextVar 활용 권장)

### Phase 2: 도구 실행 보안 적용
- [ ] **Argument 의존성 제거**: `call_tool`에서 `arguments.get("_user_uid")` 로직을 제거하고, 검증된 `user_uid` 사용으로 대체
- [ ] **권한 체크**: 특정 도구(예: `get_user_info`)는 관리자 권한이 필요한지 체크하는 데코레이터나 로직 추가

### Phase 3: 사용량 제한 구현
- [ ] **DB 설계**: `h_mcp_tool_limit` 테이블 생성 및 기초 데이터(Seed Data) 입력
- [ ] **Pre-execution Hook**: 도구 실행 전 `check_usage_limit(user_uid)` 함수 실행
- [ ] **사용자 UI**: 사용자가 자신의 남은 횟수나 토큰을 확인할 수 있는 '내 정보' 페이지 개발

## 5. 클라이언트 연동 가이드 (User Guide)
사용자에게 MCP 서버 주소를 안내할 때 다음과 같이 토큰이 포함된 주소를 제공해야 합니다.
- **AS-IS**: `http://my-server.com/sse`
- **TO-BE**: `http://my-server.com/sse?token=<User_Personal_Token>`
