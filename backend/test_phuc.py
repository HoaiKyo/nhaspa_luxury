import sys
import os
import datetime
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.core.database import SessionLocal
from app.application.services.staff_service import StaffService

db = SessionLocal()
service = StaffService(db)
appt_date = datetime.date(2026, 6, 1)
start_time = datetime.time(9, 0, 0)
print("--- Checking Staff 14 ---")
for svc_id in range(1, 10):
    staffs = service.get_available_staff_by_time(svc_id, appt_date, start_time, 6067, None)
    is_phuc_available = any(s.ma_nhan_vien == 14 for s in staffs)
    print(f"Service {svc_id}: Phúc available = {is_phuc_available}")
