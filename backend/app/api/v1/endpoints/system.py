from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.core.response import success_response
from app.infrastructure.persistence.models.system import CauHinhHeThong
from app.api.v1.dependencies import require_manager

router = APIRouter(prefix="/system", tags=["System Settings"])

class SettingUpdate(BaseModel):
    ma_cau_hinh: str
    gia_tri: str

@router.get("/settings")
def get_all_settings(db: Session = Depends(get_db), _=Depends(require_manager)):
    settings = db.query(CauHinhHeThong).all()
    
    # Nếu chưa có dữ liệu, tự động thêm mặc định
    if not settings:
        default_cap = CauHinhHeThong(
            ma_cau_hinh="MAX_CAPACITY",
            gia_tri="10",
            mo_ta="Số lượng khách nhận tối đa cho mỗi khung giờ 30 phút",
            loai_du_lieu="INT"
        )
        db.add(default_cap)
        db.commit()
        db.refresh(default_cap)
        settings = [default_cap]
        
    return success_response(data=settings)

@router.put("/settings")
def update_setting(data: SettingUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    setting = db.query(CauHinhHeThong).filter(CauHinhHeThong.ma_cau_hinh == data.ma_cau_hinh).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình")
    
    setting.gia_tri = data.gia_tri
    db.commit()
    return success_response(message=f"Đã cập nhật {data.ma_cau_hinh} thành {data.gia_tri}")
