import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.infrastructure.persistence.models.staff import NhanVien
from app.infrastructure.persistence.models.user import VaiTro, NguoiDung, NguoiDungVaiTro

def migrate_staff_data():
    db: Session = SessionLocal()
    try:
        print("Bắt đầu dọn dẹp dữ liệu nhân viên...")
        
        # 1. Đảm bảo 3 vai chính tồn tại trong hệ thống
        roles_to_ensure = {
            "ADMIN": "Quản trị hệ thống",
            "RECEPTIONIST": "Lễ tân",
            "STAFF": "Nhân viên"
        }
        
        role_map = {}
        for role_name, description in roles_to_ensure.items():
            role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == role_name).first()
            if not role:
                print(f"  + Tạo vai trò mới: {role_name}")
                role = VaiTro(ten_vai_tro=role_name, mo_ta=description)
                db.add(role)
                db.flush()
            role_map[role_name] = role.ma_vai_tro

        # 2. Cập nhật bảng nhân viên
        all_staff = db.query(NhanVien).all()
        for nv in all_staff:
            curr_chuc_vu = str(nv.chuc_vu).upper() if nv.chuc_vu else ""
            
            # Map chức vụ về 3 nhóm chuẩn
            new_chuc_vu = "Nhân viên"
            target_role_name = "STAFF"
            
            if "ADMIN" in curr_chuc_vu or "QUẢN TRỊ" in curr_chuc_vu:
                new_chuc_vu = "Admin"
                target_role_name = "ADMIN"
            elif "LỄ TÂN" in curr_chuc_vu or "RECEPTIONIST" in curr_chuc_vu:
                new_chuc_vu = "Lễ tân"
                target_role_name = "RECEPTIONIST"
            
            print(f"  - Cập nhật NV {nv.ma_nhan_vien}: {nv.chuc_vu} -> {new_chuc_vu}, Xóa phòng ban: {nv.phong_ban}")
            
            nv.chuc_vu = new_chuc_vu
            nv.phong_ban = None # Xóa phòng ban theo yêu cầu
            
            # 3. Đồng bộ vai trò người dùng (Lấy ma_nguoi_dung từ NhanVien)
            if nv.ma_nguoi_dung:
                # Xóa hết vai cũ (để map lại cho sạch)
                db.query(NguoiDungVaiTro).filter(NguoiDungVaiTro.ma_nguoi_dung == nv.ma_nguoi_dung).delete()
                
                # Gán vai mới
                new_user_role = NguoiDungVaiTro(
                    ma_nguoi_dung=nv.ma_nguoi_dung,
                    ma_vai_tro=role_map[target_role_name]
                )
                db.add(new_user_role)
        
        db.commit()
        print("Hoàn tất dọn dẹp và gom nhóm chức vụ!")
        
    except Exception as e:
        db.rollback()
        print(f"Lỗi khi thực hiện migrate: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    migrate_staff_data()
