"""
ORM Model: Loyalty Point History
DB Table: lich_su_diem
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Unicode
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class LichSuDiem(Base):
    """Bảng lịch sử thay đổi điểm tích lũy."""
    __tablename__ = "lich_su_diem"

    ma_lich_su = Column(Integer, primary_key=True, autoincrement=True)
    ma_khach_hang = Column(Integer, ForeignKey("nguoi_dung.ma_nguoi_dung"), nullable=False, index=True)
    ma_hoa_don = Column(Integer, ForeignKey("hoa_don.ma_hoa_don"), nullable=True, index=True)
    loai_bien_dong = Column(String(40), nullable=False)
    diem_thay_doi = Column(Integer, nullable=False)
    so_du_sau = Column(Integer, nullable=False, default=0)
    noi_dung = Column(Unicode(255), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)

    # Relationships
    nguoi_dung = relationship("NguoiDung", back_populates="lich_su_diems")
    hoa_don = relationship("HoaDon", back_populates="lich_su_diems")
