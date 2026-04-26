"""
Appointment Service with transaction safety and conflict detection.
"""
from decimal import Decimal
from datetime import date, time, datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, BusinessRuleException
from app.core.logging_config import get_logger
from app.infrastructure.persistence.models.appointment import LichHen, KhachDiKem, ChiTietLichHen
from app.infrastructure.persistence.models.combo import ComboKhachHang
from app.infrastructure.persistence.models.product import SanPham
from app.infrastructure.persistence.models.staff import NhanVien

logger = get_logger(__name__)

BOOKING_OPEN_MINUTES = 8 * 60
BOOKING_CLOSE_MINUTES = 22 * 60
BOOKING_SLOT_MINUTES = 30
BOOKING_MAX_DAYS = 7


class AppointmentService:
    def __init__(self, db: Session):
        self.db = db

    def get_appointments(
        self,
        page: int = 1,
        page_size: int = 10,
        customer_id: Optional[int] = None,
        staff_id: Optional[int] = None,
        status: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> Tuple[List[LichHen], int]:
        query = self.db.query(LichHen).options(
            joinedload(LichHen.nguoi_dung),
            joinedload(LichHen.chi_tiets).joinedload(ChiTietLichHen.san_pham),
            joinedload(LichHen.chi_tiets)
            .joinedload(ChiTietLichHen.nhan_vien)
            .joinedload(NhanVien.nguoi_dung),
            joinedload(LichHen.khach_di_kems),
            joinedload(LichHen.hoa_don),
        )
        if customer_id:
            query = query.filter(LichHen.ma_khach_hang == customer_id)
        if status:
            query = query.filter(LichHen.trang_thai == status)
        if from_date:
            query = query.filter(LichHen.ngay_hen >= from_date)
        if to_date:
            query = query.filter(LichHen.ngay_hen <= to_date)
        if staff_id:
            query = query.join(ChiTietLichHen).filter(ChiTietLichHen.ma_nhan_vien == staff_id)

        total = query.count()
        appointments = (
            query.order_by(LichHen.ngay_hen.desc(), LichHen.gio_bat_dau)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return appointments, total

    def get_appointment(self, appointment_id: int) -> LichHen:
        appt = (
            self.db.query(LichHen)
            .options(
                joinedload(LichHen.nguoi_dung),
                joinedload(LichHen.chi_tiets).joinedload(ChiTietLichHen.san_pham),
                joinedload(LichHen.chi_tiets)
                .joinedload(ChiTietLichHen.nhan_vien)
                .joinedload(NhanVien.nguoi_dung),
                joinedload(LichHen.khach_di_kems),
                joinedload(LichHen.hoa_don),
            )
            .filter(LichHen.ma_lich_hen == appointment_id)
            .first()
        )
        if not appt:
            raise NotFoundException(message="Lịch hẹn không tồn tại")
        return appt

    def create_appointment(self, customer_id: int, data: dict) -> LichHen:
        """
        Create appointment with details in a single transaction.
        Validates schedule constraints, staff conflicts, and combo usage.
        """
        chi_tiets_data = data.pop("chi_tiets", [])
        khach_di_kems_data = data.pop("khach_di_kems", [])

        if not chi_tiets_data:
            raise BusinessRuleException(message="Phải chọn ít nhất một dịch vụ")

        ngay_hen = data.get("ngay_hen")
        gio_bat_dau = data.get("gio_bat_dau")

        if not ngay_hen or not gio_bat_dau:
            raise BusinessRuleException(message="Thiếu ngày hẹn hoặc giờ hẹn")

        service_prices_info = self._get_service_info(
            {
                int(detail.get("ma_san_pham"))
                for detail in chi_tiets_data
                if detail.get("ma_san_pham") is not None
            }
        )
        service_prices = {k: v["gia"] for k, v in service_prices_info.items()}
        # Calculate end time based on longest duration service or sum? 
        # Usually for one staff it's sequential. But current schema treats one 'LichHen' as a block.
        # Let's take the MAX duration for now or SUM if we want to be safe.
        # Most of our services are 60-90-120.
        total_duration = sum(v["thoi_luong"] or 30 for v in service_prices_info.values())
        gio_ket_thuc = data.get("gio_ket_thuc") or self._calculate_end_time(gio_bat_dau, total_duration)

        self._validate_booking_window(ngay_hen)
        self._validate_time_slot(ngay_hen, gio_bat_dau, gio_ket_thuc)
        self._validate_staff_unique_between_people(chi_tiets_data)

        data["gio_ket_thuc"] = gio_ket_thuc

        service_prices = self._get_service_prices(
            {
                int(detail.get("ma_san_pham"))
                for detail in chi_tiets_data
                if detail.get("ma_san_pham") is not None
            }
        )

        for detail in chi_tiets_data:
            if detail.get("ma_nhan_vien"):
                detail_start = detail.get("gio_bat_dau") or gio_bat_dau
                detail_end = detail.get("gio_ket_thuc") or gio_ket_thuc
                self._validate_time_slot(ngay_hen, detail_start, detail_end)
                self._check_staff_conflict(
                    staff_id=int(detail["ma_nhan_vien"]),
                    appt_date=ngay_hen,
                    start_time=detail_start,
                    end_time=detail_end,
                )

        appointment = LichHen(ma_khach_hang=customer_id, **data)
        self.db.add(appointment)
        self.db.flush()

        guest_map: Dict[int, KhachDiKem] = {}
        for i, guest_data in enumerate(khach_di_kems_data):
            guest = KhachDiKem(ma_lich_hen=appointment.ma_lich_hen, **guest_data)
            self.db.add(guest)
            self.db.flush()
            guest_map[i] = guest

        for detail_data in chi_tiets_data:
            detail_payload = dict(detail_data)

            guest_index = detail_payload.pop("chi_so_khach_di_kem", None)
            if detail_payload.get("ma_khach_di_kem") is None and guest_index is not None:
                guest = guest_map.get(int(guest_index))
                if not guest:
                    raise BusinessRuleException(message="Khách đi kèm không hợp lệ trong chi tiết dịch vụ")
                detail_payload["ma_khach_di_kem"] = guest.ma_khach_di_kem

            detail_payload["gio_bat_dau"] = detail_payload.get("gio_bat_dau") or gio_bat_dau
            detail_payload["gio_ket_thuc"] = detail_payload.get("gio_ket_thuc") or gio_ket_thuc

            if detail_payload.get("gia") is None:
                ma_san_pham = int(detail_payload["ma_san_pham"])
                detail_payload["gia"] = service_prices.get(ma_san_pham, Decimal("0"))

            if detail_payload.get("ma_combo_kh"):
                self._use_combo(detail_payload["ma_combo_kh"])

            detail = ChiTietLichHen(
                ma_lich_hen=appointment.ma_lich_hen,
                **detail_payload,
            )
            self.db.add(detail)

        self.db.commit()
        self.db.refresh(appointment)
        logger.info("appointment_created", appointment_id=appointment.ma_lich_hen, customer_id=customer_id)
        return appointment

    def update_appointment(self, appointment_id: int, data: dict) -> LichHen:
        appointment = self.get_appointment(appointment_id)
        if appointment.trang_thai in ("COMPLETED", "CANCELLED"):
            raise BusinessRuleException(message="Không thể cập nhật lịch hẹn đã hoàn thành hoặc đã hủy")

        detail_payloads = data.pop("chi_tiets", None)
        guest_payloads = data.pop("khach_di_kems", None)

        # 1. Basic Fields
        next_date = data.get("ngay_hen", appointment.ngay_hen)
        next_start = data.get("gio_bat_dau", appointment.gio_bat_dau)
        
        # 2. Sync Companions if provided (Simple: replace all if list is provided)
        # Note: In production we'd do a more surgical sync, but for this app replace is safer
        # provided the frontend sends the COMPLETE list.
        if guest_payloads is not None:
            # Delete old ones (cascades to details)
            for guest in appointment.khach_di_kems:
                self.db.delete(guest)
            self.db.flush()
            
            new_companions = []
            for g_data in guest_payloads:
                new_guest = KhachDiKem(ma_lich_hen=appointment.ma_lich_hen, **g_data)
                self.db.add(new_guest)
                new_companions.append(new_guest)
            self.db.flush()
        else:
            new_companions = appointment.khach_di_kems

        # 3. Sync Details if provided
        if detail_payloads is not None:
            # Calculate total duration first for validation
            service_ids = {p["ma_san_pham"] for p in detail_payloads if p.get("ma_san_pham")}
            service_prices_info = self._get_service_info(service_ids)
            total_duration = sum(v["thoi_luong"] or 30 for v in service_prices_info.values())
            
            next_end = data.get("gio_ket_thuc") or self._calculate_end_time(next_start, total_duration)
            self._validate_time_slot(next_date, next_start, next_end, is_update=True)
            data["gio_ket_thuc"] = next_end

            # Sync details
            existing_details = {d.ma_chi_tiet: d for d in appointment.chi_tiets}
            payload_ids = {p["ma_chi_tiet"] for p in detail_payloads if p.get("ma_chi_tiet")}
            
            # Remove details not in payload
            for eid, detail in existing_details.items():
                if eid not in payload_ids:
                    self.db.delete(detail)
            
            for p in detail_payloads:
                did = p.pop("ma_chi_tiet", None)
                
                # Resolve guest link
                if p.get("chi_so_khach_di_kem") is not None:
                    idx = p.pop("chi_so_khach_di_kem")
                    if idx < len(new_companions):
                        p["ma_khach_di_kem"] = new_companions[idx].ma_khach_di_kem
                
                if did and did in existing_details:
                    detail = existing_details[did]
                    for key, val in p.items():
                        setattr(detail, key, val)
                else:
                    # New detail
                    if p.get("gia") is None and p.get("ma_san_pham"):
                        p["gia"] = service_prices_info.get(p["ma_san_pham"], {}).get("gia", 0)
                    new_detail = ChiTietLichHen(ma_lich_hen=appointment.ma_lich_hen, **p)
                    self.db.add(new_detail)

        # 4. Apply other basic field updates
        for key, value in data.items():
            if value is not None:
                setattr(appointment, key, value)

        # 5. PRE-COMMIT VALIDATION for conflicts
        self.db.flush() # Ensure changes are in current transaction for conflict detection
        for detail in appointment.chi_tiets:
            if not detail.ma_nhan_vien: continue
            d_start = detail.gio_bat_dau or appointment.gio_bat_dau
            d_end = detail.gio_ket_thuc or appointment.gio_ket_thuc
            self._check_staff_conflict(
                staff_id=int(detail.ma_nhan_vien),
                appt_date=appointment.ngay_hen,
                start_time=d_start,
                end_time=d_end,
                exclude_appointment_id=appointment.ma_lich_hen,
                exclude_detail_id=detail.ma_chi_tiet
            )

        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def cancel_appointment(self, appointment_id: int) -> LichHen:
        appointment = self.get_appointment(appointment_id)
        if appointment.trang_thai in ("COMPLETED", "CANCELLED"):
            raise BusinessRuleException(message="Không thể hủy lịch hẹn đã hoàn thành hoặc đã hủy")

        for detail in appointment.chi_tiets:
            if detail.ma_combo_kh:
                combo_kh = self.db.query(ComboKhachHang).filter(
                    ComboKhachHang.ma_combo_kh == detail.ma_combo_kh
                ).first()
                if combo_kh:
                    combo_kh.so_luot_con_lai += 1

        appointment.trang_thai = "CANCELLED"
        self.db.commit()
        self.db.refresh(appointment)
        logger.info("appointment_cancelled", appointment_id=appointment_id)
        return appointment

    def _calculate_end_time(self, start_time: Optional[time], duration_minutes: int) -> Optional[time]:
        if start_time is None:
            return None
        end_minutes = min(self._time_to_minutes(start_time) + duration_minutes, 1439) # Don't exceed end of day
        return self._minutes_to_time(end_minutes)

    def _default_end_time(self, start_time: Optional[time]) -> Optional[time]:
        return self._calculate_end_time(start_time, BOOKING_SLOT_MINUTES)

    def _validate_booking_window(self, appt_date: date) -> None:
        today = datetime.now().date()
        max_date = today + timedelta(days=BOOKING_MAX_DAYS)
        if appt_date < today:
            raise BusinessRuleException(message="Không thể đặt lịch trong quá khứ")
        if appt_date > max_date:
            raise BusinessRuleException(message="Chỉ được đặt lịch tối đa 1 tuần kể từ hôm nay")

    def _validate_time_slot(self, appt_date: date, start_time: Optional[time], end_time: Optional[time], is_update: bool = False) -> None:
        if not start_time:
            raise BusinessRuleException(message="Thiếu giờ bắt đầu lịch hẹn")

        start_minutes = self._time_to_minutes(start_time)
        if start_minutes < BOOKING_OPEN_MINUTES or start_minutes >= BOOKING_CLOSE_MINUTES:
            raise BusinessRuleException(message="Giờ hẹn chỉ trong khoảng 08:00 đến 22:00")
        if start_minutes % BOOKING_SLOT_MINUTES != 0:
            raise BusinessRuleException(message="Giờ hẹn phải theo từng slot 30 phút")

        if appt_date == datetime.now().date() and not is_update:
            now = datetime.now()
            now_minutes = now.hour * 60 + now.minute
            next_slot = ((now_minutes + BOOKING_SLOT_MINUTES - 1) // BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES
            if start_minutes < next_slot:
                raise BusinessRuleException(message="Không thể đặt lịch vào khung giờ đã qua")

        if end_time:
            end_minutes = self._time_to_minutes(end_time)
            if end_minutes < BOOKING_OPEN_MINUTES or end_minutes > BOOKING_CLOSE_MINUTES:
                raise BusinessRuleException(message="Giờ kết thúc chỉ trong khoảng 08:00 đến 22:00")
            if end_minutes % BOOKING_SLOT_MINUTES != 0:
                raise BusinessRuleException(message="Giờ kết thúc phải theo từng slot 30 phút")
            if end_minutes <= start_minutes:
                raise BusinessRuleException(message="Giờ kết thúc phải sau giờ bắt đầu")

    def _time_to_minutes(self, value: time) -> int:
        return value.hour * 60 + value.minute

    def _minutes_to_time(self, value: int) -> time:
        hour = max(0, min(23, value // 60))
        minute = max(0, min(59, value % 60))
        return time(hour=hour, minute=minute)

    def _person_key_from_payload(self, detail_payload: dict) -> str:
        if detail_payload.get("ma_khach_di_kem") is not None:
            return f"GUEST_ID:{detail_payload['ma_khach_di_kem']}"
        if detail_payload.get("chi_so_khach_di_kem") is not None:
            return f"GUEST_IDX:{detail_payload['chi_so_khach_di_kem']}"
        return "MAIN"

    def _validate_staff_unique_between_people(self, details: List[dict]) -> None:
        assigned: Dict[int, str] = {}
        for detail in details:
            staff_id = detail.get("ma_nhan_vien")
            if not staff_id:
                continue
            person_key = self._person_key_from_payload(detail)
            existing_person = assigned.get(int(staff_id))
            if existing_person is not None and existing_person != person_key:
                raise BusinessRuleException(
                    message=f"Nhân viên ID {staff_id} đã được chọn cho khách khác trong cùng lịch hẹn"
                )
            assigned[int(staff_id)] = person_key

    def _validate_staff_unique_between_people_entities(self, details: List[ChiTietLichHen]) -> None:
        assigned: Dict[int, str] = {}
        for detail in details:
            if not detail.ma_nhan_vien:
                continue
            person_key = f"GUEST_ID:{detail.ma_khach_di_kem}" if detail.ma_khach_di_kem else "MAIN"
            existing_person = assigned.get(int(detail.ma_nhan_vien))
            if existing_person is not None and existing_person != person_key:
                raise BusinessRuleException(
                    message=f"Nhân viên ID {detail.ma_nhan_vien} đã được chọn cho khách khác trong cùng lịch hẹn"
                )
            assigned[int(detail.ma_nhan_vien)] = person_key

    def _get_service_info(self, service_ids: Set[int]) -> Dict[int, dict]:
        if not service_ids:
            return {}

        services = (
            self.db.query(SanPham)
            .options(joinedload(SanPham.bang_gias))
            .filter(SanPham.ma_san_pham.in_(service_ids))
            .all()
        )
        info_map: Dict[int, dict] = {}
        found_ids = {service.ma_san_pham for service in services}
        missing_ids = sorted(service_ids - found_ids)
        if missing_ids:
            raise NotFoundException(message=f"Dịch vụ không tồn tại: {', '.join(map(str, missing_ids))}")

        for service in services:
            price = Decimal("0")
            if service.bang_gias and service.bang_gias[0].gia is not None:
                price = Decimal(str(service.bang_gias[0].gia))
            
            info_map[service.ma_san_pham] = {
                "gia": price,
                "thoi_luong": service.thoi_luong or 30
            }
        return info_map

    def _get_service_prices(self, service_ids: Set[int]) -> Dict[int, Decimal]:
        info = self._get_service_info(service_ids)
        return {k: v["gia"] for k, v in info.items()}

    def _check_staff_conflict(
        self,
        staff_id: int,
        appt_date: date,
        start_time: Optional[time],
        end_time: Optional[time],
        exclude_appointment_id: Optional[int] = None,
        exclude_detail_id: Optional[int] = None,
    ) -> None:
        """Check if staff member has conflicting appointments."""
        if not start_time:
            return

        effective_end = end_time or self._default_end_time(start_time) or start_time

        start_expr = func.coalesce(ChiTietLichHen.gio_bat_dau, LichHen.gio_bat_dau)
        end_expr = func.coalesce(ChiTietLichHen.gio_ket_thuc, LichHen.gio_ket_thuc, LichHen.gio_bat_dau)

        query = (
            self.db.query(ChiTietLichHen)
            .join(LichHen)
            .filter(
                ChiTietLichHen.ma_nhan_vien == staff_id,
                LichHen.ngay_hen == appt_date,
                LichHen.trang_thai.notin_(["CANCELLED", "NO_SHOW"]),
            )
        )

        if exclude_appointment_id:
            query = query.filter(LichHen.ma_lich_hen != exclude_appointment_id)
        if exclude_detail_id:
            query = query.filter(ChiTietLichHen.ma_chi_tiet != exclude_detail_id)

        conflicts = query.filter(
            start_expr < effective_end,
            end_expr > start_time,
        ).all()

        if conflicts:
            raise BusinessRuleException(
                message=f"Nhân viên (ID: {staff_id}) đã có lịch trùng vào thời gian này"
            )

    def _use_combo(self, combo_kh_id: int) -> None:
        """Deduct one use from customer combo."""
        combo = self.db.query(ComboKhachHang).filter(
            ComboKhachHang.ma_combo_kh == combo_kh_id
        ).first()
        if not combo:
            raise NotFoundException(message="Combo khách hàng không tồn tại")
        if combo.so_luot_con_lai <= 0:
            raise BusinessRuleException(message="Combo đã hết lượt sử dụng")
        if combo.ngay_het_han and combo.ngay_het_han < datetime.utcnow():
            raise BusinessRuleException(message="Combo đã hết hạn sử dụng")
        combo.so_luot_con_lai -= 1
