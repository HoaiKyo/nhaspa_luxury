"""
ORM Models: Staff, Shift, WorkSchedule, Leave
DB Tables: nhan_vien, ca_lam, lich_lam_viec, nghi_phep

Mapping:
  nhan_vien     -> NhanVien (Staff)
  ca_lam        -> CaLam (Shift)
  lich_lam_viec -> LichLamViec (WorkSchedule)
  nghi_phep     -> NghiPhep (Leave)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Time, Boolean,
    ForeignKey, Unicode, Text
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class NhanVien(Base):
    """Bảng nhân viên (Staff) — 1:1 with nguoi_dung"""
    __tablename__ = "nhan_vien"

    ma_nhan_vien = Column(Integer, primary_key=True, autoincrement=True)
    ma_nguoi_dung = Column(Integer, ForeignKey("nguoi_dung.ma_nguoi_dung"), unique=True, nullable=False)
    ma_nhan_vien_code = Column(String(20), unique=True, nullable=True)  # Mã nhân viên nội bộ
    chuc_vu = Column(Unicode(100), nullable=True)
    phong_ban = Column(Unicode(100), nullable=True)
    ngay_vao_lam = Column(Date, nullable=True)
    trang_thai = Column(Boolean, default=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nguoi_dung = relationship("NguoiDung", back_populates="nhan_vien")
    dich_vus = relationship("NhanVienDichVu", back_populates="nhan_vien")
    lich_lam_viecs = relationship("LichLamViec", back_populates="nhan_vien")
    nghi_pheps = relationship("NghiPhep", back_populates="nhan_vien", foreign_keys="[NghiPhep.ma_nhan_vien]")
    chi_tiet_lich_hens = relationship("ChiTietLichHen", back_populates="nhan_vien")


class CaLam(Base):
    """Bảng ca làm (Work Shifts)"""
    __tablename__ = "ca_lam"

    ma_ca = Column(Integer, primary_key=True, autoincrement=True)
    ten_ca = Column(Unicode(50), nullable=False)
    gio_bat_dau = Column(Time, nullable=False)
    gio_ket_thuc = Column(Time, nullable=False)
    mo_ta = Column(Unicode(255), nullable=True)
    trang_thai = Column(Boolean, default=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lich_lam_viecs = relationship("LichLamViec", back_populates="ca_lam")


class LichLamViec(Base):
    """Bảng lịch làm việc (Work Schedule)"""
    __tablename__ = "lich_lam_viec"

    ma_lich = Column(Integer, primary_key=True, autoincrement=True)
    ma_nhan_vien = Column(Integer, ForeignKey("nhan_vien.ma_nhan_vien"), nullable=False)
    ma_ca = Column(Integer, ForeignKey("ca_lam.ma_ca"), nullable=False)
    ngay_lam_viec = Column(Date, nullable=False)
    ghi_chu = Column(Unicode(255), nullable=True)
    trang_thai = Column(String(20), default="ACTIVE")  # ACTIVE, LOCKED
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    nhan_vien = relationship("NhanVien", back_populates="lich_lam_viecs")
    ca_lam = relationship("CaLam", back_populates="lich_lam_viecs")


class NghiPhep(Base):
    """Bảng nghỉ phép (Leave Requests)"""
    __tablename__ = "nghi_phep"

    ma_nghi_phep = Column(Integer, primary_key=True, autoincrement=True)
    ma_nhan_vien = Column(Integer, ForeignKey("nhan_vien.ma_nhan_vien"), nullable=False)
    ngay_bat_dau = Column(Date, nullable=False)
    ngay_ket_thuc = Column(Date, nullable=False)
    loai_nghi = Column(String(20), nullable=False, default="ANNUAL")  # ANNUAL, SICK, UNPAID, MATERNITY
    ly_do = Column(Unicode(500), nullable=True)
    dinh_kem = Column(Unicode(1000), nullable=True)  # URL ảnh/chứng từ đính kèm
    trang_thai = Column(String(20), default="PENDING")  # PENDING, APPROVED, REJECTED
    nguoi_duyet = Column(Integer, ForeignKey("nhan_vien.ma_nhan_vien"), nullable=True)
    ngay_duyet = Column(DateTime, nullable=True)
    ghi_chu_duyet = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    nhan_vien = relationship("NhanVien", back_populates="nghi_pheps", foreign_keys=[ma_nhan_vien])
    nguoi_duyet_rel = relationship("NhanVien", foreign_keys=[nguoi_duyet])
