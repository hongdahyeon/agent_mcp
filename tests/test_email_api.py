import requests
import json
import sys
import os

# Add project root to sys.path to allow imports from src
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

try:
    from src.utils.mailer import EmailSender
    from src.db.email_manager import log_email, get_email_logs
    from src.db.connection import get_db_connection
except ImportError:
    print("Could not import required modules. Check your python path.")
    sys.exit(1)

def get_admin_uid():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT uid FROM h_user WHERE user_id='admin'")
        row = cur.fetchone()
        conn.close()
        if row: return row[0]
    except:
        pass
    return 1 # Fallback

def test_send_immediate_email(recipient):
    print(f"\n[Test 1] Sending Immediate Email to {recipient}...")
    data = {
        "recipient": recipient,
        "subject": "[Test] Immediate Email",
        "content": "This is a test email sent immediately from System Config.",
        "is_scheduled": False
    }
    
    try:
        # User requested direct usage of EmailSender
        # Note: calling send_immediate because send_email was removed/renamed
        success, error = EmailSender().send_immediate(data.get("recipient"), data.get("subject"), data.get("content"))
        if success:
            print(">> SUCCESS: Email sent via SMTP.")
        else:
            print(f">> FAILED: {error}")
    except Exception as e:
        print(f">> ERROR: {e}")
    return None

def test_send_scheduled_email(recipient):
    print(f"\n[Test 2] Sending Scheduled Email to {recipient}...")
    
    user_uid = get_admin_uid()
    subject = "[Test] Scheduled Email"
    content = "This is a scheduled test email."
    scheduled_dt = "2025-12-31 23:59"
    
    try:
        # Scheduled email purely logs to DB
        log_id = log_email(
            user_uid=user_uid,
            recipient=recipient,
            subject=subject,
            content=content,
            is_scheduled=True,
            scheduled_dt=scheduled_dt
        )
        print(f">> SUCCESS: Scheduled email logged with ID {log_id}.")
        return log_id
    except Exception as e:
        print(f">> ERROR: {e}")
    return None

def verify_logs(log_ids):
    print("\n[Test 3] Verifying Logs...")
    
    try:
        # Use direct DB access for verification too
        logs = get_email_logs(limit=10)
        print(f"Total Recent Logs Retrieved: {len(logs)}")
        
        found_count = 0
        for log in logs:
            if log['id'] in log_ids:
                print(f" - Log ID: {log['id']}, Recipient: {log['recipient']}, Status: {log['status']}, Subject: {log['subject']}")
                found_count += 1
        
        if found_count == len(log_ids):
            print(">> SUCCESS: All expected test logs found.")
        else:
             print(f">> WARNING: Only {found_count}/{len(log_ids)} logs found.")
             
    except Exception as e:
        print(f">> ERROR: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_email_api.py <recipient_email>")
        print("Example: python test_email_api.py myemail@example.com")
        sys.exit(1)
        
    recipient_email = sys.argv[1]
    
    # 1. Immediate Send
    test_send_immediate_email(recipient_email)
    
    # 2. Scheduled Send
    log_id_2 = test_send_scheduled_email(recipient_email)
    
    log_ids = []
    # Note: immediate email test didn't log to DB in this direct-call version, so we only verify scheduled log
    if log_id_2: log_ids.append(log_id_2)
    
    # 3. Verify Logs
    if log_ids:
        verify_logs(log_ids)
    else:
        print("\n>> SKIP: Log verification skipped (no logs created).")
