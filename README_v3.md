# MCP Agent Tool Manager (v3.0)

이 프로젝트는 **MCP (Model Context Protocol) Agent**가 사용할 도구(Tools)를 관리하고, 이를 웹 인터페이스에서 테스트, 모니터링 및 제어할 수 있는 관리형 서버 애플리케이션입니다.

> **v3.0 업데이트**: 사용자 인증, 권한 관리, DB 연동, OpenAPI 프록시, 동적 도구 생성, 메일 발송 및 파일 업로드 기능이 통합되었습니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 도구 관리 및 실행
- **기본 도구 (Strict Tools)**: `add`, `subtract`, `get_user_info`, `hellouser` 등 표준 도구 기본 제공.
- **동적 도구 (Dynamic Tools)**: 관리자가 웹 콘솔을 통해 실시간으로 새로운 도구를 생성하고 등록할 수 있습니다.
- **도구 테스터**: 프론트엔드 대시보드에서 도구를 직접 실행하고 결과를 확인할 수 있는 테스터 제공.

### 2. OpenAPI Proxy 및 외부 연동
- **프록시 서비스**: `http://{서버_IP}:8000/api/execute/{tool_id}` 경로를 통해 외부에서 OpenAPI 도구에 접근 가능합니다.
- **인증 방식**: 헤더(`Authorization: Bearer <token>`) 또는 쿼리스트링(`?token=<token>`)을 통한 접근 제어.
- **로그 및 통계**: 도구별 호출 이력, 에러 로그, 성공률 등을 관리자 페이지에서 실시간으로 확인 가능합니다.

### 3. 고도화된 사용량 제한 (Usage Limiting)
- **계층적 제한 정책 적용**: 서비스의 안정성을 위해 다음과 같은 우선순위로 사용량을 제한합니다.
    1. **Token**: 특정 액세스 토큰별 개별 제한 (최상위)
    2. **User**: 특정 사용자 계정별 일일 누적 사용량 제한
    3. **Role**: 사용자 권한(ADMIN, USER)별 기본 사용량 제한

### 4. 메일 발송 시스템 (Email Engine)
- **발송 경로**: Admin 페이지 직접 발송, SSE API를 통한 외부 요청 발송, AI Agent를 통한 자동 발송 지원.
- **예약 발송**: 특정 시간에 메일이 발송되도록 예약 스케줄링 기능을 제공합니다.
- **이력 관리**: 발송 상태(PENDING, SENT, FAILED) 및 에러 메시지 추적.

### 5. 파일 업로드 및 관리 (File Uploader)
- **배치 관리**: 여러 개의 파일을 업로드할 때 동일한 `batch_id`를 부여하여 관련 파일을 묶음 단위로 관리합니다.
- **OpenAPI 연동**: OpenAPI 호출 시 업로드된 파일을 파라미터로 전달하거나 연동할 수 있습니다.

---

## 🛠 시스템 아키텍처

### Frontend (React + TypeScript)
- **Vite**, **Tailwind CSS v4** 기반의 모던 UI.
- 대시보드, 도구 관리, 사용자 관리, 로그 뷰어, 보안 설정 메뉴 제공.

### Backend (FastAPI + Python)
- **SSE (Server-Sent Events) Server**: MCP 클라이언트와의 실시간 통신 및 웹 인터페이스 서빙.
- **SQLite DB**: `agent_mcp.db`를 사용하여 사용자 정보, 도구 설정, 사용 이력, 메일 로그 등을 영구 저장.

---

## 📦 설치 및 실행 (Setup)

### 1. 의존성 설치
```bash
# 가상환경 활성화 (권장)
.\venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt
```

### 2. 서버 실행
```bash
python src/sse_server.py
```
- **Web Console**: `http://localhost:8000`
- **관리자 계정**: `admin` / `1234` (기본값)

---

## 🔐 인증 및 보안 (Authentication)

1. **웹 API (JWT)**: 웹 브라우저 로그인 시 발급되는 세션용 토큰입니다.
2. **액세스 토큰 (Access Token)**: 외부 시스템연동을 위한 `sk_...` 형식의 영구 토큰입니다. [보안 토큰 관리] 메뉴에서 발급 가능합니다.

### Claude Desktop 연동 설정
`claude_desktop_config.json` 예시:
```json
{
  "mcpServers": {
    "agent-mcp": {
      "command": "python.exe",
      "args": ["{프로젝트경로}/src/server.py"],
      "env": {
        "token": "sk_your_access_token_here"
      }
    }
  }
}
```

---

## 📑 변경 사항 (Changelog)
- **v2.0**: 
  - 계정 잠금 기능 (5회 실패 시 잠금) 추가.
  - OpenAPI Proxy 및 동적 도구 생성 시스템 구축.
  - 예약 메일 발송 및 파일 배치 업로드 기능 구현.
  - UI 레이아웃 최적화 및 한국어 지원 강화.
- **v1.0**: 초기 MCP 서버 및 기본 도구 셋 구현.
