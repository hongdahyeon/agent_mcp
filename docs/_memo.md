# 유저의 접근

## 연결
1. /sse?token={token} 으로 접속
2. 서버는 {token} 을 통해 유저를 식별
3. context.py에 유저 정보를 저장

## Tool 사용
1. 사용자가 Tool 호출
2. context.py > get_current_user()로 유저 정보 획득
3. 2번에서 획득한 유저 정보를 통해 Tool 실행 기록 저장


# TOOL 사용 제한

## 정리
- USER/ROLE 별로 일일 제한 횟수 설정 가능
- {target_type}: user/role
- {target_id}: user_id/role_id
- -> 위 2가지 값을 갖고 덮어쓰기 진행
- 따라서 {ROLE_USER}권한으로 2개의 제한 설정 불가능
- 또한, 우선순위는 ROLE > USER