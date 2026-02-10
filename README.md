# MCP Agent Tool Manager (v2.0)

이 프로젝트는 **MCP (Model Context Protocol) Agent**가 사용할 도구(Tools)를 관리하고, 이를 웹 인터페이스에서 테스트, 모니터링 및 제어할 수 있는 관리형 서버 애플리케이션입니다.

> **v2.0 업데이트**: 사용자 인증, 권한 관리, DB 연동, 토큰 발급/관리 기능이 추가되었습니다.

## 1. 프로젝트 개요 (Core Concept)
- **역할**: LLM Agent가 외부 기능을 수행할 수 있도록 표준화된 프로토콜(MCP)을 통해 도구(Tool)를 제공합니다.
- **주요 기능**:
  - **도구 실행**: `add`, `subtract`, `hellouser`, `get_user_info` 등 도구 제공
  - **표준 통신**: SSE (Server-Sent Events) 및 JSON-RPC 기반 통신
  - **웹 관리 콘솔**: 실시간 대시보드, 도구 테스터, 로그 뷰어 제공
  - **보안 및 관리**: 사용자 로그인, 토큰 기반 인증, 사용 이력 추적 (New)

## 2. 시스템 아키텍처 (Architecture)

### Frontend (User Interface)
- **위치**: `src/frontend/`
- **기술 스택**: Vite, React, TypeScript, Tailwind CSS v4
- **주요 기능**:
  - **대시보드**: 시스템 현황 및 실시간 로그 모니터링
  - **도구 테스터**: 도구 목록 자동 로드 및 실행 테스트
  - **내 정보 (My Page)**: 계정 정보 확인 및 **MCP 연결 토큰 발급** (New)
  - **관리자 기능**: 사용자 관리, DB 스키마 조회, 도구 사용 이력 조회 (New)

### Backend (MCP Server)
- **위치**: `src/` (`sse_server.py`, `server.py`)
- **기술 스택**: Python, FastAPI, SQLite
- **주요 기능**:
  - **DB 관리**: `db_manager.py`를 통한 사용자, 이력, 토큰 데이터 관리
  - **인증 처리**: `utils/auth.ts` 및 세션/토큰 기반 인증 로직
  - **정적 서빙**: React 빌드 파일 호스팅

### Database (SQLite)
- **위치**: `agent_mcp.db` (자동 생성)
- **주요 테이블**:
  - `h_user`: 사용자 계정 및 권한 (ROLE_USER, ROLE_ADMIN)
  - `h_login_hist`: 로그인 이력
  - `h_mcp_tool_usage`: 도구 실행 이력 로그
  - `h_mcp_tool_limit`: 사용자별 도구 사용량 제한 정책

## 3. 도구 목록 (Tools)
서버는 다음과 같은 기본 도구를 제공합니다:
- `add(a, b)`: 두 숫자를 더합니다.
- `subtract(a, b)`: 두 숫자를 뺍니다.
- `hellouser(name)`: 사용자 이름을 입력받아 인사말을 반환합니다.
- `get_user_info(_user_uid)`: (DB연동) 특정 사용자의 정보를 조회합니다.

## 4. 설치 및 실행 (Setup & Run)

### 0. 가상 환경 활성화
.\venv\Scripts\activate

### 1. 환경 설정 및 설치
```bash
# 의존성 설치
pip install -r requirements.txt
python -m pip install -r requirements.txt
```

### 2. 프로젝트 실행
통합 서버(Backend + Frontend Hosting)를 실행합니다.
```bash
python src/sse_server.py
# 또는
uvicorn src.sse_server:app --reload --port 8000
```
- **관리 콘솔**: `http://localhost:8000` (자동 실행됨)
  - 초기 관리자 ID: `admin` / PW: `1234`
  - 테스트 사용자 ID: `user` / PW: `1234`

### 3. 인증 및 보안 (Authentication)

본 프로젝트는 두 가지 방식의 인증을 지원합니다.

1.  **사용자 인증 (Web Login)**:
    -   **JWT (JSON Web Token)** 기반 인증.
    -   웹 콘솔 로그인 시 발급되며, 브라우저 세션 및 일반적인 API 호출에 사용됩니다.
    -   유효기간: 12시간 (재로그인 필요).

2.  **외부 시스템 연동 (External Access)**:
    -   **Access Token (`h_access_token`)** 기반 인증.
    -   관리자 페이지의 [보안 토큰 관리: h_access_token] 메뉴에서 발급받은 영구(Long-Lived) 토큰입니다.
    -   CI/CD, 외부 앱, 스크립트 등에서 MCP 서버에 접속할 때 사용합니다.
    -   이 토큰으로 접속 시 **'External System' (관리자 권한)**으로 매핑됩니다.

### 4. Claude Desktop 연동 (Client Setup)

#### A. JWT 사용 (일회성 테스트용)
로그인 후 발급받은 JWT를 사용하여 연결할 수 있습니다. (토큰 만료 시 재설정 필요)

#### B. Access Token 사용 (권장)
관리자 페이지에서 발급받은 `sk_...` 형식의 토큰을 사용하면 만료 걱정 없이 사용할 수 있습니다.

클라이언트 설정 시, 발급받은 **Token**을 환경변수로 주입해야 합니다.

설정 파일 (`%APPDATA%\Claude\claude_desktop_config.json`) 예시:
```json
{
  "mcpServers": {
    "agent-mcp": {
      "command": "{venv\\Scripts\\python.exe}",
      "args": [
        "{server.py path}"
      ],
      "env": {
        "token": "{token}"
      }
    }
  }
}
```

## 5. 주요 변경 사항 (Changelog)
- **v2.0 (Current)**:
  - SQLite DB 구축 및 스키마 설계 (`h_user`, `h_token` 등)
  - 로그인 및 세션 유지 기능 구현
  - 관리자 전용 메뉴 (사용자 관리, DB 스키마, 사용 이력) 추가
  - On-Demand API 토큰 발급 시스템 구축
- **v1.5**: React 마이그레이션 (Frontend 고도화)
- **v1.0**: 초기 MCP 서버 및 기본 웹 테스터 구현
