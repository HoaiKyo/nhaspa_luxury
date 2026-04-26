"""
Combo Service.
"""
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.exceptions import NotFoundException, BusinessRuleException
from app.infrastructure.persistence.models.combo import ChiTietCombo, ComboKhachHang
from app.infrastructure.persistence.models.product import SanPham


class ComboService:
    def __init__(self, db: Session):
        self.db = db

    def get_combo_details(self, combo_id: int) -> List[ChiTietCombo]:
        return self.db.query(ChiTietCombo).filter(ChiTietCombo.ma_combo == combo_id).all()

    def add_combo_detail(self, data: dict) -> ChiTietCombo:
        # Validate both combo and service exist
        combo = self.db.query(SanPham).filter(SanPham.ma_san_pham == data["ma_combo"], SanPham.loai == "PACKAGE").first()
        if not combo:
            raise NotFoundException(message="Combo không tồn tại")
        service = self.db.query(SanPham).filter(SanPham.ma_san_pham == data["ma_dich_vu"]).first()
        if not service:
            raise NotFoundException(message="Dịch vụ không tồn tại")

        detail = ChiTietCombo(**data)
        self.db.add(detail)
        self.db.commit()
        self.db.refresh(detail)
        return detail

    def remove_combo_detail(self, detail_id: int) -> None:
        detail = self.db.query(ChiTietCombo).filter(ChiTietCombo.ma_chi_tiet == detail_id).first()
        if not detail:
            raise NotFoundException(message="Chi tiết combo không tồn tại")
        self.db.delete(detail)
        self.db.commit()

    # --- Customer Combo ---
    def get_customer_combos(self, customer_id: int) -> List[ComboKhachHang]:
        return self.db.query(ComboKhachHang).filter(ComboKhachHang.ma_khach_hang == customer_id).all()

    def purchase_combo(self, data: dict) -> ComboKhachHang:
        """Customer purchases a combo package."""
        combo = self.db.query(SanPham).filter(SanPham.ma_san_pham == data["ma_combo"], SanPham.loai == "PACKAGE").first()
        if not combo:
            raise NotFoundException(message="Combo không tồn tại")

        data["so_luot_con_lai"] = data["tong_so_luot"]
        customer_combo = ComboKhachHang(**data)
        self.db.add(customer_combo)
        self.db.commit()
        self.db.refresh(customer_combo)
        return customer_combo

    def get_customer_combo(self, combo_kh_id: int) -> ComboKhachHang:
        combo = self.db.query(ComboKhachHang).filter(ComboKhachHang.ma_combo_kh == combo_kh_id).first()
        if not combo:
            raise NotFoundException(message="Combo khách hàng không tồn tại")
        return combo
