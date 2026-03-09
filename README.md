# MCP Agent Tool Manager (v5.0)

이 프로젝트는 **MCP (Model Context Protocol) Agent**가 사용할 도구(Tools)를 관리하고, 이를 웹 인터페이스에서 테스트, 모니터링 및 제어할 수 있는 관리형 서버 애플리케이션입니다.

> **v5.0 업데이트**: **Jenkins 기반 CI/CD 파이프라인**이 구축되어 코드 품질 검증 및 브랜치 머지가 자동화되었습니다. 또한 **Telegram 봇 연동**을 통해 빌드 및 머지 결과를 실시간으로 통보받을 수 있습니다. MCP REST API Proxy, 세밀한 토큰별 권한 관리, 감사 로그 Excel 내보내기 및 Swagger UI 통합 문서화 기능이 추가되었습니다.

---

## 🚀 주요 기능 (Key Features)

### 1. 도구 관리 및 실행

- **기본 도구 (Strict Tools)**: `add`, `subtract`, `get_user_info` 등 표준 도구 제공.
- **동적 도구 (Dynamic Tools)**: 관리자가 웹 콘솔에서 SQL이나 Python 스크립트를 사용하여 실시간으로 도구를 생성할 수 있습니다.
- **도구 테스터**: 프론트엔드 대시보드에서 도구를 직접 실행하고 결과를 확인할 수 있습니다.

### 2. OpenAPI Proxy 및 AI 분석

- **프록시 서비스**: 외부 API 연동 시 보안 키 노출 없이 고정된 엔드포인트를 제공합니다.
- **AI 에이전트 연동 분석**: `get_tool_analysis` 도구를 통해 AI가 도구의 규격과 응답 샘플을 미리 학습할 수 있는 보고서를 생성합니다.
- **OpenAPI PDF 내보내기**: 등록된 API 정보를 관리용 PDF 문서로 간편하게 내보낼 수 있습니다.

### 3. 사용량 및 보안 관리

- **계층적 사용량 제한**: Token > User > Role 순의 우선순위 정책에 따라 호출 횟수를 제어합니다.
- **보안 메커니즘**: 이메일 OTP 인증, 계정 잠금 정책(5회 실패 시), JWT 및 외부 보안 토큰 인증을 지원합니다.

### 4. 실시간 알림 시스템 (SSE)

- **SSE(Server-Sent Events) 기반**: 서버에서 클라이언트로의 단방향 알림 전송을 통해 실시간 사용량 알림 및 시스템 공지를 전달합니다.

### 5. 데이터 안정성 및 시각화

- **안전한 DB 백업 및 복구**: 복구 전 자동 'Safety Snapshot'을 생성하여 데이터 유실을 방지합니다.
- **고도화된 대시보드**: 7x24 히트맵 및 사용자별 선호 도구 Top 5 분석 데이터를 시각화합니다.

### 6. MCP REST API Proxy & 통합 인증 (New)

- **Stateless 호출**: SSE 연결 없이 단일 `POST` 요청만으로 MCP 도구를 즉시 실행할 수 있는 REST Proxy를 제공합니다.
- **통합 인증 시스템**: 일반 사용자의 `JWT`와 외부 서비스 연동을 위한 보안 토큰(`sk_...`)을 동시에 지원합니다.

### 7. 세밀한 보안 및 권한 관리 (New)

- **토큰별 권한 매핑**: 외부 액세스 토큰마다 사용할 수 있는 도구(Custom/OpenAPI)를 개별적으로 지정할 수 있습니다.
- **보안 3단계 프로세스**: 도구 실행 전 **[권한 확인 -> 사용량(Quota) 체크 -> 실행]**의 엄격한 보안 로직을 통과해야 합니다.

### 8. 데이터 관리 및 내보내기 (New)

- **감사 로그 Excel 추출**: 도구 및 OpenAPI 사용 이력을 Excel 파일로 내보내어 사후 분석 및 보고용으로 활용할 수 있습니다.
- **로그 아카이빙**: 대규모 로그 파일을 선택하여 다중 압축(Zip) 처리하고, 원본 파일을 관리하는 아카이빙 시스템을 갖추고 있습니다.

### 9. API 문서화 자동화 (New)

- **Swagger UI / ReDoc**: `/docs` 또는 `/redoc` 경로를 통해 REST Proxy 및 시스템 API의 실시간 문서를 제공합니다.
- **자동 도구 탐색**: `/api/mcp/proxy/tools` 엔드포인트를 통해 사용 가능한 모든 도구 목록을 외부 클라이언트가 동적으로 탐색할 수 있습니다.

---

## 🏗 CI/CD & DevOps (New)

이 프로젝트는 개발 생산성 향상을 위해 **Jenkins**를 활용한 지속적 통합 및 배포 환경을 갖추고 있습니다.

- **브랜치 전략**: `home` 브랜치(개발) -> `work` 브랜치(메인/운영).
- **자동화 워크플로우**:
  - 개발자가 `home` 브랜치에 코드를 `push`하면 GitHub Webhook이 Jenkins를 호출합니다.
  - Jenkins는 백엔드(Python) 및 프론트엔드(Node.js) 빌드와 유효성 검증을 수행합니다.
  - 빌드 성공 시, Jenkins가 자동으로 `work` 브랜치로 최신 내용을 **Merge 및 Push** 합니다.
  - **실시간 알림**: 빌드 및 머지 성공/실패 여부를 **Telegram 봇**을 통해 개발자에게 즉시 전송합니다.
- **로컬 연동**: `ngrok` 터널링을 통해 로컬 Jenkins 서버와 GitHub를 안전하게 연결합니다.

---

## 🛠 시스템 아키텍처

- **Frontend**: Vite, React, TypeScript, Tailwind CSS v4.
- **Backend**: FastAPI (Python), MCP (FastMCP).
- **Database**: SQLite3 (File-based persistence).
- **Automation**: Jenkins (CI/CD), ngrok (Webhook tunneling).

---

## 📑 변경 사항 (Changelog)

- **v5.0 (New)**:
  - Jenkins CI/CD 파이프라인 구축 (자동 빌드 및 머지).
  - **Telegram Notification 연동 (실시간 빌드 결과 알림).**
  - MCP REST API Proxy 구현 및 통합 인증 연동.
  - 외부 토큰별 도구 권한 관리 시스템 도입.
  - 감사 로그(Audit Log) Excel 내보내기 기능 추가.
  - 로그 파일 압축 및 아카이빙 관리 시스템 구현.
  - Swagger UI 기반 API 자동 문서화 적용.
- **v4.0**: SSE 알림 센터, AI 도구 분석, DB 안전 백업, 대시보드 고도화.
- **v3.0**: 사용자 인증(JWT), 권한 관리, OpenAPI 프록시 시스템 통합.
- **v2.0 / v1.0**: 초기 기반 구축 및 기본 도구 셋 구현.

---

## 📖 참고 자료 (Reference)

- [Jenkins CI/CD 구축 실전 가이드](docs/jenkins_setup.md)
- [MCP REST API Proxy 사용 가이드](docs/mcp_rest_api.md)
