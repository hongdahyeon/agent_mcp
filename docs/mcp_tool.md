# MCP 도구 시스템 아키텍처 및 운영 정책

이 문서는 본 프로젝트의 **MCP(Model Context Protocol) 도구 시스템** 구성과 보안 정책, 그리고 **연결 방식별(SSE vs Stdio) 차이점**에 대해 설명합니다.

---

## 1. 도구의 종류

### 1) 정적 생성 도구 (Static Tools)
소스 코드 내에 고정되어 정의된 도구들입니다.
- **Stdio 방식 연동**: `src/server.py`를 통해 Claude Desktop 등 로컬 앱과 연결됩니다.
- **SSE 방식 연동**: `src/mcp_server_impl.py`에 정의되어 웹 관리자 페이지의 `/sse` 엔드포인트를 통해 접근합니다.
- **주요 도구**: `send_email`, `get_current_time`, `get_user_info` 등

### 2) 동적 생성 도구 (Dynamic Tools)
운영 중에 관리자가 DB를 통해 직접 생성하고 즉시 반영할 수 있는 도구들입니다.
- **저장 위치**: `h_custom_tool` 테이블에 SQL 또는 Python 스크립트 형태로 정의됩니다.
- **로딩 방식**: 서버 시작 시 `src/dynamic_loader.py`를 통해 자동으로 로드되어 등록됩니다.

### 3) 통합 사용
사용자(또는 AI 에이전트)는 정적 도구와 동적 도구를 구분 없이 하나의 인터페이스에서 통합하여 사용할 수 있습니다.

---

## 2. 보안 및 인증 정책

도구 시스템은 무분별한 도구 사용을 방지하기 위해 엄격한 토큰 인증을 수행합니다.

### 1) 도구 조회 (List Tools)
- **/sse (Web)**: **토큰 필수**. 유효한 토큰이 없으면 연결 자체가 차단(401)되어 도구 목록을 볼 수 없습니다.
- **Stdio (Claude)**: **토큰 없이 가능**. 클라이언트(Claude)가 도구의 존재를 인지할 수 있도록 목록 조회는 허용하되, 실사용 시점에 차단합니다.

### 2) 도구 사용 (Use/Call Tool)
- **공통 사항**: **토큰 필수**. Stdio와 SSE 방식 모두 유효한 사용자 토큰이 없으면 실행이 거부됩니다.
- **차단 방식**: 
    - 정적 도구: `call_tool` 함수 진입 시점에 예외(Exception) 발생
    - 동적 도구: `@audit_log` 데코레이터 단에서 예외 발생

### 3) 권한 체크 (Role-based Access)
- **관리자 전용**: 특정 도구(예: `get_user_info`)는 토큰이 있더라도 사용자 권한이 `ROLE_ADMIN`인 경우에만 결과값을 반환합니다. 일반 유저는 접근 권한 부족 메시지를 받게 됩니다.

---

## 3. 연결 방식별 차이점 요약

| 항목 | SSE (Server-Sent Events) | Stdio (Standard I/O) |
| :--- | :--- | :--- |
| **주요 클라이언트** | 웹 브라우저 (React 관리자 페이지) | Claude Desktop, IDE 플러그인 등 |
| **통신 프로토콜** | HTTP + SSE (포트 8000 사용) | 프로세스 표준 입출력 (포트 미사용) |
| **접근 주소** | `http://localhost:8000/sse` | 로컬 `python` 실행 환경 |
| **인증 방식** | Query Parameter (`?token=...`) | 환경변수 (`token`) |
| **보안 강도** | 연결 시점부터 토큰 검증 | 실행 시점에 개별 도구별 검증 |
| **사용 파일** | `src/sse_server.py` | `src/server.py` |

---

## 4. SSE 방식에서 쿼리 파라미터(?token=...)를 사용하는 이유

본 프로젝트의 **웹 프론트엔드**와 **MCP 서버** 간의 **SSE 연결**에서 인증 헤더(Authorization) 대신 URL 쿼리 파라미터를 사용하는 이유는 다음과 같습니다.

### 1) 브라우저 API 제약 (EventSource)
브라우저 표준 인터페이스인 `EventSource`(SSE 클라이언트)는 보안 및 설계상 **커스텀 HTTP 헤더(Authorization 등)를 직접 추가하는 기능을 지원하지 않습니다.** 따라서 스트림을 열 때 유일하게 정보를 전달할 수 있는 통로인 URL의 쿼리 스트링을 인증 수단으로 활용합니다.

### 2) 통합 토큰 관리 (mcp_api_token)
- **로그인 시점**: 사용자가 로그인에 성공하면 서버로부터 JWT 토큰을 발급받으며, 이를 브라우저의 `localStorage`에 `mcp_api_token`이라는 키로 저장합니다.
- **연결 시점**: 프론트엔드의 `useMcp` 훅은 이 `mcp_api_token`을 읽어와 `/sse?token=[JWT]` 형태로 요청을 보냅니다.
- **호환성**: 서버(`sse_server.py`)는 이 쿼리 파라미터를 읽어 JWT 검증을 수행하거나, 외부 연동용 Access Token(`sk_...`)인지를 판별하여 동일한 인증 체계를 유지합니다.

---

## 5. 도구 이력 관리 (Audit Log)
모든 도구 사용 기록은 `h_mcp_tool_usage` 테이블에 저장됩니다.
- **기록 내용**: 누가(user_uid), 어떤 도구를(tool_name), 어떤 인자로(params), 성공 여부(is_success), 결과 요약(result_val)
- **참고**: 인증되지 않은 시도(Guest 시도)는 이력에 남지 않으며 원천 차단됩니다.
