"""Inventory, Supplier, Import Receipt API endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.response import success_response, paginated_response
from app.application.schemas.inventory import *
from app.application.services.inventory_service import InventoryService, SupplierService, ImportReceiptService
from app.api.v1.dependencies import require_manager, require_staff, get_current_user
from app.infrastructure.persistence.models.user import NguoiDung
from app.infrastructure.persistence.models.staff import NhanVien

inv_router = APIRouter(prefix="/inventory", tags=["Inventory"])
supplier_router = APIRouter(prefix="/suppliers", tags=["Suppliers"])
import_router = APIRouter(prefix="/import-receipts", tags=["Import Receipts"])
bom_router = APIRouter(prefix="/bom", tags=["Bill of Materials"])


@inv_router.get("")
def list_inventory(page: int = 1, page_size: int = 10, low_stock: bool = False,
                   db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = InventoryService(db)
    items, total = svc.get_inventory(page, page_size, low_stock)
    data = []
    for i in items:
        d = InventoryResponse.model_validate(i).model_dump()
        d["ten_san_pham"] = i.san_pham.ten_san_pham if i.san_pham else None
        data.append(d)
    return paginated_response(data, total, page, page_size)


@inv_router.put("/{inv_id}")
def update_inventory(inv_id: int, data: InventoryUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = InventoryService(db)
    item = svc.update_inventory(inv_id, data.model_dump(exclude_unset=True))
    return success_response(data=InventoryResponse.model_validate(item).model_dump(), message="Cập nhật tồn kho thành công")


@supplier_router.get("")
def list_suppliers(page: int = 1, page_size: int = 10, search: Optional[str] = None,
                   db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = SupplierService(db)
    suppliers, total = svc.get_suppliers(page, page_size, search)
    return paginated_response([SupplierResponse.model_validate(s).model_dump() for s in suppliers], total, page, page_size)


@supplier_router.post("")
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = SupplierService(db)
    s = svc.create_supplier(data.model_dump())
    return success_response(data=SupplierResponse.model_validate(s).model_dump(), message="Tạo NCC thành công")


@supplier_router.put("/{s_id}")
def update_supplier(s_id: int, data: SupplierUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = SupplierService(db)
    s = svc.update_supplier(s_id, data.model_dump(exclude_unset=True))
    return success_response(data=SupplierResponse.model_validate(s).model_dump(), message="Cập nhật thành công")


@import_router.get("")
def list_import_receipts(page: int = 1, page_size: int = 10, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = ImportReceiptService(db)
    receipts, total = svc.get_receipts(page, page_size)
    return paginated_response([ImportReceiptResponse.model_validate(r).model_dump() for r in receipts], total, page, page_size)


@import_router.post("")
def create_import_receipt(data: ImportReceiptCreate, current_user: NguoiDung = Depends(require_manager), db: Session = Depends(get_db)):
    svc = ImportReceiptService(db)
    staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == current_user.ma_nguoi_dung).first()
    r = svc.create_receipt(data.model_dump(), staff.ma_nhan_vien if staff else None)
    return success_response(data=ImportReceiptResponse.model_validate(r).model_dump(), message="Tạo phiếu nhập thành công")


@bom_router.get("/service/{service_id}")
def get_bom_by_service(service_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    from app.application.services.inventory_service import BOMService
    svc = BOMService(db)
    items = svc.get_bom_by_service(service_id)
    resp = []
    for i in items:
        d = BOMItemResponse.model_validate(i).model_dump()
        d["ten_ton_kho"] = i.ton_kho.san_pham.ten_san_pham if (i.ton_kho and i.ton_kho.san_pham) else "Vật tư"
        resp.append(d)
    return success_response(data=resp)


@bom_router.post("/service/{service_id}")
def create_bom_item(service_id: int, data: BOMItemCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    from app.application.services.inventory_service import BOMService
    svc = BOMService(db)
    bom = svc.create_bom_item(service_id, data.model_dump())
    return success_response(data=BOMItemResponse.model_validate(bom).model_dump(), message="Đã thêm định mức")


@bom_router.delete("/{bom_id}")
def delete_bom_item(bom_id: int, db: Session = Depends(get_db), _=Depends(require_manager)):
    from app.application.services.inventory_service import BOMService
    svc = BOMService(db)
    svc.delete_bom_item(bom_id)
    return success_response(message="Đã xóa cấu hình định mức")
