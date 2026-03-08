# 기술 스택 결정 및 문제 해결 분석 (블로그용)

## 0. 프로젝트 개요
- **프로젝트명**: **Agent MCP Admin Platform**
- **프로젝트 설명**:
    AI 에이전트가 즉각적으로 활용 가능한 **MCP(Model Context Protocol)** 도구의 동적 생성, 관리, 모니터링 및 제어를 지원하는 통합 관리 플랫폼입니다. 특히, 에이전트가 복잡한 **OpenAPI(REST API)** 규격을 직접 분석하고 유연하게 호출할 수 있도록 프록시 계층과 자동 변환 시스템을 제공하여 에이전트의 도구 확장성을 극대화했습니다.
- **주요 기술 스택**:
    - **Backend**: Python, FastAPI, SQLite, MCP SDK, APScheduler (Backgroud Mailer)
    - **Frontend**: React, TypeScript, Vite, Tailwind CSS, ECharts (Data Visualization)
    - **Security**: JWT (Authentication), Bcrypt (Password Hashing)
    - **Others**: XML-to-JSON Pipeline, PDF Generation, Excel/CSV Export

---

`tasks.md` 및 `implementation_plan.md`의 프로젝트 이력을 바탕으로 하여, 주요 기술적 도전 과제와 해결 과정을 정리했습니다.

1. **Vanilla JS 기반 프론트엔드의 SSE 상태 관리 복잡도 및 유지보수성 문제**
    - **React & TypeScript 마이그레이션**
        Vite + React + TS 환경으로 전환하여 컴포넌트 기반 아키텍처를 도입하고, TypeScript를 통해 런타임 에러를 사전에 방지함.
    - **SSE 상태 관리 로직 통합 및 캡처 최적화**
        `useMcp` 훅을 통해 SSE 연결과 JSON-RPC 통신을 단일화하고, `useRef`를 사용하여 비동기 클로저 이슈(Stale Closure)를 근본적으로 해결함.
    - **성과**
        유지보수 편의성 비약적 향상 및 실시간 데이터 바인딩 오류 완전 해소.

2. **서버 재시작 없는 런타임 기능 확장 요구 및 개발 생산성 저하**
    - **Pydantic 기반 동적 도구(Tool) 모델링**
        사용자가 정의한 파라미터 명세를 바탕으로 런타임에 Pydantic 모델을 동적으로 생성하여, 에이전트가 즉시 도구를 인식하도록 설계함.
    - **SQL/Python 하이브리드 리모트 실행기**
        별도의 배포 과정 없이 DB 쿼리나 파이썬 스크립트를 즉시 실행하고 결과를 반환받는 안전한 샌드박스형 실행 환경 구축.
    - **성과**
        서버 무중단 상태에서 실시간 기능 확장이 가능해졌으며, 도구 개발 및 테스트 주기 단축.

3. **비밀번호 취약점 및 분산된 인증 체계로 인한 관리 복잡성**
    - **Bcrypt 보안 표준화**
        기존 단방향 해싱(SHA-256)에서 보안성이 검증된 Bcrypt(Salting 포함) 방식으로 전환하여 비밀번호 저장 및 검증 단계의 보안을 강화함.
    - **JWT 기반 통합 인증 시스템**
        웹 로그인 세션(12시간)과 장기 API 키(1년) 인증 체계를 JWT 규격으로 통일하여, 표준화된 헤더 방식으로 모든 API 요청을 검증하도록 구현.
    - **성과**
        인증 체계의 무결성 및 확장성을 확보하고 사용자 계정 보호 수준을 엔터프라이즈급으로 향상.

4. **공공데이터 등의 레거시 XML 규격 대응 및 프론트엔드 연동 비효율**
    - **OpenAPI Proxy & 자동 변환 계층**
        백엔드에 OpenAPI 프록시를 구축하고 `xmltodict` 라이브러리를 통해 XML 응답을 실시간으로 JSON으로 변환하여 프론트엔드 처리 부담을 줄임.
    - **ServiceKey 이중 인코딩 방지 로직**
        공공데이터 API 호출 시 흔히 발생하는 인코딩 문제를 해결하기 위해 raw-key 유지 및 동적 파라미터 병합 프로세스를 정교화함.
    - **성과**
        다양한 외부 데이터 소스와의 상호 운용성을 확보하고 개발 생산성을 높임.

5. **로그 파일 누적으로 인한 저장 공간 부족 및 관리 생산성 문제**
    - **로그 아카이빙 및 압축 파이프라인**
        일정 기간이 지난 텍스트 로그 파일들을 선택하여 Zip 파일로 아카이빙하고, 원본을 자동 삭제하는 관리 프로세스를 구현함.
    - **Zip Content 브라우징 및 즉시 복구 시스템**
        압축된 파일 내부를 압축 해제 없이 확인하고, 필요 시 특정 아카이브를 다시 텍스트 파일로 복구하는 해제 로직을 통해 로그 가용성 확보.
    - **성과**
        디스크 자원 활용 효율 극대화 및 로그 관리의 자동화/안정성 달성.

---

## 2. 상세 기술적 성취 및 관련 소스 코드 (Technical Achievement & Source Mapping)

1. **Vanilla JS 기반 환경의 SSE 상태 관리 복잡도 및 비동기 클로저 이슈로 인한 데이터 불일치**
    - **React & TypeScript 마이그레이션**
        컴포넌트 기반 아키텍처 도입 및 `useMcp` 커스텀 훅을 통한 SSE 연결과 JSON-RPC 통신의 단일화
    - **Stale Closure 해결**
        `useRef`를 활용해 비동기 환경에서도 최신 상태를 보장하는 상태 캡처 로직 최적화
    - **성과**
        실시간 데이터 바인딩 오류를 완전 해소하고 프론트엔드 유지보수 편의성 비약적 향상
    - **관련 소스**: [useMcp.ts](file:///d:/hong/9.%20project/agent_mcp/src/frontend/src/hooks/useMcp.ts), [App.tsx](file:///d:/hong/9.%20project/agent_mcp/src/frontend/src/App.tsx)

2. **새로운 도구 추가 시마다 발생하는 서버 재시작 요구 및 개발 생산성 저하**
    - **Pydantic 기반 동적 모델링**
        사용자 정의 파라미터 명세를 바탕으로 런타임에 Pydantic 모델을 동적으로 생성하여 에이전트가 즉시 도구를 인식하도록 설계
    - **하이브리드 리모트 실행기**
        별도 배포 없이 DB 쿼리나 Python 스크립트를 즉시 실행하는 샌드박스형 실행 환경 구축
    - **성과**
        서버 무중단 상태에서 실시간 기능 확장 가능 및 도구 개발/테스트 주기 획기적 단축
    - **관련 소스**: [dynamic_loader.py](file:///d:/hong/9.%20project/agent_mcp/src/dynamic_loader.py), [tool_executor.py](file:///d:/hong/9.%20project/agent_mcp/src/tool_executor.py), [mcp_server_impl.py](file:///d:/hong/9.%20project/agent_mcp/src/mcp_server_impl.py)

3. **분산된 인증 체계로 인한 관리 복잡성 및 패스워드 보안 강화 필요**
    - **JWT 기반 통합 인증**
        웹 세션(12시간)과 장기 API 키(1년) 체계를 JWT 규격으로 통일하여 표준화된 헤더 검증 프로세스 구현
    - **Bcrypt 보안 표준화**
        기존 SHA-256 방식에서 솔팅(Salting)이 포함된 Bcrypt 방식으로 전환하여 패스워드 저장 및 검증 단계의 보안 강화
    - **성과**
        인증 체계의 무결성 확보 및 사용자 계정 보호 수준을 엔터프라이즈급으로 향상
    - **관련 소스**: [auth.py (Utils)](file:///d:/hong/9.%20project/agent_mcp/src/utils/auth.py), [auth.py (Router)](file:///d:/hong/9.%20project/agent_mcp/src/routers/auth.py), [user.py (DB)](file:///d:/hong/9.%20project/agent_mcp/src/db/user.py)

4. **공공데이터(XML) 등 레거시 규격 대응 시 프론트엔드의 처리 부담 및 인코딩 오류**
    - **OpenAPI Proxy & 변환 계층**
        `xmltodict`를 활용한 XML-to-JSON 자동 변환 파이프라인 구축으로 클라이언트 데이터 처리 부담 최소화
    - **이중 인코딩 방지 로직**
        공공데이터 API 특유의 ServiceKey 인코딩 문제를 해결하기 위해 raw-key 유지 및 동적 파라미터 병합 프로세스 정교화
    - **성과**
        이기종 데이터 소스 간의 상호 운용성 확보 및 외부 연동 개발 생산성 제고
    - **관련 소스**: [openapi.py](file:///d:/hong/9.%20project/agent_mcp/src/routers/openapi.py), [execution.py](file:///d:/hong/9.%20project/agent_mcp/src/routers/execution.py)
