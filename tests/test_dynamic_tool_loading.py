import pytest
import asyncio
import os
import sys
from mcp.server.fastmcp import FastMCP

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_manager import init_db
from src.db.custom_tool import create_tool, delete_tool
from src.db.custom_tool_param import add_tool_param
from src.dynamic_loader import register_dynamic_tools

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()

@pytest.mark.asyncio
async def test_dynamic_tool_registration():
    # 1. Create Dummy Tools in DB
    sql_tool_id = create_tool(
        name="test_get_user_limit",
        tool_type="SQL",
        definition="SELECT * FROM h_mcp_tool_limit WHERE target_id = :target_id",
        description_agent="Get limit for target",
        created_by="tester"
    )
    add_tool_param(sql_tool_id, "target_id", "STRING", "Y", "Target User ID")

    py_tool_id = create_tool(
        name="test_multiply",
        tool_type="PYTHON",
        definition="a * b",
        description_agent="Multiply two numbers",
        created_by="tester"
    )
    add_tool_param(py_tool_id, "a", "NUMBER", "Y", "First number")
    add_tool_param(py_tool_id, "b", "NUMBER", "Y", "Second number")

    try:
        # 2. Initialize FastMCP and Register Tools
        mcp = FastMCP("test-server")
        register_dynamic_tools(mcp)
        
        # 3. Verify Registration
        tools = await mcp.list_tools()
        tool_names = [t.name for t in tools]
        
        assert "test_get_user_limit" in tool_names
        assert "test_multiply" in tool_names
        
    finally:
        # 4. Cleanup
        delete_tool(sql_tool_id)
        delete_tool(py_tool_id)

