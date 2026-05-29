import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.core.database import SessionLocal
from app.infrastructure.persistence.models.appointment import LichHen, ChiTietLichHen
from app.infrastructure.persistence.models.staff import NhanVien
from app.infrastructure.persistence.models.user import NguoiDung

db = SessionLocal()
details = db.query(ChiTietLichHen).join(LichHen).join(NhanVien).join(NguoiDung).filter(NguoiDung.ho_ten.like('%Phúc%'), LichHen.ngay_hen == '2026-06-01').all()
for d in details:
    print(f"LichHen: {d.lich_hen.ma_lich_hen}, TrangThai: {d.lich_hen.trang_thai}, GioBatDau: {d.lich_hen.gio_bat_dau}, GioBatDauDichVu: {d.gio_bat_dau}, GioKetThucDichVu: {d.gio_ket_thuc}")
