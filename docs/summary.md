# Project Summary: MCP Agent Tool Manager

이 문서는 **MCP (Model Context Protocol) Agent**가 사용할 도구(Tools)를 관리하고 테스트하는 프로젝트의 구조와 역할을 설명합니다.

## 1. 프로젝트 개요 (Core Concept)
이 프로젝트는 **MCP Agent Tool Server**입니다.
- **역할**: LLM Agent가 외부 기능을 수행할 수 있도록 표준화된 프로토콜(MCP)을 통해 도구(Tool)를 제공하고 관리합니다.
- **기능**:
  - `add`, `subtract`, `hellouser` 등의 도구 기능을 정의하고 실행합니다.
  - SSE (Server-Sent Events) 및 JSON-RPC를 통해 클라이언트(Agent 또는 Web UI)와 통신합니다.
  - 도구의 사용 이력을 로깅하고 통계 정보를 제공합니다.

---

## 2. 레거시 웹 인터페이스 (Legacy)
> **상태**: 사용 안 함 (Deprecated since 2026-01-15)
> **위치**: `src/web/`
> **기술 스택**: HTML, Vanilla JavaScript, CSS

**Note**: 현재는 참고용으로만 유지하며, 실제 운영에는 사용되지 않습니다.

### 구조 설명
- **`index.html`**:
  - 단일 파일로 구성된 대시보드 및 테스트 화면.
  - Tailwind CSS를 CDN으로 로드하여 스타일링.
- **`client.js`**:
  - SSE 연결 및 차트(ECharts) 렌더링 로직 포함.
  - 도구 실행 및 로그 표시 기능이 하드코딩된 형태로 구현됨.

---

## 3. 모던 웹 인터페이스 (Current Active)
> **상태**: **운영 중 (Active)**
> **위치**: `src/frontend/`
> **기술 스택**: Vite, React, TypeScript, Tailwind CSS v4

**설명**: 유지보수성과 확장성을 위해 재구축된 현재의 메인 관리 화면입니다.

### 구조 설명
- **`src/App.tsx`**:
  - 애플리케이션의 진입점 및 레이아웃(사이드바, 라우팅)을 관리합니다.
  - `useMcp` 훅을 통해 서버와 전역 상태를 공유합니다.

- **`src/hooks/useMcp.ts`**:
  - **핵심 통신 모듈**입니다.
  - SSE 연결, JSON-RPC 메시지 전송, 도구 목록 동기화, 로그 수집을 담당합니다.
  - 단일 SSE 연결을 보장하며, 서버 상태와의 불일치 문제를 해결했습니다.

- **컴포넌트 (`src/components/`)**:
  - **`Dashboard.tsx`**:
    - 서버 상태, 도구 사용 통계(차트), 실시간 로그를 한눈에 보여줍니다.
  - **`Tester.tsx`**:
    - 서버에서 제공하는 도구 목록(`tools/list`)을 동적으로 불러옵니다.
    - 선택한 도구의 스키마(`inputSchema`)에 맞춰 입력 폼을 자동으로 생성해줍니다.
    - 실행 결과를 JSON 포맷으로 시각화합니다.
  - **`LogViewer.tsx`**:
    - 서버에 저장된 일별 로그 파일(`logs/yyyy-mm-dd.txt`) 목록을 조회하고 내용을 보여줍니다.

- **빌드 및 배포**:
  - `npm run build`를 통해 정적 파일로 변환되어 `src/frontend/dist`에 저장됩니다.
  - Python 서버(`src/sse_server.py`)가 이 정적 파일을 루트 경로(`/`)에서 서빙합니다.
