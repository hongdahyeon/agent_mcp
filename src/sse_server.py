
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import uvicorn
from mcp.server.sse import SseServerTransport
from mcp.server import Server
from mcp.types import Tool, TextContent

app = FastAPI()

# Initialize MCP Server
mcp = Server("agent-mcp-sse")
sse = SseServerTransport("/messages")

@mcp.list_tools()
async def list_tools():
    return [
        Tool(
            name="add",
            description="Add two numbers",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"}
                },
                "required": ["a", "b"]
            }
        ),
        Tool(
            name="subtract",
            description="Subtract two numbers",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"}
                },
                "required": ["a", "b"]
            }
        )
    ]

@mcp.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "add":
        a = arguments.get("a", 0)
        b = arguments.get("b", 0)
        return [TextContent(type="text", text=str(a + b))]
    elif name == "subtract":
        a = arguments.get("a", 0)
        b = arguments.get("b", 0)
        return [TextContent(type="text", text=str(a - b))]
    raise ValueError(f"Unknown tool: {name}")

@app.get("/sse")
async def handle_sse(request: Request):
    """
    Handle Server-Sent Events connection.
    Connects the MCP server to the incoming SSE stream.
    """
    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
        await mcp.run(
            streams[0], 
            streams[1], 
            mcp.create_initialization_options()
        )

@app.post("/messages")
async def handle_messages(request: Request):
    """
    Handle incoming JSON-RPC messages from the client.
    """
    await sse.handle_post_message(request.scope, request.receive, request._send)

# Serve static files for the web interface
app.mount("/static", StaticFiles(directory="src/web"), name="static")

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
