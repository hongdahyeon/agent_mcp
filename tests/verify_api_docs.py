import requests
import json

BASE_URL = "http://localhost:8000"

def test_openapi_schema():
    print("Testing /openapi.json...")
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        response.raise_for_status()
        schema = response.json()
        print("✓ /openapi.json is valid JSON")
        
        # Check title and description
        info = schema.get("info", {})
        print(f"  Title: {info.get('title')}")
        print(f"  Version: {info.get('version')}")
        
        # Check for our proxy endpoints
        paths = schema.get("paths", {})
        proxy_path = "/api/mcp/proxy/{tool_name}"
        tools_path = "/api/mcp/proxy/tools"
        
        if proxy_path in paths:
            print(f"✓ Path {proxy_path} found in schema")
        else:
            print(f"✗ Path {proxy_path} NOT found in schema")
            
        if tools_path in paths:
            print(f"✓ Path {tools_path} found in schema")
        else:
            print(f"✗ Path {tools_path} NOT found in schema")
            
    except Exception as e:
        print(f"✗ Error testing OpenAPI schema: {e}")

def test_tools_endpoint():
    print("\nTesting /api/mcp/proxy/tools...")
    try:
        response = requests.get(f"{BASE_URL}/api/mcp/proxy/tools")
        response.raise_for_status()
        data = response.json()
        tools = data.get("tools", [])
        print(f"✓ Successfully retrieved {len(tools)} tools")
        for t in tools[:3]:
            print(f"  - {t.get('name')}: {t.get('description', '')[:50]}...")
    except Exception as e:
        print(f"✗ Error testing tools endpoint: {e}")

if __name__ == "__main__":
    print("--- API Documentation Verification ---")
    test_openapi_schema()
    test_tools_endpoint()
