"""
Staff Service: CRUD staff, shifts, schedules, leave management.
"""
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Tuple
from datetime import date, datetime, time, timedelta

from app.core.exceptions import NotFoundException, ConflictException, BusinessRuleException
from app.domain.enums import LeaveType, LeaveStatus
from app.infrastructure.persistence.models.staff import NhanVien, CaLam, LichLamViec, NghiPhep
from app.infrastructure.persistence.models.appointment import LichHen, ChiTietLichHen
from sqlalchemy import func, and_, or_
from app.infrastructure.persistence.models.user import NguoiDung


class StaffService:
    def __init__(self, db: Session):
        self.db = db

    DEFAULT_SHIFTS = [
        {
            "ten_ca": "Ca sáng",
            "gio_bat_dau": time(8, 0),
            "gio_ket_thuc": time(16, 0),
            "mo_ta": "Ca sáng 8h-16h",
        },
        {
            "ten_ca": "Ca tối",
            "gio_bat_dau": time(14, 0),
            "gio_ket_thuc": time(22, 0),
            "mo_ta": "Ca tối 14h-22h",
        },
    ]

    def _ensure_default_shifts(self) -> None:
        """
        Ensure default work shifts exist and are active:
        - Ca sáng: 08:00-16:00
        - Ca tối: 14:00-22:00
        """
        default_names = [s["ten_ca"] for s in self.DEFAULT_SHIFTS]
        lookup_names = default_names + ["Ca chiều", "Ca cả ngày"]
        existing = self.db.query(CaLam).filter(CaLam.ten_ca.in_(lookup_names)).all()
        by_name = {s.ten_ca: s for s in existing}
        has_changes = False

        # Legacy compatibility:
        # - If "Ca chiều" exists but "Ca tối" does not, rename it to "Ca tối" to keep schedule references.
        # - If both exist, deactivate "Ca chiều" to enforce 2-shift model.
        legacy_afternoon = by_name.get("Ca chiều")
        if legacy_afternoon:
            evening = by_name.get("Ca tối")
            if evening:
                if legacy_afternoon.trang_thai:
                    legacy_afternoon.trang_thai = False
                    has_changes = True
            else:
                legacy_afternoon.ten_ca = "Ca tối"
                legacy_afternoon.gio_bat_dau = time(14, 0)
                legacy_afternoon.gio_ket_thuc = time(22, 0)
                legacy_afternoon.mo_ta = "Ca tối 14h-22h"
                legacy_afternoon.trang_thai = True
                by_name.pop("Ca chiều", None)
                by_name["Ca tối"] = legacy_afternoon
                has_changes = True

        for shift_data in self.DEFAULT_SHIFTS:
            shift = by_name.get(shift_data["ten_ca"])
            if not shift:
                self.db.add(CaLam(**shift_data, trang_thai=True))
                has_changes = True
                continue

            if (
                shift.gio_bat_dau != shift_data["gio_bat_dau"]
                or shift.gio_ket_thuc != shift_data["gio_ket_thuc"]
                or shift.mo_ta != shift_data["mo_ta"]
                or shift.trang_thai is not True
            ):
                shift.gio_bat_dau = shift_data["gio_bat_dau"]
                shift.gio_ket_thuc = shift_data["gio_ket_thuc"]
                shift.mo_ta = shift_data["mo_ta"]
                shift.trang_thai = True
                has_changes = True

        # Legacy data compatibility: hide old full-day shift from default list.
        legacy_shifts = self.db.query(CaLam).filter(
            CaLam.ten_ca == "Ca cả ngày",
            CaLam.trang_thai == True
        ).all()
        for legacy in legacy_shifts:
            legacy.trang_thai = False
            has_changes = True

        if has_changes:
            self.db.commit()

    def get_staff_list(self, page: int = 1, page_size: int = 10, search: Optional[str] = None) -> Tuple[List[NhanVien], int]:
        query = self.db.query(NhanVien).options(joinedload(NhanVien.nguoi_dung))
        if search:
            query = query.join(NguoiDung).filter(NguoiDung.ho_ten.ilike(f"%{search}%"))
        total = query.count()
        staff = (
            query.order_by(NhanVien.ma_nhan_vien.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return staff, total

    def get_staff(self, staff_id: int) -> NhanVien:
        staff = self.db.query(NhanVien).options(joinedload(NhanVien.nguoi_dung)).filter(NhanVien.ma_nhan_vien == staff_id).first()
        if not staff:
            raise NotFoundException(message="Nhân viên không tồn tại")
        return staff

    def create_staff(self, data: dict) -> NhanVien:
        existing = self.db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == data["ma_nguoi_dung"]).first()
        if existing:
            raise ConflictException(message="Người dùng này đã là nhân viên")
        staff = NhanVien(**data)
        self.db.add(staff)
        self.db.commit()
        self.db.refresh(staff)
        return staff

    def update_staff(self, staff_id: int, data: dict) -> NhanVien:
        staff = self.get_staff(staff_id)
        for key, value in data.items():
            if value is not None:
                setattr(staff, key, value)
        self.db.commit()
        self.db.refresh(staff)
        return staff

    def delete_staff(self, staff_id: int) -> None:
        staff = self.get_staff(staff_id)
        staff.trang_thai = False
        self.db.commit()

    def get_available_staff_by_time(
        self,
        service_id: Optional[int] = None,
        appt_date: Optional[date] = None,
        start_time: Optional[time] = None,
        end_time: Optional[time] = None
    ) -> List[NhanVien]:
        with open("staff_avail.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- Checking available staff ---\n")
            f.write(f"Parameters: service={service_id}, date={appt_date}, start={start_time}, end={end_time}\n")
        
        # 1. Start with all active staff
        query = self.db.query(NhanVien).options(joinedload(NhanVien.nguoi_dung)).filter(NhanVien.trang_thai == True)
        
        # 2. Filter by service if provided
        if service_id:
            from app.infrastructure.persistence.models.product import NhanVienDichVu
            # Only filter if there are actually staff assigned to this service
            service_staff_exists = self.db.query(NhanVienDichVu).filter(NhanVienDichVu.ma_san_pham == service_id).first()
            if service_staff_exists:
                query = query.join(NhanVienDichVu).filter(NhanVienDichVu.ma_san_pham == service_id)

        all_active_staff = query.all()
        if not (appt_date and start_time):
            return all_active_staff

        # Fetch requested service duration
        duration = 30
        if service_id:
            from app.infrastructure.persistence.models.product import SanPham
            service = self.db.query(SanPham).filter(SanPham.ma_san_pham == service_id).first()
            if service and service.thoi_luong:
                duration = service.thoi_luong

        # Default end time based on duration
        if not end_time:
            start_dt = datetime.combine(appt_date, start_time)
            end_time = (start_dt + timedelta(minutes=duration)).time()

        available_staff = []
        for s in all_active_staff:
            # 3. Check if on leave
            on_leave = self.db.query(NghiPhep).filter(
                NghiPhep.ma_nhan_vien == s.ma_nhan_vien,
                NghiPhep.trang_thai == "APPROVED",
                NghiPhep.ngay_bat_dau <= appt_date,
                NghiPhep.ngay_ket_thuc >= appt_date
            ).first()
            if on_leave:
                continue

            # 4. Check if has work schedule for this day
            scheduled = self.db.query(LichLamViec).join(CaLam).filter(
                LichLamViec.ma_nhan_vien == s.ma_nhan_vien,
                LichLamViec.ngay_lam_viec == appt_date,
                LichLamViec.trang_thai == "ACTIVE",
                CaLam.gio_bat_dau <= start_time,
                CaLam.gio_ket_thuc >= end_time
            ).first()
            if not scheduled:
                continue

            # 5. Check for appointment conflicts in Python to be safe with SQL dialect types
            staff_appts = self.db.query(ChiTietLichHen).join(LichHen).filter(
                ChiTietLichHen.ma_nhan_vien == s.ma_nhan_vien,
                LichHen.ngay_hen == appt_date,
                LichHen.trang_thai.notin_(["CANCELLED", "NO_SHOW"])
            ).all()
            
            conflict_appt_id = None
            for d in staff_appts:
                # Use effectively stored times
                d_start = d.gio_bat_dau or d.lich_hen.gio_bat_dau
                # If end time is missing, fallback to start + 30 mins to be safe
                d_end = d.gio_ket_thuc or d.lich_hen.gio_ket_thuc
                if not d_end:
                    d_start_dt = datetime.combine(appt_date, d_start)
                    d_end = (d_start_dt + timedelta(minutes=30)).time()
                
                # Overlap check: (StartA < EndB) and (EndA > StartB)
                if d_start < end_time and d_end > start_time:
                    conflict_appt_id = d.ma_lich_hen
                    break
            
            if conflict_appt_id:
                with open("staff_avail.log", "a", encoding="utf-8") as f:
                    f.write(f"  [Conflict] Staff {s.ma_nhan_vien} busy in Appt {conflict_appt_id} ({d_start}-{d_end})\n")
                continue
            
            available_staff.append(s)
                
        with open("staff_avail.log", "a", encoding="utf-8") as f:
            f.write(f"Result: {len(available_staff)} staff available\n")
        return available_staff

    # --- Shifts ---
    def get_shifts(self) -> List[CaLam]:
        self._ensure_default_shifts()
        return (
            self.db.query(CaLam)
            .filter(CaLam.trang_thai == True)
            .order_by(CaLam.gio_bat_dau)
            .all()
        )

    def create_shift(self, data: dict) -> CaLam:
        shift = CaLam(**data)
        self.db.add(shift)
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def update_shift(self, shift_id: int, data: dict) -> CaLam:
        shift = self.db.query(CaLam).filter(CaLam.ma_ca == shift_id).first()
        if not shift:
            raise NotFoundException(message="Ca làm không tồn tại")
        for key, value in data.items():
            if value is not None:
                setattr(shift, key, value)
        self.db.commit()
        self.db.refresh(shift)
        return shift

    # --- Schedule ---
    def get_schedules(self, staff_id: Optional[int] = None, from_date: Optional[date] = None, to_date: Optional[date] = None) -> List[LichLamViec]:
        query = self.db.query(LichLamViec).options(joinedload(LichLamViec.nhan_vien).joinedload(NhanVien.nguoi_dung), joinedload(LichLamViec.ca_lam))
        if staff_id:
            query = query.filter(LichLamViec.ma_nhan_vien == staff_id)
        if from_date:
            query = query.filter(LichLamViec.ngay_lam_viec >= from_date)
        if to_date:
            query = query.filter(LichLamViec.ngay_lam_viec <= to_date)
        return query.order_by(LichLamViec.ngay_lam_viec).all()

    def create_schedule(self, data: dict) -> LichLamViec:
        # Check for duplicate schedule
        existing = self.db.query(LichLamViec).filter(
            LichLamViec.ma_nhan_vien == data["ma_nhan_vien"],
            LichLamViec.ma_ca == data["ma_ca"],
            LichLamViec.ngay_lam_viec == data["ngay_lam_viec"],
        ).first()
        if existing:
            raise ConflictException(message="Lịch làm việc đã tồn tại cho nhân viên này trong ca và ngày đã chọn")
        schedule = LichLamViec(**data)
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def update_schedule(self, schedule_id: int, data: dict) -> LichLamViec:
        schedule = self.db.query(LichLamViec).filter(LichLamViec.ma_lich == schedule_id).first()
        if not schedule:
            raise NotFoundException(message="Lịch làm việc không tồn tại")

        next_staff_id = data.get("ma_nhan_vien", schedule.ma_nhan_vien)
        next_shift_id = data.get("ma_ca", schedule.ma_ca)
        next_work_day = data.get("ngay_lam_viec", schedule.ngay_lam_viec)

        duplicate = self.db.query(LichLamViec).filter(
            LichLamViec.ma_lich != schedule_id,
            LichLamViec.ma_nhan_vien == next_staff_id,
            LichLamViec.ma_ca == next_shift_id,
            LichLamViec.ngay_lam_viec == next_work_day,
        ).first()
        if duplicate:
            raise ConflictException(message="Đã tồn tại lịch làm việc trùng ca và ngày cho nhân viên này")

        for key, value in data.items():
            if value is not None:
                setattr(schedule, key, value)

        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def delete_schedule(self, schedule_id: int) -> None:
        schedule = self.db.query(LichLamViec).filter(LichLamViec.ma_lich == schedule_id).first()
        if not schedule:
            raise NotFoundException(message="Lịch làm việc không tồn tại")
        self.db.delete(schedule)
        self.db.commit()

    # --- Leave Management ---
    def get_leaves(self, staff_id: Optional[int] = None, status: Optional[str] = None) -> List[NghiPhep]:
        query = self.db.query(NghiPhep)
        if staff_id:
            query = query.filter(NghiPhep.ma_nhan_vien == staff_id)
        if status:
            query = query.filter(NghiPhep.trang_thai == status)
        return query.order_by(NghiPhep.ngay_tao.desc()).all()

    def create_leave(self, staff_id: int, data: dict) -> NghiPhep:
        self.get_staff(staff_id)  # Validate staff exists
        if data["ngay_ket_thuc"] < data["ngay_bat_dau"]:
            raise BusinessRuleException(message="Ngày kết thúc phải sau ngày bắt đầu")

        leave_type = data.get("loai_nghi", LeaveType.ANNUAL)
        leave_type_value = getattr(leave_type, "value", leave_type)
        leave_type_value = str(leave_type_value or LeaveType.ANNUAL.value).upper()
        valid_leave_types = {item.value for item in LeaveType}
        if leave_type_value not in valid_leave_types:
            raise BusinessRuleException(message="Loại nghỉ không hợp lệ")
        data["loai_nghi"] = leave_type_value

        attachment = data.get("dinh_kem")
        if attachment is not None:
            attachment_text = str(attachment).strip()
            data["dinh_kem"] = attachment_text or None

        leave = NghiPhep(ma_nhan_vien=staff_id, **data)
        self.db.add(leave)
        self.db.commit()
        self.db.refresh(leave)
        return leave

    def approve_leave(self, leave_id: int, approver_id: int, status: str, note: Optional[str] = None) -> NghiPhep:
        leave = self.db.query(NghiPhep).filter(NghiPhep.ma_nghi_phep == leave_id).first()
        if not leave:
            raise NotFoundException(message="Nghỉ phép không tồn tại")
        if leave.trang_thai != "PENDING":
            raise BusinessRuleException(message="Chỉ có thể duyệt đơn đang chờ")
        status_value = getattr(status, "value", status)
        status_value = str(status_value).upper()
        if status_value not in (LeaveStatus.APPROVED.value, LeaveStatus.REJECTED.value):
            raise BusinessRuleException(message="Trạng thái phải là APPROVED hoặc REJECTED")

        leave.trang_thai = status_value
        leave.nguoi_duyet = approver_id
        leave.ngay_duyet = datetime.utcnow()
        leave.ghi_chu_duyet = note

        if status_value == "APPROVED":
            # Lock existing work schedules during leave period
            self.db.query(LichLamViec).filter(
                LichLamViec.ma_nhan_vien == leave.ma_nhan_vien,
                LichLamViec.ngay_lam_viec >= leave.ngay_bat_dau,
                LichLamViec.ngay_lam_viec <= leave.ngay_ket_thuc
            ).update({"trang_thai": "LOCKED"}, synchronize_session=False)

        self.db.commit()
        self.db.refresh(leave)
        return leave
