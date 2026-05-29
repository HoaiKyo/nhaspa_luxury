"""
ORM Models: User, Role, UserRole
DB Tables: nguoi_dung, vai_tro, nguoi_dung_vai_tro

Mapping:
  nguoi_dung       -> NguoiDung (User)
  vai_tro          -> VaiTro (Role)
  nguoi_dung_vai_tro -> NguoiDungVaiTro (UserRole)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, ForeignKey, Unicode, Table
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class NguoiDung(Base):
    """Bảng người dùng (Users)"""
    __tablename__ = "nguoi_dung"

    ma_nguoi_dung = Column(Integer, primary_key=True, autoincrement=True)
    ho_ten = Column(Unicode(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    mat_khau = Column(String(255), nullable=False)
    so_dien_thoai = Column(String(20), unique=True, nullable=True)
    gioi_tinh = Column(String(10), nullable=True)  # MALE, FEMALE, OTHER
    ngay_sinh = Column(DateTime, nullable=True)
    dia_chi = Column(Unicode(255), nullable=True)
    anh_dai_dien = Column(String(500), nullable=True)
 
    trang_thai = Column(Boolean, default=True)  # True = active
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vai_tros = relationship("VaiTro", secondary="nguoi_dung_vai_tro", back_populates="nguoi_dungs")
    nhan_vien = relationship("NhanVien", back_populates="nguoi_dung", uselist=False)
    lich_hens = relationship("LichHen", back_populates="nguoi_dung")
    hoa_dons = relationship("HoaDon", back_populates="nguoi_dung", foreign_keys="HoaDon.ma_khach_hang")
 

class VaiTro(Base):
    """Bảng vai trò (Roles)"""
    __tablename__ = "vai_tro"

    ma_vai_tro = Column(Integer, primary_key=True, autoincrement=True)
    ten_vai_tro = Column(Unicode(50), unique=True, nullable=False)
    mo_ta = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    nguoi_dungs = relationship("NguoiDung", secondary="nguoi_dung_vai_tro", back_populates="vai_tros")


class NguoiDungVaiTro(Base):
    """Bảng liên kết người dùng - vai trò (User-Role junction)"""
    __tablename__ = "nguoi_dung_vai_tro"

    ma_nguoi_dung = Column(Integer, ForeignKey("nguoi_dung.ma_nguoi_dung"), primary_key=True)
    ma_vai_tro = Column(Integer, ForeignKey("vai_tro.ma_vai_tro"), primary_key=True)
    ngay_gan = Column(DateTime, default=datetime.utcnow)
