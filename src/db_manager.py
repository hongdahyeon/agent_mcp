import sqlite3
import hashlib
from datetime import datetime
import os

DB_PATH = "agent_mcp.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables and seed admin user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # User Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_user (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        user_nm TEXT NOT NULL,
        role TEXT DEFAULT 'ROLE_USER',
        last_cnn_dt TEXT
    )
    ''')
    
    # Login History Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS h_login_hist (
        uid INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid INTEGER,
        login_dt TEXT NOT NULL,
        login_ip TEXT,
        login_success TEXT,
        login_msg TEXT,
        FOREIGN KEY (user_uid) REFERENCES h_user (uid)
    )
    ''')
    
    # Seed Admin User if not exists
    cursor.execute('SELECT * FROM h_user WHERE user_id = ?', ('admin',))
    if not cursor.fetchone():
        # Simple hash for demo (In production, use bcrypt/argon2)
        password_hash = hashlib.sha256("1234".encode()).hexdigest()
        cursor.execute('''
        INSERT INTO h_user (user_id, password, user_nm, role, last_cnn_dt)
        VALUES (?, ?, ?, ?, ?)
        ''', ('admin', password_hash, '관리자', 'ROLE_ADMIN', datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        print("[DB] Admin user created (ID: admin / PW: 1234)")
    
    conn.commit()
    conn.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password (SHA256) and length check."""
    if len(plain_password) < 4:
        return False
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def get_user(user_id: str):
    """Retrieve user by ID."""
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM h_user WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    return user

def log_login_attempt(user_uid: int, ip_address: str, success: bool, msg: str = ""):
    """Log login attempt to history table."""
    conn = get_db_connection()
    status = 'SUCCESS' if success else 'FAIL'
    
    conn.execute('''
    INSERT INTO h_login_hist (user_uid, login_dt, login_ip, login_success, login_msg)
    VALUES (?, ?, ?, ?, ?)
    ''', (user_uid, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), ip_address, status, msg))
    
    # Update last connection time if success
    if success and user_uid:
        conn.execute('UPDATE h_user SET last_cnn_dt = ? WHERE uid = ?', 
                     (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), user_uid))
        
    conn.commit()
    conn.close()

def get_login_history(limit: int = 100):
    """Fetch login history with user details."""
    conn = get_db_connection()
    query = '''
    SELECT h.uid, u.user_id, u.user_nm, h.login_dt, h.login_ip, h.login_success, h.login_msg
    FROM h_login_hist h
    LEFT JOIN h_user u ON h.user_uid = u.uid
    ORDER BY h.login_dt DESC
    LIMIT ?
    '''
    rows = conn.execute(query, (limit,)).fetchall()
    conn.close()
    
    # Convert Row objects to dicts
    return [dict(row) for row in rows]
