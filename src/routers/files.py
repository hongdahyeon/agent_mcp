from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from typing import List
import os
import uuid
from datetime import datetime
import shutil

from src.dependencies import get_current_user_jwt
from src.db.file_manager import save_file_metadata, log_file_action, get_file_by_id, increase_download_count

router = APIRouter(
    prefix="/api/files",
    tags=["files"],
    responses={404: {"description": "Not found"}},
)

# 기본 저장 경로 설정
BASE_UPLOAD_DIR = "d:/files/agent_mcp"

@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user_jwt)
):
    """
    다중 파일 업로드 처리
    저장 경로: d:/files/agent_mcp/yyyy/mm/dd
    """
    uploaded_files = []
    
    # 0. 배치 ID 생성 (한 요청에 포함된 파일들은 동일한 batch_id를 가짐)
    batch_id = str(uuid.uuid4())
    
    # 1. 저장 경로 생성 (yyyy/mm/dd)
    today = datetime.now()
    date_path = today.strftime("%Y/%m/%d")
    upload_dir = os.path.join(BASE_UPLOAD_DIR, date_path)
    
    os.makedirs(upload_dir, exist_ok=True)
    
    for file in files:
        try:
            # 2. 파일명 중복 방지 처리
            # 원본 파일명에서 확장자 추출
            filename = file.filename
            file_ext = os.path.splitext(filename)[1].lower().replace('.', '')
            
            # 고유한 file_id 생성
            file_id = str(uuid.uuid4())
            
            # 저장될 파일명 (UUID_원본파일명 형태 또는 UUID만 사용)
            # 여기서는 UUID + 확장자로 저장하여 충돌 완벽 방지
            saved_filename = f"{file_id}.{file_ext}" if file_ext else file_id
            
            file_path = os.path.join(upload_dir, saved_filename)
            
            # 3. 파일 저장
            # file.file is a SpooledTemporaryFile
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            # 파일 사이즈 확인
            file_size = os.path.getsize(file_path)
            
            # 4. DB 메타데이터 저장
            # 상대 경로 또는 URL 생성을 위한 처리 (필요시 수정)
            # 여기서는 로컬 전체 경로를 file_path로, URL은 일단 path와 동일하게 저장하거나 다운로드 API 경로로 설정
            # file_url 예시: /files/download/{file_id}
            
            file_info = {
                'file_id': file_id,
                'file_nm': saved_filename,
                'org_file_nm': filename,
                'file_path': file_path,
                'file_url': f"/files/download/{file_id}", # 가상 URL
                'file_size': file_size,
                'file_type': file.content_type,
                'extension': file_ext,
                'storage_tp': 'LOCAL',
                'reg_uid': current_user['user_id'],
                'batch_id': batch_id
            }
            
            file_uid = save_file_metadata(file_info)
            
            # 5. 로그 저장 - (파일 업로드 시에는 로그 저장 안 함, 다운로드 시에만 저장)
            # log_file_action(file_uid, file_id, current_user['user_id'])
            
            uploaded_files.append({
                "file_uid": file_uid,
                "file_id": file_id,
                "org_file_nm": filename,
                "file_url": file_info['file_url']
            })
            
        except Exception as e:
            print(f"Error uploading file {file.filename}: {e}")
            # 개별 파일 실패 시 전체 실패로 할지, 성공한 것만 리턴할지 결정 필요
            # 일단 에러 로그만 남기고 계속 진행하도록 함
            continue
            
    return {"uploaded": uploaded_files}

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user_jwt)
):
    """
    파일 다운로드
    """
    # 1. 파일 정보 조회
    file_info = get_file_by_id(file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
        
    file_path = file_info['file_path']
    org_file_nm = file_info['org_file_nm']
    
    # 2. 파일 존재 여부 확인
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Physical file not found")
        
    # 3. 로그 기록
    # 다운로드는 'DOWNLOAD' 액션으로 구분하면 좋겠지만, 현재 스키마에는 액션 타입이 없음.
    # 단순히 이력 테이블에 추가. (추후 테이블에 action_type 컬럼 추가 고려)
    log_file_action(file_info['file_uid'], file_id, current_user['user_id'])
    increase_download_count(file_info['file_uid'])
    
    # 4. 파일 반환
    # 한글 파일명 처리를 위해 filename* 사용 권장되지만, 간단히 filename 설정
    from urllib.parse import quote
    encoded_filename = quote(org_file_nm)
    
    return FileResponse(
        path=file_path,
        filename=org_file_nm,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )

@router.get("/{file_uid}/logs")
async def get_file_history(
    file_uid: int,
    current_user: dict = Depends(get_current_user_jwt)
):
    """
    파일 이력 조회
    """
    from src.db.file_manager import get_file_logs
    
    logs = get_file_logs(file_uid)
    return {"logs": logs}

@router.get("/list")
async def get_file_list(
    limit: int = 100,
    current_user: dict = Depends(get_current_user_jwt)
):
    """
    전체 파일 목록 조회
    """
    from src.db.file_manager import get_all_files
    
    files = get_all_files(limit)
    return {"files": files}
