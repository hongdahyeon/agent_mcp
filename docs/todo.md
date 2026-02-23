# todo

## 26-01-14 todo 작성 (커밋은 15일 목) (v)

1.대시보드 > 시스템 현황

- 현재: 도구별 사용 횟수 / 요청 처리 결과
- 변경: "도구별 사용 횟수"는 유지, "요청 처리 결과"는 도구별 성공/실패로 분리

2. 최근 활동 로그

- 24h기준(매일 00시)으로 logs/ 디렉토리 하위로 'yyyy-mm-dd-hh:mm.txt'로 로그파일 누적 생성

3-1. 도구 테스트 (1)

- 현재: 도구에 해당하는 "더하기/빼기" 버튼으로 분리
  -> select박스로 구분해서 화면 구성하기
  -> 그리고 각 [도구]에 따라 필요로 하는 param으로 입력 영역 구성

3-2. 도구 테스트 (2)

- 현재: 실행 결과영역에 결과값만 숫자로 나옴
- 변경: json 형태로 보여주기
  ''
  {
  '값'
  }
  ''

4. 메뉴 추가
   2번에서 누적된 파일 페이징으로 보여지고 클릭시 해당 파일 내용 보여주기

## db구축 및 유저/로그인이력 테이블 추가 (v)

1. 사용가능 db 구축하기

- 심플하게 사용 가능한 db 만들기
- database: python에서 별도 설치 없이 실행 시점에 db 구축
- 메모리 모드: sqllite3.connet(':memory') => in-memory모드처럼 사용
  이를 db로 구성해서

(1) h_user 테이블: uid(pk), user_id, password, user_nm, role(기본은 ROLE_USER), last_cnn_dt(timestamp)
(2) h_login_hist 테이블: uid(pk), user_uid(fk), login_dt, login_ip, login_success(로그인 성공 유무: SUCCESS, FAIL), login_msg(로그인 실패시 이유)
이렇게만 해서 우선 로그인 기능을 구현

## 유저 테이블 is_enable 추가 (v)

유저 테이블(h_user)

- is_enable true/false 추가 (기본값은 true)
- 로그인 시점에 is_enable false면 로그인 막고 알랏으로 "현재 계정이 비활성화 되었습니다" 출력
- 로그인 이력에는 이런 정보 msg로 담기

## 사용자 관리 페이지 추가 (v)

사용자 관리 페이지 추가

- (1) 목록> 사용자id, 이름, 권한(ROLE_USER:유저, ROLE_ADMIN: 어드민), is_enable(true: 활성화, false:비활성화)
- (2) 추가> 사용자 추가 버튼
- -> 모달 통해서: id(중복체크), pwd, name, 권한선택(ROLE_USER, ROLE_ADMIN)
- (3) 목록 > 사용자 is_enable 제어 -> 버튼을 둬서 활성화 to 비활성화, 비활성화 to 활성화
- (4) 사용자 수정 > 목록에서 ROW 클릭시, 해당 유저 정보 수정을 위한 모달창 띄우기 (사용자 이름, is_enable, 권한 수정 가능)

## 로그인 성공 이후 세션 유지 (v)

## MCP TOOL 사용자별 사용량 저장 테이블 추가 (v)

MCP TOOL 사용자별 사용량 저장 테이블 추가

- h_mcp_tool_usage 테이블 : id(pk), tool_nm, .. 너가 생각하기에 필요한 정보, user_uid(fk)

## 관리자로 로그인시 > MCP TOOL 사용자별 사용 이력 조회 (v)

h_mcp_tool_usage 테이블 조회 화면 추가

- 테이블을 통한 조회
- echart를 통한 조회 함께 진행

## mng_usage_mng_todo.md 파일 참고 - 1(v)

1. h_user_token
2. h_mcp_tool_limit
   테이블 추가

## mng_usage_mng_todo.md 파일 참고 - 2 (v)

Phase 1: 사용자 토큰 관리 (완료)

- [x] 온디맨드 API 키 (On-Demand API Key) 모델 적용
- [x] 사용자가 로그인 후, 버튼 클릭을 통한 토큰 발급 -> h_user_token 저장
- [x] 내 정보 (My Page) 메뉴 추가 및 토큰 관리 UI 구현
- [x] db_manager.py > create_user_token, get_user_token 구현
- 현재는 h_mcp_tool_limit을 통해 제한량 정보를 저장하고, 유저에게 토큰을 발급하고 해당 정보를 h_user_token에 저장만 하는 상태

## Phase 1: 사용자 토큰 관리 (완료)

## Phase 2: 도구 실행 보안 적용 (TODO)

보안 강화 및 인증 절차 추가

- **SSE 엔드포인트 인증**: 클라이언트 연결 시 `token` 파라미터 확인 및 검증
  -> /sse?token={token} : {token}값이 h_user_token 테이블에 보관중인 유저벌 토큰
- **User Binding**: 검증된 토큰에서 `user_uid` 추출하여 세션/컨텍스트에 저장
  -> /sse 연결을 통해 user binding이 된 이후, 도구 사용을 하게 되면, 서버는 user binding된 user_uid를 사용하여 도구 실행
- **Argument 의존성 제거**: `call_tool`에서 인자로 받는 `_user_uid` 대신 검증된 `user_uid` 사용
  -> args(\_user_uid)를 없애고, user binding된 user_uid를 사용
- **권한 체크**: 관리자 전용 도구(예: `get_user_info`) 실행 시 권한 검증 로직 추가
  -> 관리자 전용 도구 실행 시, user binding된 user_uid의 권한을 확인하여 권한이 일치하지 않으면 실행 거부

## phase 2 추후 : sse_server.py > @app.get("/sse") > todo 해결하기

## Phase 3: 사용량 제한 구현 (TODO)

사용자별/권한별 도구 사용량 제어

- **사용량 조회 로직**: 도구 실행 전, 금일 사용량(`h_mcp_tool_usage`) 카운트
- **제한 정책 적용**: `h_mcp_tool_limit` 정책에 따라 한도 초과 시 실행 거부 (`McpError` 반환)
- **사용자 UI 개선**: 내 정보 페이지에서 '남은 사용 가능 횟수' 또는 '오늘의 사용량'

## 추가 (v)

- [x] user별로 토큰을 발급하고, 해당 토큰을 이용해 mcp tool 사용
- [x] Claude Desktop와 같은 외부에서 사용시 유저의 토큰을 가져다가 넣어주어야 함
- [x] 외부용 'external' 사용자 토큰 발급 (db_init_manager.py)
- [x] Stdio(server.py) 사용 이력 logging 적용 (audit_log decorator)

## 대시보드 통계 및 안정화 (v)

- [x] 대시보드 차트 데이터를 Local State에서 DB 데이터(get_tool_stats)로 변경
- [x] 통계 집계 시 "Error:", "User not found" 등 논리적 실패도 Failure로 처리
- [x] 프론트엔드 API Proxy 설정 및 URL 호출 오류 수정 (Vite/CORS 이슈 해결)
- [x] sse_server.py 예외 발생 시 서버 크래시 방지 (RuntimeError/Proxy Error 해결)

## 추후 진행 부분 (v)

- admin관리자는 사용자들의 사용 limit 수정 가능
- 제한 우선순위: User 설정 > Role 설정 > 기본값

## 26-01-29 todo

- sse_server.py 분리
  -> 지금은 모든 프로세스 로직이 하나의 py안에 들어있음
  -> 이에 대한 분리가 필요

- 예약 발송 스케줄러 도입
  -> 예약 발송스케줄러 모아둔 화면/로직 구현

## UI 통일화 작업 (LogViewer 스타일 적용)

1. 도구 테스터 (`Tester.tsx`): 헤더 붙이기
2. 메일 발송 (`EmailSender.tsx`): 전체 영역 키우기, 헤더 배경 붙이기
3. 접속 이력 (`LoginHistViewer.tsx`): OK (완료됨)
4. 도구 사용 이력 (`UsageHistory.tsx`): 헤더 아이콘 + 배경 붙이기
5. 사용 제한 관리 (`LimitManagement.tsx`): 헤더 아이콘 + 배경 붙이기
6. DB 관리 (`SchemaManager.tsx`): 헤더 배경 붙이기
7. 도구 생성 (`CustomTools.tsx`): OK (완료됨)
8. 보안 토큰 관리 (`AccessTokenManager.tsx`): 전체 영역 키우기, 헤더 배경 붙이기
9. 시스템 설정 (`SystemConfig.tsx`): 헤더 배경 붙이기, 검색 영역 배경 붙이기
10. 사용자 관리 (`Users.tsx`): 헤더 배경 붙이기

## open api 사용 통계 저장 (todo) (v)

1. open api usage 테이블 추가
2. open api 사용시 사용량 저장
3. open api 사용량 통계 조회 (화면)
4. open api 사용량 제한

## 유저 로그인 비번 틀림 -> 막기 -> admin권한에서 해제 가능 (todo)

1. 로그인시 비번 틀리면 횟수 증가
2. 5회 이상 틀리면 계정 잠김
3. admin권한에서 계정 잠김 해제 가능

## h_openapi 문서 미리보기 viewer 및 PDF Export 추가 (v)

- [x] 마크다운 가이드 미리보기 모달 구현
- [x] 가이드 상세 내용 PDF 내보내기 구현 (Font/Table UI 최적화 완료)

## 향후 고도화 추진 과제 (Proposed)

### 1. 보안 고도화 (Security Enhancement)

- **MFA(2단계 인증) 도입**: 중요도가 높은 계정(Admin)에 대해 이메일 OTP 기반 인증 추가
- **IP 접근 제한**: 특정 권한 또는 토큰에 대해 접속 허용 IP 대역(CIDR) 설정 및 검증 기능

### 2. OpenAPI Proxy 고도화

- **API 카테고리/태그 관리**: 도구가 많아질 경우를 대비한 그룹화 기능 (목록 필터링 지원) (v)
- **응답 기반 스키마 추론**: 샘플 JSON 응답을 입력하면 `params_schema`를 자동 제안해주는 유틸리티 구현

### 3. 사용자 경험(UX) 및 인터페이스

- **다크 모드(Dark Mode) 지원**: 시스템 설정 또는 테마 스위처를 통한 다크 테마 전면 적용 (v)
- **알림 센터(Notification Center)**: 사용량 임계치 도달, 스케줄러 결과, 계정 잠금 등을 실시간 알림으로 제공

### 4. 시스템 관리 및 안정성

- **DB 백업 및 복구**: 관리자 화면에서 SQLite DB 파일을 백업(다운로드)하고 복원하는 기능 (v)
- **헬스 체크(Health Check) 페이지**: DB 연결, SMTP, 스케줄러 상태를 한눈에 확인하는 진단 페이지 (v)
  -> 이번에 할건 healt check 페이지야
  DB 연결, SMTP, 스케줄러 상태를 한눈에 확인하는 진단 페이지
  근데 기본저긍로 모두 메인 대시보드에서 볼 수 있으면 편할것 같아
  지금 구조에서 도구별/사용자별 요청 횟수 카드 위에다가 놓으면 되겠다

### 5. 대시보드 시각화 확장

- **사용량 히트맵(Heatmap)**: 시간대별/요일별 사용 패턴 시각화 (v)
- **사용자별 상세 분석**: 특정 사용자의 주 사용 도구 TOP 5 분석 차트 추가 (v)
