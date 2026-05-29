import sys
import os
import datetime
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.core.database import SessionLocal
from app.infrastructure.persistence.models.staff import NhanVien
from app.infrastructure.persistence.models.user import NguoiDung

db = SessionLocal()
phuc = db.query(NhanVien).join(NguoiDung).filter(NguoiDung.ho_ten.like('%Phúc%')).first()
print(f"Phúc ID: {phuc.ma_nhan_vien}")
