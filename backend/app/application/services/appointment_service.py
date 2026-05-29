"""
Appointment Service with transaction safety and conflict detection.
"""
from decimal import Decimal
from datetime import date, time, datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException, BusinessRuleException
from app.core.logging_config import get_logger
from app.infrastructure.persistence.models.appointment import LichHen, KhachDiKem, ChiTietLichHen
from app.infrastructure.persistence.models.system import CauHinhHeThong
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

    def get_max_capacity(self) -> int:
        """Fetch MAX_CAPACITY from system settings, default to 10."""
        setting = self.db.query(CauHinhHeThong).filter(CauHinhHeThong.ma_cau_hinh == "MAX_CAPACITY").first()
        if setting and setting.gia_tri:
            try:
                return int(setting.gia_tri)
            except ValueError:
                return 10
        return 10

    def get_occupancy(self, appt_date: date) -> Dict[str, int]:
        """Count total unique guests occupying beds in each 30-minute slot."""
        details = (
            self.db.query(ChiTietLichHen)
            .join(LichHen)
            .filter(
                LichHen.ngay_hen == appt_date,
                LichHen.trang_thai.notin_(["CANCELLED", "NO_SHOW", "COMPLETED"])
            )
            .all()
        )
        
        occupancy: Dict[str, int] = {}
        current_min = BOOKING_OPEN_MINUTES
        while current_min < BOOKING_CLOSE_MINUTES:
            t = self._minutes_to_time(current_min)
            t_str = t.strftime("%H:%M")
            
            active_people = set()
            for d in details:
                d_start = d.gio_bat_dau or d.lich_hen.gio_bat_dau
                d_end = d.gio_ket_thuc or d.lich_hen.gio_ket_thuc
                if d_start <= t < d_end:
                    person_id = f"{d.ma_lich_hen}_{d.ma_khach_di_kem or 'MAIN'}"
                    active_people.add(person_id)
            
            occupancy[t_str] = len(active_people)
            current_min += BOOKING_SLOT_MINUTES
            
        return occupancy

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
            query.order_by(
                case(
                    (LichHen.trang_thai == "PENDING", 0),
                    else_=1
                ),
                LichHen.ma_lich_hen.desc()
            )
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
        person_durations: Dict[str, int] = {}
        person_next_start: Dict[str, time] = {}
        
        for detail in chi_tiets_data:
            p_key = self._person_key_from_payload(detail)
            s_id = int(detail.get("ma_san_pham"))
            s_info = service_prices_info.get(s_id, {})
            duration = s_info.get("thoi_luong") or 30
            
            # Assign sequential times for each person
            curr_start = detail.get("gio_bat_dau") or person_next_start.get(p_key, gio_bat_dau)
            curr_end = detail.get("gio_ket_thuc") or self._calculate_end_time(curr_start, duration)
            
            detail["gio_bat_dau"] = curr_start
            detail["gio_ket_thuc"] = curr_end
            person_next_start[p_key] = curr_end
            person_durations[p_key] = person_durations.get(p_key, 0) + duration
        
        max_duration = max(person_durations.values()) if person_durations else 30
        # Round up to nearest 30 minutes to satisfy slot validation
        total_duration = ((max_duration + BOOKING_SLOT_MINUTES - 1) // BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES

        gio_ket_thuc = data.get("gio_ket_thuc") or self._calculate_end_time(gio_bat_dau, total_duration)

        self._validate_booking_window(ngay_hen)
        self._validate_time_slot(ngay_hen, gio_bat_dau, gio_ket_thuc)
        self._validate_staff_unique_between_people(chi_tiets_data)

        data["gio_ket_thuc"] = gio_ket_thuc

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

        # --- CAPACITY CHECK (SLOT-BASED & CONCURRENCY SAFE) ---
        max_cap = self.get_max_capacity()
        
        # Determine all 30-min slots covered by this new appointment
        start_min = self._time_to_minutes(gio_bat_dau)
        end_min = self._time_to_minutes(gio_ket_thuc)
        slots_to_check = []
        curr = start_min
        while curr < end_min:
            slots_to_check.append(self._minutes_to_time(curr))
            curr += BOOKING_SLOT_MINUTES

        # Calculate current occupancy for each required slot
        active_details = (
            self.db.query(ChiTietLichHen)
            .join(LichHen)
            .filter(
                LichHen.ngay_hen == ngay_hen,
                LichHen.trang_thai.notin_(["CANCELLED", "NO_SHOW", "COMPLETED"])
            )
            .with_for_update() # Lock relevant rows
            .all()
        )
        
        # Determine how many unique people are active in each slot for the NEW appointment
        new_active_per_slot: Dict[time, int] = {}
        for slot_time in slots_to_check:
            new_active_people = set()
            for d in chi_tiets_data:
                d_start = d.get("gio_bat_dau") or gio_bat_dau
                d_end = d.get("gio_ket_thuc") or gio_ket_thuc
                if d_start <= slot_time < d_end:
                    p_key = self._person_key_from_payload(d)
                    new_active_people.add(p_key)
            new_active_per_slot[slot_time] = len(new_active_people)

        for slot_time in slots_to_check:
            # Count people already in the spa during this slot
            occupied_count = len({
                f"{d.ma_lich_hen}_{d.ma_khach_di_kem or 'MAIN'}"
                for d in active_details
                if (d.gio_bat_dau or d.lich_hen.gio_bat_dau) <= slot_time < (d.gio_ket_thuc or d.lich_hen.gio_ket_thuc)
            })
            
            new_guests_in_slot = new_active_per_slot.get(slot_time, 0)
            if occupied_count + new_guests_in_slot > max_cap:
                raise BusinessRuleException(
                    message=f"Khung giờ {slot_time.strftime('%H:%M')} đã đạt giới hạn sức chứa ({occupied_count}/{max_cap} giường). Vui lòng chọn lúc khác hoặc giảm dịch vụ."
                )
        # -----------------------------------------------------

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

        detail_payloads = data.pop("chi_tiets", None)
        guest_payloads = data.pop("khach_di_kems", None)

        # 1. Basic Fields
        next_date = data.get("ngay_hen", appointment.ngay_hen)
        next_start = data.get("gio_bat_dau", appointment.gio_bat_dau)
        
        # 2. Sync Companions if provided
        if guest_payloads is not None:
            # Nullify references in details first to avoid IntegrityError
            for detail in appointment.chi_tiets:
                detail.ma_khach_di_kem = None
            self.db.flush()

            # Delete old ones
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
            existing_details = {d.ma_chi_tiet: d for d in appointment.chi_tiets}
            
            for p in detail_payloads:
                if not p.get("ma_san_pham") and p.get("ma_chi_tiet") in existing_details:
                    p["ma_san_pham"] = existing_details[p["ma_chi_tiet"]].ma_san_pham

            person_durations: Dict[str, int] = {}
            person_next_start: Dict[str, time] = {}
            service_prices_info = self._get_service_info(
                {int(p["ma_san_pham"]) for p in detail_payloads if p.get("ma_san_pham")}
            )

            for detail in detail_payloads:
                p_key = self._person_key_from_payload(detail)
                s_id_raw = detail.get("ma_san_pham")
                if not s_id_raw:
                    raise BusinessRuleException(message="Chi tiết dịch vụ thiếu mã sản phẩm")
                s_id = int(s_id_raw)
                s_info = service_prices_info.get(s_id, {})
                duration = s_info.get("thoi_luong") or 30
                
                curr_start = detail.get("gio_bat_dau") or person_next_start.get(p_key, next_start)
                curr_end = detail.get("gio_ket_thuc") or self._calculate_end_time(curr_start, duration)
                
                detail["gio_bat_dau"] = curr_start
                detail["gio_ket_thuc"] = curr_end
                person_next_start[p_key] = curr_end
                person_durations[p_key] = person_durations.get(p_key, 0) + duration
            
            max_duration = max(person_durations.values()) if person_durations else 30
            total_duration = ((max_duration + BOOKING_SLOT_MINUTES - 1) // BOOKING_SLOT_MINUTES) * BOOKING_SLOT_MINUTES
            
            next_end = data.get("gio_ket_thuc") or self._calculate_end_time(next_start, total_duration)
            self._validate_time_slot(next_date, next_start, next_end, is_update=True)
            data["gio_ket_thuc"] = next_end

            # Sync details
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
        self.db.flush()
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

        # 6. CAPACITY CHECK
        if appointment.trang_thai not in ("CANCELLED", "NO_SHOW", "COMPLETED"):
            max_cap = self.get_max_capacity()
            appt_start_min = self._time_to_minutes(appointment.gio_bat_dau)
            appt_end_min = self._time_to_minutes(appointment.gio_ket_thuc)
            curr = appt_start_min
            slots_to_check = []
            while curr < appt_end_min:
                slots_to_check.append(self._minutes_to_time(curr))
                curr += BOOKING_SLOT_MINUTES
                
            active_details = (
                self.db.query(ChiTietLichHen)
                .join(LichHen)
                .filter(
                    LichHen.ngay_hen == appointment.ngay_hen,
                    LichHen.trang_thai.notin_(["CANCELLED", "NO_SHOW", "COMPLETED"])
                )
                .with_for_update()
                .all()
            )
            
            for slot_time in slots_to_check:
                occupied_count = len({
                    f"{d.ma_lich_hen}_{d.ma_khach_di_kem or 'MAIN'}"
                    for d in active_details
                    if (d.gio_bat_dau or d.lich_hen.gio_bat_dau) <= slot_time < (d.gio_ket_thuc or d.lich_hen.gio_ket_thuc)
                })
                
                if occupied_count > max_cap:
                    raise BusinessRuleException(
                        message=f"Khung giờ {slot_time.strftime('%H:%M')} đã vượt giới hạn sức chứa ({occupied_count}/{max_cap} giường) sau khi cập nhật."
                    )

        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def cancel_appointment(self, appointment_id: int, is_staff: bool = False) -> LichHen:
        appointment = self.get_appointment(appointment_id)
        if appointment.trang_thai in ("COMPLETED", "CANCELLED"):
            raise BusinessRuleException(message="Không thể hủy lịch hẹn đã hoàn thành hoặc đã bị hủy trước đó")
            
        if not is_staff and appointment.trang_thai != "PENDING":
            raise BusinessRuleException(message="Chỉ được phép hủy lịch hẹn ở trạng thái Chờ xác nhận")

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
        end_minutes = min(self._time_to_minutes(start_time) + duration_minutes, 1439)
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

    def _check_staff_conflict(
        self,
        staff_id: int,
        appt_date: date,
        start_time: Optional[time],
        end_time: Optional[time],
        exclude_appointment_id: Optional[int] = None,
        exclude_detail_id: Optional[int] = None,
    ) -> None:
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
                LichHen.trang_thai.notin_(["CANCELLED", "NO_SHOW", "COMPLETED"]),
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
