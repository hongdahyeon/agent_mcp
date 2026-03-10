import os
import sys

# 프로젝트 루트를 sys.path에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
if project_root not in sys.path:
    sys.path.append(project_root)

try:
    from src.db.connection import get_db_connection
    from src.utils.auth import get_password_hash
    
    def reset_all_passwords():
        print("Starting password reset for all users...")
        new_password_plain = "1234"
        hashed_password = get_password_hash(new_password_plain)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 모든 활성 사용자 조회
        cursor.execute("SELECT uid, user_id FROM h_user WHERE is_delete = 'N'")
        users = cursor.fetchall()
        
        update_count = 0
        for user in users:
            uid = user['uid']
            user_id = user['user_id']
            
            cursor.execute(
                "UPDATE h_user SET password = ? WHERE uid = ?",
                (hashed_password, uid)
            )
            print(f"Updated password for user: {user_id} (UID: {uid})")
            update_count += 1
            
        conn.commit()
        conn.close()
        print(f"\nSuccessfully updated {update_count} users.")
        print(f"All passwords are now reset to: {new_password_plain}")

    if __name__ == "__main__":
        reset_all_passwords()

except Exception as e:
    print(f"Error during password reset: {e}")
    import traceback
    traceback.print_exc()
