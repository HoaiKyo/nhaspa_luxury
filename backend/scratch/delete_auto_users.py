
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.join(os.getcwd(), "app"))
sys.path.append(os.getcwd())

from app.core.database import SessionLocal

from app.infrastructure.persistence.models.user import NguoiDung, NguoiDungVaiTro
from app.infrastructure.persistence.models.staff import NhanVien
from app.infrastructure.persistence.models.appointment import LichHen
from app.infrastructure.persistence.models.invoice import HoaDon, ThanhToan

def delete_auto_users():
    db = SessionLocal()
    try:
        # Find all users with email starting with 'auto_'
        users_to_delete = db.query(NguoiDung).filter(NguoiDung.email.like("auto_%")).all()
        
        if not users_to_delete:
            print("No accounts found starting with 'auto_'.")
            return

        print(f"Found {len(users_to_delete)} accounts to delete.")
        
        for user in users_to_delete:
            user_id = user.ma_nguoi_dung
            email = user.email
            print(f"Deleting user: {email} (ID: {user_id})")
            
            # 1. User Roles
            db.query(NguoiDungVaiTro).filter(NguoiDungVaiTro.ma_nguoi_dung == user_id).delete()
            
            # 2. Staff record
            db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == user_id).delete()
            
            # 3. Invoices (and their payments)
            invoices = db.query(HoaDon).filter(HoaDon.ma_khach_hang == user_id).all()
            for inv in invoices:
                db.query(ThanhToan).filter(ThanhToan.ma_hoa_don == inv.ma_hoa_don).delete()
                db.delete(inv)
            
            # 4. Appointments
            db.query(LichHen).filter(LichHen.ma_khach_hang == user_id).delete()
            



            # Finally delete the user
            db.delete(user)
            
        db.commit()
        print("Successfully deleted all 'auto_' accounts and their related data.")
        
    except Exception as e:
        db.rollback()
        print(f"Error during deletion: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_auto_users()
