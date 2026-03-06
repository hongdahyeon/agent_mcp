# MCP REST API 사용 가이드

본 문서는 SSE 연결 없이 일반 REST API(HTTP POST)를 사용하여 MCP 도구를 호출하는 방법을 설명합니다.

---

## 기본 정보

- **Endpoint**: `POST /api/mcp/proxy/{tool_name}`
- **Authentication**: `Authorization: Bearer <token>` 헤더 (JWT 또는 외부 보안 토큰 `sk_...` 지원)

---

## 사용 예시 (Postman / curl)

### 1. 정적 도구 호출 예시 (add)

**Request:**

- **URL**: `http://localhost:8000/api/mcp/proxy/add`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <발급받은_액세스_토큰>`
- **Body (JSON)**:
  ```json
  {
    "arguments": {
      "a": 10,
      "b": 20
    }
  }
  ```

**Response:**

```json
{
  "tool": "add",
  "success": true,
  "result": "30"
}
```

---

### 2. 사용자 정보 조회 예시 (get_user_info - Admin 전용)

**Request:**

- **URL**: `http://localhost:8000/api/mcp/proxy/get_user_info`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Body (JSON)**:
  ```json
  {
    "arguments": {
      "user_id": "admin"
    }
  }
  ```

**Response:**

```json
{
  "tool": "get_user_info",
  "success": true,
  "result": "{\"uid\": 1, \"user_id\": \"admin\", \"user_nm\": \"관리자\", \"role\": \"ROLE_ADMIN\", ...}"
}
```

---

### 3. 동적 도구 호출 예시 (사용자 정의 도구)

**Request:**

- **URL**: `http://localhost:8000/api/mcp/proxy/{커스텀_도구_이름}`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Body (JSON)**:
  ```json
  {
    "arguments": {
      "param1": "value1",
      "param2": 123
    }
  }
  ```

---

## 장점

- **Handshake 불필요**: SSE 연결 -> sessionId 획득 -> initialize 과정 없이 단 한 번의 호출로 결과 획득 가능.
- **표준 호환**: 내부적으로 MCP의 `call_tool` 로직을 그대로 사용하므로 사용량 제한, 로그 기록 등의 정책이 동일하게 적용됨.
- **확장성**: 동적 도구 생성 후 즉시 REST API로 노출되어 외부 서비스(Slack, Discord Bot 등)와 연동하기 용이함.
