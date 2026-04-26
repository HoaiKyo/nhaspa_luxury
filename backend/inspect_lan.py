from app.core.database import SessionLocal
from app.infrastructure.persistence.models.appointment import LichHen, ChiTietLichHen
from app.infrastructure.persistence.models.staff import NhanVien
from sqlalchemy.orm import joinedload

db = SessionLocal()

# Find Tran Thi Lan
lan = db.query(NhanVien).join(NhanVien.nguoi_dung).filter(NhanVien.nguoi_dung.property.mapper.class_.ho_ten.ilike("%Lan%")).first()
if lan:
    print(f"Found Staff Lan: ID={lan.ma_nhan_vien}, Name={lan.nguoi_dung.ho_ten if lan.nguoi_dung else 'N/A'}")
    
    # Recent appointments for Lan
    appts = db.query(ChiTietLichHen).join(LichHen).filter(
        ChiTietLichHen.ma_nhan_vien == lan.ma_nhan_vien,
        LichHen.ngay_hen == '2026-04-20'
    ).all()
    
    print(f"Appointments for Lan on 2026-04-20: {len(appts)}")
    for d in appts:
        print(f"  ID: {d.ma_chi_tiet}, ApptID: {d.ma_lich_hen}, Start: {d.gio_bat_dau}, End: {d.gio_ket_thuc}, Status: {d.lich_hen.trang_thai}")
else:
    print("Staff Lan not found by name.")

db.close()
