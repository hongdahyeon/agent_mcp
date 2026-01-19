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


##  유저 테이블 is_enable 추가 (v)
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
- (4) 사용자 수정 > 목록에서 ROW 클릭시, 해당 유저 정보 수정을 위한 모달창 띄우기  (사용자 이름, is_enable, 권한 수정 가능)


## 로그인 성공 이후 세션 유지 (v)

## MCP TOOL 사용자별 사용량 저장 테이블 추가 (v)
MCP TOOL 사용자별 사용량 저장 테이블 추가
- h_mcp_tool_usage 테이블 : id(pk), tool_nm, .. 너가 생각하기에 필요한 정보, user_uid(fk)


## 관리자로 로그인시 > MCP TOOL 사용자별 사용 이력 조회
h_mcp_tool_usage 테이블 조회 화면 추가
- 테이블을 통한 조회
- echart를 통한 조회 함께 진행