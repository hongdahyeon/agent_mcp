import os
import shutil
import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from src.db.connection import DB_PATH, PROJECT_ROOT
from src.dependencies import get_current_active_user

router = APIRouter(prefix="/api/admin/db", tags=["Admin DB"])

BACKUP_DIR = os.path.join(PROJECT_ROOT, "backups")

"""
    1. 현재 상태 안전 백업 (_safety.db): 복구 버튼을 누르는 순간, 서버는 현재 작동 중인 agent_mcp.db를 읽어서
        backups/ 폴더 안에 YYYY-MM-DD_HH-mm-SS_safety.db라는 이름으로 복사본을 먼저 만듭니다.
    2. 파일 대체: 그 직후, 관리자가 목록에서 선택한 백업 파일(예: 2024-05-20_10-00.db)의 내용을 현재 운영 중인 agent_mcp.db 파일 위로 덮어씌웁니다.
    3. 적용: 이제 서버가 바라보는 agent_mcp.db는 관리자가 선택한 과거 시점의 데이터로 교체된 상태가 됩니다.
"""

# Ensure backup directory exists
os.makedirs(BACKUP_DIR, exist_ok=True)

# DB 백업 생성 API
@router.post("/backup")
async def create_backup(
    user: dict = Depends(get_current_active_user)
):
    # 관리자만 접근 가능
    if user.get('role') != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin permission required")
    
    # 파일 형태: YYYY-MM-DD_HH-MM.db
    try:
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
        backup_filename = f"{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        
        # 현재 DB 파일을 백업 디렉토리로 복사 (**중요**)
        shutil.copy2(DB_PATH, backup_path)
        
        return {"message": "Backup created successfully", "filename": backup_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DB 백업 목록 조회 API
@router.get("/backups")
async def list_backups(
    user: dict = Depends(get_current_active_user)
):
    
    # 관리자만 접근 가능
    if user.get('role') != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin permission required")
    
    try:
        backups = []
        for filename in os.listdir(BACKUP_DIR):
            if filename.endswith(".db"):
                path = os.path.join(BACKUP_DIR, filename)
                stats = os.stat(path)
                backups.append({
                    "filename": filename,
                    "size": stats.st_size,
                    "created_at": datetime.datetime.fromtimestamp(stats.st_ctime).isoformat()
                })
        
        # 생성 시간 역순 정렬
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return backups
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DB 복구 API
@router.post("/restore/{filename}")
async def restore_db(
    filename: str,
    user: dict = Depends(get_current_active_user)
):

    # 관리자만 접근 가능
    if user.get('role') != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin permission required")
    
    # 백업 파일 경로 확인
    backup_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    # 복구 시도
    try:
        # 1. 현재 DB 파일의 안전한 백업 생성
        safety_timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%m-%S_safety")
        safety_path = os.path.join(BACKUP_DIR, f"{safety_timestamp}.db")
        shutil.copy2(DB_PATH, safety_path)
        
        # 2. 선택한 백업 파일로 복원
        # => {shutil.copy2}는 파일을 덮어쓰므로, 복원 시 현재 실행 중인 애플리케이션이 DB 파일을 사용 중이면 오류가 발생할 수 있음.
        #    이 경우, 애플리케이션을 재시작해야 함.
        shutil.copy2(backup_path, DB_PATH)
        
        return {"message": "Database restored successfully. Please refresh the page."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DB 백업 삭제 API
@router.delete("/backups/{filename}")
async def delete_backup(
    filename: str,
    user: dict = Depends(get_current_active_user)
):
    # 관리자만 접근 가능
    if user.get('role') != 'ROLE_ADMIN':
        raise HTTPException(status_code=403, detail="Admin permission required")
    
    # 백업 파일 경로 확인
    backup_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    try:
        os.remove(backup_path)
        return {"message": "Backup deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))