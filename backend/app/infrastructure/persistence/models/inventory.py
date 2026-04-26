"""
ORM Models: Inventory, Supplier, ImportReceipt, ImportReceiptDetail
DB Tables: ton_kho, nha_cung_cap, phieu_nhap, chi_tiet_phieu_nhap

Mapping:
  ton_kho             -> TonKho (Inventory — 1:1 with san_pham currently)
  nha_cung_cap        -> NhaCungCap (Supplier)
  phieu_nhap          -> PhieuNhap (Import Receipt)
  chi_tiet_phieu_nhap -> ChiTietPhieuNhap (Import Receipt Detail)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Unicode, Text, Numeric
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class TonKho(Base):
    """Bảng tồn kho (Inventory) — Currently 1:1 with san_pham"""
    __tablename__ = "ton_kho"

    ma_ton_kho = Column(Integer, primary_key=True, autoincrement=True)
    ma_san_pham = Column(Integer, ForeignKey("san_pham.ma_san_pham"), unique=True, nullable=False)
    so_luong = Column(Integer, default=0)
    so_luong_toi_thieu = Column(Integer, default=5)  # Min stock alert threshold
    don_vi = Column(Unicode(50), nullable=True)  # e.g., "chai", "hộp"
    vi_tri = Column(Unicode(100), nullable=True)  # Storage location
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    san_pham = relationship("SanPham", back_populates="ton_kho")


class NhaCungCap(Base):
    """Bảng nhà cung cấp (Suppliers)"""
    __tablename__ = "nha_cung_cap"

    ma_nha_cung_cap = Column(Integer, primary_key=True, autoincrement=True)
    ten_nha_cung_cap = Column(Unicode(200), nullable=False)
    dia_chi = Column(Unicode(500), nullable=True)
    so_dien_thoai = Column(String(20), nullable=True)
    email = Column(String(150), nullable=True)
    nguoi_lien_he = Column(Unicode(100), nullable=True)
    ghi_chu = Column(Text, nullable=True)
    trang_thai = Column(String(10), default="ACTIVE")
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    phieu_nhaps = relationship("PhieuNhap", back_populates="nha_cung_cap")


class PhieuNhap(Base):
    """Bảng phiếu nhập (Import Receipts)"""
    __tablename__ = "phieu_nhap"

    ma_phieu_nhap = Column(Integer, primary_key=True, autoincrement=True)
    ma_nha_cung_cap = Column(Integer, ForeignKey("nha_cung_cap.ma_nha_cung_cap"), nullable=False)
    ma_nhan_vien = Column(Integer, ForeignKey("nhan_vien.ma_nhan_vien"), nullable=True)
    tong_tien = Column(Numeric(18, 2), default=0)
    trang_thai = Column(String(20), default="DRAFT")
    ghi_chu = Column(Text, nullable=True)
    ngay_nhap = Column(DateTime, default=datetime.utcnow)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nha_cung_cap = relationship("NhaCungCap", back_populates="phieu_nhaps")
    nhan_vien = relationship("NhanVien")
    chi_tiets = relationship("ChiTietPhieuNhap", back_populates="phieu_nhap", cascade="all, delete-orphan")


class ChiTietPhieuNhap(Base):
    """Bảng chi tiết phiếu nhập (Import Receipt Details)"""
    __tablename__ = "chi_tiet_phieu_nhap"

    ma_chi_tiet = Column(Integer, primary_key=True, autoincrement=True)
    ma_phieu_nhap = Column(Integer, ForeignKey("phieu_nhap.ma_phieu_nhap"), nullable=False)
    ma_san_pham = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    so_luong = Column(Integer, nullable=False)
    don_gia = Column(Numeric(18, 2), nullable=False)
    thanh_tien = Column(Numeric(18, 2), nullable=False)
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    phieu_nhap = relationship("PhieuNhap", back_populates="chi_tiets")
    san_pham = relationship("SanPham")


class DinhMucVatTu(Base):
    """Bảng định mức vật tư (Bill of Materials)"""
    __tablename__ = "dinh_muc_vat_tu"

    ma_dinh_muc = Column(Integer, primary_key=True, autoincrement=True)
    ma_san_pham = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    ma_ton_kho = Column(Integer, ForeignKey("ton_kho.ma_ton_kho"), nullable=False)
    so_luong_tieu_hao = Column(Numeric(18, 2), nullable=False)
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    san_pham = relationship("SanPham")
    ton_kho = relationship("TonKho")
