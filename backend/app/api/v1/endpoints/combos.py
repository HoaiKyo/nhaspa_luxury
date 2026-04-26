"""Combo API endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.response import success_response
from app.application.schemas.combo import *
from app.application.services.combo_service import ComboService
from app.api.v1.dependencies import get_current_user, require_staff, require_manager
from app.infrastructure.persistence.models.user import NguoiDung

router = APIRouter(prefix="/combos", tags=["Combos"])


@router.get("/{combo_id}/details")
def get_combo_details(combo_id: int, db: Session = Depends(get_db)):
    svc = ComboService(db)
    details = svc.get_combo_details(combo_id)
    data = []
    for d in details:
        r = ComboDetailResponse.model_validate(d).model_dump()
        r["ten_dich_vu"] = d.dich_vu.ten_san_pham if d.dich_vu else None
        data.append(r)
    return success_response(data=data)


@router.post("/details")
def add_combo_detail(data: ComboDetailCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = ComboService(db)
    detail = svc.add_combo_detail(data.model_dump())
    return success_response(data=ComboDetailResponse.model_validate(detail).model_dump(), message="Thêm dịch vụ vào combo thành công")


@router.delete("/details/{detail_id}")
def remove_combo_detail(detail_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = ComboService(db)
    svc.remove_combo_detail(detail_id)
    return success_response(message="Xóa thành công")


@router.get("/customer/{customer_id}")
def get_customer_combos(customer_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = ComboService(db)
    combos = svc.get_customer_combos(customer_id)
    data = []
    for c in combos:
        r = CustomerComboResponse.model_validate(c).model_dump()
        r["ten_combo"] = c.combo.ten_san_pham if c.combo else None
        r["ho_ten_khach"] = c.khach_hang.ho_ten if c.khach_hang else None
        data.append(r)
    return success_response(data=data)


@router.post("/purchase")
def purchase_combo(data: CustomerComboCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = ComboService(db)
    combo = svc.purchase_combo(data.model_dump())
    return success_response(data=CustomerComboResponse.model_validate(combo).model_dump(), message="Mua combo thành công")
