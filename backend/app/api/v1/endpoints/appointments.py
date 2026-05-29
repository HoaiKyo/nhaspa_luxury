"""Appointment API endpoints."""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.core.response import success_response, paginated_response
from app.application.schemas.appointment import *
from app.application.services.appointment_service import AppointmentService
from app.application.services.invoice_service import InvoiceService
from app.core.exceptions import BusinessRuleException
from app.api.v1.dependencies import get_current_user, require_staff
from app.infrastructure.persistence.models.user import NguoiDung
from app.infrastructure.persistence.models.staff import NhanVien

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("/occupancy")
def get_occupancy(appt_date: date = Query(...), db: Session = Depends(get_db)):
    svc = AppointmentService(db)
    return success_response(data=svc.get_occupancy(appt_date))


@router.get("/max-capacity")
def get_max_capacity(db: Session = Depends(get_db)):
    svc = AppointmentService(db)
    return success_response(data=svc.get_max_capacity())


def _serialize_appointment(appt) -> dict:
    payload = AppointmentResponse.model_validate(appt).model_dump()
    payload["ho_ten_khach"] = appt.nguoi_dung.ho_ten if appt.nguoi_dung else None
    payload["so_dien_thoai_khach"] = appt.nguoi_dung.so_dien_thoai if appt.nguoi_dung else None
    payload["ma_hoa_don"] = appt.hoa_don.ma_hoa_don if appt.hoa_don else None

    detail_rows = payload.get("chi_tiets", [])
    for detail_payload, detail_entity in zip(detail_rows, appt.chi_tiets or []):
        detail_payload["ten_san_pham"] = detail_entity.san_pham.ten_san_pham if detail_entity.san_pham else None
        detail_payload["ho_ten_nhan_vien"] = (
            detail_entity.nhan_vien.nguoi_dung.ho_ten
            if detail_entity.nhan_vien and detail_entity.nhan_vien.nguoi_dung
            else None
        )
    return payload


@router.get("")
def list_appointments(page: int = 1, page_size: int = 10, status: Optional[str] = None,
                      customer_id: Optional[int] = None, staff_id: Optional[int] = None,
                      from_date: Optional[date] = None, to_date: Optional[date] = None,
                      db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = AppointmentService(db)
    appts, total = svc.get_appointments(page, page_size, customer_id, staff_id, status, from_date, to_date)
    data = [_serialize_appointment(a) for a in appts]
    return paginated_response(data, total, page, page_size)


@router.get("/me")
def get_my_appointments(page: int = 1, page_size: int = 10, status: Optional[str] = None,
                        db: Session = Depends(get_db), current_user: NguoiDung = Depends(get_current_user)):
    svc = AppointmentService(db)
    appts, total = svc.get_appointments(page, page_size, customer_id=current_user.ma_nguoi_dung, status=status)
    data = [_serialize_appointment(a) for a in appts]
    return paginated_response(data, total, page, page_size)


@router.get("/{appt_id}")
def get_appointment(appt_id: int, db: Session = Depends(get_db), current_user: NguoiDung = Depends(get_current_user)):
    svc = AppointmentService(db)
    a = svc.get_appointment(appt_id)
    return success_response(data=_serialize_appointment(a))


@router.post("")
def create_appointment(data: AppointmentCreate, current_user: NguoiDung = Depends(get_current_user), db: Session = Depends(get_db)):
    svc = AppointmentService(db)
    
    appt_data = data.model_dump()
    detail_rows = appt_data.get("chi_tiets") or []
    if len(detail_rows) == 0:
        detail_rows = [{"ma_san_pham": p_id} for p_id in (appt_data.get("ma_san_phams") or [])]

    if len(detail_rows) == 0:
        raise BusinessRuleException(message="Phải chọn ít nhất một dịch vụ")

    appt_data["chi_tiets"] = detail_rows
    
    appt = svc.create_appointment(current_user.ma_nguoi_dung, appt_data)
    appt = svc.get_appointment(appt.ma_lich_hen)
    return success_response(data=_serialize_appointment(appt), message="Đặt lịch thành công")


@router.post("/public")
def create_public_appointment(
    data: GuestBookingCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    from app.core.security import get_password_hash, decode_token

    # --- Resolve which user account to use ---
    # Priority 1: If a valid JWT is in the Authorization header, use that user's account
    resolved_user = None
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    resolved_user = db.query(NguoiDung).filter(
                        NguoiDung.ma_nguoi_dung == int(user_id)
                    ).first()
    except Exception:
        pass  # Token invalid/expired — fall through to phone lookup

    if resolved_user is None:
        # Priority 2: Look up by phone number (Prioritize real accounts over guest accounts)
        resolved_user = db.query(NguoiDung).filter(
            NguoiDung.so_dien_thoai == data.so_dien_thoai
        ).order_by(NguoiDung.email.desc()).first() # Real emails usually don't start with 'guest_'

    if resolved_user is None:
        # Priority 3: Create a guest account
        fake_email = f"guest_{data.so_dien_thoai}@spa.local"
        resolved_user = NguoiDung(
            ho_ten=data.ho_ten,
            so_dien_thoai=data.so_dien_thoai,
            email=fake_email,
            mat_khau=get_password_hash("guest123"),
        )
        db.add(resolved_user)
        db.flush()

    svc = AppointmentService(db)

    appt_data = data.model_dump()
    detail_rows = appt_data.get("chi_tiets") or []
    if len(detail_rows) == 0:
        detail_rows = [{"ma_san_pham": p_id} for p_id in (appt_data.get("ma_san_phams") or [])]

    if len(detail_rows) == 0:
        raise BusinessRuleException(message="Phải chọn ít nhất một dịch vụ")

    appt_data_payload = {
        "ngay_hen": appt_data["ngay_hen"],
        "gio_bat_dau": appt_data["gio_bat_dau"],
        "ghi_chu": appt_data.get("ghi_chu"),
        "khach_di_kems": appt_data.get("khach_di_kems") or [],
        "chi_tiets": detail_rows,
    }
    appt = svc.create_appointment(resolved_user.ma_nguoi_dung, appt_data_payload)
    appt = svc.get_appointment(appt.ma_lich_hen)
    return success_response(data=_serialize_appointment(appt), message="Đặt lịch thành công")


@router.put("/{appt_id}")
def update_appointment(
    appt_id: int,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_staff),
):
    svc = AppointmentService(db)
    update_payload = data.model_dump(exclude_unset=True)
    appt = svc.update_appointment(appt_id, update_payload)

    target_status = str(update_payload.get("trang_thai", "")).upper()
    if target_status == "COMPLETED":
        invoice_svc = InvoiceService(db)
        staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == current_user.ma_nguoi_dung).first()
        staff_id = staff.ma_nhan_vien if staff else None
        invoice_svc.create_invoice_from_appointment(
            appointment_id=appt.ma_lich_hen,
            staff_id=staff_id,
            auto_pay=False,
            force_mark_completed=False,
        )
        appt = svc.get_appointment(appt.ma_lich_hen)

    return success_response(data=_serialize_appointment(appt), message="Cập nhật thành công")


@router.post("/{appt_id}/cancel")
def cancel_appointment(appt_id: int, db: Session = Depends(get_db), current_user: NguoiDung = Depends(get_current_user)):
    user_roles = [r.ten_vai_tro for r in current_user.vai_tros] if hasattr(current_user, "vai_tros") and current_user.vai_tros else []
    is_staff = any(role in user_roles for role in ["ADMIN", "RECEPTIONIST"])
    
    svc = AppointmentService(db)
    appt = svc.cancel_appointment(appt_id, is_staff=is_staff)
    return success_response(message="Hủy lịch hẹn thành công")
