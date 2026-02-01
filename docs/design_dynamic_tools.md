# Feature Design: Dynamic Tool Creation

## 1. 개요
사용자(Admin)가 웹 UI를 통해 MCP Tool을 동적으로 생성하고 관리할 수 있는 기능을 구현합니다.
별도의 코드 배포 없이, DB 쿼리나 간단한 로직을 수행하는 Tool을 즉시 추가하여 Agent의 기능을 확장할 수 있습니다.

## 2. 요구사항 분석
1. **Tool 기본 정보 정의**: 이름, Agent용 설명, 사용자용 설명.
2. **동적 파라미터 정의**: 인자명, 타입(String/Number/Boolean 등), 필수 여부.
3. **실행 로직 정의**:
    - **Type A (SQL Query)**: DB 테이블 조회/조인 (예: 특정 유저의 제한량 조회).
    - **Type B (Python Expression)**: 간단한 연산/로직 (예: 입력값 연산).
4. **결과 반환**: 실행 결과를 정의된 포맷(JSON/Text)으로 반환.

## 3. 아키텍처 설계

### 3.1. Database Schema
동적 Tool의 정의를 저장하기 위한 테이블을 설계합니다.

#### `h_custom_tool`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | 내부 ID |
| name | TEXT | Tool 이름 (Unique, ex: `get_user_limit`) |
| description_agent | TEXT | Agent에게 전달될 설명 |
| description_user | TEXT | UI에 표시될 설명 |
| tool_type | TEXT | `SQL` or `PYTHON` |
| definition | TEXT | 실행 코드 또는 SQL 쿼리 (JSON or Raw) |
| is_active | TEXT | 활성 상태 ('Y'/'N') |
| reg_dt | TEXT | 생성일시 |
| created_by | TEXT | 생성자 ID |

#### `h_custom_tool_param`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | 내부 ID |
| tool_id | INTEGER FK | 부모 Tool ID |
| param_name | TEXT | 파라미터 이름 (ex: `user_nm`) |
| param_type | TEXT | `STRING`, `NUMBER`, `BOOLEAN` |
| is_required | TEXT | 필수 여부 ('Y'/'N') |
| description | TEXT | 파라미터 설명 |

### 3.2. Server-Side Logic (Dynamic Registration)
MCP 서버가 시작될 때(`init`), `h_custom_tool` 테이블을 조회하여 동적으로 Tool을 등록합니다.

- **Challenge**: `FastMCP`의 데코레이터(`@mcp.tool()`)는 정적 함수에 주로 사용됨.
- **Solution**:
    1. 서버 시작 시 DB에서 Active Tools 로드.
    2. 파라미터 정보를 기반으로 `pydantic` 모델 동적 생성.
    3. 실행 핸들러(`dynamic_tool_handler`) 생성 및 등록.

#### 실행 핸들러 로직
1. **입력값 검증**: 동적 생성된 Pydantic 모델로 변환.
2. **로직 실행**:
    - **SQL Type**:
        - 정의된 SQL 쿼리 로드 (ex: `SELECT * FROM h_user WHERE user_nm = :user_nm`).
        - 파라미터 바인딩 (`jinja2` 또는 `sqlite3` 파라미터).
        - DB 실행 및 결과(Dict) 반환.
    - **Python Type**:
        - 샌드박스 환경(`simpleeval` 라이브러리 등 활용 권장)에서 수식 실행.
        - 보안을 위해 `exec` 대신 안전한 표현식 평가기 사용.
3. **결과 포맷팅**: JSON 문자열로 변환하여 Return.

### 3.3. Frontend UI (Tool Builder)
관리자 메뉴에 '사용자 정의 도구(Custom Tools)' 메뉴 추가.

#### 1. Tool List
- 등록된 도구 목록 표시.
- 활성/비활성 토글.
- 테스트 실행 버튼.

#### 2. Tool Editor (Create/Edit)
- **Step 1: 기본 정보**: 이름, 설명 입력.
- **Step 2: 파라미터 정의**:
    - 동적 Form Repeater (Add Parameter 버튼).
    - 이름, 타입, 필수여부 설정.
- **Step 3: 로직 정의**:
    - 탭 선택 (SQL / Python).
    - **SQL 모드**:
        - 테이블 탐색기 제공 (드래그 앤 드롭 또는 참조).
        - SQL 에디터 (Syntax Highlight).
        - 파라미터 자동완성 (ex: `{{user_nm}}`).
    - **Python 모드**:
        - 수식 에디터.
        - `result = arg1 * arg2` 형태.
- **Step 4: 테스트 및 저장**:
    - 입력값 모의 입력 후 'Test Run'.
    - 결과 확인 후 저장.

## 4. 예시 시나리오 구현 방안

### 예시 1: 사용자 제한량 조회 (SQL Type)
- **Name**: `get_user_daily_limit`
- **Desc**: "특정 사용자의 일일 제한량을 조회합니다."
- **Params**: `user_name` (Target User)
- **Logic (SQL)**:
    ```sql
    SELECT u.user_nm, l.max_count 
    FROM h_user u 
    JOIN h_mcp_tool_limit l ON u.uid = l.target_id 
    WHERE u.user_nm = :user_name AND l.target_type = 'USER'
    ```
- **Execution**:
    - User input: `user_name='hong'` -> Query Binding -> Exec -> Result: `{"user_nm": "hong", "max_count": 50}`

### 예시 2: 숫자 곱하기 (Python Type)
- **Name**: `multiply_numbers`
- **Desc**: "두 숫자를 입력받아 곱한 결과를 반환합니다."
- **Params**: `num1` (Number), `num2` (Number)
- **Logic (Python Expression)**:
    ```python
    num1 * num2
    ```
- **Execution**:
    - Input: `num1=5, num2=3` -> Eval -> Result: `15`

## 5. 보안 고려사항
1. **SQL Injection**: 반드시 Parameterized Query (`?` or `:name`) 사용. 문자열 치환 금지.
2. **Code Injection (Python)**:
    - `eval()` 직접 사용 금지.
    - `simpleeval` 또는 `asteval` 사용하여 사용 가능한 연산자/함수 화이트리스팅.
    - 파일 시스템 접근, 네트워크 접근 등 차단.

## 6. 구현 단계 (Proposed)
1. **Phase 1**: DB 스키마 생성 및 Python `register_dynamic_tools` 로직 구현 (SQL Only).
2. **Phase 2**: Frontend Tool Editor 구현 (기본 정보 + 파라미터 + SQL 에디터).
3. **Phase 3**: Python Expression 타입 추가 및 안전한 실행기 구현.
4. **Phase 4**: Agent 연동 테스트 및 최적화.
