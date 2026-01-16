# Tasks

## 1. 문서 및 규칙 설정
- [x] docs/rules.md 파일 생성
- [x] docs/tasks.md 파일 생성

## 2. 프로젝트 환경 구성
- [x] Python 가상환경 구성 (Skipping explicit venv creation, installing directly)
- [x] .gitignore 파일 생성
- [x] requirements.txt 생성 (mcp 패키지)

## 3. MCP Server 구현
- [x] src/server.py 생성
- [x] MCP Server 인스턴스 초기화 코드 작성
- [x] Tool 데코레이터 및 핸들러 구현 (Basic Math)
- [x] 서버 실행 진입점(Entry point) 작성

## 4. 기능 상세 구현 (Todo)
- [x] (사용자 정의) Tool 기능 구체화
- [x] Tool 로직 구현

## 5. 테스트 및 배포
- [x] 로컬 연결 테스트 (Inspector 활용)
- [x] README.md 사용법 작성

## 6. GitHub 배포
- [x] Git 초기화 및 커밋
- [x] GitHub Repository 생성 가이드
- [x] 원격 저장소 연결 및 푸시

## 7. 웹 인터페이스 구축 (New)
- [x] 웹 서버 구성 (FastAPI/SSE)
- [x] HTML/JS 클라이언트 작성
- [x] Add/Subtract Tool 연동 테스트

## 8. 웹 인터페이스 고도화 (Refactor)
- [x] UI 스타일링 (Tailwind CSS 적용)
- [x] 대시보드 구현 (ECharts, 사용량/성공/실패 통계)
- [x] 메뉴 구조 변경 (대시보드 vs 테스터)
- [x] 코드 주석 한글화 (index.html, client.js)
- [x] Favicon 추가
- [x] 테스터 화면 레이아웃 개선 (Result 영역 추가)

## 9. 26-01-14 Todo 수행
## 9. 26-01-14 Todo 수행
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. 대시보드 통계 개선 (도구별 성공/실패 차트)
- [x] 2. 서버 사이드 로깅 구현 (logs/yyyy-mm-dd-hh:mm.txt)
- [x] 3-x. 서버 기능 추가 (Hellouser 도구 및 로그 뷰어 API)
- [x] 3-1. 도구 테스트 UI 개선 (Select Box 및 동적 입력 폼)
- [x] 3-2. 결과 표시 개선 (JSON 포맷)
- [x] 4. 로그 뷰어 메뉴 구현 (파일 목록 및 내용 조회)

## 10. React Migration (Phase 5)
- [x] 상세 마이그레이션 계획 수립 (implementation_plan.md)
- [x] 1. Vite + React + TS 프로젝트 초기화 (src/frontend)
- [x] 2. 기본 UI 골격 및 라우팅 구성 (Layout, Sidebar)
- [x] 3. 커스텀 훅 구현 (useSSE, useMcpClient)
- [x] 4. 기능별 컴포넌트 이식 (Dashboard, Tester, LogViewer)
- [x] 5. 서버 연동 및 빌드 설정 (Python 정적 서빙 변경)
- [x] 6. 마이그레이션 후 검증 및 디버깅 (SSE 연결 수정, ID 타입 체크 수정)

## 11. DB & 로그인 기능 구현 (26-01-15 Todo)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. SQLite DB 구조 설계 및 연동 (h_user, h_login_hist)
- [x] 2. 초기 데이터 시딩 (Admin/User 계정)
- [x] 3. Backend 로그인/인증 API 구현 (JWT or Session)
- [x] 4. Frontend 로그인 페이지 구현
- [x] 5. Frontend 인증 상태 관리 (Protected Route)
- [x] 6. 기능 검증
