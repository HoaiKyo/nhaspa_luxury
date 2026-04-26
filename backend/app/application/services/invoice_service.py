"""
Invoice & Payment Service with transaction safety.
"""
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, BusinessRuleException
from app.core.logging_config import get_logger
from app.infrastructure.persistence.models.invoice import HoaDon, ChiTietHoaDon, ThanhToan
from app.infrastructure.persistence.models.loyalty import LichSuDiem
from app.infrastructure.persistence.models.user import NguoiDung, VaiTro
from app.infrastructure.persistence.models.staff import NhanVien
from app.infrastructure.persistence.models.product import SanPham
from app.infrastructure.persistence.models.marketing import KhuyenMai

logger = get_logger(__name__)

# 10.000đ = 1 điểm
POINT_EARN_RATE = Decimal("10000")
# 1 điểm = 1.000đ
POINT_VALUE = Decimal("1000")
# Tối thiểu 100 điểm mới được dùng
MIN_POINT_REDEEM = 100
# Mỗi đơn chỉ được dùng tối đa 50% giá trị hóa đơn
MAX_POINT_DISCOUNT_RATE = Decimal("0.5")
# VAT
TAX_RATE = Decimal("0.08")

POINT_EVENT_INVOICE_EARN = "INVOICE_EARN"
POINT_EVENT_INVOICE_SPEND = "INVOICE_SPEND"
POINT_EVENT_INVOICE_EARN_REVOKE = "INVOICE_EARN_REVOKE"
POINT_EVENT_INVOICE_SPEND_REFUND = "INVOICE_SPEND_REFUND"

VALID_INVOICE_STATUSES = {"DRAFT", "PENDING", "PARTIAL", "PAID", "CANCELLED", "REFUNDED"}


def _to_decimal(value) -> Decimal:
    return Decimal(str(value or 0))


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _round_to_thousand(value: Decimal) -> Decimal:
    """Round Decimal amount to nearest 1,000 VND."""
    return (value / Decimal("1000")).quantize(Decimal("1")) * Decimal("1000")


class InvoiceService:
    def __init__(self, db: Session):
        self.db = db

    def get_invoices(
        self,
        page: int = 1,
        page_size: int = 10,
        customer_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[HoaDon], int]:
        query = self.db.query(HoaDon).options(
            joinedload(HoaDon.nguoi_dung),
            joinedload(HoaDon.nhan_vien).joinedload(NhanVien.nguoi_dung),
            joinedload(HoaDon.chi_tiets).joinedload(ChiTietHoaDon.san_pham),
            joinedload(HoaDon.thanh_toans),
            joinedload(HoaDon.khuyen_mai),
            joinedload(HoaDon.lich_su_diems),
        )
        if customer_id:
            query = query.filter(HoaDon.ma_khach_hang == customer_id)
        if status:
            query = query.filter(HoaDon.trang_thai == status)

        total = query.count()
        invoices = query.order_by(HoaDon.ngay_tao.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return invoices, total

    def get_invoice(self, invoice_id: int) -> HoaDon:
        inv = (
            self.db.query(HoaDon)
            .options(
                joinedload(HoaDon.nguoi_dung),
                joinedload(HoaDon.nhan_vien).joinedload(NhanVien.nguoi_dung),
                joinedload(HoaDon.chi_tiets).joinedload(ChiTietHoaDon.san_pham),
                joinedload(HoaDon.thanh_toans),
                joinedload(HoaDon.khuyen_mai),
                joinedload(HoaDon.lich_su_diems),
            )
            .filter(HoaDon.ma_hoa_don == invoice_id)
            .first()
        )
        if not inv:
            raise NotFoundException(message="Hóa đơn không tồn tại")
        return inv

    def get_active_promotions(self, order_value: Optional[Decimal] = None) -> List[KhuyenMai]:
        now = datetime.utcnow()
        query = self.db.query(KhuyenMai).filter(
            KhuyenMai.trang_thai == "ACTIVE",
            KhuyenMai.ngay_bat_dau <= now,
            KhuyenMai.ngay_ket_thuc >= now,
        )
        promos = query.order_by(KhuyenMai.ngay_ket_thuc.asc()).all()

        rows: List[KhuyenMai] = []
        for promo in promos:
            if promo.so_luot_su_dung is not None and promo.da_su_dung >= promo.so_luot_su_dung:
                continue
            if order_value is not None and promo.don_toi_thieu and order_value < _to_decimal(promo.don_toi_thieu):
                continue
            rows.append(promo)
        return rows

    def get_point_history(
        self,
        page: int = 1,
        page_size: int = 20,
        customer_id: Optional[int] = None,
        invoice_id: Optional[int] = None,
    ) -> Tuple[List[LichSuDiem], int]:
        query = self.db.query(LichSuDiem).options(
            joinedload(LichSuDiem.nguoi_dung),
            joinedload(LichSuDiem.hoa_don),
        )
        if customer_id:
            query = query.filter(LichSuDiem.ma_khach_hang == customer_id)
        if invoice_id:
            query = query.filter(LichSuDiem.ma_hoa_don == invoice_id)

        total = query.count()
        rows = (
            query.order_by(LichSuDiem.ngay_tao.desc(), LichSuDiem.ma_lich_su.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return rows, total

    def create_invoice(self, data: dict, staff_id: Optional[int] = None) -> HoaDon:
        """Create invoice with details, promotion and loyalty points."""
        payload = dict(data)
        chi_tiets_data = payload.pop("chi_tiets", [])
        promotion_id = payload.pop("ma_khuyen_mai", None)
        requested_points = int(payload.pop("diem_su_dung", 0) or 0)
        customer_id = int(payload["ma_khach_hang"])

        customer = self._get_customer(customer_id)
        line_items, tong_tien = self._build_line_items(chi_tiets_data)
        promo, giam_gia = self._resolve_promotion(promotion_id, tong_tien)

        point_base = max(Decimal("0"), tong_tien - giam_gia)
        points_used, gia_tri_diem = self._resolve_points_usage(customer, requested_points, point_base)

        subtotal = max(Decimal("0"), tong_tien - giam_gia - gia_tri_diem)
        thue = _round_money(subtotal * TAX_RATE)
        thanh_tien = _round_money(subtotal + thue)
        diem_tich_luy = int(thanh_tien / POINT_EARN_RATE)

        invoice = HoaDon(
            ma_khach_hang=customer_id,
            ma_lich_hen=payload.get("ma_lich_hen"),
            ma_nhan_vien=staff_id,
            ma_khuyen_mai=promo.ma_khuyen_mai if promo else None,
            tong_tien=tong_tien,
            giam_gia=giam_gia,
            thue=thue,
            diem_su_dung=points_used,
            gia_tri_diem=gia_tri_diem,
            diem_tich_luy=diem_tich_luy,
            thanh_tien=thanh_tien,
            trang_thai="PENDING",
            ghi_chu=payload.get("ghi_chu"),
        )
        self.db.add(invoice)
        self.db.flush()

        for detail_data in line_items:
            self.db.add(ChiTietHoaDon(ma_hoa_don=invoice.ma_hoa_don, **detail_data))

        if promo:
            promo.da_su_dung = int(promo.da_su_dung or 0) + 1

        if points_used > 0:
            self._append_point_history(
                customer=customer,
                invoice_id=invoice.ma_hoa_don,
                event_type=POINT_EVENT_INVOICE_SPEND,
                change=-points_used,
                note=f"Trừ điểm dùng cho hóa đơn #{invoice.ma_hoa_don}",
            )

        self.db.commit()
        logger.info("invoice_created", invoice_id=invoice.ma_hoa_don, total=str(thanh_tien))
        return self.get_invoice(invoice.ma_hoa_don)

    def update_pending_invoice(self, invoice_id: int, data: dict, staff_id: Optional[int] = None) -> HoaDon:
        invoice = self.get_invoice(invoice_id)
        if invoice.trang_thai != "PENDING":
            raise BusinessRuleException(message="Chỉ được chỉnh sửa hóa đơn khi trạng thái là chưa thanh toán")

        payload = dict(data)
        chi_tiets_data = payload.pop("chi_tiets", [])
        promotion_id = payload.pop("ma_khuyen_mai", None)
        requested_points = int(payload.pop("diem_su_dung", 0) or 0)

        customer = self._get_customer(invoice.ma_khach_hang)

        self._refund_spent_points_if_any(invoice, customer, reason="Hoàn điểm do chỉnh sửa hóa đơn chưa thanh toán")

        if invoice.ma_khuyen_mai:
            old_promo = self.db.query(KhuyenMai).filter(KhuyenMai.ma_khuyen_mai == invoice.ma_khuyen_mai).first()
            if old_promo and int(old_promo.da_su_dung or 0) > 0:
                old_promo.da_su_dung -= 1

        for detail in list(invoice.chi_tiets):
            self.db.delete(detail)
        self.db.flush()

        line_items, tong_tien = self._build_line_items(chi_tiets_data)
        promo, giam_gia = self._resolve_promotion(promotion_id, tong_tien)

        point_base = max(Decimal("0"), tong_tien - giam_gia)
        points_used, gia_tri_diem = self._resolve_points_usage(customer, requested_points, point_base)

        subtotal = max(Decimal("0"), tong_tien - giam_gia - gia_tri_diem)
        thue = _round_money(subtotal * TAX_RATE)
        thanh_tien = _round_money(subtotal + thue)
        diem_tich_luy = int(thanh_tien / POINT_EARN_RATE)

        invoice.ma_nhan_vien = staff_id if staff_id is not None else invoice.ma_nhan_vien
        invoice.ma_khuyen_mai = promo.ma_khuyen_mai if promo else None
        invoice.tong_tien = tong_tien
        invoice.giam_gia = giam_gia
        invoice.thue = thue
        invoice.diem_su_dung = points_used
        invoice.gia_tri_diem = gia_tri_diem
        invoice.diem_tich_luy = diem_tich_luy
        invoice.thanh_tien = thanh_tien
        invoice.ghi_chu = payload.get("ghi_chu", invoice.ghi_chu)

        for detail_data in line_items:
            self.db.add(ChiTietHoaDon(ma_hoa_don=invoice.ma_hoa_don, **detail_data))

        if promo:
            promo.da_su_dung = int(promo.da_su_dung or 0) + 1

        if points_used > 0:
            self._append_point_history(
                customer=customer,
                invoice_id=invoice.ma_hoa_don,
                event_type=POINT_EVENT_INVOICE_SPEND,
                change=-points_used,
                note=f"Trừ điểm dùng cho hóa đơn #{invoice.ma_hoa_don}",
            )

        self.db.commit()
        return self.get_invoice(invoice.ma_hoa_don)

    def update_invoice_status(self, invoice_id: int, status: str) -> HoaDon:
        invoice = self.get_invoice(invoice_id)
        if not status:
            return invoice

        next_status = self._normalize_status(status)
        prev_status = self._normalize_status(invoice.trang_thai)
        if next_status == prev_status:
            return invoice

        customer = self._get_customer(invoice.ma_khach_hang)
        invoice.trang_thai = next_status

        if next_status == "PAID":
            self._grant_earned_points(invoice, customer)

        if next_status in ("REFUNDED", "CANCELLED"):
            self._revoke_earned_points_if_any(invoice, customer)
            self._refund_spent_points_if_any(invoice, customer, reason=f"Hoàn điểm do hóa đơn #{invoice.ma_hoa_don} {next_status}")

        self.db.commit()
        return self.get_invoice(invoice.ma_hoa_don)

    def seed_sample_invoices(self, target_count: int = 20, only_if_empty: bool = True) -> List[HoaDon]:
        """
        Seed sample invoices for admin UI.
        - Idempotent when only_if_empty=True
        - Generates mixed statuses/payment methods and realistic totals
        """
        target_count = max(1, min(int(target_count or 20), 100))
        existing = self.db.query(HoaDon).count()
        if only_if_empty and existing > 0:
            return []

        customers = (
            self.db.query(NguoiDung)
            .join(NguoiDung.vai_tros)
            .filter(VaiTro.ten_vai_tro == "CUSTOMER", NguoiDung.trang_thai.is_(True))
            .order_by(NguoiDung.ma_nguoi_dung.asc())
            .all()
        )
        if not customers:
            raise BusinessRuleException(message="Không có khách hàng để seed hóa đơn")

        staffs = (
            self.db.query(NhanVien)
            .options(joinedload(NhanVien.nguoi_dung))
            .filter(NhanVien.trang_thai.is_(True))
            .order_by(NhanVien.ma_nhan_vien.asc())
            .all()
        )

        products = (
            self.db.query(SanPham)
            .options(joinedload(SanPham.bang_gias))
            .filter(SanPham.trang_thai.is_(True), SanPham.loai.in_(["SERVICE", "PACKAGE"]))
            .order_by(SanPham.ma_san_pham.asc())
            .all()
        )
        if not products:
            raise BusinessRuleException(message="Không có dịch vụ/sản phẩm để seed hóa đơn")

        status_sequence = [
            "PAID", "PAID", "PENDING", "PAID", "REFUNDED",
            "PAID", "PAID", "PAID", "PENDING", "PAID",
            "REFUNDED", "PAID", "PAID", "PAID", "REFUNDED",
            "PAID", "PAID", "PAID", "REFUNDED", "REFUNDED",
        ]
        method_sequence = [
            "CASH", "TRANSFER", "CARD", "TRANSFER", "CARD",
            "CASH", "TRANSFER", "CARD", "CASH", "TRANSFER",
            "CARD", "CASH", "TRANSFER", "CARD", "TRANSFER",
            "CASH", "CARD", "TRANSFER", "CASH", "CARD",
        ]
        fallback_prices = [
            Decimal("450000"),
            Decimal("550000"),
            Decimal("850000"),
            Decimal("980000"),
            Decimal("1200000"),
            Decimal("1450000"),
        ]

        now = datetime.utcnow().replace(second=0, microsecond=0)
        created: List[HoaDon] = []

        for idx in range(target_count):
            customer = customers[idx % len(customers)]
            staff = staffs[idx % len(staffs)] if staffs else None
            item_count = (idx % 3) + 1

            line_items = []
            subtotal = Decimal("0")
            for item_idx in range(item_count):
                product = products[(idx + item_idx) % len(products)]
                quantity = Decimal(str(((idx + item_idx) % 2) + 1))
                if product.bang_gias and product.bang_gias[0].gia:
                    unit_price = Decimal(str(product.bang_gias[0].gia))
                else:
                    unit_price = fallback_prices[(idx + item_idx) % len(fallback_prices)]
                unit_price = _round_to_thousand(unit_price)
                line_total = unit_price * quantity
                line_items.append(
                    {
                        "ma_san_pham": product.ma_san_pham,
                        "so_luong": int(quantity),
                        "don_gia": unit_price,
                        "thanh_tien": line_total,
                    }
                )
                subtotal += line_total

            discount_rate = Decimal("0.11") if idx % 4 == 0 else Decimal("0.07") if idx % 3 == 0 else Decimal("0.04")
            discount = _round_to_thousand(subtotal * discount_rate)
            taxable = max(Decimal("0"), subtotal - discount)
            tax = _round_to_thousand(taxable * TAX_RATE)
            total = taxable + tax

            if total < Decimal("350000") or total > Decimal("3500000"):
                scale = (
                    Decimal("350000") / max(total, Decimal("1"))
                    if total < Decimal("350000")
                    else Decimal("3500000") / total
                )
                subtotal = Decimal("0")
                for line in line_items:
                    scaled_price = _round_to_thousand(max(Decimal("1000"), line["don_gia"] * scale))
                    line["don_gia"] = scaled_price
                    line["thanh_tien"] = scaled_price * Decimal(str(line["so_luong"]))
                    subtotal += line["thanh_tien"]
                discount = _round_to_thousand(subtotal * discount_rate)
                taxable = max(Decimal("0"), subtotal - discount)
                tax = _round_to_thousand(taxable * TAX_RATE)
                total = taxable + tax

            status = status_sequence[idx % len(status_sequence)]
            payment_method = method_sequence[idx % len(method_sequence)]
            created_at = now - timedelta(days=idx, minutes=idx * 7)
            note = (
                "Khách đổi lịch, hoàn tiền theo chính sách trong 24h."
                if status == "REFUNDED"
                else "Khách xác nhận dịch vụ trước khi thanh toán."
            )

            invoice = HoaDon(
                ma_khach_hang=customer.ma_nguoi_dung,
                ma_nhan_vien=staff.ma_nhan_vien if staff else None,
                tong_tien=subtotal,
                giam_gia=discount,
                thue=tax,
                diem_su_dung=0,
                gia_tri_diem=Decimal("0"),
                diem_tich_luy=int(total / POINT_EARN_RATE),
                thanh_tien=total,
                trang_thai=status,
                trang_thai_hd_dien_tu="ISSUED" if status in ("PAID", "REFUNDED") else "NOT_ISSUED",
                ghi_chu=note,
                ngay_tao=created_at,
                ngay_cap_nhat=created_at,
            )
            self.db.add(invoice)
            self.db.flush()

            for line in line_items:
                self.db.add(
                    ChiTietHoaDon(
                        ma_hoa_don=invoice.ma_hoa_don,
                        ma_san_pham=line["ma_san_pham"],
                        so_luong=line["so_luong"],
                        don_gia=line["don_gia"],
                        thanh_tien=line["thanh_tien"],
                        ghi_chu=None,
                        ngay_tao=created_at,
                    )
                )

            if status in ("PAID", "REFUNDED"):
                self.db.add(
                    ThanhToan(
                        ma_hoa_don=invoice.ma_hoa_don,
                        so_tien=total,
                        phuong_thuc=payment_method,
                        trang_thai="SUCCESS",
                        ma_giao_dich=f"SPA{created_at.strftime('%Y%m%d')}{invoice.ma_hoa_don:04d}",
                        ghi_chu="Thanh toán mẫu seed",
                        ngay_thanh_toan=created_at,
                        ngay_tao=created_at,
                    )
                )

            if status == "REFUNDED":
                self.db.add(
                    ThanhToan(
                        ma_hoa_don=invoice.ma_hoa_don,
                        so_tien=total,
                        phuong_thuc=payment_method,
                        trang_thai="REFUNDED",
                        ma_giao_dich=f"RF{created_at.strftime('%Y%m%d')}{invoice.ma_hoa_don:04d}",
                        ghi_chu="Hoàn tiền mẫu seed",
                        ngay_thanh_toan=created_at + timedelta(hours=2),
                        ngay_tao=created_at + timedelta(hours=2),
                    )
                )

            created.append(invoice)

        self.db.commit()
        for inv in created:
            self.db.refresh(inv)
        logger.info("invoice_seeded", created=len(created))
        return created

    def create_invoice_from_appointment(
        self,
        appointment_id: int,
        staff_id: Optional[int] = None,
        auto_pay: bool = False,
        force_mark_completed: bool = False,
    ) -> HoaDon:
        from app.infrastructure.persistence.models.appointment import LichHen
        from app.infrastructure.persistence.models.inventory import DinhMucVatTu, TonKho

        appt = (
            self.db.query(LichHen)
            .options(
                joinedload(LichHen.chi_tiets),
                joinedload(LichHen.hoa_don),
            )
            .filter(LichHen.ma_lich_hen == appointment_id)
            .first()
        )

        if not appt:
            raise NotFoundException(message="Lịch hẹn không tồn tại")
        if appt.trang_thai == "CANCELLED":
            raise BusinessRuleException(message="Không thể lập hóa đơn cho lịch hẹn đã hủy")

        has_dirty_changes = False
        if force_mark_completed and appt.trang_thai != "COMPLETED":
            appt.trang_thai = "COMPLETED"
            has_dirty_changes = True

        invoice = appt.hoa_don
        created_new_invoice = False

        if not invoice:
            service_ids = [d.ma_san_pham for d in appt.chi_tiets]
            price_map = self._get_current_service_prices(set(service_ids))

            chi_tiets_data = []
            for d in appt.chi_tiets:
                don_gia = _to_decimal(d.gia) if d.gia is not None else price_map.get(d.ma_san_pham, Decimal("0"))
                chi_tiets_data.append(
                    {
                        "ma_san_pham": d.ma_san_pham,
                        "so_luong": 1,
                        "don_gia": don_gia,
                        "ghi_chu": d.ghi_chu,
                    }
                )

            if len(chi_tiets_data) == 0:
                raise BusinessRuleException(message="Lịch hẹn chưa có dịch vụ để lập hóa đơn")

            invoice = self.create_invoice(
                {
                    "ma_khach_hang": appt.ma_khach_hang,
                    "ma_lich_hen": appt.ma_lich_hen,
                    "ghi_chu": f"Hóa đơn từ lịch hẹn #{appt.ma_lich_hen}",
                    "chi_tiets": chi_tiets_data,
                },
                staff_id=staff_id,
            )
            created_new_invoice = True

            for d in appt.chi_tiets:
                dinh_mucs = self.db.query(DinhMucVatTu).filter(DinhMucVatTu.ma_san_pham == d.ma_san_pham).all()
                for dm in dinh_mucs:
                    ton_kho = self.db.query(TonKho).filter(TonKho.ma_ton_kho == dm.ma_ton_kho).first()
                    if ton_kho:
                        ton_kho.so_luong -= int(dm.so_luong_tieu_hao)

        if invoice and staff_id and not invoice.ma_nhan_vien:
            invoice.ma_nhan_vien = staff_id
            has_dirty_changes = True

        if created_new_invoice:
            self.db.commit()
            invoice = self.get_invoice(invoice.ma_hoa_don)
            has_dirty_changes = False

        if auto_pay:
            paid_amount = sum(
                _to_decimal(p.so_tien)
                for p in invoice.thanh_toans
                if str(p.trang_thai or "").upper() == "SUCCESS"
            )
            remaining = _to_decimal(invoice.thanh_tien) - paid_amount
            if remaining > 0:
                PaymentService(self.db).create_payment(
                    {
                        "ma_hoa_don": invoice.ma_hoa_don,
                        "so_tien": remaining,
                        "phuong_thuc": "CASH",
                        "trang_thai": "SUCCESS",
                        "ghi_chu": "Thanh toán từ lịch hẹn",
                        "ma_giao_dich": None,
                    }
                )
                invoice = self.get_invoice(invoice.ma_hoa_don)
                has_dirty_changes = False

        if has_dirty_changes:
            self.db.commit()

        return self.get_invoice(invoice.ma_hoa_don)

    def checkout_appointment(self, appointment_id: int, staff_id: Optional[int] = None) -> HoaDon:
        """Create/reuse invoice from appointment and mark paid."""
        return self.create_invoice_from_appointment(
            appointment_id=appointment_id,
            staff_id=staff_id,
            auto_pay=True,
            force_mark_completed=True,
        )

    def _get_customer(self, customer_id: int) -> NguoiDung:
        customer = self.db.query(NguoiDung).filter(NguoiDung.ma_nguoi_dung == customer_id).first()
        if not customer:
            raise NotFoundException(message="Khách hàng không tồn tại")
        return customer

    def _normalize_status(self, status: str) -> str:
        value = str(status or "").upper()
        if value not in VALID_INVOICE_STATUSES:
            raise BusinessRuleException(message="Trạng thái hóa đơn không hợp lệ")
        return value

    def _build_line_items(self, details_data: List[dict]) -> Tuple[List[dict], Decimal]:
        if not details_data:
            raise BusinessRuleException(message="Hóa đơn phải có ít nhất một dòng chi tiết")

        rows: List[dict] = []
        tong_tien = Decimal("0")
        for detail in details_data:
            ma_san_pham = detail.get("ma_san_pham")
            so_luong = int(detail.get("so_luong", 1) or 1)
            don_gia = _to_decimal(detail.get("don_gia"))

            if not ma_san_pham:
                raise BusinessRuleException(message="Thiếu mã sản phẩm trong chi tiết hóa đơn")
            if so_luong <= 0:
                raise BusinessRuleException(message="Số lượng sản phẩm phải lớn hơn 0")
            if don_gia < 0:
                raise BusinessRuleException(message="Đơn giá sản phẩm không hợp lệ")

            thanh_tien = _round_money(don_gia * Decimal(str(so_luong)))
            tong_tien += thanh_tien
            rows.append(
                {
                    "ma_san_pham": int(ma_san_pham),
                    "so_luong": so_luong,
                    "don_gia": _round_money(don_gia),
                    "thanh_tien": thanh_tien,
                    "ghi_chu": detail.get("ghi_chu"),
                }
            )

        return rows, _round_money(tong_tien)

    def _resolve_promotion(self, promotion_id: Optional[int], tong_tien: Decimal) -> Tuple[Optional[KhuyenMai], Decimal]:
        if not promotion_id:
            return None, Decimal("0")

        promo = self.db.query(KhuyenMai).filter(KhuyenMai.ma_khuyen_mai == promotion_id).first()
        if not promo:
            raise NotFoundException(message="Khuyến mãi không tồn tại")

        now = datetime.utcnow()
        if promo.trang_thai != "ACTIVE" or promo.ngay_bat_dau > now or promo.ngay_ket_thuc < now:
            raise BusinessRuleException(message="Khuyến mãi không nằm trong thời gian áp dụng")
        if promo.don_toi_thieu and tong_tien < _to_decimal(promo.don_toi_thieu):
            raise BusinessRuleException(message="Đơn hàng chưa đạt giá trị tối thiểu để áp dụng khuyến mãi")
        if promo.so_luot_su_dung is not None and int(promo.da_su_dung or 0) >= int(promo.so_luot_su_dung):
            raise BusinessRuleException(message="Khuyến mãi đã hết lượt sử dụng")

        if str(promo.loai_giam or "").upper() == "PERCENT":
            discount = tong_tien * _to_decimal(promo.gia_tri_giam) / Decimal("100")
            if promo.giam_toi_da is not None:
                discount = min(discount, _to_decimal(promo.giam_toi_da))
        else:
            discount = _to_decimal(promo.gia_tri_giam)

        discount = min(_round_money(discount), tong_tien)
        return promo, discount

    def _resolve_points_usage(
        self,
        customer: NguoiDung,
        requested_points: int,
        max_base_amount: Decimal,
    ) -> Tuple[int, Decimal]:
        if requested_points < 0:
            raise BusinessRuleException(message="Điểm sử dụng không hợp lệ")
        if requested_points == 0:
            return 0, Decimal("0")
        if requested_points < MIN_POINT_REDEEM:
            raise BusinessRuleException(message=f"Tối thiểu {MIN_POINT_REDEEM} điểm mới được sử dụng")

        available_points = int(customer.diem_tich_luy or 0)
        if requested_points > available_points:
            raise BusinessRuleException(message="Không đủ điểm tích lũy")

        max_point_value = _round_money(max_base_amount * MAX_POINT_DISCOUNT_RATE)
        max_points_allowed = int(max_point_value / POINT_VALUE)
        if requested_points > max_points_allowed:
            raise BusinessRuleException(message="Số điểm sử dụng vượt quá 50% giá trị hóa đơn")

        point_value = _round_money(Decimal(requested_points) * POINT_VALUE)
        return requested_points, point_value

    def _append_point_history(
        self,
        customer: NguoiDung,
        invoice_id: int,
        event_type: str,
        change: int,
        note: str,
    ) -> None:
        if change == 0:
            return

        current = int(customer.diem_tich_luy or 0)
        customer.diem_tich_luy = current + int(change)
        self.db.add(
            LichSuDiem(
                ma_khach_hang=customer.ma_nguoi_dung,
                ma_hoa_don=invoice_id,
                loai_bien_dong=event_type,
                diem_thay_doi=int(change),
                so_du_sau=int(customer.diem_tich_luy or 0),
                noi_dung=note,
            )
        )

    def _sum_point_events(self, invoice_id: int, event_types: List[str]) -> int:
        total = (
            self.db.query(func.coalesce(func.sum(LichSuDiem.diem_thay_doi), 0))
            .filter(
                LichSuDiem.ma_hoa_don == invoice_id,
                LichSuDiem.loai_bien_dong.in_(event_types),
            )
            .scalar()
        )
        return int(total or 0)

    def _grant_earned_points(self, invoice: HoaDon, customer: NguoiDung) -> None:
        target = int(invoice.diem_tich_luy or 0)
        if target <= 0:
            return

        current = self._sum_point_events(
            invoice.ma_hoa_don,
            [POINT_EVENT_INVOICE_EARN, POINT_EVENT_INVOICE_EARN_REVOKE],
        )
        missing = target - current
        if missing <= 0:
            return

        self._append_point_history(
            customer=customer,
            invoice_id=invoice.ma_hoa_don,
            event_type=POINT_EVENT_INVOICE_EARN,
            change=missing,
            note=f"Cộng điểm từ hóa đơn #{invoice.ma_hoa_don}",
        )

    def _revoke_earned_points_if_any(self, invoice: HoaDon, customer: NguoiDung) -> None:
        earned_balance = self._sum_point_events(
            invoice.ma_hoa_don,
            [POINT_EVENT_INVOICE_EARN, POINT_EVENT_INVOICE_EARN_REVOKE],
        )
        if earned_balance <= 0:
            return

        self._append_point_history(
            customer=customer,
            invoice_id=invoice.ma_hoa_don,
            event_type=POINT_EVENT_INVOICE_EARN_REVOKE,
            change=-earned_balance,
            note=f"Thu hồi điểm do hóa đơn #{invoice.ma_hoa_don} bị hoàn/hủy",
        )

    def _refund_spent_points_if_any(self, invoice: HoaDon, customer: NguoiDung, reason: str) -> None:
        spend_balance = self._sum_point_events(
            invoice.ma_hoa_don,
            [POINT_EVENT_INVOICE_SPEND, POINT_EVENT_INVOICE_SPEND_REFUND],
        )
        if spend_balance >= 0:
            return

        refund_points = abs(spend_balance)
        self._append_point_history(
            customer=customer,
            invoice_id=invoice.ma_hoa_don,
            event_type=POINT_EVENT_INVOICE_SPEND_REFUND,
            change=refund_points,
            note=reason,
        )

    def _get_current_service_prices(self, service_ids: set[int]) -> Dict[int, Decimal]:
        if not service_ids:
            return {}
        services = (
            self.db.query(SanPham)
            .options(joinedload(SanPham.bang_gias))
            .filter(SanPham.ma_san_pham.in_(service_ids))
            .all()
        )
        price_map: Dict[int, Decimal] = {}
        for service in services:
            if service.bang_gias and service.bang_gias[0].gia is not None:
                price_map[service.ma_san_pham] = _to_decimal(service.bang_gias[0].gia)
            else:
                price_map[service.ma_san_pham] = Decimal("0")
        return price_map


class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    def create_payment(self, data: dict) -> ThanhToan:
        """Create a payment for an invoice."""
        invoice = (
            self.db.query(HoaDon)
            .options(joinedload(HoaDon.thanh_toans))
            .filter(HoaDon.ma_hoa_don == data["ma_hoa_don"])
            .first()
        )
        if not invoice:
            raise NotFoundException(message="Hóa đơn không tồn tại")
        if invoice.trang_thai in ("PAID", "CANCELLED", "REFUNDED"):
            raise BusinessRuleException(message="Hóa đơn đã thanh toán hoặc đã hủy/hoàn")

        paid = sum(_to_decimal(p.so_tien) for p in invoice.thanh_toans if p.trang_thai == "SUCCESS")
        remaining = _to_decimal(invoice.thanh_tien) - paid

        payment_amount = _to_decimal(data["so_tien"])
        if payment_amount > remaining:
            raise BusinessRuleException(
                message=f"Số tiền thanh toán vượt quá số tiền còn lại ({remaining:,.0f}đ)"
            )

        payment = ThanhToan(
            ma_hoa_don=invoice.ma_hoa_don,
            so_tien=payment_amount,
            phuong_thuc=data.get("phuong_thuc", "CASH"),
            trang_thai=data.get("trang_thai", "SUCCESS"),
            ma_giao_dich=data.get("ma_giao_dich"),
            ghi_chu=data.get("ghi_chu"),
            ngay_thanh_toan=data.get("ngay_thanh_toan") or datetime.utcnow(),
        )
        self.db.add(payment)
        self.db.flush()

        new_paid = paid + payment_amount
        if new_paid >= _to_decimal(invoice.thanh_tien):
            InvoiceService(self.db).update_invoice_status(invoice.ma_hoa_don, "PAID")
        else:
            invoice.trang_thai = "PARTIAL"
            self.db.commit()

        self.db.refresh(payment)
        logger.info("payment_created", payment_id=payment.ma_thanh_toan, amount=str(data["so_tien"]))
        return payment

    def get_payments_by_invoice(self, invoice_id: int) -> List[ThanhToan]:
        return self.db.query(ThanhToan).filter(ThanhToan.ma_hoa_don == invoice_id).all()
