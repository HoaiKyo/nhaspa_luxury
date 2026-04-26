"""Invoice & Payment API endpoints."""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.response import success_response, paginated_response
from app.application.schemas.invoice import *
from app.application.services.invoice_service import InvoiceService, PaymentService
from app.application.schemas.marketing import PromotionResponse
from app.api.v1.dependencies import require_staff
from app.infrastructure.persistence.models.user import NguoiDung
from app.infrastructure.persistence.models.staff import NhanVien

invoice_router = APIRouter(prefix="/invoices", tags=["Invoices"])
payment_router = APIRouter(prefix="/payments", tags=["Payments"])


def _serialize_invoice(inv) -> dict:
    if not inv:
        return {}

    def _to_decimal(value, default: str = "0") -> Decimal:
        try:
            if value is None:
                return Decimal(default)
            return Decimal(str(value))
        except Exception:
            return Decimal(default)

    try:
        d = InvoiceResponse.model_validate(inv).model_dump()
    except Exception:
        # Robust fallback for legacy rows
        chi_tiets = []
        for detail in (inv.chi_tiets or []):
            try:
                so_luong = int(detail.so_luong or 0)
                don_gia = _to_decimal(detail.don_gia)
                thanh_tien = _to_decimal(detail.thanh_tien or (don_gia * Decimal(max(so_luong, 0))))
                chi_tiets.append({
                    "ma_chi_tiet": int(detail.ma_chi_tiet),
                    "ma_san_pham": int(detail.ma_san_pham or 0),
                    "ten_san_pham": getattr(detail.san_pham, "ten_san_pham", "Dịch vụ không xác định") if detail.san_pham else "Dịch vụ không xác định",
                    "so_luong": so_luong,
                    "don_gia": don_gia,
                    "thanh_tien": thanh_tien,
                    "ghi_chu": getattr(detail, "ghi_chu", None),
                })
            except:
                continue

        thanh_toans = []
        for payment in (inv.thanh_toans or []):
            try:
                thanh_toans.append({
                    "ma_thanh_toan": int(payment.ma_thanh_toan),
                    "ma_hoa_don": int(payment.ma_hoa_don),
                    "so_tien": _to_decimal(payment.so_tien),
                    "phuong_thuc": str(getattr(payment, "phuong_thuc", "CASH") or "CASH"),
                    "trang_thai": str(getattr(payment, "trang_thai", "SUCCESS") or "SUCCESS"),
                    "ma_giao_dich": getattr(payment, "ma_giao_dich", None),
                    "ghi_chu": getattr(payment, "ghi_chu", None),
                    "ngay_thanh_toan": getattr(payment, "ngay_thanh_toan", None),
                })
            except:
                continue

        d = {
            "ma_hoa_don": int(inv.ma_hoa_don),
            "ma_lich_hen": getattr(inv, "ma_lich_hen", None),
            "ma_khach_hang": int(inv.ma_khach_hang),
            "ho_ten_khach": getattr(inv.nguoi_dung, "ho_ten", "Khách vãng lai") if inv.nguoi_dung else "Khách vãng lai",
            "ma_nhan_vien": getattr(inv, "ma_nhan_vien", None),
            "ma_khuyen_mai": getattr(inv, "ma_khuyen_mai", None),
            "tong_tien": _to_decimal(inv.tong_tien),
            "giam_gia": _to_decimal(inv.giam_gia),
            "thue": _to_decimal(inv.thue),
            "diem_su_dung": int(getattr(inv, "diem_su_dung", 0) or 0),
            "gia_tri_diem": _to_decimal(inv.gia_tri_diem),
            "diem_tich_luy": int(getattr(inv, "diem_tich_luy", 0) or 0),
            "thanh_tien": _to_decimal(inv.thanh_tien),
            "trang_thai": str(getattr(inv, "trang_thai", "DRAFT") or "DRAFT"),
            "trang_thai_hd_dien_tu": str(getattr(inv, "trang_thai_hd_dien_tu", "NOT_ISSUED") or "NOT_ISSUED"),
            "ghi_chu": getattr(inv, "ghi_chu", None),
            "chi_tiets": chi_tiets,
            "thanh_toans": thanh_toans,
            "ngay_tao": getattr(inv, "ngay_tao", None),
        }

    # Post-processing: Enhance data from relationships safely
    user = getattr(inv, "nguoi_dung", None)
    d["ho_ten_khach"] = getattr(user, "ho_ten", "Khách vãng lai") if user else "Khách vãng lai"
    d["so_dien_thoai_khach"] = getattr(user, "so_dien_thoai", "—") if user else "—"
    d["dia_chi_khach"] = getattr(user, "dia_chi", "—") if user else "—"
    
    staff = getattr(inv, "nhan_vien", None)
    staff_user = getattr(staff, "nguoi_dung", None) if staff else None
    d["ho_ten_nhan_vien"] = getattr(staff_user, "ho_ten", "Chưa gán") if staff_user else "Chưa gán"

    # Fix ten_san_pham using ID-based mapping to avoid zip() order issues
    if d.get("chi_tiets") and inv.chi_tiets:
        entity_map = {int(dt.ma_chi_tiet): dt for dt in inv.chi_tiets if dt.ma_chi_tiet}
        for detail_payload in d["chi_tiets"]:
            dt_id = detail_payload.get("ma_chi_tiet")
            if dt_id and dt_id in entity_map:
                entity = entity_map[dt_id]
                detail_payload["ten_san_pham"] = getattr(entity.san_pham, "ten_san_pham", "Dịch vụ không xác định") if entity.san_pham else "Dịch vụ không xác định"

    return d


@invoice_router.get("")
def list_invoices(page: int = 1, page_size: int = 10, customer_id: Optional[int] = None,
                  status: Optional[str] = None, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = InvoiceService(db)
    invoices, total = svc.get_invoices(page, page_size, customer_id, status)
    data = [_serialize_invoice(inv) for inv in invoices]
    return paginated_response(data, total, page, page_size)


@invoice_router.get("/active-promotions")
def list_active_promotions(
    order_value: Optional[Decimal] = Query(default=None, ge=0),
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    svc = InvoiceService(db)
    promos = svc.get_active_promotions(order_value=order_value)
    return success_response(
        data=[PromotionResponse.model_validate(promo).model_dump() for promo in promos],
        message="Lấy danh sách khuyến mãi khả dụng thành công",
    )


@invoice_router.get("/point-history")
def list_point_history(
    page: int = 1,
    page_size: int = 20,
    customer_id: Optional[int] = None,
    invoice_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    svc = InvoiceService(db)
    rows, total = svc.get_point_history(page=page, page_size=page_size, customer_id=customer_id, invoice_id=invoice_id)
    data = [PointHistoryResponse.model_validate(row).model_dump() for row in rows]
    return paginated_response(data, total, page, page_size)


@invoice_router.get("/{inv_id}")
def get_invoice(inv_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = InvoiceService(db)
    inv = svc.get_invoice(inv_id)
    return success_response(data=_serialize_invoice(inv))


@invoice_router.post("")
def create_invoice(data: InvoiceCreate, current_user: NguoiDung = Depends(require_staff), db: Session = Depends(get_db)):
    svc = InvoiceService(db)
    staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == current_user.ma_nguoi_dung).first()
    staff_id = staff.ma_nhan_vien if staff else None
    inv = svc.create_invoice(data.model_dump(), staff_id)
    return success_response(data=_serialize_invoice(inv), message="Tạo hóa đơn thành công")


@invoice_router.put("/{inv_id}")
def update_pending_invoice(
    inv_id: int,
    data: InvoiceEdit,
    current_user: NguoiDung = Depends(require_staff),
    db: Session = Depends(get_db),
):
    svc = InvoiceService(db)
    staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == current_user.ma_nguoi_dung).first()
    staff_id = staff.ma_nhan_vien if staff else None
    inv = svc.update_pending_invoice(inv_id, data.model_dump(), staff_id=staff_id)
    return success_response(data=_serialize_invoice(inv), message="Cập nhật hóa đơn thành công")


@invoice_router.post("/checkout/{appointment_id}")
def checkout_appointment(appointment_id: int, current_user: NguoiDung = Depends(require_staff), db: Session = Depends(get_db)):
    svc = InvoiceService(db)
    staff = db.query(NhanVien).filter(NhanVien.ma_nguoi_dung == current_user.ma_nguoi_dung).first()
    staff_id = staff.ma_nhan_vien if staff else None

    inv = svc.checkout_appointment(appointment_id, staff_id)
    return success_response(data=_serialize_invoice(inv), message="Thanh toán lịch hẹn thành công")


@invoice_router.post("/seed-sample")
def seed_sample_invoices(
    target_count: int = 20,
    force: bool = False,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    svc = InvoiceService(db)
    created = svc.seed_sample_invoices(target_count=target_count, only_if_empty=not force)
    return success_response(
        data={"created": len(created), "target_count": target_count, "forced": force},
        message="Seed hóa đơn hoàn tất" if created else "Dữ liệu hóa đơn đã tồn tại, không seed thêm",
    )


@invoice_router.put("/{inv_id}/status")
def update_invoice_status(inv_id: int, data: InvoiceUpdate, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = InvoiceService(db)
    inv = svc.update_invoice_status(inv_id, data.trang_thai)
    return success_response(data=_serialize_invoice(inv), message="Cập nhật trạng thái hóa đơn thành công")


@payment_router.post("")
def create_payment(data: PaymentCreate, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = PaymentService(db)
    payment = svc.create_payment(data.model_dump())
    return success_response(data=PaymentResponse.model_validate(payment).model_dump(), message="Thanh toán thành công")


@payment_router.get("/invoice/{inv_id}")
def get_payments(inv_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    svc = PaymentService(db)
    payments = svc.get_payments_by_invoice(inv_id)
    return success_response(data=[PaymentResponse.model_validate(p).model_dump() for p in payments])
