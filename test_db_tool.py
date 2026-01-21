## 파일 설명
## >> mcp_tool: get_user_info 사용이 잘 되는지 체크

import sys
import os

# Create dummy DB if needed (init_db)
from src import db_manager
db_manager.init_db()

# Import the server function
from src.server import get_user_info

# Test
print("Testing get_user_info('admin')...")
try:
    result = get_user_info("admin")
    print(f"Result: {result}")
    
    if "password" in result:
        print("FAIL: Password found in result!")
    elif "admin" in result and "ROLE_ADMIN" in result:
        print("SUCCESS: User info retrieved safely.")
    else:
        print("FAIL: User info seems incomplete or wrong.")
        
except Exception as e:
    print(f"ERROR: {e}")
