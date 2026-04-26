
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.infrastructure.persistence.models.user import VaiTro, NguoiDung, NguoiDungVaiTro
from app.infrastructure.persistence.models.staff import NhanVien
from datetime import date

def create_receptionist():
    db = SessionLocal()
    try:
        email = "letan@nhaspa.com"
        password = "12345678"
        full_name = "Lễ Tân 01"
        phone = "0866839985"
        
        # 1. Check if user exists
        user = db.query(NguoiDung).filter(NguoiDung.email == email).first()
        if not user:
            user = NguoiDung(
                ho_ten=full_name,
                email=email,
                mat_khau=get_password_hash(password),
                so_dien_thoai=phone,
                trang_thai=True,
            )
            db.add(user)
            db.flush()
            print(f"User {email} created.")
        else:
            user.mat_khau = get_password_hash(password)
            user.trang_thai = True
            print(f"User {email} already exists. Password updated.")

        # 2. Assign RECEPTIONIST role
        receptionist_role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == "RECEPTIONIST").first()
        if not receptionist_role:
            receptionist_role = VaiTro(ten_vai_tro="RECEPTIONIST", mo_ta="Lễ tân")
            db.add(receptionist_role)
            db.flush()
            print("Role RECEPTIONIST created.")

        existing_role_mapping = db.query(NguoiDungVaiTro).filter(
            NguoiDungVaiTro.ma_nguoi_dung == user.ma_nguoi_dung,
            NguoiDungVaiTro.ma_vai_tro == receptionist_role.ma_vai_tro
        ).first()
        
        if not existing_role_mapping:
            db.add(NguoiDungVaiTro(
                ma_nguoi_dung=user.ma_nguoi_dung,
                ma_vai_tro=receptionist_role.ma_vai_tro
            ))
            print(f"Role RECEPTIONIST assigned to {email}.")

        # 3. Create NhanVien record
        staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == user.ma_nguoi_dung).first()
        if not staff:
            staff = NhanVien(
                ma_nguoi_dung=user.ma_nguoi_dung,
                ma_nhan_vien_code="LT01",
                chuc_vu="Lễ tân",
                phong_ban="Hành chính",
                ngay_vao_lam=date.today(),
                trang_thai=True
            )
            db.add(staff)
            print(f"Staff record created for {email}.")
        else:
            staff.trang_thai = True
            print(f"Staff record already exists for {email}.")

        db.commit()
        print("Success: Receptionist account setup successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error: Failed to create receptionist: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_receptionist()
