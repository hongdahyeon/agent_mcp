# React Migration Report

## 1. Overview
- **HTML/JS 기반**의 프론트엔드를 **Vite + React + - TypeScript** 환경으로 성공적으로 이관했습니다.  
- 이제 더 안정적이고 확장 가능한 구조에서 개발할 수 있습니다.

## 2. Project Structure (`src/frontend`)
- **`src/App.tsx`**: 메인 레이아웃 및 라우팅 (Sidebar 포함)
- **`src/components/`**:
    - `Dashboard.tsx`: ECharts 기반 통계 (Pie/Stacked Bar)
    - `Tester.tsx`: 동적 도구 테스트 UI (JSON 스키마 기반)
    - `LogViewer.tsx`: 서버 로그 파일 목록 및 조회
- **`src/hooks/`**:
    - `useSSE.ts`: SSE 연결 관리 Hook
    - `useMcp.ts`: MCP JSON-RPC 통신 및 상태 관리 Hook

## 3. Tech Stack
- **Build Tool**: Vite (v6)
- **Framework**: React (v19) + TypeScript
- **Styling**: Tailwind CSS (v4 via PostCSS)
- **Charts**: Apache ECharts
- **Icons**: Lucide React

## 4. Integration
- **Server**: `src/sse_server.py`가 `src/frontend/dist`의 빌드 파일을 정적 서빙하도록 설정됨.
- **Dev Mode**: `npm run dev` 실행 시 Proxy 설정을 통해 Python 서버(`:8000`)와 통신.

## 5. Usage
`README.md`에 실행 방법이 업데이트 되었습니다.
- **Frontend Dev**: `npm run dev` (http://localhost:5173)
- **Production**: `npm run build` 후 서버 실행 (`uvicorn ...`) -> http://localhost:8000 접속
