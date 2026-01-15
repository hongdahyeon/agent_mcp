# MCP Agent Tool Manager

이 프로젝트는 **MCP (Model Context Protocol) Agent**가 사용할 도구(Tools)를 관리하고, 이를 웹 인터페이스에서 테스트 및 모니터링할 수 있는 서버 애플리케이션입니다.

## 1. 프로젝트 개요 (Core Concept)
- **역할**: LLM Agent가 외부 기능을 수행할 수 있도록 표준화된 프로토콜(MCP)을 통해 도구(Tool)를 제공합니다.
- **주요 기능**:
  - `add`, `subtract`, `hellouser` 등 도구 정의 및 실행
  - SSE (Server-Sent Events) 및 JSON-RPC 기반 통신
  - 도구 사용 이력 로깅 및 실시간 통계 대시보드 제공

## 2. 프로젝트 구조 (Structure)

### 모던 웹 인터페이스 (Current Active)
> **상태**: **운영 중 (Active)**
> **위치**: `src/frontend/`
> **기술 스택**: Vite, React, TypeScript, Tailwind CSS v4

유지보수성과 확장성을 위해 재구축된 메인 관리 화면입니다.
- **`src/App.tsx`**: 앱 진입점 및 레이아웃 관리.
- **`src/hooks/useMcp.ts`**: SSE 연결, JSON-RPC 통신, 상태 관리를 담당하는 핵심 훅.
- **주요 컴포넌트**:
  - `Dashboard`: 서버 상태, 차트, 실시간 로그.
  - `Tester`: 도구 목록 자동 로드, 동적 입력 폼 생성, 실행 결과 JSON 뷰.
  - `LogViewer`: 일별 로그 파일(`logs/yyyy-mm-dd.txt`) 조회.

### 레거시 웹 인터페이스 (Legacy)
> **상태**: 사용 안 함 (Deprecated since 2026-01-15)
> **위치**: `src/web/`
> **기술 스택**: HTML, Vanilla JavaScript, CSS

초기 프로토타입으로, 현재는 참고용으로만 유지됩니다.

## 3. 도구 목록 (Tools)
서버는 다음과 같은 기본 도구를 제공합니다:
- `add(a, b)`: 두 숫자를 더합니다.
- `subtract(a, b)`: 두 숫자를 뺍니다.
- `hellouser(name)`: 사용자 이름을 입력받아 인사말을 반환합니다.

## 4. 설치 및 설정 (Setup)

### 1. 환경 설정
```bash
# 의존성 설치
pip install -r requirements.txt
```

### 2. Claude Desktop 설정 (Optional)
MCP 클라이언트(예: Claude Desktop)에서 이 서버를 사용하려면 설정 파일을 수정하세요.
- **위치**: `%APPDATA%\Claude\claude_desktop_config.json`
- **내용**:
```json
{
  "mcpServers": {
    "agent-mcp-tool": {
      "command": "python", 
      "args": ["ABSOLUTE_PATH_TO\\src\\server.py"]
    }
  }
}
```

## 5. 실행 방법 (Run)

### 1. MCP 서버 실행 (Backend)
FastAPI 서버를 구동하여 SSE 엔드포인트와 정적 파일(Frontend 빌드물)을 제공합니다.
```bash
python src/sse_server.py
# 또는
uvicorn src.sse_server:app --reload --port 8000
```
- **서버 주소**: `http://localhost:8000` (React 앱 자동 실행)
- **SSE 엔드포인트**: `http://localhost:8000/sse`

### 2. React 프론트엔드 개발 모드 (Optional)
UI 코드 수정 시 Hot Reload 기능을 사용하려면 별도 터미널에서 실행하세요.
```bash
cd src/frontend
npm run dev
```
- **개발 서버**: `http://localhost:5173`
