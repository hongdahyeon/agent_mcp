# MCP Agent Tool Manager (v4.0)

이 프로젝트는 **MCP (Model Context Protocol) Agent**가 사용할 도구(Tools)를 관리하고, 이를 웹 인터페이스에서 테스트, 모니터링 및 제어할 수 있는 관리형 서버 애플리케이션입니다.

> **v4.0 업데이트**: 실시간 알림(SSE), AI 도구 분석 기능, DB 백업/복구 시스템, 그리고 고도화된 데이터 시각화가 추가되었습니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 도구 관리 및 실행

- **기본 도구 (Strict Tools)**: `add`, `subtract`, `get_user_info` 등 표준 도구 제공.
- **동적 도구 (Dynamic Tools)**: 관리자가 웹 콘솔에서 SQL이나 Python 스크립트를 사용하여 실시간으로 도구를 생성할 수 있습니다.
- **도구 테스터**: 프론트엔드 대시보드에서 도구를 직접 실행하고 결과를 확인할 수 있습니다.

### 2. OpenAPI Proxy 및 AI 분석

- **프록시 서비스**: `http://{서버_IP}:8000/api/execute/{tool_id}`를 통해 보안 키 노출 없이 외부 API 연동 기능을 제공합니다.
  - **인증 방식**: 보안을 위해 `Authorization: Bearer <token>` 헤더 방식을 필수로 사용합니다.
  - **파라미터 우선순위**: 외부 호출 시 넘겨준 파라미터(Query/Body)가 **최우선**으로 적용되며, 값이 없을 경우에만 관리자가 등록한 **DB 기본값(Params Schema)**이 적용됩니다.
- **AI 에이전트 연동 및 분석 기능 (New)**:
  - **get_tool_analysis 도구**: AI 에이전트가 도구를 사용하기 전, OpenAPI 규격과 실제 응답 샘플을 미리 학습할 수 있도록 상세 보고서를 생성합니다.
  - 분석 항목: 도구 정보, 인증 설정 여부, 파라미터 규격(Schema), 실제 응답 요약.
- **OpenAPI PDF 내보내기 (New)**: 등록된 API 정보를 관리용 PDF 문서로 간편하게 내보낼 수 있습니다.

### 3. 고도화된 사용량 및 보안 관리

- **계층적 사용량 제한**: Token > User > Role 순의 우선순위 정책에 따라 호출 횟수를 제어합니다.
- **메일 및 OTP 보안**:
  - 예약/즉시 메일 발송 시스템.
  - **이메일 OTP 인증**: 정보 변경 및 가입 시 이메일을 통한 인증번호 검증 프로세스를 지원합니다.
- **계정 잠금 정책**: 5회 이상 로그인 실패 시 계정을 자동으로 잠금 처리하며 관리자가 해제 가능합니다.

### 4. 실시간 알림 시스템 (SSE) (New)

사용자에게 실시간 알림을 전달하기 위해 **SSE(Server-Sent Events)** 방식을 채택하였습니다.

- **기술 선정 이유**:
  - **SSE**: HTTP 표준을 사용하여 구현이 단순하며, 서버에서 클라이언트로의 단방향 알림 전송에 가장 효율적입니다.
  - **WebSockets / FCM**: 양방향성이나 모바일 푸시가 필수적이지 않은 환경에서는 오버헤드가 적은 SSE가 최적의 선택입니다.

### 5. 데이터 안정성 및 시각화 (New)

- **안전한 DB 백업 및 복구**:
  - 관리자가 언제든 DB 상태를 백업할 수 있으며, **복구 시 현재 상태를 자동으로 선 백업(Safety Snapshot)**한 후 복원 로직이 진행되어 데이터 유실을 방지합니다.
- **고도화된 대시보드**:
  - **7x24 히트맵**: MCP 및 OpenAPI 도구의 시간대별/요일별 사용 추이를 시각화합니다.
  - **사용자별 분석**: 각 사용자/토큰별로 가장 선호하는 Top 5 도구 분석 데이터를 제공합니다.

---

## 🛠 시스템 아키텍처

- **Frontend**: Vite, React, TypeScript, Tailwind CSS v4.
- **Backend**: FastAPI (Python), APScheduler (예약 발송), SSE (실시간 통신).
- **Database**: SQLite3 (파일 기반 영구 저장).

---

### 1. 의존성 설치 및 가상환경 활성화

```bash
# 가상환경 생성 (최초 1회)
python -m venv venv

# 가상환경 활성화 (권장)
.\venv\Scripts\activate

# 패키지 설치
pip install -r requirements.txt
```

### 2. 서버 실행

```bash
python src/sse_server.py
```

- **관리자 계정**: `admin` / `1234` (기본값)

---

## 🔐 인증 및 보안 (Authentication)

모든 외부 API 호출 및 프록시 연동 시 **Authorization 헤더** 방식을 표준으로 사용합니다.

- **Header**: `Authorization: Bearer <token>`
- **Token 종류**: JWT (로그인 세션) 또는 Access Token (sk\_...)

---

## 📑 변경 사항 (Changelog)

- **v4.0**:
  - 실시간 알림(SSE) 및 알림 센터 구축.
  - AI 도구 분석(`get_tool_analysis`) 및 PDF 내보내기 기능 추가.
  - DB 자동 안전 백업(Safety Snapshot) 시스템 구현.
  - 대시보드 7x24 히트맵 및 사용자 상세 분석 차트 도입.
  - 이메일 OTP 인증 및 계정 잠금 해제 기능 추가.
- **v3.0**: 사용자 인증(JWT), 권한 관리(Admin/User), DB 연동, OpenAPI 프록시 및 동적 도구 생성 시스템 통합.
- **v2.0 / v1.0**: 초기 기반 구축 및 기본 도구 셋 구현.

---

## 📖 참고 자료 (Reference)

- [OpenAPI 에이전트 연동 분석 가이드 (Claude Share)](https://claude.ai/share/d0c16023-18ca-4939-a973-6ca795a800d4)
