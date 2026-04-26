from app.core.database import SessionLocal
from app.infrastructure.persistence.models.appointment import LichHen, ChiTietLichHen
from app.infrastructure.persistence.models.user import NguoiDung

db = SessionLocal()
appts = db.query(LichHen).order_by(LichHen.ma_lich_hen.desc()).limit(5).all()

print("Latest Appointments:")
for a in appts:
    print(f"ID: {a.ma_lich_hen}, Customer: {a.nguoi_dung.ho_ten if a.nguoi_dung else 'N/A'}, Date: {a.ngay_hen}, Start: {a.gio_bat_dau}, End: {a.gio_ket_thuc}, Status: {a.trang_thai}")
    for d in a.chi_tiets:
        print(f"  - Service: {d.ma_san_pham}, Staff: {d.ma_nhan_vien}, Start: {d.gio_bat_dau}, End: {d.gio_ket_thuc}")

db.close()
