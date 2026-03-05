# Postman을 통한 MCP 도구 사용 가이드

본 문서는 Postman을 사용하여 외부에서 MCP(Model Context Protocol) SSE 엔드포인트에 접속하고, 동적/정적 도구를 호출하는 방법을 설명합니다.

---

## 1단계: SSE 연결 (통로 열기)

MCP는 서버와 클라이언트 간의 실시간 통신을 위해 SSE(Server-Sent Events) 연결을 유지해야 합니다.

1.  **Postman**에서 **[New]** -> **[Server-Sent Events]**를 선택합니다.
2.  **URL** 입력창에 다음 주소를 입력합니다:
    - `http://localhost:8000/sse?token=발급받은_액세스_토큰`
3.  **[Connect]** 버튼을 클릭합니다.
4.  하단 **'Events'** 탭에 메시지가 수신되는지 확인합니다.
    - 성공 시 `event: endpoint`라는 메시지와 함께 `/messages?session_id=...` 형태의 데이터가 수신됩니다.
    - **중요**: 이 탭(연결)을 **절대 닫지 말고 유지**해야 합니다.

---

## 2단계: session_id 확인

1단계에서 수신된 `Events` 목록에서 `session_id` 값을 복사합니다.

- 예: `fdb3457558c04ef5a9afe7773269e619`

---

## 3단계: 도구 초기화 (Initialize)

MCP 표준에 따라 도구를 호출하기 전, 서버와 클라이언트 간의 초기화 과정을 거쳐야 합니다.

1.  새로운 **[HTTP]** 탭을 엽니다.
2.  **Method**: `POST`
3.  **URL**: `http://localhost:8000/messages?sessionId=본인의_sessionId`
4.  **Headers**: `Content-Type: application/json` 확인
5.  **Body**: `raw` -> `JSON` 선택 후 아래 내용 입력:
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "method": "initialize",
      "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": { "name": "postman", "version": "1.0.0" }
      }
    }
    ```
6.  **[Send]** 클릭 후, **SSE 탭(1단계)**에서 서버의 응답 메시지가 오는지 확인합니다.

---

## 4단계: 도구 호출 (Tool Call)

초기화가 완료되면 실제 도구(정적/동적)를 호출할 수 있습니다.

1.  **POST** 요청의 **Body**를 다음과 같이 수정합니다. (동적 도구 호출 예시)
    ```json
    {
      "jsonrpc": "2.0",
      "id": 2,
      "method": "tools/call",
      "params": {
        "name": "add",
        "arguments": {
          "a": 10,
          "b": 20
        }
      }
    }
    ```
2.  **[Send]**를 누르면 **SSE 탭(1단계)**의 이벤트 목록에 결과값(`30`)이 데이터로 수신됩니다.

---

## 주요 트러블슈팅 (Troubleshooting)

| 현상                               | 원인                        | 해결 방법                                                   |
| :--------------------------------- | :-------------------------- | :---------------------------------------------------------- |
| **400 Bad Request**                | `session_id` 오타 또는 누락 | URL 파라미터를 `session_id`로 정확히 입력했는지 확인하세요. |
| **Missing Content-Type**           | 헤더 누락                   | Headers 탭에 `Content-Type: application/json`을 추가하세요. |
| **Invalid request params**         | JSON 규격 오류              | JSON-RPC 규격(jsonrpc, id, method, params)을 확인하세요.    |
| **Before initialization complete** | 초기화 미수행               | 3단계(initialize)를 먼저 수행한 후 도구를 호출하세요.       |
| **401 Unauthorized**               | 토큰 오류                   | URL의 `token` 파라미터가 유효한지 확인하세요.               |
