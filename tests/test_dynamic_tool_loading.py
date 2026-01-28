
import sys
import os
import asyncio
from mcp.server.fastmcp import FastMCP

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_manager import init_db
from src.db.custom_tool import create_tool, delete_tool
from src.db.custom_tool_param import add_tool_param
from src.dynamic_loader import register_dynamic_tools

def test_dynamic_tool_loading():
    print(">>> 1. Initialize DB")
    init_db()

    print("\n>>> 2. Create Dummy Tools in DB")
    # SQL Tool: Get User
    sql_tool_id = create_tool(
        name="test_get_user_limit",
        tool_type="SQL",
        definition="SELECT * FROM h_mcp_tool_limit WHERE target_id = :target_id",
        description_agent="Get limit for target",
        created_by="tester"
    )
    add_tool_param(sql_tool_id, "target_id", "STRING", "Y", "Target User ID")
    print(f"Created SQL Tool: test_get_user_limit (ID: {sql_tool_id})")

    # Python Tool: Multiply
    py_tool_id = create_tool(
        name="test_multiply",
        tool_type="PYTHON",
        definition="a * b",
        description_agent="Multiply two numbers",
        created_by="tester"
    )
    add_tool_param(py_tool_id, "a", "NUMBER", "Y", "First number")
    add_tool_param(py_tool_id, "b", "NUMBER", "Y", "Second number")
    print(f"Created Python Tool: test_multiply (ID: {py_tool_id})")

    print("\n>>> 3. Initialize FastMCP and Register Tools")
    mcp = FastMCP("test-server")
    
    # Run dynamic registration
    register_dynamic_tools(mcp)
    
    # Verify registration
    # FastMCP stores tools in _tool_manager or similar depending on version, 
    # but we can try to find them in list_tools()
    
    # Since mcp.list_tools() is async, we need a wrapper
    async def verify():
        tools = await mcp.list_tools()
        tool_names = [t.name for t in tools]
        print(f"Registered Tools: {tool_names}")
        
        if "test_get_user_limit" in tool_names and "test_multiply" in tool_names:
            print("SUCCESS: Both tools are registered.")
        else:
            print("FAILURE: Tools are missing.")
            
    asyncio.run(verify())

    print("\n>>> 4. Cleanup")
    delete_tool(sql_tool_id)
    delete_tool(py_tool_id)
    print("Deleted test tools.")

if __name__ == "__main__":
    try:
        test_dynamic_tool_loading()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()
