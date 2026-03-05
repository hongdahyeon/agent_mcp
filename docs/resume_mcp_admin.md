# 경력기술서: MCP Admin (AI 에이전트 도구 통합 관리 플랫폼)

## 프로젝트 개요
다양한 서비스 환경에서 활용되는 AI 에이전트들의 도구(Tool)와 워크플로우를 중앙에서 관제하고, MCP(Model Context Protocol) 기반의 표준화된 인터페이스를 제공하는 어드민 플랫폼입니다. 단순한 관리를 넘어 동적 도구 생성, 사용량 제한, 실시간 모니터링 및 보안 정책을 관리합니다.

- **개발 기간**: 2026.01 ~ 현재
- **주요 기술**: Python, FastAPI, React, TypeScript, MCP SDK, SQLite, APScheduler, ECharts

## 주요 역할 및 성과 (Python / FastAPI 기반 아키텍처 중심)

### 1. FastAPI 기반의 고성능 비동기 MCP 서버 아키텍처 구축
- **병렬 처리 최적화**: 모든 데이터베이스 I/O 작업을 `async/await` 기반으로 비동기화하여 **높은 동시성(High-Concurrency)** 환경에서도 낮은 지연 시간을 유지하는 백엔드 시스템 설계.
- **계층적 의존성 주입(DI Implementation)**: FastAPI의 `Depends` 시스템을 활용해 사용자 인증(JWT), DB 세션, 권한 검증 로직을 계층적으로 분리하여 코드의 재사용성과 테스트 용이성 확보. (기속 파일: `src/dependencies.py`)
- **통합 Lifespan 관리**: `@asynccontextmanager`를 활용해 서버 구동 시 DB 초기화 및 백그라운드 스케줄러(APScheduler)의 시작/종료 주기를 안정적으로 제어. (기속 파일: `src/sse_server.py`)

### 2. 런타임 동적 도구(Dynamic Tool) 로더 및 보안 실행 환경 구현
- **Hot-Reloading 확장 기능**: 서버 재시작 없이 SQL 및 Python 스크립트 기반의 도구를 즉시 추가/수정/삭제할 수 있는 동적 로더를 구현하여 운영 유연성 극대화. (기속 파일: `src/dynamic_loader.py`)
- **Pydantic Dynamic Modeling**: `pydantic.create_model`을 사용하여 DB에 정의된 파라미터 스키마를 실시간 모델링하고, 에이전트에게 전달될 JSON 스키마를 동적으로 생성. (**기속 파일: `src/dynamic_loader.py`**)
- **격리된 실행 환경(Sandboxed Execution) 설계**: 동적 스크립트 실행 시 보안을 위해 실행 컨텍스트(Globals/Locals)를 엄격히 제한하여 시스템 리소스 접근을 차단하고, SQL 파라미터 바인딩을 통해 인젝션 공격을 방지하는 안전한 실행 구조 구축. (**기속 파일: `src/tool_executor.py`**)
    > **[기술 용어 설명] Sandboxed Execution**: 외부에서 입력된 코드(Python/SQL)가 서버의 핵심 시스템이나 파일에 접근하지 못하도록, 허용된 특정 범위 내에서만 안전하게 실행되도록 가두어 놓는 보안 기법을 의미합니다.

### 3. 실시간 관제 및 비동기 감사 로그(Audit Log) 체계 구축
- **SSE(Server-Sent Events) 스트리밍**: AI 에이전트의 작업 상태 및 시스템 알림을 실시간으로 클라이언트에 전송하기 위한 전용 SSE 라우터 및 메시지 브릿지 구현. (기속 파일: `src/sse_server.py`)
- **ContextVar 기반 유저 컨텍스트 관리**: `ContextVar`를 활용해 비동기 실행 흐름 전반에서 유저 세션 정보를 유지하고, 데코레이터 패턴을 통해 모든 도구 호출 이력을 비동기(Background)로 자동 로깅. (**기속 파일: `src/utils/context.py`, `src/utils/server_audit.py`**)
- **Stateless REST Proxy (Stateless API Layer)**: 복잡한 MCP 핸드쉐이크 없이 단일 HTTP POST 호출로 도구를 실행할 수 있는 REST Proxy 인터페이스를 추가하여 연동 편의성 증대. (**기속 파일: `src/routers/mcp_execution.py`**)

## 문제 해결 및 기술적 도전 (Technical Troubleshooting)

### [Challenge 1] SSE 프로토콜의 기술적 한계(인증 및 응답 중복) 극복
- **현상**: 브라우저 표준 `EventSource`는 HTTP 헤더 설정이 불가하여 기존 JWT 인증이 불가능했고, FastAPI 요청 완료 처리와 SSE 스트림 전송 간의 충돌로 인해 응답 중복 에러 발생.
- **해결**: Header와 Query Parameter를 동시 지원하는 통합 인증 DI(`src/dependencies.py`)를 개발하고, `NoOpResponse` 패턴(`src/sse_server.py`)을 도입하여 스트림 연결 중 중복 응답 발생을 원천 차단.

### [Challenge 2] Stdio 통신 환경에서의 표준 출력(stdout) 간섭 해결
- **현상**: 서버 초기화 중 발생한 `print` 로그가 JSON-RPC 메시지에 섞여 에이전트와의 통신 프로토콜 에러 유발.
- **해결**: 모든 시스템 로그를 표준 에러(stderr)로 리다이렉션하고, JSON-RPC 전용 통신 채널을 엄격히 격리함으로써 외부 서비스 연동의 안정성 확보.

## 기술적 성과 요약
- Python 비동기 프레임워크와 MCP 표준을 결합하여 실질적인 AI 에이전트 관제 프로토콜 구축.
- 아키텍처 설계부터 런타임 보안, 실시간 모니터링까지 백엔드 전반의 핵심 로직을 FastAPI의 현대적 기능을 사용하여 구현.
- 단순 기능 구현을 넘어, 복합적인 프로토콜 간의 충돌 및 타입 안정성 문제를 해결하며 깊이 있는 트러블슈팅 역량 입증.
