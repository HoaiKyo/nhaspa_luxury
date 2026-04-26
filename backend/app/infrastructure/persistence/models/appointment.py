"""
ORM Models: Appointment, CompanionGuest, AppointmentDetail
DB Tables: lich_hen, khach_di_kem, chi_tiet_lich_hen

Mapping:
  lich_hen          -> LichHen (Appointment)
  khach_di_kem      -> KhachDiKem (Companion/Guest)
  chi_tiet_lich_hen -> ChiTietLichHen (Appointment Service Detail)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Time,
    ForeignKey, Unicode, Text, Numeric
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class LichHen(Base):
    """Bảng lịch hẹn (Appointments)"""
    __tablename__ = "lich_hen"

    ma_lich_hen = Column(Integer, primary_key=True, autoincrement=True)
    ma_khach_hang = Column(Integer, ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False)
    ngay_hen = Column(Date, nullable=False)
    gio_bat_dau = Column(Time, nullable=False)
    gio_ket_thuc = Column(Time, nullable=True)
    trang_thai = Column(String(20), default="PENDING")
    ghi_chu = Column(Text, nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    nguoi_dung = relationship("NguoiDung", back_populates="lich_hens")
    khach_di_kems = relationship("KhachDiKem", back_populates="lich_hen", cascade="all, delete-orphan")
    chi_tiets = relationship("ChiTietLichHen", back_populates="lich_hen", cascade="all, delete-orphan")
    hoa_don = relationship("HoaDon", back_populates="lich_hen", uselist=False)


class KhachDiKem(Base):
    """Bảng khách đi kèm (Companion Guests)"""
    __tablename__ = "khach_di_kem"

    ma_khach_di_kem = Column(Integer, primary_key=True, autoincrement=True)
    ma_lich_hen = Column(Integer, ForeignKey("lich_hen.ma_lich_hen"), nullable=False)
    ho_ten = Column(Unicode(100), nullable=False)
    so_dien_thoai = Column(String(20), nullable=True)
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lich_hen = relationship("LichHen", back_populates="khach_di_kems")


class ChiTietLichHen(Base):
    """
    Bảng chi tiết lịch hẹn (Appointment Service Details)
    Links appointment to services, staff, and optionally customer combos.
    """
    __tablename__ = "chi_tiet_lich_hen"

    ma_chi_tiet = Column(Integer, primary_key=True, autoincrement=True)
    ma_lich_hen = Column(Integer, ForeignKey("lich_hen.ma_lich_hen"), nullable=False)
    ma_san_pham = Column(Integer, ForeignKey("san_pham.ma_san_pham"), nullable=False)
    ma_nhan_vien = Column(Integer, ForeignKey("nhan_vien.ma_nhan_vien"), nullable=True)
    ma_khach_di_kem = Column(Integer, ForeignKey("khach_di_kem.ma_khach_di_kem"), nullable=True)
    ma_combo_kh = Column(Integer, ForeignKey("combo_khach_hang.ma_combo_kh"), nullable=True)
    gio_bat_dau = Column(Time, nullable=True)
    gio_ket_thuc = Column(Time, nullable=True)
    gia = Column(Numeric(18, 2), nullable=True)  # Price at time of booking
    ghi_chu = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lich_hen = relationship("LichHen", back_populates="chi_tiets")
    san_pham = relationship("SanPham")
    nhan_vien = relationship("NhanVien", back_populates="chi_tiet_lich_hens")
    khach_di_kem = relationship("KhachDiKem")
    combo_khach_hang = relationship("ComboKhachHang")
