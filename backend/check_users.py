import sys
import os
sys.path.append(os.getcwd())

from app.infrastructure.persistence.database import SessionLocal
from app.infrastructure.persistence.models.user import NguoiDung

db = SessionLocal()
users = db.query(NguoiDung).filter(NguoiDung.trang_thai == True).limit(20).all()
for u in users:
    roles = [r.ten_vai_tro for r in u.vai_tros]
    print(f"Email: {u.email}, Roles: {roles}")
db.close()
