"""
ORM Models: Category, Product, PriceList, StaffService
DB Tables: danh_muc, san_pham, bang_gia, nhan_vien_dich_vu

Mapping:
  danh_muc          -> DanhMuc (Category)
  san_pham          -> SanPham (Product/Service/Package)
  bang_gia          -> BangGia (PriceList — price history, latest = current)
  nhan_vien_dich_vu -> NhanVienDichVu (Staff-Service assignment)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Boolean,
    ForeignKey, Unicode, Text, Numeric
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class DanhMuc(Base):
    """Bảng danh mục (Categories)"""
    __tablename__ = "danh_muc"

    ma_danh_muc = Column(Integer, primary_key=True, autoincrement=True)
    ten_danh_muc = Column(Unicode(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    mo_ta = Column(Unicode(500), nullable=True)
    icon = Column(String(50), nullable=True)  # Icon name (e.g., Lucide icon name)
    thu_tu = Column(Integer, default=0)  # Sort order
    trang_thai = Column(Boolean, default=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    san_phams = relationship("SanPham", back_populates="danh_muc")


class SanPham(Base):
    """
    Bảng sản phẩm/dịch vụ/combo (Products/Services/Packages)
    san_pham.loai can be: SERVICE, PRODUCT, PACKAGE
    """
    __tablename__ = "san_pham"

    ma_san_pham = Column(Integer, primary_key=True, autoincrement=True)
    ma_danh_muc = Column(Integer, ForeignKey("danh_muc.ma_danh_muc"), nullable=False)
    ten_san_pham = Column(Unicode(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False)
    mo_ta = Column(Text, nullable=True)
    mo_ta_ngan = Column(Unicode(500), nullable=True)
    hinh_anh = Column(String(500), nullable=True)
    loai = Column(String(20), nullable=False, default="SERVICE")  # SERVICE, PRODUCT, PACKAGE
    thoi_luong = Column(Integer, nullable=True)  # Duration in minutes (for services)
    thu_tu = Column(Integer, default=0)
    trang_thai = Column(Boolean, default=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    danh_muc = relationship("DanhMuc", back_populates="san_phams")
    bang_gias = relationship("BangGia", back_populates="san_pham", order_by="BangGia.ngay_ap_dung.desc()")
    nhan_vien_dich_vus = relationship("NhanVienDichVu", back_populates="san_pham")
    chi_tiet_combos = relationship("ChiTietCombo", back_populates="dich_vu",
                                   foreign_keys="ChiTietCombo.ma_dich_vu")
    # Combos where this product IS the combo package
    combo_details = relationship("ChiTietCombo", back_populates="combo",
                                 foreign_keys="ChiTietCombo.ma_combo")



class BangGia(Base):
    """
    Bảng giá (Price List / Price History)
    Assumption: Lưu lịch sử giá. Giá hiện tại = bản ghi mới nhất theo ngay_ap_dung.
    """
    __tablename__ = "bang_gia"

    ma_bang_gia = Column(Integer, primary_key=True, autoincrement=True)
    ma_san_pham = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    gia = Column(Numeric(18, 2), nullable=False)
    gia_goc = Column(Numeric(18, 2), nullable=True)  # Original price (before discount)
    thoi_luong = Column(Unicode(50), nullable=True)  # e.g., "60 phút", "90 phút"
    ngay_ap_dung = Column(DateTime, default=datetime.utcnow)  # Effective date
    ngay_ket_thuc = Column(DateTime, nullable=True)  # End date (null = still active)
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    san_pham = relationship("SanPham", back_populates="bang_gias")


class NhanVienDichVu(Base):
    """Bảng liên kết nhân viên - dịch vụ (Staff can perform these services)"""
    __tablename__ = "nhan_vien_dich_vu"

    ma_nhan_vien = Column(Integer, ForeignKey("nhan_vien.ma_nhan_vien"), primary_key=True)
    ma_san_pham = Column(Integer, ForeignKey("san_pham.ma_san_pham"), primary_key=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    nhan_vien = relationship("NhanVien", back_populates="dich_vus")
    san_pham = relationship("SanPham", back_populates="nhan_vien_dich_vus")
