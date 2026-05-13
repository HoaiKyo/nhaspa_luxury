import sys
import os
sys.path.append(os.getcwd())

from app.infrastructure.persistence.database import SessionLocal
from app.infrastructure.persistence.models.user import NguoiDung

db = SessionLocal()
u = db.query(NguoiDung).filter(NguoiDung.email == "test@gmail.com").first()
if u:
    print(f"User found: Email={u.email}, Name={u.ho_ten}, Status={u.trang_thai}")
else:
    print("User test@gmail.com not found")
db.close()
