from app.core.database import SessionLocal
from app.application.services.staff_service import StaffService
from app.infrastructure.persistence.models.product import SanPham
from datetime import date, time

db = SessionLocal()
svc = StaffService(db)

# Find Massage Body ID
service = db.query(SanPham).filter(SanPham.ten_san_pham.ilike("%Massage Body%")).first()
sid = service.ma_san_pham if service else None
print(f"Service 'Massage Body' ID: {sid}")

# Test parameters
appt_date = date(2026, 4, 20)
start_time = time(12, 30)

print(f"Testing availability for: date={appt_date}, time={start_time}")
staff = svc.get_available_staff_by_time(service_id=sid, appt_date=appt_date, start_time=start_time)

print(f"Available staff count: {len(staff)}")
for s in staff:
    print(f"  - ID: {s.ma_nhan_vien}, Name: {s.nguoi_dung.ho_ten if s.nguoi_dung else 'N/A'}")

db.close()
