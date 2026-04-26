"""
Inventory Service with transaction-safe stock updates.
"""
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple
from decimal import Decimal

from app.core.exceptions import NotFoundException
from app.core.logging_config import get_logger
from app.infrastructure.persistence.models.inventory import TonKho, NhaCungCap, PhieuNhap, ChiTietPhieuNhap, DinhMucVatTu

logger = get_logger(__name__)


class BOMService:
    def __init__(self, db: Session):
        self.db = db

    def get_bom_by_service(self, service_id: int) -> List[DinhMucVatTu]:
        return self.db.query(DinhMucVatTu).options(
            joinedload(DinhMucVatTu.ton_kho)
        ).filter(DinhMucVatTu.ma_san_pham == service_id).all()

    def create_bom_item(self, service_id: int, data: dict) -> DinhMucVatTu:
        bom = DinhMucVatTu(
            ma_san_pham=service_id,
            ma_ton_kho=data["ma_ton_kho"],
            so_luong_tieu_hao=data["so_luong_tieu_hao"],
            ghi_chu=data.get("ghi_chu")
        )
        self.db.add(bom)
        self.db.commit()
        self.db.refresh(bom)
        return bom

    def delete_bom_item(self, bom_id: int):
        bom = self.db.query(DinhMucVatTu).filter(DinhMucVatTu.ma_dinh_muc == bom_id).first()
        if not bom:
            raise NotFoundException("Không tìm thấy cấu hình định mức")
        self.db.delete(bom)
        self.db.commit()


class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def get_inventory(self, page: int = 1, page_size: int = 10, low_stock: bool = False) -> Tuple[List[TonKho], int]:
        query = self.db.query(TonKho).options(joinedload(TonKho.san_pham))
        if low_stock:
            query = query.filter(TonKho.so_luong <= TonKho.so_luong_toi_thieu)
        total = query.count()
        items = (
            query.order_by(TonKho.ma_ton_kho.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def update_inventory(self, inventory_id: int, data: dict) -> TonKho:
        inv = self.db.query(TonKho).filter(TonKho.ma_ton_kho == inventory_id).first()
        if not inv:
            raise NotFoundException(message="Tồn kho không tồn tại")
        for key, value in data.items():
            if value is not None:
                setattr(inv, key, value)
        self.db.commit()
        self.db.refresh(inv)
        return inv


class SupplierService:
    def __init__(self, db: Session):
        self.db = db

    def get_suppliers(self, page: int = 1, page_size: int = 10, search: Optional[str] = None) -> Tuple[List[NhaCungCap], int]:
        query = self.db.query(NhaCungCap)
        if search:
            query = query.filter(NhaCungCap.ten_nha_cung_cap.ilike(f"%{search}%"))
        total = query.count()
        suppliers = (
            query.order_by(NhaCungCap.ma_nha_cung_cap.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return suppliers, total

    def get_supplier(self, supplier_id: int) -> NhaCungCap:
        s = self.db.query(NhaCungCap).filter(NhaCungCap.ma_nha_cung_cap == supplier_id).first()
        if not s:
            raise NotFoundException(message="Nhà cung cấp không tồn tại")
        return s

    def create_supplier(self, data: dict) -> NhaCungCap:
        supplier = NhaCungCap(**data)
        self.db.add(supplier)
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def update_supplier(self, supplier_id: int, data: dict) -> NhaCungCap:
        supplier = self.get_supplier(supplier_id)
        for key, value in data.items():
            if value is not None:
                setattr(supplier, key, value)
        self.db.commit()
        self.db.refresh(supplier)
        return supplier

    def delete_supplier(self, supplier_id: int) -> None:
        supplier = self.get_supplier(supplier_id)
        supplier.trang_thai = "INACTIVE"
        self.db.commit()


class ImportReceiptService:
    def __init__(self, db: Session):
        self.db = db

    def create_receipt(self, data: dict, staff_id: Optional[int] = None) -> PhieuNhap:
        """Create import receipt and update inventory in a transaction."""
        chi_tiets_data = data.pop("chi_tiets", [])
        tong_tien = Decimal("0")
        for d in chi_tiets_data:
            d["thanh_tien"] = Decimal(str(d["don_gia"])) * d["so_luong"]
            tong_tien += d["thanh_tien"]

        receipt = PhieuNhap(
            ma_nha_cung_cap=data["ma_nha_cung_cap"], ma_nhan_vien=staff_id,
            tong_tien=tong_tien, trang_thai="CONFIRMED", ghi_chu=data.get("ghi_chu"),
        )
        self.db.add(receipt)
        self.db.flush()

        for dd in chi_tiets_data:
            detail = ChiTietPhieuNhap(ma_phieu_nhap=receipt.ma_phieu_nhap, **dd)
            self.db.add(detail)
            inv = self.db.query(TonKho).filter(TonKho.ma_san_pham == dd["ma_san_pham"]).first()
            if inv:
                inv.so_luong += dd["so_luong"]
            else:
                self.db.add(TonKho(ma_san_pham=dd["ma_san_pham"], so_luong=dd["so_luong"]))

        self.db.commit()
        self.db.refresh(receipt)
        logger.info("import_receipt_created", receipt_id=receipt.ma_phieu_nhap)
        return receipt

    def get_receipts(self, page: int = 1, page_size: int = 10) -> Tuple[List[PhieuNhap], int]:
        query = self.db.query(PhieuNhap).options(joinedload(PhieuNhap.chi_tiets))
        total = query.count()
        receipts = query.order_by(PhieuNhap.ngay_tao.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return receipts, total
