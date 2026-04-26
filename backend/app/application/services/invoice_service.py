"""
Invoice & Payment Service with transaction safety.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlencode

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.exceptions import NotFoundException, BusinessRuleException
from app.core.logging_config import get_logger
from app.infrastructure.persistence.models.invoice import HoaDon, ChiTietHoaDon, ThanhToan
from app.infrastructure.persistence.models.loyalty import LichSuDiem
from app.infrastructure.persistence.models.user import NguoiDung, VaiTro
from app.infrastructure.persistence.models.staff import NhanVien
from app.infrastructure.persistence.models.product import SanPham
from app.infrastructure.persistence.models.marketing import KhuyenMai

logger = get_logger(__name__)

# VNPay requires GMT+7 (Vietnam local time) for create/expire timestamps.
VNPAY_TIMEZONE = timezone(timedelta(hours=7))

# 10.000Ä‘ = 1 Ä‘iá»ƒm
POINT_EARN_RATE = Decimal("10000")
# 1 Ä‘iá»ƒm = 1.000Ä‘
POINT_VALUE = Decimal("1000")
# Tá»‘i thiá»ƒu 100 Ä‘iá»ƒm má»›i Ä‘Æ°á»£c dĂ¹ng
MIN_POINT_REDEEM = 100
# Má»—i Ä‘Æ¡n chá»‰ Ä‘Æ°á»£c dĂ¹ng tá»‘i Ä‘a 50% giĂ¡ trá»‹ hĂ³a Ä‘Æ¡n
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
            raise NotFoundException(message="HĂ³a Ä‘Æ¡n khĂ´ng tá»“n táº¡i")
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
                note=f"Trá»« Ä‘iá»ƒm dĂ¹ng cho hĂ³a Ä‘Æ¡n #{invoice.ma_hoa_don}",
            )

        self.db.commit()
        logger.info("invoice_created", invoice_id=invoice.ma_hoa_don, total=str(thanh_tien))
        return self.get_invoice(invoice.ma_hoa_don)

    def update_pending_invoice(self, invoice_id: int, data: dict, staff_id: Optional[int] = None) -> HoaDon:
        invoice = self.get_invoice(invoice_id)
        if invoice.trang_thai != "PENDING":
            raise BusinessRuleException(message="Chá»‰ Ä‘Æ°á»£c chá»‰nh sá»­a hĂ³a Ä‘Æ¡n khi tráº¡ng thĂ¡i lĂ  chÆ°a thanh toĂ¡n")

        payload = dict(data)
        chi_tiets_data = payload.pop("chi_tiets", [])
        promotion_id = payload.pop("ma_khuyen_mai", None)
        requested_points = int(payload.pop("diem_su_dung", 0) or 0)

        customer = self._get_customer(invoice.ma_khach_hang)

        self._refund_spent_points_if_any(invoice, customer, reason="HoĂ n Ä‘iá»ƒm do chá»‰nh sá»­a hĂ³a Ä‘Æ¡n chÆ°a thanh toĂ¡n")

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
                note=f"Trá»« Ä‘iá»ƒm dĂ¹ng cho hĂ³a Ä‘Æ¡n #{invoice.ma_hoa_don}",
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
            self._refund_spent_points_if_any(invoice, customer, reason=f"HoĂ n Ä‘iá»ƒm do hĂ³a Ä‘Æ¡n #{invoice.ma_hoa_don} {next_status}")

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
            raise BusinessRuleException(message="KhĂ´ng cĂ³ khĂ¡ch hĂ ng Ä‘á»ƒ seed hĂ³a Ä‘Æ¡n")

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
            raise BusinessRuleException(message="KhĂ´ng cĂ³ dá»‹ch vá»¥/sáº£n pháº©m Ä‘á»ƒ seed hĂ³a Ä‘Æ¡n")

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
                "KhĂ¡ch Ä‘á»•i lá»‹ch, hoĂ n tiá»n theo chĂ­nh sĂ¡ch trong 24h."
                if status == "REFUNDED"
                else "KhĂ¡ch xĂ¡c nháº­n dá»‹ch vá»¥ trÆ°á»›c khi thanh toĂ¡n."
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
                        ghi_chu="Thanh toĂ¡n máº«u seed",
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
                        ghi_chu="HoĂ n tiá»n máº«u seed",
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
            raise NotFoundException(message="Lá»‹ch háº¹n khĂ´ng tá»“n táº¡i")
        if appt.trang_thai == "CANCELLED":
            raise BusinessRuleException(message="KhĂ´ng thá»ƒ láº­p hĂ³a Ä‘Æ¡n cho lá»‹ch háº¹n Ä‘Ă£ há»§y")

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
                raise BusinessRuleException(message="Lá»‹ch háº¹n chÆ°a cĂ³ dá»‹ch vá»¥ Ä‘á»ƒ láº­p hĂ³a Ä‘Æ¡n")

            invoice = self.create_invoice(
                {
                    "ma_khach_hang": appt.ma_khach_hang,
                    "ma_lich_hen": appt.ma_lich_hen,
                    "ghi_chu": f"HĂ³a Ä‘Æ¡n tá»« lá»‹ch háº¹n #{appt.ma_lich_hen}",
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
                        "ghi_chu": "Thanh toĂ¡n tá»« lá»‹ch háº¹n",
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
            raise NotFoundException(message="KhĂ¡ch hĂ ng khĂ´ng tá»“n táº¡i")
        return customer

    def _normalize_status(self, status: str) -> str:
        value = str(status or "").upper()
        if value not in VALID_INVOICE_STATUSES:
            raise BusinessRuleException(message="Tráº¡ng thĂ¡i hĂ³a Ä‘Æ¡n khĂ´ng há»£p lá»‡")
        return value

    def _build_line_items(self, details_data: List[dict]) -> Tuple[List[dict], Decimal]:
        if not details_data:
            raise BusinessRuleException(message="HĂ³a Ä‘Æ¡n pháº£i cĂ³ Ă­t nháº¥t má»™t dĂ²ng chi tiáº¿t")

        rows: List[dict] = []
        tong_tien = Decimal("0")
        for detail in details_data:
            ma_san_pham = detail.get("ma_san_pham")
            so_luong = int(detail.get("so_luong", 1) or 1)
            don_gia = _to_decimal(detail.get("don_gia"))

            if not ma_san_pham:
                raise BusinessRuleException(message="Thiáº¿u mĂ£ sáº£n pháº©m trong chi tiáº¿t hĂ³a Ä‘Æ¡n")
            if so_luong <= 0:
                raise BusinessRuleException(message="Sá»‘ lÆ°á»£ng sáº£n pháº©m pháº£i lá»›n hÆ¡n 0")
            if don_gia < 0:
                raise BusinessRuleException(message="ÄÆ¡n giĂ¡ sáº£n pháº©m khĂ´ng há»£p lá»‡")

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
            raise NotFoundException(message="Khuyáº¿n mĂ£i khĂ´ng tá»“n táº¡i")

        now = datetime.utcnow()
        if promo.trang_thai != "ACTIVE" or promo.ngay_bat_dau > now or promo.ngay_ket_thuc < now:
            raise BusinessRuleException(message="Khuyáº¿n mĂ£i khĂ´ng náº±m trong thá»i gian Ă¡p dá»¥ng")
        if promo.don_toi_thieu and tong_tien < _to_decimal(promo.don_toi_thieu):
            raise BusinessRuleException(message="ÄÆ¡n hĂ ng chÆ°a Ä‘áº¡t giĂ¡ trá»‹ tá»‘i thiá»ƒu Ä‘á»ƒ Ă¡p dá»¥ng khuyáº¿n mĂ£i")
        if promo.so_luot_su_dung is not None and int(promo.da_su_dung or 0) >= int(promo.so_luot_su_dung):
            raise BusinessRuleException(message="Khuyáº¿n mĂ£i Ä‘Ă£ háº¿t lÆ°á»£t sá»­ dá»¥ng")

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
            raise BusinessRuleException(message="Äiá»ƒm sá»­ dá»¥ng khĂ´ng há»£p lá»‡")
        if requested_points == 0:
            return 0, Decimal("0")
        if requested_points < MIN_POINT_REDEEM:
            raise BusinessRuleException(message=f"Tá»‘i thiá»ƒu {MIN_POINT_REDEEM} Ä‘iá»ƒm má»›i Ä‘Æ°á»£c sá»­ dá»¥ng")

        available_points = int(customer.diem_tich_luy or 0)
        if requested_points > available_points:
            raise BusinessRuleException(message="KhĂ´ng Ä‘á»§ Ä‘iá»ƒm tĂ­ch lÅ©y")

        max_point_value = _round_money(max_base_amount * MAX_POINT_DISCOUNT_RATE)
        max_points_allowed = int(max_point_value / POINT_VALUE)
        if requested_points > max_points_allowed:
            raise BusinessRuleException(message="Sá»‘ Ä‘iá»ƒm sá»­ dá»¥ng vÆ°á»£t quĂ¡ 50% giĂ¡ trá»‹ hĂ³a Ä‘Æ¡n")

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
            note=f"Cá»™ng Ä‘iá»ƒm tá»« hĂ³a Ä‘Æ¡n #{invoice.ma_hoa_don}",
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
            note=f"Thu há»“i Ä‘iá»ƒm do hĂ³a Ä‘Æ¡n #{invoice.ma_hoa_don} bá»‹ hoĂ n/há»§y",
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

    def _load_invoice(self, invoice_id: int) -> HoaDon:
        invoice = (
            self.db.query(HoaDon)
            .options(
                joinedload(HoaDon.thanh_toans),
                joinedload(HoaDon.chi_tiets),
            )
            .filter(HoaDon.ma_hoa_don == invoice_id)
            .first()
        )
        if not invoice:
            raise NotFoundException(message='Hoa don khong ton tai')
        return invoice

    def _normalize_method(self, method: Optional[str]) -> str:
        value = str(method or 'CASH').upper().strip()
        if value in ('CASH', 'TIEN_MAT'):
            return 'CASH'
        if value in ('VNPAY', 'BANK', 'TRANSFER', 'CARD', 'QR'):
            return 'VNPAY'
        raise BusinessRuleException(message='Phuong thuc thanh toan khong hop le')

    def _normalize_status(self, status: Optional[str]) -> str:
        value = str(status or 'PAID').upper().strip()
        if value in ('PAID', 'SUCCESS'):
            return 'PAID'
        if value in ('UNPAID', 'PENDING', 'FAILED'):
            return 'UNPAID'
        raise BusinessRuleException(message='Trang thai thanh toan khong hop le')

    def _is_paid(self, status: Optional[str]) -> bool:
        return str(status or '').upper().strip() in ('PAID', 'SUCCESS')

    def _recalculate_invoice_totals(self, invoice: HoaDon) -> None:
        subtotal = Decimal('0')
        for detail in invoice.chi_tiets or []:
            qty = max(1, int(detail.so_luong or 1))
            unit_price = _round_money(_to_decimal(detail.don_gia))
            line_total = _round_money(unit_price * Decimal(str(qty)))
            detail.so_luong = qty
            detail.don_gia = unit_price
            detail.thanh_tien = line_total
            subtotal += line_total

        subtotal = _round_money(subtotal)
        discount = max(Decimal('0'), _round_money(_to_decimal(invoice.giam_gia)))
        discount = min(discount, subtotal)
        point_value = max(Decimal('0'), _round_money(_to_decimal(invoice.gia_tri_diem)))
        point_value = min(point_value, max(Decimal('0'), subtotal - discount))

        taxable = max(Decimal('0'), subtotal - discount - point_value)
        vat = _round_money(taxable * TAX_RATE)
        total = _round_money(taxable + vat)

        invoice.tong_tien = subtotal
        invoice.giam_gia = discount
        invoice.gia_tri_diem = point_value
        invoice.thue = vat
        invoice.thanh_tien = total
        invoice.diem_tich_luy = int(total / POINT_EARN_RATE)

    def _paid_amount(self, invoice: HoaDon) -> Decimal:
        return sum(
            _to_decimal(payment.so_tien)
            for payment in (invoice.thanh_toans or [])
            if self._is_paid(getattr(payment, 'trang_thai', None))
        )

    def _ensure_payable(self, invoice: HoaDon) -> None:
        if str(invoice.trang_thai or '').upper() in ('PAID', 'CANCELLED', 'REFUNDED'):
            raise BusinessRuleException(message='Hoa don da thanh toan hoac da huy/hoan')

    def _remaining(self, invoice: HoaDon) -> Decimal:
        self._recalculate_invoice_totals(invoice)
        paid = self._paid_amount(invoice)
        return max(Decimal('0'), _to_decimal(invoice.thanh_tien) - paid)

    def _sync_invoice_status(self, invoice: HoaDon, new_paid_amount: Decimal) -> None:
        total = _to_decimal(invoice.thanh_tien)
        if total > 0 and new_paid_amount >= total:
            InvoiceService(self.db).update_invoice_status(invoice.ma_hoa_don, 'PAID')
            return

        invoice.trang_thai = 'PARTIAL' if new_paid_amount > 0 else 'PENDING'
        self.db.commit()

    def create_payment(self, data: dict) -> ThanhToan:
        """Create payment with backend-calculated payable amount."""
        invoice = self._load_invoice(int(data['ma_hoa_don']))
        self._ensure_payable(invoice)

        payment_method = self._normalize_method(data.get('phuong_thuc'))
        payment_status = self._normalize_status(data.get('trang_thai'))

        paid_before = self._paid_amount(invoice)
        remaining = self._remaining(invoice)
        if remaining <= 0:
            raise BusinessRuleException(message='Hoa don khong con so tien can thanh toan')

        amount = data.get('so_tien')
        if amount is None:
            payment_amount = remaining
        else:
            payment_amount = _to_decimal(amount)
            if payment_amount <= 0:
                raise BusinessRuleException(message='So tien thanh toan phai lon hon 0')
            if payment_amount > remaining:
                raise BusinessRuleException(
                    message=f'So tien thanh toan vuot qua so tien con lai ({remaining:,.0f}d)'
                )

        payment = ThanhToan(
            ma_hoa_don=invoice.ma_hoa_don,
            so_tien=_round_money(payment_amount),
            phuong_thuc=payment_method,
            trang_thai=payment_status,
            ma_giao_dich=data.get('ma_giao_dich'),
            ghi_chu=data.get('ghi_chu'),
            ngay_thanh_toan=data.get('ngay_thanh_toan') or datetime.utcnow(),
        )
        self.db.add(payment)
        self.db.flush()

        paid_after = paid_before + (payment_amount if self._is_paid(payment_status) else Decimal('0'))
        self._sync_invoice_status(invoice, paid_after)

        self.db.refresh(payment)
        logger.info(
            'payment_created',
            payment_id=payment.ma_thanh_toan,
            invoice_id=invoice.ma_hoa_don,
            method=payment_method,
            status=payment_status,
            amount=str(payment_amount),
        )
        return payment

    def pay_invoice(self, invoice_id: int, payment_method: str = 'CASH', note: Optional[str] = None) -> ThanhToan:
        method = self._normalize_method(payment_method)
        if method != 'CASH':
            raise BusinessRuleException(message='Endpoint nay chi dung de thanh toan tien mat')
        return self.create_payment(
            {
                'ma_hoa_don': invoice_id,
                'phuong_thuc': 'CASH',
                'trang_thai': 'PAID',
                'ghi_chu': note or 'Thanh toan tien mat',
            }
        )

    def _build_vnpay_hash(self, params: dict) -> str:
        hash_data = urlencode(sorted(params.items()))
        return hmac.new(
            settings.VNPAY_HASH_SECRET.encode('utf-8'),
            hash_data.encode('utf-8'),
            hashlib.sha512,
        ).hexdigest()

    def create_vnpay_payment_url(self, invoice_id: int, client_ip: str = '127.0.0.1', return_url: Optional[str] = None) -> dict:
        if not settings.VNPAY_TMN_CODE or not settings.VNPAY_HASH_SECRET or not settings.VNPAY_PAYMENT_URL:
            raise BusinessRuleException(message='Thieu cau hinh VNPAY')

        invoice = self._load_invoice(invoice_id)
        self._ensure_payable(invoice)
        remaining = self._remaining(invoice)
        if remaining <= 0:
            raise BusinessRuleException(message='Hoa don khong con so tien can thanh toan')

        now_vn = datetime.now(VNPAY_TIMEZONE)
        expire_minutes = max(1, int(getattr(settings, 'VNPAY_EXPIRE_MINUTES', 30) or 30))
        txn_ref = f"{invoice_id}_{now_vn.strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(3)}"
        payment = ThanhToan(
            ma_hoa_don=invoice.ma_hoa_don,
            so_tien=_round_money(remaining),
            phuong_thuc='VNPAY',
            trang_thai='UNPAID',
            ma_giao_dich=txn_ref,
            ghi_chu='Khoi tao giao dich VNPAY',
            ngay_thanh_toan=datetime.utcnow(),
        )
        self.db.add(payment)
        self.db.commit()

        params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': settings.VNPAY_TMN_CODE,
            'vnp_Amount': str(int((_round_money(remaining) * Decimal('100')).quantize(Decimal('1')))),
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': txn_ref,
            'vnp_OrderInfo': f'Thanh toan hoa don #{invoice.ma_hoa_don}',
            'vnp_OrderType': 'other',
            'vnp_Locale': 'vn',
            'vnp_ReturnUrl': (return_url or settings.VNPAY_RETURN_URL).strip(),
            'vnp_IpAddr': client_ip or '127.0.0.1',
            'vnp_CreateDate': now_vn.strftime('%Y%m%d%H%M%S'),
            'vnp_ExpireDate': (now_vn + timedelta(minutes=expire_minutes)).strftime('%Y%m%d%H%M%S'),
        }
        secure_hash = self._build_vnpay_hash(params)
        payment_url = f"{settings.VNPAY_PAYMENT_URL}?{urlencode(sorted(params.items()))}&vnp_SecureHash={secure_hash}"
        return {
            'ma_hoa_don': invoice.ma_hoa_don,
            'txn_ref': txn_ref,
            'payment_url': payment_url,
            'amount': _round_money(remaining),
        }

    def handle_vnpay_callback(self, params: dict) -> dict:
        secure_hash = str(params.get('vnp_SecureHash') or '').strip()
        if not secure_hash:
            raise BusinessRuleException(message='Thieu chu ky VNPAY')

        filtered = {
            key: value
            for key, value in params.items()
            if key.startswith('vnp_') and key not in ('vnp_SecureHash', 'vnp_SecureHashType')
        }
        computed_hash = self._build_vnpay_hash(filtered)
        if not hmac.compare_digest(computed_hash, secure_hash):
            raise BusinessRuleException(message='Chu ky VNPAY khong hop le')

        txn_ref = str(params.get('vnp_TxnRef') or '').strip()
        if not txn_ref:
            raise BusinessRuleException(message='Thieu ma giao dich VNPAY')

        payment = (
            self.db.query(ThanhToan)
            .filter(ThanhToan.ma_giao_dich == txn_ref, ThanhToan.phuong_thuc == 'VNPAY')
            .order_by(ThanhToan.ma_thanh_toan.desc())
            .first()
        )
        if not payment:
            raise NotFoundException(message='Khong tim thay giao dich VNPAY')

        invoice = self._load_invoice(payment.ma_hoa_don)
        paid_before = self._paid_amount(invoice)

        response_code = str(params.get('vnp_ResponseCode') or '')
        transaction_status = str(params.get('vnp_TransactionStatus') or '')
        is_success = response_code == '00' and (transaction_status in ('', '00'))

        if is_success:
            callback_amount_raw = str(params.get('vnp_Amount') or '0')
            try:
                callback_amount = _round_money(Decimal(callback_amount_raw) / Decimal('100'))
            except Exception:
                callback_amount = Decimal('0')

            expected_amount = _round_money(_to_decimal(payment.so_tien))
            if callback_amount <= 0 or callback_amount != expected_amount:
                raise BusinessRuleException(message='So tien callback VNPAY khong khop hoa don')

            if not self._is_paid(payment.trang_thai):
                payment.trang_thai = 'PAID'
                payment.ngay_thanh_toan = datetime.utcnow()
                payment.ghi_chu = 'Thanh toan VNPAY thanh cong'
                paid_after = paid_before + expected_amount
            else:
                paid_after = paid_before

            self._sync_invoice_status(invoice, paid_after)
            return {
                'success': True,
                'ma_hoa_don': invoice.ma_hoa_don,
                'txn_ref': txn_ref,
                'payment_method': 'VNPAY',
                'payment_status': 'PAID',
                'invoice_status': str(invoice.trang_thai or 'PAID'),
            }

        payment.trang_thai = 'UNPAID'
        payment.ghi_chu = f'Thanh toan VNPAY that bai (code={response_code})'
        self.db.commit()
        return {
            'success': False,
            'ma_hoa_don': invoice.ma_hoa_don,
            'txn_ref': txn_ref,
            'payment_method': 'VNPAY',
            'payment_status': 'UNPAID',
            'invoice_status': str(invoice.trang_thai or 'PENDING'),
            'response_code': response_code,
        }

    def get_payments_by_invoice(self, invoice_id: int) -> List[ThanhToan]:
        return (
            self.db.query(ThanhToan)
            .filter(ThanhToan.ma_hoa_don == invoice_id)
            .order_by(ThanhToan.ngay_tao.desc(), ThanhToan.ma_thanh_toan.desc())
            .all()
        )
