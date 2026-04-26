"""
ORM Models: Promotion, Banner, News
DB Tables: khuyen_mai, banner, tin_tuc

Mapping:
  khuyen_mai -> KhuyenMai (Promotion)
  banner     -> Banner
  tin_tuc    -> TinTuc (News)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Unicode, Text, Numeric, Boolean
)
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base


class KhuyenMai(Base):
    """Bảng khuyến mãi (Promotions)"""
    __tablename__ = "khuyen_mai"

    ma_khuyen_mai = Column(Integer, primary_key=True, autoincrement=True)
    ten_khuyen_mai = Column(Unicode(200), nullable=False)
    mo_ta = Column(Text, nullable=True)
    loai_giam = Column(String(20), nullable=False, default="PERCENT")  # PERCENT or AMOUNT
    gia_tri_giam = Column(Numeric(18, 2), nullable=False)
    giam_toi_da = Column(Numeric(18, 2), nullable=True)  # Max discount amount for PERCENT type
    don_toi_thieu = Column(Numeric(18, 2), nullable=True)  # Minimum order value
    ma_code = Column(String(50), unique=True, nullable=True)  # Promo code
    ngay_bat_dau = Column(DateTime, nullable=False)
    ngay_ket_thuc = Column(DateTime, nullable=False)
    so_luot_su_dung = Column(Integer, nullable=True)  # Max usage count
    da_su_dung = Column(Integer, default=0)
    trang_thai = Column(String(20), default="ACTIVE")
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Banner(Base):
    """Bảng banner (Marketing banners)"""
    __tablename__ = "banner"

    ma_banner = Column(Integer, primary_key=True, autoincrement=True)
    tieu_de = Column(Unicode(200), nullable=False)
    mo_ta = Column(Unicode(500), nullable=True)
    hinh_anh = Column(String(500), nullable=False)
    duong_dan = Column(String(500), nullable=True)  # Link when clicked
    thu_tu = Column(Integer, default=0)
    trang_thai = Column(String(20), default="ACTIVE")
    ngay_bat_dau = Column(DateTime, nullable=True)
    ngay_ket_thuc = Column(DateTime, nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TinTuc(Base):
    """Bảng tin tức (News/Blog articles)"""
    __tablename__ = "tin_tuc"

    ma_tin_tuc = Column(Integer, primary_key=True, autoincrement=True)
    tieu_de = Column(Unicode(300), nullable=False)
    slug = Column(String(300), unique=True, nullable=False)
    danh_muc = Column(Unicode(100), nullable=True)  # Category of news (Sự kiện, Blog, Ưu đãi)
    tom_tat = Column(Unicode(500), nullable=True)
    noi_dung = Column(Text, nullable=True)
    hinh_anh = Column(String(500), nullable=True)
    tac_gia = Column(Unicode(100), nullable=True)
    trang_thai = Column(String(20), default="PUBLISHED")
    ngay_dang = Column(DateTime, nullable=True)
    ngay_tao = Column(DateTime, default=datetime.utcnow)
    ngay_cap_nhat = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
