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

## 19. 사용자 토큰 관리 (Phase 1) (REMOVED)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB 스키마 생성 (Token Management)
    - [x] `h_user_token`: 사용자별 API 토큰 관리 (token_value, expired_at 등)
- [ ] 2. Backend API 구현 (Removed per user request)
    - [ ] `create_user_token`: 안전한 랜덤 토큰 생성 및 DB 저장 (기존 토큰 만료 처리)
    - [ ] `POST /api/user/token`: 토큰 발급 API
    - [ ] `GET /api/user/token`: 현재 유효 토큰 조회 API
- [ ] 3. Frontend UI 구현 (Removed)
    - [ ] MyPage (내 정보) 컴포넌트 추가: 토큰 조회 및 발급 버튼 >> 온디맨드 API 키 (On-Demand API Key) 모델 적용
    - [ ] 사이드바 하단 프로필 영역 클릭 시 MyPage 이동 처리
- [ ] 4. 기능 검증

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

## 22. 사용량 제한 구현 (Phase 3) (Completed)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB 스키마 생성 (Usage Limits)
    - [x] `h_mcp_tool_limit`: 사용자/등급(Role)별 제한 정책 테이블 (daily_limit, role, user_uid 등)
    - [x] 초기 데이터 시딩 (ROLE_USER: 50회/일, ROLE_ADMIN: 무제한)
- [x] 2. 사용량 집계 및 제한 API 구현
    - [x] `GET /api/mcp/my-usage`: 내 오늘 사용량 및 잔여 횟수 조회
    - [x] `GET /api/mcp/usage-stats`: (Admin) 사용자별/권한별 사용 통계 조회
    - [x] 도구 실행 시(`call_tool`) 한도 체크 로직 연동
- [x] 3. 사용자 UI 구현
    - [x] 공통 Header: 오늘 사용량/잔여 횟수 뱃지 표시
    - [x] Admin UsageHistory: 상단에 사용자별/권한별 통계 요약 테이블 추가

## 23. DB Layer 리팩토링 (Phase 4)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. `src/db` 패키지 생성 및 `connection.py` 구현
- [x] 2. `h_user` 관련 로직 분리 (`user.py`)
- [x] 3. `h_login_hist` 관련 로직 분리 (`login_hist.py`)
- [x] 4. `h_mcp_tool_usage` 관련 로직 분리 (`mcp_tool_usage.py`)
- [x] 5. `h_user_token` 관련 로직 분리 (`user_token.py`)
- [x] 6. `h_mcp_tool_limit` 관련 로직 분리 (`mcp_tool_limit.py`)
- [x] 7. Schema 관리 로직 분리 (`schema.py`)
- [x] 8. `__init__.py` 작성 및 모듈 Expose
- [x] 9. `sse_server.py` 및 기타 참조 파일 import 수정
- [x] 10. `db_manager.py` 제거 및 테스트

## 24. 버그 수정 및 최적화 (Troubleshooting) (Completed)
- [x] Bcrypt hashing error & Invalid request parameters 해결 (#40)
    - [x] bcrypt 라이브러리 버전 고정 (4.0.1)으로 Passlib 호환성 문제 해결
    - [x] Frontend(Tester.tsx)에서 파라미터 타입 변환 로직 추가 (string -> int/bool)
    - [x] Stdio (Claude Desktop) 연동을 위한 stdout 출력 제거 및 sys.path 보강
- [x] 1. 근본적인 토큰 전송 로직 수정
- [x] 2. DB Layer 리팩토링 마무리
    - [x] `db_init_manager.py` -> `src/db/init_manager.py` 이동
    - [x] `src/db/__init__.py`에 `init_db` 노출 및 Import 경로 수정
- [x] 3. MCP Stdio 연결 오류 해결 (Cloud not attach)
    - [x] 원인: `src/db/init_manager.py` (구 `db_init_manager.py`)의 `print()`(stdout) 출력이 JSON-RPC 통신 방해
    - [x] 조치 2: `db_init_manager.py` -> `init_manager.py`로 이동 후, Stdio 연결 시 문제가 되는 내부 `print`들을 `sys.stderr`로 수정
- [x] 4. Claude Desktop 연결 설정
    - [x] `claude_desktop_config.json`을 `src/server.py` (Stdio 모드)로 실행하도록 수정
    - [x] `server.py`의 `db_manager` 참조 오류 수정
    - [x] `src/utils/server_audit.py` 문법 오류(IndentationError) 수정

## 25. 편의 기능 구현 (Completed)
- [x] "아이디 기억하기" 기능 구현 <!-- id: 0 -->
    - [x] `docs/rules.md` 읽기 (완료) <!-- id: 1 -->
    - [x] 로그인 페이지(`Login.tsx`) 분석 (완료) <!-- id: 2 -->
    - [x] 구현 계획 수립 (`implementation_plan.md`) <!-- id: 3 -->
    - [x] UI 수정: "아이디 기억하기" 체크박스 추가 <!-- id: 4 -->
    - [x] 로직 구현: `localStorage`를 사용하여 아이디 저장 및 불러오기 <!-- id: 5 -->
    - [x] 테스트: 기능 동작 확인 <!-- id: 6 -->

- [x] Admin 기능 강화: 도구 사용 제한 관리 (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Backend: Limit 관리 함수 추가 (mcp_tool_limit.py)
    - [x] `get_limit_list`: 제한 목록 조회
    - [x] `upsert_limit`: 제한 규칙 생성/수정 (User/Role)
    - [x] `delete_limit`: 제한 규칙 삭제
- [x] 2. API Endpoint 구현 (sse_server.py)
    - [x] `GET /api/mcp/limits`
    - [x] `POST /api/mcp/limits`
    - [x] `DELETE /api/mcp/limits/{id}`
- [x] 3. Frontend UI 구현
    - [x] `LimitManagement.tsx`: 목록 조회, 추가(Modal), 삭제
    - [x] Menu 추가: '사용 제한 관리' (Admin Only)

## 27. 동적 Tool 생성 기능 (New)
- [x] 상세 설계 및 구현 계획 수립 (design_dynamic_tools.md)
- [x] 1. DB 스키마 생성 (Phase 1)
    - [x] `h_custom_tool`: 툴 메타데이터 및 로직
    - [x] `h_custom_tool_param`: 툴 파라미터 정의
- [x] 2. 동적 등록 로직 구현 (Backend)
    - [x] `src/dynamic_loader.py`: DB 로드 및 Pydantic 모델 생성
    - [x] `src/server.py`: 서버 시작 시 동적 툴 바인딩 (통합 테스트 완료)
- [x] 3. 실행 핸들러 구현 (Backend)
    - [x] SQL Type 실행기 (안전한 파라미터 바인딩)
    - [x] Python Script Type 실행기 (Safe Eval)
- [x] 4. Frontend UI (Admin Only)
    - [x] Custom Tool Builder (목록/생성/수정)
    - [x] SQL/Script 에디터 및 테스트 런너

## 28. 버그 수정 및 UI 개선 (Completed)
- [x] Error Handling: `No module named 'src'` 수정 (Recursion Import 문제 해결) <!-- id: 7 -->
- [x] Custom Tool UI 개선 <!-- id: 8 -->
    - [x] 한글 상세 주석 추가 (CustomTools.tsx) <!-- id: 9 -->
    - [x] Frontend Validation Check 추가 (필수값 검증) <!-- id: 10 -->
    - [x] Inline Validation Error 표시 적용 (사용자 경험 개선) <!-- id: 11 -->
    - [x] 파라미터 렌더링 버그 수정 (index key 사용) <!-- id: 12 -->
- [x] Code Refactoring <!-- id: 13 -->
    - [x] Auth Header 중앙화 (`utils/auth.ts`: `getAuthHeaders`) <!-- id: 14 -->
    - [x] `CustomTools.tsx`, `LimitManagement.tsx`, `UsageHistory.tsx` 리팩토링 적용 <!-- id: 15 -->

## 29. Dynamic Tool Tester 연동 (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Backend: `list_tools`에서 DB의 동적 도구 로드 및 반환
- [x] 2. Backend: `call_tool`에서 동적 도구(`ToolExecutor`) 실행 로직 연동
- [x] 3. Frontend: `Tester.tsx` UI 개선
    - [x] 도구 변경 시 폼/결과 리셋 로직
    - [x] 도구 목록 새로고침 버튼 추가 (`useMcp.ts` 연동)
    - [x] 실행 결과 JSON View 개선 (Result 텍스트 내 JSON 파싱 표시)
    - [ ] 기능 검증 (Build & Test)

## 30. 도구 실행 결과 및 목록 개선 (UI/UX)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Backend: `get_user_info`, `get_user_tokens` 결과 JSON 포맷으로 반환 (`json.dumps`)
- [x] 2. Backend: `list_tools`에서 도구 설명(Description)에 `[System]`, `[Dynamic]` 태그 추가
- [x] 3. Frontend: `Tester.tsx`에서 태그를 파싱하여 도구 목록에 `(System)`, `(Dynamic)` 구분 표시
- [x] 4. Frontend: 실행 결과 JSON 복사 버튼 추가
- [x] 5. 기능 검증

## 31. 시스템 설정 관리 기능 구현 (System Config UI) - [Refactor]
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB: `h_system_config` 테이블 재생성 (Drop & Create) - `name`, `configuration` (JSON), `description`
- [x] 2. DB: `src/db/system_config.py` 로직 수정 (JSON 처리)
- [x] 3. Backend: API 수정 (`GET`, `POST` - JSON handling)
- [x] 4. Frontend: Type 수정 (`types/systemConfig.ts`)
- [x] 5. Frontend: `SystemConfig.tsx` 수정 (JSON Editor implementation)

## 32. Gmail 메일 발송 기능 구현 (Completed in Section 35)
- [x] 1. Utils: `src/utils/mailer.py` 구현 (`smtplib` + DB Config JSON Parsing)
- [x] 2. Backend: `send_email` Tool 추가 (`sse_server.py`)
- [x] 3. 기능 검증 (테스트 메일 발송)


## 33. 프론트엔드 메뉴 구조 개편 (New)
- [x] 메뉴 그룹화 및 라벨 변경 (대시보드, 기능, 이력, 설정 및 관리)
- [x] App.tsx 사이드바 렌더링 로직 수정 (그룹 헤더 지원)

## 34. 메일 발송 이력 관리 (DB)
- [x] 1. DB: `h_email_log` 테이블 생성 (init_manager.py)
    - `user_uid`, `recipient`, `subject`, `content`, `is_scheduled`, `scheduled_dt`, `reg_dt`, `sent_dt`, `status`

## 35. 메일 발송 기능 구현 (Backend)
- [x] 1. DB: `src/db/email_manager.py` 구현 (Insert/Update/Select)
- [x] 2. Utils: `src/utils/mailer.py` 구현 (`smtplib` + `h_system_config` 연동)
- [x] 3. API: `POST /api/email/send` (즉시/예약 분기 처리)
- [x] 4. API: `GET /api/email/logs` (이력 조회 - 검증용)

## 36. 메일 발송 기능 구현 (Frontend)
- [x] 1. Component: `src/frontend/src/components/EmailSender.tsx` 구현
    - 메일 작성 폼 (수신자, 제목, 내용, 예약 설정)
    - 발송 이력 목록 (Logs)
- [x] 2. Integration: `App.tsx` 메뉴 추가 ('기능' > '메일 발송')

## 37. 메일 발송 취소 기능 구현
- [x] 1. Backend: `cancel_email_log` DB 함수 및 `POST /api/email/cancel/{log_id}` API 구현
- [x] 2. Frontend: 발송 이력 목록에 '취소' 버튼 추가 (PENDING 상태일 때만 표시)

## 38. 예약 발송 스케줄러 구현
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Dependency: `requirements.txt`에 `apscheduler` 추가
- [x] 2. DB: `get_pending_scheduled_emails` 함수 구현 (`src/db/email_manager.py`)
- [x] 3. Scheduler: `src/scheduler.py` 구현
    - [x] 스케줄러 로직 작성 (Setup, Process)
- [x] 4. Integration: `src/sse_server.py`에 스케줄러 연동 (Lifespan)
- [x] 5. 기능 검증

## 39. JWT 인증 구현 (Phase 22)
- [x] 1. Dependency: `requirements.txt` 패키지 설치
- [x] 2. Auth Utility: `src/utils/auth.py` 구현 (JWT, Bcrypt)
- [x] 3. DB Refactor: `src/db/user.py` 해싱 로직 변경 (SHA256 -> Bcrypt)
- [x] 4. Server Refactor: `src/sse_server.py` 로그인 API 및 의존성 주입 변경
- [x] 5. 기능 검증 (로그인, 토큰 검증)

## 40. Bcrypt 호환성 및 도구 테스터 오류 해결 (Completed)
- [x] 1. Bcrypt 및 환경 문제 해결
    - 원인: `passlib`와 최신 `bcrypt` (5.0.0+) 간의 호환성 문제로 인한 AttributeError 및 72바이트 제한 오류
    - 조치: `requirements.txt`에 `bcrypt==4.0.1` 피닝(Pinning)하여 호환성 확보
- [x] 2. 도구 테스터 파라미터 타입 오류 해결
    - 원인: MCP SDK의 엄격한 타입 검증으로 인해 문자열로 전송된 숫자 파라미터가 거절됨 (-32602)
    - 조치: `Tester.tsx`에서 `inputSchema`에 따라 숫자형 자동 변환 로직 추가
- [x] 3. 서버 안정성 복구 및 디버깅
    - 조치: SSE 메시지 핸들러 내 스트림 간섭 코드 제거 및 ASGI 상태 머신 오류 해결

## 41. Claude Desktop (Stdio) 연동 및 도구 구현 동기화 (Completed)
- [x] 1. 인증 브릿지 함수(`get_user_by_active_token`) 구현
    - 원인: Stdio 모드에서 외부 토큰(`sk_...`)을 통한 사용자 식별 기능 누락
    - 조치: JWT와 외부 토큰을 모두 지원하는 통합 인증 함수를 `src/db/access_token.py`에 구현하고, 외부 토큰 성공 시 `external` 계정(ROLE_ADMIN) 부여
- [x] 2. Stdio 서버 도구 구현 동기화 (`server.py`)
    - 조치: `get_user_info` 도구의 반환 형식을 `json.dumps`를 사용하도록 수정하여 SSE 서버와 일관성 확보
- [x] 3. Database Layer 타입 오류 수정 (`sqlite3.Row`)
    - 원인: `sqlite3.Row` 객체에 `.get()` 메서드가 없어 발생하는 AttributeError 해결
    - 조치: DB 조회 결과를 `dict()`로 명시적 변환 후 반환하도록 수정

## 42. 비동기 감사 로그(Audit Log) 처리 원리 (Documentation)
- **비동기 처리 원리**:
    - `audit_log` 데코레이터는 `asyncio.iscoroutinefunction(func)`를 사용하여 실행하려는 함수가 비동기(`async def`)인지 확인합니다.
    - **비동기 함수(예: 동적 도구)**일 경우: `await func(*args, **kwargs)`를 호출하여 비동기 작업이 완료될 때까지 기다린 후 결과를 로그에 담습니다.
    - **동기 함수(예: add)**일 경우: 일반 함수 호출처럼 즉시 실행하여 결과를 로그에 담습니다.
    - 이 방식을 통해 동적 도구처럼 나중에 실행이 완료되는 도구들도 누락 없이 이력을 저장할 수 있습니다.

## 43. 대시보드 콘텐츠 교체 (로그 -> 사용자별 요청 통계) (New)
- [x] 상세 접근 제어 및 구현 계획 수립 (implementation_plan.md)
- [x] 1. Backend: `get_user_tool_stats` 함수 구현 (`src/db/mcp_tool_usage.py`)
- [x] 2. Backend: `/api/mcp/stats` API 수정 (사용자별 통계 포함)
- [x] 3. Frontend: `UsageStats` 타입 정의 수정 (users 필드 추가)
- [x] 4. Frontend: `Dashboard.tsx` 수정 (로그 영역 제거 및 사용자별 통계 차트 추가)
- [x] 5. 기능 검증

## 44. 대시보드 UI 레이아웃 및 차트 개선 (Refinement)
- [x] 1. Frontend: '사용자별 요청 횟수' 차트 타입을 도넛(Donut)으로 변경
- [x] 2. Frontend: '요청 처리 결과'와 '사용자별 요청 횟수' 위치 교체 (상단 <-> 하단)

## 45. UI 통일화 작업 (LogViewer 스타일 적용)
- [x] 1. 도구 테스터 (`Tester.tsx`) 헤더 적용
- [x] 2. 메일 발송 (`EmailSender.tsx`) 레이아웃 및 헤더 적용
- [x] 3. 도구 사용 이력 (`UsageHistory.tsx`) 헤더 적용
- [x] 4. 사용 제한 관리 (`LimitManagement.tsx`) 헤더 적용
- [x] 5. DB 관리 (`SchemaManager.tsx`) 헤더 적용
- [x] 6. 보안 토큰 관리 (`AccessTokenManager.tsx`) 레이아웃 및 헤더 적용
- [x] 7. 시스템 설정 (`SystemConfig.tsx`) 스타일 개선
- [x] 8. 사용자 관리 (`Users.tsx`) 헤더 적용

## 46. 페이지네이션 UI/UX 통일 (Completed)
- [x] 0. 공통 페이지네이션 컴포넌트 (`Pagination.tsx`) 구현
    - [x] 페이지당 목록 수 선택 박스 (10, 50, 100, 기본값 10)
    - [x] 페이지 이동 버튼 (이전, 페이지 번호, 다음)
- [x] 1. 메일 발송 (`EmailSender.tsx`) 페이지네이션 추가
- [x] 2. 도구 사용 이력 (`UsageHistory.tsx`) 선택 박스 추가 및 스타일 통일
- [x] 3. 사용 제한 관리 (`LimitManagement.tsx`) 페이지네이션 추가
- [x] 4. DB 관리 (`SchemaManager.tsx`) 데이터 영역 페이지네이션 및 선택 박스 UI 변경
- [x] 5. 도구 생성 (`CustomTools.tsx`) 페이지네이션 추가
- [x] 6. 보안 토큰 관리 (`AccessTokenManager.tsx`) 페이지네이션 추가
- [x] 7. 시스템 설정 (`SystemConfig.tsx`) 페이지네이션 추가
- [x] 8. 사용자 관리 (`Users.tsx`) 선택 박스 추가 및 스타일 통일

## 47. UI/UX 디자인 고도화 (Glassmorphism)
- [x] 1. 모달 배경 디자인 개선 (`backdrop-blur-sm`, `bg-black/40` 적용)
    - [x] `SystemConfig.tsx`, `Users.tsx`, `CustomTools.tsx`, `LimitManagement.tsx` 적용
- [x] 2. Backend API 및 DB 모듈 Docstring 업데이트 (Paging 지원 내용 명시)
    - [x] `db/access_token.py`, `db/custom_tool.py`, `db/email_manager.py`, `db/mcp_tool_limit.py`, `db/schema.py`
- [x] 3. `CustomTools.tsx` 린트 오류 수정 및 `useCallback` 최적화

## 48. 도구 사용 이력 JSON 상세 뷰어 구현
- [x] 1. `UsageHistory.tsx` 내 상세 조회 모달 구현
- [x] 2. 파라미터/결과 셀에 눈(`Eye`) 아이콘 버튼 추가
- [x] 3. JSON 포맷팅 및 예외 처리 로직 적용

## 49. OpenAPI Proxy Management 구현
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. Database Implementation
    - [x] `h_openapi` 테이블 생성 및 CRUD 로직 구현
- [x] 2. Backend Implementation
    - [x] OpenAPI 관리 API (`/api/openapi`) 구현
    - [x] Proxy 실행 엔드포인트 (`/api/execute/{tool_id}`) 구현
    - [x] XML 응답 JSON 자동 변환 기능 추가 (`xmltodict`) (requirements.txt 추가 완료)
    - [x] ServiceKey 이중 인코딩 방지 로직 적용
- [x] 3. Frontend Implementation
    - [x] OpenAPI 관리 UI (`OpenApiManager.tsx`) 구축
    - [x] 파일 업로드 및 `batch_id` 유지 로직 구현
    - [x] 실행 테스트 모달 (동적 파라미터 입력, 결과 JSON 뷰어) 구현
    - [x] 결과값 및 실행 URL 클립보드 복사 기능 추가
- [x] 4. Documentation
    - [x] 사용 가이드 (`docs/open_api.md`) 작성
    - [x] `requirements.txt` 업데이트 (`xmltodict` 추가)

## 50. OpenAPI Proxy 실행 보안 강화 (Authentication)
- [x] 1. 통합 인증 의존성 구현 (`src/dependencies.py`: `get_current_active_user`)
    - [x] JWT (`Authorization: Bearer`) 및 외부 토큰 (`token` query param) 동시 지원
- [x] 2. OpenAPI 프록시 엔드포인트에 인증 적용 (`src/routers/openapi.py`)
- [x] 3. 기능 검증 및 테스트 완료


## 51. OpenAPI 사용 통계 및 사용량 제한 구현 (Phase 27)
- [x] 1. DB: `h_openapi_usage`, `h_openapi_limit` 테이블 생성 (`init_manager.py`)
- [x] 2. DB: `openapi_usage.py` 구현 (로깅 및 ECharts용 통계 조회)
- [x] 3. DB: `openapi_limit.py` 구현 (TOKEN > USER > ROLE 순위 제한 조회)
- [x] 4. Backend: `api_execute_openapi` 핸들러 수정 (제한 체크 및 상세 로깅)
- [x] 5. Backend: 신규 관리 API 구현 (`stats`, `limits`, `my-usage`)
- [x] 6. Frontend: 관련 Type 정의 (`types/openapi.ts`)
- [x] 7. Frontend: `OpenApiStats.tsx` 구현 (ECharts 시각화 대시보드)
- [x] 8. Frontend: `OpenApiLimit.tsx` 구현 (토큰 연동 제한 관리 UI)
- [x] 9. Frontend: 라우팅 및 메뉴 구성 (`App.tsx`)
- [x] 10. 전체 기능 검증 및 테스트 완료
- [x] 11. DB: `h_openapi_usage`에 `error_msg` 컬럼 추가
- [x] 12. Backend: 에러 발생 시(429 포함) `error_msg` 로깅 로직 보완
- [x] 13. Frontend: 상세 이력 테이블에 실패 사유(눈 아이콘) 뷰어 추가
- [x] 14. 최종 검증 및 테스트 완료
- [x] 15. DB: 오늘 사용량을 도구별로 집계하는 `get_user_openapi_tool_usage` 구현
- [x] 16. Backend: `/api/openapi/my-usage` 업데이트 (도구별 상세 포함)
- [x] 17. Frontend: `MyPage.tsx`에 '오늘의 OpenAPI 사용 현황' 섹션 추가
- [x] 18. 최종 마무리 및 검토 완료
- [x] 19. Backend: `GET /api/openapi` 목록 조회 권한을 모든 유저로 확대 (일반 유저도 목록 조회 및 사용 가능)
- [x] 20. Frontend: `OpenApiManager.tsx`에서 유저 권한에 따른 버튼 숨김 처리
- [x] 21. Frontend: `App.tsx`에서 OpenAPI 메뉴를 유저도 볼 수 있도록 수정 (라벨 변경 포함)
- [x] 22. 유저 권한으로 기능 동작 확인 및 `App.tsx` 렌더링 버그 수정 완료
- [x] 23. Backend: `/api/execute/{tool_id}` 라우터를 `execution.py`로 분리
- [x] 24. Backend: `src/sse_server.py`에 신규 라우터 등록
- [x] 25. 기능 동작 테스트 (기존 기능 유지 확인)

## 52. 사이드바 및 레이아웃 개선
- [x] 1. 접이식 사이드바 상태 관리 및 토글 버튼 구현
- [x] 2. 1024px 미만 화면 자동 접힘 반응형 로직 적용
- [x] 3. 사이드바 접힘 시 UI 최적화 (라벨 숨김, 아이콘 정렬)

## 53. OpenAPI 가이드 및 에디터 고도화
- [x] 1. OpenAPI 사용 제한 목록 가독성 개선 (`target_name` 표시)
- [x] 2. DB 마이그레이션: `h_openapi` 테이블 `description_info` 컬럼 추가
- [x] 3. 백엔드 `OpenApiUpsertRequest` 모델 필드 추가 및 저장 오류 수정
- [x] 4. 프론트엔드 탭 방식(편집/미리보기) 마크다운 에디터 UI 구현
- [x] 5. HTML 태그(`rehype-raw`) 및 GFM(`remark-gfm`) 렌더링 지원 전면 적용
- [x] 6. 일반 사용자용 가이드 보기 모달(`prose` 테마) 적용

## 54. 계정 잠금 기능 및 관리자 해제 기능 구현 (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB: `h_user` 테이블 `is_locked`, `login_fail_count` 컬럼 추가 및 마이그레이션 (`sqlite3` 임포트 오류 수정 포함)
- [x] 2. Backend: `auth.py` 로그인 로직 수정 (5회 실패 시 잠금, 성공 시 초기화)
- [x] 3. Backend: `user.py` 및 `users.py` 수정 (관리자용 잠금 해제 기능 및 계정 생성 로직 고도화)
- [x] 4. Frontend: `Login.tsx` 잠금 메시지 처리 및 오류 수정
- [x] 5. Frontend: `Users.tsx` 계정 잠금 상태 표시 및 해제 기능 추가
- [x] 6. 기능 검증 완료
 
 ## 55. OpenAPI 상세 정보 PDF 내보내기 (New)
 - [x] 상세 구현 계획 수립 (implementation_plan.md)
 - [x] 1. Dependency: `requirements.txt`에 `fpdf2` 추가
 - [x] 2. Backend: `src/utils/pdf_generator.py` 구현 (한글 폰트, HTML 태그 제거, 동적 테이블)
 - [x] 3. Backend: `src/routers/openapi.py` 내 PDF 내보내기 API (`/api/openapi/{tool_id}/export`) 구현 (Admin 전용 서비스 키 포함)
 - [x] 4. Frontend: `OpenApiManager.tsx`에 PDF 다운로드 버튼 추가 및 연동
 - [x] 5. 기능 검증 및 UI 최적화 완료
 
 ## 56. 다크 모드(Dark Mode) 구현 (New)
 - [x] 상세 구현 계획 수립 (implementation_plan.md)
 - [x] 1. Tailwind CSS 다크 모드 설정 (class strategy)
 - [x] 2. 테마 상태 관리 훅(useTheme) 및 localStorage 연동
 - [x] 3. 헤더 내 테마 전환 토클 버튼 추가
 - [x] 4. 전역 컴포넌트(Sidebar, Dashboard, Modal 등) 다크 모드 스타일 적용
 - [x] 5. 기능 검증 완료

## 57. OpenAPI 메타데이터 관리 기능 구현 (New)
- [x] 상세 구현 계획 수립 (implementation_plan.md)
- [x] 1. DB: `openapi_meta.py` 구현 (카테고리/태그 수정 및 안전한 삭제 로직)
- [x] 2. Backend: 신규 관리 API 엔드포인트 구현 (`PUT`, `DELETE`, `GET by-meta`)
- [x] 3. Frontend: `OpenApiMetaManager.tsx` 컴포넌트 구현 (관리자 전용)
- [x] 4. Frontend: `App.tsx` 메뉴 연동 및 `OpenApiManager.tsx` 중복 UI 정리
- [x] 5. 기능 검증 및 린트 오류 수정 완료

## 58. OpenAPI PDF 내보내기 기능 보완 (Refinement)
- [x] 1. Backend: `get_openapi_by_tool_id` 수정 (카테고리명 및 태그 정보 포함)
- [x] 2. Utils: `pdf_generator.py` 수정 (문서 내 카테고리와 태그 항목 추가)
- [x] 3. Frontend: 도구 목록 및 상세 타입 정의(`OpenApiConfig`) 업데이트로 데이터 정합성 확보
- [x] 4. 기능 검증 완료

## 59. DB 백업 및 복구 기능 구현 (New)
- [x] 상세 구현 계획 수정 반영 (implementation_plan.md)
- [x] 1. Backend: DB 백업 생성 API 구현 (`POST /api/admin/db/backup`)
- [x] 2. Backend: 백업 파일 목록 조회 API 구현 (`GET /api/admin/db/backups`)
- [x] 3. Backend: 특정 파일 선택 복구 API 구현 (`POST /api/admin/db/restore/{filename}`)
- [x] 4. Frontend: DB 백업 관리 UI 구현 (목록, 생성 버튼)
- [x] 5. 기능 테스트 및 검증
