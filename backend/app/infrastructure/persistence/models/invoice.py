"""
ORM Models: Invoice, InvoiceDetail, Payment
DB Tables: hoa_don, chi_tiet_hoa_don, thanh_toan

Mapping:
  hoa_don           -> HoaDon (Invoice)
  chi_tiet_hoa_don  -> ChiTietHoaDon (Invoice Detail)
  thanh_toan        -> ThanhToan (Payment)

Notes:
  - hoa_don has discount, tax, loyalty points, e-invoice status
  - thanh_toan supports multiple payments per invoice
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Unicode, Text, Numeric, Boolean
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class HoaDon(Base):
    """Bảng hóa đơn (Invoices)"""
    __tablename__ = "hoa_don"

    ma_hoa_don = Column(Integer, primary_key=True, autoincrement=True)
    ma_lich_hen = Column(Integer, ForeignKey("lich_hen.ma_lich_hen"), nullable=True)
    ma_khach_hang = Column(Integer, ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False)
    ma_nhan_vien = Column(Integer, ForeignKey("nhan_vien.ma_nhan_vien"), nullable=True)  # Staff who created
    ma_khuyen_mai = Column(Integer, ForeignKey("khuyen_mai.ma_khuyen_mai"), nullable=True)
    tong_tien = Column(Numeric(18, 2), default=0)
    giam_gia = Column(Numeric(18, 2), default=0)
    thue = Column(Numeric(18, 2), default=0)
    so_tien_khach_tra = Column(Numeric(18, 2), default=0)
    so_tien_tra_lai = Column(Numeric(18, 2), default=0)
    thanh_tien = Column(Numeric(18, 2), default=0)  # Final amount after discount/tax
    trang_thai = Column(String(20), default="DRAFT")
    trang_thai_hd_dien_tu = Column(String(20), default="NOT_ISSUED")
    ghi_chu = Column(Text, nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lich_hen = relationship("LichHen", back_populates="hoa_don")
    nguoi_dung = relationship("NguoiDung", back_populates="hoa_dons", foreign_keys=[ma_khach_hang])
    nhan_vien = relationship("NhanVien")
    khuyen_mai = relationship("KhuyenMai")
    chi_tiets = relationship("ChiTietHoaDon", back_populates="hoa_don", cascade="all, delete-orphan")
    thanh_toans = relationship("ThanhToan", back_populates="hoa_don")
 

class ChiTietHoaDon(Base):
    """Bảng chi tiết hóa đơn (Invoice Line Items)"""
    __tablename__ = "chi_tiet_hoa_don"

    ma_chi_tiet = Column(Integer, primary_key=True, autoincrement=True)
    ma_hoa_don = Column(Integer, ForeignKey("hoa_don.ma_hoa_don"), nullable=False)
    ma_san_pham = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    so_luong = Column(Integer, default=1)
    don_gia = Column(Numeric(18, 2), nullable=False)  # Unit price at time of invoice
    thanh_tien = Column(Numeric(18, 2), nullable=False)  # so_luong * don_gia
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    hoa_don = relationship("HoaDon", back_populates="chi_tiets")
    san_pham = relationship("SanPham")


class ThanhToan(Base):
    """
    Bảng thanh toán (Payments)
    Multiple payments per invoice supported.
    """
    __tablename__ = "thanh_toan"

    ma_thanh_toan = Column(Integer, primary_key=True, autoincrement=True)
    ma_hoa_don = Column(Integer, ForeignKey("hoa_don.ma_hoa_don"), nullable=False)
    so_tien = Column(Numeric(18, 2), nullable=False)
    phuong_thuc = Column(String(20), nullable=False, default="CASH")
    trang_thai = Column(String(20), default="SUCCESS")
    ma_giao_dich = Column(String(100), nullable=True)  # External transaction ID
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_thanh_toan = Column(DateTime, default=datetime.utcnow)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    hoa_don = relationship("HoaDon", back_populates="thanh_toans")
