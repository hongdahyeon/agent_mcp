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

## 11. DB & 로그인 기능 구현
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. SQLite DB 구조 설계 및 연동 (h_user, h_login_hist)
- [x] 2. 초기 데이터 시딩 (Admin/User 계정)
- [x] 3. Backend 로그인/인증 API 구현 (JWT or Session)
- [x] 4. Frontend 로그인 페이지 구현
- [x] 5. Frontend 인증 상태 관리 (Protected Route)
- [x] 6. 기능 검증

## 12. 유저 테이블 스키마 변경 (is_enable 추가)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB 스키마 변경 (h_user 테이블 is_enable 컬럼 추가)
- [x] 2. Backend 로그인 로직 수정 (is_enable 체크)
- [x] 3. 초기 데이터 시딩 추가 (user/1234, is_enable=N)
- [x] 4. Frontend 로그인 에러 처리 (403: 계정 비활성화 메시지)
- [x] 5. Frontend 테스트 및 검증

## 13. 사용자 관리 페이지 구현 (Admin Only)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Backend API 구현 (목록, 추가, 수정, 중복체크)
- [x] 2. Frontend 관리자 메뉴 및 접근 제어 처리
- [x] 3. 사용자 목록 UI 구현 (테이블, 활성/비활성 토글)
- [x] 4. 사용자 추가 모달 구현 (ID 중복체크)
- [x] 5. 사용자 수정 모달 구현 (Row 클릭)
- [x] 6. 기능 검증

## 14. 로그인 세션 유지 구현
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Frontend: 로그인 성공 시 localStorage 저장
- [x] 2. Frontend: App 초기화 시 localStorage 확인 및 복구
- [x] 3. Frontend: 로그아웃 시 localStorage 제거
- [x] 4. 기능 검증

## 15. MCP Tool 사용 이력 저장 (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB 스키마 추가 (h_mcp_tool_usage 테이블) 및 저장 함수 구현
- [x] 2. Server Side: Tool 실행 핸들러(log_tool_usage) 연동 및 로깅 구현
- [x] 3. Frontend Support: Tool 호출 시 사용자 ID 전달 (Optional)
- [x] 4. 기능 검증

## 16. MCP Tool 사용 이력 조회 (Admin Only) (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Backend API 구현 (이력 조회, 페이징)
- [x] 2. Frontend 컴포넌트 추가 (UsageHistory.tsx)
- [x] 3. Frontend 라우팅 및 메뉴 추가 (AdminOnly)
- [x] 4. 기능 검증

## 17. DB 연동 Tool 추가 (User Info) (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Server Side: `get_user_info` Tool 구현 (`src/server.py`)
- [x] 2. DB Manager: 보안 처리 (비밀번호 제외 조회) 확인
- [x] 3. 기능 검증 (Inspector 또는 Web Tester)

## 18. 스키마/테이블 관리 메뉴 구현 (Admin Only) (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Backend API 구현
    - [x] `GET /api/db/tables`: 전체 테이블 목록 조회
    - [x] `GET /api/db/schema/{table_name}`: 특정 테이블 스키마 조회
    - [x] `GET /api/db/data/{table_name}?limit=N`: 테이블 데이터 프리뷰 (limit 파라미터 지원)
- [x] 2. Frontend 컴포넌트 구현 (SchemaManager.tsx)
    - [x] 2-Layer Layout (Left: Table List, Right: Detail View)
    - [x] Schema Info Table
    - [x] Data Preview Table with Limit Input
- [x] 3. Frontend 라우팅 및 메뉴 추가 (AdminOnly, App.tsx)
- [x] 4. 기능 검증


## 19. 사용자 토큰 관리 (Phase 1) (Completed)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB 스키마 생성 (Token Management)
    - [x] `h_user_token`: 사용자별 API 토큰 관리 (token_value, expired_at 등)
- [x] 2. Backend API 구현
    - [x] `create_user_token`: 안전한 랜덤 토큰 생성 및 DB 저장 (기존 토큰 만료 처리)
    - [x] `POST /api/user/token`: 토큰 발급 API
    - [x] `GET /api/user/token`: 현재 유효 토큰 조회 API
- [x] 3. Frontend UI 구현
    - [x] MyPage (내 정보) 컴포넌트 추가: 토큰 조회 및 발급 버튼 >> 온디맨드 API 키 (On-Demand API Key) 모델 적용
    - [x] 사이드바 하단 프로필 영역 클릭 시 MyPage 이동 처리
- [x] 4. 기능 검증

## 20. 버그 수정: get_user_info DB 오류 (Completed)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB 경로 절대 경로화 (db_manager.py)
- [x] 2. Server 구동 시 DB 초기화 로직 추가 (server.py)


## 21. 도구 실행 보안 강화 (Phase 2) (Completed)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. SSE 연결 인증 (Authentication)
    - [x] `GET /sse`: `token` 쿼리 파라미터 수신 및 유효성 검증 로직 추가
    - [x] 유효하지 않은 토큰 접근 시 401 Unauthorized 반환
- [x] 2. 사용자 바인딩 (User Binding)
    - [x] 검증된 토큰으로부터 `user_uid` 식별 및 세션/컨텍스트 저장
    - [x] `call_tool` 실행 시 인자(`_user_uid`) 대신 검증된 세션 유저 정보 사용
- [x] 3. 관리자 권한 도구 보호
    - [x] 권한 체크 데코레이터 또는 미들웨어 (핸들러 내 로직으로 구현)


## 22. 사용량 제한 구현 (Phase 3) (Todo)
- [ ] 상세 구현 계획 수립 (implementation_plan.md)
- [ ] 1. DB 스키마 생성 (Usage Limits)
    - [ ] `h_mcp_tool_limit`: 사용자/등급별 제한 정책 테이블 (daily_max_count 등)
- [ ] 2. 실행 제어 로직 구현 (Rate Limiting)
    - [ ] 도구 실행 전 Pre-check hook 구현
    - [ ] 금일 사용량 조회 및 한도 초과 시 `McpError` 반환
- [ ] 3. 사용자 UI 고도화
    - [ ] MyPage: 오늘의 사용량 / 잔여 횟수 표시
