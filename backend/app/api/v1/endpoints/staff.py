from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, time
from app.core.database import get_db
from app.core.response import success_response, paginated_response
from app.application.schemas.staff import *
from app.application.services.staff_service import StaffService
from app.api.v1.dependencies import require_manager, require_staff, get_current_user, require_receptionist
from app.infrastructure.persistence.models.user import NguoiDung
from app.infrastructure.persistence.models.product import NhanVienDichVu

router = APIRouter(prefix="/staff", tags=["Staff"])
shift_router = APIRouter(prefix="/shifts", tags=["Shifts"])
schedule_router = APIRouter(prefix="/schedules", tags=["Schedules"])
leave_router = APIRouter(prefix="/leaves", tags=["Leave"])


@router.get("/available-public")
def get_available_staff_public(
    service_id: int = Query(...),
    appt_date: date = Query(...),
    start_time: time = Query(...),
    db: Session = Depends(get_db)
):
    svc = StaffService(db)
    staff_list = svc.get_available_staff_by_time(
        service_id=service_id,
        appt_date=appt_date,
        start_time=start_time
    )
    
    data = []
    for s in staff_list:
        data.append({
            "ma_nhan_vien": s.ma_nhan_vien,
            "ho_ten": s.nguoi_dung.ho_ten if s.nguoi_dung else "N/A",
            "chuc_vu": s.chuc_vu
        })
    return success_response(data=data)


@router.get("/available-for-service")
def get_available_staff(
    service_id: Optional[int] = Query(None, gt=0),
    appt_date: Optional[date] = Query(None),
    start_time: Optional[time] = Query(None),
    exclude_appointment_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_staff)
):
    svc = StaffService(db)
    staff_list = svc.get_available_staff_by_time(
        service_id=service_id,
        appt_date=appt_date,
        start_time=start_time,
        exclude_appointment_id=exclude_appointment_id
    )
    
    data = []
    for s in staff_list:
        d = StaffResponse.model_validate(s).model_dump()
        if s.nguoi_dung:
            d["ho_ten"] = s.nguoi_dung.ho_ten
            d["email"] = s.nguoi_dung.email
            d["so_dien_thoai"] = s.nguoi_dung.so_dien_thoai
        d["specializations"] = [dv.san_pham.ten_san_pham for dv in s.dich_vus if dv.san_pham]
        data.append(d)
    return success_response(data=data)


@router.get("")
def list_staff(page: int = 1, page_size: int = 10, search: Optional[str] = None, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = StaffService(db)
    staff_list, total = svc.get_staff_list(page, page_size, search)
    data = []
    for s in staff_list:
        d = StaffResponse.model_validate(s).model_dump()
        if s.nguoi_dung:
            d["ho_ten"] = s.nguoi_dung.ho_ten
            d["email"] = s.nguoi_dung.email
            d["so_dien_thoai"] = s.nguoi_dung.so_dien_thoai
        d["specializations"] = [dv.san_pham.ten_san_pham for dv in s.dich_vus if dv.san_pham]
        data.append(d)
    return paginated_response(data, total, page, page_size)


@router.get("/{staff_id}")
def get_staff(staff_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = StaffService(db)
    s = svc.get_staff(staff_id)
    d = StaffResponse.model_validate(s).model_dump()
    if s.nguoi_dung:
        d["ho_ten"] = s.nguoi_dung.ho_ten
        d["email"] = s.nguoi_dung.email
    d["specializations"] = [dv.san_pham.ten_san_pham for dv in s.dich_vus if dv.san_pham]
    return success_response(data=d)


@router.post("")
def create_staff(data: StaffCreate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = StaffService(db)
    s = svc.create_staff(data.model_dump())
    return success_response(data=StaffResponse.model_validate(s).model_dump(), message="Tạo nhân viên thành công")


@router.put("/{staff_id}")
def update_staff(staff_id: int, data: StaffUpdate, db: Session = Depends(get_db), _=Depends(require_manager)):
    svc = StaffService(db)
    s = svc.update_staff(staff_id, data.model_dump(exclude_unset=True))
    return success_response(data=StaffResponse.model_validate(s).model_dump(), message="Cập nhật thành công")


# Shifts
@shift_router.get("")
def list_shifts(db: Session = Depends(get_db)):
    svc = StaffService(db)
    shifts = svc.get_shifts()
    return success_response(data=[ShiftResponse.model_validate(s).model_dump() for s in shifts])


@shift_router.post("")
def create_shift(data: ShiftCreate, db: Session = Depends(get_db), _=Depends(require_receptionist)):
    svc = StaffService(db)
    s = svc.create_shift(data.model_dump())
    return success_response(data=ShiftResponse.model_validate(s).model_dump(), message="Tạo ca làm thành công")


# Schedules
@schedule_router.get("")
def list_schedules(staff_id: Optional[int] = None, from_date: Optional[date] = None,
                   to_date: Optional[date] = None, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = StaffService(db)
    schedules = svc.get_schedules(staff_id, from_date, to_date)
    data = []
    for s in schedules:
        d = ScheduleResponse.model_validate(s).model_dump()
        d["ten_ca"] = s.ca_lam.ten_ca if s.ca_lam else None
        d["ho_ten_nhan_vien"] = s.nhan_vien.nguoi_dung.ho_ten if s.nhan_vien and s.nhan_vien.nguoi_dung else None
        data.append(d)
    return success_response(data=data)


@schedule_router.post("")
def create_schedule(data: ScheduleCreate, db: Session = Depends(get_db), _=Depends(require_receptionist)):
    svc = StaffService(db)
    s = svc.create_schedule(data.model_dump())
    return success_response(data=ScheduleResponse.model_validate(s).model_dump(), message="Tạo lịch thành công")


@schedule_router.put("/{schedule_id}")
def update_schedule(schedule_id: int, data: ScheduleUpdate, db: Session = Depends(get_db), _=Depends(require_receptionist)):
    svc = StaffService(db)
    s = svc.update_schedule(schedule_id, data.model_dump(exclude_unset=True))
    return success_response(data=ScheduleResponse.model_validate(s).model_dump(), message="Cập nhật lịch thành công")


@schedule_router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_receptionist)):
    svc = StaffService(db)
    svc.delete_schedule(schedule_id)
    return success_response(message="Hủy ca làm thành công")


# Leave
@leave_router.get("")
def list_leaves(staff_id: Optional[int] = None, status: Optional[str] = None,
                db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = StaffService(db)
    leaves = svc.get_leaves(staff_id, status)
    return success_response(data=[LeaveResponse.model_validate(l).model_dump() for l in leaves])


@leave_router.post("")
def create_leave(data: LeaveCreate, current_user: NguoiDung = Depends(get_current_user), db: Session = Depends(get_db)):
    svc = StaffService(db)
    
    user_roles = [r.ten_vai_tro for r in current_user.vai_tros]
    is_management = any(r in user_roles for r in ["ADMIN", "RECEPTIONIST"])

    ma_nhan_vien_target = data.ma_nhan_vien

    # If target is not specified or user is not management, default to current user's staff profile
    if not ma_nhan_vien_target or not is_management:
        from app.infrastructure.persistence.models.staff import NhanVien
        staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == current_user.ma_nguoi_dung).first()
        if not staff:
            from app.core.exceptions import NotFoundException
            raise NotFoundException(message="Bạn không phải nhân viên")
        ma_nhan_vien_target = staff.ma_nhan_vien

    leave = svc.create_leave(ma_nhan_vien_target, data.model_dump(exclude={"ma_nhan_vien"}))
    return success_response(data=LeaveResponse.model_validate(leave).model_dump(), message="Tạo đơn nghỉ phép thành công")


@leave_router.put("/{leave_id}/approve")
def approve_leave(leave_id: int, data: LeaveApproval, current_user: NguoiDung = Depends(require_receptionist), db: Session = Depends(get_db)):
    svc = StaffService(db)
    from app.infrastructure.persistence.models.staff import NhanVien
    staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == current_user.ma_nguoi_dung).first()
    approver_id = staff.ma_nhan_vien if staff else None
    leave = svc.approve_leave(leave_id, approver_id, data.trang_thai, data.ghi_chu_duyet)
    return success_response(data=LeaveResponse.model_validate(leave).model_dump(), message="Duyệt nghỉ phép thành công")
