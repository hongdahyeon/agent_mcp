# About MCP Admin System

## 1. 개요 (Overview)


## 2. 주요 기능




## 1. 개요 (Overview)
기존의 복잡했던 인증 체계(`h_user_token` 기반의 온디맨드 토큰)를 제거하고, 표준화된 **JWT (JSON Web Token)** 기반 인증으로 통합했습니다. 또한, 외부 시스템 연동을 위해 별도의 **Access Token (`h_access_token`)** 시스템을 도입했습니다.

---

## 2. 주요 변경 사항 (Key Changes)

### A. 사용자 인증 (User Authentication)
- **기존**: 로그인 시 세션 생성, 별도로 `/api/user/token`을 호출하여 `h_user_token` 발급 후 사용.
- **변경**: 
    1. **로그인 (`/auth/login`)**: 성공 시 **JWT Access Token**을 즉시 발급.
    2. **API 호출**: 모든 API 요청 헤더에 `Authorization: Bearer <JWT>` 포함.
    3. **SSE 연결**: `/sse?token=<JWT>` 형태로 연결.
- **이점**: 
    - 불필요한 DB 트랜잭션 제거 (매 요청마다 토큰 테이블 조회 X, JWT 자체 검증).
    - 표준화된 인증 흐름 (Frontend에서 별도 토큰 관리 로직 제거).

### B. 외부 시스템 연동 (External Access)
- **목적**: CI/CD 파이프라인, 타 애플리케이션 등에서 MCP 서버의 도구를 활용하기 위함.
- **방식**: **Access Token (`h_access_token`)** 사용.
- **구조**:
    - **테이블**: `h_access_token` (id, name, token, can_use, created_at)
    - **생성**: 관리자 페이지에서 이름(용도)을 입력하여 생성 (`sk_...` 형식).
    - **사용**: `/sse?token=<Access_Token>`으로 연결.
- **권한 처리**:
    - Access Token으로 접속 시, 내부적으로 **'External System' (ROLE_ADMIN)** 권한을 가진 가상 유저로 매핑.
    - 이를 통해 모든 MCP 도구(관리자 전용 포함)를 제약 없이 사용 가능.

---

## 3. 인증 흐름 (Authentication Flow)

### 3.1. 사용자 (User) Flow
1. **로그인**: `POST /auth/login` → 응답: `{ "access_token": "eyJ..." }`
2. **페이지 이동**: 브라우저 LocalStorage에 토큰 저장.
3. **도구 사용**: SSE 연결 시 쿼리 파라미터로 JWT 전달.
   - `EventSource('/sse?token={eyJ...}')`
4. **서버 검증**:
   - `verify_token(token)` 함수로 JWT 서명 및 만료 확인.
   - 유효하면 `sub` 클레임(User ID)으로 사용자 컨텍스트 설정.

### 3.2. 외부 시스템 (External System) Flow
1. **토큰 발급**: 관리자가 '보안 토큰 관리' 메뉴에서 토큰 생성 (`sk_abcd1234...`).
2. **시스템 설정**: 외부 앱에 해당 토큰 등록.
3. **연결**:
   - `GET /sse?token={sk_abcd1234...}`
4. **서버 검증**:
   - JWT 검증 실패 시, `h_access_token` 테이블 조회.
   - 유효한 토큰(`can_use='Y'`, `is_delete='N'`)이면 통과.
   - **User Context**: `external` 계정으로 자동 매핑 (없으면 `admin` fallback).

---

## 4. 데이터베이스 및 코드 변경

- **삭제**: `h_user_token` 테이블 및 관련 모델 (`src/db/user_token.py`).
- **신규**: `h_access_token` 테이블 및 관련 모듈 (`src/db/access_token.py`).
- **API**: 
    - `/api/access-tokens` (GET, POST, DELETE) 추가.
    - `/api/user/token` 관련 API 제거.

---

## 5. 트러블슈팅 가이드
- **Q: 기존에 발급받은 MCP 연결 토큰은 어떻게 되나요?**
  - **A:** 모두 만료되었습니다. 더 이상 사용할 수 없으며, 로그인 후 자동으로 사용되는 JWT를 통해 연결됩니다.
- **Q: 외부에서 스크립트로 도구를 실행하고 싶을 땐?**
  - **A:** 관리자 페이지 > [보안 토큰 관리]에서 새 토큰을 발급받아 스크립트의 연결 URL에 `?token=` 파라미터로 추가하세요.