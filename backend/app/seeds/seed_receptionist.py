import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.database import SessionLocal
from app.infrastructure.persistence.models import user, staff, product, marketing, invoice, inventory, combo, appointment
from app.infrastructure.persistence.models.user import NguoiDung, VaiTro, NguoiDungVaiTro
from app.core.security import get_password_hash

db = SessionLocal()
try:
    # Ensure role exists
    rec_role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == "RECEPTIONIST").first()
    if not rec_role:
        rec_role = VaiTro(ten_vai_tro="RECEPTIONIST", mo_ta="Lễ tân")
        db.add(rec_role)
        db.flush()

    # Create account
    email = "letan@nhaspa.com"
    user = db.query(NguoiDung).filter(NguoiDung.email == email).first()
    if not user:
        user = NguoiDung(
            ho_ten="Lễ Tân 1",
            email=email,
            so_dien_thoai="0909999888",
            mat_khau=get_password_hash("letan123"),
            trang_thai=True
        )
        db.add(user)
        db.flush()
    
    # Assign role
    existing_role = db.query(NguoiDungVaiTro).filter(
        NguoiDungVaiTro.ma_nguoi_dung == user.ma_nguoi_dung,
        NguoiDungVaiTro.ma_vai_tro == rec_role.ma_vai_tro
    ).first()
    if not existing_role:
        db.add(NguoiDungVaiTro(ma_nguoi_dung=user.ma_nguoi_dung, ma_vai_tro=rec_role.ma_vai_tro))
    
    db.commit()
    print("Seeded receptionist account: letan@nhaspa.com / letan123")
except Exception as e:
    db.rollback()
    print("Error:", e)
finally:
    db.close()
