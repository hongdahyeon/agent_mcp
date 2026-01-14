# Agent MCP Tool

이 프로젝트는 Python으로 구현된 Model Context Protocol (MCP) 서버입니다.

## 설치 방법 (Setup)

1. 의존성 패키지 설치:
   ```bash
   pip install -r requirements.txt
   ```

## 사용 방법 (Usage)

서버 실행:
```bash
python src/server.py
```
*참고: 서버는 기본적으로 stdio를 통해 실행되며 MCP 클라이언트의 연결을 기다립니다.*

## 도구 목록 (Tools)

- `add(a, b)`: 두 숫자를 더합니다.
- `subtract(a, b)`: 두 숫자를 뺍니다.

## 설정 (Configuration)

MCP 클라이언트(예: Claude Desktop)가 이 서버를 사용하도록 설정 파일을 구성하세요.

**Windows 설정 파일 위치:**
`%APPDATA%\Claude\claude_desktop_config.json`
(일반적으로 `C:\Users\사용자명\AppData\Roaming\Claude\claude_desktop_config.json`)

**설정 내용:**
```json
{
  "mcpServers": {
    "agent-mcp-tool": {
      "command": "C:\\Users\\hong\\AppData\\Local\\Programs\\Python\\Python312\\python.exe", 
      "args": ["d:\\intellji\\hongs\\agent_mcp\\src\\server.py"]
    }
  }
}
```
*참고:*
- `python` 명령어가 환경 변수(PATH)에 등록되어 있어야 합니다.
- 만약 가상환경을 사용한다면 `python` 대신 가상환경의 python 실행 파일 절대 경로를 사용하는 것이 좋습니다.
- 경로의 역슬래시(`\`)는 슬래시(`/`)로 쓰거나 두 번(`\\`) 써야 합니다.
