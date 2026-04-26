"""
ORM Models: ComboDetail, CustomerCombo
DB Tables: chi_tiet_combo, combo_khach_hang

Mapping:
  chi_tiet_combo    -> ChiTietCombo (Combo-Service link)
  combo_khach_hang  -> ComboKhachHang (Customer purchased combo with usage tracking)

Notes:
  - chi_tiet_combo.ma_combo and chi_tiet_combo.ma_dich_vu both reference san_pham
  - combo_khach_hang tracks total uses and remaining uses
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, DateTime, ForeignKey, Unicode, Numeric
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class ChiTietCombo(Base):
    """Bảng chi tiết combo (Combo contains these services)"""
    __tablename__ = "chi_tiet_combo"

    ma_chi_tiet = Column(Integer, primary_key=True, autoincrement=True)
    ma_combo = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    ma_dich_vu = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    so_luong = Column(Integer, default=1)  # How many times this service is included
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    combo = relationship("SanPham", foreign_keys=[ma_combo], back_populates="combo_details")
    dich_vu = relationship("SanPham", foreign_keys=[ma_dich_vu], back_populates="chi_tiet_combos")


class ComboKhachHang(Base):
    """
    Bảng combo khách hàng (Customer purchased combos)
    Tracks total uses and remaining uses.
    """
    __tablename__ = "combo_khach_hang"

    ma_combo_kh = Column(Integer, primary_key=True, autoincrement=True)
    ma_khach_hang = Column(Integer, ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False)
    ma_combo = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    tong_so_luot = Column(Integer, nullable=False)  # Total uses purchased
    so_luot_con_lai = Column(Integer, nullable=False)  # Remaining uses
    ngay_mua = Column(DateTime, default=datetime.utcnow)
    ngay_het_han = Column(DateTime, nullable=True)
    gia_mua = Column(Numeric(18, 2), nullable=True)
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    khach_hang = relationship("NguoiDung")
    combo = relationship("SanPham")
