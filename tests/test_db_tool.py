## 파일 설명
## >> mcp_tool: get_user_info 사용이 잘 되는지 체크

import sys
import os

# Add project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Create dummy DB if needed (init_db)
# Create dummy DB if needed (init_db)
from src import db_init_manager
db_init_manager.init_db()

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
