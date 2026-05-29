from sqlalchemy import Column, String, Unicode, Text
from app.infrastructure.persistence.models.base import Base

class CauHinhHeThong(Base):
    """Bảng lưu trữ các cấu hình hệ thống (như sức chứa, giờ hoạt động...)"""
    __tablename__ = "cau_hinh_he_thong"

    ma_cau_hinh = Column(String(50), primary_key=True) # Ví dụ: 'MAX_CAPACITY'
    gia_tri = Column(String(255), nullable=False)      # Ví dụ: '10'
    mo_ta = Column(Unicode(255), nullable=True)
    loai_du_lieu = Column(String(20), default="STRING") # STRING, INT, FLOAT, BOOL
